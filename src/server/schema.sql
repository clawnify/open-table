CREATE TABLE IF NOT EXISTS _tables (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS _columns (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL REFERENCES _tables(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS _rows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_id TEXT NOT NULL REFERENCES _tables(id) ON DELETE CASCADE,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_columns_table ON _columns(table_id, position);
CREATE INDEX IF NOT EXISTS idx_rows_table ON _rows(table_id);
