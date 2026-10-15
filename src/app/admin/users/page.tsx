"use client";

import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { UserDetailModal } from "@/components/admin/UserDetailModal";
import { AccessControlSettings } from "@/components/admin/AccessControlSettings";
import * as adminApi from "@/lib/api/endpoints/admin";
import type { AdminUser, UserFilters, UserStatus, UserRole } from "@/lib/admin/types";
import { APP_ROLE_IDS, APP_ROLE_LABELS } from "@/lib/auth/roles";
import { useAuth } from "@/contexts/AuthContext";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { AvatarCircle } from "@/components/ui/AvatarCircle";
import { UserRowMenu, type UserRowMenuItem } from "@/components/admin/UserRowMenu";
import { userFullName } from "@/lib/auth/user-name";
import type { AuthUser } from "@/lib/auth/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { CreatedFilter } from "@/components/admin/CreatedFilter";

import { SortedOptions } from "@/components/ui/SortedOptions";
import { useTableSort } from "@/hooks/useTableSort";
const PAGE_SIZE = 25;

function useUrlFilters(): [UserFilters, (filters: Partial<UserFilters>) => void] {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters: UserFilters = useMemo(
    () => ({
      page: parseInt(searchParams.get("page") || "1", 10),
      pageSize: PAGE_SIZE,
      status: (searchParams.get("status") || "all") as UserStatus | "all",
      role: (searchParams.get("role") || "all") as UserRole | "all",
      search: searchParams.get("search") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      // No default calendar filter; only apply when present in URL
      endDate: searchParams.get("endDate") || undefined,
    }),
    [searchParams]
  );

  const updateFilters = useCallback(
    (newFilters: Partial<UserFilters>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value === undefined || value === "" || value === "all") {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });
      // Any filter change goes back to page 1; paging itself keeps the requested page.
      if (!("page" in newFilters)) params.set("page", "1");
      router.push(`/admin/users?${params.toString()}`);
    },
    [router, searchParams]
  );

  return [filters, updateFilters];
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

type UsersPageTab = "users" | "access";

/** Shape AvatarCircle / userFullName expect; admin rows only carry a subset. */
function asAuthUser(u: AdminUser): AuthUser {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName ?? "",
    lastName: u.lastName ?? "",
    avatarUrl: u.avatarUrl ?? null,
    role: u.role,
    status: u.status,
    permissions: u.permissions ?? [],
    phone: null,
    company: null,
  } as AuthUser;
}

const AVATAR_COLORS = ["#1e88e5", "#26a69a", "#7e57c2", "#ef6c00", "#5c6bc0", "#00897b", "#8d6e63", "#c2185b"];
const avatarColor = (id: number) => AVATAR_COLORS[Math.abs(id) % AVATAR_COLORS.length];

const ROLE_COLORS: Partial<Record<UserRole, string>> = {
  super_admin: "#1565c0",
  admin: "#1e88e5",
  project_manager: "#00897b",
  operations_manager: "#26a69a",
  captain: "#7e57c2",
  assistant_estimator: "#ef6c00",
  bid_clerk: "#8d6e63",
  user: "#9aa0a8",
};

const STATUS_PILL: Record<UserStatus, string> = {
  active: "bg-[#effaf3] text-success",
  pending: "bg-warning-tint text-warning",
  inactive: "bg-[#f3f4f6] text-ink-muted",
  rejected: "bg-danger-tint text-danger",
};

