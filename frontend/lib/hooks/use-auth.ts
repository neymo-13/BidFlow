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
// Redirect away if already logged in (for login/register pages)
// target must match where the page's submit handler navigates,
// otherwise the two navigations race after login
// =====================================================
export function useRedirectIfAuth(target = "/") {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();

  useEffect(() => {
    if (isInitialized && user) {
      router.push(target);
    }
  }, [user, isInitialized, router, target]);
}
