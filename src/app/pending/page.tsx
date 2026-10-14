"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LogoLoader } from "@/components/ui/LogoLoader";
import { AuthShell } from "@/components/auth/AuthShell";

export default function PendingApprovalPage() {
  const router = useRouter();
  const { user, loading, logout, refreshUser } = useAuth();
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  // Reload the account; if an admin has approved it, the effect below redirects into the app.
  const checkAgain = async () => {
    setChecking(true);
    try {
      await refreshUser();
    } finally {
      setChecking(false);
      setCheckedAt(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
    }
  };

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

  const steps: { label: string; detail: string; state: "done" | "now" | "next" }[] = [
    { label: "Account created", detail: user.email ?? "Your details are saved", state: "done" },
    { label: "Admin approval", detail: "An administrator checks your details", state: "now" },
    { label: "Get access", detail: "Once approved, use Check again to go straight in", state: "next" },
  ];

  return (
    <AuthShell>
      <div className="ui-animate-in w-full max-w-[580px] rounded-[22px] relative overflow-hidden border border-white bg-[linear-gradient(150deg,#e6f1fe_0%,#f6faff_38%,#fff7ef_68%,#ffe9d6_100%)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-[linear-gradient(90deg,#1e88e5,#e8893a)] before:content-[''] p-12 text-center shadow-[0_1px_2px_rgba(15,23,42,0.05),0_20px_44px_-18px_rgba(30,136,229,0.28)]">
        <span className="mx-auto mb-3.5 grid h-14 w-14 place-items-center rounded-full bg-amber-50 text-amber-800" aria-hidden>
          <svg className="h-[26px] w-[26px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h1 className="text-[32px] font-semibold leading-[1.2] text-[#333333]">You&apos;re almost in</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[#6b7280]">
          Your account{user.email ? ` (${user.email})` : ""} has been created and is waiting for an administrator to
          approve it. This usually doesn&apos;t take long.
        </p>

        <ol className="mt-5 flex flex-col text-left">
          {steps.map((s, i) => (
            <li key={s.label} className="relative grid grid-cols-[22px_minmax(0,1fr)] gap-2.5 py-2">
              {i < steps.length - 1 ? (
                <span className="absolute bottom-[-8px] left-[10px] top-7 w-0.5 bg-[var(--border-subtle)]" aria-hidden />
              ) : null}
              <span
                className={`relative z-[1] grid h-[22px] w-[22px] place-items-center rounded-full border-2 text-[11px] font-bold ${
                  s.state === "done"
                    ? "border-green-700 bg-green-700 text-white"
                    : s.state === "now"
                      ? "border-amber-600 bg-white text-amber-600"
                      : "border-[var(--border-subtle)] bg-white text-ink-soft"
                }`}
                aria-hidden
              >
                {s.state === "done" ? "✓" : i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-[14.5px] font-semibold text-[#333333]">
                  {s.label}
                  {s.state === "now" ? <span className="sr-only"> (in progress)</span> : null}
                  {s.state === "done" ? <span className="sr-only"> (done)</span> : null}
                </span>
                <span className="block truncate text-[13.5px] text-[#6b7280]">{s.detail}</span>
              </span>
            </li>
          ))}
        </ol>

        {/* "Check again" reloads the account; once approved, the effect above sends the user into the app.
            "Back to sign in" signs the pending session out first: a plain link to /login would loop,
            because the sign-in page sends signed-in pending users straight back here. */}
        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => void checkAgain()}
            disabled={checking}
            aria-busy={checking}
            className="inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-[12px] bg-brand text-[16px] font-semibold text-white transition-colors hover:bg-brand-secondary disabled:cursor-not-allowed disabled:opacity-70"
          >
            {checking ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
                Checking…
              </>
            ) : (
              "Check again"
            )}
          </button>
          <p className="min-h-[18px] text-[13px] text-[#6b7280]" role="status">
            {checkedAt ? `Still waiting for approval (checked ${checkedAt}).` : ""}
          </p>
          <button
            type="button"
            onClick={() => logout()}
            className="h-[54px] w-full rounded-[12px] border border-[#d1d5db] bg-white text-[16px] font-medium text-ink transition-colors hover:bg-[#f3f4f6]"
          >
            Back to sign in
          </button>
        </div>
        <p className="mt-4 text-[13px] text-[#6b7280]">Need it sooner? Contact your administrator.</p>
      </div>
    </AuthShell>
  );
}
