"use client";

import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";

export function Header() {
  const { companyId, company, setCompanyId, companies } = useCompany();
  const { user, logout, isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-stone-200/80 bg-white/90 px-6 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90">
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <span className="text-sm font-medium text-stone-500 dark:text-stone-400">
            Company
          </span>
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
            aria-label="Select company or branch"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {company && (
          <span className="text-sm text-stone-500 dark:text-stone-400">
            Viewing data for {company.name}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {user && (
          <>
            <span className="text-sm text-stone-600 dark:text-stone-400" title={user.email}>
              {user.displayName || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}
              {isAdmin && (
                <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                  Admin
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg px-3 py-1.5 text-sm text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
            >
              Log out
            </button>
          </>
        )}
      </div>
    </header>
  );
}
