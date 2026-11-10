# 100ToolCrate Public Tool and Agent Access

## Discovery

- Human/developer guide: `https://100toolcrate.com/agents`
- OpenAPI 3.1: `/api/openapi.json`
- Executable tool catalog and JSON schemas: `GET /api/v1/tools`
- MCP server card: `/.well-known/mcp/server-card.json`
- MCP Streamable HTTP endpoint: `POST /api/mcp`
- General public tool metadata: `/.well-known/agent-skills/index.json`
- LLM guidance: `/llms.txt`

## Execute a tool

`POST /api/v1/tools/{toolId}/execute` with a JSON object matching that tool's published `inputSchema`. No token is required for the current free public execution tools.

Example:

```http
POST /api/v1/tools/json-formatter/execute
Content-Type: application/json

{"json":"{\"ok\":true}","indent":2}
```

MCP supports `initialize`, `ping`, `tools/list`, and `tools/call` using protocol versions `2025-03-26` and `2025-06-18`. Clients must accept both `application/json` and `text/event-stream`; this stateless server returns JSON responses and does not provide GET SSE listening or session deletion.

## Data and limits

Execution inputs and outputs are transient and are not persisted by the execution endpoint. Request bodies are limited to 16 KB, results to 256 KB, and calls are rate limited. Do not send credentials, personal data or regulated datasets. Standard hosting/network logs still apply.

Only tools listed by `/api/v1/tools` are server-executable. The remaining browser tools require local files, canvas, camera or browser document libraries and are linked with a `browserOnlyTools` explanation. Do not claim to have executed those through MCP.

## Other public endpoints

`GET /api/top-tools` returns an array of tool IDs ordered by aggregate use. `POST /api/track` records only an aggregate count for a valid public tool ID. OAuth token issuance is not enabled; there are no demo credentials. Owner/store authentication is separate from this public API.
