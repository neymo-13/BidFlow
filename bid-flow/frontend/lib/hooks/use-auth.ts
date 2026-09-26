"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";

// =====================================================
// Auto-load user on app mount
// =====================================================
export function useAuthInit() {
  const loadUser = useAuthStore((s) => s.loadUser);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => {
    if (!isInitialized) {
      loadUser();
    }
  }, [isInitialized, loadUser]);

  return isInitialized;
}

// =====================================================
// Redirect to login if not authenticated
// =====================================================
export function useRequireAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isInitialized } = useAuthStore();

  useEffect(() => {
    if (isInitialized && !user) {
      // Save intended path → redirect after login
      const redirect = encodeURIComponent(pathname);
      router.push(`/login?redirect=${redirect}`);
    }
  }, [user, isInitialized, router, pathname]);

  return { user, isInitialized };
}

// =====================================================
// Redirect to home if already logged in (for login/register pages)
// =====================================================
export function useRedirectIfAuth() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();

  useEffect(() => {
    if (isInitialized && user) {
      router.push("/");
    }
  }, [user, isInitialized, router]);
}
