/**
 * inline-assets.mjs — preview/deploy hardening pass.
 *
 * The canonical site (repo root) uses root-absolute asset URLs and clean URLs,
 * which rely on a production server (express / Vercel cleanUrls). Static preview
 * hosts may serve the build from a sub-path, a proxy, or as a single HTML file,
 * where "/assets/..." and "/tools/slug" both fail and the page renders unstyled.
 *
 * This pass produces dist/ where:
 *  - every local stylesheet, script and image is inlined (data URIs for images),
 *    except the large shared tools-logic.js engine which stays a relative file;
 *  - all internal hrefs/srcs are relative and point at real .html files, so the
 *    bundle works at any base path on any plain static server;
 *  - JS-generated navigation is base-path aware via window.__TC_BASE__;
 *  - the PWA service worker is copied to the deployment root and registered by
 *    pwa.js, providing an offline app shell and cached visited pages.
 *
 * Source files in the repo root are never modified by this pass.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const COPY_DIRS = ['assets', 'tools', 'blog', 'workflows', 'alternatives', 'api', 'docs'];
const COPY_FILES = [
  'manifest.json', 'sw.js', 'metadata.json', 'tool-stats.json', 'tools.json',
  'robots.txt', 'sitemap.xml', 'feed.xml', 'ads.txt', 'llms.txt', 'BingSiteAuth.xml',
  'auth.md',
];
// Deliberately excluded: server.js, generator.js, scripts/, content/, _headers,
// vercel.json (restrictive CSP headers), sw.js (stale-cache risk in previews),
// package*.json, .env*, markdown docs not needed at runtime.

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.woff2': 'font/woff2',
};

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) copyRecursive(path.join(src, entry), path.join(dest, entry));
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function walkHtml(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, base, out);
    else if (entry.name.endsWith('.html')) out.push(path.relative(base, full));
  }
  return out;
}

const dataUriCache = new Map();
const INLINE_IMAGE_LIMIT = 64 * 1024; // larger images stay relative files
function dataUri(relPath) {
  if (dataUriCache.has(relPath)) return dataUriCache.get(relPath);
  const file = path.join(DIST, relPath);
  if (!fs.existsSync(file)) return null;
  if (fs.statSync(file).size > INLINE_IMAGE_LIMIT) {
    dataUriCache.set(relPath, null);
    return null;
  }
  const ext = path.extname(file).toLowerCase();
  const uri = `data:${MIME[ext] || 'application/octet-stream'};base64,${fs.readFileSync(file).toString('base64')}`;
  dataUriCache.set(relPath, uri);
  return uri;
}

/** Make inline <script> bodies safe for the HTML parser. */
function escapeJs(code) {
  return code.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '\\x3C!--');
}

/** Base-path aware navigation patches, applied to dist copies only. */
function patchJs(name, code) {
  if (name === 'search.js') {
    code = code.replace(
      'item.href = `/tools/${tool.id}`;',
      'item.href = `${window.__TC_BASE__ || \'\'}tools/${tool.id}.html`;'
    );
    code = code.replace(
      'window.location.href = `/tools?q=${encodeURIComponent(q)}`;',
      'window.location.href = `${window.__TC_BASE__ || \'\'}tools.html?q=${encodeURIComponent(q)}`;'
    );
  }
  if (name === 'main.js') {
    // Hub detection must work under any mount path, not just "/".
    code = code.replace(
      /const isTopHub = \([\s\S]*?\n    \);/,
      `const pathTail = currentPath.split('/').filter(Boolean).pop() || '';
    const isTopHub = (
      ['', 'index.html', 'tools.html', 'tools', 'blog', 'about', 'about.html',
       'contact', 'contact.html', 'privacy-policy', 'privacy-policy.html',
       'terms', 'terms.html', 'disclaimer', 'disclaimer.html'].includes(pathTail)
      && !currentPath.includes('/blog/')
    ) || currentPath === '/';`
    );
    code = code.replace("currentPath.startsWith('/blog/')", "currentPath.includes('/blog/')");
    code = code.replace("window.location.href = '/blog';", "window.location.href = (window.__TC_BASE__ || '') + 'blog/index.html';");
    code = code.replace("window.location.href = '/';", "window.location.href = (window.__TC_BASE__ || '') + 'index.html';");
  }
  if (name === 'tools-logic.js') {
    code = code.replace(
      'href="/tools"',
      'href="\' + (window.__TC_BASE__ || \'\') + \'tools.html"'
    );
  }
  if (name === 'webmcp.js') {
    for (const p of ['.well-known/api-catalog', '.well-known/mcp/server-card.json', '.well-known/agent-skills/index.json', 'auth.md']) {
      code = code.split(`"/${p}"`).join(`(window.__TC_BASE__ || "") + "${p}"`);
    }
  }
  // pwa.js remains intact so the built site is installable and registers sw.js.
  return code;
}

