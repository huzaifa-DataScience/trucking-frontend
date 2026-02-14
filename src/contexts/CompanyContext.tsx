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
import { COMPANIES } from "@/lib/config/companies";
import type { Company } from "@/lib/types";

const STORAGE_KEY = "construction-logistics-company-id";
const DEFAULT_ID = COMPANIES[0]!.id;

function getStoredCompanyId(): string {
  if (typeof window === "undefined") return DEFAULT_ID;
  const stored = localStorage.getItem(STORAGE_KEY);
  const valid = COMPANIES.some((c) => c.id === stored);
  return valid ? stored! : DEFAULT_ID;
}

interface CompanyContextValue {
  companyId: string;
  company: Company | null;
  setCompanyId: (id: string) => void;
  companies: readonly Company[];
}

const CompanyContext = createContext<CompanyContextValue | null>(null);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companyId, setCompanyIdState] = useState<string>(() => DEFAULT_ID);

  useEffect(() => {
    const stored = getStoredCompanyId();
    setCompanyIdState(stored);
  }, []);

  const setCompanyId = useCallback((id: string) => {
    setCompanyIdState(id);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const company = useMemo(
    () => COMPANIES.find((c) => c.id === companyId) ?? null,
    [companyId]
  );

  const value = useMemo<CompanyContextValue>(
    () => ({
      companyId,
      company,
      setCompanyId,
      companies: COMPANIES,
    }),
    [companyId, company, setCompanyId]
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
