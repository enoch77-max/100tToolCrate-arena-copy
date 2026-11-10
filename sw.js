/* 100ToolCrate PWA service worker.
 * App shell: resilient precache. Navigations: network first with clean-URL and
 * .html fallbacks. Static/CDN libraries: cache first. APIs and ads: never cached.
 */
const VERSION = 'v90-pwa-2026-11-10';
const SHELL_CACHE = `100toolcrate-shell-${VERSION}`;
const RUNTIME_CACHE = `100toolcrate-runtime-${VERSION}`;
const CDN_CACHE = `100toolcrate-cdn-${VERSION}`;
const OFFLINE_URL = '/offline.html';
const PRECACHE_URLS = [
  '/',
  '/tools.html',
  '/workflows/index.html',
  '/services.html',
  OFFLINE_URL,
  '/manifest.json',
  '/assets/css/style.css',
  '/assets/js/theme.js',
  '/assets/js/main.js',
  '/assets/js/pwa.js',
  '/assets/js/search.js',
  '/assets/js/workflows.js',
  '/assets/js/services.js',
  '/assets/js/tools-logic.js',
  '/assets/pwa/icon-192.png',
  '/assets/pwa/icon-512.png',
  '/assets/pwa/apple-touch-icon.png',
  '/assets/favicon.png',
  '/tools/image-compressor',
  '/tools/pdf-merger',
  '/tools/json-formatter',
  '/tools/word-counter',
  '/tools/qr-generator',
  '/tools/password-generator',
  '/tools/online-notepad',
  '/tools/pomodoro-timer'
];

const CDN_HOSTS = new Set([
  'cdn.jsdelivr.net', 'unpkg.com', 'cdnjs.cloudflare.com',
  'fonts.googleapis.com', 'fonts.gstatic.com'
]);
const STATIC_EXTENSIONS = /\.(?:js|css|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|otf|wasm)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => Promise.allSettled(PRECACHE_URLS.map(async (url) => {
        const response = await fetch(url, { cache: 'reload' });
        if (!response.ok) throw new Error(`Precache ${url}: HTTP ${response.status}`);
        await cache.put(url, response);
      })))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith('100toolcrate-') && ![SHELL_CACHE, RUNTIME_CACHE, CDN_CACHE].includes(key))
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

function putInCache(cacheName, request, response) {
  if (!response || !(response.ok || response.type === 'opaque')) return;
  const copy = response.clone();
  caches.open(cacheName).then(async (cache) => {
    await cache.put(request, copy);
    if (cacheName === RUNTIME_CACHE) {
      const keys = await cache.keys();
      // Bound the dynamic page cache. Precached shell entries are never evicted.
      if (keys.length > 90) await cache.delete(keys[0]);
    }
  }).catch(() => {});
}

function navigationCandidates(request) {
  const url = new URL(request.url);
  let pathname = url.pathname;
  if (pathname === '/') return [request, '/index.html'];
  const withoutSlash = pathname.replace(/\/$/, '');
  const candidates = [request, withoutSlash, `${withoutSlash}.html`, `${withoutSlash}/index.html`];
  if (pathname.endsWith('/')) candidates.push(`${pathname}index.html`);
  return [...new Set(candidates)];
}

async function matchNavigation(request) {
  for (const candidate of navigationCandidates(request)) {
    const match = await caches.match(candidate, { ignoreSearch: true });
    if (match) return match;
  }
  return null;
}

function offlineResponse() {
  return caches.match(OFFLINE_URL).then((cached) => cached || new Response(
    '<!DOCTYPE html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0B0E14"><title>Offline - 100ToolCrate</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0B0E14;color:#E8EDF6;font-family:system-ui,sans-serif;text-align:center;padding:1.5rem"><main><h1>You are offline</h1><p style="color:#96A2B8">Reconnect and try again.</p><p><a href="/" style="color:#3B82F6">Reload 100ToolCrate</a></p></main></body></html>',
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  ));
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('range')) return;
  const url = new URL(request.url);

  // APIs, MCP, analytics and advertising must always use the network and are
  // never stored in the PWA cache.
  if (url.pathname.startsWith('/api/') || /(?:google|doubleclick|cloudflareinsights|googlesyndication)/i.test(url.hostname)) return;

  // Third-party tool engines and fonts are cached only on an explicit host
  // allowlist. Opaque no-CORS script responses are safe to replay for the same URL.
  if (url.origin !== self.location.origin) {
    if (!CDN_HOSTS.has(url.hostname)) return;
    const fontCss = url.hostname === 'fonts.googleapis.com' && url.pathname.startsWith('/css');
    if (!STATIC_EXTENSIONS.test(url.pathname) && !fontCss) return;
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        putInCache(CDN_CACHE, request, response);
        return response;
      }).catch(() => new Response('', { status: 504, statusText: 'Offline' })))
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          putInCache(RUNTIME_CACHE, request, response);
          return response;
        })
        .catch(async () => (await matchNavigation(request)) || offlineResponse())
    );
    return;
  }

  // Code, styles and the manifest are network first so a deployment cannot
  // leave installed users pinned to an obsolete app shell. Cached copies are
  // used only when the network is unavailable.
  if (/\.(?:js|css|html)$/i.test(url.pathname) || url.pathname === '/manifest.json') {
    event.respondWith(
      fetch(request).then((response) => {
        putInCache(RUNTIME_CACHE, request, response);
        return response;
      }).catch(() => caches.match(request, { ignoreSearch: true })
        .then((cached) => cached || new Response('', { status: 504, statusText: 'Offline' })))
    );
    return;
  }

  // Images, icons, fonts and other static resources are cache first.
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => cached || fetch(request).then((response) => {
      putInCache(RUNTIME_CACHE, request, response);
      return response;
    }).catch(() => new Response('', { status: 504, statusText: 'Offline' })))
  );
});
