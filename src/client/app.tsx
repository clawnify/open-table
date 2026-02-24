import { useEffect, useMemo } from "preact/hooks";
import { TableContext } from "./context";
import { useTableState } from "./hooks/use-table";
import { DataTable } from "./components/data-table";

export function App() {
  const isAgent = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has("agent") || params.get("mode") === "agent";
  }, []);

  useEffect(() => {
    if (isAgent) {
      document.documentElement.setAttribute("data-agent", "");
    }
  }, [isAgent]);

  const tableState = useTableState(isAgent);

  return (
    <TableContext.Provider value={tableState}>
      <DataTable />
    </TableContext.Provider>
  );
}
