"use client";

import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useRequireAuth } from "@/lib/hooks/use-auth";

// =====================================================
// Client-side guard for pages that need a logged-in user
// (UX only — the backend still enforces auth on every request)
// =====================================================
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isInitialized } = useRequireAuth();

  if (!isInitialized || !user) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return <>{children}</>;
}
