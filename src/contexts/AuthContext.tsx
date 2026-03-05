"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getProfile } from "@/lib/api/endpoints/auth";
import {
  getAccessToken,
  setAuth as storeSetAuth,
  clearAuth as storeClearAuth,
  getStoredUser,
  setSessionCookie,
} from "@/lib/auth/store";
import type { AuthUser } from "@/lib/auth/types";
import type { LoginResponse } from "@/lib/auth/types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAdmin: boolean;
  /** Current user's permissions (e.g. tickets:read, admin:users). Empty when not logged in. */
  permissions: string[];
  loginSuccess: (data: LoginResponse) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loginSuccess = useCallback((data: LoginResponse) => {
    storeSetAuth(data.access_token, data.user);
    setUser(data.user);
    setSessionCookie();
  }, []);

  const logout = useCallback(() => {
    storeClearAuth();
    setUser(null);
    if (typeof window !== "undefined") window.location.href = "/login";
  }, []);

  const refreshUser = useCallback(async () => {
    const profile = await getProfile();
    setUser(profile);
    if (profile) setSessionCookie();
  }, []);

  useEffect(() => {
    const token = typeof window !== "undefined" ? getAccessToken() : null;
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    setUser(getStoredUser());
    getProfile()
      .then((profile) => {
        setUser(profile);
        if (profile) setSessionCookie();
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAdmin: user?.role === "admin",
      permissions: user?.permissions ?? [],
      loginSuccess,
      logout,
      refreshUser,
    }),
    [user, loading, loginSuccess, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
