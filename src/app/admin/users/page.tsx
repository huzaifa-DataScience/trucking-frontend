"use client";

import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { UserDetailModal } from "@/components/admin/UserDetailModal";
import * as adminApi from "@/lib/api/endpoints/admin";
import type { AdminUser, UserFilters, UserStatus, UserRole } from "@/lib/admin/types";
import { APP_ROLE_IDS, APP_ROLE_LABELS } from "@/lib/auth/roles";
import { useAuth } from "@/contexts/AuthContext";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { StatusPill, type StatusTone } from "@/components/ui/StatusPill";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { DatePicker } from "@/components/ui/DatePicker";

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
      params.set("page", "1"); // Reset to page 1 on filter change
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

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [filters, setFilters] = useUrlFilters();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);
  const [pendingUsers, setPendingUsers] = useState<AdminUser[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [confirmAction, setConfirmAction] = useState<{
    type: "approve" | "reject" | "delete" | "deactivate" | "bulk-approve" | "bulk-reject" | "bulk-delete";
    userIds: number[];
    userEmail?: string;
  } | null>(null);
  const { showToast } = useToast();
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

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getUsers(filters);
      setUsers(data.items);
      setTotal(data.total);
      void loadPending();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      if (error.message.includes("403") || error.message.includes("FORBIDDEN")) {
        showToast("Access denied. Admin role required.", "error");
      } else {
        showToast(error.message || "Failed to load users", "error");
      }
    } finally {
      setLoading(false);
    }
  }, [filters, showToast, loadPending]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleApprove = useCallback(
    async (id: number) => {
      try {
        await adminApi.approveUser(id);
        showToast("User approved successfully", "success");
        loadUsers();
        setSelectedIds(new Set());
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to approve user", "error");
      }
    },
    [loadUsers, showToast]
  );

  const handleReject = useCallback(
    async (id: number) => {
      try {
        await adminApi.rejectUser(id);
        showToast("User rejected", "success");
        loadUsers();
        setSelectedIds(new Set());
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to reject user", "error");
      }
    },
    [loadUsers, showToast]
  );

  const handleUpdate = useCallback(
    async (id: number, role: UserRole, status: UserStatus) => {
      try {
        await adminApi.updateUser(id, { role, status });
        showToast("User updated successfully", "success");
        loadUsers();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to update user", "error");
        throw err;
      }
    },
    [loadUsers, showToast]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await adminApi.deleteUser(id);
        showToast("User deleted successfully", "success");
        loadUsers();
        setSelectedIds(new Set());
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to delete user", "error");
      }
    },
    [loadUsers, showToast]
  );

  const handleBulkApprove = useCallback(async () => {
    if (selectedIds.size === 0) return;
    try {
      const result = await adminApi.bulkApprove(Array.from(selectedIds));
      showToast(`${result.successCount} user(s) approved`, "success");
      loadUsers();
      setSelectedIds(new Set());
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to approve users", "error");
    }
  }, [selectedIds, loadUsers, showToast]);

  const handleBulkReject = useCallback(async () => {
    if (selectedIds.size === 0) return;
    try {
      const result = await adminApi.bulkReject(Array.from(selectedIds));
      showToast(`${result.successCount} user(s) rejected`, "success");
      loadUsers();
      setSelectedIds(new Set());
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to reject users", "error");
    }
  }, [selectedIds, loadUsers, showToast]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    try {
      const result = await adminApi.bulkDelete(Array.from(selectedIds));
      showToast(`${result.successCount} user(s) deleted`, "success");
      loadUsers();
      setSelectedIds(new Set());
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete users", "error");
    }
  }, [selectedIds, loadUsers, showToast]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map((u) => u.id)));
    }
  };

  const getStatusBadge = (status: UserStatus) => {
    const tones: Record<UserStatus, StatusTone> = {
      pending: "warning",
      active: "success",
      inactive: "neutral",
      rejected: "danger",
    };
    return (
      <StatusPill
        tone={tones[status]}
        label={status.charAt(0).toUpperCase() + status.slice(1)}
      />
    );
  };

  const getRoleBadge = (role: UserRole) => (
    <StatusPill
      tone={
        role === "super_admin" || role === "admin" ? "info" : "neutral"
      }
      label={APP_ROLE_LABELS[role] ?? role}
    />
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const activeFiltersCount = [
    filters.status !== "all",
    filters.role !== "all",
    !!filters.search,
    !!filters.startDate || !!filters.endDate,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <PageHeader title="User Management" subtitle="Manage users, approve signups, and control access." />

      {pendingTotal > 0 && (
        <div className="rounded-2xl border border-warning-border bg-warning-tint p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-warning">
              {pendingTotal} user{pendingTotal === 1 ? "" : "s"} awaiting approval
            </p>
            {pendingTotal > pendingUsers.length ? (
              <button
                type="button"
                onClick={() => setFilters({ status: "pending" })}
                className="text-xs font-semibold text-warning underline-offset-2 hover:underline"
              >
                View all
              </button>
            ) : null}
          </div>
          <ul className="mt-3 space-y-2">
            {pendingUsers.map((u) => (
              <li
                key={u.id}
                className="flex flex-col gap-2 rounded-xl border border-warning-border/60 bg-surface px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{u.email}</p>
                  <p className="text-xs text-ink/45">Signed up {formatDate(u.createdAt)}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(u.id)}
                    className="rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-white hover:bg-success/90"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmAction({ type: "reject", userIds: [u.id], userEmail: u.email })
                    }
                    className="rounded-lg border border-ink/15 bg-surface px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-ink/[0.04]"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Filters */}
      <div className="sticky top-14 z-20 -mx-6 -mt-6 flex flex-wrap items-end gap-4 border-b border-ink/[0.08] bg-surface/95 px-6 py-4 backdrop-blur">
        <div className="flex flex-1 flex-wrap items-end gap-4">
          <label className="flex min-w-[200px] flex-1 flex-col gap-1">
            <span className="text-xs font-medium text-ink/45">Search</span>
            <input
              type="text"
              placeholder="Search by email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="rounded-lg border border-ink/10 bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink/45">Status</span>
            <div className="relative">
              <select
                value={filters.status || "all"}
                onChange={(e) => setFilters({ status: e.target.value as UserStatus | "all" })}
                className="w-full appearance-none rounded-lg border border-ink/10 bg-surface px-3 py-2 pr-9 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="rejected">Rejected</option>
              </select>
              <SelectChevron />
            </div>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink/45">Role</span>
            <div className="relative">
              <select
                value={filters.role || "all"}
                onChange={(e) => setFilters({ role: e.target.value as UserRole | "all" })}
                className="w-full appearance-none rounded-lg border border-ink/10 bg-surface px-3 py-2 pr-9 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              >
                <option value="all">All</option>
                {APP_ROLE_IDS.map((id) => (
                  <option key={id} value={id}>
                    {APP_ROLE_LABELS[id]}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink/45">Start Date</span>
            <DatePicker
              ariaLabel="Start date"
              value={filters.startDate || ""}
              onChange={(v) => setFilters({ startDate: v || undefined })}
              className="min-h-9 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink/45">End Date</span>
            <DatePicker
              ariaLabel="End date"
              value={filters.endDate || ""}
              onChange={(v) => setFilters({ endDate: v || undefined })}
              className="min-h-9 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setFilters({ status: "all", role: "all", search: undefined, startDate: undefined, endDate: undefined });
              }}
              className="rounded-lg border border-ink/10 bg-surface px-3 py-2 text-sm font-semibold text-ink/70 transition hover:border-brand/30 hover:text-brand"
            >
              Clear Filters ({activeFiltersCount})
            </button>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-brand/30 bg-brand/[0.06] px-4 py-3">
          <span className="text-sm font-semibold text-ink">
            {selectedIds.size} user{selectedIds.size === 1 ? "" : "s"} selected
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmAction({ type: "bulk-approve", userIds: Array.from(selectedIds) })}
              className="rounded-lg bg-success px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-success/90"
            >
              Approve Selected
            </button>
            <button
              type="button"
              onClick={() => setConfirmAction({ type: "bulk-reject", userIds: Array.from(selectedIds) })}
              className="rounded-lg border border-ink/15 bg-surface px-3 py-1.5 text-sm font-semibold text-ink/70 transition hover:bg-ink/[0.04]"
            >
              Reject Selected
            </button>
            <button
              type="button"
              onClick={() => setConfirmAction({ type: "bulk-delete", userIds: Array.from(selectedIds) })}
              className="rounded-lg bg-danger px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-danger/90"
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-danger-border bg-danger-tint px-4 py-3 text-sm text-danger">
          {error.message}
        </div>
      )}

      {loading && <TableSkeleton rows={8} />}

      {!loading && users.length === 0 && (
        <EmptyState message="No users found — try adjusting your filters." />
      )}

      {!loading && users.length > 0 && (
        <>
          <div className="rounded-xl border border-ink/[0.08] bg-surface shadow-[0_1px_2px_rgba(1,1,1,0.04)]">
            <div className="overflow-x-auto overscroll-x-contain -mx-1 px-1 sm:mx-0 sm:px-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink/[0.08] bg-ink/[0.02] text-xs font-semibold text-ink/50">
                      <th className="sticky top-0 z-10 whitespace-nowrap bg-ink/[0.02] px-3 py-2 text-left font-semibold">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === users.length && users.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-ink/20 accent-brand"
                        />
                      </th>
                      <th className="sticky top-0 z-10 whitespace-nowrap bg-ink/[0.02] px-3 py-2 text-left font-semibold">
                        Email
                      </th>
                      <th className="sticky top-0 z-10 whitespace-nowrap bg-ink/[0.02] px-3 py-2 text-left font-semibold">
                        Role
                      </th>
                      <th className="sticky top-0 z-10 whitespace-nowrap bg-ink/[0.02] px-3 py-2 text-left font-semibold">
                        Status
                      </th>
                      <th className="sticky top-0 z-10 whitespace-nowrap bg-ink/[0.02] px-3 py-2 text-left font-semibold">
                        Created
                      </th>
                      <th className="sticky top-0 z-10 whitespace-nowrap bg-ink/[0.02] px-3 py-2 text-left font-semibold">
                        Last Login
                      </th>
                      <th className="sticky top-0 z-10 whitespace-nowrap bg-ink/[0.02] px-3 py-2 text-left font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const isCurrentUser = currentUser?.id === user.id;
                      return (
                        <tr
                          key={user.id}
                          className={`border-b border-ink/[0.05] transition hover:bg-brand/[0.03] ${
                            selectedIds.has(user.id) ? "bg-brand/[0.05]" : ""
                          }`}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(user.id)}
                              onChange={() => toggleSelect(user.id)}
                              className="rounded border-ink/20 accent-brand"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => setDetailUser(user)}
                              className="font-medium text-brand hover:underline"
                            >
                              {user.email}
                            </button>
                          </td>
                          <td className="px-3 py-2">{getRoleBadge(user.role)}</td>
                          <td className="px-3 py-2">{getStatusBadge(user.status)}</td>
                          <td className="px-3 py-2 text-ink/60">{formatDate(user.createdAt)}</td>
                          <td className="px-3 py-2 text-ink/60">
                            {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1.5">
                              {user.status === "pending" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleApprove(user.id)}
                                    className="rounded-lg bg-success px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-success/90"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setConfirmAction({ type: "reject", userIds: [user.id], userEmail: user.email })
                                    }
                                    className="rounded-lg border border-ink/15 bg-surface px-2.5 py-1 text-xs font-semibold text-ink/70 transition hover:bg-ink/[0.04]"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {user.status === "active" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setDetailUser(user)}
                                    className="rounded-lg border border-ink/15 bg-surface px-2.5 py-1 text-xs font-semibold text-ink/70 transition hover:bg-ink/[0.04]"
                                  >
                                    Edit
                                  </button>
                                  {!isCurrentUser && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdate(user.id, user.role, "inactive").catch(() => {})
                                      }
                                      className="rounded-lg border border-danger/30 px-2.5 py-1 text-xs font-semibold text-danger transition hover:bg-danger/[0.06]"
                                    >
                                      Deactivate
                                    </button>
                                  )}
                                </>
                              )}
                              {user.status === "inactive" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdate(user.id, user.role, "active").catch(() => {})}
                                    className="rounded-lg bg-success px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-success/90"
                                  >
                                    Activate
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDetailUser(user)}
                                    className="rounded-lg border border-ink/15 bg-surface px-2.5 py-1 text-xs font-semibold text-ink/70 transition hover:bg-ink/[0.04]"
                                  >
                                    Edit
                                  </button>
                                </>
                              )}
                              {user.status === "rejected" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleApprove(user.id)}
                                    className="rounded-lg bg-success px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-success/90"
                                  >
                                    Approve
                                  </button>
                                  {!isCurrentUser && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setConfirmAction({ type: "delete", userIds: [user.id], userEmail: user.email })
                                      }
                                      className="rounded-lg bg-danger px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-danger/90"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => setDetailUser(user)}
                                className="rounded-lg border border-ink/15 bg-surface px-2.5 py-1 text-xs font-semibold text-ink/70 transition hover:bg-ink/[0.04]"
                              >
                                View
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-ink/[0.08] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
              <span className="text-xs text-ink/45">
                Showing {(filters.page! - 1) * PAGE_SIZE + 1}-
                {Math.min(filters.page! * PAGE_SIZE, total)} of {total} users
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilters({ page: Math.max(1, filters.page! - 1) })}
                  disabled={filters.page === 1}
                  className="rounded-lg border border-ink/10 bg-surface px-3 py-1.5 text-sm font-semibold text-ink/70 transition hover:border-brand/30 hover:text-brand disabled:pointer-events-none disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="flex items-center px-3 py-1.5 text-sm text-ink/60">
                  Page {filters.page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setFilters({ page: Math.min(totalPages, filters.page! + 1) })}
                  disabled={(filters.page ?? 1) >= totalPages}
                  className="rounded-lg border border-ink/10 bg-surface px-3 py-1.5 text-sm font-semibold text-ink/70 transition hover:border-brand/30 hover:text-brand disabled:pointer-events-none disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}

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
          onConfirm={async () => {
            if (confirmAction.type === "bulk-approve") {
              await handleBulkApprove();
            } else if (confirmAction.type === "bulk-reject") {
              await handleBulkReject();
            } else if (confirmAction.type === "bulk-delete") {
              await handleBulkDelete();
            } else if (confirmAction.type === "reject") {
              await handleReject(confirmAction.userIds[0]!);
            } else if (confirmAction.type === "delete") {
              await handleDelete(confirmAction.userIds[0]!);
            }
            setConfirmAction(null);
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
