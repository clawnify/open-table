import { useState, useRef, useCallback } from "preact/hooks";
import { useTable } from "../context";
import { COLUMNS } from "../types";

export function TableHeader() {
  const { state, setSort, setFilter } = useTable();
  const timerRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const handleFilter = useCallback(
    (col: string, value: string) => {
      setFilterValues((prev) => ({ ...prev, [col]: value }));
      if (timerRefs.current[col]) clearTimeout(timerRefs.current[col]);
      timerRefs.current[col] = setTimeout(() => {
        setFilter(col, value);
      }, 300);
    },
    [setFilter],
  );

  return (
    <thead>
      <tr>
        <th style={{ width: "50px" }}>#</th>
        {COLUMNS.map((col) => (
          <th
            key={col.key}
            class="sortable"
            onClick={() => setSort(col.key)}
            aria-label={`Sort by ${col.label}`}
          >
            {col.label}
            {state.sort === col.key && (
              <span class="sort-icon">{state.order === "asc" ? "△" : "▼"}</span>
            )}
          </th>
        ))}
        <th style={{ width: "100px" }}>Actions</th>
      </tr>
      <tr class="filter-row">
        <td />
        {COLUMNS.map((col) => (
          <td key={col.key}>
            {col.type !== "readonly" && (
              <input
                class="filter-input"
                type="text"
                placeholder={`Filter ${col.label.toLowerCase()}...`}
                value={filterValues[col.key] || ""}
                onInput={(e) => handleFilter(col.key, (e.target as HTMLInputElement).value)}
                aria-label={`Filter by ${col.label}`}
              />
            )}
          </td>
        ))}
        <td />
      </tr>
    </thead>
  );
}
