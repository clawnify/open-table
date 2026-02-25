import { useState, useRef, useEffect, useCallback } from "preact/hooks";
import { Plus, GripVertical, Trash2 } from "lucide-preact";
import { useTable } from "../context";

export function TableHeader() {
  const { columns, state, isAgent, setSort, setFilter, addColumn, renameColumn, updateColumnType, deleteColumn, reorderColumns, setError } = useTable();
  const timerRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editColName, setEditColName] = useState("");
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [dragColId, setDragColId] = useState<string | null>(null);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingColId && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingColId]);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu]);

  const handleFilter = useCallback(
    (colId: string, value: string) => {
      setFilterValues((prev) => ({ ...prev, [colId]: value }));
      if (timerRefs.current[colId]) clearTimeout(timerRefs.current[colId]);
      timerRefs.current[colId] = setTimeout(() => {
        setFilter(colId, value);
      }, 300);
    },
    [setFilter],
  );

  const startRename = (id: string, name: string) => {
    setEditingColId(id);
    setEditColName(name);
    setContextMenu(null);
  };

  const saveRename = () => {
    if (editingColId && editColName.trim()) {
      renameColumn(editingColId, editColName.trim()).catch((err) => setError((err as Error).message));
    }
    setEditingColId(null);
  };

  const handleAddColumn = () => {
    addColumn("New Column", "text").catch((err) => setError((err as Error).message));
  };

  const handleDeleteColumn = (id: string) => {
    deleteColumn(id).catch((err) => setError((err as Error).message));
    setContextMenu(null);
  };

  const handleTypeChange = (id: string, type: string) => {
    updateColumnType(id, type).catch((err) => setError((err as Error).message));
    setContextMenu(null);
  };

  // Drag and drop reorder
  const handleDragStart = (colId: string) => {
    setDragColId(colId);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!dragColId || dragColId === targetId) return;
    const ids = columns.map((c) => c.id);
    const fromIdx = ids.indexOf(dragColId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, dragColId);
    reorderColumns(ids).catch((err) => setError((err as Error).message));
    setDragColId(null);
  };

  return (
    <thead>
      <tr>
        <th style={{ width: "50px" }}>#</th>
        {columns.map((col) => (
          <th
            key={col.id}
            class={`sortable ${dragColId === col.id ? "dragging" : ""}`}
            draggable={!isAgent}
            onDragStart={() => handleDragStart(col.id)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(col.id)}
            onDragEnd={() => setDragColId(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({ id: col.id, x: e.clientX, y: e.clientY });
            }}
          >
            <div class="col-header-inner">
              {!isAgent && <GripVertical size={12} class="drag-handle human-only" />}
              {editingColId === col.id ? (
                <input
                  ref={editRef}
                  class="col-rename-input"
                  value={editColName}
                  onInput={(e) => setEditColName((e.target as HTMLInputElement).value)}
                  onBlur={saveRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveRename();
                    if (e.key === "Escape") setEditingColId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  class="col-name"
                  onClick={() => setSort(col.id)}
                  onDblClick={(e) => {
                    e.stopPropagation();
                    if (!isAgent) startRename(col.id, col.name);
                  }}
                  aria-label={`Sort by ${col.name}`}
                >
                  {col.name}
                  <span class="col-type-badge">{col.type === "number" ? "#" : "T"}</span>
                  {state.sort === col.id && (
                    <span class="sort-icon">{state.order === "asc" ? "\u25B3" : "\u25BC"}</span>
                  )}
                </span>
              )}
            </div>
          </th>
        ))}
        <th class="add-col-header">
          <button class="add-col-btn" onClick={handleAddColumn} aria-label="Add column">
            <Plus size={14} />
          </button>
        </th>
        <th style={{ width: "100px" }}>Actions</th>
      </tr>

      {/* Agent-mode column management row */}
      {isAgent && (
        <tr class="agent-col-actions agent-only-block">
          <td />
          {columns.map((col) => (
            <td key={col.id}>
              <div class="agent-col-btns">
                <button
                  class="btn btn-sm"
                  onClick={() => startRename(col.id, col.name)}
                  aria-label={`Rename column ${col.name}`}
                >
                  Rename
                </button>
                <button
                  class="btn btn-sm"
                  onClick={() => handleTypeChange(col.id, col.type === "number" ? "text" : "number")}
                  aria-label={`Change type of ${col.name}`}
                >
                  {col.type === "number" ? "Text" : "Number"}
                </button>
                <button
                  class="btn btn-sm btn-danger"
                  onClick={() => handleDeleteColumn(col.id)}
                  aria-label={`Delete column ${col.name}`}
                >
                  <Trash2 size={10} />
                </button>
              </div>
            </td>
          ))}
          <td />
          <td />
        </tr>
      )}

      <tr class="filter-row">
        <td />
        {columns.map((col) => (
          <td key={col.id}>
            <input
              class="filter-input"
              type="text"
              placeholder={`Filter ${col.name.toLowerCase()}...`}
              value={filterValues[col.id] || ""}
              onInput={(e) => handleFilter(col.id, (e.target as HTMLInputElement).value)}
              aria-label={`Filter by ${col.name}`}
            />
          </td>
        ))}
        <td />
        <td />
      </tr>

      {/* Human-mode context menu */}
      {contextMenu && !isAgent && (
        <tr style={{ display: "none" }}>
          <td>
            {/* Portal-like: rendered outside table flow */}
          </td>
        </tr>
      )}

      {/* We render the context menu as a fixed-position div via a portal pattern */}
      {contextMenu && !isAgent && (
        <ColumnContextMenu
          colId={contextMenu.id}
          x={contextMenu.x}
          y={contextMenu.y}
          currentType={columns.find((c) => c.id === contextMenu.id)?.type || "text"}
          onRename={() => {
            const col = columns.find((c) => c.id === contextMenu.id);
            if (col) startRename(col.id, col.name);
          }}
          onChangeType={(type) => handleTypeChange(contextMenu.id, type)}
          onDelete={() => handleDeleteColumn(contextMenu.id)}
        />
      )}
    </thead>
  );
}

function ColumnContextMenu({ x, y, currentType, onRename, onChangeType, onDelete }: {
  colId: string;
  x: number;
  y: number;
  currentType: string;
  onRename: () => void;
  onChangeType: (type: string) => void;
  onDelete: () => void;
}) {
  return (
    <div class="col-context-menu" style={{ position: "fixed", left: x + "px", top: y + "px", zIndex: 1000 }}>
      <button onClick={onRename}>Rename</button>
      <button onClick={() => onChangeType(currentType === "number" ? "text" : "number")}>
        Change to {currentType === "number" ? "Text" : "Number"}
      </button>
      <button class="danger" onClick={onDelete}>Delete Column</button>
    </div>
  );
}
