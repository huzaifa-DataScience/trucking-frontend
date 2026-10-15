"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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

/** One part of the password rule: dark until met, then green with a tick. */
function Rule({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span className={`font-medium transition-colors ${ok ? "text-success" : "text-ink"}`}>
      {ok ? "✓ " : null}
      {children}
      <span className="sr-only">{ok ? " (done)" : " (needed)"}</span>
    </span>
  );
}

type PanelSection = "all" | "profile" | "security";
/** cards: Card per block · settings: label column + fields · tabs: banner header with Profile / Security tabs. */
type PanelLayout = "cards" | "settings" | "tabs";
type ProfileTab = "profile" | "security";

/**
 * One block of the panel. `cards`: a Card per block (Account page).
 * `settings`: title on the left, controls on the right, rows inside one card (Admin → Settings).
 */
function Block({
  layout,
  title,
  subtitle,
  children,
}: {
  layout: PanelLayout;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  if (layout === "cards") {
    return (
      <Card>
        <CardHeader title={title} subtitle={subtitle} />
        {children}
      </Card>
    );
  }
  return (
    <section className="grid border-b border-[var(--border-subtle)] last:border-b-0 md:grid-cols-[220px_minmax(0,1fr)]">
      <div className="border-b border-[var(--border-subtle)] bg-[#fafbfc] px-5 py-4 md:border-b-0 md:border-r">
        <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
        {subtitle ? <p className="mt-[3px] text-[12.5px] text-ink-muted">{subtitle}</p> : null}
      </div>
      <div className="min-w-0 px-5 py-4">{children}</div>
    </section>
  );
}

/** Photo, name, and password — Account page (all sections, cards) and Admin → Settings (one section, settings layout). */
export function AccountSettingsPanel({
  section = "all",
  layout = "cards",
  company,
  hideMyTeamLink = false,
}: {
  section?: PanelSection;
  layout?: PanelLayout;
  /** Shown read-only next to email and role when given. */
  company?: string | null;
  /** The page shows its own My team link. */
  hideMyTeamLink?: boolean;
} = {}) {
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
  const [tab, setTab] = useState<ProfileTab>("profile");
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

  const showProfile = section === "all" || section === "profile";
  const showSecurity = section === "all" || section === "security";
  // tabs uses the same compact controls as the settings layout.
  const settings = layout !== "cards";
  const inputClass = settings
    ? "h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 text-[13.5px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
    : "rounded-xl border border-ink/10 bg-[#f8f9fb] px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/15";
  const primaryBtn = settings
    ? "inline-flex h-[34px] cursor-pointer items-center rounded-lg bg-brand px-3.5 text-[13px] font-medium text-white transition hover:bg-brand-secondary disabled:cursor-not-allowed disabled:opacity-45"
    : "cursor-pointer rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-secondary disabled:cursor-not-allowed disabled:opacity-50";
  const secondaryBtn = settings
    ? "inline-flex h-[34px] cursor-pointer items-center rounded-lg border border-[var(--border-subtle)] bg-white px-3.5 text-[13px] font-medium text-ink transition hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-50"
    : "cursor-pointer rounded-xl border border-ink/15 bg-surface px-4 py-2.5 text-sm font-medium text-ink/70 transition hover:bg-ink/[0.05] hover:text-ink disabled:opacity-50";
  const dangerBtn = settings
    ? "inline-flex h-[34px] cursor-pointer items-center rounded-lg border border-danger-border bg-white px-3.5 text-[13px] font-medium text-danger transition hover:bg-danger-tint disabled:cursor-not-allowed disabled:opacity-50"
    : secondaryBtn;
  const fieldLabel = settings ? "text-[12.5px] font-medium text-ink-muted" : "text-xs font-medium text-ink/55";

  const photoBlock = (
    <Block layout={layout} title={settings ? "Photo" : "Profile photo"} subtitle="Shown in the header and anywhere your name appears.">
      <div className="flex items-center gap-5">
        <AvatarCircle user={user} size={settings ? "lg" : "xl"} />
        <div className="flex min-w-0 flex-col gap-2">
          {settings ? null : (
            <>
              <p className="truncate text-sm font-semibold text-ink">
                {user.displayName || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}
              </p>
              <p className="truncate text-xs text-ink/45">{user.email}</p>
            </>
          )}
          <div className={`${settings ? "" : "mt-1 "}flex flex-wrap gap-2`}>
            <button
              type="button"
              onClick={handlePickPhoto}
              disabled={photoBusy}
              className={settings ? secondaryBtn : "cursor-pointer rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-secondary disabled:cursor-not-allowed disabled:opacity-50"}
            >
              {photoBusy ? "Uploading…" : user.avatarUrl ? (settings ? "Upload new photo" : "Change photo") : settings ? "Upload photo" : "Add photo"}
            </button>
            {user.avatarUrl ? (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={photoBusy}
                className={settings ? dangerBtn : "cursor-pointer rounded-xl border border-ink/15 bg-surface px-3.5 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/[0.05] hover:text-ink disabled:opacity-50"}
              >
                Remove
              </button>
            ) : null}
          </div>
          {settings ? <p className="text-[12px] text-ink-muted">JPG, PNG or WebP · up to 2 MB</p> : null}
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
    </Block>
  );

  const nameFields = (
    <>
      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>First name</span>
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          maxLength={200}
          className={settings ? inputClass : `w-48 ${inputClass}`}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>Last name</span>
        <input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          maxLength={200}
          className={settings ? inputClass : `w-48 ${inputClass}`}
        />
      </label>
    </>
  );

  const nameBlock = (
    <Block layout={layout} title={settings ? "Name" : "Your name"} subtitle={settings ? "How you appear to your team." : "Shown in the header and anywhere your name appears."}>
      {settings ? (
        <div className="grid gap-3 sm:grid-cols-2">{nameFields}</div>
      ) : (
        <form onSubmit={handleSaveName} className="flex flex-wrap items-end gap-3">
          {nameFields}
          <button
            type="submit"
            disabled={nameBusy || !nameDirty}
            className="cursor-pointer rounded-xl bg-brand px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {nameBusy ? "Saving…" : "Save name"}
          </button>
        </form>
      )}
      {nameError ? <p className="mt-2 text-xs text-danger">{nameError}</p> : null}
      {!settings && nameSuccess && !nameDirty ? <p className="mt-2 text-xs text-success">Name updated.</p> : null}
    </Block>
  );

  const accountBlock = (
    <Block layout={layout} title={settings ? "Account" : "Account details"} subtitle={settings ? "Set by an admin." : undefined}>
      {settings ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className={fieldLabel}>Email</span>
            <div className="flex h-9 items-center truncate rounded-lg border border-[var(--border-subtle)] bg-[#fafbfc] px-3 text-[13.5px] text-ink-muted">{user.email}</div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className={fieldLabel}>Role</span>
            <div className="flex h-9 items-center rounded-lg border border-[var(--border-subtle)] bg-[#fafbfc] px-3 text-[13.5px] text-ink-muted">{roleLabel(user.role)}</div>
          </div>
          {company !== undefined ? (
            <div className="flex flex-col gap-1.5">
              <span className={fieldLabel}>Company</span>
              <div className="flex h-9 items-center truncate rounded-lg border border-[var(--border-subtle)] bg-[#fafbfc] px-3 text-[13.5px] text-ink-muted">{company || "—"}</div>
            </div>
          ) : null}
        </div>
      ) : (
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
      )}
      {canSeeMyTeamLink(user.role) && !hideMyTeamLink ? (
        <p className="mt-4 border-t border-ink/[0.06] pt-4 text-sm text-ink/70">
          Estimating crew is managed under Settings.{" "}
          <Link href="/settings/my-team" className="font-semibold text-brand hover:underline">
            Open My team →
          </Link>
        </p>
      ) : null}
    </Block>
  );

  const passwordBlock = (
    <Block layout={layout} title="Change password" subtitle="You'll stay signed in here. Other devices will be signed out.">
      <form onSubmit={handleChangePassword} className={settings ? "grid gap-3 sm:grid-cols-3" : "flex flex-col gap-4"}>
        <label className={settings ? "flex min-w-0 flex-col gap-1.5" : "flex max-w-md flex-col gap-1.5"}>
          <span className={fieldLabel}>Current password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className={settings ? "flex min-w-0 flex-col gap-1.5" : "flex max-w-md flex-col gap-1.5"}>
          <span className={fieldLabel}>New password</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className={settings ? "flex min-w-0 flex-col gap-1.5" : "flex max-w-md flex-col gap-1.5"}>
          <span className={fieldLabel}>Confirm new password</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
          />
        </label>

        {passwordError ? <p className="text-sm text-danger sm:col-span-3">{passwordError}</p> : null}
        {passwordSuccess ? (
          <p className="text-sm text-success sm:col-span-3">Password updated. Other devices have been signed out.</p>
        ) : null}

        <div className="sm:col-span-3">
          <button type="submit" disabled={passwordBusy || !canSubmitPassword} className={primaryBtn}>
            {passwordBusy ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>
    </Block>
  );

  const devicesBlock = (
    <Block
      layout={layout}
      title="Signed-in devices"
      subtitle={
        settings
          ? "On a shared or lost device? Sign out everywhere else."
          : "Signed in on a shared or lost device? Sign out everywhere else. You'll stay signed in here."
      }
    >
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
              className={primaryBtn}
            >
              {signOutBusy ? "Signing out…" : "Yes, sign out other devices"}
            </button>
            <button type="button" onClick={() => setSignOutConfirm(false)} disabled={signOutBusy} className={secondaryBtn}>
              Cancel
            </button>
          </div>
        </div>
      ) : settings ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[var(--border-subtle)] px-3.5 py-3">
          <div>
            <p className="text-[13.5px] font-semibold text-ink">This device</p>
            <p className="text-[12px] text-ink-muted">You stay signed in here</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSignOutDone(false);
              setSignOutConfirm(true);
            }}
            className={dangerBtn}
          >
            Sign out of other devices
          </button>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => {
              setSignOutDone(false);
              setSignOutConfirm(true);
            }}
            className="cursor-pointer rounded-xl border border-ink/15 bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-ink/[0.05]"
          >
            Sign out of other devices
          </button>
        </div>
      )}
      {signOutError ? <p className="mt-2 text-sm text-danger">{signOutError}</p> : null}
      {signOutDone ? (
        <p className="mt-2 text-sm text-success">Signed out of all other devices. You&apos;re still signed in here.</p>
      ) : null}
    </Block>
  );

  if (layout === "tabs") {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.displayName || user.email;
    const tabs: { id: ProfileTab; label: string }[] = [
      { id: "profile", label: "Profile" },
      { id: "security", label: "Security" },
    ];
    const roField = (label: string, value: string) => (
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className={fieldLabel}>{label}</span>
        <div className="flex h-9 items-center truncate rounded-lg border border-[var(--border-subtle)] bg-[#fafbfc] px-3 text-[13.5px] text-ink-muted">
          {value || "—"}
        </div>
      </div>
    );

    return (
      <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        {/* Banner + identity */}
        <div className="h-[70px] bg-[linear-gradient(120deg,#e3f2fd,#f1f7fd_60%,#ffffff)]" aria-hidden />
        <div className="-mt-9 flex flex-wrap items-end gap-x-[18px] gap-y-2 px-6">
          <div className="relative shrink-0 rounded-full ring-4 ring-white">
            <AvatarCircle user={user} size="xl" />
            <button
              type="button"
              onClick={handlePickPhoto}
              disabled={photoBusy}
              title={user.avatarUrl ? "Change photo" : "Add photo"}
              aria-label={user.avatarUrl ? "Change photo" : "Add photo"}
              className="absolute -bottom-0.5 -right-0.5 grid h-7 w-7 cursor-pointer place-items-center rounded-full border border-[var(--border-subtle)] bg-white text-ink-muted shadow-[0_1px_3px_rgba(0,0,0,0.12)] transition hover:text-ink disabled:cursor-wait"
            >
              {photoBusy ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
              ) : (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path d="M4 8h3l2-3h6l2 3h3v11H4z" strokeLinejoin="round" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handlePhotoSelected} />
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <h1 className="truncate text-[19px] font-semibold text-ink">{fullName}</h1>
            <p className="truncate text-[13px] text-ink-muted">
              {[roleLabel(user.role), company, user.email].filter(Boolean).join(" · ")}
            </p>
            <div className="mt-1 flex items-center gap-2 text-[12.5px] font-medium">
              <button type="button" onClick={handlePickPhoto} disabled={photoBusy} className="cursor-pointer text-brand hover:underline disabled:opacity-50">
                {user.avatarUrl ? "Change photo" : "Add photo"}
              </button>
              {user.avatarUrl ? (
                <>
                  <span className="text-ink-soft" aria-hidden>·</span>
                  <button type="button" onClick={handleRemovePhoto} disabled={photoBusy} className="cursor-pointer text-ink-muted hover:text-danger disabled:opacity-50">
                    Remove photo
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
        {photoError ? <p className="px-6 pt-2 text-xs text-danger">{photoError}</p> : null}

        {/* Tabs */}
        <div role="tablist" aria-label="Profile sections" className="mt-3.5 flex gap-[22px] border-b border-[var(--border-subtle)] px-6">
          {tabs.map((t) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(t.id)}
                className={`relative cursor-pointer pb-[11px] pt-2.5 text-[13.5px] transition-colors ${
                  on ? "font-semibold text-ink" : "font-medium text-ink-muted hover:text-ink"
                }`}
              >
                {t.label}
                {on ? <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" aria-hidden /> : null}
              </button>
            );
          })}
        </div>

        <div className="px-6 py-5">
          {tab === "profile" ? (
            <form onSubmit={handleSaveName}>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {nameFields}
                {roField("Email", user.email)}
                {roField("Role", roleLabel(user.role))}
                {company ? roField("Company", company) : null}
              </div>
              {nameError ? <p className="mt-3 text-xs text-danger">{nameError}</p> : null}
              <div className="mt-[18px] flex items-center gap-2">
                <button type="submit" disabled={nameBusy || !nameDirty} className={primaryBtn}>
                  {nameBusy ? "Saving…" : "Save changes"}
                </button>
                <button
                  type="button"
                  disabled={!nameDirty || nameBusy}
                  onClick={() => {
                    setFirstName(user.firstName ?? "");
                    setLastName(user.lastName ?? "");
                  }}
                  className={secondaryBtn}
                >
                  Cancel
                </button>
                {nameSuccess && !nameDirty ? <span className="text-[12.5px] text-success">Saved.</span> : null}
              </div>
              <p className="mt-4 text-[12px] text-ink-soft">{company ? "Email, role and company are" : "Email and role are"} set by an admin.</p>
            </form>
          ) : null}

          {tab === "security" ? (
            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              {/* Password */}
              <form onSubmit={handleChangePassword} className="overflow-hidden rounded-xl border border-[var(--border-subtle)]">
                <div className="flex items-start gap-3 border-b border-[#f0f1f3] px-5 py-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-brand-tint text-brand" aria-hidden>
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <rect x="5" y="11" width="14" height="10" rx="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="text-[14px] font-semibold text-ink">Change password</h2>
                    <p className="text-[12.5px] text-ink-muted">You&apos;ll stay signed in here. Other devices will be signed out.</p>
                  </div>
                </div>
                <div className="grid gap-3.5 px-5 py-4">
                  <label className="flex flex-col gap-1.5">
                    <span className={fieldLabel}>Current password</span>
                    <input
                      type="password"
                      autoComplete="current-password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <label className="flex min-w-0 flex-col gap-1.5">
                      <span className={fieldLabel}>New password</span>
                      <input
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={PASSWORD_MIN_LENGTH}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className={inputClass}
                      />
                      {/* The password rule as one sentence while typing; each part turns green once met */}
                      {newPassword ? (
                        <p className="text-[12px] leading-snug text-ink-muted" aria-live="polite">
                          Use <Rule ok={newPassword.length >= PASSWORD_MIN_LENGTH}>8+ characters</Rule>,{" "}
                          <Rule ok={/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword)}>upper &amp; lowercase letters</Rule>,{" "}
                          <Rule ok={/\d/.test(newPassword)}>a number</Rule> and{" "}
                          <Rule ok={/[^A-Za-z0-9]/.test(newPassword)}>a symbol</Rule>.
                        </p>
                      ) : null}
                    </label>
                    <label className="flex min-w-0 flex-col gap-1.5">
                      <span className={fieldLabel}>Confirm new password</span>
                      <input
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={PASSWORD_MIN_LENGTH}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`${inputClass} ${
                          confirmPassword && confirmPassword !== newPassword ? "border-danger-border focus:border-danger focus:ring-danger/15" : ""
                        }`}
                      />
                      {confirmPassword ? (
                        <p className={`text-[12px] font-medium ${confirmPassword === newPassword ? "text-success" : "text-danger"}`} aria-live="polite">
                          {confirmPassword === newPassword ? "Passwords match" : "Passwords don’t match"}
                        </p>
                      ) : null}
                    </label>
                  </div>
                  {passwordError ? <p className="text-[12.5px] text-danger">{passwordError}</p> : null}
                  {passwordSuccess ? (
                    <p className="text-[12.5px] text-success">Password updated. Other devices have been signed out.</p>
                  ) : null}
                </div>
                <div className="flex justify-end border-t border-[#f0f1f3] bg-[#fafbfc] px-5 py-3">
                  <button type="submit" disabled={passwordBusy || !canSubmitPassword} className={primaryBtn}>
                    {passwordBusy ? "Updating…" : "Update password"}
                  </button>
                </div>
              </form>

              {/* Devices */}
              <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)]">
                <div className="flex items-start gap-3 border-b border-[#f0f1f3] px-5 py-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#f1f2f4] text-ink-muted" aria-hidden>
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <rect x="2" y="4" width="14" height="11" rx="2" />
                      <rect x="17" y="9" width="5" height="11" rx="1.5" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="text-[14px] font-semibold text-ink">Signed-in devices</h2>
                    <p className="text-[12.5px] text-ink-muted">On a shared or lost device? Sign out everywhere else.</p>
                  </div>
                </div>
                <div className="grid gap-3.5 px-5 py-4">
                  <div className="flex items-center justify-between gap-3 rounded-[10px] bg-[#fafbfc] px-3.5 py-3">
                    <div>
                      <p className="text-[13.5px] font-semibold text-ink">This device</p>
                      <p className="text-[12px] text-ink-muted">You stay signed in here.</p>
                    </div>
                    <span className="inline-flex h-[22px] items-center gap-1.5 rounded-full bg-[#effaf3] px-2.5 text-[12px] font-medium text-success">
                      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                      Signed in here
                    </span>
                  </div>
                  <p className="text-[12.5px] text-ink-muted">
                    Every other phone, tablet or computer is signed out the next time it connects, and will need your password to sign in again.
                  </p>
                  {signOutConfirm ? (
                    <div className="flex flex-col gap-2.5 rounded-[10px] border border-warning-border bg-warning-tint px-3.5 py-3">
                      <p className="text-[12.5px] font-medium text-warning">Sign out every other device now?</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleSignOutOthers()}
                          disabled={signOutBusy}
                          aria-busy={signOutBusy}
                          className="inline-flex h-[34px] cursor-pointer items-center rounded-lg bg-danger px-3.5 text-[13px] font-medium text-white transition hover:bg-danger/90 disabled:cursor-wait disabled:opacity-60"
                        >
                          {signOutBusy ? "Signing out…" : "Yes, sign out others"}
                        </button>
                        <button type="button" onClick={() => setSignOutConfirm(false)} disabled={signOutBusy} className={secondaryBtn}>
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
                        className={dangerBtn}
                      >
                        Sign out of other devices
                      </button>
                    </div>
                  )}
                  {signOutError ? <p className="text-[12.5px] text-danger">{signOutError}</p> : null}
                  {signOutDone ? (
                    <p className="text-[12.5px] text-success">Signed out of all other devices. You&apos;re still signed in here.</p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex w-full flex-col gap-6">
        {showProfile ? (
          <>
            {photoBlock}
            {nameBlock}
            {accountBlock}
          </>
        ) : null}
        {showSecurity ? (
          <>
            {passwordBlock}
            {devicesBlock}
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {showProfile ? (
        <form
          onSubmit={handleSaveName}
          className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
        >
          {photoBlock}
          {nameBlock}
          {accountBlock}
          <div className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] bg-[#fafbfc] px-5 py-3">
            {nameSuccess && !nameDirty ? <span className="mr-auto text-[12.5px] text-success">Saved.</span> : null}
            <button
              type="button"
              disabled={!nameDirty || nameBusy}
              onClick={() => {
                setFirstName(user.firstName ?? "");
                setLastName(user.lastName ?? "");
              }}
              className={secondaryBtn}
            >
              Cancel
            </button>
            <button type="submit" disabled={nameBusy || !nameDirty} className={primaryBtn}>
              {nameBusy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      ) : null}
      {showSecurity ? (
        <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          {passwordBlock}
          {devicesBlock}
        </div>
      ) : null}
    </div>
  );
}
