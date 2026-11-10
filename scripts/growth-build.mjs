/* Shared acquisition/monetization metadata for generated and legacy pages. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { cleanEditorialText } from './editorial-standards.mjs';
import { syncAgentDocuments } from './agent-docs.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://100toolcrate.com';
const ASSET_VERSION = '2026-11-10-v88-agent-growth';

const adsTxt = fs.readFileSync(path.join(ROOT, 'ads.txt'), 'utf8');
const publisher = adsTxt.match(/google\.com,\s*(pub-\d+)/i)?.[1] || '';
const client = process.env.ADSENSE_CLIENT_ID || (publisher ? `ca-${publisher}` : '');

function htmlFiles() {
  const files = fs.readdirSync(ROOT).filter(name => name.endsWith('.html')).map(name => path.join(ROOT, name));
  for (const dir of ['tools', 'blog', 'workflows', 'alternatives']) {
    const base = path.join(ROOT, dir);
    if (!fs.existsSync(base)) continue;
    for (const name of fs.readdirSync(base)) {
      if (name.endsWith('.html')) files.push(path.join(base, name));
    }
  }
  return files;
}

const executableToolCount = syncAgentDocuments(ROOT);
console.log(`[growth-build] Synchronized ${executableToolCount} executable agent tools with OpenAPI.`);

let updated = 0;
for (const file of htmlFiles()) {
  let html = cleanEditorialText(fs.readFileSync(file, 'utf8')).replace(/2026-11-10-v87-pwa/g, ASSET_VERSION);
  const original = html;
  if (file.includes(`${path.sep}alternatives${path.sep}`) && !/name=["']robots["'][^>]*noindex/i.test(html)) {
    html = html.replace(/<\/head>/i, '<meta name="robots" content="noindex,follow">\n</head>');
  }

  if (!html.includes('data-growth-rss')) {
    html = html.replace(/<\/head>/i, `<link rel="alternate" type="application/rss+xml" title="100ToolCrate Blog" href="/feed.xml" data-growth-rss>\n</head>`);
  }
  if (!/property=["']og:image["']/i.test(html)) {
    html = html.replace(/<\/head>/i, `<meta property="og:image" content="${SITE}/assets/pwa/screenshot-wide.png">\n<meta name="twitter:image" content="${SITE}/assets/pwa/screenshot-wide.png">\n</head>`);
  }
  if (client && !['404.html', 'offline.html'].includes(path.basename(file)) && !html.includes('window.TC_ADSENSE_CLIENT')) {
    const ads = `<script>window.TC_ADSENSE_CLIENT=${JSON.stringify(client)};</script>\n<script src="/assets/js/monetization.js?v=${ASSET_VERSION}" defer></script>`;
    html = html.replace(/<\/head>/i, `${ads}\n</head>`);
  }

  // Legacy blog/alternative templates have their own navigation partial. Do not
  // keep sending crawlers to duplicate comparison pages from legacy footers.
  if (file.includes(`${path.sep}alternatives${path.sep}`)) {
    html = html.replace(/<div class="footer-col">\s*<h4>Alternatives<\/h4>[\s\S]*?<\/div>/i,
      '<div class="footer-col"><h4>Resources</h4><a href="/tools">All tools</a><a href="/workflows">Workflows</a><a href="/agents">Agent API</a><a href="/editorial-policy">Editorial policy</a></div>');
  }
  html = html.replace(/(<div class="nav-links">[\s\S]*?)(<a href="\/blog"[^>]*>)/i, (match, start, blogLink) => {
    return start.includes('href="/workflows"') ? match : `${start}<a href="/workflows">Workflows</a>\n        ${blogLink}`;
  });

  if (!html.includes('data-ad-choices') && html.includes('data-pwa-install')) {
    html = html.replace(/<button type="button" class="pwa-install-link" data-pwa-install>/i,
      `<button type="button" class="pwa-install-link" data-ad-choices><span class="material-symbols-outlined" aria-hidden="true">ad_group</span>Ad choices</button>\n          <button type="button" class="pwa-install-link" data-pwa-install>`);
  }

  if (html !== original) {
    fs.writeFileSync(file, html);
    updated += 1;
  }
}

// IndexNow's key is public verification, not a secret. Keep it stable between
// builds and publish a matching root key file.
const configPath = path.join(ROOT, 'indexnow.json');
let config;
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} else {
  config = { host: '100toolcrate.com', key: crypto.randomBytes(16).toString('hex') };
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
}
if (!/^[a-zA-Z0-9-]{8,128}$/.test(config.key)) throw new Error('Invalid IndexNow key in indexnow.json');
fs.writeFileSync(path.join(ROOT, `${config.key}.txt`), `${config.key}\n`);

// A useful static-host 404 that preserves navigation to real destinations.
const notFound = `<!DOCTYPE html><html class="dark" lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="robots" content="noindex,follow"><title>Page Not Found | 100ToolCrate</title><meta name="description" content="The requested page was not found. Browse all tools or choose a step-by-step workflow."><link rel="icon" href="/assets/favicon.png"><link rel="stylesheet" href="/assets/css/style.css?v=${ASSET_VERSION}"><script src="/assets/js/theme.js?v=${ASSET_VERSION}"></script></head><body><main class="main-content" id="main-content" style="min-height:80vh;display:grid;place-items:center;text-align:center;"><section class="workflow-info-card" style="max-width:680px;"><span class="workflow-eyebrow">404 · Page not found</span><h1 style="font-size:clamp(2rem,6vw,3.5rem);margin:.7rem 0;color:var(--text-color);">That crate is empty.</h1><p style="color:var(--text-muted);line-height:1.7;">The URL may be outdated, but the tools are still here. Search the complete directory or follow a task workflow.</p><div style="display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap;margin-top:1.5rem;"><a class="workflow-primary-link" href="/tools">Browse all tools</a><a class="workflow-share" style="margin:0;" href="/workflows">Explore workflows</a><a class="workflow-share" style="margin:0;" href="/">Go home</a></div></section></main></body></html>`;
fs.writeFileSync(path.join(ROOT, '404.html'), notFound);

console.log(`[growth-build] Updated ${updated} HTML pages; RSS links, social images, navigation and production ads are synchronized.`);
