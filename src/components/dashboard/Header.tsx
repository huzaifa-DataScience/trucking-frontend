"use client";

import { useCallback, useEffect, useRef } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { roleLabel } from "@/lib/auth/roles";

function userInitialsFromAuth(user: ReturnType<typeof useAuth>["user"]): string {
  if (!user) return "?";
  const f = user.firstName?.[0];
  const l = user.lastName?.[0];
  if (f && l) return `${f}${l}`.toUpperCase();
  const parts = user.displayName?.split(/\s+/).filter(Boolean) ?? [];
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
  return user.email.slice(0, 2).toUpperCase();
}

export function Header() {
  const { companyId, company, setCompanyId, companies } = useCompany();
  const { user, logout } = useAuth();
  const searchRef = useRef<HTMLInputElement>(null);

  const focusSearch = useCallback(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        focusSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusSearch]);

  return (
    <header className="sticky top-0 z-30 border-b border-ink/[0.06] bg-surface/75 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset] backdrop-blur-xl">
      <div className="mx-auto grid h-[3.75rem] w-full max-w-[1600px] grid-cols-1 items-center gap-3 px-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,28rem)_minmax(0,1fr)] sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <label className="flex min-w-0 flex-1 items-center gap-2 sm:flex-initial">
            <span className="hidden text-xs font-medium uppercase tracking-wide text-ink/40 sm:inline">
              Company
            </span>
            <select
              value={companyId ?? "all"}
              onChange={(e) => setCompanyId(e.target.value === "all" ? null : e.target.value)}
              className="min-w-0 max-w-full flex-1 rounded-xl border border-ink/10 bg-[#f8f9fb] px-3 py-2 text-sm font-medium text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 sm:max-w-[220px] sm:flex-none"
              aria-label="Select company or branch"
            >
              <option value="all">All companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {company ? (
            <span className="hidden truncate text-xs text-ink/45 lg:inline lg:max-w-[200px]" title={company.name}>
              {company.name}
            </span>
          ) : null}
        </div>

        <div className="relative order-first sm:order-none">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" aria-hidden>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
          </span>
          <input
            ref={searchRef}
            type="search"
            placeholder="Search jobs, tickets, materials…"
            className="w-full rounded-full border border-ink/10 bg-[#f8f9fb] py-2 pl-9 pr-16 text-sm text-ink placeholder:text-ink/35 outline-none transition focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/15"
            aria-label="Search"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-ink/10 bg-surface px-1.5 py-0.5 font-mono text-[10px] font-medium text-ink/40 sm:inline">
            ⌘K
          </kbd>
        </div>

        <div className="flex items-center justify-end gap-2 sm:gap-3">
          {user ? (
            <>
              <div className="hidden h-9 w-px bg-ink/10 sm:block" aria-hidden />
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white sm:h-10 sm:w-10 sm:text-xs"
                style={{
                  background: "linear-gradient(135deg, var(--brand) 0%, var(--brand-secondary) 100%)",
                }}
                title={user.email}
              >
                {userInitialsFromAuth(user)}
              </div>
              <div className="hidden min-w-0 flex-col sm:flex">
                <span className="truncate text-sm font-semibold text-ink">
                  {user.displayName ||
                    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
                    user.email}
                </span>
                <span className="text-xs text-ink/40">
                  {roleLabel(user.role)}
                </span>
              </div>
              <button
                type="button"
                onClick={logout}
                className="rounded-xl px-3 py-2 text-sm font-medium text-ink/60 transition hover:bg-ink/[0.05] hover:text-ink"
              >
                Log out
              </button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
