import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../backend/app.js';

let runtime;
let server;
let base;

before(async () => {
  runtime = createApplication({ NODE_ENV: 'test', DATABASE_PATH: ':memory:', LOG_LEVEL: 'error', READ_RATE_LIMIT: 10000, TRACK_RATE_LIMIT: 10000 });
  await new Promise(resolve => {
    server = runtime.app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise(resolve => server.close(resolve));
  runtime.db.close();
});

async function request(path, options = {}) {
  return fetch(`${base}${path}`, { redirect: 'manual', ...options });
}

test('liveness and readiness are real and migration-aware', async () => {
  const live = await request('/healthz');
  assert.equal(live.status, 200);
  assert.equal((await live.json()).status, 'ok');
  const ready = await request('/readyz');
  assert.equal(ready.status, 200);
  const body = await ready.json();
  assert.equal(body.database, 'ok');
  assert.deepEqual(body.missingFiles, []);
  assert.ok(body.migrations.includes('001_initial.sql'));
});

test('HTML has request IDs and a hash-based CSP', async () => {
  const response = await request('/');
  assert.equal(response.status, 200);
  assert.ok(response.headers.get('x-request-id'));
  const csp = response.headers.get('content-security-policy');
  const scriptPolicy = csp.split(';').find(part => part.trim().startsWith('script-src '));
  assert.match(scriptPolicy, /sha256-/);
  assert.ok(!scriptPolicy.includes("'unsafe-inline'"));
  assert.match(csp, /frame-ancestors 'self'/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
});

test('canonical clean URLs work and .html/slash redirects preserve queries', async () => {
  for (const path of ['/', '/tools', '/workflows', '/blog', '/advertise', '/tools/json-formatter', '/workflows/prepare-pdf-for-email']) {
    const response = await request(path);
    assert.equal(response.status, 200, path);
    await response.arrayBuffer();
  }
  const html = await request('/tools/json-formatter.html?utm_source=test');
  assert.equal(html.status, 301);
  assert.equal(html.headers.get('location'), '/tools/json-formatter?utm_source=test');
  const slash = await request('/workflows/?x=1');
  assert.equal(slash.status, 301);
  assert.equal(slash.headers.get('location'), '/workflows?x=1');
});

test('SQLite counters increment atomically and top-tools stays an array', async () => {
  const payload = { 'content-type': 'application/json' };
  const first = await request('/api/track', { method: 'POST', headers: payload, body: JSON.stringify({ id: 'json-formatter' }) });
  const second = await request('/api/track', { method: 'POST', headers: payload, body: JSON.stringify({ id: 'json-formatter' }) });
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  const a = await first.json();
  const b = await second.json();
  assert.equal(b.count, a.count + 1);
  const top = await request('/api/top-tools');
  const ids = await top.json();
  assert.ok(Array.isArray(ids));
  assert.ok(ids.includes('json-formatter'));
});

test('invalid, unknown, malformed and oversized tracking requests are rejected', async () => {
  const headers = { 'content-type': 'application/json' };
  let response = await request('/api/track', { method: 'POST', headers, body: JSON.stringify({ id: '../secret' }) });
  assert.equal(response.status, 400);
  response = await request('/api/track', { method: 'POST', headers, body: JSON.stringify({ id: 'not-a-real-tool' }) });
  assert.equal(response.status, 404);
  response = await request('/api/track', { method: 'POST', headers, body: '{bad json' });
  assert.equal(response.status, 400);
  response = await request('/api/track', { method: 'POST', headers, body: JSON.stringify({ id: 'json-formatter', padding: 'x'.repeat(17000) }) });
  assert.equal(response.status, 413);
  response = await request('/api/track', { method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body: 'x' });
  assert.equal(response.status, 415);
});

test('source, environment, data and build files are not publicly served', async () => {
  for (const path of ['/backend/config.js', '/data/toolcrate.db', '/.env', '/tools.json', '/content/workflows.json', '/scripts/growth-build.mjs', '/package.json']) {
    const response = await request(path);
    assert.equal(response.status, 404, path);
    await response.arrayBuffer();
  }
});

test('OAuth issues no demo tokens while real MCP is enabled', async () => {
  const oauth = await request('/oauth/token', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.equal(oauth.status, 501);
  assert.ok(!(await oauth.text()).includes('demo_token'));
  const mcp = await request('/api/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' })
  });
  assert.equal(mcp.status, 200);
  assert.equal((await mcp.json()).result !== undefined, true);
  const status = await (await request('/api/status')).json();
  assert.equal(status.mcp_enabled, true);
  assert.equal(status.execution_tools_count, 18);
  assert.equal(status.tools_count, 122);
});

test('Markdown negotiation and agent discovery expose real content and hashes', async () => {
  const markdown = await request('/tools/json-formatter', { headers: { accept: 'text/markdown' } });
  assert.equal(markdown.status, 200);
  assert.match(markdown.headers.get('content-type'), /text\/markdown/);
  const body = await markdown.text();
  assert.ok(body.includes('JSON Formatter'));
  assert.ok(!body.includes('<script'));
  const skills = await (await request('/.well-known/agent-skills/index.json')).json();
  assert.equal(skills.skills.length, 122);
  assert.match(skills.skills[0].sha256, /^[a-f0-9]{64}$/);
  assert.notEqual(skills.skills[0].sha256, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
});

test('service worker is never cached and HTML 404 carries no ad initializer', async () => {
  const sw = await request('/sw.js');
  assert.equal(sw.status, 200);
  assert.match(sw.headers.get('cache-control'), /no-store/);
  const missing = await request('/definitely-not-a-page', { headers: { accept: 'text/html' } });
  assert.equal(missing.status, 404);
  assert.ok(!(await missing.text()).includes('TC_ADSENSE_CLIENT'));
});
