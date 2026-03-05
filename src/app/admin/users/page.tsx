"use client";

import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { UserDetailModal } from "@/components/admin/UserDetailModal";
import * as adminApi from "@/lib/api/endpoints/admin";
import type { AdminUser, UserFilters, UserStatus, UserRole } from "@/lib/admin/types";
import { useAuth } from "@/contexts/AuthContext";

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

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [filters, setFilters] = useUrlFilters();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);
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

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getUsers(filters);
      setUsers(data.items);
      setTotal(data.total);
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
  }, [filters, showToast]);

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
    const styles = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200",
      active: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200",
      inactive: "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
    };
    return (
      <span className={`rounded px-2 py-1 text-xs font-medium ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getRoleBadge = (role: UserRole) => {
    return (
      <span
        className={`rounded px-2 py-1 text-xs font-medium ${
          role === "admin"
            ? "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200"
            : "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
        }`}
      >
        {role === "admin" ? "Admin" : "User"}
      </span>
    );
  };

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
      <div>
        <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">User Management</h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Manage users, approve signups, and control access.
        </p>
      </div>

      {/* Filters */}
      <div className="sticky top-14 z-20 -mx-6 -mt-6 flex flex-wrap items-end gap-4 border-b border-stone-200/80 bg-white/95 px-6 py-4 backdrop-blur dark:border-stone-800 dark:bg-stone-950/95">
        <div className="flex flex-wrap items-end gap-4 flex-1">
          <label className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Search</span>
            <input
              type="text"
              placeholder="Search by email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Status</span>
            <select
              value={filters.status || "all"}
              onChange={(e) => setFilters({ status: e.target.value as UserStatus | "all" })}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Role</span>
            <select
              value={filters.role || "all"}
              onChange={(e) => setFilters({ role: e.target.value as UserRole | "all" })}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            >
              <option value="all">All</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Start Date</span>
            <input
              type="date"
              value={filters.startDate || ""}
              onChange={(e) => setFilters({ startDate: e.target.value || undefined })}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">End Date</span>
            <input
              type="date"
              value={filters.endDate || ""}
              onChange={(e) => setFilters({ endDate: e.target.value || undefined })}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            />
          </label>
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setFilters({ status: "all", role: "all", search: undefined, startDate: undefined, endDate: undefined });
              }}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Clear Filters ({activeFiltersCount})
            </button>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/50">
          <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
            {selectedIds.size} user(s) selected
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmAction({ type: "bulk-approve", userIds: Array.from(selectedIds) })}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
            >
              Approve Selected
            </button>
            <button
              type="button"
              onClick={() => setConfirmAction({ type: "bulk-reject", userIds: Array.from(selectedIds) })}
              className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700"
            >
              Reject Selected
            </button>
            <button
              type="button"
              onClick={() => setConfirmAction({ type: "bulk-delete", userIds: Array.from(selectedIds) })}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
          {error.message}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      )}

      {!loading && users.length === 0 && (
        <div className="rounded-lg border border-stone-200 bg-white px-6 py-12 text-center dark:border-stone-800 dark:bg-stone-900/50">
          <p className="text-stone-600 dark:text-stone-400">No users found</p>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-500">Try adjusting your filters</p>
        </div>
      )}

      {!loading && users.length > 0 && (
        <>
          <div className="rounded-xl border border-stone-200/80 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900/50">
            <div className="overflow-x-auto overscroll-x-contain -mx-1 px-1 sm:mx-0 sm:px-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/50">
                      <th className="sticky top-0 z-10 whitespace-nowrap bg-stone-50 px-3 py-2 text-left text-xs font-medium text-stone-600 dark:bg-stone-800/50 dark:text-stone-400">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === users.length && users.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-stone-300"
                        />
                      </th>
                      <th className="sticky top-0 z-10 whitespace-nowrap bg-stone-50 px-3 py-2 text-left text-xs font-medium text-stone-600 dark:bg-stone-800/50 dark:text-stone-400">
                        Email
                      </th>
                      <th className="sticky top-0 z-10 whitespace-nowrap bg-stone-50 px-3 py-2 text-left text-xs font-medium text-stone-600 dark:bg-stone-800/50 dark:text-stone-400">
                        Role
                      </th>
                      <th className="sticky top-0 z-10 whitespace-nowrap bg-stone-50 px-3 py-2 text-left text-xs font-medium text-stone-600 dark:bg-stone-800/50 dark:text-stone-400">
                        Status
                      </th>
                      <th className="sticky top-0 z-10 whitespace-nowrap bg-stone-50 px-3 py-2 text-left text-xs font-medium text-stone-600 dark:bg-stone-800/50 dark:text-stone-400">
                        Created
                      </th>
                      <th className="sticky top-0 z-10 whitespace-nowrap bg-stone-50 px-3 py-2 text-left text-xs font-medium text-stone-600 dark:bg-stone-800/50 dark:text-stone-400">
                        Last Login
                      </th>
                      <th className="sticky top-0 z-10 whitespace-nowrap bg-stone-50 px-3 py-2 text-left text-xs font-medium text-stone-600 dark:bg-stone-800/50 dark:text-stone-400">
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
                          className={`border-b border-stone-100 hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-800/50 ${
                            selectedIds.has(user.id) ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                          }`}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(user.id)}
                              onChange={() => toggleSelect(user.id)}
                              className="rounded border-stone-300"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => setDetailUser(user)}
                              className="font-medium text-amber-600 hover:underline dark:text-amber-400"
                            >
                              {user.email}
                            </button>
                          </td>
                          <td className="px-3 py-2">{getRoleBadge(user.role)}</td>
                          <td className="px-3 py-2">{getStatusBadge(user.status)}</td>
                          <td className="px-3 py-2 text-stone-600 dark:text-stone-400">{formatDate(user.createdAt)}</td>
                          <td className="px-3 py-2 text-stone-600 dark:text-stone-400">
                            {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              {user.status === "pending" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleApprove(user.id)}
                                    className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setConfirmAction({ type: "reject", userIds: [user.id], userEmail: user.email })
                                    }
                                    className="rounded bg-orange-600 px-2 py-1 text-xs font-medium text-white hover:bg-orange-700"
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
                                    className="rounded border border-stone-300 px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300"
                                  >
                                    Edit
                                  </button>
                                  {!isCurrentUser && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdate(user.id, user.role, "inactive").catch(() => {})
                                      }
                                      className="rounded bg-gray-600 px-2 py-1 text-xs font-medium text-white hover:bg-gray-700"
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
                                    className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
                                  >
                                    Activate
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDetailUser(user)}
                                    className="rounded border border-stone-300 px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300"
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
                                    className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
                                  >
                                    Approve
                                  </button>
                                  {!isCurrentUser && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setConfirmAction({ type: "delete", userIds: [user.id], userEmail: user.email })
                                      }
                                      className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => setDetailUser(user)}
                                className="rounded border border-stone-300 px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300"
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
            <div className="flex flex-col gap-3 border-t border-stone-200/80 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 dark:border-stone-800">
              <span className="text-xs text-stone-500 dark:text-stone-400">
                Showing {(filters.page! - 1) * PAGE_SIZE + 1}-
                {Math.min(filters.page! * PAGE_SIZE, total)} of {total} users
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFilters({ page: Math.max(1, filters.page! - 1) })}
                  disabled={filters.page === 1}
                  className="rounded border border-stone-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-stone-600"
                >
                  Previous
                </button>
                <span className="flex items-center px-3 py-1.5 text-sm text-stone-600 dark:text-stone-400">
                  Page {filters.page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setFilters({ page: Math.min(totalPages, filters.page! + 1) })}
                  disabled={(filters.page ?? 1) >= totalPages}
                  className="rounded border border-stone-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-stone-600"
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
