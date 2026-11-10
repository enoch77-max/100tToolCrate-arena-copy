import fs from 'node:fs';
import crypto from 'node:crypto';

const htmlCache = new Map();
const HTML_CACHE_TTL_MS = 60 * 1000;

function scriptHashesForHtml(html) {
  const hashes = [];
  const pattern = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    if (match[1].trim()) hashes.push(`'sha256-${crypto.createHash('sha256').update(match[1]).digest('base64')}'`);
  }
  return [...new Set(hashes)];
}

export function setCsp(res, html = '') {
  const scriptSources = [
    "'self'", ...scriptHashesForHtml(html),
    'https://cdnjs.cloudflare.com', 'https://cdn.jsdelivr.net', 'https://unpkg.com',
    'https://pagead2.googlesyndication.com', 'https://googleads.g.doubleclick.net',
    'https://static.cloudflareinsights.com'
  ];
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    `script-src ${scriptSources.join(' ')}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https: data: blob:",
    "frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com",
    "worker-src 'self' blob: https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://formsubmit.co",
    "frame-ancestors 'self'",
    "manifest-src 'self'",
    "upgrade-insecure-requests"
  ].join('; '));
}

export function htmlToMarkdown(html) {
  return String(html || '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<h1\b[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2\b[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3\b[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4\b[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<p\b[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<li\b[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<a\b[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<strong\b[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<em\b[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<code\b[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<hr\b[^>]*\/?\s*>/gi, '\n---\n\n')
    .replace(/<br\b[^>]*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n').trim();
}

export function sendHtmlContent(req, res, html, status = 200) {
  setCsp(res, html);
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Vary', 'Accept');
  res.setHeader('Link', '</.well-known/api-catalog>; rel="api-catalog", </docs/api>; rel="service-doc", </.well-known/mcp/server-card.json>; rel="mcp-server-card", </.well-known/agent-skills/index.json>; rel="agent-skills"');
  const acceptsMarkdown = String(req.headers.accept || '').includes('text/markdown') || req.query?.format === 'markdown';
  if (acceptsMarkdown) {
    const markdown = htmlToMarkdown(html);
    res.setHeader('x-markdown-tokens', String(Math.ceil(markdown.length / 4)));
    return res.status(status).type('text/markdown').send(markdown);
  }
  return res.status(status).type('html').send(html);
}

export function sendHtmlFile(req, res, filePath, status = 200) {
  const cached = htmlCache.get(filePath);
  if (cached && Date.now() - cached.time < HTML_CACHE_TTL_MS) {
    return sendHtmlContent(req, res, cached.html, status);
  }
  fs.readFile(filePath, 'utf8', (error, html) => {
    if (error) {
      if (!res.headersSent) res.status(error.code === 'ENOENT' ? 404 : 500).json({ error: error.code === 'ENOENT' ? 'Page not found' : 'Unable to read page' });
      return;
    }
    if (htmlCache.size > 200) htmlCache.clear();
    htmlCache.set(filePath, { html, time: Date.now() });
    sendHtmlContent(req, res, html, status);
  });
}

export function clearHtmlCache() {
  htmlCache.clear();
}
