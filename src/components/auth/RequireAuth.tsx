"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Protects dashboard routes: requires authenticated user with status === 'active'.
 * Redirects to /login if not authenticated; to /pending if user.status is pending|inactive|rejected
 * (FRONTEND_AUTH.md § status: only active users get full access; login succeeds only for active users).
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.status !== "active") {
      router.replace("/pending");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 dark:bg-stone-950">
        <p className="text-stone-500 dark:text-stone-400">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (user.status !== "active") {
    return null;
  }

  return <>{children}</>;
}
