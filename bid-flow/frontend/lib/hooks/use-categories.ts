"use client";

import { categoryApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/use-fetch";

// Visible categories (public endpoint) — for the auction form and the /auctions filter
export function useCategories() {
  const { data, error, isLoading, reload } = useFetch(() => categoryApi.list(), []);

  return {
    categories: data ?? [],
    error,
    isLoading,
    reload,
  };
}
