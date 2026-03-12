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
import { AUTH_DISABLED } from "@/lib/auth/config";
import type { AuthUser } from "@/lib/auth/types";
import type { LoginResponse } from "@/lib/auth/types";

const GUEST_USER: AuthUser = {
  id: 0,
  firstName: "Guest",
  lastName: "",
  email: "",
  phone: null,
  company: null,
  role: "user",
  status: "active",
  permissions: [],
};

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
    if (AUTH_DISABLED) return;
    storeClearAuth();
    setUser(null);
    if (typeof window !== "undefined") window.location.href = "/login";
  }, []);

  const refreshUser = useCallback(async () => {
    const profile = await getProfile();
    if (profile) {
      setUser(profile);
      setSessionCookie();
    }
  }, []);

  useEffect(() => {
    if (AUTH_DISABLED) {
      setUser(GUEST_USER);
      setLoading(false);
      return;
    }
    const token = typeof window !== "undefined" ? getAccessToken() : null;
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    const stored = getStoredUser();
    setUser(stored);
    getProfile()
      .then((profile) => {
        if (profile) {
          setUser(profile);
          setSessionCookie();
        }
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
