import { createApplication } from './app.js';

const runtime = createApplication();
const { app, config, logger, db } = runtime;
const server = app.listen(config.port, config.host, () => {
  logger.info('HTTP server listening', { host: config.host, port: config.port, origin: config.publicOrigin });
});

server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.keepAliveTimeout = 5000;
server.maxRequestsPerSocket = 1000;

server.on('error', error => {
  logger.error('HTTP server error', { code: error.code, error: error.message });
  db.close();
  process.exit(1);
});
server.on('clientError', (error, socket) => {
  logger.warn('Invalid HTTP client request', { code: error.code });
  if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
});

let shuttingDown = false;
function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('Graceful shutdown started', { signal });
  const force = setTimeout(() => {
    logger.error('Graceful shutdown timed out');
    process.exit(1);
  }, config.shutdownTimeoutMs);
  force.unref();
  server.close(() => {
    try { db.close(); } catch (error) { logger.error('Database close failed', { error: error.message }); exitCode = 1; }
    clearTimeout(force);
    logger.info('Shutdown complete');
    process.exit(exitCode);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', error => {
  logger.error('Unhandled promise rejection', { error: error instanceof Error ? error.message : String(error) });
  shutdown('unhandledRejection', 1);
});
process.on('uncaughtException', error => {
  logger.error('Uncaught exception', { error: error.message, stack: config.isProduction ? undefined : error.stack });
  shutdown('uncaughtException', 1);
});
