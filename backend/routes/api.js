import path from 'node:path';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { executeTool, getExecutableTool, listExecutableTools, ToolInputError } from '../tool-execution.js';
import { handleMcp } from '../mcp.js';
import { fetchOgMetadata, OgFetchError } from '../og-preview.js';

export function createApiRouter({ config, db, tools }) {
  const router = express.Router();
  const toolIds = new Set(tools.map(tool => tool.id));
  const noStore = (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); };
  const trackLimiter = rateLimit({
    windowMs: 60 * 1000, limit: config.trackRateLimit,
    standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: 'Too many tracking requests; retry shortly' }
  });
  const readLimiter = rateLimit({
    windowMs: 60 * 1000, limit: config.readRateLimit,
    standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: 'Too many API requests; retry shortly' }
  });

  router.use(noStore);
  router.get('/status', readLimiter, (req, res) => {
    let healthy = false;
    try { healthy = db.health(); } catch { healthy = false; }
    res.json({
      status: healthy ? 'ok' : 'degraded',
      version: '2.0.0',
      tools_count: tools.length,
      database: healthy ? 'ok' : 'unavailable',
      mcp_enabled: true,
      mcp_endpoint: `${config.publicOrigin}/api/mcp`,
      execution_tools_count: listExecutableTools().length,
      authentication_required: false,
      timestamp: new Date().toISOString()
    });
  });

  router.get('/top-tools', readLimiter, (req, res) => {
    res.json(db.topTools(20).map(row => row.id));
  });

  router.post('/track', trackLimiter, (req, res) => {
    const id = req.body?.id;
    const hasUnexpectedFields = req.body && typeof req.body === 'object' && Object.keys(req.body).some(key => key !== 'id');
    if (hasUnexpectedFields || typeof id !== 'string' || !/^[a-z0-9-]{1,100}$/.test(id)) {
      return res.status(400).json({ success: false, error: 'A valid tool id is required' });
    }
    if (!toolIds.has(id)) return res.status(404).json({ success: false, error: 'Unknown tool' });
    const count = db.trackTool(id);
    res.json({ success: true, count });
  });

  router.get('/openapi.json', readLimiter, (req, res) => {
    res.type('application/json').sendFile(path.join(config.rootDir, 'api', 'openapi.json'));
  });

  const executionLimiter = rateLimit({
    windowMs: 60 * 1000, limit: 60,
    standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: 'Tool execution rate limit reached; retry shortly' }
  });
  router.get('/v1/tools', readLimiter, (req, res) => {
    res.json({
      tools: listExecutableTools(config.publicOrigin),
      browserOnlyTools: tools.filter(tool => !getExecutableTool(tool.id)).map(tool => ({
        id: tool.id, title: tool.title, category: tool.cat,
        url: `${config.publicOrigin}/tools/${tool.id}`,
        reason: 'Requires local browser APIs, user-selected files, canvas, camera or client-side document libraries.'
      }))
    });
  });
  router.get('/v1/tools/:id', readLimiter, (req, res) => {
    const tool = getExecutableTool(req.params.id);
    if (!tool) return res.status(404).json({ error: 'No server-executable tool with this ID', catalog: `${config.publicOrigin}/api/v1/tools` });
    res.json({ ...tool, execution: { method: 'POST', url: `${config.publicOrigin}/api/v1/tools/${tool.id}/execute`, authentication: 'none', dataHandling: 'Transient processing; inputs and outputs are not persisted.' } });
  });
  router.options('/v1/tools/:id/execute', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '600');
    res.status(204).end();
  });
  router.post('/v1/tools/:id/execute', executionLimiter, (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (!getExecutableTool(req.params.id)) return res.status(404).json({ error: 'No server-executable tool with this ID', catalog: `${config.publicOrigin}/api/v1/tools` });
    try {
      const result = executeTool(req.params.id, req.body ?? {});
      res.json({ tool: req.params.id, result, dataHandling: 'not_persisted' });
    } catch (error) {
      if (error instanceof ToolInputError) return res.status(400).json({ error: error.message, tool: req.params.id });
      throw error;
    }
  });

  const metadataLimiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Metadata preview rate limit reached' } });
  router.get('/og-preview', metadataLimiter, async (req, res, next) => {
    try {
      if (typeof req.query.url !== 'string' || req.query.url.length > 2048) return res.status(400).json({ error: 'A url parameter of at most 2048 characters is required' });
      const metadata = await fetchOgMetadata(req.query.url);
      res.json({ ...metadata, dataHandling: 'HTML fetched transiently; only extracted metadata is returned.' });
    } catch (error) {
      if (error instanceof OgFetchError) return res.status(error.status).json({ error: error.message });
      next(error);
    }
  });

  router.all('/mcp', readLimiter, (req, res) => handleMcp(req, res, config));
  return router;
}
