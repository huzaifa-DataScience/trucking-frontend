"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
import * as adminApi from "@/lib/api/endpoints/admin";
import { getApiErrorMessage } from "@/lib/api/client";
import type { RbacMatrixResponse, RbacPermissionMeta, RbacRoleMeta, UserRole } from "@/lib/admin/types";
import { APP_ROLE_IDS, APP_ROLE_LABELS, normalizeAppRole } from "@/lib/auth/roles";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/lib/auth/permissions";
import { SortedOptions } from "@/components/ui/SortedOptions";

const ROLE_COLORS: Record<string, string> = {
  super_admin: "#1565c0",
  admin: "#1e88e5",
  project_manager: "#00897b",
  operations_manager: "#26a69a",
  captain: "#7e57c2",
  assistant_estimator: "#ef6c00",
  bid_clerk: "#8d6e63",
  user: "#9aa0a8",
};

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

function LockIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/**
 * Admin → User Management → Access control: default signup role + permissions, one role at a time.
 * Changes are drafted and saved together. Super admin always has everything and is never PATCHed.
 */
export function AccessControlSettings({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void } = {}) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const canEditRbac = can(user, "admin:rbac") || user?.role === "super_admin";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [matrix, setMatrix] = useState<RbacMatrixResponse | null>(null);
  /** Last saved state from the server — the draft is compared against this. */
  const [saved, setSaved] = useState<Record<string, string[]>>({});
  const [draft, setDraft] = useState<Record<string, string[]>>({});
  const [savedDefault, setSavedDefault] = useState("assistant_estimator");
  const [defaultRole, setDefaultRole] = useState("assistant_estimator");
  const [selected, setSelected] = useState<string>("");
  const [search, setSearch] = useState("");
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rbac, defaults] = await Promise.all([
        adminApi.getRbacMatrix(),
        adminApi.getRbacUserDefaults().catch(() => null),
      ]);
      setMatrix(rbac);
      setSaved({ ...(rbac.matrix ?? {}) });
      setDraft({ ...(rbac.matrix ?? {}) });
      const role = normalizeAppRole(defaults?.role ?? rbac.defaults?.role ?? "assistant_estimator");
      setSavedDefault(role);
      setDefaultRole(role);
    } catch (e) {
      showToast(getApiErrorMessage(e, "Couldn't load access control"), "error");
      setMatrix(null);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const roles: (RbacRoleMeta & { locked: boolean })[] = useMemo(() => {
    const fromApi = matrix?.roles ?? [];
    const list = fromApi.length
      ? fromApi
      : APP_ROLE_IDS.map((id) => ({ id, label: APP_ROLE_LABELS[id], locked: id === "super_admin" }));
    const hasSuper = list.some((r) => String(r.id) === "super_admin");
    const withSuper = hasSuper ? list : [{ id: "super_admin", label: APP_ROLE_LABELS.super_admin, locked: true }, ...list];
    // Super admin first, then the API order.
    return withSuper
      .map((r) => ({ ...r, locked: String(r.id) === "super_admin" || Boolean(r.locked) }))
      .sort((a, b) => Number(b.id === "super_admin") - Number(a.id === "super_admin"));
  }, [matrix]);

  const editableRoles = roles.filter((r) => !r.locked);
  const selectedRole = roles.find((r) => String(r.id) === selected) ?? editableRoles[0] ?? roles[0];
  const selectedId = selectedRole ? String(selectedRole.id) : "";

  // People per role — totals from the existing users list (one tiny request each).
  useEffect(() => {
    if (!roles.length) return;
    let cancelled = false;
    void Promise.all(
      roles.map((r) =>
        adminApi
          .getUsers({ page: 1, pageSize: 1, role: String(r.id) as UserRole })
          .then((res) => [String(r.id), res.total] as const)
          .catch(() => null)
      )
    ).then((rows) => {
      if (cancelled) return;
      setUserCounts(Object.fromEntries(rows.filter((r): r is readonly [string, number] => r != null)));
    });
    return () => {
      cancelled = true;
    };
  }, [roles]);

  /** Hide locked + Finance/WFS rows (super_admin only). */
  const permissions = useMemo(() => {
    const raw = matrix?.permissions ?? [];
    return raw.filter(
      (p) => !p.locked && !String(p.key).startsWith("wfs:") && !/wfs|finance/i.test(String(p.group ?? ""))
    );
  }, [matrix]);

  const q = search.trim().toLowerCase();
  const grouped = useMemo(
    () =>
      groupPermissions(
        q
          ? permissions.filter((p) =>
              [p.label, p.description, p.group].some((v) => String(v ?? "").toLowerCase().includes(q))
            )
          : permissions
      ),
    [permissions, q]
  );

  // --- unsaved changes
  const changedCells = useMemo(() => {
    const out: { role: string; key: string }[] = [];
    for (const r of editableRoles) {
      const id = String(r.id);
      const before = saved[id] ?? [];
      const after = draft[id] ?? [];
      for (const k of after) if (!before.includes(k)) out.push({ role: id, key: k });
      for (const k of before) if (!after.includes(k)) out.push({ role: id, key: k });
    }
    return out;
  }, [editableRoles, saved, draft]);
  const defaultChanged = defaultRole !== savedDefault;
  const changeCount = changedCells.length + (defaultChanged ? 1 : 0);
  const dirty = changeCount > 0;

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  // Browser close / reload with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const roleLabel = (id: string) => roles.find((r) => String(r.id) === id)?.label || APP_ROLE_LABELS[id as UserRole] || id;
  const changeSummary = [
    ...Array.from(
      changedCells.reduce((m, c) => m.set(c.role, (m.get(c.role) ?? 0) + 1), new Map<string, number>())
    ).map(([role, n]) => `${roleLabel(role)} (${n})`),
    ...(defaultChanged ? ["Default role"] : []),
  ].join(", ");

  const isChanged = (role: string, key: string) => changedCells.some((c) => c.role === role && c.key === key);

  const toggle = (roleId: string, key: string, enabled: boolean) => {
    setDraft((prev) => {
      const cur = prev[roleId] ?? [];
      const next = enabled ? (cur.includes(key) ? cur : [...cur, key]) : cur.filter((k) => k !== key);
      return { ...prev, [roleId]: next };
    });
  };

  const discard = () => {
    setDraft({ ...saved });
    setDefaultRole(savedDefault);
  };

  const saveAll = async () => {
    if (!canEditRbac || !dirty) return;
    setSaving(true);
    const touched = Array.from(new Set(changedCells.map((c) => c.role))).filter((r) => r !== "super_admin");
    try {
      const nextSaved = { ...saved };
      for (const roleId of touched) {
        // Never persist locked WFS keys onto other roles.
        const payload = (draft[roleId] ?? []).filter((k) => !String(k).startsWith("wfs:"));
        const res = await adminApi.patchRbacRolePermissions(roleId, payload);
        nextSaved[roleId] = res.permissions ?? payload;
      }
      if (defaultChanged) await adminApi.patchRbacUserDefaults(defaultRole);
      setSaved(nextSaved);
      setDraft((d) => ({ ...d, ...nextSaved }));
      setSavedDefault(defaultRole);
      showToast(
        touched.length
          ? "Access saved. People in the changed roles get it the next time they sign in."
          : "Default role saved.",
        "success"
      );
    } catch (e) {
      showToast(getApiErrorMessage(e, "Couldn't save access changes"), "error");
      void load();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 p-[22px] md:grid-cols-[260px_1fr]">
        <Skeleton className="h-72 w-full rounded-lg" />
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    );
  }

  if (!matrix) {
    return (
      <p className="px-[22px] py-6 text-[13px] text-ink-muted">
        Couldn&apos;t load access control. Refresh the page or try again later.
      </p>
    );
  }

  const isSuper = selectedRole?.locked;
  const rolePerms = isSuper ? permissions.map((p) => p.key) : draft[selectedId] ?? [];
  const onCount = permissions.filter((p) => rolePerms.includes(p.key)).length;

  return (
    <div>
      {/* Default role + search */}
      <div className="flex flex-wrap items-center gap-3 px-[22px] py-3.5">
        <span className="text-[13px] text-ink-muted">New signups get</span>
        <div className="relative">
          <select
            aria-label="Default role for new signups"
            disabled={!canEditRbac || saving}
            value={defaultRole}
            onChange={(e) => setDefaultRole(e.target.value)}
            className={`h-[34px] cursor-pointer appearance-none rounded-lg border pl-2.5 pr-8 text-[13px] text-ink outline-none disabled:cursor-not-allowed ${
              defaultChanged ? "border-[#f5c451] bg-[#fff4d6]" : "border-[var(--border-subtle)] bg-white"
            }`}
          >
            <SortedOptions>
              {editableRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label || r.id}
                </option>
              ))}
            </SortedOptions>
          </select>
          <svg className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {canEditRbac ? (
          <span className="text-[12.5px] text-ink-soft">— saved together with the changes below</span>
        ) : (
          <span className="text-[12.5px] text-warning">You can view access but not change it.</span>
        )}
        <div className="relative ml-auto w-full max-w-[260px]">
          <svg className="pointer-events-none absolute left-2.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-ink-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            aria-label="Find a permission"
            placeholder="Find a permission"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-white pl-8 pr-2.5 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-soft focus:border-brand"
          />
        </div>
      </div>

      <div className="grid border-t border-[var(--border-subtle)] md:grid-cols-[260px_minmax(0,1fr)]">
        {/* Roles */}
        <ul className="flex gap-1 overflow-x-auto border-b border-[var(--border-subtle)] p-2.5 md:flex-col md:border-b-0 md:border-r">
          {roles.map((r) => {
            const id = String(r.id);
            const on = id === selectedId;
            const roleDirty = changedCells.some((c) => c.role === id);
            return (
              <li key={id} className="shrink-0">
                <button
                  type="button"
                  aria-current={on ? "true" : undefined}
                  onClick={() => setSelected(id)}
                  className={`flex w-full cursor-pointer items-center gap-2.5 rounded-[9px] px-2.5 py-[9px] text-left text-[13.5px] transition-colors ${
                    on ? "bg-brand-tint font-semibold text-brand-secondary" : "font-medium text-ink hover:bg-[#f6f7f9]"
                  }`}
                >
                  <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: ROLE_COLORS[id] ?? "#9aa0a8" }} aria-hidden />
                  <span className="flex-1 whitespace-nowrap">{r.label || id}</span>
                  {roleDirty ? <span className="h-[7px] w-[7px] rounded-full bg-[#f5c451]" title="Unsaved changes" /> : null}
                  {r.locked ? (
                    <span className="text-ink-soft" title="Can't be changed">
                      <LockIcon />
                    </span>
                  ) : userCounts[id] != null ? (
                    <span className="text-[12px] font-normal tabular-nums text-ink-muted">{userCounts[id]}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Permissions for the selected role */}
        <div className="min-w-0 px-[22px] py-[18px]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#f0f1f3] pb-3.5">
            <div>
              <h3 className="text-[16px] font-semibold text-ink">{selectedRole?.label || selectedId}</h3>
              <p className="text-[12.5px] text-ink-muted">
                {[selectedRole?.note, userCounts[selectedId] != null ? `${userCounts[selectedId]} ${userCounts[selectedId] === 1 ? "user" : "users"}` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <span className="text-[12.5px] text-ink-muted">
              {onCount} of {permissions.length} permissions
            </span>
          </div>

          {isSuper ? (
            <p className="mt-3.5 flex items-center gap-2 rounded-[9px] bg-[#f6f7f9] px-3 py-2 text-[12.5px] text-ink-muted">
              <LockIcon className="h-[14px] w-[14px] shrink-0" />
              Super admin always has every permission (including Finance) and can&apos;t be changed.
            </p>
          ) : null}

          {grouped.length === 0 ? (
            <p className="mt-6 text-[13px] text-ink-muted">No permissions match “{search}”.</p>
          ) : null}

          {grouped.map(([group, rows]) => {
            const groupOn = rows.filter((p) => rolePerms.includes(p.key)).length;
            return (
              <div key={group} className="mt-4">
                <div className="mb-1.5 flex justify-between text-[12px] font-semibold text-ink-muted">
                  <span>{group}</span>
                  <span className="font-medium">
                    {groupOn} of {rows.length} on
                  </span>
                </div>
                <ul className="flex flex-col gap-1.5">
                  {rows.map((p) => {
                    const checked = rolePerms.includes(p.key);
                    const changed = !isSuper && isChanged(selectedId, p.key);
                    const disabled = isSuper || !canEditRbac || saving;
                    return (
                      <li key={p.key}>
                        <label
                          className={`flex items-center gap-3 rounded-[9px] border px-3 py-2.5 transition-colors ${
                            changed ? "border-[#f5c451] bg-[#fff4d6]" : "border-[#f0f1f3] hover:bg-[#fafbfd]"
                          } ${disabled ? "cursor-default" : "cursor-pointer"}`}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13.5px] font-medium text-ink">{p.label}</span>
                            {p.description ? <span className="block text-[12px] text-ink-muted">{p.description}</span> : null}
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={checked}
                            aria-label={`${p.label} for ${selectedRole?.label || selectedId}`}
                            disabled={disabled}
                            onClick={() => toggle(selectedId, p.key, !checked)}
                            className={`relative h-5 w-[34px] shrink-0 rounded-full transition-colors ${
                              disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                            } ${checked ? "bg-brand" : "bg-[#d5d9de]"}`}
                          >
                            <span
                              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-[left] ${
                                checked ? "left-4" : "left-0.5"
                              }`}
                            />
                          </button>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* One save for everything */}
      {canEditRbac && dirty ? (
        <div className="sticky bottom-3 z-20 mx-[22px] mb-4 mt-3.5 flex flex-wrap items-center gap-3 rounded-xl bg-[#1f2328] py-2.5 pl-4 pr-3 text-white shadow-[0_12px_28px_rgba(16,24,40,0.25)]">
          <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-[#f5c451] text-[12px] font-bold text-[#1f2328]">
            {changeCount}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px]">
              <b className="font-semibold">
                {changeCount} unsaved {changeCount === 1 ? "change" : "changes"}
              </b>{" "}
              <span className="text-[#c9ced6]">· {changeSummary}</span>
            </p>
            {changedCells.length ? (
              <p className="text-[12.5px] text-[#c9ced6]">People in these roles get the new access the next time they sign in.</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={discard}
            disabled={saving}
            className="h-7 cursor-pointer rounded-[7px] px-2.5 text-[12.5px] font-medium text-[#c9ced6] hover:text-white disabled:opacity-50"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={() => void saveAll()}
            disabled={saving}
            className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-[7px] bg-brand px-3 text-[12.5px] font-medium text-white hover:bg-brand-secondary disabled:cursor-wait disabled:opacity-80"
          >
            {saving ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden /> : null}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
