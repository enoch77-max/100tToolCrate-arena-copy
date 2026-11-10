import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { onRequest } from '../functions/api/[[path]].js';
import { onRequestGet as health } from '../functions/healthz.js';
import { onRequestGet as ready } from '../functions/readyz.js';

const ORIGIN = 'https://100toolcrate.com';

function call(path, options = {}, env = {}) {
  const request = new Request(`${ORIGIN}${path}`, options);
  return onRequest({ request, env, params: {} });
}

function jsonPost(path, body, env = {}) {
  return call(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body)
  }, env);
}

test('Pages build output contains routing, sitemap and discovery files', () => {
  for (const file of ['dist/index.html', 'dist/_headers', 'dist/_redirects', 'dist/_routes.json', 'dist/sitemap.xml', 'dist/.well-known/mcp/server-card.json', 'dist/.well-known/agent-skills/index.json', 'dist/docs/api.html']) {
    assert.ok(fs.existsSync(file), `${file} should exist`);
  }
  const routes = JSON.parse(fs.readFileSync('dist/_routes.json', 'utf8'));
  assert.ok(routes.include.includes('/api/*'));
  const sitemap = fs.readFileSync('dist/sitemap.xml', 'utf8');
  assert.ok(sitemap.includes('/tools/json-formatter'));
  assert.ok(sitemap.includes('/agents'));
  assert.ok(!sitemap.includes('/alternatives/'));
});

test('Pages health, readiness and status are real', async () => {
  const live = await health();
  assert.equal(live.status, 200);
  const readyResponse = await ready({ env: {} });
  assert.equal(readyResponse.status, 200);
  const readyBody = await readyResponse.json();
  assert.equal(readyBody.status, 'ready');
  assert.equal(readyBody.execution_tools_count, 18);

  const status = await call('/api/status');
  assert.equal(status.status, 200);
  const body = await status.json();
  assert.equal(body.runtime, 'cloudflare-pages');
  assert.equal(body.mcp_enabled, true);
  assert.equal(body.tools_count, 122);
});

test('Pages execution catalog and tool call work without a database', async () => {
  const catalog = await (await call('/api/v1/tools')).json();
  assert.equal(catalog.tools.length, 18);
  assert.equal(catalog.browserOnlyTools.length, 104);

  const response = await jsonPost('/api/v1/tools/json-formatter/execute', { json: '{"ok":true}', indent: 0 });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  const body = await response.json();
  assert.equal(body.result.json, '{"ok":true}');
  assert.equal(body.dataHandling, 'not_persisted');

  const bad = await jsonPost('/api/v1/tools/json-formatter/execute', { json: 123 });
  assert.equal(bad.status, 400);
});

test('Pages MCP initializes, lists and calls tools', async () => {
  const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
  const init = await call('/api/mcp', { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } }) });
  assert.equal(init.status, 200);
  assert.equal((await init.json()).result.capabilities.tools.listChanged, false);

  const list = await (await call('/api/mcp', { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) })).json();
  assert.equal(list.result.tools.length, 18);

  const result = await (await call('/api/mcp', { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'word-counter', arguments: { text: 'one two three' } } }) })).json();
  assert.equal(result.result.structuredContent.words, 3);
  assert.equal(result.result.isError, false);
});

test('Pages MCP rejects foreign Origin and unsupported protocol versions', async () => {
  const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream', origin: 'https://attacker.example' };
  const blocked = await call('/api/mcp', { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }) });
  assert.equal(blocked.status, 403);

  const unsupported = await call('/api/mcp', { method: 'POST', headers: { ...headers, origin: ORIGIN, 'mcp-protocol-version': '1900-01-01' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }) });
  assert.equal(unsupported.status, 400);
});

test('Pages counters degrade honestly without D1 and use seed top tools', async () => {
  const top = await call('/api/top-tools');
  assert.equal(top.status, 200);
  assert.equal(top.headers.get('x-usage-source'), 'static-seed');
  assert.ok(Array.isArray(await top.json()));

  const track = await jsonPost('/api/track', { id: 'json-formatter' });
  assert.equal(track.status, 503);
  assert.match((await track.json()).error, /D1/);
});

test('Pages Open Graph preview blocks private targets', async () => {
  const missing = await call('/api/og-preview');
  assert.equal(missing.status, 400);
  const privateTarget = await call(`/api/og-preview?url=${encodeURIComponent('https://127.0.0.1:8080/admin')}`);
  assert.equal(privateTarget.status, 400);
  assert.match((await privateTarget.json()).error, /Private|Local|public/);
});
