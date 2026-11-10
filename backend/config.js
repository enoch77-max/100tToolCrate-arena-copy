import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: process.env.ENV_FILE || path.join(ROOT_DIR, '.env'), quiet: true });

function integer(value, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`Expected an integer between ${min} and ${max}, received: ${value}`);
  }
  return parsed;
}

export function loadConfig(overrides = {}) {
  const env = { ...process.env, ...overrides };
  const nodeEnv = env.NODE_ENV || 'development';
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error(`NODE_ENV must be development, test or production; received ${nodeEnv}`);
  }
  const isProduction = nodeEnv === 'production';
  const port = integer(env.PORT, 3000, { min: 1, max: 65535 });
  const host = env.HOST || (isProduction ? '127.0.0.1' : '0.0.0.0');
  const publicOrigin = (env.PUBLIC_ORIGIN || 'https://100toolcrate.com').replace(/\/$/, '');
  const origin = new URL(publicOrigin);
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password) {
    throw new Error('PUBLIC_ORIGIN must be an http(s) origin without credentials');
  }
  if (isProduction && origin.protocol !== 'https:') {
    throw new Error('PUBLIC_ORIGIN must use HTTPS in production');
  }
  const databasePath = env.DATABASE_PATH || path.join(ROOT_DIR, 'data', 'toolcrate.db');
  if (databasePath !== ':memory:' && !path.isAbsolute(databasePath)) {
    throw new Error('DATABASE_PATH must be absolute or :memory:');
  }
  const adsenseClientId = env.ADSENSE_CLIENT_ID || '';
  if (adsenseClientId && !/^ca-pub-\d+$/.test(adsenseClientId)) {
    throw new Error('ADSENSE_CLIENT_ID must have the form ca-pub-1234567890');
  }
  return Object.freeze({
    rootDir: ROOT_DIR,
    nodeEnv,
    isProduction,
    port,
    host,
    publicOrigin: origin.origin,
    trustProxy: env.TRUST_PROXY || (isProduction ? 'loopback' : ''),
    databasePath,
    logLevel: env.LOG_LEVEL || (nodeEnv === 'test' ? 'error' : 'info'),
    adsenseClientId,
    assetVersion: '2026-11-10-v88-agent-growth',
    shutdownTimeoutMs: integer(env.SHUTDOWN_TIMEOUT_MS, 10000, { min: 1000, max: 60000 }),
    trackRateLimit: integer(env.TRACK_RATE_LIMIT, 120, { min: 10, max: 10000 }),
    readRateLimit: integer(env.READ_RATE_LIMIT, 240, { min: 30, max: 10000 })
  });
}

export function readTools(rootDir = ROOT_DIR) {
  const file = path.join(rootDir, 'tools.json');
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  const tools = Array.isArray(parsed) ? parsed : parsed.tools;
  if (!Array.isArray(tools)) throw new Error('tools.json does not contain a tool array');
  return tools;
}
