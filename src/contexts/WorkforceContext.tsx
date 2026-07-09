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
import * as connecteamApi from "@/lib/api/endpoints/connecteam";
import { getApiErrorMessage } from "@/lib/api/client";
import type { ConnecteamStatus, ConnecteamUsersMe } from "@/lib/workforce/types";
import { formatSyncAge } from "@/lib/workforce/format";

interface WorkforceContextValue {
  status: ConnecteamStatus | null;
  me: ConnecteamUsersMe | null;
  loading: boolean;
  error: string | null;
  syncSubtitle: string;
  refresh: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const WorkforceContext = createContext<WorkforceContextValue | null>(null);

export function WorkforceProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnecteamStatus | null>(null);
  const [me, setMe] = useState<ConnecteamUsersMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const s = await connecteamApi.getConnecteamStatus();
      setStatus(s);
      setError(null);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load workforce status"));
      setStatus(null);
    }
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const m = await connecteamApi.getConnecteamUsersMe();
      setMe(m);
    } catch {
      setMe({ linked: false, connecteamUser: null });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([connecteamApi.getConnecteamStatus(), connecteamApi.getConnecteamUsersMe()])
      .then(([s, m]) => {
        if (cancelled) return;
        setStatus(s);
        setMe(m);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(getApiErrorMessage(e, "Failed to load workforce"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const syncSubtitle = useMemo(() => {
    if (!status?.ready) return "Workforce module";
    const age = formatSyncAge(status.lastSyncAt);
    return `Mirror synced ${age}`;
  }, [status]);

  const value: WorkforceContextValue = {
    status,
    me,
    loading,
    error,
    syncSubtitle,
    refresh: async () => {
      await refresh();
      await refreshMe();
    },
    refreshMe,
  };

  return <WorkforceContext.Provider value={value}>{children}</WorkforceContext.Provider>;
}

export function useWorkforce() {
  const ctx = useContext(WorkforceContext);
  if (!ctx) throw new Error("useWorkforce must be used within WorkforceProvider");
  return ctx;
}
