import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type { TableDef, ColumnDef, RowData, TableState } from "./types";

export interface TableContextValue {
  // Multi-table
  tables: TableDef[];
  activeTableId: string | null;
  setActiveTable: (id: string) => void;
  createTable: (name: string, columns?: { name: string; type: string }[]) => Promise<void>;
  renameTable: (id: string, name: string) => Promise<void>;
  deleteTable: (id: string) => Promise<void>;

  // Columns
  columns: ColumnDef[];
  addColumn: (name: string, type: string) => Promise<void>;
  renameColumn: (id: string, name: string) => Promise<void>;
  updateColumnType: (id: string, type: string) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;
  reorderColumns: (ids: string[]) => Promise<void>;

  // Rows
  state: TableState;
  isAgent: boolean;
  loading: boolean;
  error: string | null;
  setError: (msg: string | null) => void;
  refresh: () => Promise<void>;
  setSort: (col: string) => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setFilter: (col: string, value: string) => void;
  addRow: (data: Record<string, unknown>) => Promise<void>;
  updateRow: (id: number, data: Record<string, unknown>) => Promise<void>;
  deleteRow: (id: number) => Promise<void>;
}

export const TableContext = createContext<TableContextValue>(null!);

export function useTable() {
  return useContext(TableContext);
}
