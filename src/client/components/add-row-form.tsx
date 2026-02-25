import { useState, useRef, useEffect } from "preact/hooks";
import { useTable } from "../context";

interface AddRowFormProps {
  onClose: () => void;
}

export function AddRowForm({ onClose }: AddRowFormProps) {
  const { columns, addRow, setError } = useTable();
  const [values, setValues] = useState<Record<string, string>>({});
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (firstInputRef.current) firstInputRef.current.focus();
  }, []);

  const handleSave = () => {
    const data: Record<string, unknown> = {};
    for (const col of columns) {
      const val = values[col.id] || "";
      data[col.id] = col.type === "number" ? parseFloat(val) || 0 : val;
    }
    addRow(data)
      .then(() => onClose())
      .catch((err) => setError((err as Error).message));
  };

  return (
    <tr class="add-row-form">
      <td />
      {columns.map((col, i) => (
        <td key={col.id}>
          <label for={`new-${col.id}`}>{col.name}</label>
          <input
            ref={i === 0 ? firstInputRef : undefined}
            id={`new-${col.id}`}
            class="cell-input"
            type={col.type === "number" ? "number" : "text"}
            placeholder={col.name}
            value={values[col.id] || ""}
            onInput={(e) =>
              setValues((prev) => ({
                ...prev,
                [col.id]: (e.target as HTMLInputElement).value,
              }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") onClose();
            }}
            aria-label={`New ${col.name}`}
          />
        </td>
      ))}
      <td /> {/* add-col spacer */}
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
