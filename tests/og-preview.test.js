import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { isPublicAddress, parseMetadata } from '../backend/og-preview.js';
import { createApplication } from '../backend/app.js';

let runtime;
let server;
let base;
before(async () => {
  runtime = createApplication({ NODE_ENV: 'test', DATABASE_PATH: ':memory:', LOG_LEVEL: 'error', READ_RATE_LIMIT: 10000, TRACK_RATE_LIMIT: 10000 });
  await new Promise(resolve => { server = runtime.app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); runtime.db.close(); });

test('private, loopback, link-local, mapped and documentation addresses are blocked', () => {
  for (const address of ['127.0.0.1', '10.2.3.4', '192.168.1.1', '169.254.1.1', '172.20.1.1', '100.64.0.1', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '2001:db8::1']) {
    assert.equal(isPublicAddress(address), false, address);
  }
  assert.equal(isPublicAddress('8.8.8.8'), true);
  assert.equal(isPublicAddress('2606:4700:4700::1111'), true);
});

test('metadata parser reads Open Graph, entities and relative images', () => {
  const result = parseMetadata(`<!doctype html><title>Fallback &amp; title</title><meta content="A &quot;social&quot; title" property="og:title"><meta name="description" content="Description"><meta property="og:image" content="/card.png"><meta property="og:site_name" content="Example">`, 'https://example.com/articles/post');
  assert.equal(result.title, 'A "social" title');
  assert.equal(result.description, 'Description');
  assert.equal(result.image, 'https://example.com/card.png');
  assert.equal(result.siteName, 'Example');
});

test('metadata API rejects private network targets and missing parameters', async () => {
  let response = await fetch(`${base}/api/og-preview`);
  assert.equal(response.status, 400);
  response = await fetch(`${base}/api/og-preview?url=${encodeURIComponent('http://127.0.0.1:8080/admin')}`);
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /Private|Local|public/);
  response = await fetch(`${base}/api/og-preview?url=${encodeURIComponent('file:///etc/passwd')}`);
  assert.equal(response.status, 400);
});
