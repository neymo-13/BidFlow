"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { Loader2, ShieldAlert } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRequireAuth } from "@/lib/hooks/use-auth";

// =====================================================
// Client-side guard for pages that need a logged-in user
// (UX only — the backend still enforces auth on every request)
// =====================================================
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isInitialized } = useRequireAuth();

  if (!isInitialized || !user) {
    return <GuardSpinner />;
  }

  return <>{children}</>;
}

// =====================================================
// Guard for /admin pages: not logged in → /login?redirect=…,
// logged in without role ADMIN → a notice instead of the page.
// UX only — every /api/admin/** request is checked against the role in the database
// =====================================================
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isInitialized } = useRequireAuth();

  if (!isInitialized || !user) {
    return <GuardSpinner />;
  }

  if (user.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
            <ShieldAlert className="h-10 w-10 text-red-500" />
            <p className="font-medium text-slate-900">You don&apos;t have access to this page</p>
            <p className="text-sm text-slate-500">This area is only for administrators.</p>
            <Link href="/" className={buttonVariants({ size: "sm", className: "mt-2" })}>
              Back to home
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

function GuardSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );
}
