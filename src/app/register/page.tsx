"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { register } from "@/lib/api/endpoints/auth";
import { AppLogo } from "@/components/ui/AppLogo";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthCard, AuthError, AuthField, AuthSubmit, PasswordStrength, authHintClass } from "@/components/auth/AuthForm";
import { PASSWORD_MIN_LENGTH, PASSWORD_RULE_HINT, passwordPolicyError } from "@/lib/auth/password-policy";


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
  /** Password-rule error, shown under the password field instead of the top banner. */
  const [passwordError, setPasswordError] = useState("");
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
    const pwError = passwordPolicyError(password);
    setPasswordError(pwError ?? "");
    if (pwError) return;
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
      <AuthCard wide compact title="Create account" subtitle="Sign up with your work details. An admin approves new accounts.">
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3.5">
          {error ? <AuthError title={error} /> : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AuthField
              id="firstName"
              label="First name"
              icon="user"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <AuthField
              id="lastName"
              label="Last name"
              icon="user"
              autoComplete="family-name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AuthField
              id="phone"
              label="Phone"
              icon="phone"
              type="tel"
              autoComplete="tel"
              required
              placeholder="e.g. +15551234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <AuthField
              id="company"
              label="Company"
              note="(optional)"
              icon="company"
              autoComplete="organization"
              placeholder="GOEL, GOEL DC or DCB"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>
          <AuthField
            id="password"
            label="Password"
            icon="lock"
            type="password"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError("");
            }}
            aria-invalid={passwordError ? true : undefined}
            hint={
              <>
                <PasswordStrength password={password} />
                <p className={passwordError ? `${authHintClass} !text-[#dc2626]` : authHintClass} role={passwordError ? "alert" : undefined}>
                  {passwordError || PASSWORD_RULE_HINT}
                </p>
              </>
            }
          />
          <AuthField
            id="confirmPassword"
            label="Confirm password"
            icon="lock"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <AuthSubmit loading={loading} label="Create account" loadingLabel="Creating account…" />
        </form>
        <p className="mt-4 text-center text-[14px] text-[#6b7280]">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-secondary hover:underline">
            Sign in
          </Link>
        </p>
      </AuthCard>
    </AuthShell>
  );
}
