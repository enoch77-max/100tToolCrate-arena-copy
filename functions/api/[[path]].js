import { executeTool, getExecutableTool, listExecutableTools, mcpTools, ToolInputError } from '../_lib/tool-execution.js';
import { TOOLS, TOOL_IDS, SEED_STATS } from '../_lib/site-data.js';
import { fetchOgMetadata, OgFetchError } from '../_lib/og-preview.js';

const SUPPORTED_MCP_VERSIONS = new Set(['2025-03-26', '2025-06-18']);
const DEFAULT_MCP_VERSION = '2025-06-18';
const MAX_BODY_BYTES = 16 * 1024;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders
    }
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, MCP-Protocol-Version',
    'Access-Control-Max-Age': '600'
  };
}

function publicOrigin(request, env) {
  return (env.PUBLIC_ORIGIN || env.PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/+$/, '');
}

async function readJsonBody(request) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > MAX_BODY_BYTES) throw new ToolInputError('Request body is too large');
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw new ToolInputError('Request body is too large');
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new ToolInputError('Malformed JSON request');
  }
}

function seedTopTools() {
  return Object.entries(SEED_STATS)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 20)
    .map(([id]) => id);
}

async function handleMcp(request, env, origin) {
  const requestOrigin = request.headers.get('origin');
  if (requestOrigin) {
    try {
      const parsed = new URL(requestOrigin);
      const allowed = parsed.origin === origin || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
      if (!allowed) return json({ error: 'Origin is not allowed' }, 403);
    } catch {
      return json({ error: 'Origin is not allowed' }, 403);
    }
  }

  if (request.method === 'GET' || request.method === 'DELETE') {
    return json({ error: 'This stateless MCP server does not provide SSE listening or session deletion' }, 405, { Allow: 'POST' });
  }
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, { Allow: 'POST, GET, DELETE' });
  }

  const accept = request.headers.get('accept') || '';
  if (!accept.includes('application/json') || !accept.includes('text/event-stream')) {
    return json({ error: 'MCP clients must accept application/json and text/event-stream' }, 406);
  }
  const version = request.headers.get('mcp-protocol-version');
  if (version && !SUPPORTED_MCP_VERSIONS.has(version)) {
    return json({ error: 'Unsupported MCP protocol version' }, 400);
  }

  let message;
  try {
    message = await readJsonBody(request);
  } catch (error) {
    return json({ jsonrpc: '2.0', id: null, error: { code: -32600, message: error.message } }, 400);
  }

  if (!message || typeof message !== 'object' || Array.isArray(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
    return json({ jsonrpc: '2.0', id: message?.id ?? null, error: { code: -32600, message: 'Invalid JSON-RPC request' } }, 400);
  }

  const hasId = Object.prototype.hasOwnProperty.call(message, 'id') && message.id !== null;
  if (!hasId) {
    if (message.method.startsWith('notifications/')) return new Response(null, { status: 202 });
    return json({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Requests must include a non-null id' } }, 400);
  }

  const rpcResult = result => json({ jsonrpc: '2.0', id: message.id, result });
  const rpcError = (code, errorMessage) => json({ jsonrpc: '2.0', id: message.id, error: { code, message: errorMessage } });

  if (message.method === 'initialize') {
    const requested = message.params?.protocolVersion;
    return rpcResult({
      protocolVersion: SUPPORTED_MCP_VERSIONS.has(requested) ? requested : DEFAULT_MCP_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: '100toolcrate', title: '100ToolCrate Public Tools', version: '2.1.0' },
      instructions: 'Use tools/list to discover deterministic text, JSON and calculator tools. Inputs are transient; do not send secrets. Browser file tools are not available through MCP.'
    });
  }
  if (message.method === 'ping') return rpcResult({});
  if (message.method === 'tools/list') return rpcResult({ tools: mcpTools() });
  if (message.method === 'tools/call') {
    const name = message.params?.name;
    const args = message.params?.arguments ?? {};
    if (typeof name !== 'string' || !args || typeof args !== 'object' || Array.isArray(args)) {
      return rpcError(-32602, 'tools/call requires a tool name and object arguments');
    }
    try {
      const structuredContent = executeTool(name, args);
      return rpcResult({ content: [{ type: 'text', text: JSON.stringify(structuredContent) }], structuredContent, isError: false });
    } catch (error) {
      return rpcResult({ content: [{ type: 'text', text: error instanceof ToolInputError ? error.message : 'Tool execution failed' }], isError: true });
    }
  }
  return rpcError(-32601, `Method not found: ${message.method}`);
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const origin = publicOrigin(request, env);
  const method = request.method;

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    if (path === '/api/status' && method === 'GET') {
      return json({
        status: 'ok',
        version: '2.1.0-pages',
        runtime: 'cloudflare-pages',
        tools_count: TOOLS.length,
        execution_tools_count: listExecutableTools().length,
        database: env.DB ? 'd1' : 'not_configured',
        mcp_enabled: true,
        mcp_endpoint: `${origin}/api/mcp`,
        authentication_required: false,
        timestamp: new Date().toISOString()
      });
    }

    if (path === '/api/top-tools' && method === 'GET') {
      if (env.DB) {
        const result = await env.DB.prepare('SELECT tool_id AS id FROM tool_usage ORDER BY usage_count DESC, tool_id ASC LIMIT 20').all();
        return json((result.results || []).map(row => row.id), 200, { 'X-Usage-Source': 'd1' });
      }
      return json(seedTopTools(), 200, { 'X-Usage-Source': 'static-seed' });
    }

    if (path === '/api/track' && method === 'POST') {
      const body = await readJsonBody(request);
      const id = body?.id;
      const hasUnexpectedFields = body && typeof body === 'object' && Object.keys(body).some(key => key !== 'id');
      if (hasUnexpectedFields || typeof id !== 'string' || !/^[a-z0-9-]{1,100}$/.test(id)) {
        return json({ success: false, error: 'A valid tool id is required' }, 400);
      }
      if (!TOOL_IDS.has(id)) return json({ success: false, error: 'Unknown tool' }, 404);
      if (!env.DB) {
        return json({ success: false, error: 'Usage storage is not configured. Bind a D1 database as DB to persist counters.' }, 503);
      }
      const result = await env.DB.prepare(
        `INSERT INTO tool_usage (tool_id, usage_count, updated_at)
         VALUES (?, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
         ON CONFLICT(tool_id) DO UPDATE SET usage_count = usage_count + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         RETURNING usage_count AS count`
      ).bind(id).first();
      return json({ success: true, count: result?.count ?? 1 });
    }

    if (path === '/api/v1/tools' && method === 'GET') {
      return json({
        tools: listExecutableTools(origin),
        browserOnlyTools: TOOLS.filter(tool => !getExecutableTool(tool.id)).map(tool => ({
          id: tool.id,
          title: tool.title,
          category: tool.cat,
          url: `${origin}/tools/${tool.id}`,
          reason: 'Requires local browser APIs, user-selected files, canvas, camera or client-side document libraries.'
        }))
      });
    }

    const toolMatch = path.match(/^\/api\/v1\/tools\/([a-z0-9-]+)$/);
    if (toolMatch && method === 'GET') {
      const tool = getExecutableTool(toolMatch[1]);
      if (!tool) return json({ error: 'No server-executable tool with this ID', catalog: `${origin}/api/v1/tools` }, 404);
      return json({
        ...tool,
        execution: {
          method: 'POST',
          url: `${origin}/api/v1/tools/${tool.id}/execute`,
          authentication: 'none',
          dataHandling: 'Transient processing; inputs and outputs are not persisted.'
        }
      });
    }

    const executeMatch = path.match(/^\/api\/v1\/tools\/([a-z0-9-]+)\/execute$/);
    if (executeMatch && method === 'POST') {
      const id = executeMatch[1];
      if (!getExecutableTool(id)) {
        return json({ error: 'No server-executable tool with this ID', catalog: `${origin}/api/v1/tools` }, 404, corsHeaders());
      }
      const args = await readJsonBody(request);
      try {
        const result = executeTool(id, args);
        return json({ tool: id, result, dataHandling: 'not_persisted' }, 200, corsHeaders());
      } catch (error) {
        if (error instanceof ToolInputError) return json({ error: error.message, tool: id }, 400, corsHeaders());
        throw error;
      }
    }

    if (path === '/api/mcp') {
      return handleMcp(request, env, origin);
    }

    if (path === '/api/og-preview' && method === 'GET') {
      const target = url.searchParams.get('url');
      if (!target || target.length > 2048) return json({ error: 'A url parameter of at most 2048 characters is required' }, 400);
      try {
        const metadata = await fetchOgMetadata(target, { allowHttp: env.ALLOW_HTTP_OG === 'true' });
        return json({ ...metadata, dataHandling: 'HTML fetched transiently; only extracted metadata is returned.' });
      } catch (error) {
        if (error instanceof OgFetchError) return json({ error: error.message }, error.status);
        throw error;
      }
    }

    return json({ error: 'Not found', catalog: `${origin}/api/v1/tools` }, 404);
  } catch (error) {
    if (error instanceof ToolInputError) return json({ error: error.message }, 400, corsHeaders());
    console.error('Pages API error', { path, message: error?.message || String(error) });
    return json({ error: 'Internal server error' }, 500);
  }
}
