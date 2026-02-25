import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, "..", "..", "data.db");

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Auto-apply schema on startup
const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
db.exec(schema);

// Seed default table if none exist
const tableCount = db.prepare("SELECT COUNT(*) as count FROM _tables").get() as { count: number };
if (tableCount.count === 0) {
  const tableId = crypto.randomUUID();
  const colId = crypto.randomUUID();
  db.prepare("INSERT INTO _tables (id, name, position) VALUES (?, ?, ?)").run(tableId, "Table 1", 0);
  db.prepare("INSERT INTO _columns (id, table_id, name, type, position) VALUES (?, ?, ?, ?, ?)").run(colId, tableId, "Name", "text", 0);
}

export function query<T = Record<string, unknown>>(
  sql: string,
  ...params: unknown[]
): T[] {
  return db.prepare(sql).all(...params) as T[];
}

export function get<T = Record<string, unknown>>(
  sql: string,
  ...params: unknown[]
): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined;
}

export function run(sql: string, ...params: unknown[]) {
  return db.prepare(sql).run(...params);
}

export function transaction<T>(fn: () => T): T {
  return db.transaction(fn)();
}
