"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { getProjectFinancialsFilters } from "@/lib/api/endpoints/project-financials";
import { DEMO_FILTERS, PROJECT_FINANCIALS_USE_DEMO } from "@/lib/project-financials/demo-data";
import type { FinancialsFilters, FinancialsQuery } from "@/lib/project-financials/types";
import { useFinancialsQuery } from "@/components/project-financials/useFinancialsQuery";

const fieldClass =
  "h-10 rounded-lg border border-ink/10 bg-white/80 px-3 text-sm text-ink shadow-[0_4px_12px_rgba(255,123,17,0.06)] outline-none backdrop-blur-sm focus:border-brand/40";

export function FinancialsChrome({
  screen,
  asOf,
  children,
}: {
  screen: "summary" | "jobs";
  asOf?: string;
  children: React.ReactNode;
}) {
  const { query, setQuery, queryString } = useFinancialsQuery();
  const [filters, setFilters] = useState<FinancialsFilters | null>(null);
  const [searchDraft, setSearchDraft] = useState(query.search ?? "");

  useEffect(() => {
    setSearchDraft(query.search ?? "");
  }, [query.search]);

  useEffect(() => {
    if (PROJECT_FINANCIALS_USE_DEMO) {
      setFilters(DEMO_FILTERS);
      return;
    }
    void getProjectFinancialsFilters()
      .then(setFilters)
      .catch(() =>
        setFilters({ companies: [], views: ["active", "all"], alerts: ["fix", "not_in_siteline", "any"], pms: [] })
      );
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if ((query.search ?? "") === searchDraft.trim()) return;
      setQuery({ search: searchDraft.trim() || undefined });
    }, 350);
    return () => window.clearTimeout(handle);
  }, [searchDraft, query.search, setQuery]);

  const summaryHref = queryString ? `/project-financials?${queryString}` : "/project-financials";
  const jobsHref = queryString ? `/project-financials/jobs?${queryString}` : "/project-financials/jobs";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Project financials</h1>
          <p className="mt-0.5 text-sm text-ink/50">
            {PROJECT_FINANCIALS_USE_DEMO ? "Demo book" : "Awarded job book"}
            {asOf ? <span className="text-ink/40"> · as of {asOf}</span> : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Company"
            className={fieldClass}
            value={query.entityId ? String(query.entityId) : ""}
            onChange={(e) =>
              setQuery({ entityId: e.target.value ? Number(e.target.value) : undefined })
            }
          >
            <option value="">All companies</option>
            {(filters?.companies ?? []).map((c) => (
              <option key={c.entityId} value={c.entityId}>
                {c.company}
              </option>
            ))}
          </select>
          <select
            aria-label="Project manager"
            className={`${fieldClass} max-w-[14rem]`}
            value={query.pm ?? ""}
            onChange={(e) => setQuery({ pm: e.target.value || undefined })}
          >
            <option value="">All PMs</option>
            {(filters?.pms ?? []).map((pm) => (
              <option key={pm} value={pm}>
                {pm}
              </option>
            ))}
          </select>
          <select
            aria-label="Alerts"
            className={fieldClass}
            value={query.alert ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              setQuery({
                alert: value === "fix" || value === "not_in_siteline" || value === "any" ? value : undefined,
              });
            }}
          >
            <option value="">All alerts</option>
            <option value="fix">FIX</option>
            <option value="not_in_siteline">NOT IN SITELINE</option>
            <option value="any">Any</option>
          </select>
          <input
            aria-label="Search jobs"
            className={`${fieldClass} w-52`}
            placeholder="Job, name, customer…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
          <div className="flex h-10 items-center rounded-lg border border-ink/10 bg-white/80 p-1 shadow-[0_4px_12px_rgba(255,123,17,0.06)]">
            {(
              [
                ["active", "Active"],
                ["all", "All"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setQuery({ view: value })}
                className={`h-8 rounded-md px-3 text-xs font-semibold ${
                  query.view === value ? "bg-ink text-white" : "text-ink/50 hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-5 border-b border-ink/[0.08]">
        <Tab href={summaryHref} active={screen === "summary"}>
          Summary
        </Tab>
        <Tab href={jobsHref} active={screen === "jobs"}>
          Job book
        </Tab>
      </div>

      {children}
    </div>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`relative pb-2.5 text-sm ${active ? "font-semibold text-ink" : "font-medium text-ink/50 hover:text-ink"}`}
    >
      {children}
      {active ? <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" /> : null}
    </Link>
  );
}

export function queryToSearch(query: FinancialsQuery): string {
  const params = new URLSearchParams();
  if (query.entityId) params.set("entityId", String(query.entityId));
  if (query.pm) params.set("pm", query.pm);
  if (query.search) params.set("search", query.search);
  if (query.view === "all") params.set("view", "all");
  if (query.alert) params.set("alert", query.alert);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
