import { useState, useRef, useEffect } from "preact/hooks";
import { useTable } from "../context";
import { COLUMNS } from "../types";
import type { Row } from "../types";

interface AddRowFormProps {
  onClose: () => void;
}

export function AddRowForm({ onClose }: AddRowFormProps) {
  const { addRow, setError } = useTable();
  const [values, setValues] = useState<Record<string, string>>({});
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (firstInputRef.current) firstInputRef.current.focus();
  }, []);

  const handleSave = () => {
    const body: Record<string, unknown> = {};
    for (const col of COLUMNS) {
      if (col.type === "readonly") continue;
      const val = values[col.key] || "";
      body[col.key] = col.type === "number" ? parseFloat(val) || 0 : val;
    }
    if (!body.name || !String(body.name).trim()) {
      setError("Name is required");
      return;
    }
    addRow(body as Partial<Row>)
      .then(() => onClose())
      .catch((err) => setError((err as Error).message));
  };

  const editableCols = COLUMNS.filter((c) => c.type !== "readonly");

  return (
    <tr class="add-row-form">
      <td />
      {COLUMNS.map((col, i) => {
        if (col.type === "readonly") return <td key={col.key} />;
        const isFirst = col.key === editableCols[0]?.key;
        return (
          <td key={col.key}>
            <label for={`new-${col.key}`}>{col.label}</label>
            <input
              ref={isFirst ? firstInputRef : undefined}
              id={`new-${col.key}`}
              class="cell-input"
              type={col.type === "number" ? "number" : "text"}
              placeholder={col.label}
              value={values[col.key] || ""}
              onInput={(e) =>
                setValues((prev) => ({
                  ...prev,
                  [col.key]: (e.target as HTMLInputElement).value,
                }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") onClose();
              }}
              aria-label={`New ${col.label}`}
            />
          </td>
        );
      })}
      <td>
        <div class="actions-cell">
          <button class="btn btn-primary btn-sm" onClick={handleSave} aria-label="Save new row">
            Save
          </button>
          <button class="btn btn-sm" onClick={onClose} aria-label="Cancel">
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}
