import { executeTool, mcpTools, ToolInputError } from './tool-execution.js';

const SUPPORTED_VERSIONS = new Set(['2025-03-26', '2025-06-18']);
const DEFAULT_VERSION = '2025-06-18';

function rpcError(id, code, message, status = 200) {
  return { status, body: { jsonrpc: '2.0', id: id ?? null, error: { code, message } } };
}

function rpcResult(id, result) {
  return { status: 200, body: { jsonrpc: '2.0', id, result } };
}

function validOrigin(req, config) {
  const origin = req.headers.origin;
  if (!origin) return true; // Server-to-server MCP clients commonly omit Origin.
  try {
    const parsed = new URL(origin);
    if (parsed.origin === config.publicOrigin) return true;
    return !config.isProduction && ['localhost', '127.0.0.1'].includes(parsed.hostname);
  } catch { return false; }
}

export function handleMcp(req, res, config) {
  res.setHeader('Cache-Control', 'no-store');
  if (!validOrigin(req, config)) return res.status(403).json({ error: 'Origin is not allowed' });
  if (req.method === 'GET' || req.method === 'DELETE') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'This stateless MCP server does not provide SSE listening or session deletion' });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, GET, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const accept = String(req.headers.accept || '');
  if (!accept.includes('application/json') || !accept.includes('text/event-stream')) {
    return res.status(406).json({ error: 'MCP clients must accept application/json and text/event-stream' });
  }
  const version = req.headers['mcp-protocol-version'];
  if (version && !SUPPORTED_VERSIONS.has(version)) return res.status(400).json({ error: 'Unsupported MCP protocol version' });

  const message = req.body;
  if (!message || typeof message !== 'object' || Array.isArray(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
    const response = rpcError(message?.id, -32600, 'Invalid JSON-RPC request', 400);
    return res.status(response.status).json(response.body);
  }
  const hasId = Object.prototype.hasOwnProperty.call(message, 'id') && message.id !== null;
  if (!hasId) {
    if (message.method.startsWith('notifications/')) return res.status(202).end();
    const response = rpcError(null, -32600, 'Requests must include a non-null id', 400);
    return res.status(response.status).json(response.body);
  }
  if (!['string', 'number'].includes(typeof message.id)) {
    const response = rpcError(null, -32600, 'Request id must be a string or number', 400);
    return res.status(response.status).json(response.body);
  }

  let response;
  if (message.method === 'initialize') {
    const requested = message.params?.protocolVersion;
    response = rpcResult(message.id, {
      protocolVersion: SUPPORTED_VERSIONS.has(requested) ? requested : DEFAULT_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: '100toolcrate', title: '100ToolCrate Public Tools', version: '2.1.0' },
      instructions: 'Use tools/list to discover deterministic text, JSON and calculator tools. Inputs are processed transiently; do not send secrets or personal data. Browser file tools are not available through MCP.'
    });
  } else if (message.method === 'ping') {
    response = rpcResult(message.id, {});
  } else if (message.method === 'tools/list') {
    response = rpcResult(message.id, { tools: mcpTools() });
  } else if (message.method === 'tools/call') {
    const name = message.params?.name;
    const args = message.params?.arguments ?? {};
    if (typeof name !== 'string' || !args || typeof args !== 'object' || Array.isArray(args)) {
      response = rpcError(message.id, -32602, 'tools/call requires a tool name and object arguments', 200);
    } else {
      try {
        const structuredContent = executeTool(name, args);
        response = rpcResult(message.id, {
          content: [{ type: 'text', text: JSON.stringify(structuredContent) }],
          structuredContent,
          isError: false
        });
      } catch (error) {
        const inputError = error instanceof ToolInputError;
        response = rpcResult(message.id, {
          content: [{ type: 'text', text: inputError ? error.message : 'Tool execution failed' }],
          isError: true
        });
      }
    }
  } else {
    response = rpcError(message.id, -32601, `Method not found: ${message.method}`);
  }
  res.status(response.status).type('application/json').json(response.body);
}
