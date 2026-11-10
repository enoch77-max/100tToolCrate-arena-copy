import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { loadConfig, readTools } from './config.js';
import { createLogger } from './logger.js';
import { createDatabase } from './db.js';
import { applyMiddleware, errorHandler } from './middleware.js';
import { createApiRouter } from './routes/api.js';
import { registerSiteRoutes, registerNotFound } from './routes/site.js';

export function createApplication(overrides = {}) {
  const config = loadConfig(overrides);
  const logger = createLogger(config.logLevel);
  const tools = readTools(config.rootDir);
  const db = createDatabase(config);
  const app = express();
  applyMiddleware(app, config, logger);

  app.get('/healthz', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ status: 'ok', uptimeSeconds: Math.floor(process.uptime()) });
  });
  app.get('/readyz', (req, res) => {
    const requiredFiles = ['index.html', 'tools.html', 'workflows/index.html', 'assets/css/style.css'];
    const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(config.rootDir, file)));
    let database = false;
    try { database = db.health(); } catch { database = false; }
    const ready = database && missingFiles.length === 0;
    res.setHeader('Cache-Control', 'no-store');
    res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'not_ready',
      database: database ? 'ok' : 'unavailable',
      missingFiles,
      migrations: db.migrationVersions()
    });
  });

  app.use('/api', createApiRouter({ config, db, tools, logger }));
  registerSiteRoutes(app, { config, tools });
  app.use(errorHandler(config, logger));
  registerNotFound(app, config);

  app.locals.db = db;
  app.locals.config = config;
  logger.info('Application initialized', {
    environment: config.nodeEnv,
    tools: tools.length,
    legacyCountersImported: db.legacyImport.imported
  });
  return { app, config, logger, tools, db };
}
