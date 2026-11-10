import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const BACKEND_DIR = path.dirname(fileURLToPath(import.meta.url));

export function createDatabase(config) {
  if (config.databasePath !== ':memory:') {
    fs.mkdirSync(path.dirname(config.databasePath), { recursive: true, mode: 0o750 });
  }
  const db = new Database(config.databasePath, { timeout: 5000 });
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
  if (config.databasePath !== ':memory:') db.pragma('journal_mode = WAL');
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (strftime(\'%Y-%m-%dT%H:%M:%fZ\', \'now\')))');

  const migrationDir = path.join(BACKEND_DIR, 'migrations');
  const migrations = fs.readdirSync(migrationDir).filter(name => name.endsWith('.sql')).sort();
  for (const version of migrations) {
    const applied = db.prepare('SELECT version FROM schema_migrations WHERE version = ?').get(version);
    if (applied) continue;
    const sql = fs.readFileSync(path.join(migrationDir, version), 'utf8');
    db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(version);
    })();
  }

  const importLegacyStats = db.transaction(() => {
    const marker = db.prepare("SELECT value FROM app_meta WHERE key = 'legacy_stats_imported'").get();
    if (marker) return { imported: 0, skipped: true };
    const statsPath = path.join(config.rootDir, 'tool-stats.json');
    let imported = 0;
    if (fs.existsSync(statsPath)) {
      const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
      const upsert = db.prepare(`INSERT INTO tool_usage (tool_id, usage_count) VALUES (?, ?)
        ON CONFLICT(tool_id) DO UPDATE SET usage_count = MAX(tool_usage.usage_count, excluded.usage_count), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`);
      for (const [id, rawCount] of Object.entries(stats)) {
        const count = Number(rawCount);
        if (!/^[a-z0-9-]{1,100}$/.test(id) || !Number.isSafeInteger(count) || count < 0) continue;
        upsert.run(id, count);
        imported += 1;
      }
    }
    db.prepare("INSERT INTO app_meta (key, value) VALUES ('legacy_stats_imported', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')").run(new Date().toISOString());
    return { imported, skipped: false };
  });
  const legacyImport = importLegacyStats();

  const trackStatement = db.prepare(`INSERT INTO tool_usage (tool_id, usage_count, updated_at)
    VALUES (?, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    ON CONFLICT(tool_id) DO UPDATE SET usage_count = usage_count + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    RETURNING usage_count AS count`);
  const topStatement = db.prepare('SELECT tool_id AS id, usage_count AS count FROM tool_usage ORDER BY usage_count DESC, tool_id ASC LIMIT ?');

  return {
    legacyImport,
    trackTool(id) {
      return trackStatement.get(id).count;
    },
    topTools(limit = 20) {
      return topStatement.all(limit);
    },
    health() {
      const row = db.prepare('SELECT 1 AS ok').get();
      return row?.ok === 1;
    },
    migrationVersions() {
      return db.prepare('SELECT version FROM schema_migrations ORDER BY version').all().map(row => row.version);
    },
    async backup(destination) {
      fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o750 });
      await db.backup(destination);
      return destination;
    },
    close() {
      if (db.open) db.close();
    },
    raw: db
  };
}
