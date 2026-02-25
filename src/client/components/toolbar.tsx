import { Plus, Download } from "lucide-preact";
import { useTable } from "../context";

interface ToolbarProps {
  onAddRow: () => void;
}

export function Toolbar({ onAddRow }: ToolbarProps) {
  const { tables, activeTableId } = useTable();
  const activeTable = tables.find((t) => t.id === activeTableId);
  const tableName = activeTable?.name || "Table";

  return (
    <div class="toolbar">
      <h1>{tableName}</h1>
      <div class="toolbar-actions">
        {activeTableId && (
          <a href={`/api/tables/${activeTableId}/export/csv`} class="btn" aria-label="Export CSV">
            <Download size={14} /> Export CSV
          </a>
        )}
        <button class="btn btn-primary" onClick={onAddRow} aria-label="Add new row">
          <Plus size={14} /> Add Row
        </button>
      </div>
    </div>
  );
}
