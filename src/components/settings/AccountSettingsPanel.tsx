"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import {
  AvatarCircle,
  clearAvatarLocalPreview,
  invalidateAvatarCache,
  setAvatarLocalPreview,
} from "@/components/ui/AvatarCircle";
import { useAuth } from "@/contexts/AuthContext";
import * as authApi from "@/lib/api/endpoints/auth";
import { roleLabel } from "@/lib/auth/roles";
import { PASSWORD_MIN_LENGTH, passwordPolicyError } from "@/lib/auth/password-policy";

function canSeeMyTeamLink(role: string | undefined): boolean {
  return (
    role === "captain" ||
    role === "assistant_estimator" ||
    role === "bid_clerk" ||
    role === "user"
  );
}

/** Photo, name, and password — used on Account and Admin → Settings → Profile. */
export function AccountSettingsPanel() {
  const { user, refreshUser, setUser, loginSuccess } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState(false);

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

  const handlePickPhoto = useCallback(() => {
    setPhotoError(null);
    fileInputRef.current?.click();
  }, []);

  const handlePhotoSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      setPhotoBusy(true);
      setPhotoError(null);
      try {
        if (user?.id) setAvatarLocalPreview(user.id, file);
        const updated = await authApi.uploadAvatar(file);
        invalidateAvatarCache();
        setUser(updated);
      } catch (err) {
        clearAvatarLocalPreview();
        setPhotoError(err instanceof Error ? err.message : "Couldn't upload photo.");
      } finally {
        setPhotoBusy(false);
      }
    },
    [setUser, user?.id]
  );

  const handleRemovePhoto = useCallback(async () => {
    if (!window.confirm("Remove your profile photo?")) return;
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      const updated = await authApi.deleteAvatar();
      clearAvatarLocalPreview();
      invalidateAvatarCache();
      setUser({ ...updated, avatarUrl: null });
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Couldn't remove photo.");
    } finally {
      setPhotoBusy(false);
    }
  }, [setUser]);

  const handleChangePassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setPasswordError(null);
      setPasswordSuccess(false);

      const pwError = passwordPolicyError(newPassword);
      if (pwError) {
        setPasswordError(`${pwError}.`);
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordError("New password and confirmation don't match.");
        return;
      }

      setPasswordBusy(true);
      try {
        const session = await authApi.changePassword(currentPassword, newPassword);
        // Other devices are now signed out; this one switches to the fresh session.
        if (session) loginSuccess(session);
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
    [currentPassword, newPassword, confirmPassword, loginSuccess]
  );

  // Sign out of other devices: two clicks (confirm), then this device moves to a fresh session.
  const [signOutConfirm, setSignOutConfirm] = useState(false);
  const [signOutBusy, setSignOutBusy] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [signOutDone, setSignOutDone] = useState(false);
  const handleSignOutOthers = useCallback(async () => {
    setSignOutBusy(true);
    setSignOutError(null);
    try {
      const session = await authApi.signOutOtherDevices();
      loginSuccess(session);
      setSignOutDone(true);
      setSignOutConfirm(false);
    } catch (err) {
      setSignOutError(err instanceof Error ? err.message : "Couldn't sign out other devices.");
    } finally {
      setSignOutBusy(false);
    }
  }, [loginSuccess]);

  const canSubmitPassword =
    currentPassword.length > 0 && newPassword.length >= PASSWORD_MIN_LENGTH && confirmPassword.length >= PASSWORD_MIN_LENGTH;

  if (!user) return null;

  return (
    <div className="flex w-full flex-col gap-6">
      <Card>
        <CardHeader title="Profile photo" subtitle="Shown in the header and anywhere your name appears." />
        <div className="flex items-center gap-5">
          <AvatarCircle user={user} size="xl" />
          <div className="flex min-w-0 flex-col gap-2">
            <p className="truncate text-sm font-semibold text-ink">
              {user.displayName || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}
            </p>
            <p className="truncate text-xs text-ink/45">{user.email}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handlePickPhoto}
                disabled={photoBusy}
                className="cursor-pointer rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {photoBusy ? "Uploading…" : user.avatarUrl ? "Change photo" : "Add photo"}
              </button>
              {user.avatarUrl ? (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={photoBusy}
                  className="rounded-xl border border-ink/15 bg-surface px-3.5 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/[0.05] hover:text-ink disabled:opacity-50"
                >
                  Remove
                </button>
              ) : null}
            </div>
            {photoError ? <p className="text-xs text-danger">{photoError}</p> : null}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handlePhotoSelected}
          />
        </div>
      </Card>

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
        <CardHeader title="Change password" subtitle="You'll stay signed in here. Other devices will be signed out." />
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
              minLength={PASSWORD_MIN_LENGTH}
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
              minLength={PASSWORD_MIN_LENGTH}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="rounded-xl border border-ink/10 bg-[#f8f9fb] px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/15"
            />
          </label>

          {passwordError ? <p className="text-sm text-danger">{passwordError}</p> : null}
          {passwordSuccess ? (
            <p className="text-sm text-success">Password updated. Other devices have been signed out.</p>
          ) : null}

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

      <Card>
        <CardHeader
          title="Signed-in devices"
          subtitle="Signed in on a shared or lost device? Sign out everywhere else. You'll stay signed in here."
        />
        {signOutConfirm ? (
          <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-900">
              This signs you out on every other phone, tablet and computer. You&apos;ll need your password to sign in
              there again.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleSignOutOthers()}
                disabled={signOutBusy}
                aria-busy={signOutBusy}
                className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {signOutBusy ? "Signing out…" : "Yes, sign out other devices"}
              </button>
              <button
                type="button"
                onClick={() => setSignOutConfirm(false)}
                disabled={signOutBusy}
                className="rounded-xl border border-ink/15 bg-surface px-4 py-2.5 text-sm font-medium text-ink/70 transition hover:bg-ink/[0.05] hover:text-ink disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => {
                setSignOutDone(false);
                setSignOutConfirm(true);
              }}
              className="rounded-xl border border-ink/15 bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-ink/[0.05]"
            >
              Sign out of other devices
            </button>
          </div>
        )}
        {signOutError ? <p className="mt-2 text-sm text-danger">{signOutError}</p> : null}
        {signOutDone ? (
          <p className="mt-2 text-sm text-success">Signed out of all other devices. You&apos;re still signed in here.</p>
        ) : null}
      </Card>
    </div>
  );
}
