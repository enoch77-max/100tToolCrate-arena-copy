import Database from 'better-sqlite3';
import { loadConfig } from '../config.js';

const config = loadConfig();
if (config.databasePath === ':memory:') throw new Error('Set DATABASE_PATH to the database or backup file to verify');
const db = new Database(config.databasePath, { readonly: true, fileMustExist: true });
try {
  const integrity = db.prepare('PRAGMA integrity_check').get().integrity_check;
  const foreignKeys = db.prepare('PRAGMA foreign_key_check').all();
  const migrations = db.prepare('SELECT version, applied_at FROM schema_migrations ORDER BY version').all();
  const counters = db.prepare('SELECT COUNT(*) AS tools, COALESCE(SUM(usage_count), 0) AS uses FROM tool_usage').get();
  if (integrity !== 'ok' || foreignKeys.length) {
    throw new Error(`Database verification failed: integrity=${integrity}, foreignKeyErrors=${foreignKeys.length}`);
  }
  console.log(JSON.stringify({ status: 'ok', database: config.databasePath, integrity, foreignKeyErrors: 0, migrations, counters }, null, 2));
} finally {
  db.close();
}
