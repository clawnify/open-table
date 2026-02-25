import { useState, useRef, useEffect } from "preact/hooks";
import { Plus, X } from "lucide-preact";
import { useTable } from "../context";

export function TableTabs() {
  const { tables, activeTableId, setActiveTable, createTable, renameTable, deleteTable, isAgent, setError } = useTable();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState("");
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingId]);

  useEffect(() => {
    if (showNewInput && newRef.current) {
      newRef.current.focus();
    }
  }, [showNewInput]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu]);

  const startRename = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
    setContextMenu(null);
  };

  const saveRename = () => {
    if (editingId && editName.trim()) {
      renameTable(editingId, editName.trim()).catch((err) => setError((err as Error).message));
    }
    setEditingId(null);
  };

  const handleCreate = () => {
    const name = newName.trim();
    if (name) {
      createTable(name).catch((err) => setError((err as Error).message));
    }
    setNewName("");
    setShowNewInput(false);
  };

  const handleDelete = (id: string) => {
    deleteTable(id).catch((err) => setError((err as Error).message));
    setContextMenu(null);
  };

  return (
    <div class="table-tabs">
      {tables.map((t) => (
        <div
          key={t.id}
          class={`table-tab ${t.id === activeTableId ? "active" : ""}`}
          onClick={() => setActiveTable(t.id)}
          onDblClick={() => !isAgent && startRename(t.id, t.name)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ id: t.id, x: e.clientX, y: e.clientY });
          }}
          aria-label={`Table: ${t.name}`}
          role="tab"
          aria-selected={t.id === activeTableId}
        >
          {editingId === t.id ? (
            <input
              ref={editRef}
              class="tab-rename-input"
              value={editName}
              onInput={(e) => setEditName((e.target as HTMLInputElement).value)}
              onBlur={saveRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveRename();
                if (e.key === "Escape") setEditingId(null);
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span class="tab-name">{t.name}</span>
          )}
        </div>
      ))}

      {showNewInput ? (
        <div class="table-tab new-tab-input">
          <input
            ref={newRef}
            class="tab-rename-input"
            placeholder="Table name"
            value={newName}
            onInput={(e) => setNewName((e.target as HTMLInputElement).value)}
            onBlur={() => { setShowNewInput(false); setNewName(""); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleCreate(); }
              if (e.key === "Escape") { setShowNewInput(false); setNewName(""); }
            }}
          />
        </div>
      ) : (
        <button
          class="table-tab add-tab"
          onClick={() => setShowNewInput(true)}
          aria-label="Create new table"
        >
          <Plus size={14} />
        </button>
      )}

      {/* Agent-mode buttons for rename/delete */}
      {isAgent && activeTableId && (
        <div class="tab-agent-actions agent-only">
          <button
            class="btn btn-sm"
            onClick={() => {
              const t = tables.find((t) => t.id === activeTableId);
              if (t) startRename(t.id, t.name);
            }}
            aria-label="Rename active table"
          >
            Rename Table
          </button>
          {tables.length > 1 && (
            <button
              class="btn btn-sm btn-danger"
              onClick={() => handleDelete(activeTableId)}
              aria-label="Delete active table"
            >
              <X size={12} /> Delete Table
            </button>
          )}
        </div>
      )}

      {/* Context menu (human mode) */}
      {contextMenu && !isAgent && (
        <div
          class="tab-context-menu"
          style={{ left: contextMenu.x + "px", top: contextMenu.y + "px" }}
        >
          <button onClick={() => startRename(contextMenu.id, tables.find((t) => t.id === contextMenu.id)?.name || "")}>
            Rename
          </button>
          {tables.length > 1 && (
            <button class="danger" onClick={() => handleDelete(contextMenu.id)}>
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
