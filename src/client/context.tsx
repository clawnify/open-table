import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type { Row, TableState } from "./types";

export interface TableContextValue {
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
  addRow: (row: Partial<Row>) => Promise<void>;
  updateRow: (id: number, fields: Partial<Row>) => Promise<void>;
  deleteRow: (id: number) => Promise<void>;
}

export const TableContext = createContext<TableContextValue>(null!);

export function useTable() {
  return useContext(TableContext);
}
