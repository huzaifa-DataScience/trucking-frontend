"use client";

import { useAuth } from "@/contexts/AuthContext";
import { hasPermission, type Permission } from "@/lib/auth/permissions";

export function usePermission() {
  const { permissions, isAdmin } = useAuth();

  return {
    can: (permission: Permission) =>
      hasPermission(permissions, permission, { isAdmin }),
    isAdmin,
    permissions,
  };
}
