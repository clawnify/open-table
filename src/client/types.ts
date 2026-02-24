export interface Row {
  id: number;
  name: string;
  status: string;
  category: string;
  value: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Column {
  key: keyof Row;
  label: string;
  type: "text" | "number" | "readonly";
}

export const COLUMNS: Column[] = [
  { key: "name", label: "Name", type: "text" },
  { key: "status", label: "Status", type: "text" },
  { key: "category", label: "Category", type: "text" },
  { key: "value", label: "Value", type: "number" },
  { key: "notes", label: "Notes", type: "text" },
  { key: "created_at", label: "Created", type: "readonly" },
  { key: "updated_at", label: "Updated", type: "readonly" },
];

export interface TableState {
  rows: Row[];
  total: number;
  page: number;
  limit: number;
  sort: string;
  order: "asc" | "desc";
  filters: Record<string, string>;
}
