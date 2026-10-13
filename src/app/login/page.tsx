"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { login } from "@/lib/api/endpoints/auth";
import { homePathForRole } from "@/lib/auth/roles";
import { AppLogo } from "@/components/ui/AppLogo";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthCard, AuthError, AuthField, AuthSubmit } from "@/components/auth/AuthForm";

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
    else router.replace(homePathForRole(user.role));
  }, [user, authLoading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login({ email, password });
      loginSuccess(data);
      // Login only succeeds for active users; pending users get 401 with backend message.
      router.push(homePathForRole(data.user.role));
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
    <AuthShell>
      <AuthCard title="Sign in" subtitle="Use your work email and password.">
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
          {error ? (
            <AuthError title={error}>
              {/invalid|incorrect|wrong|password|credential/i.test(error)
                ? "Check your email and password and try again."
                : null}
            </AuthError>
          ) : null}
          <AuthField
            id="email"
            label="Work email"
            icon="mail"
            type="email"
            autoComplete="email"
            required
            placeholder="name@goelservices.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <AuthField
            id="password"
            label="Password"
            icon="lock"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="-mt-1.5 flex justify-end">
            <Link href="/forgot-password" className="text-[15px] font-medium text-brand-secondary hover:underline">
              Forgot password?
            </Link>
          </div>
          <AuthSubmit loading={loading} label="Sign in" loadingLabel="Signing in…" />
        </form>
        <p className="mt-7 text-center text-[15px] text-[#6b7280]">
          New here?{" "}
          <Link href="/register" className="font-medium text-brand-secondary hover:underline">
            Create an account
          </Link>
        </p>
      </AuthCard>
    </AuthShell>
  );
}
