"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import * as authApi from "@/lib/api/endpoints/auth";
import { roleLabel } from "@/lib/auth/roles";

function canSeeMyTeamLink(role: string | undefined): boolean {
  return (
    role === "captain" ||
    role === "assistant_estimator" ||
    role === "bid_clerk" ||
    role === "user"
  );
}

export default function AccountPage() {
  const { user, refreshUser } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState(false);

  // Resync from the loaded user once (and again if the session switches accounts),
  // but not on every refreshUser() so we don't clobber an in-progress edit.
  useEffect(() => {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const nameDirty = (user?.firstName ?? "") !== firstName || (user?.lastName ?? "") !== lastName;

  const handleSaveName = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setNameError(null);
      setNameSuccess(false);
      setNameBusy(true);
      try {
        await authApi.updateProfile({ firstName: firstName.trim(), lastName: lastName.trim() });
        await refreshUser();
        setNameSuccess(true);
      } catch (err) {
        setNameError(err instanceof Error ? err.message : "Couldn't update your name.");
      } finally {
        setNameBusy(false);
      }
    },
    [firstName, lastName, refreshUser]
  );

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleChangePassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setPasswordError(null);
      setPasswordSuccess(false);

      if (newPassword.length < 6) {
        setPasswordError("New password must be at least 6 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordError("New password and confirmation don't match.");
        return;
      }

      setPasswordBusy(true);
      try {
        await authApi.changePassword(currentPassword, newPassword);
        setPasswordSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } catch (err) {
        setPasswordError(err instanceof Error ? err.message : "Couldn't change password.");
      } finally {
        setPasswordBusy(false);
      }
    },
    [currentPassword, newPassword, confirmPassword]
  );

  const canSubmitPassword =
    currentPassword.length > 0 && newPassword.length >= 6 && confirmPassword.length >= 6;

  if (!user) return null;

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader title="Account" subtitle="Manage your name and password." />

      <Card>
        <CardHeader title="Your name" subtitle="Shown in the header and anywhere your name appears." />
        <form onSubmit={handleSaveName} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink/55">First name</span>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              maxLength={200}
              className="w-48 rounded-xl border border-ink/10 bg-[#f8f9fb] px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/15"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink/55">Last name</span>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              maxLength={200}
              className="w-48 rounded-xl border border-ink/10 bg-[#f8f9fb] px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/15"
            />
          </label>
          <button
            type="submit"
            disabled={nameBusy || !nameDirty}
            className="cursor-pointer rounded-xl bg-brand px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {nameBusy ? "Saving…" : "Save name"}
          </button>
        </form>
        {nameError ? <p className="mt-2 text-xs text-danger">{nameError}</p> : null}
        {nameSuccess && !nameDirty ? <p className="mt-2 text-xs text-success">Name updated.</p> : null}
      </Card>

      <Card>
        <CardHeader title="Account details" />
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-ink/40">Email</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-ink/40">Role</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">{roleLabel(user.role)}</dd>
          </div>
        </dl>
        {canSeeMyTeamLink(user.role) ? (
          <p className="mt-4 border-t border-ink/[0.06] pt-4 text-sm text-ink/70">
            Estimating crew is managed under Settings.{" "}
            <Link
              href="/settings/my-team"
              className="font-semibold text-brand hover:underline"
            >
              Open My team →
            </Link>
          </p>
        ) : null}
      </Card>

      <Card>
        <CardHeader title="Change password" subtitle="You'll stay signed in on this device." />
        <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
          <label className="flex max-w-md flex-col gap-1.5">
            <span className="text-xs font-medium text-ink/55">Current password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="rounded-xl border border-ink/10 bg-[#f8f9fb] px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/15"
            />
          </label>
          <label className="flex max-w-md flex-col gap-1.5">
            <span className="text-xs font-medium text-ink/55">New password</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="rounded-xl border border-ink/10 bg-[#f8f9fb] px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/15"
            />
          </label>
          <label className="flex max-w-md flex-col gap-1.5">
            <span className="text-xs font-medium text-ink/55">Confirm new password</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="rounded-xl border border-ink/10 bg-[#f8f9fb] px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/15"
            />
          </label>

          {passwordError ? <p className="text-sm text-danger">{passwordError}</p> : null}
          {passwordSuccess ? <p className="text-sm text-success">Password updated.</p> : null}

          <div>
            <button
              type="submit"
              disabled={passwordBusy || !canSubmitPassword}
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {passwordBusy ? "Updating…" : "Update password"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
