import { useState, useCallback, useEffect, useRef } from "preact/hooks";
import { api } from "../api";
import type { Row, TableState } from "../types";
import type { TableContextValue } from "../context";

export function useTableState(isAgent: boolean): TableContextValue {
  const [state, setState] = useState<TableState>({
    rows: [],
    total: 0,
    page: 1,
    limit: 25,
    sort: "id",
    order: "desc",
    filters: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const fetchRows = useCallback(async (s: TableState) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(s.page),
        limit: String(s.limit),
        sort: s.sort,
        order: s.order,
      });
      for (const [col, val] of Object.entries(s.filters)) {
        if (val.trim()) params.set(`filter_${col}`, val);
      }
      const data = await api<{ rows: Row[]; total: number; page: number; limit: number }>(
        "GET",
        `/api/rows?${params}`,
      );
      setState((prev) => ({ ...prev, rows: data.rows, total: data.total }));
    } catch (err) {
      setError("Failed to load data: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchRows(stateRef.current);
  }, [fetchRows]);

  useEffect(() => {
    fetchRows(state);
  }, [state.page, state.limit, state.sort, state.order, state.filters, fetchRows]);

  const setSort = useCallback((col: string) => {
    setState((prev) => ({
      ...prev,
      sort: col,
      order: prev.sort === col && prev.order === "asc" ? "desc" : "asc",
      page: 1,
    }));
  }, []);

  const setPage = useCallback((page: number) => {
    setState((prev) => ({ ...prev, page }));
  }, []);

  const setLimit = useCallback((limit: number) => {
    setState((prev) => ({ ...prev, limit, page: 1 }));
  }, []);

  const setFilter = useCallback((col: string, value: string) => {
    setState((prev) => ({
      ...prev,
      filters: { ...prev.filters, [col]: value },
      page: 1,
    }));
  }, []);

  const addRow = useCallback(async (row: Partial<Row>) => {
    await api("POST", "/api/rows", row);
    await refresh();
  }, [refresh]);

  const updateRow = useCallback(async (id: number, fields: Partial<Row>) => {
    await api("PUT", `/api/rows/${id}`, fields);
    await refresh();
  }, [refresh]);

  const deleteRow = useCallback(async (id: number) => {
    await api("DELETE", `/api/rows/${id}`);
    await refresh();
  }, [refresh]);

  return {
    state, isAgent, loading, error, setError, refresh,
    setSort, setPage, setLimit, setFilter,
    addRow, updateRow, deleteRow,
  };
}
