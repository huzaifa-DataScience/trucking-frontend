"use client";

import { useState, useEffect } from "react";
import type { AdminUser, UserRole, UserStatus } from "@/lib/admin/types";

interface UserDetailModalProps {
  user: AdminUser | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number, role: UserRole, status: UserStatus) => Promise<void>;
}

export function UserDetailModal({ user, isOpen, onClose, onSave }: UserDetailModalProps) {
  const [role, setRole] = useState<UserRole>("user");
  const [status, setStatus] = useState<UserStatus>("pending");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setRole(user.role);
      setStatus(user.status);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(user.id, role, status);
      onClose();
    } catch (error) {
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
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">User Details</h2>
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
              <dt className="text-xs font-medium text-stone-500 dark:text-stone-400">Email</dt>
              <dd className="mt-1 text-sm text-stone-900 dark:text-stone-100">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-stone-500 dark:text-stone-400">Role</dt>
              <dd className="mt-1">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-stone-500 dark:text-stone-400">Status</dt>
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
              <dt className="text-xs font-medium text-stone-500 dark:text-stone-400">Created</dt>
              <dd className="mt-1 text-sm text-stone-900 dark:text-stone-100">{formatDate(user.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-stone-500 dark:text-stone-400">Last Login</dt>
              <dd className="mt-1 text-sm text-stone-900 dark:text-stone-100">{formatDate(user.lastLoginAt)}</dd>
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
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
