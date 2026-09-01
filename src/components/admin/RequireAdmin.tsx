"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminPanelRole } from "@/lib/auth/roles";
import { LogoLoader } from "@/components/ui/LogoLoader";

/**
 * Redirects to dashboard if not admin / super_admin. Use in admin routes.
 * FRONTEND_RBAC.md — do not require admin:rbac for the whole admin app.
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const allowed = isAdminPanelRole(user?.role);

  useEffect(() => {
    if (loading) return;
    if (!user || !allowed) {
      router.replace("/job");
    }
  }, [user, loading, allowed, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface dark:bg-ink">
        <LogoLoader size={48} />
        <p className="text-sm text-ink/50 dark:text-white/50">Loading…</p>
      </div>
    );
  }

  if (!user || !allowed) {
    return null;
  }

  return <>{children}</>;
}
