import { Hono } from "hono";
import { query, get, run, transaction } from "./db";

const app = new Hono();

// ── Tables ──────────────────────────────────────────────────────────

app.get("/api/tables", async (c) => {
  try {
    const tables = await query(
      `SELECT t.*, (SELECT COUNT(*) FROM _columns WHERE table_id = t.id) as column_count,
              (SELECT COUNT(*) FROM _rows WHERE table_id = t.id) as row_count
       FROM _tables t ORDER BY t.position, t.created_at`,
    );
    return c.json({ tables });
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.post("/api/tables", async (c) => {
  try {
    const body = await c.req.json();
    const name = (body.name || "").trim();
    if (!name) return c.json({ error: "Name is required" }, 400);

    const maxPos = await get<{ mp: number }>("SELECT COALESCE(MAX(position), -1) as mp FROM _tables");
    const tableId = crypto.randomUUID();

    await transaction(async () => {
      await run("INSERT INTO _tables (id, name, position) VALUES (?, ?, ?)", tableId, name, (maxPos?.mp ?? -1) + 1);

      const columns: { name: string; type: string }[] = body.columns;
      if (columns && Array.isArray(columns) && columns.length > 0) {
        for (let i = 0; i < columns.length; i++) {
          const col = columns[i];
          const colName = (col.name || "").trim() || `Column ${i + 1}`;
          const colType = col.type === "number" ? "number" : "text";
          await run(
            "INSERT INTO _columns (id, table_id, name, type, position) VALUES (?, ?, ?, ?, ?)",
            crypto.randomUUID(), tableId, colName, colType, i,
          );
        }
      } else {
        await run(
          "INSERT INTO _columns (id, table_id, name, type, position) VALUES (?, ?, ?, ?, ?)",
          crypto.randomUUID(), tableId, "Name", "text", 0,
        );
      }
    });

    const table = await get("SELECT * FROM _tables WHERE id = ?", tableId);
    return c.json({ table }, 201);
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.put("/api/tables/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const name = (body.name || "").trim();
    if (!name) return c.json({ error: "Name is required" }, 400);

    const result = await run("UPDATE _tables SET name = ?, updated_at = datetime('now') WHERE id = ?", name, id);
    if (result.changes === 0) return c.json({ error: "Table not found" }, 404);

    const table = await get("SELECT * FROM _tables WHERE id = ?", id);
    return c.json({ table });
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.delete("/api/tables/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const result = await run("DELETE FROM _tables WHERE id = ?", id);
    if (result.changes === 0) return c.json({ error: "Table not found" }, 404);

    return c.json({ ok: true });
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ── Columns ─────────────────────────────────────────────────────────

app.get("/api/tables/:tid/columns", async (c) => {
  try {
    const tid = c.req.param("tid");
    const columns = await query("SELECT * FROM _columns WHERE table_id = ? ORDER BY position", tid);
    return c.json({ columns });
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.post("/api/tables/:tid/columns", async (c) => {
  try {
    const tid = c.req.param("tid");
    const table = await get("SELECT id FROM _tables WHERE id = ?", tid);
    if (!table) return c.json({ error: "Table not found" }, 404);

    const body = await c.req.json();
    const name = (body.name || "").trim() || "New Column";
    const type = body.type === "number" ? "number" : "text";

    const maxPos = await get<{ mp: number }>(
      "SELECT COALESCE(MAX(position), -1) as mp FROM _columns WHERE table_id = ?", tid,
    );
    const colId = crypto.randomUUID();
    await run(
      "INSERT INTO _columns (id, table_id, name, type, position) VALUES (?, ?, ?, ?, ?)",
      colId, tid, name, type, (maxPos?.mp ?? -1) + 1,
    );

    const col = await get("SELECT * FROM _columns WHERE id = ?", colId);
    return c.json({ column: col }, 201);
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.put("/api/tables/:tid/columns/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    const setClauses: string[] = [];
    const setParams: unknown[] = [];

    if (body.name !== undefined) {
      const name = (body.name || "").trim();
      if (!name) return c.json({ error: "Name is required" }, 400);
      setClauses.push("name = ?");
      setParams.push(name);
    }
    if (body.type !== undefined) {
      setClauses.push("type = ?");
      setParams.push(body.type === "number" ? "number" : "text");
    }

    if (setClauses.length === 0) return c.json({ error: "No fields to update" }, 400);

    setClauses.push("updated_at = datetime('now')");
    setParams.push(id);

    const result = await run("UPDATE _columns SET " + setClauses.join(", ") + " WHERE id = ?", ...setParams);
    if (result.changes === 0) return c.json({ error: "Column not found" }, 404);

    const col = await get("SELECT * FROM _columns WHERE id = ?", id);
    return c.json({ column: col });
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.delete("/api/tables/:tid/columns/:id", async (c) => {
  try {
    const tid = c.req.param("tid");
    const id = c.req.param("id");

    const col = await get<{ id: string }>("SELECT id FROM _columns WHERE id = ? AND table_id = ?", id, tid);
    if (!col) return c.json({ error: "Column not found" }, 404);

    await transaction(async () => {
      await run("DELETE FROM _columns WHERE id = ?", id);
      // Remove this column's data from all rows
      const rows = await query<{ id: number; data: string }>("SELECT id, data FROM _rows WHERE table_id = ?", tid);
      for (const row of rows) {
        const data = JSON.parse(row.data);
        delete data[id];
        await run("UPDATE _rows SET data = ?, updated_at = datetime('now') WHERE id = ?", JSON.stringify(data), row.id);
      }
    });

    return c.json({ ok: true });
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.put("/api/tables/:tid/columns/reorder", async (c) => {
  try {
    const tid = c.req.param("tid");
    const body = await c.req.json();
    const ids: string[] = body.ids;
    if (!Array.isArray(ids)) return c.json({ error: "ids array required" }, 400);

    await transaction(async () => {
      for (let i = 0; i < ids.length; i++) {
        await run("UPDATE _columns SET position = ?, updated_at = datetime('now') WHERE id = ? AND table_id = ?", i, ids[i], tid);
      }
    });

    const columns = await query("SELECT * FROM _columns WHERE table_id = ? ORDER BY position", tid);
    return c.json({ columns });
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ── Rows ────────────────────────────────────────────────────────────

app.get("/api/tables/:tid/rows", async (c) => {
  try {
    const tid = c.req.param("tid");
    const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") || "25", 10)));
    const offset = (page - 1) * limit;

    const sortCol = c.req.query("sort") || "id";
    let order = (c.req.query("order") || "desc").toLowerCase();
    if (order !== "asc" && order !== "desc") order = "desc";

    // Build WHERE clause
    const whereClauses: string[] = ["table_id = ?"];
    const whereParams: unknown[] = [tid];

    // Filters on JSON data columns (filter_<column_id>=value)
    const url = new URL(c.req.url);
    for (const [key, val] of url.searchParams.entries()) {
      if (key.startsWith("filter_") && val.trim()) {
        const colId = key.slice(7);
        // Sanitize: only allow UUID-like column IDs or 'id'
        if (colId === "id") {
          whereClauses.push("CAST(id AS TEXT) LIKE ?");
          whereParams.push("%" + val.trim() + "%");
        } else if (/^[0-9a-f-]{36}$/i.test(colId)) {
          whereClauses.push("json_extract(data, '$.' || ?) LIKE ?");
          whereParams.push(colId, "%" + val.trim() + "%");
        }
      }
    }

    const whereSQL = " WHERE " + whereClauses.join(" AND ");

    const countResult = await get<{ total: number }>(
      "SELECT COUNT(*) as total FROM _rows" + whereSQL,
      ...whereParams,
    );
    const total = countResult?.total || 0;

    // Sort: if sorting by a JSON column, use json_extract
    let orderSQL: string;
    if (sortCol === "id" || sortCol === "created_at" || sortCol === "updated_at") {
      orderSQL = ` ORDER BY ${sortCol} ${order}`;
    } else if (/^[0-9a-f-]{36}$/i.test(sortCol)) {
      orderSQL = ` ORDER BY json_extract(data, '$.' || ?) ${order}`;
      whereParams.push(sortCol);
    } else {
      orderSQL = ` ORDER BY id ${order}`;
    }

    const rows = await query(
      "SELECT * FROM _rows" + whereSQL + orderSQL + " LIMIT ? OFFSET ?",
      ...whereParams,
      limit,
      offset,
    );

    // Parse JSON data field
    const parsed = (rows as { id: number; table_id: string; data: string; created_at: string; updated_at: string }[]).map((r) => ({
      id: r.id,
      table_id: r.table_id,
      data: JSON.parse(r.data),
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    return c.json({ rows: parsed, total, page, limit });
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.post("/api/tables/:tid/rows", async (c) => {
  try {
    const tid = c.req.param("tid");
    const table = await get("SELECT id FROM _tables WHERE id = ?", tid);
    if (!table) return c.json({ error: "Table not found" }, 404);

    const body = await c.req.json();
    const data = body.data || {};

    await run(
      "INSERT INTO _rows (table_id, data) VALUES (?, ?)",
      tid, JSON.stringify(data),
    );

    const inserted = await get("SELECT * FROM _rows WHERE rowid = last_insert_rowid()") as {
      id: number; table_id: string; data: string; created_at: string; updated_at: string;
    };

    return c.json({
      row: { ...inserted, data: JSON.parse(inserted.data) },
    }, 201);
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.put("/api/tables/:tid/rows/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

    const existing = await get<{ data: string }>("SELECT data FROM _rows WHERE id = ?", id);
    if (!existing) return c.json({ error: "Row not found" }, 404);

    const body = await c.req.json();
    const newData = { ...JSON.parse(existing.data), ...body.data };

    await run(
      "UPDATE _rows SET data = ?, updated_at = datetime('now') WHERE id = ?",
      JSON.stringify(newData), id,
    );

    const updated = await get("SELECT * FROM _rows WHERE id = ?", id) as {
      id: number; table_id: string; data: string; created_at: string; updated_at: string;
    };
    return c.json({ row: { ...updated, data: JSON.parse(updated.data) } });
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.delete("/api/tables/:tid/rows/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

    const result = await run("DELETE FROM _rows WHERE id = ?", id);
    if (result.changes === 0) return c.json({ error: "Row not found" }, 404);

    return c.json({ ok: true });
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// OpenAPI spec
app.get("/openapi.json", (c) => {
  const tidParam = { name: "tid", in: "path", required: true, schema: { type: "string" }, description: "Table ID (UUID)" };
  return c.json({
    openapi: "3.0.0",
    info: { title: "Table App", version: "1.0.0" },
    paths: {
      "/api/tables": {
        get: {
          summary: "List all tables with column and row counts",
          responses: { "200": { description: "Array of tables", content: { "application/json": { schema: { type: "object", properties: { tables: { type: "array", items: { $ref: "#/components/schemas/Table" } } } } } } } },
        },
        post: {
          summary: "Create a new table",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: {
            name: { type: "string" },
            columns: { type: "array", items: { type: "object", properties: { name: { type: "string" }, type: { type: "string", enum: ["text", "number"] } } }, description: "Optional initial columns. Defaults to one 'Name' text column." },
          }, required: ["name"] } } } },
          responses: { "201": { description: "Created table" } },
        },
      },
      "/api/tables/{id}": {
        put: {
          summary: "Rename a table",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } } } },
          responses: { "200": { description: "Updated table" } },
        },
        delete: {
          summary: "Delete a table and all its columns/rows",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "{ ok: true }" } },
        },
      },
      "/api/tables/{tid}/columns": {
        get: {
          summary: "List columns for a table",
          parameters: [tidParam],
          responses: { "200": { description: "Array of columns", content: { "application/json": { schema: { type: "object", properties: { columns: { type: "array", items: { $ref: "#/components/schemas/Column" } } } } } } } },
        },
        post: {
          summary: "Add a column to a table",
          parameters: [tidParam],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, type: { type: "string", enum: ["text", "number"] } } } } } },
          responses: { "201": { description: "Created column" } },
        },
      },
      "/api/tables/{tid}/columns/{id}": {
        put: {
          summary: "Update a column name or type",
          parameters: [tidParam, { name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, type: { type: "string", enum: ["text", "number"] } } } } } },
          responses: { "200": { description: "Updated column" } },
        },
        delete: {
          summary: "Delete a column and remove its data from all rows",
          parameters: [tidParam, { name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "{ ok: true }" } },
        },
      },
      "/api/tables/{tid}/columns/reorder": {
        put: {
          summary: "Reorder columns",
          parameters: [tidParam],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { ids: { type: "array", items: { type: "string" }, description: "Column IDs in desired order" } }, required: ["ids"] } } } },
          responses: { "200": { description: "Reordered columns" } },
        },
      },
      "/api/tables/{tid}/rows": {
        get: {
          summary: "List rows with pagination, sorting, and filtering",
          parameters: [
            tidParam,
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 25, maximum: 100 } },
            { name: "sort", in: "query", schema: { type: "string" }, description: "Column ID or 'id'/'created_at'/'updated_at'" },
            { name: "order", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } },
          ],
          responses: { "200": { description: "Paginated rows", content: { "application/json": { schema: { type: "object", properties: {
            rows: { type: "array", items: { $ref: "#/components/schemas/Row" } },
            total: { type: "integer" }, page: { type: "integer" }, limit: { type: "integer" },
          } } } } } },
        },
        post: {
          summary: "Create a new row",
          parameters: [tidParam],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { data: { type: "object", description: "Key-value pairs where keys are column IDs" } } } } } },
          responses: { "201": { description: "Created row" } },
        },
      },
      "/api/tables/{tid}/rows/{id}": {
        put: {
          summary: "Update a row (merges data)",
          parameters: [tidParam, { name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { data: { type: "object", description: "Key-value pairs to merge into existing data" } } } } } },
          responses: { "200": { description: "Updated row" } },
        },
        delete: {
          summary: "Delete a row",
          parameters: [tidParam, { name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { "200": { description: "{ ok: true }" } },
        },
      },
      "/api/tables/{tid}/export/csv": {
        get: {
          summary: "Export table rows as CSV",
          parameters: [tidParam],
          responses: { "200": { description: "CSV file download", content: { "text/csv": {} } } },
        },
      },
    },
    components: {
      schemas: {
        Table: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, position: { type: "integer" }, column_count: { type: "integer" }, row_count: { type: "integer" }, created_at: { type: "string" }, updated_at: { type: "string" } } },
        Column: { type: "object", properties: { id: { type: "string" }, table_id: { type: "string" }, name: { type: "string" }, type: { type: "string", enum: ["text", "number"] }, position: { type: "integer" }, created_at: { type: "string" }, updated_at: { type: "string" } } },
        Row: { type: "object", properties: { id: { type: "integer" }, table_id: { type: "string" }, data: { type: "object", description: "Column ID → value pairs" }, created_at: { type: "string" }, updated_at: { type: "string" } } },
      },
    },
  });
});

// CSV export
app.get("/api/tables/:tid/export/csv", async (c) => {
  try {
    const tid = c.req.param("tid");
    const columns = await query<{ id: string; name: string }>(
      "SELECT id, name FROM _columns WHERE table_id = ? ORDER BY position", tid,
    );
    const rows = await query<{ id: number; data: string; created_at: string; updated_at: string }>(
      "SELECT * FROM _rows WHERE table_id = ? ORDER BY id DESC", tid,
    );

    const headers = ["id", ...columns.map((col) => col.name), "created_at", "updated_at"];

    const escapeCsv = (val: string) => {
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return '"' + val.replace(/"/g, '""') + '"';
      }
      return val;
    };

    let csv = headers.map(escapeCsv).join(",") + "\n";
    for (const row of rows) {
      const data = JSON.parse(row.data);
      const values = [
        String(row.id),
        ...columns.map((col) => String(data[col.id] ?? "")),
        row.created_at,
        row.updated_at,
      ];
      csv += values.map(escapeCsv).join(",") + "\n";
    }

    const tableName = await get<{ name: string }>("SELECT name FROM _tables WHERE id = ?", tid);
    const filename = (tableName?.name || "export").replace(/[^a-zA-Z0-9-_]/g, "_");

    c.header("Content-Type", "text/csv; charset=utf-8");
    c.header("Content-Disposition", `attachment; filename=${filename}-export.csv`);
    return c.body(csv);
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

export default app;
