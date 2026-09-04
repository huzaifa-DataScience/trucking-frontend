"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { roleLabel } from "@/lib/auth/roles";
import { getBaseUrl } from "@/lib/api/config";
import { uploadAvatar, deleteAvatar } from "@/lib/api/endpoints/auth";
import { getJobTickets } from "@/lib/api/endpoints/job-dashboard";
import type { ApiTicketRow } from "@/lib/api/types";
import { useLookups } from "@/hooks/useLookups";

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

function AvatarCircle({
  user,
  size = "sm",
}: {
  user: ReturnType<typeof useAuth>["user"];
  size?: "sm" | "lg";
}) {
  const dims = size === "lg" ? "h-14 w-14 text-base" : "h-9 w-9 text-[11px] sm:h-10 sm:w-10 sm:text-xs";
  if (user?.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`${getBaseUrl()}${user.avatarUrl}`}
        alt=""
        className={`${dims} shrink-0 rounded-full object-cover ring-2 ring-white/80`}
      />
    );
  }
  return (
    <div
      className={`flex ${dims} shrink-0 items-center justify-center rounded-full font-bold text-white`}
      style={{ background: "linear-gradient(135deg, var(--brand) 0%, var(--brand-secondary) 100%)" }}
      aria-hidden
    >
      {userInitialsFromAuth(user)}
    </div>
  );
}