const HEAD_BOOTSTRAP = (prefix) => `<script>
window.__TC_BASE__ = ${JSON.stringify(prefix)};
(function () {
  // pwa.js registers /sw.js after load. Do not unregister it or clear the PWA
  // caches here: the installed app depends on the generated offline app shell.
  try {
    var doc = document.documentElement;
    var probe = function () {
      try { return document.fonts.check('24px "Material Symbols Outlined"'); } catch (e) { return false; }
    };
    if (document.fonts && document.fonts.load) {
      document.fonts.load('24px "Material Symbols Outlined"', 'home').then(function (f) {
        if (f && f.length) { doc.classList.add('ms-ok'); doc.classList.remove('ms-fail'); }
      }).catch(function () {});
      document.fonts.ready.then(function () {
        if (probe()) { doc.classList.add('ms-ok'); doc.classList.remove('ms-fail'); }
      });
      setTimeout(function () { if (!probe()) doc.classList.add('ms-fail'); }, 4000);
    } else {
      doc.classList.add('ms-ok');
    }
  } catch (e) {}
})();
</script>
<style>
html:not(.ms-ok):not(.ms-fail) .material-symbols-outlined{font-size:0;}
html.ms-fail .material-symbols-outlined{display:none;}
</style>`;

/** Resolve a root-absolute site path to a real file inside dist. */
function resolveSitePath(p) {
  if (p === '' || p === '/') return 'index.html';
  if (p.includes('..')) return null;
  const candidates = [p, `${p}.html`, `${p}/index.html`, `${p}.md`];
  for (const c of candidates) {
    const full = path.join(DIST, c);
    if (full.startsWith(DIST) && fs.existsSync(full) && fs.statSync(full).isFile()) return c;
  }
  return null;
}

function processHtml(relFile, css) {
  const full = path.join(DIST, relFile);
  const depth = relFile.split(path.sep).length - 1;
  const prefix = depth === 0 ? '' : '../'.repeat(depth);
  let html = fs.readFileSync(full, 'utf8');

  // 1. Drop third-party analytics beacon (blocked by CSP in sandboxes; noise).
  html = html.replace(/<!-- Cloudflare Web Analytics -->[\s\S]*?<!-- End Cloudflare Web Analytics -->/g, '');

  // 2. Head bootstrap: base path, SW cleanup, icon-font readiness.
  //    Injected at the END of <head> so the charset meta stays within the
  //    first 1024 bytes (encoding sniffing window).
  html = html.replace(/<\/head>/i, `${HEAD_BOOTSTRAP(prefix)}\n</head>`);

  // 3. Inline the stylesheet.
  html = html.replace(
    /<link\b[^>]*href="\/assets\/css\/style\.css[^"]*"[^>]*>/gi,
    () => `<style>\n${css}\n</style>`
  );

  // 4. Inline local images / icons referenced from link & img tags.
  html = html.replace(
    /\b(href|src)="(\/assets\/[^"?#]+\.(?:png|jpe?g|gif|svg|webp|ico))(\?[^"#]*)?(#[^"]*)?"/gi,
    (m, attr, p) => {
      const uri = dataUri(p.slice(1));
      return uri ? `${attr}="${uri}"` : m;
    }
  );

  // 4b. Inline url(/assets/...) references inside style attributes / blocks
  //     (blog thumbnails use background-image).
  html = html.replace(
    /url\(\s*(['"]?)\/(assets\/[^)'"]+?)\1\s*\)/gi,
    (m, q, p) => {
      const uri = dataUri(p);
      return uri ? `url("${uri}")` : `url("${prefix}${p}")`;
    }
  );

  // 5. Local scripts: inline theme.js in place; collect deferred scripts and
  //    re-emit them before </body> in original order (same execution semantics
  //    as defer, and top-level declarations stay global).
  const deferred = [];
  html = html.replace(
    /<script\b([^>]*)\bsrc="\/assets\/js\/([^"?]+\.js)[^"]*"([^>]*)>\s*<\/script>/gi,
    (m, pre, name, post) => {
      const attrs = `${pre} ${post}`;
      const file = path.join(DIST, 'assets', 'js', name);
      if (!fs.existsSync(file)) return m;
      // The heavy shared engine stays a relative external file to keep the
      // bundle small; it is only referenced by tool pages.
      if (name === 'tools-logic.js') {
        return `<script src="${prefix}assets/js/tools-logic.js" defer></script>`;
      }
      const code = escapeJs(patchJs(name, fs.readFileSync(file, 'utf8')));
      if (/\bdefer\b/i.test(attrs)) {
        deferred.push(`<script>\n${code}\n</script>`);
        return '';
      }
      return `<script>\n${code}\n</script>`;
    }
  );
  if (deferred.length) {
    html = html.replace(/<\/body>/i, `${deferred.join('\n')}\n</body>`);
  }

  // 6. Rewrite remaining root-absolute internal URLs to relative real files.
  html = html.replace(
    /\b(href|src|action|poster)="\/([^"]*)"/g,
    (m, attr, rest) => {
      if (rest.startsWith('/')) return m; // protocol-relative external
      const hashIdx = rest.indexOf('#');
      const hash = hashIdx >= 0 ? rest.slice(hashIdx) : '';
      let p = hashIdx >= 0 ? rest.slice(0, hashIdx) : rest;
      const qIdx = p.indexOf('?');
      const query = qIdx >= 0 ? p.slice(qIdx) : '';
      p = qIdx >= 0 ? p.slice(0, qIdx) : p;
      const resolved = resolveSitePath(p);
      const target = resolved !== null ? resolved : p;
      return `${attr}="${prefix}${target}${query}${hash}"`;
    }
  );

  fs.writeFileSync(full, html);
  return { relFile, size: Buffer.byteLength(html) };
}

