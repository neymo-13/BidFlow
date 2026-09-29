"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "@/lib/http";

interface FetchResult<T> {
  key: string;
  data: T | null;
  error: string | null;
}

// =====================================================
// Load data for a client page
// - refetches when `deps` change or `reload()` is called
// - ignores stale responses (e.g. fast page switching)
// - state is only set after the request settles, so it is safe to use
//   with the react-hooks/set-state-in-effect rule
// `deps` must be primitives (page number, id, status...)
// =====================================================
export function useFetch<T>(fetcher: () => Promise<T>, deps: ReadonlyArray<string | number | boolean | null | undefined>) {
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<FetchResult<T> | null>(null);

  // Always call the latest fetcher without re-running the effect on every render
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const key = JSON.stringify([...deps, reloadCount]);

  useEffect(() => {
    let ignore = false;

    fetcherRef.current().then(
      (data) => {
        if (!ignore) setResult({ key, data, error: null });
      },
      (err) => {
        if (!ignore) {
          setResult((prev) => ({ key, data: prev?.data ?? null, error: getErrorMessage(err) }));
        }
      }
    );

    return () => {
      ignore = true;
    };
  }, [key]);

  const reload = useCallback(() => setReloadCount((n) => n + 1), []);

  const isCurrent = result?.key === key;

  return {
    data: result?.data ?? null, // keeps previous data while the next request loads
    error: isCurrent ? result.error : null,
    isLoading: !isCurrent,
    reload,
  };
}