function Icon({ d, className = "h-[14px] w-[14px]" }: { d: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
const IconUser = () => <Icon d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" />;
const IconShield = () => <Icon d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />;
const IconPause = () => <Icon d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM10 9v6M14 9v6" />;
const IconTrash = () => <Icon d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />;
const IconCheck = () => <Icon d="m5 12 5 5 9-10" />;
const IconX = () => <Icon d="M6 6l12 12M18 6 6 18" />;
const IconClock = () => <Icon d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2" className="h-[15px] w-[15px]" />;
function Spinner() {
  return <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />;
}


/** "Today, 9:14 AM" / "Yesterday" / "Oct 9, 2026" / "Never". */
function lastLoginLabel(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(today) - startOf(d)) / 86_400_000);
  if (days === 0) return `Today, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const canSeeAccess =
    can(currentUser, PERMISSIONS.adminRbac) || currentUser?.role === "super_admin";
  const [pageTab, setPageTab] = useState<UsersPageTab>("users");
  /** Unsaved Access control edits — switching tabs would drop them, so ask first. */
  const [accessDirty, setAccessDirty] = useState(false);
  const [pendingTab, setPendingTab] = useState<UsersPageTab | null>(null);
  const switchTab = (next: UsersPageTab) => {
    if (next === pageTab) return;
    if (pageTab === "access" && accessDirty) setPendingTab(next);
    else setPageTab(next);
  };
  const activePageTab: UsersPageTab =
    pageTab === "access" && !canSeeAccess ? "users" : pageTab;
  const [filters, setFilters] = useUrlFilters();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Partial<Record<UserStatus | "all", number>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);
  const [pendingUsers, setPendingUsers] = useState<AdminUser[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [confirmBusy, setConfirmBusy] = useState(false);
  /** Row-level action in flight (approve / activate / deactivate). */
  const [rowBusy, setRowBusy] = useState<Record<number, "approve" | "status">>({});
  const runRow = async (id: number, kind: "approve" | "status", fn: () => Promise<unknown>) => {
    setRowBusy((b) => ({ ...b, [id]: kind }));
    try {
      await fn();
    } catch {
      /* toast already shown */
    } finally {
      setRowBusy((b) => {
        const next = { ...b };
        delete next[id];
        return next;
      });
    }
  };
  const [confirmAction, setConfirmAction] = useState<{
    type: "approve" | "reject" | "delete" | "deactivate" | "bulk-approve" | "bulk-reject" | "bulk-delete";
    userIds: number[];
    userEmail?: string;
  } | null>(null);
  const { showToast } = useToast();
  const userSort = useTableSort(users, {
    name: (u) => userFullName(asAuthUser(u)).toLowerCase(),
    email: (u) => u.email,
    role: (u) => u.role,
    status: (u) => u.status,
    created: (u) => u.createdAt,
    lastLogin: (u) => u.lastLoginAt,
  });
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const searchDebounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const setFiltersRef = useRef(setFilters);
  setFiltersRef.current = setFilters;

  // Update URL filter when search input changes (debounced). Don't depend on setFilters
  // or it retriggers when URL/searchParams change and causes an API call loop.
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      if (searchInput !== filters.search) {
        setFiltersRef.current({ search: searchInput || undefined });
      }
    }, 300);
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchInput, filters.search]);

  const loadPending = useCallback(async () => {
    try {
      const data = await adminApi.getUsers({ page: 1, pageSize: 5, status: "pending" });
      setPendingUsers(data.items);
      setPendingTotal(data.total);
    } catch {
      // Non-critical zone; main table surfaces errors.
      setPendingUsers([]);
      setPendingTotal(0);
    }
  }, []);

  /** quiet: refresh data in place (no skeleton, keeps selection) — used after bulk actions that partly failed. */
  const loadUsers = useCallback(async (opts: { quiet?: boolean } = {}) => {
    if (!opts.quiet) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await adminApi.getUsers(filters);
      setUsers(data.items);
      setTotal(data.total);
      setStatusCounts(data.statusCounts ?? {});
      // Selection only covers rows on screen.
      if (!opts.quiet) setSelectedIds(new Set());
      void loadPending();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (!opts.quiet) setError(error);
      if (error.message.includes("403") || error.message.includes("FORBIDDEN")) {
        showToast("Access denied. Admin role required.", "error");
      } else {
        showToast(error.message || "Failed to load users", "error");
      }
    } finally {
      if (!opts.quiet) setLoading(false);
    }
  }, [filters, showToast, loadPending]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const usersRef = useRef(users);
  usersRef.current = users;
  const statusFilterRef = useRef(filters.status);
  statusFilterRef.current = filters.status;

  /**
   * Update only the rows an action touched: patch or drop them, keep the tab counts and the
   * pending banner in step — no full reload, no skeleton.
   */
  const applyLocal = useCallback(
    (changes: { id: number; patch?: Partial<AdminUser>; removed?: boolean }[]) => {
      const before = new Map(usersRef.current.map((u) => [u.id, u]));
      const statusFilter = statusFilterRef.current;
      const leaving = new Set<number>();
      const counts: Partial<Record<UserStatus | "all", number>> = {};
      const bump = (k: UserStatus | "all", by: number) => {
        counts[k] = (counts[k] ?? 0) + by;
      };
      let pendingTouched = false;

      for (const c of changes) {
        const old = before.get(c.id);
        if (!old) continue;
        if (c.removed) {
          leaving.add(c.id);
          bump(old.status, -1);
          bump("all", -1);
          pendingTouched ||= old.status === "pending";
          continue;
        }
        const next = c.patch?.status;
        if (next && next !== old.status) {
          bump(old.status, -1);
          bump(next, 1);
          pendingTouched ||= old.status === "pending" || next === "pending";
          // On a status tab the row no longer belongs once its status changes.
          if (statusFilter && statusFilter !== "all" && next !== statusFilter) leaving.add(c.id);
        }
      }

      setUsers((list) =>
        list
          .filter((u) => !leaving.has(u.id))
          .map((u) => {
            const c = changes.find((x) => x.id === u.id);
            return c?.patch ? { ...u, ...c.patch } : u;
          })
      );
      if (leaving.size) setTotal((t) => Math.max(0, t - leaving.size));
      setStatusCounts((prev) => {
        const out = { ...prev };
        for (const [k, by] of Object.entries(counts) as [UserStatus | "all", number][]) {
          if (out[k] != null) out[k] = Math.max(0, (out[k] ?? 0) + by);
        }
        return out;
      });
      setSelectedIds((prev) => {
        const ids = new Set(changes.map((c) => c.id));
        return new Set([...prev].filter((id) => !ids.has(id)));
      });
      if (pendingTouched) void loadPending();
    },
    [loadPending]
  );

  const handleApprove = useCallback(
    async (id: number) => {
      try {
        const res = await adminApi.approveUser(id);
        showToast("User approved successfully", "success");
        applyLocal([{ id, patch: { status: res.user?.status ?? "active" } }]);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to approve user", "error");
      }
    },
    [applyLocal, showToast]
  );

  const handleReject = useCallback(
    async (id: number) => {
      try {
        const res = await adminApi.rejectUser(id);
        showToast("User rejected", "success");
        applyLocal([{ id, patch: { status: res.user?.status ?? "rejected" } }]);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to reject user", "error");
      }
    },
    [applyLocal, showToast]
  );

  const handleUpdate = useCallback(
    async (id: number, role: UserRole, status: UserStatus) => {
      try {
        const res = await adminApi.updateUser(id, { role, status });
        showToast("User updated successfully", "success");
        applyLocal([{ id, patch: res.user ? { ...res.user } : { role, status } }]);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to update user", "error");
        throw err;
      }
    },
    [applyLocal, showToast]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await adminApi.deleteUser(id);
        showToast("User deleted successfully", "success");
        applyLocal([{ id, removed: true }]);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to delete user", "error");
      }
    },
    [applyLocal, showToast]
  );

  /** Bulk endpoints only return counts: patch locally when all succeeded, otherwise refresh quietly. */
  const afterBulk = useCallback(
    (ids: number[], failedCount: number, change: { patch?: Partial<AdminUser>; removed?: boolean }) => {
      if (failedCount > 0) {
        void loadUsers({ quiet: true });
        setSelectedIds(new Set());
      } else {
        applyLocal(ids.map((id) => ({ id, ...change })));
      }
    },
    [applyLocal, loadUsers]
  );

  const handleBulkApprove = useCallback(async (ids: number[]) => {
    if (ids.length === 0) return;
    try {
      const result = await adminApi.bulkApprove(ids);
      showToast(`${result.successCount} user(s) approved`, "success");
      afterBulk(ids, result.failedCount, { patch: { status: "active" } });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to approve users", "error");
    }
  }, [afterBulk, showToast]);

  const handleBulkReject = useCallback(async (ids: number[]) => {
    if (ids.length === 0) return;
    try {
      const result = await adminApi.bulkReject(ids);
      showToast(`${result.successCount} user(s) rejected`, "success");
      afterBulk(ids, result.failedCount, { patch: { status: "rejected" } });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to reject users", "error");
    }
  }, [afterBulk, showToast]);

  const handleBulkDelete = useCallback(async (ids: number[]) => {
    if (ids.length === 0) return;
    try {
      const result = await adminApi.bulkDelete(ids);
      showToast(`${result.successCount} user(s) deleted`, "success");
      afterBulk(ids, result.failedCount, { removed: true });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete users", "error");
    }
  }, [afterBulk, showToast]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** Anyone but yourself can be bulk-deleted; approve / reject only show for users they apply to. */
  const bulkSelectable = (u: AdminUser) => u.id !== currentUser?.id;
  const selectableIds = users.filter(bulkSelectable).map((u) => u.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));

  const selectAllRef = useRef<HTMLInputElement>(null);
  const someSelected = selectableIds.some((id) => selectedIds.has(id));
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected && !allSelected;
  }, [someSelected, allSelected]);

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(selectableIds));
  };

  const getStatusBadge = (status: UserStatus) => (
    <span
      className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full pl-2 pr-[9px] text-[12px] font-medium ${STATUS_PILL[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );

  const getRoleBadge = (role: UserRole) => (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] text-ink">
      <span className="h-[7px] w-[7px] rounded-[2px]" style={{ background: ROLE_COLORS[role] ?? "#9aa0a8" }} aria-hidden />
      {APP_ROLE_LABELS[role] ?? role}
    </span>
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeFiltersCount = [
    filters.role !== "all",
    !!filters.search,
    !!filters.startDate || !!filters.endDate,
  ].filter(Boolean).length;

  const statusTabs: { id: UserStatus | "all"; label: string }[] = [
    { id: "all", label: "All" },
    { id: "pending", label: "Pending" },
    { id: "active", label: "Active" },
    { id: "inactive", label: "Inactive" },
    { id: "rejected", label: "Rejected" },
  ];
  const activeStatus = filters.status || "all";

  const rowMenu = (user: AdminUser): UserRowMenuItem[] => {
    const isCurrentUser = currentUser?.id === user.id;
    const items: UserRowMenuItem[] = [
      { label: "View / edit", icon: <IconUser />, onSelect: () => setDetailUser(user) },
      { label: "Change role", icon: <IconShield />, onSelect: () => setDetailUser(user) },
    ];
    if (user.status === "active" && !isCurrentUser) {
      items.push({ label: "Deactivate", icon: <IconPause />, onSelect: () => void runRow(user.id, "status", () => handleUpdate(user.id, user.role, "inactive")) });
    }
    if (user.status === "inactive") {
      items.push({ label: "Activate", icon: <IconCheck />, onSelect: () => void runRow(user.id, "status", () => handleUpdate(user.id, user.role, "active")) });
    }
    if (user.status === "rejected") {
      items.push({ label: "Approve", icon: <IconCheck />, onSelect: () => void runRow(user.id, "approve", () => handleApprove(user.id)) });
    }
    if (!isCurrentUser) {
      items.push({
        label: "Delete user",
        icon: <IconTrash />,
        danger: true,
        onSelect: () => setConfirmAction({ type: "delete", userIds: [user.id], userEmail: user.email }),
      });
    }
    return items;
  };

  // Pending banner copy: "Kevin Smeltzer, Maria Diaz · signed up Oct 14"
  const pendingNames = pendingUsers.map((u) => userFullName(asAuthUser(u)));
  const latestSignup = pendingUsers.reduce<string | null>((max, u) => (!max || u.createdAt > max ? u.createdAt : max), null);

  const th = "sticky top-0 z-10 whitespace-nowrap border-y border-[var(--border-subtle)] bg-[#fafbfc] px-3.5 py-[9px] text-left text-[11.5px] font-semibold text-ink-muted";

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <section className="rounded-xl border border-[var(--border-subtle)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        {/* Title + section tabs */}
        <div className="px-[22px] pt-[18px]">
          <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-ink">User Management</h1>
          <p className="mt-[3px] text-[13px] text-ink-muted">Manage users, approve signups, and roles &amp; permissions.</p>
        </div>
        <div
          role="tablist"
          aria-label="User management sections"
          className="mt-3.5 flex gap-[22px] border-b border-[var(--border-subtle)] px-[22px]"
        >
          {(
            [
              { id: "users" as const, label: "Users" },
              ...(canSeeAccess ? [{ id: "access" as const, label: "Access control" }] : []),
            ] as { id: UsersPageTab; label: string }[]
          ).map((t) => {
            const on = activePageTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => switchTab(t.id)}
                className={`cursor-pointer relative inline-flex items-center gap-[7px] pb-[11px] pt-2.5 text-[13.5px] transition-colors ${
                  on ? "font-semibold text-ink" : "font-medium text-ink-muted hover:text-ink"
                }`}
              >
                {t.label}
                {t.id === "access" && accessDirty ? (
                  <span className="h-[7px] w-[7px] rounded-full bg-[#f5c451]" title="Unsaved changes" aria-label="Unsaved changes" />
                ) : null}
                {t.id === "users" && statusCounts.all != null ? (
                  <span
                    className={`rounded-full px-[7px] py-px text-[11.5px] font-semibold tabular-nums ${
                      on ? "bg-brand-tint text-brand-secondary" : "bg-[#f1f2f4] text-ink-muted"
                    }`}
                  >
                    {statusCounts.all.toLocaleString()}
                  </span>
                ) : null}
                {on ? <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" aria-hidden /> : null}
              </button>
            );
          })}
        </div>

        {activePageTab === "users" ? (
          <>
            {/* Filters — one line */}
            <div className="flex flex-wrap items-center gap-2.5 px-[22px] py-3.5 xl:flex-nowrap">
              <div className="inline-flex shrink-0 gap-0.5 rounded-[9px] bg-[#f1f2f4] p-[3px]" role="group" aria-label="Status">
                {statusTabs.map((t) => {
                  const on = activeStatus === t.id;
                  const n = statusCounts[t.id];
                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setFilters({ status: t.id })}
                      className={`cursor-pointer inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-[7px] px-[11px] text-[13px] font-medium transition-colors ${
                        on ? "bg-white text-ink shadow-[0_1px_2px_rgba(16,24,40,0.08)]" : "text-ink-muted hover:text-ink"
                      }`}
                    >
                      {t.id === "pending" && (n ?? 0) > 0 ? <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden /> : null}
                      {t.label}
                      {n != null ? (
                        <span className={`text-[11.5px] font-semibold tabular-nums ${on ? "text-ink-muted" : "text-ink-soft"}`}>
                          {n.toLocaleString()}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="relative min-w-[180px] max-w-[300px] flex-1 xl:ml-auto">
                <svg className="pointer-events-none absolute left-2.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-ink-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                </svg>
                <input
                  type="search"
                  aria-label="Search users"
                  placeholder="Search name or email"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-white pl-8 pr-2.5 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-soft focus:border-brand"
                />
              </div>

              <label
                className={`relative inline-flex h-[34px] shrink-0 items-center rounded-lg border text-[13px] ${
                  filters.role && filters.role !== "all" ? "border-[#b9d8f6] bg-[#f5faff]" : "border-[var(--border-subtle)] bg-white"
                }`}
              >
                <span className="pointer-events-none pl-2.5 text-ink-muted">Role</span>
                <select
                  aria-label="Role"
                  value={filters.role || "all"}
                  onChange={(e) => setFilters({ role: e.target.value as UserRole | "all" })}
                  className="h-full cursor-pointer appearance-none bg-transparent pl-1.5 pr-8 text-ink outline-none"
                >
                  <SortedOptions>
                    <option value="all" data-pin>All</option>
                    {APP_ROLE_IDS.map((id) => (
                      <option key={id} value={id}>
                        {APP_ROLE_LABELS[id]}
                      </option>
                    ))}
                  </SortedOptions>
                </select>
                <SelectChevron />
              </label>

              <CreatedFilter
                startDate={filters.startDate}
                endDate={filters.endDate}
                onChange={(range) => setFilters(range)}
              />

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setFilters({ role: "all", search: undefined, startDate: undefined, endDate: undefined });
                  }}
                  className="cursor-pointer shrink-0 whitespace-nowrap text-[12.5px] font-medium text-brand hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Pending approvals */}
            {pendingTotal > 0 && activeStatus !== "pending" && (
              <div className="mx-[22px] mb-3.5 flex items-center gap-3 rounded-[10px] border border-warning-border bg-warning-tint py-2.5 pl-3.5 pr-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#fdecc8] text-warning" aria-hidden>
                  <IconClock />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-ink">
                    {pendingTotal} signup{pendingTotal === 1 ? "" : "s"} waiting for approval
                  </p>
                  <p className="truncate text-[12.5px] text-ink-muted">
                    {pendingNames.join(", ")}
                    {pendingTotal > pendingUsers.length ? ` and ${pendingTotal - pendingUsers.length} more` : ""}
                    {latestSignup ? ` · signed up ${formatDate(latestSignup).replace(/, \d{4}$/, "")}` : ""}
                  </p>
                </div>
                <div className="hidden shrink-0 sm:flex">
                  {pendingUsers.map((u, i) => (
                    <span key={u.id} className={`rounded-full ring-2 ring-warning-tint ${i ? "-ml-1.5" : ""}`}>
                      <AvatarCircle user={asAuthUser(u)} size="2xs" previewable={false} color={avatarColor(u.id)} />
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setFilters({ status: "pending" })}
                  className="cursor-pointer h-7 shrink-0 rounded-[7px] border border-[var(--border-subtle)] bg-white px-2.5 text-[12.5px] font-medium text-ink hover:bg-[#f9fafb]"
                >
                  Review
                </button>
              </div>
            )}

            {/* Bulk actions — only what applies to the selected users (same rules as the row menu) */}
            {selectedIds.size > 0 && (() => {
              const picked = users.filter((u) => selectedIds.has(u.id));
              const approvable = picked.filter((u) => u.status === "pending" || u.status === "rejected").map((u) => u.id);
              const rejectable = picked.filter((u) => u.status === "pending").map((u) => u.id);
              const deletable = picked.filter((u) => u.id !== currentUser?.id).map((u) => u.id);
              return (
                <div className="flex h-[52px] flex-wrap items-center gap-2.5 border-t border-[#d7e8fa] bg-[#f3f8fe] px-[22px] text-[13px]">
                  <b className="font-semibold text-ink">{selectedIds.size} selected</b>
                  <span className="h-[18px] w-px bg-[#cfe0f3]" aria-hidden />
                  {approvable.length ? (
                    <button
                      type="button"
                      onClick={() => setConfirmAction({ type: "bulk-approve", userIds: approvable })}
                      className="cursor-pointer inline-flex h-7 items-center gap-1.5 rounded-[7px] bg-success px-2.5 text-[12.5px] font-medium text-white hover:bg-success/90"
                    >
                      <IconCheck />
                      Approve {approvable.length}
                    </button>
                  ) : null}
                  {rejectable.length ? (
                    <button
                      type="button"
                      onClick={() => setConfirmAction({ type: "bulk-reject", userIds: rejectable })}
                      className="cursor-pointer h-7 rounded-[7px] border border-[var(--border-subtle)] bg-white px-2.5 text-[12.5px] font-medium text-ink hover:bg-[#f9fafb]"
                    >
                      Reject {rejectable.length}
                    </button>
                  ) : null}
                  {deletable.length ? (
                    <button
                      type="button"
                      onClick={() => setConfirmAction({ type: "bulk-delete", userIds: deletable })}
                      className="cursor-pointer inline-flex h-7 items-center gap-1.5 rounded-[7px] border border-danger-border bg-white px-2.5 text-[12.5px] font-medium text-danger hover:bg-danger-tint"
                    >
                      <IconTrash />
                      Delete {deletable.length}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="cursor-pointer ml-auto text-[12.5px] font-medium text-ink-muted hover:text-ink"
                  >
                    Clear selection
                  </button>
                </div>
              );
            })()}

            {error && (
              <div className="border-t border-danger-border bg-danger-tint px-[22px] py-3 text-sm text-danger">
                {error.message}
              </div>
            )}

            {loading ? (
              <div className="border-t border-[var(--border-subtle)] p-4">
                <TableSkeleton rows={8} toolbar={false} />
              </div>
            ) : users.length === 0 ? (
              <div className="border-t border-[var(--border-subtle)] p-4">
                <EmptyState message="No users found — try adjusting your filters." />
              </div>
            ) : (
              <>
                <div className="table-scroll overflow-auto">
                  <table className="min-w-full border-separate border-spacing-0 text-[13.5px]">
                    <thead>
                      <tr>
                        <th className={`${th} w-11 pl-[22px] pr-0`}>
                          {selectableIds.length ? (
                            <input
                              ref={selectAllRef}
                              type="checkbox"
                              aria-label="Select all users on this page"
                              checked={allSelected}
                              onChange={toggleSelectAll}
                              className="cursor-pointer h-4 w-4 rounded border-ink/20 align-middle accent-brand"
                            />
                          ) : null}
                        </th>
                        <th className={th}>{userSort.header("name", "User")}</th>
                        <th className={th}>{userSort.header("role", "Role")}</th>
                        <th className={th}>{userSort.header("status", "Status")}</th>
                        <th className={th}>{userSort.header("created", "Created")}</th>
                        <th className={th}>{userSort.header("lastLogin", "Last login")}</th>
                        <th className={`${th} w-[200px] pr-4`}>
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {userSort.sorted.map((user) => {
                        const selected = selectedIds.has(user.id);
                        const isCurrentUser = currentUser?.id === user.id;
                        const asAuth = asAuthUser(user);
                        const name = userFullName(asAuth);
                        const cell = `h-[52px] border-b border-[#f0f1f3] px-3.5 align-middle ${selected ? "bg-[#f3f8fe]" : "group-hover:bg-[#fafbfd]"}`;
                        return (
                          <tr key={user.id} className="group">
                            <td className={`${cell} w-11 pl-[22px] pr-0`}>
                              {bulkSelectable(user) ? (
                                <input
                                  type="checkbox"
                                  aria-label={`Select ${name}`}
                                  checked={selected}
                                  onChange={() => toggleSelect(user.id)}
                                  className="cursor-pointer h-4 w-4 rounded border-ink/20 align-middle accent-brand"
                                />
                              ) : null}
                            </td>
                            <td className={cell}>
                              <button
                                type="button"
                                onClick={() => setDetailUser(user)}
                                className="cursor-pointer flex min-w-0 items-center gap-[11px] text-left"
                              >
                                <AvatarCircle user={asAuth} size="xs" previewable={false} color={avatarColor(user.id)} />
                                <span className="min-w-0">
                                  <span className="block truncate font-semibold leading-tight text-ink hover:text-brand">
                                    {name}
                                    {isCurrentUser ? (
                                      <span className="ml-1.5 rounded bg-brand-tint px-[5px] py-px align-[1px] text-[10.5px] font-semibold text-brand-secondary">
                                        You
                                      </span>
                                    ) : null}
                                  </span>
                                  {name !== user.email ? (
                                    <span className="block truncate text-[12.5px] leading-snug text-ink-muted">{user.email}</span>
                                  ) : null}
                                </span>
                              </button>
                            </td>
                            <td className={cell}>{getRoleBadge(user.role)}</td>
                            <td className={cell}>{getStatusBadge(user.status)}</td>
                            <td className={`${cell} whitespace-nowrap tabular-nums text-ink-muted`}>{formatDate(user.createdAt)}</td>
                            <td
                              className={`${cell} whitespace-nowrap tabular-nums ${user.lastLoginAt ? "text-ink-muted" : "text-ink-soft"}`}
                              title={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : undefined}
                            >
                              {lastLoginLabel(user.lastLoginAt)}
                            </td>
                            <td className={`${cell} pr-4 text-right`}>
                              <div className="inline-flex items-center gap-1.5">
                                {user.status === "pending" ? (
                                  <button
                                    type="button"
                                    onClick={() => void runRow(user.id, "approve", () => handleApprove(user.id))}
                                    disabled={Boolean(rowBusy[user.id])}
                                    aria-busy={rowBusy[user.id] === "approve"}
                                    className="cursor-pointer inline-flex h-7 items-center gap-1.5 rounded-[7px] bg-success px-2.5 text-[12.5px] font-medium text-white transition hover:bg-success/90 disabled:cursor-wait disabled:opacity-80"
                                  >
                                    {rowBusy[user.id] === "approve" ? <Spinner /> : <IconCheck />}
                                    {rowBusy[user.id] === "approve" ? "Approving…" : "Approve"}
                                  </button>
                                ) : null}
                                {user.status === "pending" ? (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmAction({ type: "reject", userIds: [user.id], userEmail: user.email })}
                                    disabled={Boolean(rowBusy[user.id])}
                                    className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 inline-flex h-7 items-center gap-1.5 rounded-[7px] border border-[var(--border-subtle)] bg-white px-2.5 text-[12.5px] font-medium text-ink transition hover:border-danger-border hover:bg-danger-tint hover:text-danger"
                                  >
                                    <IconX />
                                    Reject
                                  </button>
                                ) : null}
                                {rowBusy[user.id] === "status" ? (
                                  <span className="grid h-8 w-8 place-items-center text-ink-soft" role="status" aria-label="Updating">
                                    <Spinner />
                                  </span>
                                ) : (
                                  <UserRowMenu items={rowMenu(user)} label={`Actions for ${name}`} />
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] px-[22px] py-2.5 text-[12.5px] text-ink-muted sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    Showing{" "}
                    <b className="font-semibold text-ink">
                      {(filters.page! - 1) * PAGE_SIZE + 1}–{Math.min(filters.page! * PAGE_SIZE, total)}
                    </b>{" "}
                    of {total} users
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setFilters({ page: Math.max(1, filters.page! - 1) })}
                      disabled={filters.page === 1}
                      aria-label="Previous page"
                      className="cursor-pointer grid h-[30px] min-w-[30px] place-items-center rounded-[7px] border border-[var(--border-subtle)] bg-white text-ink disabled:opacity-40"
                    >
                      ‹
                    </button>
                    <span className="grid h-[30px] min-w-[30px] place-items-center rounded-[7px] border border-[var(--border-subtle)] bg-white px-2 font-semibold tabular-nums text-ink">
                      {filters.page}
                    </span>
                    {totalPages > 1 ? <span className="px-1 tabular-nums">of {totalPages}</span> : null}
                    <button
                      type="button"
                      onClick={() => setFilters({ page: Math.min(totalPages, filters.page! + 1) })}
                      disabled={(filters.page ?? 1) >= totalPages}
                      aria-label="Next page"
                      className="cursor-pointer grid h-[30px] min-w-[30px] place-items-center rounded-[7px] border border-[var(--border-subtle)] bg-white text-ink disabled:opacity-40"
                    >
                      ›
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        ) : null}

        {activePageTab === "access" && canSeeAccess ? <AccessControlSettings onDirtyChange={setAccessDirty} /> : null}
      </section>

      {pendingTab ? (
        <ConfirmModal
          isOpen
          title="Leave without saving?"
          message="You have unsaved access changes. If you leave now they'll be lost."
          confirmLabel="Discard and leave"
          cancelLabel="Stay"
          variant="danger"
          onConfirm={() => {
            setAccessDirty(false);
            setPageTab(pendingTab);
            setPendingTab(null);
          }}
          onCancel={() => setPendingTab(null)}
        />
      ) : null}

      {/* Confirmation Modals */}
      {confirmAction && (
        <ConfirmModal
          isOpen={!!confirmAction}
          title={
            confirmAction.type === "bulk-approve"
              ? "Approve Selected Users?"
              : confirmAction.type === "bulk-reject"
                ? "Reject Selected Users?"
                : confirmAction.type === "bulk-delete"
                  ? "Delete Selected Users?"
                  : confirmAction.type === "reject"
                    ? "Reject User?"
                    : confirmAction.type === "delete"
                      ? "Delete User?"
                      : "Deactivate User?"
          }
          message={
            confirmAction.type === "bulk-approve"
              ? `Are you sure you want to approve ${confirmAction.userIds.length} user(s)?`
              : confirmAction.type === "bulk-reject"
                ? `Are you sure you want to reject ${confirmAction.userIds.length} user(s)?`
                : confirmAction.type === "bulk-delete"
                  ? `Are you sure you want to permanently delete ${confirmAction.userIds.length} user(s)? This action cannot be undone.`
                  : confirmAction.type === "reject"
                    ? `Are you sure you want to reject ${confirmAction.userEmail}?`
                    : confirmAction.type === "delete"
                      ? `Are you sure you want to permanently delete ${confirmAction.userEmail}? This action cannot be undone.`
                      : `Are you sure you want to deactivate ${confirmAction.userEmail}?`
          }
          confirmLabel={
            confirmAction.type === "bulk-approve" || confirmAction.type === "approve"
              ? "Approve"
              : confirmAction.type === "bulk-reject" || confirmAction.type === "reject"
                ? "Reject"
                : "Delete"
          }
          variant={confirmAction.type.includes("delete") || confirmAction.type === "reject" ? "danger" : "default"}
          loading={confirmBusy}
          onConfirm={async () => {
            setConfirmBusy(true);
            try {
            if (confirmAction.type === "bulk-approve") {
              await handleBulkApprove(confirmAction.userIds);
            } else if (confirmAction.type === "bulk-reject") {
              await handleBulkReject(confirmAction.userIds);
            } else if (confirmAction.type === "bulk-delete") {
              await handleBulkDelete(confirmAction.userIds);
            } else if (confirmAction.type === "reject") {
              await handleReject(confirmAction.userIds[0]!);
            } else if (confirmAction.type === "delete") {
              await handleDelete(confirmAction.userIds[0]!);
            }
            } finally {
              setConfirmBusy(false);
              setConfirmAction(null);
            }
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* User Detail Modal */}
      <UserDetailModal
        user={detailUser}
        isOpen={!!detailUser}
        onClose={() => setDetailUser(null)}
        onSave={async (id, role, status) => {
          await handleUpdate(id, role, status);
          setDetailUser(null);
        }}
      />
    </div>
  );
}
