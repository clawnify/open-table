import { Plus, Download } from "lucide-preact";

interface ToolbarProps {
  onAddRow: () => void;
}

export function Toolbar({ onAddRow }: ToolbarProps) {
  return (
    <div class="toolbar">
      <h1>Items</h1>
      <div class="toolbar-actions">
        <a href="/api/export/csv" class="btn" aria-label="Export CSV">
          <Download size={14} /> Export CSV
        </a>
        <button class="btn btn-primary" onClick={onAddRow} aria-label="Add new row">
          <Plus size={14} /> Add Row
        </button>
      </div>
    </div>
  );
}
