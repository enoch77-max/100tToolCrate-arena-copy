/* Static SEO quality gate. Run after npm run build: node scripts/seo-audit.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
if (!fs.existsSync(DIST)) throw new Error('dist/ is missing. Run npm run build first.');

const errors = [];
const warnings = [];
const pages = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.html')) pages.push(full);
  }
}
walk(DIST);

const titleOwners = new Map();
const descriptionOwners = new Map();
const canonicalOwners = new Map();
const indexableCanonicals = new Set();

function addOwner(map, value, file) {
  if (!map.has(value)) map.set(value, []);
  map.get(value).push(file);
}

function resolveInternal(source, href) {
  let clean = href.trim();
  if (!clean || /^(?:[a-z]+:|\/\/|#)/i.test(clean)) return true;
  clean = clean.split('#')[0].split('?')[0];
  if (!clean) return true;
  const decoded = decodeURIComponent(clean);
  const base = decoded.startsWith('/') ? DIST : path.dirname(source);
  const target = path.resolve(base, `.${decoded.startsWith('/') ? decoded : ''}`);
  const direct = decoded.startsWith('/') ? path.join(DIST, decoded) : path.resolve(path.dirname(source), decoded);
  const candidates = [direct, `${direct}.html`, path.join(direct, 'index.html'), `${direct}.md`];
  return candidates.some(candidate => candidate.startsWith(DIST) && fs.existsSync(candidate) && fs.statSync(candidate).isFile());
}

for (const file of pages) {
  const relative = path.relative(DIST, file);
  const html = fs.readFileSync(file, 'utf8');
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  const description = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1]?.trim();
  const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1]?.trim();
  const noindex = /<meta\s+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
  const h1Count = (html.match(/<h1\b/gi) || []).length;

  if (!title) errors.push(`${relative}: missing title`);
  else addOwner(titleOwners, title, relative);
  if (!description && !noindex) errors.push(`${relative}: missing meta description`);
  else if (description) addOwner(descriptionOwners, description, relative);
  if (!canonical && !noindex) errors.push(`${relative}: missing canonical`);
  if (canonical) {
    if (!canonical.startsWith('https://100toolcrate.com')) errors.push(`${relative}: non-production canonical ${canonical}`);
    addOwner(canonicalOwners, canonical, relative);
    if (!noindex) indexableCanonicals.add(canonical);
  }
  if (h1Count !== 1 && !noindex) warnings.push(`${relative}: ${h1Count} h1 elements`);

  for (const match of html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(match[1]); }
    catch (error) { errors.push(`${relative}: invalid JSON-LD (${error.message})`); }
  }
  for (const match of html.matchAll(/\b(?:href|src|action|poster)=["']([^"']+)["']/gi)) {
    if (!resolveInternal(file, match[1])) errors.push(`${relative}: broken internal reference ${match[1]}`);
  }
  const cssContexts = [
    ...[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match => match[1]),
    ...[...html.matchAll(/\sstyle=["']([^"']*)["']/gi)].map(match => match[1])
  ];
  for (const css of cssContexts) {
    for (const match of css.matchAll(/url\(\s*(["']?)([^)'"]+)\1\s*\)/gi)) {
      if (!resolveInternal(file, match[2])) errors.push(`${relative}: broken CSS URL ${match[2]}`);
    }
  }
}

for (const [label, map] of [['title', titleOwners], ['description', descriptionOwners], ['canonical', canonicalOwners]]) {
  for (const [value, owners] of map) {
    if (owners.length > 1) errors.push(`Duplicate ${label} on ${owners.length} pages (${owners.slice(0, 4).join(', ')}): ${value.slice(0, 100)}`);
  }
}

const sitemapPath = path.join(DIST, 'sitemap.xml');
if (!fs.existsSync(sitemapPath)) errors.push('sitemap.xml is missing');
const sitemap = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, 'utf8') : '';
const sitemapUrls = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]));
for (const canonical of indexableCanonicals) {
  if (!sitemapUrls.has(canonical)) errors.push(`Indexable page absent from sitemap: ${canonical}`);
}
for (const url of sitemapUrls) {
  if (!indexableCanonicals.has(url)) errors.push(`Sitemap URL has no matching indexable page/canonical: ${url}`);
}

console.log(`SEO audit: ${pages.length} HTML pages, ${indexableCanonicals.size} indexable canonicals, ${sitemapUrls.size} sitemap URLs.`);
warnings.forEach(warning => console.log(`WARN  ${warning}`));
errors.forEach(error => console.log(`ERROR ${error}`));
console.log(`Result: ${errors.length} errors, ${warnings.length} warnings.`);
if (errors.length) process.exit(1);
