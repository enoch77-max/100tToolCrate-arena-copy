/**
 * Static + HTTP QA for the PWA layer.
 *
 * Verifies the manifest contract, the icon/screenshot assets, the service
 * worker's offline strategy and the install UI hooks that every page needs.
 * Run with the dev/preview server up:
 *
 *   node scripts/qa-pwa.mjs [http://localhost:3002]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASE = (process.argv[2] || process.env.PWA_QA_BASE || 'http://localhost:3002').replace(/\/$/, '');

const results = [];
let failed = 0;

function check(name, condition, detail) {
  const ok = Boolean(condition);
  if (!ok) failed += 1;
  results.push({ ok, name, detail });
  return ok;
}

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

function exists(relative) {
  return fs.existsSync(path.join(ROOT, relative));
}

/** Read width/height straight from the PNG IHDR chunk. */
function pngSize(relative) {
  const file = path.join(ROOT, relative.replace(/^\//, ''));
  if (!fs.existsSync(file)) return null;
  const buffer = fs.readFileSync(file);
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

async function http(pathname) {
  const response = await fetch(BASE + pathname, { redirect: 'follow' });
  const body = await response.text();
  return { status: response.status, type: response.headers.get('content-type') || '', body, response };
}

const PAGE_FILES = [
  'index.html',
  'tools.html',
  'about.html',
  'contact.html',
  'privacy-policy.html',
  'terms.html',
  'disclaimer.html',
  'blog/index.html',
  'blog/json-vs-csv.html',
  'offline.html'
];

function toolPages() {
  const dir = path.join(ROOT, 'tools');
  return fs.readdirSync(dir).filter((name) => name.endsWith('.html')).map((name) => `tools/${name}`);
}

/* ------------------------------------------------------------------ manifest */

const manifest = JSON.parse(read('manifest.json'));

check('manifest: name and short_name', Boolean(manifest.name) && Boolean(manifest.short_name));
check('manifest: standalone display', manifest.display === 'standalone');
check('manifest: start_url', typeof manifest.start_url === 'string' && manifest.start_url.startsWith('/'));
check('manifest: scope is root', manifest.scope === '/');
check('manifest: id', manifest.id === '/');
check('manifest: theme + background colour', /^#[0-9A-Fa-f]{6}$/.test(manifest.theme_color) && /^#[0-9A-Fa-f]{6}$/.test(manifest.background_color));
check('manifest: categories', Array.isArray(manifest.categories) && manifest.categories.length > 0);
check('manifest: launch_handler', manifest.launch_handler && manifest.launch_handler.client_mode === 'navigate-existing');

const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
const purposes = new Set(icons.map((icon) => icon.purpose || 'any'));
check('manifest: has any icon', purposes.has('any'));
check('manifest: has maskable icon', purposes.has('maskable'));
check('manifest: has monochrome icon', purposes.has('monochrome'));

for (const icon of icons) {
  const relative = icon.src.replace(/^\//, '');
  const size = pngSize(relative);
  check(`icon exists: ${icon.src}`, exists(relative), relative);
  check(
    `icon dimensions match: ${icon.src}`,
    size && `${size.width}x${size.height}` === icon.sizes,
    size ? `${size.width}x${size.height}` : 'unreadable'
  );
  check(`icon type: ${icon.src}`, icon.type === 'image/png');
}

const sizes = new Set(icons.map((icon) => icon.sizes));
check('manifest: 192 and 512 icons present', sizes.has('192x192') && sizes.has('512x512'));

const screenshots = Array.isArray(manifest.screenshots) ? manifest.screenshots : [];
check('manifest: screenshots present', screenshots.length >= 2);
for (const shot of screenshots) {
  const relative = shot.src.replace(/^\//, '');
  const size = pngSize(relative);
  check(`screenshot exists: ${shot.src}`, exists(relative));
  check(
    `screenshot dimensions match: ${shot.src}`,
    size && `${size.width}x${size.height}` === shot.sizes,
    size ? `${size.width}x${size.height}` : 'unreadable'
  );
  check(`screenshot label: ${shot.src}`, Boolean(shot.label));
}
const factors = new Set(screenshots.map((shot) => shot.form_factor));
check('manifest: narrow + wide screenshots', factors.has('narrow') && factors.has('wide'));

const shortcuts = Array.isArray(manifest.shortcuts) ? manifest.shortcuts : [];
check('manifest: 4 shortcuts', shortcuts.length === 4, String(shortcuts.length));
for (const shortcut of shortcuts) {
  check(`shortcut url is absolute path: ${shortcut.short_name}`, /^\/tools\/[a-z0-9-]+$/.test(shortcut.url));
  check(`shortcut icon: ${shortcut.short_name}`, Array.isArray(shortcut.icons) && shortcut.icons.length > 0);
}

/* ------------------------------------------------------------------- service worker */

const sw = read('sw.js');
check('sw: versioned cache name', /const VERSION = 'v\d+-pwa-\d{4}-\d{2}-\d{2}'/.test(sw));
check('sw: offline url defined', /const OFFLINE_URL = '\/offline\.html'/.test(sw));
check('sw: precaches offline page', /PRECACHE_URLS[\s\S]*OFFLINE_URL/.test(sw));
check('sw: precaches app shell', /'\/'/.test(sw) && /style\.css/.test(sw) && /pwa\.js/.test(sw));
check('sw: install uses allSettled (resilient precache)', /Promise\.allSettled/.test(sw));
check('sw: network-first for navigations', /request\.mode === 'navigate'/.test(sw) && /fetch\(request\)/.test(sw));
check('sw: cache match ignores search', /ignoreSearch: true/.test(sw));
check('sw: offline fallback response', /offlineResponse\(\)/.test(sw));
check('sw: bypasses api/ads and allowlists tool CDNs', /\/api\//.test(sw) && /CDN_HOSTS/.test(sw) && /cdn\.jsdelivr\.net/.test(sw));
check('sw: activates new worker', /skipWaiting/.test(sw) && /clients\.claim\(\)/.test(sw));
check('sw: cleans old caches', /caches\.delete/.test(sw));

/* ---------------------------------------------------------------------- install UI */

const pwa = read('assets/js/pwa.js');
check('pwa.js: captures beforeinstallprompt', /addEventListener\('beforeinstallprompt'/.test(pwa));
check('pwa.js: preventDefault on the prompt event', /event\.preventDefault\(\)/.test(pwa));
check('pwa.js: calls prompt()', /promptEvent\.prompt\(\)/.test(pwa));
check('pwa.js: reads userChoice', /userChoice/.test(pwa));
check('pwa.js: listens for appinstalled', /addEventListener\('appinstalled'/.test(pwa));
check('pwa.js: dismiss cooldown storage', /100toolcrate-pwa-dismissed-at/.test(pwa) && /DISMISS_DAYS = 14/.test(pwa));
check('pwa.js: iOS detection incl. iPadOS', /MacIntel/.test(pwa) && /maxTouchPoints/.test(pwa));
check('pwa.js: iOS add-to-home-screen steps', /Add to Home Screen/.test(pwa));
check('pwa.js: focus trap + escape', /event\.key === 'Escape'/.test(pwa) && /event\.key !== 'Tab'/.test(pwa));
check('pwa.js: registers service worker on load', /serviceWorker' in navigator/.test(pwa) && /register\('\/sw\.js'/.test(pwa));
check('pwa.js: suppresses banner in standalone', /display-mode: standalone/.test(pwa));
check('pwa.js: manual install trigger handler', /\[data-pwa-install\]/.test(pwa));

const css = read('assets/css/style.css');
check('css: banner styles', /\.pwa-banner \{/.test(css) && /\.pwa-banner\.is-visible/.test(css));
check('css: sheet styles', /\.pwa-sheet \{/.test(css) && /\.pwa-sheet-layer\.is-open/.test(css));
check('css: footer install link', /\.pwa-install-link/.test(css));
check('css: safe-area padding', /env\(safe-area-inset-bottom/.test(css));
check('css: reduced motion handling', /prefers-reduced-motion: reduce[\s\S]*\.pwa-banner/.test(css));

/* --------------------------------------------------------------------- page heads */

const allPages = [...PAGE_FILES.filter((page) => page !== 'offline.html'), ...toolPages()];
let headMissing = [];
for (const page of allPages) {
  if (!exists(page)) {
    headMissing.push(`${page}: missing file`);
    continue;
  }
  const html = read(page);
  const problems = [];
  if (!/viewport-fit=cover/.test(html)) problems.push('viewport-fit');
  if (!/rel="apple-touch-icon" href="\/assets\/pwa\/apple-touch-icon\.png"/.test(html)) problems.push('apple-touch-icon');
  if (!/rel="manifest" href="\/manifest\.json"/.test(html)) problems.push('manifest');
  if (!/name="theme-color"/.test(html)) problems.push('theme-color');
  if (!/assets\/js\/pwa\.js/.test(html)) problems.push('pwa.js');
  if (!/data-pwa-install/.test(html)) problems.push('footer install trigger');
  if (problems.length) headMissing.push(`${page}: ${problems.join(', ')}`);
}
check(`all ${allPages.length} pages carry the PWA head + install trigger`, headMissing.length === 0, headMissing.slice(0, 8).join(' | '));

const themeColorPages = allPages.filter((page) => exists(page) && !/apple-mobile-web-app-capable/.test(read(page)));
check('all pages declare apple-mobile-web-app-capable', themeColorPages.length === 0, themeColorPages.slice(0, 5).join(', '));

/* ------------------------------------------------------------------- offline page */

const offline = read('offline.html');
check('offline page: noindex', /name="robots" content="noindex"/.test(offline));
check('offline page: self-contained (no external css/js)', !/<link rel="stylesheet"/.test(offline) && !/<script src=/.test(offline));
check('offline page: retry link', /href="\/"[^>]*>Try again/.test(offline));
check('offline page: links to cached tools', (offline.match(/href="\/tools\//g) || []).length >= 4);

/* ------------------------------------------------------------------ server routes */

check('server: manifest content type', /application\/manifest\+json/.test(read('backend/routes/site.js')));
check('server: sw no-cache + allowed scope', /Service-Worker-Allowed/.test(read('backend/routes/site.js')));
check('server: no unsafe-eval in CSP', !/unsafe-eval/.test(read('backend/html.js')));

/* ------------------------------------------------------------------------- HTTP */

const home = await http('/');
check('http: home 200', home.status === 200, String(home.status));
check('http: home serves manifest link', /rel="manifest" href="\/manifest\.json"/.test(home.body));
check('http: home serves pwa.js', /assets\/js\/pwa\.js\?v=/.test(home.body));

const servedManifest = await http('/manifest.json');
check('http: manifest is application/manifest+json', servedManifest.type.includes('application/manifest+json'), servedManifest.type);
let servedManifestJson = null;
try {
  servedManifestJson = JSON.parse(servedManifest.body);
} catch (error) {
  servedManifestJson = null;
}
check('http: manifest parses and matches file', servedManifestJson && servedManifestJson.start_url === manifest.start_url);

const servedSw = await http('/sw.js');
check('http: sw served as javascript', /javascript/.test(servedSw.type), servedSw.type);
check('http: sw is not cached by the browser', /no-store/.test(servedSw.response.headers.get('cache-control') || ''), servedSw.response.headers.get('cache-control') || '');
check('http: sw allowed at root scope', servedSw.response.headers.get('service-worker-allowed') === '/', servedSw.response.headers.get('service-worker-allowed') || '');

const servedOffline = await http('/offline');
check('http: /offline 200', servedOffline.status === 200, String(servedOffline.status));
check('http: /offline is the offline page', /You're offline/.test(servedOffline.body));

const redirect = await fetch(BASE + '/offline.html', { redirect: 'manual' });
check('http: /offline.html redirects to /offline', redirect.status === 301 && (redirect.headers.get('location') || '').endsWith('/offline'), `${redirect.status} ${redirect.headers.get('location')}`);

for (const shortcut of shortcuts) {
  const page = await http(shortcut.url);
  check(`http: shortcut target 200 ${shortcut.url}`, page.status === 200, String(page.status));
}

const blog = await http('/blog/');
check('http: blog index 200', blog.status === 200, String(blog.status));
check('http: blog index has install trigger', /data-pwa-install/.test(blog.body));

for (const icon of icons) {
  const asset = await fetch(BASE + icon.src);
  check(`http: icon served ${icon.src}`, asset.status === 200 && (asset.headers.get('content-type') || '').includes('image/png'), `${asset.status}`);
}

for (const shot of screenshots) {
  const asset = await fetch(BASE + shot.src);
  check(`http: screenshot served ${shot.src}`, asset.status === 200, String(asset.status));
}

/* ------------------------------------------------------------------------ report */

const width = Math.max(...results.map((r) => r.name.length), 10);
for (const result of results) {
  console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name.padEnd(width)}  ${result.detail || ''}`);
}
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
