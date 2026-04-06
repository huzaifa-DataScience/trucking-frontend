"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LogoLoader } from "@/components/ui/LogoLoader";

/**
 * Redirects to dashboard if not admin. Use in admin routes.
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "admin") {
      router.replace("/job");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface dark:bg-ink">
        <LogoLoader size={48} />
        <p className="text-sm text-ink/50 dark:text-white/50">Loading…</p>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  return <>{children}</>;
}
