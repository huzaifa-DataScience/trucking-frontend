"use client";

import Link from "next/link";
import { useState } from "react";
import { forgotPassword } from "@/lib/api/endpoints/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthCard, AuthError, AuthField, AuthSubmit } from "@/components/auth/AuthForm";

/** Step 1 of password reset: ask for the work email; the backend emails a one-time link. */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email);
      setSentTo(email.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sentTo) {
    return (
      <AuthShell>
        <AuthCard title="Check your email">
          <div className="mt-4 flex items-start gap-3 rounded-[10px] border border-green-200 bg-green-50 px-3.5 py-3 text-[13.5px] text-green-900">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-green-700"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
            <p>
              If <strong className="font-semibold">{sentTo}</strong> has an account, we&apos;ve sent it a link to reset
              the password.
            </p>
          </div>
          <ul className="mt-4 flex flex-col gap-1.5 text-[13.5px] text-[#6b7280]">
            <li>• The link works for 30 minutes and only once.</li>
            <li>• Don&apos;t see it? Check your spam or junk folder.</li>
          </ul>
          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              href="/login"
              className="inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-brand text-[14.5px] font-semibold text-white transition-colors hover:bg-brand-secondary"
            >
              Back to sign in
            </Link>
            <button
              type="button"
              onClick={() => setSentTo(null)}
              className="h-11 w-full rounded-[10px] border border-[#d1d5db] bg-white text-[14.5px] font-medium text-ink transition-colors hover:bg-[#f3f4f6]"
            >
              Use a different email
            </button>
          </div>
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthCard
        title="Forgot your password?"
        subtitle="Enter your work email and we'll send you a link to set a new one."
      >
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {error ? <AuthError title={error} /> : null}
          <AuthField
            id="email"
            label="Work email"
            icon="mail"
            type="email"
            autoComplete="email"
            required
            autoFocus
            placeholder="name@goelservices.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <AuthSubmit loading={loading} label="Send reset link" loadingLabel="Sending…" />
        </form>
        <p className="mt-5 text-center text-[14px] text-[#6b7280]">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-brand-secondary hover:underline">
            Back to sign in
          </Link>
        </p>
      </AuthCard>
    </AuthShell>
  );
}
