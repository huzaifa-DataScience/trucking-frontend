"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

function AppShellSkeleton() {
  return (
    <div className="flex min-h-dvh w-full overflow-hidden bg-canvas" role="status" aria-label="Loading">
      {/* Sidebar */}
      <div className="hidden h-dvh w-64 shrink-0 flex-col gap-6 bg-[#0a0a0c] p-3 sm:flex">
        <div className="h-8 w-8 animate-pulse rounded-lg bg-white/10" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-8 animate-pulse rounded-lg bg-white/[0.06]" />
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-ink/[0.06] bg-surface px-4 sm:px-6">
          <div className="h-9 w-40 animate-pulse rounded-xl bg-ink/[0.06]" />
          <div className="h-9 w-9 animate-pulse rounded-full bg-ink/[0.06]" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-4 sm:p-6 lg:p-8">
          <div className="mb-6 h-7 w-48 animate-pulse rounded bg-ink/[0.06]" />
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl border border-ink/[0.06] bg-ink/[0.03]" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-2xl border border-ink/[0.06] bg-ink/[0.03]" />
        </div>
      </div>
    </div>
  );
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return <AppShellSkeleton />;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
