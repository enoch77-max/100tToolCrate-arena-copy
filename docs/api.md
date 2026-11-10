# 100ToolCrate Public API and MCP

The public API exposes service metadata, anonymous counters and **18 real deterministic execution tools**. File/image/PDF tools that need local browser APIs remain browser-only. See `/agents` for a live playground.

## Discovery and operations

- `GET /api/v1/tools` — executable tools, JSON schemas and browser-only exclusions.
- `GET /api/v1/tools/{toolId}` — one tool's input/output schema and execution contract.
- `POST /api/v1/tools/{toolId}/execute` — real transient execution.
- `POST /api/mcp` — MCP Streamable HTTP JSON-RPC.
- `GET /api/og-preview?url=https://...` — bounded public metadata fetching with private-network, redirect, time and size protections.
- `GET /.well-known/mcp/server-card.json` — MCP endpoint and capabilities.
- `GET /.well-known/agent-skills/index.json` — all tools with execution mode and actual page hashes.
- `GET /api/openapi.json` — specification generated from the execution registry.
- `GET /api/status` — service/database status and execution counts.
- `GET /healthz` and `/readyz` — process and deployment checks.

Public execution requires no token. OAuth token issuance is not enabled. Do not send secrets, personal data or regulated datasets.

## REST execution example

```bash
curl -X POST https://100toolcrate.com/api/v1/tools/json-formatter/execute \
  -H 'Content-Type: application/json' \
  -d '{"json":"{\"ok\":true}","indent":2}'
```

Response:

```json
{"tool":"json-formatter","result":{"json":"{\n  \"ok\": true\n}"},"dataHandling":"not_persisted"}
```

Inputs must match the tool's published `inputSchema`; unexpected properties are rejected. Requests are limited to 16 KB, results to 256 KB, and calls to 60 per minute per client. Execution inputs and outputs are not persisted by this endpoint. Standard infrastructure logs still apply.

## MCP

Endpoint: `https://100toolcrate.com/api/mcp`. Protocol versions `2025-03-26` and `2025-06-18` are supported. Clients must send an `Accept` header containing both `application/json` and `text/event-stream`; the stateless server returns JSON. Origin headers are validated to reduce DNS-rebinding risk.

Supported methods: `initialize`, `ping`, `tools/list`, `tools/call`, and notifications such as `notifications/initialized`. GET SSE listening and session deletion return 405.

```json
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"word-counter","arguments":{"text":"one two three"}}}
```

A successful call includes text content and `structuredContent`. Invalid tool input returns `isError: true`; malformed protocol messages use JSON-RPC errors.

## Other endpoints

`GET /api/top-tools` returns an array of IDs ordered by aggregate use. `POST /api/track` accepts only `{"id":"existing-tool-id"}` and increments an aggregate SQLite counter without storing an IP or user identifier in that record.

HTML pages support `Accept: text/markdown` or `?format=markdown`. This converts the public page representation; it does not execute browser-only tools.
