"use client";

import { useState, useEffect } from "react";
import type { AdminUser, UserRole, UserStatus } from "@/lib/admin/types";
import * as adminApi from "@/lib/api/endpoints/admin";
import {
  APP_ROLE_IDS,
  APP_ROLE_LABELS,
  type AppRoleId,
  normalizeAppRole,
} from "@/lib/auth/roles";
import { useAuth } from "@/contexts/AuthContext";

interface UserDetailModalProps {
  user: AdminUser | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number, role: UserRole, status: UserStatus) => Promise<void>;
}

function SelectChevron() {
  return (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function UserDetailModal({
  user,
  isOpen,
  onClose,
  onSave,
}: UserDetailModalProps) {
  const { user: me } = useAuth();
  const [role, setRole] = useState<UserRole>("user");
  const [status, setStatus] = useState<UserStatus>("pending");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const roleOptions = APP_ROLE_IDS.filter((id) => {
    if (id === "super_admin") return me?.role === "super_admin";
    return true;
  });

  useEffect(() => {
    if (!user) return;
    setRole(normalizeAppRole(user.role));
    setStatus(user.status);
    if (user.permissions) {
      setPermissions(user.permissions);
      return;
    }
    let cancelled = false;
    setPermissionsLoading(true);
    adminApi
      .getUserById(user.id)
      .then((full) => {
        if (!cancelled) {
          setPermissions(full.permissions ?? []);
          if (full.role) setRole(normalizeAppRole(full.role));
        }
      })
      .catch(() => {
        if (!cancelled) setPermissions([]);
      })
      .finally(() => {
        if (!cancelled) setPermissionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(user.id, role, status);
      onClose();
    } catch {
      // Error handled by parent via toast
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-ink/[0.08] bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ink/[0.08] px-6 py-4">
          <h2 className="text-lg font-semibold text-ink">User Details</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-ink/40 transition hover:bg-ink/[0.06] hover:text-ink"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4">
          <dl className="space-y-4">
            <div>
              <dt className="text-xs font-medium text-ink/45">Email</dt>
              <dd className="mt-1 text-sm text-ink">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-ink/45">Role</dt>
              <dd className="mt-1">
                <div className="relative">
                  <select
                    value={role}
                    onChange={(e) =>
                      setRole(normalizeAppRole(e.target.value) as AppRoleId)
                    }
                    className="w-full appearance-none rounded-lg border border-ink/10 bg-surface px-3 py-2 pr-9 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  >
                    {roleOptions.map((id) => (
                      <option key={id} value={id}>
                        {APP_ROLE_LABELS[id]}
                      </option>
                    ))}
                  </select>
                  <SelectChevron />
                </div>
                <p className="mt-1.5 text-[11px] text-ink/40">
                  Assigning a role picks their bidding home queues (clerk /
                  captain / AE / PM / ops). No separate team or dashboard
                  picker on the user.
                </p>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-ink/45">Status</dt>
              <dd className="mt-1">
                <div className="relative">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as UserStatus)}
                    className="w-full appearance-none rounded-lg border border-ink/10 bg-surface px-3 py-2 pr-9 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <SelectChevron />
                </div>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-ink/45">Permissions</dt>
              <dd className="mt-1">
                {permissionsLoading ? (
                  <p className="text-sm text-ink/45">Loading…</p>
                ) : permissions.length === 0 ? (
                  <p className="text-sm text-ink/45">
                    None on this user (from role matrix after next login).
                  </p>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {permissions.map((p) => (
                      <li
                        key={p}
                        className="rounded-md bg-ink/[0.05] px-2 py-0.5 font-mono text-[11px] text-ink/70"
                      >
                        {p}
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-ink/45">Created</dt>
              <dd className="mt-1 text-sm text-ink">{formatDate(user.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-ink/45">Last Login</dt>
              <dd className="mt-1 text-sm text-ink">{formatDate(user.lastLoginAt)}</dd>
            </div>
          </dl>
        </div>
        <div className="flex justify-end gap-3 border-t border-ink/[0.08] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-ink/15 bg-surface px-4 py-2 text-sm font-semibold text-ink/70 transition hover:bg-ink/[0.04]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-secondary disabled:pointer-events-none disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
