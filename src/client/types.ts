export interface TableDef {
  id: string;
  name: string;
  position: number;
  column_count?: number;
  row_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ColumnDef {
  id: string;
  table_id: string;
  name: string;
  type: "text" | "number";
  position: number;
  created_at: string;
  updated_at: string;
}

export interface RowData {
  id: number;
  table_id: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TableState {
  rows: RowData[];
  total: number;
  page: number;
  limit: number;
  sort: string;
  order: "asc" | "desc";
  filters: Record<string, string>;
}
