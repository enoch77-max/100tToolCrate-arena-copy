CREATE TABLE IF NOT EXISTS tool_usage (
  tool_id TEXT PRIMARY KEY CHECK(length(tool_id) BETWEEN 1 AND 100),
  usage_count INTEGER NOT NULL DEFAULT 0 CHECK(usage_count >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_tool_usage_count ON tool_usage(usage_count DESC, tool_id ASC);
