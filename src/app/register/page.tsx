"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { register } from "@/lib/api/endpoints/auth";
import { AppLogo } from "@/components/ui/AppLogo";
import { AuthShell } from "@/components/auth/AuthShell";

const inputClass =
  "mt-1 w-full rounded-lg border border-ink/15 bg-surface px-3 py-2 text-ink shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-white/15 dark:bg-ink dark:text-white";
const labelClass = "block text-sm font-medium text-ink dark:text-white";

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading: authLoading, loginSuccess } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      if (user.status === "pending") router.replace("/pending");
      else router.replace("/job");
    }
  }, [user, authLoading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (confirmPassword && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!firstName.trim()) {
      setError("First name is required");
      return;
    }
    if (!lastName.trim()) {
      setError("Last name is required");
      return;
    }
    if (!phone.trim()) {
      setError("Phone is required");
      return;
    }
    setLoading(true);
    try {
      const data = await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        company: company.trim() || undefined,
        password,
        confirmPassword: confirmPassword || undefined,
      });
      loginSuccess(data);
      // FRONTEND_AUTH.md: pending → show approval message; active → use app (e.g. REQUIRE_SIGNUP_APPROVAL=false).
      if (data.user.status === "pending") {
        router.push("/pending");
      } else {
        router.push("/job");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-4 dark:bg-ink">
        <div className="animate-pulse">
          <AppLogo height={56} />
        </div>
        <p className="text-sm text-ink/50 dark:text-white/50">Loading…</p>
      </div>
    );
  }

  if (user) return null;

  return (
    <AuthShell>
      <div className="ui-shadow-raised ui-animate-in w-full max-w-md rounded-2xl border border-ink/[0.06] bg-surface p-8 dark:border-white/10 dark:bg-ink">
        <h1 className="text-center text-lg font-semibold text-ink dark:text-white">Create account</h1>
        <p className="mt-1 text-center text-sm text-ink/55 dark:text-white/55">
          Sign up with your work details
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className={labelClass}>
                First name
              </label>
              <input
                id="firstName"
                type="text"
                autoComplete="given-name"
                required
                maxLength={100}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="lastName" className={labelClass}>
                Last name
              </label>
              <input
                id="lastName"
                type="text"
                autoComplete="family-name"
                required
                maxLength={100}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="phone" className={labelClass}>
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +15551234567"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="company" className={labelClass}>
              Company <span className="text-stone-400">(optional)</span>
            </label>
            <input
              id="company"
              type="text"
              autoComplete="organization"
              maxLength={255}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="password" className={labelClass}>
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
            <p className="mt-0.5 text-xs text-ink/50 dark:text-white/50">At least 6 characters</p>
          </div>
          <div>
            <label htmlFor="confirmPassword" className={labelClass}>
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand px-4 py-2.5 font-medium text-white transition-colors hover:bg-brand-secondary disabled:opacity-50 dark:bg-brand dark:hover:bg-brand-secondary"
          >
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-ink/55 dark:text-white/55">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