export function Header() {
  const { companyId, company, setCompanyId, companies } = useCompany();
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const { jobs: allJobs, materials: allMaterials } = useLookups(companyId ?? undefined);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ApiTicketRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);

  const focusSearch = useCallback(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        focusSearch();
      }
      if (e.key === "Escape") {
        setMenuOpen(false);
        setResultsOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusSearch]);

  useEffect(() => {
    if (!resultsOpen) return;
    const onClick = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setResultsOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [resultsOpen]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      getJobTickets(
        { companyId: companyId ?? undefined, entityId: companyId ?? undefined },
        { search: term, pageSize: 8 }
      )
        .then((res) => setResults(res.items))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query, companyId]);

  const goToTicket = useCallback(
    (ticketNumber: string) => {
      setResultsOpen(false);
      setQuery("");
      router.push(`/job?ticket=${encodeURIComponent(ticketNumber)}`);
    },
    [router]
  );

  const goToJob = useCallback(
    (jobId: number) => {
      setResultsOpen(false);
      setQuery("");
      router.push(`/job?jobId=${jobId}`);
    },
    [router]
  );

  const goToMaterial = useCallback(
    (materialId: number) => {
      setResultsOpen(false);
      setQuery("");
      router.push(`/material?materialId=${materialId}`);
    },
    [router]
  );

  const goToAllResults = useCallback(() => {
    const term = query.trim();
    if (!term) return;
    setResultsOpen(false);
    router.push(`/job?q=${encodeURIComponent(term)}`);
  }, [query, router]);

  const trimmedQuery = query.trim();
  const jobMatches =
    trimmedQuery.length >= 2
      ? allJobs.filter((j) => j.name.toLowerCase().includes(trimmedQuery.toLowerCase())).slice(0, 4)
      : [];
  const materialMatches =
    trimmedQuery.length >= 2
      ? allMaterials.filter((m) => m.name.toLowerCase().includes(trimmedQuery.toLowerCase())).slice(0, 4)
      : [];
  const hasAnyMatches = jobMatches.length > 0 || materialMatches.length > 0 || results.length > 0;

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const handlePickPhoto = useCallback(() => {
    setPhotoError(null);
    fileInputRef.current?.click();
  }, []);

  const handlePhotoSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      setPhotoBusy(true);
      setPhotoError(null);
      try {
        await uploadAvatar(file);
        await refreshUser();
      } catch (err) {
        setPhotoError(err instanceof Error ? err.message : "Couldn't upload photo.");
      } finally {
        setPhotoBusy(false);
      }
    },
    [refreshUser]
  );

  const handleRemovePhoto = useCallback(async () => {
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      await deleteAvatar();
      await refreshUser();
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Couldn't remove photo.");
    } finally {
      setPhotoBusy(false);
    }
  }, [refreshUser]);

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

        <div className="relative order-first sm:order-none" ref={searchBoxRef}>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" aria-hidden>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
          </span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setResultsOpen(true);
            }}
            onFocus={() => setResultsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (jobMatches.length > 0) goToJob(jobMatches[0]!.id);
                else if (materialMatches.length > 0) goToMaterial(materialMatches[0]!.id);
                else if (results.length > 0) goToTicket(results[0]!.ticketNumber);
                else goToAllResults();
              }
            }}
            placeholder="Search jobs, tickets, materials…"
            className="w-full rounded-full border border-ink/10 bg-[#f8f9fb] py-2 pl-9 pr-16 text-sm text-ink placeholder:text-ink/35 outline-none transition focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/15"
            aria-label="Search"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-ink/10 bg-surface px-1.5 py-0.5 font-mono text-[10px] font-medium text-ink/40 sm:inline">
            ⌘K
          </kbd>

          {resultsOpen && trimmedQuery.length >= 2 ? (
            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-2xl border border-ink/10 bg-surface shadow-[0_16px_40px_-12px_rgba(0,0,0,0.25)]">
              {searching && !hasAnyMatches ? (
                <div className="px-4 py-3 text-sm text-ink/45">Searching…</div>
              ) : !hasAnyMatches ? (
                <div className="px-4 py-3 text-sm text-ink/45">No jobs, tickets, or materials matched “{trimmedQuery}”.</div>
              ) : (
                <div className="max-h-96 overflow-y-auto py-1.5">
                  {jobMatches.length > 0 ? (
                    <div className="mb-1">
                      <p className="px-4 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-ink/35">Jobs</p>
                      {jobMatches.map((j) => (
                        <button
                          key={j.id}
                          type="button"
                          onClick={() => goToJob(j.id)}
                          className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-ink transition hover:bg-ink/[0.04]"
                        >
                          <svg className="h-4 w-4 shrink-0 text-ink/35" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                            <path d="M3 7l2-3h5l2 3h9v11a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span className="truncate">{j.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {materialMatches.length > 0 ? (
                    <div className="mb-1">
                      <p className="px-4 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-ink/35">Materials</p>
                      {materialMatches.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => goToMaterial(m.id)}
                          className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-ink transition hover:bg-ink/[0.04]"
                        >
                          <svg className="h-4 w-4 shrink-0 text-ink/35" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                            <path d="M21 16.5V7.5L12 3 3 7.5v9L12 21l9-4.5z" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M3 7.5l9 4.5 9-4.5M12 12v9" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span className="truncate">{m.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {results.length > 0 ? (
                    <div>
                      <p className="px-4 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-ink/35">Tickets</p>
                      {results.map((t) => (
                        <button
                          key={t.ticketNumber}
                          type="button"
                          onClick={() => goToTicket(t.ticketNumber)}
                          className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-ink/[0.04]"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-brand">{t.ticketNumber}</span>
                            <span className="block truncate text-xs text-ink/50">
                              {t.jobName} · {t.material}
                            </span>
                          </span>
                          <span className="shrink-0 truncate text-xs text-ink/35">{t.haulingCompany}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
              {!searching && results.length > 0 ? (
                <button
                  type="button"
                  onClick={goToAllResults}
                  className="block w-full border-t border-ink/[0.06] px-4 py-2.5 text-left text-sm font-medium text-brand transition hover:bg-ink/[0.04]"
                >
                  See all ticket results for “{trimmedQuery}” →
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 sm:gap-3">
          {user ? (
            <>
              <div className="hidden h-9 w-px bg-ink/10 sm:block" aria-hidden />
              <div className="relative flex items-center" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-1 rounded-full p-1"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Account menu"
                title={user.displayName || user.email}
              >
                <AvatarCircle user={user} />
                <svg
                  className={`h-3.5 w-3.5 shrink-0 text-ink/35 transition-transform ${menuOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+0.5rem)] w-72 overflow-hidden rounded-2xl border border-ink/10 bg-surface shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18)]"
                >
                  <div className="flex items-center gap-3 border-b border-ink/[0.06] p-4">
                    <AvatarCircle user={user} size="lg" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {user.displayName ||
                          [user.firstName, user.lastName].filter(Boolean).join(" ") ||
                          user.email}
                      </p>
                      <p className="truncate text-xs text-ink/45">{user.email}</p>
                      <p className="mt-0.5 text-xs font-medium text-brand">{roleLabel(user.role)}</p>
                    </div>
                  </div>

                  <div className="p-2">
                    <button
                      type="button"
                      onClick={handlePickPhoto}
                      disabled={photoBusy}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-ink transition hover:bg-ink/[0.05] disabled:opacity-50"
                    >
                      <svg className="h-4 w-4 text-ink/45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                        <rect x="3" y="5" width="18" height="14" rx="2" />
                        <circle cx="9" cy="11" r="2" />
                        <path d="M21 16l-5.2-5.2a2 2 0 00-2.8 0L5 19" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {photoBusy ? "Uploading…" : user.avatarUrl ? "Change photo" : "Add photo"}
                    </button>
                    {user.avatarUrl ? (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        disabled={photoBusy}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-ink/60 transition hover:bg-ink/[0.05] hover:text-ink disabled:opacity-50"
                      >
                        <svg className="h-4 w-4 text-ink/45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                          <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Remove photo
                      </button>
                    ) : null}
                    {photoError ? (
                      <p className="px-3 py-1.5 text-xs text-danger">{photoError}</p>
                    ) : null}
                  </div>

                  <div className="border-t border-ink/[0.06] p-2">
                    <button
                      type="button"
                      onClick={logout}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold text-ink transition hover:bg-ink/[0.05]"
                    >
                      <svg className="h-4 w-4 text-ink/45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                        <path
                          d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Log out
                    </button>
                  </div>
                </div>
              ) : null}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handlePhotoSelected}
              />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
