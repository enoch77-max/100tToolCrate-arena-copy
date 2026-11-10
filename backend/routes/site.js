import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import { sendHtmlContent, sendHtmlFile } from '../html.js';
import { getExecutableTool } from '../tool-execution.js';

const SLUG = /^[a-z0-9-]+$/;

function safeFile(rootDir, directory, slug) {
  if (!SLUG.test(slug)) return null;
  const base = path.join(rootDir, directory);
  const file = path.join(base, `${slug}.html`);
  if (!file.startsWith(`${base}${path.sep}`) || !fs.existsSync(file)) return null;
  return file;
}

function queryOf(req) {
  return req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
}

export function registerSiteRoutes(app, { config, tools }) {
  const root = config.rootDir;
  const staticOptions = { dotfiles: 'deny', index: false, redirect: false, etag: true, fallthrough: true };

  app.use('/assets', express.static(path.join(root, 'assets'), {
    ...staticOptions, maxAge: config.isProduction ? '1d' : 0,
    setHeaders(res) { res.setHeader('X-Content-Type-Options', 'nosniff'); }
  }));

  function collection(baseUrl, directory, hubUrl) {
    app.get(`${baseUrl}/:page.html`, (req, res, next) => {
      const file = safeFile(root, directory, req.params.page);
      if (!file) return next();
      const destination = req.params.page === 'index' && hubUrl ? hubUrl : `${baseUrl}/${req.params.page}`;
      res.redirect(301, `${destination}${queryOf(req)}`);
    });
    app.get(`${baseUrl}/:page`, (req, res, next) => {
      const file = safeFile(root, directory, req.params.page);
      if (!file || req.params.page === 'index') return next();
      sendHtmlFile(req, res, file);
    });
    if (hubUrl) {
      app.get(`${baseUrl}/`, (req, res, next) => {
        if (req.originalUrl.split('?')[0] !== `${baseUrl}/`) return next();
        res.redirect(301, `${hubUrl}${queryOf(req)}`);
      });
    }
    app.use(baseUrl, express.static(path.join(root, directory), staticOptions));
  }

  collection('/tools', 'tools', '/tools');
  collection('/workflows', 'workflows', '/workflows');
  collection('/alternatives', 'alternatives');
  collection('/blog', 'blog', '/blog');

  const pages = new Map([
    ['/', 'index.html'], ['/tools', 'tools.html'], ['/workflows', 'workflows/index.html'],
    ['/blog', 'blog/index.html'], ['/about', 'about.html'], ['/contact', 'contact.html'],
    ['/agents', 'agents.html'], ['/services', 'services.html'], ['/editorial-policy', 'editorial-policy.html'],
    ['/advertise', 'advertise.html'], ['/disclaimer', 'disclaimer.html'],
    ['/privacy-policy', 'privacy-policy.html'], ['/terms', 'terms.html'], ['/offline', 'offline.html']
  ]);
  for (const [route, relativeFile] of pages) {
    app.get(route, (req, res) => sendHtmlFile(req, res, path.join(root, relativeFile)));
    if (route !== '/') {
      app.get(`${route}.html`, (req, res) => res.redirect(301, `${route}${queryOf(req)}`));
    }
  }
  app.get('/index.html', (req, res) => res.redirect(301, `/${queryOf(req)}`));

  const publicFiles = new Map([
    ['/robots.txt', 'robots.txt'], ['/sitemap.xml', 'sitemap.xml'], ['/feed.xml', 'feed.xml'],
    ['/ads.txt', 'ads.txt'], ['/llms.txt', 'llms.txt'], ['/BingSiteAuth.xml', 'BingSiteAuth.xml'],
    ['/metadata.json', 'metadata.json']
  ]);
  for (const [route, relativeFile] of publicFiles) {
    app.get(route, (req, res) => {
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.sendFile(path.join(root, relativeFile));
    });
  }
  app.get('/manifest.json', (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.type('application/manifest+json').sendFile(path.join(root, 'manifest.json'));
  });
  app.get('/sw.js', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Service-Worker-Allowed', '/');
    res.type('application/javascript').sendFile(path.join(root, 'sw.js'));
  });

  const indexNowPath = path.join(root, 'indexnow.json');
  if (fs.existsSync(indexNowPath)) {
    const indexNow = JSON.parse(fs.readFileSync(indexNowPath, 'utf8'));
    if (/^[a-zA-Z0-9-]{8,128}$/.test(indexNow.key)) {
      app.get(`/${indexNow.key}.txt`, (req, res) => res.type('text/plain').send(`${indexNow.key}\n`));
    }
  }

  app.get('/auth.md', (req, res) => {
    const file = path.join(root, 'auth.md');
    const markdown = fs.readFileSync(file, 'utf8');
    res.setHeader('x-markdown-tokens', String(Math.ceil(markdown.length / 4)));
    res.type('text/markdown').send(markdown);
  });

  app.get('/docs/api', (req, res) => {
    const markdown = fs.readFileSync(path.join(root, 'docs', 'api.md'), 'utf8');
    if (String(req.headers.accept || '').includes('text/markdown') || req.query.format === 'markdown') {
      res.setHeader('x-markdown-tokens', String(Math.ceil(markdown.length / 4)));
      return res.type('text/markdown').send(markdown);
    }
    const escaped = markdown.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>API Documentation - 100ToolCrate</title><link rel="stylesheet" href="/assets/css/style.css"></head><body><main class="main-content"><pre style="white-space:pre-wrap;line-height:1.65;">${escaped}</pre></main></body></html>`;
    sendHtmlContent(req, res, html);
  });

  app.get('/.well-known/api-catalog', (req, res) => {
    res.type('application/linkset+json').json({
      linkset: [{
        anchor: `${config.publicOrigin}/api`,
        'service-desc': [{ href: `${config.publicOrigin}/api/openapi.json`, type: 'application/vnd.oai.openapi+json' }],
        'service-doc': [{ href: `${config.publicOrigin}/docs/api`, type: 'text/html' }],
        status: [{ href: `${config.publicOrigin}/api/status`, type: 'application/json' }]
      }]
    });
  });

  app.get('/.well-known/agent-skills/index.json', (req, res) => {
    res.json({
      $schema: 'https://agentskills.io/schemas/v0.2.0/index.json',
      skills: tools.map(tool => {
        const file = path.join(root, 'tools', `${tool.id}.html`);
        const sha256 = fs.existsSync(file) ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : undefined;
        const executable = getExecutableTool(tool.id);
        return {
          name: tool.id, type: tool.cat || 'utility', description: executable?.description || tool.desc,
          url: `${config.publicOrigin}/tools/${tool.id}`,
          execution: executable ? {
            type: 'rest-and-mcp', inputSchema: executable.inputSchema,
            endpoint: `${config.publicOrigin}/api/v1/tools/${tool.id}/execute`,
            mcpToolName: tool.id, authentication: 'none', dataHandling: 'transient-not-persisted'
          } : { type: 'browser-only', reason: 'Requires local browser APIs, files, canvas, camera or client-side document libraries.' },
          ...(sha256 ? { sha256 } : {})
        };
      })
    });
  });

  app.get('/.well-known/mcp/server-card.json', (req, res) => {
    res.json({
      serverInfo: { name: '100toolcrate', title: '100ToolCrate Public Tools', version: '2.1.0', description: 'Deterministic text, JSON and calculator tools for people and AI agents.' },
      transport: { type: 'streamable-http', endpoint: `${config.publicOrigin}/api/mcp`, protocols: ['2025-03-26', '2025-06-18'] },
      capabilities: { tools: { listChanged: false } },
      authentication: { required: false },
      documentation: `${config.publicOrigin}/agents`
    });
  });
  app.all(['/oauth/authorize', '/oauth/token', '/oauth/claim', '/oauth/revoke'], (req, res) => {
    res.status(501).json({ error: 'OAuth is not enabled. Public catalog endpoints do not require authentication.' });
  });
  app.get(['/.well-known/openid-configuration', '/.well-known/oauth-authorization-server', '/.well-known/oauth-protected-resource', '/.well-known/jwks.json'], (req, res) => {
    res.status(404).json({ error: 'OAuth discovery is not available because OAuth is not enabled' });
  });
}

export function registerNotFound(app, config) {
  app.use((req, res) => {
    if (req.accepts('html') && !req.path.startsWith('/api/')) {
      return sendHtmlFile(req, res, path.join(config.rootDir, '404.html'), 404);
    }
    res.status(404).json({ error: 'Not found', requestId: req.id });
  });
}
