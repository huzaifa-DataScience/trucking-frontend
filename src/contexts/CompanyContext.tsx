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
import type { Company } from "@/lib/types";
import * as lookupsApi from "@/lib/api/endpoints/lookups";

const STORAGE_KEY = "construction-logistics-company-id";

function getStoredCompanyId(): string | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(STORAGE_KEY);
  if (!v || v === "all") return null;
  return v;
}

interface CompanyContextValue {
  /** Selected "our entity" id; null means "All". */
  companyId: string | null;
  company: Company | null;
  setCompanyId: (id: string | null) => void;
  companies: readonly Company[];
}

const CompanyContext = createContext<CompanyContextValue | null>(null);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyIdState] = useState<string | null>(null);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  const [companiesLoading, setCompaniesLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCompanies() {
      setCompaniesLoading(true);
      setCompaniesError(null);
      try {
        // Helps confirm whether we are actually attempting the request.
        // Remove later if you want.
        // eslint-disable-next-line no-console
        console.log("[CompanyContext] Loading /lookups/our-entities");
        const items = await lookupsApi.getOurEntities();
        if (cancelled) return;
        const mapped: Company[] = items.map((i) => ({
          id: String(i.id),
          name: i.name,
        }));
        setCompanies(mapped);

        const stored = getStoredCompanyId();
        const validStored =
          stored && mapped.some((c) => c.id === stored) ? stored : null;
        const initialId = validStored ?? null; // default to "All"
        setCompanyIdState(initialId);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, initialId ?? "all");
        }
      } catch {
        // If the lookup fails, leave companies empty and companyId unset.
        // eslint-disable-next-line no-console
        console.error("[CompanyContext] Failed to load /lookups/our-entities");
        setCompaniesError("Failed to load company list.");
      } finally {
        if (!cancelled) setCompaniesLoading(false);
      }
    }

    loadCompanies();
    return () => {
      cancelled = true;
    };
  }, []);

  const setCompanyId = useCallback((id: string | null) => {
    setCompanyIdState(id);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, id ?? "all");
  }, []);

  const company = useMemo(
    () => (companyId ? companies.find((c) => c.id === companyId) ?? null : null),
    [companies, companyId]
  );

  const value = useMemo<CompanyContextValue>(
    () => ({
      companyId,
      company,
      setCompanyId,
      companies,
    }),
    [companyId, company, setCompanyId, companies]
  );

  return (
    <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
  );
}

export function useCompany(): CompanyContextValue {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany must be used within CompanyProvider");
  return ctx;
}
