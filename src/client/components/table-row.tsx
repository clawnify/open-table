import { useState, useRef, useEffect } from "preact/hooks";
import { Pencil, Trash2 } from "lucide-preact";
import { useTable } from "../context";
import type { RowData } from "../types";

interface TableRowProps {
  row: RowData;
}

export function TableRow({ row }: TableRowProps) {
  const { columns, isAgent, updateRow, deleteRow, setError } = useTable();
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

  const saveCellEdit = (colId: string, value: string) => {
    const col = columns.find((c) => c.id === colId);
    const parsed = col?.type === "number" ? parseFloat(value) || 0 : value;
    updateRow(row.id, { [colId]: parsed }).catch((err) =>
      setError((err as Error).message),
    );
    setEditingCell(null);
  };

  const startRowEdit = () => {
    const values: Record<string, string> = {};
    for (const col of columns) {
      values[col.id] = String(row.data[col.id] ?? "");
    }
    setEditValues(values);
    setEditingRow(true);
  };

  const saveRowEdit = () => {
    const data: Record<string, unknown> = {};
    for (const col of columns) {
      const val = editValues[col.id];
      data[col.id] = col.type === "number" ? parseFloat(val) || 0 : val;
    }
    updateRow(row.id, data)
      .then(() => setEditingRow(false))
      .catch((err) => setError((err as Error).message));
  };

  const handleDelete = () => {
    deleteRow(row.id).catch((err) => {
      setError((err as Error).message);
      setConfirmDelete(false);
    });
  };

  const firstColName = columns[0]?.name || "row";
  const rowLabel = String(row.data[columns[0]?.id] ?? row.id);

  return (
    <>
      <tr>
        <td style={{ color: "var(--text-secondary)", fontSize: "12px" }}>{row.id}</td>
        {columns.map((col) => {
          const val = String(row.data[col.id] ?? "");

          // Human mode: inline cell editing
          if (!isAgent && editingCell === col.id) {
            return (
              <td key={col.id}>
                <input
                  ref={cellInputRef}
                  class="cell-input"
                  type={col.type === "number" ? "number" : "text"}
                  value={val}
                  data-row-id={row.id}
                  data-col={col.id}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveCellEdit(col.id, (e.target as HTMLInputElement).value);
                    if (e.key === "Escape") setEditingCell(null);
                  }}
                  onBlur={(e) => {
                    setTimeout(() => saveCellEdit(col.id, (e.target as HTMLInputElement).value), 100);
                  }}
                  aria-label={`Edit ${col.name}`}
                />
              </td>
            );
          }

          // Clickable cell (human mode)
          if (!isAgent) {
            return (
              <td key={col.id}>
                <span
                  class="cell-value human-only"
                  onClick={() => setEditingCell(col.id)}
                  title="Click to edit"
                >
                  {val || "\u00A0"}
                </span>
                <span class="agent-only" style={{ display: "none" }}>{val}</span>
              </td>
            );
          }

          // Agent mode: plain text
          return (
            <td key={col.id}>
              <span>{val}</span>
            </td>
          );
        })}
        <td /> {/* add-col spacer */}
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
                  <button class="btn btn-sm agent-only" onClick={startRowEdit} aria-label={`Edit row ${rowLabel}`}>
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
                  aria-label={`Delete row ${rowLabel}`}
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
          <td colSpan={columns.length + 3}>
            <div class="edit-form-grid">
              {columns.map((col) => (
                <div key={col.id}>
                  <label for={`edit-row-${row.id}-${col.id}`}>{col.name}</label>
                  <input
                    id={`edit-row-${row.id}-${col.id}`}
                    type={col.type === "number" ? "number" : "text"}
                    value={editValues[col.id] || ""}
                    onInput={(e) =>
                      setEditValues((prev) => ({
                        ...prev,
                        [col.id]: (e.target as HTMLInputElement).value,
                      }))
                    }
                    aria-label={`${col.name} for row ${rowLabel}`}
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
