import { useEffect } from "preact/hooks";
import { useTable } from "../context";

export function ErrorBanner() {
  const { error, setError } = useTable();

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error, setError]);

  if (!error) return null;

  return <div class="error-msg" role="alert">{error}</div>;
}
