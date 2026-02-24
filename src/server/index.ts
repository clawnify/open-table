import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { query, get, run } from "./db";

const app = new Hono();

const ALLOWED_COLUMNS = [
  "id", "name", "status", "category", "value", "notes", "created_at", "updated_at",
];

// List rows with pagination, sorting, filtering
app.get("/api/rows", (c) => {
  try {
    const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") || "25", 10)));
    const offset = (page - 1) * limit;

    let sortCol = c.req.query("sort") || "id";
    if (!ALLOWED_COLUMNS.includes(sortCol)) sortCol = "id";
    let order = (c.req.query("order") || "desc").toLowerCase();
    if (order !== "asc" && order !== "desc") order = "desc";

    const whereClauses: string[] = [];
    const whereParams: unknown[] = [];

    for (const col of ALLOWED_COLUMNS) {
      const filterVal = c.req.query("filter_" + col);
      if (filterVal && filterVal.trim() !== "") {
        whereClauses.push(col + " LIKE ?");
        whereParams.push("%" + filterVal.trim() + "%");
      }
    }

    const whereSQL = whereClauses.length > 0 ? " WHERE " + whereClauses.join(" AND ") : "";

    const countResult = get<{ total: number }>(
      "SELECT COUNT(*) as total FROM items" + whereSQL,
      ...whereParams,
    );
    const total = countResult?.total || 0;

    const rows = query(
      "SELECT * FROM items" + whereSQL + " ORDER BY " + sortCol + " " + order + " LIMIT ? OFFSET ?",
      ...whereParams,
      limit,
      offset,
    );

    return c.json({ rows, total, page, limit });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// Create row
app.post("/api/rows", async (c) => {
  try {
    const body = await c.req.json();
    const name = body.name || "";
    const status = body.status || "active";
    const category = body.category || "";
    const value = typeof body.value === "number" ? body.value : 0;
    const notes = body.notes || "";

    if (!name.trim()) {
      return c.json({ error: "Name is required" }, 400);
    }

    run(
      "INSERT INTO items (name, status, category, value, notes) VALUES (?, ?, ?, ?, ?)",
      name, status, category, value, notes,
    );

    const inserted = get("SELECT * FROM items WHERE rowid = last_insert_rowid()");
    return c.json({ row: inserted }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// Update row
app.put("/api/rows/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

    const body = await c.req.json();
    const setClauses: string[] = [];
    const setParams: unknown[] = [];

    const updatable = ["name", "status", "category", "value", "notes"];
    for (const col of updatable) {
      if (body[col] !== undefined) {
        setClauses.push(col + " = ?");
        setParams.push(body[col]);
      }
    }

    if (setClauses.length === 0) {
      return c.json({ error: "No fields to update" }, 400);
    }

    setClauses.push("updated_at = datetime('now')");
    setParams.push(id);

    const result = run(
      "UPDATE items SET " + setClauses.join(", ") + " WHERE id = ?",
      ...setParams,
    );

    if (result.changes === 0) {
      return c.json({ error: "Row not found" }, 404);
    }

    const updated = get("SELECT * FROM items WHERE id = ?", id);
    return c.json({ row: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// Delete row
app.delete("/api/rows/:id", (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

    const result = run("DELETE FROM items WHERE id = ?", id);

    if (result.changes === 0) {
      return c.json({ error: "Row not found" }, 404);
    }

    return c.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// CSV export
app.get("/api/export/csv", (c) => {
  try {
    const rows = query("SELECT * FROM items ORDER BY id DESC");

    const headers = [
      "id", "name", "status", "category", "value", "notes", "created_at", "updated_at",
    ];

    let csv = headers.join(",") + "\n";
    for (const row of rows) {
      const record = row as Record<string, unknown>;
      const line = headers
        .map((h) => {
          const val = String(record[h] ?? "");
          if (val.includes(",") || val.includes('"') || val.includes("\n")) {
            return '"' + val.replace(/"/g, '""') + '"';
          }
          return val;
        })
        .join(",");
      csv += line + "\n";
    }

    c.header("Content-Type", "text/csv; charset=utf-8");
    c.header("Content-Disposition", "attachment; filename=items-export.csv");
    return c.body(csv);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// Production: serve Vite build output
if (process.env.NODE_ENV === "production") {
  app.use("/*", serveStatic({ root: "./dist" }));
  app.get("*", serveStatic({ root: "./dist", path: "index.html" }));
}

const port = parseInt(process.env.PORT || "3002", 10);
console.log(`Table API running at http://localhost:${port}`);
serve({ fetch: app.fetch, port });

export default app;
