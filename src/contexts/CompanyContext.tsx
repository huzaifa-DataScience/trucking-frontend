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
  return localStorage.getItem(STORAGE_KEY);
}

interface CompanyContextValue {
  companyId: string;
  company: Company | null;
  setCompanyId: (id: string) => void;
  companies: readonly Company[];
}

const CompanyContext = createContext<CompanyContextValue | null>(null);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyIdState] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function loadCompanies() {
      try {
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
        const initialId = validStored ?? mapped[0]?.id ?? "";
        if (initialId) {
          setCompanyIdState(initialId);
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY, initialId);
          }
        }
      } catch {
        // If the lookup fails, leave companies empty and companyId unset.
      }
    }

    loadCompanies();
    return () => {
      cancelled = true;
    };
  }, []);

  const setCompanyId = useCallback((id: string) => {
    setCompanyIdState(id);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const company = useMemo(
    () => companies.find((c) => c.id === companyId) ?? null,
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
