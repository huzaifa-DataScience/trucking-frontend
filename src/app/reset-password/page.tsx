"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { resetPassword } from "@/lib/api/endpoints/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import {
  AuthCard,
  AuthError,
  AuthField,
  AuthSubmit,
  PasswordStrength,
  authHintClass,
} from "@/components/auth/AuthForm";

/** Step 2 of password reset: the emailed link opens this page with ?token=…; set the new password. */
function ResetPasswordForm() {
  const token = (useSearchParams().get("token") ?? "").trim();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password, confirmPassword);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't change the password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Opened without a token (e.g. typed the address): nothing to reset.
  if (!token) {
    return (
      <AuthCard title="This link isn't complete">
        <p className="mt-2 text-[14px] text-[#6b7280]">
          Open the link from your reset email again, or ask for a new one.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-brand text-[14.5px] font-semibold text-white transition-colors hover:bg-brand-secondary"
        >
          Get a new reset link
        </Link>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard title="Password changed">
        <div className="mt-4 flex items-start gap-3 rounded-[10px] border border-green-200 bg-green-50 px-3.5 py-3 text-[13.5px] text-green-900">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-green-700"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.4}
            aria-hidden
          >
            <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p>Your password has been changed. Sign in with your new password.</p>
        </div>
        <Link
          href="/login"
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-brand text-[14.5px] font-semibold text-white transition-colors hover:bg-brand-secondary"
        >
          Go to sign in
        </Link>
      </AuthCard>
    );
  }

  const expired = /invalid|expired/i.test(error);

  return (
    <AuthCard title="Set a new password" subtitle="Choose a new password for your account.">
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        {error ? (
          <AuthError title={error}>
            {expired ? (
              <Link href="/forgot-password" className="font-medium underline">
                Get a new reset link
              </Link>
            ) : null}
          </AuthError>
        ) : null}
        <AuthField
          id="password"
          label="New password"
          icon="lock"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={
            <>
              <PasswordStrength password={password} />
              <p className={authHintClass}>At least 6 characters</p>
            </>
          }
        />
        <AuthField
          id="confirmPassword"
          label="Confirm new password"
          icon="lock"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <AuthSubmit loading={loading} label="Change password" loadingLabel="Changing…" />
      </form>
      <p className="mt-5 text-center text-[14px] text-[#6b7280]">
        <Link href="/login" className="font-medium text-brand-secondary hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      {/* useSearchParams needs a Suspense boundary in the App Router. */}
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
