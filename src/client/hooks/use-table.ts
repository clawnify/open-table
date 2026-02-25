import { useState, useCallback, useEffect, useRef } from "preact/hooks";
import { api } from "../api";
import type { TableDef, ColumnDef, RowData, TableState } from "../types";
import type { TableContextValue } from "../context";

export function useTableState(isAgent: boolean): TableContextValue {
  const [tables, setTables] = useState<TableDef[]>([]);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColumnDef[]>([]);
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
  const activeTableRef = useRef(activeTableId);
  activeTableRef.current = activeTableId;

  // ── Fetch tables on mount ──
  const fetchTables = useCallback(async () => {
    const data = await api<{ tables: TableDef[] }>("GET", "/api/tables");
    setTables(data.tables);
    return data.tables;
  }, []);

  // ── Fetch columns for active table ──
  const fetchColumns = useCallback(async (tid: string) => {
    const data = await api<{ columns: ColumnDef[] }>("GET", `/api/tables/${tid}/columns`);
    setColumns(data.columns);
  }, []);

  // ── Fetch rows ──
  const fetchRows = useCallback(async (tid: string, s: TableState) => {
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
      const data = await api<{ rows: RowData[]; total: number }>(
        "GET",
        `/api/tables/${tid}/rows?${params}`,
      );
      setState((prev) => ({ ...prev, rows: data.rows, total: data.total }));
    } catch (err) {
      setError("Failed to load data: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    const tid = activeTableRef.current;
    if (tid) await fetchRows(tid, stateRef.current);
  }, [fetchRows]);

  // ── Init: load tables, set active, load columns + rows ──
  useEffect(() => {
    fetchTables().then((tbls) => {
      if (tbls.length > 0 && !activeTableRef.current) {
        setActiveTableId(tbls[0].id);
      }
    }).catch((err) => setError((err as Error).message));
  }, [fetchTables]);

  // When active table changes, reset state and fetch columns + rows
  useEffect(() => {
    if (!activeTableId) return;
    const resetState: TableState = { rows: [], total: 0, page: 1, limit: 25, sort: "id", order: "desc", filters: {} };
    setState(resetState);
    fetchColumns(activeTableId).catch((err) => setError((err as Error).message));
    fetchRows(activeTableId, resetState).catch((err) => setError((err as Error).message));
  }, [activeTableId, fetchColumns, fetchRows]);

  // Re-fetch rows when pagination/sort/filter changes (but not on initial activeTable change)
  const prevActiveRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeTableId) return;
    // Skip if this is the initial load for this table (handled above)
    if (prevActiveRef.current !== activeTableId) {
      prevActiveRef.current = activeTableId;
      return;
    }
    fetchRows(activeTableId, state);
  }, [state.page, state.limit, state.sort, state.order, state.filters, activeTableId, fetchRows]);

  // ── Table CRUD ──
  const setActiveTable = useCallback((id: string) => {
    setActiveTableId(id);
  }, []);

  const createTable = useCallback(async (name: string, cols?: { name: string; type: string }[]) => {
    await api("POST", "/api/tables", { name, columns: cols });
    const tbls = await fetchTables();
    // Switch to the new table (last one by position)
    const newest = tbls[tbls.length - 1];
    if (newest) setActiveTableId(newest.id);
  }, [fetchTables]);

  const renameTable = useCallback(async (id: string, name: string) => {
    await api("PUT", `/api/tables/${id}`, { name });
    await fetchTables();
  }, [fetchTables]);

  const deleteTable = useCallback(async (id: string) => {
    await api("DELETE", `/api/tables/${id}`);
    const tbls = await fetchTables();
    if (activeTableRef.current === id && tbls.length > 0) {
      setActiveTableId(tbls[0].id);
    }
  }, [fetchTables]);

  // ── Column CRUD ──
  const addColumn = useCallback(async (name: string, type: string) => {
    const tid = activeTableRef.current;
    if (!tid) return;
    await api("POST", `/api/tables/${tid}/columns`, { name, type });
    await fetchColumns(tid);
  }, [fetchColumns]);

  const renameColumn = useCallback(async (id: string, name: string) => {
    const tid = activeTableRef.current;
    if (!tid) return;
    await api("PUT", `/api/tables/${tid}/columns/${id}`, { name });
    await fetchColumns(tid);
  }, [fetchColumns]);

  const updateColumnType = useCallback(async (id: string, type: string) => {
    const tid = activeTableRef.current;
    if (!tid) return;
    await api("PUT", `/api/tables/${tid}/columns/${id}`, { type });
    await fetchColumns(tid);
  }, [fetchColumns]);

  const deleteColumn = useCallback(async (id: string) => {
    const tid = activeTableRef.current;
    if (!tid) return;
    await api("DELETE", `/api/tables/${tid}/columns/${id}`);
    await fetchColumns(tid);
    await refresh();
  }, [fetchColumns, refresh]);

  const reorderColumns = useCallback(async (ids: string[]) => {
    const tid = activeTableRef.current;
    if (!tid) return;
    await api("PUT", `/api/tables/${tid}/columns/reorder`, { ids });
    await fetchColumns(tid);
  }, [fetchColumns]);

  // ── Row state helpers ──
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

  const addRow = useCallback(async (data: Record<string, unknown>) => {
    const tid = activeTableRef.current;
    if (!tid) return;
    await api("POST", `/api/tables/${tid}/rows`, { data });
    await refresh();
  }, [refresh]);

  const updateRow = useCallback(async (id: number, data: Record<string, unknown>) => {
    const tid = activeTableRef.current;
    if (!tid) return;
    await api("PUT", `/api/tables/${tid}/rows/${id}`, { data });
    await refresh();
  }, [refresh]);

  const deleteRow = useCallback(async (id: number) => {
    const tid = activeTableRef.current;
    if (!tid) return;
    await api("DELETE", `/api/tables/${tid}/rows/${id}`);
    await refresh();
  }, [refresh]);

  return {
    tables, activeTableId, setActiveTable, createTable, renameTable, deleteTable,
    columns, addColumn, renameColumn, updateColumnType, deleteColumn, reorderColumns,
    state, isAgent, loading, error, setError, refresh,
    setSort, setPage, setLimit, setFilter,
    addRow, updateRow, deleteRow,
  };
}
