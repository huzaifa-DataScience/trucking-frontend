"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
import * as adminApi from "@/lib/api/endpoints/admin";
import { getApiErrorMessage } from "@/lib/api/client";
import type {
  RbacMatrixResponse,
  RbacPermissionMeta,
  RbacRoleMeta,
} from "@/lib/admin/types";
import {
  APP_ROLE_IDS,
  APP_ROLE_LABELS,
  normalizeAppRole,
} from "@/lib/auth/roles";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/lib/auth/permissions";

function groupPermissions(perms: RbacPermissionMeta[]) {
  const groups = new Map<string, RbacPermissionMeta[]>();
  for (const p of perms) {
    const g = (p.group || "Other").trim() || "Other";
    const list = groups.get(g) ?? [];
    list.push(p);
    groups.set(g, list);
  }
  return Array.from(groups.entries());
}

/**
 * Admin → Settings → Access control — FRONTEND_RBAC.md
 * Default signup role + role × permission matrix. Never PATCH super_admin.
 */
export function AccessControlSettings() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const canEditRbac = can(user, "admin:rbac") || user?.role === "super_admin";

  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [savingDefault, setSavingDefault] = useState(false);
  const [matrix, setMatrix] = useState<RbacMatrixResponse | null>(null);
  const [draftMatrix, setDraftMatrix] = useState<Record<string, string[]>>({});
  const [defaultRole, setDefaultRole] = useState<string>("assistant_estimator");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rbac, defaults] = await Promise.all([
        adminApi.getRbacMatrix(),
        adminApi.getRbacUserDefaults().catch(() => null),
      ]);
      setMatrix(rbac);
      setDraftMatrix({ ...(rbac.matrix ?? {}) });
      const roleFromDefaults =
        defaults?.role ?? rbac.defaults?.role ?? "assistant_estimator";
      setDefaultRole(normalizeAppRole(roleFromDefaults));
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to load access control"), "error");
      setMatrix(null);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const editableRoles: RbacRoleMeta[] = useMemo(() => {
    const fromApi = (matrix?.roles ?? []).filter((r) => !r.locked);
    if (fromApi.length) return fromApi;
    return APP_ROLE_IDS.filter((id) => id !== "super_admin").map((id) => ({
      id,
      label: APP_ROLE_LABELS[id],
      locked: false,
    }));
  }, [matrix]);

  const permissions = matrix?.permissions ?? [];
  const grouped = useMemo(() => groupPermissions(permissions), [permissions]);

  const toggleCell = (roleId: string, key: string, enabled: boolean) => {
    setDraftMatrix((prev) => {
      const cur = prev[roleId] ?? [];
      const next = enabled
        ? cur.includes(key)
          ? cur
          : [...cur, key]
        : cur.filter((k) => k !== key);
      return { ...prev, [roleId]: next };
    });
  };

  const saveRoleColumn = async (roleId: string) => {
    if (!canEditRbac) return;
    if (roleId === "super_admin") {
      showToast("Super admin permissions cannot be edited.", "error");
      return;
    }
    setSavingRole(roleId);
    try {
      const permissionsPayload = draftMatrix[roleId] ?? [];
      const res = await adminApi.patchRbacRolePermissions(
        roleId,
        permissionsPayload
      );
      setDraftMatrix((prev) => ({
        ...prev,
        [roleId]: res.permissions ?? permissionsPayload,
      }));
      showToast(
        `Saved ${roleId}. Users with that role must log in again.`,
        "success"
      );
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to save role permissions"), "error");
      void load();
    } finally {
      setSavingRole(null);
    }
  };

  const saveDefaultRole = async () => {
    if (!canEditRbac) return;
    setSavingDefault(true);
    try {
      await adminApi.patchRbacUserDefaults(defaultRole);
      showToast("Default signup role updated.", "success");
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to save default role"), "error");
    } finally {
      setSavingDefault(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <TableSkeleton rows={6} toolbar={false} />
      </Card>
    );
  }

  if (!matrix) {
    return (
      <Card>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Could not load{" "}
          <code className="text-xs">GET /admin/rbac</code>. Check admin JWT and
          backend.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Default role for new signups
            </h2>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              New accounts get this role. Permissions come from the matrix — do
              not PATCH a permission list here.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[14rem] flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-stone-500">Role</span>
              <select
                disabled={!canEditRbac || savingDefault}
                value={defaultRole}
                onChange={(e) => setDefaultRole(e.target.value)}
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              >
                {editableRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label || r.id}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={!canEditRbac || savingDefault}
              onClick={() => void saveDefaultRole()}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-secondary disabled:opacity-50"
            >
              {savingDefault ? "Saving…" : "Save default"}
            </button>
          </div>
          {!canEditRbac ? (
            <p className="text-xs text-amber-800 dark:text-amber-200">
              You need <code className="text-[11px]">admin:rbac</code> to edit
              access control.
            </p>
          ) : null}
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Role × permission matrix
            </h2>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Save one role column at a time. Super admin is always all
              permissions — not editable. After save, that role&apos;s users must
              log in again.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-700">
            <table className="min-w-full border-collapse text-left text-xs">
              <thead className="bg-stone-50 dark:bg-stone-900/60">
                <tr>
                  <th className="sticky left-0 z-10 bg-stone-50 px-3 py-2 font-semibold text-stone-600 dark:bg-stone-900/60 dark:text-stone-300">
                    Permission
                  </th>
                  {editableRoles.map((r) => (
                    <th
                      key={r.id}
                      className="min-w-[7.5rem] px-2 py-2 text-center font-semibold text-stone-700 dark:text-stone-200"
                      title={r.note ?? undefined}
                    >
                      <div>{r.label || r.id}</div>
                      <button
                        type="button"
                        disabled={!canEditRbac || savingRole === r.id}
                        onClick={() => void saveRoleColumn(String(r.id))}
                        className="mt-1 rounded border border-stone-300 px-1.5 py-0.5 text-[10px] font-medium text-stone-600 hover:bg-white disabled:opacity-40 dark:border-stone-600 dark:text-stone-300"
                      >
                        {savingRole === r.id ? "…" : "Save"}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped.map(([group, rows]) => (
                  <FragmentGroup
                    key={group}
                    group={group}
                    rows={rows}
                    editableRoles={editableRoles}
                    draftMatrix={draftMatrix}
                    canEdit={canEditRbac}
                    onToggle={toggleCell}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <p className="rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-2 text-xs text-stone-600 dark:border-stone-700 dark:bg-stone-900/40 dark:text-stone-400">
            <span className="font-medium text-stone-800 dark:text-stone-200">
              Super admin
            </span>{" "}
            (Nick / PJ) always has every permission. No checkboxes — never PATCH{" "}
            <code className="text-[11px]">super_admin</code>.
          </p>
        </div>
      </Card>
    </div>
  );
}

function FragmentGroup({
  group,
  rows,
  editableRoles,
  draftMatrix,
  canEdit,
  onToggle,
}: {
  group: string;
  rows: RbacPermissionMeta[];
  editableRoles: RbacRoleMeta[];
  draftMatrix: Record<string, string[]>;
  canEdit: boolean;
  onToggle: (roleId: string, key: string, enabled: boolean) => void;
}) {
  return (
    <>
      <tr className="bg-stone-100/80 dark:bg-stone-800/50">
        <td
          colSpan={1 + editableRoles.length}
          className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-500"
        >
          {group}
        </td>
      </tr>
      {rows.map((p) => (
        <tr
          key={p.key}
          className="border-t border-stone-100 dark:border-stone-800"
        >
          <td className="sticky left-0 z-10 bg-white px-3 py-2 dark:bg-stone-950">
            <div className="font-medium text-stone-900 dark:text-stone-100">
              {p.label}
            </div>
            {p.description ? (
              <div className="mt-0.5 text-[11px] text-stone-500">
                {p.description}
              </div>
            ) : null}
            <div className="mt-0.5 font-mono text-[10px] text-stone-400">
              {p.key}
            </div>
          </td>
          {editableRoles.map((r) => {
            const roleId = String(r.id);
            const checked = (draftMatrix[roleId] ?? []).includes(p.key);
            return (
              <td key={roleId} className="px-2 py-2 text-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-stone-300 text-brand focus:ring-brand"
                  checked={checked}
                  disabled={!canEdit}
                  onChange={(e) => onToggle(roleId, p.key, e.target.checked)}
                  aria-label={`${r.label} — ${p.key}`}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

