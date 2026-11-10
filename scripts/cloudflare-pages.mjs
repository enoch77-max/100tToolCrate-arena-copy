/**
 * Cloudflare Pages deployment finisher.
 * Runs after static generation/inlining and before Cloudflare bundles /functions.
 * - Regenerates sitemap.xml from the actual deployable HTML in dist/
 * - Writes _headers, _redirects and _routes.json into dist/
 * - Prepares edge-compatible function libraries and discovery documents
 *
 * The Node/VPS backend remains available separately; Pages uses /functions.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { listExecutableTools, getExecutableTool } from '../backend/tool-execution.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const FUNCTIONS = path.join(ROOT, 'functions');
const DEFAULT_ORIGIN = 'https://100toolcrate.com';
const SITE_ORIGIN = (process.env.PUBLIC_SITE_URL || process.env.PUBLIC_ORIGIN || DEFAULT_ORIGIN).replace(/\/+$/, '');
const REWRITE_ORIGIN = Boolean(process.env.PUBLIC_SITE_URL && SITE_ORIGIN !== DEFAULT_ORIGIN);

function walk(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, out);
    else out.push(path.relative(base, full));
  }
  return out;
}

function buildDate() {
  if (process.env.SOURCE_DATE_EPOCH) {
    const date = new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }
  try {
    return execFileSync('git', ['log', '-1', '--format=%cs'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function cleanUrl(relativeFile) {
  const normalized = relativeFile.split(path.sep).join('/');
  if (normalized === 'index.html') return '/';
  // Cloudflare Pages serves directory indexes at /dir/ after a 308 from /dir.
  if (normalized.endsWith('/index.html')) return `/${normalized.slice(0, -'index.html'.length)}`;
  if (normalized.endsWith('.html')) return `/${normalized.slice(0, -'.html'.length)}`;
  return `/${normalized}`;
}

function priorityFor(url) {
  url = url.replace(/\/$/, '') || '/';
  if (url === '/') return '1.0';
  if (['/tools', '/workflows', '/services', '/agents'].includes(url)) return '0.9';
  if (url.startsWith('/tools/') || url.startsWith('/workflows/')) return '0.8';
  if (url.startsWith('/blog')) return '0.7';
  return '0.5';
}

function escapeXml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function rewriteOrigin(text) {
  return REWRITE_ORIGIN ? text.split(DEFAULT_ORIGIN).join(SITE_ORIGIN) : text;
}

function generateSitemap() {
  const lastmod = buildDate();
  const entries = [];
  const seen = new Set();

  for (const relativeFile of walk(DIST)) {
    if (!relativeFile.endsWith('.html')) continue;
    const normalized = relativeFile.split(path.sep).join('/');
    if (['404.html', 'offline.html'].includes(normalized)) continue;
    const full = path.join(DIST, relativeFile);
    let html = fs.readFileSync(full, 'utf8');
    if (REWRITE_ORIGIN) {
      html = rewriteOrigin(html);
      fs.writeFileSync(full, html);
    }
    if (/<meta\s+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) continue;

    const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
    const servedPath = cleanUrl(relativeFile);
    let loc = canonicalMatch ? canonicalMatch[1] : `${SITE_ORIGIN}${servedPath}`;
    loc = rewriteOrigin(loc);
    if (!loc.startsWith('http')) loc = `${SITE_ORIGIN}${loc.startsWith('/') ? '' : '/'}${loc}`;
    if (normalized.endsWith('/index.html') && normalized !== 'index.html') {
      loc = `${SITE_ORIGIN}${servedPath}`;
      html = html.replace(/(<link\s+rel=["']canonical["']\s+href=["'])[^"']+(["'])/i, `$1${loc}$2`);
      html = html.replace(/(<meta\s+property=["']og:url["']\s+content=["'])[^"']+(["'])/i, `$1${loc}$2`);
      fs.writeFileSync(full, html);
    }
    if (seen.has(loc)) continue;
    seen.add(loc);

    const urlPath = new URL(loc).pathname;
    entries.push({
      loc,
      lastmod,
      changefreq: urlPath === '/' || urlPath.startsWith('/blog') ? 'weekly' : 'monthly',
      priority: priorityFor(urlPath)
    });
  }

  entries.sort((a, b) => a.loc.localeCompare(b.loc));
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map(entry =>
    `  <url><loc>${escapeXml(entry.loc)}</loc><lastmod>${entry.lastmod}</lastmod><changefreq>${entry.changefreq}</changefreq><priority>${entry.priority}</priority></url>`
  ).join('\n')}\n</urlset>\n`;

  // Cloudflare's directory-index canonical form is written to dist only.
  // The root sitemap remains the Node/VPS canonical form generated earlier.
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap);

  for (const robotsPath of [path.join(DIST, 'robots.txt'), path.join(ROOT, 'robots.txt')]) {
    if (!fs.existsSync(robotsPath)) continue;
    let robots = fs.readFileSync(robotsPath, 'utf8');
    robots = robots.replace(/^Sitemap:.*$/m, `Sitemap: ${SITE_ORIGIN}/sitemap.xml`);
    if (!/^Sitemap:/m.test(robots)) robots += `\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`;
    fs.writeFileSync(robotsPath, rewriteOrigin(robots));
  }

  if (REWRITE_ORIGIN) {
    for (const file of ['feed.xml', 'llms.txt', 'auth.md', 'manifest.json']) {
      const full = path.join(DIST, file);
      if (fs.existsSync(full)) fs.writeFileSync(full, rewriteOrigin(fs.readFileSync(full, 'utf8')));
    }
  }

  return entries.length;
}

function writePagesFiles() {
  const headers = `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Link: </.well-known/api-catalog>; rel="api-catalog", </docs/api>; rel="service-doc", </.well-known/mcp/server-card.json>; rel="mcp-server-card", </.well-known/agent-skills/index.json>; rel="agent-skills"
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' cdnjs.cloudflare.com cdn.jsdelivr.net unpkg.com static.cloudflareinsights.com pagead2.googlesyndication.com googleads.g.doubleclick.net; script-src-attr 'none'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https: data: blob:; frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com; worker-src 'self' blob: https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self' https://formsubmit.co; frame-ancestors 'self'; manifest-src 'self'

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/*.html
  Cache-Control: public, max-age=0, must-revalidate

/sw.js
  Content-Type: application/javascript; charset=utf-8
  Cache-Control: no-cache, no-store, must-revalidate
  Service-Worker-Allowed: /

/manifest.json
  Content-Type: application/manifest+json
  Cache-Control: public, max-age=3600

/offline.html
  Cache-Control: public, max-age=300

/llms.txt
  Content-Type: text/plain; charset=utf-8

/robots.txt
  Content-Type: text/plain; charset=utf-8

/sitemap.xml
  Content-Type: application/xml; charset=utf-8

/feed.xml
  Content-Type: application/rss+xml; charset=utf-8
`;
  fs.writeFileSync(path.join(DIST, '_headers'), headers);
  fs.writeFileSync(path.join(ROOT, '_headers'), headers);

  const redirects = `# Canonical clean URLs. Cloudflare Pages also serves .html files at extensionless paths.
/index.html / 301
/tools.html /tools 301
/workflows/index.html /workflows 301
/blog/index.html /blog 301
/tools/:slug.html /tools/:slug 301
/workflows/:slug.html /workflows/:slug 301
/blog/:slug.html /blog/:slug 301
/alternatives/:slug.html /alternatives/:slug 301
`;
  fs.writeFileSync(path.join(DIST, '_redirects'), redirects);

  const routes = {
    version: 1,
    include: ['/api/*', '/healthz', '/readyz'],
    exclude: ['/api/openapi.json']
  };
  fs.writeFileSync(path.join(DIST, '_routes.json'), `${JSON.stringify(routes, null, 2)}\n`);
}

function prepareFunctionLibraries() {
  const libDir = path.join(FUNCTIONS, '_lib');
  fs.mkdirSync(libDir, { recursive: true });

  // The shared execution registry is Node-compatible at build time and becomes
  // Workers-compatible with nodejs_compat plus an explicit Buffer import.
  let execution = fs.readFileSync(path.join(ROOT, 'backend', 'tool-execution.js'), 'utf8');
  if (!execution.includes("from 'node:buffer'")) {
    execution = `import { Buffer } from 'node:buffer';\n${execution}`;
  }
  fs.writeFileSync(path.join(libDir, 'tool-execution.js'), execution);

  const tools = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools.json'), 'utf8'));
  const stats = JSON.parse(fs.readFileSync(path.join(ROOT, 'tool-stats.json'), 'utf8'));
  const siteData = `// Generated by scripts/cloudflare-pages.mjs. Do not edit manually.\nexport const TOOLS = ${JSON.stringify(tools.map(tool => ({ id: tool.id, title: tool.title, cat: tool.cat, desc: tool.desc })))};\nexport const SEED_STATS = ${JSON.stringify(stats)};\nexport const TOOL_IDS = new Set(TOOLS.map(tool => tool.id));\n`;
  fs.writeFileSync(path.join(libDir, 'site-data.js'), siteData);
}

function writeApiDocsPage() {
  const markdownPath = path.join(ROOT, 'docs', 'api.md');
  if (!fs.existsSync(markdownPath)) return;
  const markdown = fs.readFileSync(markdownPath, 'utf8');
  const escaped = markdown.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><title>API Documentation - 100ToolCrate</title><link rel="stylesheet" href="/assets/css/style.css"></head><body><main class="main-content" style="max-width:960px;margin:0 auto;padding:2rem 1rem;"><h1>API Documentation</h1><pre style="white-space:pre-wrap;line-height:1.65;color:var(--text-muted);">${escaped}</pre></main></body></html>`;
  fs.mkdirSync(path.join(DIST, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(DIST, 'docs', 'api.html'), html);
}

function writeDiscoveryDocuments() {
  writeApiDocsPage();
  const wellKnown = path.join(DIST, '.well-known');
  fs.mkdirSync(path.join(wellKnown, 'mcp'), { recursive: true });
  fs.mkdirSync(path.join(wellKnown, 'agent-skills'), { recursive: true });
  const tools = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools.json'), 'utf8'));
  const executable = listExecutableTools(SITE_ORIGIN);

  fs.writeFileSync(path.join(wellKnown, 'api-catalog'), JSON.stringify({
    linkset: [{
      anchor: `${SITE_ORIGIN}/api`,
      'service-desc': [{ href: `${SITE_ORIGIN}/api/openapi.json`, type: 'application/vnd.oai.openapi+json' }],
      'service-doc': [{ href: `${SITE_ORIGIN}/docs/api`, type: 'text/html' }],
      status: [{ href: `${SITE_ORIGIN}/api/status`, type: 'application/json' }]
    }]
  }, null, 2));

  fs.writeFileSync(path.join(wellKnown, 'mcp', 'server-card.json'), JSON.stringify({
    serverInfo: { name: '100toolcrate', title: '100ToolCrate Public Tools', version: '2.1.0', description: 'Deterministic text, JSON and calculator tools for people and AI agents on Cloudflare Pages.' },
    transport: { type: 'streamable-http', endpoint: `${SITE_ORIGIN}/api/mcp`, protocols: ['2025-03-26', '2025-06-18'] },
    capabilities: { tools: { listChanged: false } },
    authentication: { required: false },
    documentation: `${SITE_ORIGIN}/agents`
  }, null, 2));

  fs.writeFileSync(path.join(wellKnown, 'agent-skills', 'index.json'), JSON.stringify({
    name: '100ToolCrate public tool catalog',
    description: 'Browser tools and server-executable agent tools. Execution inputs are transient and not persisted.',
    skills: tools.map(tool => {
      const page = path.join(DIST, 'tools', `${tool.id}.html`);
      const sha256 = fs.existsSync(page) ? crypto.createHash('sha256').update(fs.readFileSync(page)).digest('hex') : undefined;
      const exec = getExecutableTool(tool.id);
      return {
        name: tool.id,
        type: tool.cat,
        description: exec?.description || tool.desc,
        url: `${SITE_ORIGIN}/tools/${tool.id}`,
        execution: exec ? {
          type: 'rest-and-mcp',
          inputSchema: exec.inputSchema,
          endpoint: `${SITE_ORIGIN}/api/v1/tools/${tool.id}/execute`,
          mcpToolName: tool.id,
          authentication: 'none',
          dataHandling: 'transient-not-persisted'
        } : { type: 'browser-only', reason: 'Requires local browser APIs, files, canvas, camera or client-side document libraries.' },
        ...(sha256 ? { sha256 } : {})
      };
    })
  }, null, 2));

  return executable.length;
}

if (!fs.existsSync(DIST)) throw new Error('dist/ is missing. Run the static build before Cloudflare preparation.');
const pageCount = generateSitemap();
writePagesFiles();
prepareFunctionLibraries();
const executableCount = writeDiscoveryDocuments();
console.log(`[cloudflare-pages] ${pageCount} indexable sitemap URLs, ${executableCount} executable agent tools, Pages routing/discovery files ready.`);