function main() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  for (const dir of COPY_DIRS) {
    const src = path.join(ROOT, dir);
    if (fs.existsSync(src)) copyRecursive(src, path.join(DIST, dir));
  }
  for (const file of COPY_FILES) {
    const src = path.join(ROOT, file);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(DIST, file));
  }
  for (const entry of fs.readdirSync(ROOT)) {
    if (entry.endsWith('.html')) fs.copyFileSync(path.join(ROOT, entry), path.join(DIST, entry));
  }
  // IndexNow verification is a public root text file, generated by growth-build.
  const indexNowPath = path.join(ROOT, 'indexnow.json');
  if (fs.existsSync(indexNowPath)) {
    const { key } = JSON.parse(fs.readFileSync(indexNowPath, 'utf8'));
    const keyFile = path.join(ROOT, `${key}.txt`);
    if (/^[a-zA-Z0-9-]{8,128}$/.test(key) && fs.existsSync(keyFile)) {
      fs.copyFileSync(keyFile, path.join(DIST, `${key}.txt`));
    }
  }

  // Static .well-known documents (served dynamically by server.js in prod).
  const wellKnown = path.join(DIST, '.well-known');
  fs.mkdirSync(path.join(wellKnown, 'mcp'), { recursive: true });
  fs.mkdirSync(path.join(wellKnown, 'agent-skills'), { recursive: true });
  let apiTitle = '100ToolCrate API';
  let apiVersion = '1.0.0';
  try {
    const spec = JSON.parse(fs.readFileSync(path.join(DIST, 'api', 'openapi.json'), 'utf8'));
    apiTitle = spec.info?.title || apiTitle;
    apiVersion = spec.info?.version || apiVersion;
  } catch {}
  fs.writeFileSync(path.join(wellKnown, 'api-catalog'), JSON.stringify({
    linkset: [{
      item: [
        { href: 'api/openapi.json', type: 'application/openapi+json', title: apiTitle },
        { href: 'docs/api.md', type: 'text/markdown', title: 'API documentation' },
      ],
    }],
  }, null, 2));
  fs.writeFileSync(path.join(wellKnown, 'mcp', 'server-card.json'), JSON.stringify({
    name: '100ToolCrate',
    title: apiTitle,
    version: apiVersion,
    description: 'MCP transport is not enabled in the static preview build. Browser tools remain available on their public pages.',
    documentation: 'docs/api.md',
    status: 'unavailable',
    capabilities: { tools: false },
  }, null, 2));
  const staticTools = JSON.parse(fs.readFileSync(path.join(DIST, 'tools.json'), 'utf8'));
  fs.writeFileSync(path.join(wellKnown, 'agent-skills', 'index.json'), JSON.stringify({
    name: '100ToolCrate public tool catalog',
    description: 'Public browser-tool metadata for the static preview build. This is not an authenticated execution API.',
    skills: staticTools.map(tool => {
      const page = path.join(DIST, 'tools', `${tool.id}.html`);
      const sha256 = fs.existsSync(page) ? crypto.createHash('sha256').update(fs.readFileSync(page)).digest('hex') : undefined;
      return { name: tool.id, type: tool.cat, description: tool.desc, url: `tools/${tool.id}.html`, ...(sha256 ? { sha256 } : {}) };
    }),
  }, null, 2));

  // Keep root-absolute manifest, scope, icon and screenshot URLs. Cloudflare
  // Pages hosts the app at the origin root, which is required for the PWA's
  // declared scope and for installability on Android/iOS home screens.

  // The shared engine stays external; patch its dist copy for base-path aware
  // fallback navigation too.
  const enginePath = path.join(DIST, 'assets', 'js', 'tools-logic.js');
  if (fs.existsSync(enginePath)) {
    fs.writeFileSync(enginePath, patchJs('tools-logic.js', fs.readFileSync(enginePath, 'utf8')));
  }

  const css = fs.readFileSync(path.join(DIST, 'assets', 'css', 'style.css'), 'utf8');
  const pages = walkHtml(DIST);
  let total = 0;
  for (const rel of pages) total += processHtml(rel, css).size;

  console.log(`[inline-assets] dist/ ready: ${pages.length} pages, ${(total / 1024 / 1024).toFixed(1)} MB of self-contained HTML.`);
}

main();
