import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../backend/app.js';
import { executeTool, listExecutableTools, ToolInputError } from '../backend/tool-execution.js';

let runtime;
let server;
let base;
before(async () => {
  runtime = createApplication({ NODE_ENV: 'test', DATABASE_PATH: ':memory:', LOG_LEVEL: 'error', READ_RATE_LIMIT: 10000, TRACK_RATE_LIMIT: 10000 });
  await new Promise(resolve => { server = runtime.app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); runtime.db.close(); });

test('execution catalog is deterministic and has 18 useful tools', () => {
  const tools = listExecutableTools('https://100toolcrate.com');
  assert.equal(tools.length, 18);
  assert.equal(new Set(tools.map(tool => tool.id)).size, 18);
  assert.ok(tools.every(tool => tool.description.length > 50 && tool.inputSchema.type === 'object'));
});

test('text metrics handle Unicode and empty text', () => {
  assert.equal(executeTool('word-counter', { text: 'Hello, world! Second sentence.' }).words, 4);
  assert.equal(executeTool('word-counter', { text: '' }).words, 0);
  const emoji = executeTool('character-counter', { text: 'A👨‍👩‍👧‍👦é' });
  assert.equal(emoji.codePoints, 10);
  assert.equal(emoji.graphemes, 3);
});

test('case, slug, URL and Base64 transforms return real UTF-8 output', () => {
  assert.equal(executeTool('case-converter', { text: 'hello brave world', mode: 'camel' }).text, 'helloBraveWorld');
  assert.equal(executeTool('slug-generator', { text: ' Crème brûlée & JSON, 2026! ' }).slug, 'creme-brulee-json-2026');
  assert.equal(executeTool('url-encoder', { text: 'a b&c', operation: 'encode' }).text, 'a%20b%26c');
  const encoded = executeTool('base64-encoder', { text: 'Hello 世界', operation: 'encode' }).text;
  assert.equal(executeTool('base64-encoder', { text: encoded, operation: 'decode' }).text, 'Hello 世界');
  assert.throws(() => executeTool('base64-encoder', { text: 'not base64!', operation: 'decode' }), ToolInputError);
});

test('JSON tools validate, format, minify and safely produce CSV', () => {
  assert.equal(executeTool('json-validator', { json: '{bad' }).valid, false);
  assert.equal(executeTool('json-formatter', { json: '{"a":1}', indent: 2 }).json, '{\n  "a": 1\n}');
  assert.equal(executeTool('json-minifier', { json: '{ "a": 1 }' }).json, '{"a":1}');
  const csv = executeTool('json-to-csv', { json: '[{"name":"=CMD()","age":30},{"name":"Zoë","age":31}]' });
  assert.match(csv.csv, /^name,age\r\n'=CMD\(\),30/);
  assert.equal(csv.rows, 2);
  assert.throws(() => executeTool('json-formatter', { json: 'null', extra: true }), ToolInputError);
});

test('hash, UUID, time and calculator functions are deterministic where expected', () => {
  assert.equal(executeTool('hash-generator', { text: 'abc', algorithm: 'sha256' }).hex, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  const uuids = executeTool('uuid-generator', { count: 3 }).uuids;
  assert.equal(new Set(uuids).size, 3);
  assert.ok(uuids.every(uuid => /^[a-f0-9-]{36}$/.test(uuid)));
  assert.equal(executeTool('unix-timestamp-converter', { value: 0 }).iso, '1970-01-01T00:00:00.000Z');
  assert.equal(executeTool('unix-timestamp-converter', { value: '1970-01-01' }).unixSeconds, 0);
  assert.equal(executeTool('date-diff', { start: '2026-01-01', end: '2026-01-02' }).days, 1);
  assert.equal(executeTool('percentage-calculator', { operation: 'percentOf', a: 20, b: 50 }).result, 10);
  assert.equal(executeTool('discount-calculator', { price: 100, discountPercent: 20, taxPercent: 10 }).total, 88);
  assert.equal(executeTool('profit-margin', { revenue: 200, cost: 50 }).marginPercent, 75);
});

test('REST catalog and execution are real and do not persist inputs', async () => {
  const catalog = await fetch(`${base}/api/v1/tools`).then(response => response.json());
  assert.equal(catalog.tools.length, 18);
  assert.equal(catalog.browserOnlyTools.length, 104);
  const response = await fetch(`${base}/api/v1/tools/json-formatter/execute`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ json: '{"ok":true}', indent: 0 })
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  const body = await response.json();
  assert.equal(body.result.json, '{"ok":true}');
  assert.equal(body.dataHandling, 'not_persisted');
  const bad = await fetch(`${base}/api/v1/tools/json-formatter/execute`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"json":1}' });
  assert.equal(bad.status, 400);
});

async function mcp(message, headers = {}) {
  return fetch(`${base}/api/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...headers },
    body: JSON.stringify(message)
  });
}

test('MCP initializes, lists tools and executes a call', async () => {
  const init = await mcp({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } } });
  assert.equal(init.status, 200);
  assert.equal((await init.json()).result.capabilities.tools.listChanged, false);
  const list = await (await mcp({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })).json();
  assert.equal(list.result.tools.length, 18);
  const call = await (await mcp({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'word-counter', arguments: { text: 'one two three' } } })).json();
  assert.equal(call.result.structuredContent.words, 3);
  assert.equal(call.result.isError, false);
});

test('MCP rejects DNS-rebinding origins and reports tool input errors safely', async () => {
  const blocked = await mcp({ jsonrpc: '2.0', id: 1, method: 'ping' }, { origin: 'https://attacker.example' });
  assert.equal(blocked.status, 403);
  const bad = await (await mcp({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'json-formatter', arguments: { json: '{bad' } } })).json();
  assert.equal(bad.result.isError, true);
  assert.match(bad.result.content[0].text, /Invalid JSON/);
  const unsupported = await mcp({ jsonrpc: '2.0', id: 3, method: 'ping' }, { 'mcp-protocol-version': '1900-01-01' });
  assert.equal(unsupported.status, 400);
});

test('MCP notifications receive 202 and GET listening is explicitly unsupported', async () => {
  const notification = await mcp({ jsonrpc: '2.0', method: 'notifications/initialized' });
  assert.equal(notification.status, 202);
  const get = await fetch(`${base}/api/mcp`, { headers: { accept: 'text/event-stream' } });
  assert.equal(get.status, 405);
});
