import fs from 'node:fs';
import path from 'node:path';
import { listExecutableTools } from '../backend/tool-execution.js';

/** Keep public agent documentation generated from the actual execution registry. */
export function syncAgentDocuments(rootDir) {
  const specPath = path.join(rootDir, 'api', 'openapi.json');
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  const tools = listExecutableTools('https://100toolcrate.com');
  spec.info.version = '2.1.0';
  spec.info.description = `Public service metadata, anonymous counters and ${tools.length} deterministic execution tools. REST and MCP require no token; execution inputs are transient.`;
  spec.paths['/api/v1/tools'] = {
    get: {
      operationId: 'listExecutionTools', summary: 'Discover executable tools, schemas and browser-only exclusions',
      responses: { '200': { description: `${tools.length} executable tools and the remaining browser-only catalog` } }
    }
  };
  spec.paths['/api/v1/tools/{toolId}'] = {
    get: {
      operationId: 'getExecutionTool', summary: 'Get one tool input/output schema',
      parameters: [{ name: 'toolId', in: 'path', required: true, schema: { type: 'string', enum: tools.map(tool => tool.id) } }],
      responses: { '200': { description: 'Tool metadata and execution contract' }, '404': { description: 'Unknown or browser-only tool' } }
    }
  };
  spec.paths['/api/v1/tools/{toolId}/execute'] = {
    post: {
      operationId: 'executePublicTool', summary: 'Execute a deterministic public tool with transient input',
      description: 'Use the inputSchema returned by GET /api/v1/tools/{toolId}. Maximum request 16 KB; maximum result 256 KB; rate limited.',
      parameters: [{ name: 'toolId', in: 'path', required: true, schema: { type: 'string', enum: tools.map(tool => tool.id) } }],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', description: 'Tool-specific arguments from its published inputSchema' } } } },
      responses: {
        '200': { description: 'Real execution result with dataHandling=not_persisted' },
        '400': { description: 'Input failed the tool schema or execution rules' },
        '404': { description: 'Unknown or browser-only tool' },
        '413': { description: 'Request too large' },
        '429': { description: 'Rate limit reached' }
      }
    }
  };
  spec.paths['/api/og-preview'] = {
    get: {
      operationId: 'previewOpenGraph', summary: 'Fetch public Open Graph metadata with SSRF protections',
      description: 'Only public IPs, three redirects, seven-second timeout and 512 KB HTML. URL is sent to the server; HTML is transient.',
      parameters: [{ name: 'url', in: 'query', required: true, schema: { type: 'string', format: 'uri', maxLength: 2048 } }],
      responses: { '200': { description: 'Extracted metadata' }, '400': { description: 'Invalid URL or private target' }, '422': { description: 'Target could not be parsed' }, '429': { description: 'Rate limit reached' }, '504': { description: 'Target timed out' } }
    }
  };
  spec.paths['/api/mcp'] = {
    post: {
      operationId: 'modelContextProtocol', summary: 'MCP Streamable HTTP JSON-RPC endpoint',
      description: 'Supports initialize, ping, tools/list and tools/call for protocol 2025-03-26 and 2025-06-18. Accept header must include application/json and text/event-stream.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object', required: ['jsonrpc', 'method'],
              properties: {
                jsonrpc: { const: '2.0' }, id: { type: ['string', 'number'] },
                method: { type: 'string', enum: ['initialize', 'ping', 'tools/list', 'tools/call', 'notifications/initialized'] },
                params: { type: 'object' }
              }
            }
          }
        }
      },
      responses: { '200': { description: 'JSON-RPC result or error' }, '202': { description: 'Notification accepted' }, '400': { description: 'Invalid request or protocol version' }, '403': { description: 'Origin rejected' }, '406': { description: 'Required Accept media types missing' } }
    },
    get: { operationId: 'mcpListeningUnavailable', summary: 'SSE listening is not provided', responses: { '405': { description: 'Stateless server does not offer GET SSE listening' } } }
  };
  const statusSchema = spec.paths['/api/status']?.get?.responses?.['200']?.content?.['application/json']?.schema;
  if (statusSchema?.properties) {
    statusSchema.properties.mcp_enabled = { const: true };
    statusSchema.properties.execution_tools_count = { type: 'integer', const: tools.length };
    statusSchema.properties.mcp_endpoint = { type: 'string', format: 'uri' };
  }
  fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`);
  return tools.length;
}
