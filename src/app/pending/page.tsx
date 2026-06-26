"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LogoLoader } from "@/components/ui/LogoLoader";

export default function PendingApprovalPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.status === "active") {
      router.replace("/job");
    }
  }, [user, loading, router]);

  if (loading || !user || user.status === "active") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface dark:bg-ink">
        <LogoLoader size={48} />
        <p className="text-sm text-ink/50 dark:text-white/50">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4">
      <div className="ui-shadow-raised ui-animate-in w-full max-w-md rounded-2xl border border-ink/[0.06] bg-surface p-8 text-center">
        <span
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand"
          aria-hidden
        >
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h1 className="mt-4 text-xl font-semibold text-ink">You&apos;re almost in</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink/60">
          Your account{user.email ? ` (${user.email})` : ""} has been created and is waiting for an
          administrator to approve it. This usually doesn&apos;t take long.
        </p>
        <p className="mt-2 text-sm text-ink/45">
          Once approved, just sign in again and you&apos;ll have full access.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-xl border border-ink/15 bg-surface px-4 py-2.5 text-sm font-semibold text-ink/70 transition hover:bg-ink/[0.04]"
          >
            Log out
          </button>
          <Link
            href="/login"
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-secondary"
          >
            Back to sign in
          </Link>
        </div>
      </div>
      <p className="mt-6 text-xs text-ink/40">
        Need it sooner? Contact your administrator.
      </p>
    </div>
  );
}
