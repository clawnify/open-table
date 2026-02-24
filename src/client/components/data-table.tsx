import { useState } from "preact/hooks";
import { useTable } from "../context";
import { Toolbar } from "./toolbar";
import { TableHeader } from "./table-header";
import { TableRow } from "./table-row";
import { AddRowForm } from "./add-row-form";
import { Pagination } from "./pagination";
import { ErrorBanner } from "./error-banner";

export function DataTable() {
  const { state, loading } = useTable();
  const [adding, setAdding] = useState(false);

  return (
    <div class="container">
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
                  <td colSpan={9} class="loading-text">Loading...</td>
                </tr>
              ) : state.rows.length === 0 ? (
                <tr>
                  <td colSpan={9} class="empty-text">No items found. Add one to get started.</td>
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
