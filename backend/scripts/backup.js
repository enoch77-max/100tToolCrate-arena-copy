import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { loadConfig } from '../config.js';
import { createDatabase } from '../db.js';

const config = loadConfig();
const backupDir = path.resolve(process.env.BACKUP_DIR || path.join(config.rootDir, 'backups'));
const retention = Number.parseInt(process.env.BACKUP_RETENTION_DAYS || '14', 10);
if (!Number.isInteger(retention) || retention < 1 || retention > 365) {
  throw new Error('BACKUP_RETENTION_DAYS must be between 1 and 365');
}
const db = createDatabase(config);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const destination = path.join(backupDir, `toolcrate-${stamp}.db`);
let verification;
try {
  await db.backup(destination);
  fs.chmodSync(destination, 0o600);
  verification = new Database(destination, { readonly: true, fileMustExist: true });
  const integrity = verification.prepare('PRAGMA integrity_check').get();
  if (integrity.integrity_check !== 'ok') throw new Error(`Backup integrity check failed: ${integrity.integrity_check}`);
  const migrations = verification.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get().count;
  const cutoff = Date.now() - retention * 86400000;
  let removed = 0;
  for (const file of fs.readdirSync(backupDir)) {
    if (!/^toolcrate-\d{4}-\d{2}-\d{2}T.*\.db$/.test(file)) continue;
    const full = path.join(backupDir, file);
    if (fs.statSync(full).mtimeMs < cutoff) {
      fs.rmSync(full);
      removed += 1;
    }
  }
  console.log(JSON.stringify({ status: 'ok', backup: destination, bytes: fs.statSync(destination).size, migrations, expiredBackupsRemoved: removed }));
} finally {
  verification?.close();
  db.close();
}
