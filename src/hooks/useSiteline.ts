"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  SitelineCompany,
  SitelineContract,
  SitelineError,
  SitelinePayApp,
  SitelineStatus,
} from "@/lib/api/endpoints/siteline";
import {
  getSitelineStatus,
  getSitelineCompany,
  getSitelineContracts,
  getSitelineContract,
  getSitelinePayApp,
} from "@/lib/api/endpoints/siteline";

function isError<T>(
  value: T | SitelineError
): value is SitelineError {
  return (
    value !== null &&
    typeof value === "object" &&
    ("error" in value || (value as SitelineError).configured === false)
  );
}

export function useSitelineStatus() {
  const [status, setStatus] = useState<SitelineStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSitelineStatus();
      if (isError(data)) {
        setStatus({ configured: false, message: (data as SitelineError).message ?? "Not configured" });
        setError((data as SitelineError).error ?? (data as SitelineError).message ?? null);
      } else {
        setStatus(data);
      }
    } catch (e) {
      setStatus({ configured: false, message: "Failed to load" });
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { status, error, loading, refetch };
}

export function useSitelineCompany(enabled: boolean) {
  const [company, setCompany] = useState<SitelineCompany | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getSitelineCompany();
      if (isError(data)) {
        setCompany(null);
        setError((data as SitelineError).error ?? (data as SitelineError).message ?? "Failed to load company");
      } else {
        setCompany(data);
      }
    } catch (e) {
      setCompany(null);
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { company, error, loading, refetch };
}

export function useSitelineContracts(enabled: boolean) {
  const [contracts, setContracts] = useState<SitelineContract[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getSitelineContracts();
      if (isError(data)) {
        setContracts([]);
        setError((data as SitelineError).error ?? (data as SitelineError).message ?? "Failed to load contracts");
      } else {
        setContracts(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      setContracts([]);
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { contracts, error, loading, refetch };
}

export function useSitelineContract(contractId: string | null, enabled: boolean) {
  const [contract, setContract] = useState<SitelineContract | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!enabled || !contractId) {
      setContract(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getSitelineContract(contractId);
      if (isError(data)) {
        setContract(null);
        setError((data as SitelineError).error ?? "Contract not found");
      } else {
        setContract(data ?? null);
      }
    } catch (e) {
      setContract(null);
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [enabled, contractId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { contract, error, loading, refetch };
}

export function useSitelinePayApp(payAppId: string | null, enabled: boolean) {
  const [payApp, setPayApp] = useState<SitelinePayApp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!enabled || !payAppId) {
      setPayApp(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getSitelinePayApp(payAppId);
      if (isError(data)) {
        setPayApp(null);
        setError((data as SitelineError).error ?? "Pay app not found");
      } else {
        setPayApp(data ?? null);
      }
    } catch (e) {
      setPayApp(null);
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [enabled, payAppId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { payApp, error, loading, refetch };
}
