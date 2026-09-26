"use client";

import { ReactNode } from "react";
import { Gavel } from "lucide-react";
import { useAuthInit } from "@/lib/hooks/use-auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const isInitialized = useAuthInit();

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <Gavel className="h-5 w-5" />
          </div>

          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />

          <p className="text-sm text-slate-500">Loading BidFlow...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
