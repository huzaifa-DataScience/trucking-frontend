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
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-100 px-4 dark:bg-stone-950">
      <div className="w-full max-w-md rounded-xl border border-brand/30 bg-brand/5 p-8 text-center dark:border-brand/40 dark:bg-brand/10">
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
          Account pending approval
        </h1>
        <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
          Your account has been created. An administrator must approve your account before you can
          access the dashboard.
        </p>
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-500">
          You will be able to sign in and use the app once your account is approved.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
          >
            Log out
          </button>
          <Link
            href="/login"
            className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-secondary dark:bg-brand dark:hover:bg-brand-secondary"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
