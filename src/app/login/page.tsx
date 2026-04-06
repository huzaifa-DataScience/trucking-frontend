"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { login } from "@/lib/api/endpoints/auth";
import { AppLogo } from "@/components/ui/AppLogo";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, loginSuccess } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    if (user.status !== "active") router.replace("/pending");
    else router.replace("/job");
  }, [user, authLoading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login({ email, password });
      loginSuccess(data);
      // Login only succeeds for active users; pending users get 401 with backend message.
      router.push("/job");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-10 dark:bg-ink">
      <div className="mb-8 flex flex-col items-center gap-2">
        <AppLogo height={56} />
        <p className="text-center text-sm font-medium text-ink/60 dark:text-white/60">
          Construction Logistics
        </p>
      </div>
      <div className="w-full max-w-sm rounded-xl border border-ink/10 bg-surface p-8 shadow-[0_8px_30px_rgb(1,1,1,0.06)] dark:border-white/10 dark:bg-ink dark:shadow-none">
        <h1 className="text-center text-lg font-semibold text-ink dark:text-white">Sign in</h1>
        <p className="mt-1 text-center text-sm text-ink/55 dark:text-white/55">
          Use your work email and password
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink dark:text-white">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-ink/15 bg-surface px-3 py-2 text-ink shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-white/15 dark:bg-ink dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink dark:text-white">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-ink/15 bg-surface px-3 py-2 text-ink shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-white/15 dark:bg-ink dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand px-4 py-2.5 font-medium text-white transition-colors hover:bg-brand-secondary disabled:opacity-50 dark:bg-brand dark:hover:bg-brand-secondary"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-ink/55 dark:text-white/55">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-brand hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
