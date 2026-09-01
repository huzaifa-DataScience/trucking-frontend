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
        className="w-full max-w-lg rounded-xl border border-stone-200 bg-white shadow-xl dark:border-stone-700 dark:bg-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 dark:border-stone-700">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            User Details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-4">
          <dl className="space-y-4">
            <div>
              <dt className="text-xs font-medium text-stone-500 dark:text-stone-400">
                Email
              </dt>
              <dd className="mt-1 text-sm text-stone-900 dark:text-stone-100">
                {user.email}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-stone-500 dark:text-stone-400">
                Role
              </dt>
              <dd className="mt-1">
                <select
                  value={role}
                  onChange={(e) =>
                    setRole(normalizeAppRole(e.target.value) as AppRoleId)
                  }
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                >
                  {roleOptions.map((id) => (
                    <option key={id} value={id}>
                      {APP_ROLE_LABELS[id]}
                    </option>
                  ))}
                </select>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-stone-500 dark:text-stone-400">
                Status
              </dt>
              <dd className="mt-1">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as UserStatus)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="rejected">Rejected</option>
                </select>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-stone-500 dark:text-stone-400">
                Permissions
              </dt>
              <dd className="mt-1">
                {permissionsLoading ? (
                  <p className="text-sm text-stone-500">Loading…</p>
                ) : permissions.length === 0 ? (
                  <p className="text-sm text-stone-500">
                    None on this user (from role matrix after next login).
                  </p>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {permissions.map((p) => (
                      <li
                        key={p}
                        className="rounded-md bg-stone-100 px-2 py-0.5 font-mono text-[11px] text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                      >
                        {p}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-1.5 text-[11px] text-stone-500">
                  Read-only. Change the role to change permissions. Do not PATCH
                  permissions per user.
                </p>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-stone-500 dark:text-stone-400">
                Created
              </dt>
              <dd className="mt-1 text-sm text-stone-900 dark:text-stone-100">
                {formatDate(user.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-stone-500 dark:text-stone-400">
                Last Login
              </dt>
              <dd className="mt-1 text-sm text-stone-900 dark:text-stone-100">
                {formatDate(user.lastLoginAt)}
              </dd>
            </div>
          </dl>
        </div>
        <div className="flex justify-end gap-3 border-t border-stone-200 px-6 py-4 dark:border-stone-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-secondary disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
