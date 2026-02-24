import { useTable } from "../context";

export function Pagination() {
  const { state, setPage, setLimit } = useTable();
  const totalPages = Math.max(1, Math.ceil(state.total / state.limit));

  return (
    <div class="pagination">
      <div>{state.total} total rows</div>
      <div class="pagination-controls">
        <label>Rows:</label>
        <select
          value={state.limit}
          onChange={(e) => setLimit(parseInt((e.target as HTMLSelectElement).value, 10))}
          aria-label="Rows per page"
        >
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
        <button
          class="btn btn-sm"
          disabled={state.page <= 1}
          onClick={() => setPage(state.page - 1)}
          aria-label="Previous page"
        >
          Prev
        </button>
        <span>
          Page {state.page} of {totalPages}
        </span>
        <button
          class="btn btn-sm"
          disabled={state.page >= totalPages}
          onClick={() => setPage(state.page + 1)}
          aria-label="Next page"
        >
          Next
        </button>
      </div>
    </div>
  );
}
