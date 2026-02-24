import { useState, useRef, useEffect } from "preact/hooks";
import { Pencil, Trash2 } from "lucide-preact";
import { useTable } from "../context";
import { COLUMNS } from "../types";
import type { Row } from "../types";

interface TableRowProps {
  row: Row;
}

export function TableRow({ row }: TableRowProps) {
  const { isAgent, updateRow, deleteRow, setError } = useTable();
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const cellInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingCell && cellInputRef.current) {
      cellInputRef.current.focus();
      cellInputRef.current.select();
    }
  }, [editingCell]);

  const saveCellEdit = (key: string, value: string) => {
    const col = COLUMNS.find((c) => c.key === key);
    const parsed = col?.type === "number" ? parseFloat(value) || 0 : value;
    updateRow(row.id, { [key]: parsed } as Partial<Row>).catch((err) =>
      setError((err as Error).message),
    );
    setEditingCell(null);
  };

  const startRowEdit = () => {
    const values: Record<string, string> = {};
    for (const col of COLUMNS) {
      if (col.type !== "readonly") {
        values[col.key] = String(row[col.key] ?? "");
      }
    }
    setEditValues(values);
    setEditingRow(true);
  };

  const saveRowEdit = () => {
    const body: Record<string, unknown> = {};
    for (const col of COLUMNS) {
      if (col.type === "readonly") continue;
      const val = editValues[col.key];
      body[col.key] = col.type === "number" ? parseFloat(val) || 0 : val;
    }
    updateRow(row.id, body as Partial<Row>)
      .then(() => setEditingRow(false))
      .catch((err) => setError((err as Error).message));
  };

  const handleDelete = () => {
    deleteRow(row.id).catch((err) => {
      setError((err as Error).message);
      setConfirmDelete(false);
    });
  };

  return (
    <>
      <tr>
        <td style={{ color: "var(--text-secondary)", fontSize: "12px" }}>{row.id}</td>
        {COLUMNS.map((col) => {
          const val = String(row[col.key] ?? "");

          // Human mode: inline cell editing
          if (!isAgent && editingCell === col.key) {
            return (
              <td key={col.key}>
                <input
                  ref={cellInputRef}
                  class="cell-input"
                  type={col.type === "number" ? "number" : "text"}
                  value={val}
                  data-row-id={row.id}
                  data-col={col.key}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveCellEdit(col.key, (e.target as HTMLInputElement).value);
                    if (e.key === "Escape") setEditingCell(null);
                  }}
                  onBlur={(e) => {
                    setTimeout(() => saveCellEdit(col.key, (e.target as HTMLInputElement).value), 100);
                  }}
                  aria-label={`Edit ${col.label}`}
                />
              </td>
            );
          }

          // Clickable cell (human mode, non-readonly)
          if (!isAgent && col.type !== "readonly") {
            return (
              <td key={col.key}>
                <span
                  class="cell-value human-only"
                  onClick={() => setEditingCell(col.key)}
                  title="Click to edit"
                >
                  {val || "\u00A0"}
                </span>
                {/* Agent sees plain text */}
                <span class="agent-only" style={{ display: "none" }}>{val}</span>
              </td>
            );
          }

          // Readonly or agent mode plain text
          return (
            <td key={col.key}>
              <span style={{ fontSize: col.type === "readonly" ? "12px" : undefined, color: col.type === "readonly" ? "var(--text-secondary)" : undefined }}>
                {val}
              </span>
            </td>
          );
        })}
        <td>
          <div class="actions-cell">
            {confirmDelete ? (
              <span class="confirm-delete">
                Delete?
                <button class="btn btn-sm btn-danger" onClick={handleDelete} aria-label="Confirm delete">
                  Yes
                </button>
                <button class="btn btn-sm" onClick={() => setConfirmDelete(false)} aria-label="Cancel delete">
                  No
                </button>
              </span>
            ) : (
              <>
                {isAgent && !editingRow && (
                  <button class="btn btn-sm agent-only" onClick={startRowEdit} aria-label={`Edit row ${row.name}`}>
                    <Pencil size={12} /> Edit
                  </button>
                )}
                {isAgent && editingRow && (
                  <button class="btn btn-sm agent-only" onClick={() => setEditingRow(false)} aria-label="Cancel edit">
                    Cancel
                  </button>
                )}
                <button
                  class="btn btn-sm btn-danger"
                  onClick={() => setConfirmDelete(true)}
                  aria-label={`Delete row ${row.name}`}
                >
                  <Trash2 size={12} /> Delete
                </button>
              </>
            )}
          </div>
        </td>
      </tr>

      {/* Agent mode: edit form row below */}
      {isAgent && editingRow && (
        <tr class="edit-form-row">
          <td colSpan={COLUMNS.length + 2}>
            <div class="edit-form-grid">
              {COLUMNS.filter((c) => c.type !== "readonly").map((col) => (
                <div key={col.key}>
                  <label for={`edit-row-${row.id}-${col.key}`}>{col.label}</label>
                  <input
                    id={`edit-row-${row.id}-${col.key}`}
                    type={col.type === "number" ? "number" : "text"}
                    value={editValues[col.key] || ""}
                    onInput={(e) =>
                      setEditValues((prev) => ({
                        ...prev,
                        [col.key]: (e.target as HTMLInputElement).value,
                      }))
                    }
                    aria-label={`${col.label} for ${row.name}`}
                  />
                </div>
              ))}
              <div class="edit-form-actions">
                <button class="btn btn-primary btn-sm" onClick={saveRowEdit} aria-label="Save changes">
                  Save
                </button>
                <button class="btn btn-sm" onClick={() => setEditingRow(false)} aria-label="Cancel edit">
                  Cancel
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
