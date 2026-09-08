"use client";

import { useCallback, useRef, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { AvatarCircle } from "@/components/ui/AvatarCircle";
import { useAuth } from "@/contexts/AuthContext";
import { roleLabel } from "@/lib/auth/roles";
import { uploadAvatar, deleteAvatar, changePassword } from "@/lib/api/endpoints/auth";

export default function AccountPage() {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

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
        await uploadAvatar(file);
        await refreshUser();
      } catch (err) {
        setPhotoError(err instanceof Error ? err.message : "Couldn't upload photo.");
      } finally {
        setPhotoBusy(false);
      }
    },
    [refreshUser]
  );

  const handleRemovePhoto = useCallback(async () => {
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      await deleteAvatar();
      await refreshUser();
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Couldn't remove photo.");
    } finally {
      setPhotoBusy(false);
    }
  }, [refreshUser]);

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
        await changePassword(currentPassword, newPassword);
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

  if (!user) return null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader title="Account" subtitle="Manage your profile photo and password." />

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
                className="rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-secondary disabled:opacity-50"
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
      </Card>

      <Card>
        <CardHeader title="Change password" subtitle="You'll stay signed in on this device." />
        <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
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
          <label className="flex flex-col gap-1.5">
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
          <label className="flex flex-col gap-1.5">
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
              disabled={passwordBusy}
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-secondary disabled:opacity-50"
            >
              {passwordBusy ? "Updating…" : "Update password"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
