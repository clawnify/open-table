# Table App

Data table with CRUD, sorting, filtering, pagination, and CSV export. Built with Hono + SQLite. Runs locally with zero cloud dependencies.

## Quick Start

```bash
npm install
npm start
```

Open `http://localhost:3000` in your browser. Data persists in `data.db`.

## Browser-Use Mode

For OpenClaw agents using browser control, append `?agent=true`:

```
http://localhost:3000/?agent=true
```

This activates an agent-friendly UI with:
- Explicit "Edit" button per row (opens a labeled form) instead of click-to-edit cells
- Larger click targets for reliable interaction
- All the same data — just explicit controls instead of implicit ones

The human UI stays unchanged — click any cell to edit inline, all the usual interactions.

## Features

- Create, edit, and delete rows
- Column sorting (click headers)
- Per-column filtering with debounce
- Pagination with configurable page size
- CSV export
- SQLite persistence (auto-creates schema on first run)
- Dual-mode UI: human-optimized + browser-use-optimized

## File Structure

```
src/
  index.ts    — Hono routes + Node.js server
  html.ts     — Full HTML/CSS/JS (dual-mode UI)
  db.ts       — SQLite wrapper (better-sqlite3)
  schema.sql  — Database schema
```

## How Clawnify Uses This

Clawnify's app builder uses this template as a starting point when users request a data table app. The `db.ts` file is swapped with a D1 adapter, the code is bundled with esbuild, and deployed to Workers for Platforms. The rest of the app stays identical.
