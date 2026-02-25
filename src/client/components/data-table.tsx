import { useState } from "preact/hooks";
import { useTable } from "../context";
import { TableTabs } from "./table-tabs";
import { Toolbar } from "./toolbar";
import { TableHeader } from "./table-header";
import { TableRow } from "./table-row";
import { AddRowForm } from "./add-row-form";
import { Pagination } from "./pagination";
import { ErrorBanner } from "./error-banner";

export function DataTable() {
  const { columns, state, loading } = useTable();
  const [adding, setAdding] = useState(false);

  // +3 for: # column, add-col column, actions column
  const totalCols = columns.length + 3;

  return (
    <div class="container">
      <TableTabs />
      <Toolbar onAddRow={() => setAdding(true)} />
      <ErrorBanner />
      <div class="card">
        <div class="table-wrap">
          <table>
            <TableHeader />
            <tbody>
              {adding && <AddRowForm onClose={() => setAdding(false)} />}
              {loading && state.rows.length === 0 ? (
                <tr>
                  <td colSpan={totalCols} class="loading-text">Loading...</td>
                </tr>
              ) : state.rows.length === 0 ? (
                <tr>
                  <td colSpan={totalCols} class="empty-text">No rows yet. Add one to get started.</td>
                </tr>
              ) : (
                state.rows.map((row) => <TableRow key={row.id} row={row} />)
              )}
            </tbody>
          </table>
        </div>
        <Pagination />
      </div>
    </div>
  );
}
