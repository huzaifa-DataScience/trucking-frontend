"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { LogoLoader } from "@/components/ui/LogoLoader";
import { useToast } from "@/components/ui/ToastProvider";
import * as adminApi from "@/lib/api/endpoints/admin";
import { getApiErrorMessage } from "@/lib/api/client";
import { BIDDING_PERMISSIONS } from "@/lib/auth/permission-catalog";
import { PERMISSIONS } from "@/lib/auth/permissions";

function togglePermission(current: string[], key: string, enabled: boolean): string[] {
  if (enabled) {
    return current.includes(key) ? current : [...current, key];
  }
  return current.filter((p) => p !== key);
}

export function BiddingRbacSettings() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backendReady, setBackendReady] = useState(false);
  const [defaults, setDefaults] = useState<string[]>([
    PERMISSIONS.biddingRead,
    PERMISSIONS.biddingWrite,
  ]);

  const loadDefaults = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getRbacUserDefaults();
      setDefaults(res.permissions ?? []);
      setBackendReady(true);
    } catch {
      setBackendReady(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDefaults();
  }, [loadDefaults]);

  const handleToggle = useCallback(
    async (key: string, enabled: boolean) => {
      const next = togglePermission(defaults, key, enabled);
      setDefaults(next);
      if (!backendReady) return;

      setSaving(true);
      try {
        await adminApi.patchRbacUserDefaults(next);
        showToast("Default bidding permissions updated.", "success");
      } catch (e) {
        showToast(getApiErrorMessage(e, "Failed to save default permissions"), "error");
        void loadDefaults();
      } finally {
        setSaving(false);
      }
    },
    [backendReady, defaults, loadDefaults, showToast]
  );

  return (
    <Card>
      <div className="space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            Access control — Bidding
          </h2>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Control who sees bid financial totals. Assign per user under{" "}
            <span className="font-medium text-stone-700 dark:text-stone-300">Admin → Users</span> once
            the backend exposes user permissions. Defaults below apply to newly approved users.
          </p>
        </div>

        <div className="rounded-lg border border-stone-200 bg-stone-50/60 px-3 py-2.5 dark:border-stone-700 dark:bg-stone-900/40">
          <p className="text-xs text-stone-600 dark:text-stone-400">
            <span className="font-medium text-stone-800 dark:text-stone-200">Admin role</span> always
            has full access (including bid summary). There is no separate super-admin role in the app
            today — use <code className="text-[11px]">role: admin</code> for operators who manage
            access.
          </p>
        </div>

        {!backendReady && !loading && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">
            Backend endpoint not available yet. Implement{" "}
            <code className="text-xs">GET/PATCH /admin/settings/rbac-user-defaults</code> and user{" "}
            <code className="text-xs">permissions</code> on admin user APIs — see{" "}
            <code className="text-xs">docs/BACKEND_RBAC_ADMIN.md</code>.
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-6">
            <LogoLoader size={28} />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Default permissions for new users
            </p>
            <ul className="space-y-2">
              {BIDDING_PERMISSIONS.map((perm) => {
                const checked = defaults.includes(perm.key);
                return (
                  <li key={perm.key}>
                    <label
                      className={`flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                        checked
                          ? "border-brand/30 bg-brand/5 dark:border-brand/40 dark:bg-brand/10"
                          : "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900"
                      } ${!backendReady ? "opacity-80" : ""}`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 text-brand focus:ring-brand"
                        checked={checked}
                        disabled={saving || !backendReady}
                        onChange={(e) => void handleToggle(perm.key, e.target.checked)}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-stone-900 dark:text-stone-100">
                          {perm.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">
                          {perm.description}
                        </span>
                        <span className="mt-1 inline-block font-mono text-[10px] text-stone-400 dark:text-stone-500">
                          {perm.key}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
