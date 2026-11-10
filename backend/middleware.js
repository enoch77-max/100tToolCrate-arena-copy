import crypto from 'node:crypto';
import express from 'express';
import compression from 'compression';
import helmet from 'helmet';

export function applyMiddleware(app, config, logger) {
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);

  app.use((req, res, next) => {
    req.id = crypto.randomUUID();
    res.setHeader('X-Request-ID', req.id);
    next();
  });
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: config.isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: false } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  }));
  app.use(compression());
  app.use(express.json({ limit: '16kb', strict: true, type: 'application/json' }));

  app.use((req, res, next) => {
    const contentType = String(req.headers['content-type'] || '');
    if (/multipart\/form-data|application\/octet-stream/i.test(contentType)) {
      return res.status(415).json({ error: 'File uploads are not accepted by this API' });
    }
    next();
  });

  app.use((req, res, next) => {
    if (req.path === '/healthz' || req.path === '/readyz') return next();
    const started = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
      const details = { requestId: req.id, method: req.method, path: req.path, status: res.statusCode, durationMs: Math.round(durationMs * 10) / 10 };
      if (res.statusCode >= 500 && res.statusCode !== 501) logger.error('HTTP request failed', details);
      else if (res.statusCode >= 400 && res.statusCode !== 404) logger.warn('HTTP request rejected', details);
      else if (req.path.startsWith('/api/')) logger.info('API request', details);
      else logger.debug('HTTP request', details);
    });
    next();
  });
}

export function errorHandler(config, logger) {
  return (error, req, res, next) => {
    const malformedJson = error instanceof SyntaxError && error.status === 400 && 'body' in error;
    const status = malformedJson || error.type === 'entity.parse.failed' ? 400
      : error.type === 'entity.too.large' ? 413
      : Number.isInteger(error.status) && error.status >= 400 && error.status < 500 ? error.status : 500;
    const details = { requestId: req.id, path: req.path, status, error: error.message };
    if (status >= 500) logger.error('Request error', details);
    else logger.warn('Request rejected', details);
    if (res.headersSent) return next(error);
    const message = status === 400 ? 'Malformed JSON request'
      : status === 413 ? 'Request body is too large'
      : status < 500 ? error.message : 'Internal server error';
    res.status(status).json({ error: message, requestId: req.id });
  };
}
