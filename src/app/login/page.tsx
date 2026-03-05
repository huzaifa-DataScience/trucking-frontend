"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { login } from "@/lib/api/endpoints/auth";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, loginSuccess } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in. Login only succeeds for active users (FRONTEND_AUTH.md).
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

  if (authLoading || user) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-100 px-4 dark:bg-stone-950">
      <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-8 shadow-lg dark:border-stone-700 dark:bg-stone-900">
        <h1 className="text-center text-xl font-semibold text-stone-900 dark:text-stone-100">
          Construction Logistics
        </h1>
        <p className="mt-1 text-center text-sm text-stone-500 dark:text-stone-400">
          Sign in to your account
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-amber-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50 dark:bg-amber-600 dark:hover:bg-amber-700"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-stone-500 dark:text-stone-400">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-amber-600 hover:underline dark:text-amber-400">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
