import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const BASE = 'https://100toolcrate.com';
const source = fs.readFileSync('sw.js', 'utf8');

function harness(fetchImpl) {
  const listeners = {};
  const stores = new Map();
  const absolute = input => {
    const raw = typeof input === 'string' ? input : input.url;
    return new URL(raw, BASE).href;
  };
  function store(name) {
    if (!stores.has(name)) stores.set(name, new Map());
    return stores.get(name);
  }
  const caches = {
    async open(name) {
      const map = store(name);
      return {
        async put(request, response) { map.set(absolute(request), response.clone ? response.clone() : response); },
        async keys() { return [...map.keys()].map(url => ({ url })); },
        async delete(request) { return map.delete(absolute(request)); }
      };
    },
    async match(input, options = {}) {
      const url = new URL(absolute(input));
      for (const map of stores.values()) {
        for (const [key, response] of map) {
          const cached = new URL(key);
          const match = options.ignoreSearch
            ? cached.origin === url.origin && cached.pathname === url.pathname
            : key === url.href;
          if (match) return response;
        }
      }
      return undefined;
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); }
  };
  const self = {
    location: { origin: BASE },
    addEventListener(type, listener) { listeners[type] = listener; },
    async skipWaiting() { self.skipped = (self.skipped || 0) + 1; },
    clients: { async claim() { self.claimed = true; } }
  };
  vm.runInNewContext(source, {
    self, caches, fetch: fetchImpl, Response, Headers, URL, console, setTimeout, clearTimeout
  });
  return { listeners, stores, self, absolute };
}

function navigation(url) {
  return { url, method: 'GET', mode: 'navigate', headers: new Headers() };
}

function invokeFetch(worker, request) {
  let responsePromise;
  worker.listeners.fetch({
    request,
    respondWith(value) { responsePromise = value; }
  });
  return responsePromise;
}

test('service worker returns cached offline document after a real fetch rejection', async () => {
  const worker = harness(async () => { throw new Error('network unavailable'); });
  const cacheName = [...worker.stores.keys()][0] || '100toolcrate-shell-v90-pwa-2026-11-10';
  const cache = worker.stores.get(cacheName) || worker.stores.set(cacheName, new Map()).get(cacheName);
  cache.set(worker.absolute('/offline.html'), new Response('<h1>You\'re offline</h1>', { headers: { 'Content-Type': 'text/html' } }));
  const response = await invokeFetch(worker, navigation(`${BASE}/missing-page`));
  assert.ok(response instanceof Response);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /You're offline/);
});

test('navigation network failure falls back to a cached core tool', async () => {
  const worker = harness(async () => { throw new Error('offline'); });
  const cacheName = '100toolcrate-shell-v90-pwa-2026-11-10';
  const cache = worker.stores.set(cacheName, new Map()).get(cacheName);
  cache.set(worker.absolute('/tools/json-formatter'), new Response('<h1>JSON Formatter</h1>'));
  const response = await invokeFetch(worker, navigation(`${BASE}/tools/json-formatter?source=pwa`));
  assert.match(await response.text(), /JSON Formatter/);
});

test('JavaScript uses fresh network code online and cached code offline', async () => {
  let online = true;
  const worker = harness(async () => {
    if (!online) throw new Error('offline');
    return new Response('new app version');
  });
  const cacheName = '100toolcrate-runtime-v90-pwa-2026-11-10';
  const cache = worker.stores.set(cacheName, new Map()).get(cacheName);
  const url = `${BASE}/assets/js/main.js?v=90`;
  cache.set(worker.absolute(url), new Response('old cached version'));
  const request = { url, method: 'GET', mode: 'cors', headers: new Headers() };
  const fresh = await invokeFetch(worker, request);
  assert.equal(await fresh.text(), 'new app version');
  online = false;
  const cached = await invokeFetch(worker, request);
  // The successful online response replaces the stale cache for offline use.
  assert.equal(await cached.text(), 'new app version');
});

test('service worker bypasses APIs and advertising requests', () => {
  const worker = harness(async () => new Response('network'));
  const api = invokeFetch(worker, { url: `${BASE}/api/status`, method: 'GET', mode: 'cors', headers: new Headers() });
  assert.equal(api, undefined);
  const ad = invokeFetch(worker, { url: 'https://pagead2.googlesyndication.com/ad', method: 'GET', mode: 'no-cors', headers: new Headers() });
  assert.equal(ad, undefined);
});

test('install precaches app shell entries without one optional failure blocking others', async () => {
  const requested = [];
  const worker = harness(async url => {
    requested.push(String(url));
    if (String(url).endsWith('/manifest.json')) return new Response('missing', { status: 404 });
    return new Response('ok');
  });
  let installPromise;
  worker.listeners.install({ waitUntil(value) { installPromise = value; } });
  await installPromise;
  assert.ok(requested.length >= 20);
  assert.ok(requested.some(url => String(url).includes('/assets/js/tools-logic.js')));
  assert.equal(worker.self.skipped, 1);
});
