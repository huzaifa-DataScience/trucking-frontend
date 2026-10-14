"use client";

import { useState } from "react";
import { buttonClasses } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { getClearstoryApiPayload } from "@/lib/api/endpoints/clearstory";
import { ApiError } from "@/lib/api/client";
import { CorOverviewContent } from "@/components/clearstory/CorOverviewSummary";
import { CorContractSummaryResult, GenericResult, RateResult } from "@/components/clearstory/ClearstoryRateResult";

import { SortedOptions } from "@/components/ui/SortedOptions";
const RATE_TYPES = ["labor", "material", "equipment", "other"] as const;

type Mode = "company" | "project" | "overview" | "contract_summary";

const MODES: { value: Mode; label: string; action: string }[] = [
  { value: "company", label: "Company rate", action: "Load rates" },
  { value: "project", label: "Project rate", action: "Load rates" },
  { value: "overview", label: "COR overview", action: "Load overview" },
  { value: "contract_summary", label: "COR contract summary", action: "Load summary" },
];

const LABEL = "mb-1.5 block text-[13px] font-medium text-ink-muted";

function SelectChevron() {
  return (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** What went wrong (title) and what the user can do about it (hint). */
type RateError = { title: string; hint: string };

/** Turns a failed lookup into plain words, using what the user typed. */
function describeRateError(
  e: unknown,
  ctx: { mode: Mode; rateType: string; projectId: string; recordId: string; inbox: "sent" | "received" }
): RateError {
  const type = capitalize(ctx.rateType);
  if (!(e instanceof ApiError)) {
    return {
      title: "Can't reach the server",
      hint: "Check your internet connection, then try again. If other pages load fine, the server may be restarting; wait a minute.",
    };
  }
  if (e.status === 403) {
    return { title: "You don't have access to Clearstory rates", hint: "Ask an admin to give your account access." };
  }
  if (e.status === 502 || e.status === 503 || e.status === 504) {
    return {
      title: "Clearstory didn't answer",
      hint: "Clearstory may be busy or down for a moment. Try again in a minute.",
    };
  }
  if (e.status === 404) {
    if (ctx.mode === "project") {
      return {
        title: `No ${type.toLowerCase()} rate ${ctx.recordId} found for project ${ctx.projectId}`,
        hint: "Check the project ID (Clearstory › Projects, first column) and the record ID. Project rates only show here once the Clearstory sync has saved them.",
      };
    }
    if (ctx.mode === "company") {
      return {
        title: `No ${type.toLowerCase()} rate with record ID ${ctx.recordId}`,
        hint: `Check the number, and that the rate type is right: a material record ID won't be found under ${type}. Rates added in Clearstory today appear after the next sync.`,
      };
    }
    return {
      title: `No ${ctx.mode === "overview" ? "COR overview" : "contract summary"} for the ${ctx.inbox} inbox yet`,
      hint: "It's filled in by the Clearstory sync. Try the other inbox, or check again after the next sync.",
    };
  }
  return {
    title: "Something went wrong loading this",
    hint: "Try again. If it keeps happening, tell the team what you entered so they can look into it.",
  };
}

export default function ClearstoryRatesPage() {
  const [mode, setMode] = useState<Mode>("company");
  const [rateType, setRateType] = useState<string>("labor");
  const [recordId, setRecordId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [inbox, setInbox] = useState<"sent" | "received">("sent");
  // Each tab keeps its own result / error / loading, so switching tabs never shows another tab's data.
  // A result is kept with the rate type it was loaded for (the form can change afterwards).
  const [loadingBy, setLoadingBy] = useState<Partial<Record<Mode, boolean>>>({});
  const [errorBy, setErrorBy] = useState<Partial<Record<Mode, RateError | null>>>({});
  const [resultBy, setResultBy] = useState<
    Partial<Record<Mode, { mode: Mode; rateType: string; inbox: "sent" | "received"; payload: unknown; fetchedAt: string | null } | null>>
  >({});
  const loading = Boolean(loadingBy[mode]);
  const error = errorBy[mode] ?? null;
  const result = resultBy[mode] ?? null;

  const isCorMode = mode === "overview" || mode === "contract_summary";
  const actionLabel = MODES.find((m) => m.value === mode)?.action ?? "Load";

  const run = async () => {
    // Write to the tab that started the request, even if the user switches tabs before it returns.
    const forMode = mode;
    const setLoading = (v: boolean) => setLoadingBy((p) => ({ ...p, [forMode]: v }));
    const setError = (e: RateError | null) => setErrorBy((p) => ({ ...p, [forMode]: e }));
    const setResult = (r: { mode: Mode; rateType: string; inbox: "sent" | "received"; payload: unknown; fetchedAt: string | null } | null) =>
      setResultBy((p) => ({ ...p, [forMode]: r }));
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      let res;
      if (mode === "company") {
        const rid = recordId.trim();
        if (!rid) {
          setError({
            title: "Enter a record ID",
            hint: "The record ID is the rate's number in Clearstory, for example 39188 for a labor rate.",
          });
          setLoading(false);
          return;
        }
        if (!/^\d+$/.test(rid)) {
          setError({ title: "The record ID should be a number", hint: "Use digits only, for example 39188." });
          setLoading(false);
          return;
        }
        res = await getClearstoryApiPayload({
          type: "rate",
          rateType,
          recordId: rid,
        });
      } else if (mode === "project") {
        const pid = projectId.trim();
        const rid = recordId.trim();
        if (!pid || !rid) {
          setError(
            !pid
              ? { title: "Enter a project ID", hint: "The Clearstory project ID, e.g. 173077. You'll find it in the first column on Clearstory › Projects." }
              : { title: "Enter a record ID", hint: "The rate's number on this project in Clearstory." }
          );
          setLoading(false);
          return;
        }
        if (!/^\d+$/.test(pid) || !/^\d+$/.test(rid)) {
          setError({ title: "IDs should be numbers", hint: "Use digits only for the project ID and the record ID." });
          setLoading(false);
          return;
        }
        res = await getClearstoryApiPayload({
          type: "project_rate",
          projectId: pid,
          rateType,
          recordId: rid,
        });
      } else if (mode === "overview") {
        res = await getClearstoryApiPayload({
          type: "cors_overview",
          key: `inbox=${inbox}`,
        });
      } else {
        res = await getClearstoryApiPayload({
          type: "cors_contract_summary",
          key: `inbox=${inbox}`,
        });
      }
      setResult({ mode, rateType, inbox, payload: res.payload, fetchedAt: res.lastFetchedAt ?? null });
    } catch (e) {
      setError(
        describeRateError(e, { mode, rateType, projectId: projectId.trim(), recordId: recordId.trim(), inbox })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col ui-animate-in [--radius:10px] [--radius-md:8px]">
      {/* Option A: compact row. Fields are sized to their values instead of stretching across the card. */}
      <section className="cs-content-panel flex flex-col gap-4 rounded-lg p-5">
        <div>
          <h1 className="cs-page-title">Rates</h1>
          <p className="cs-helper mt-1">View rate information from Clearstory</p>
        </div>

        <div
          className="inline-flex max-w-full flex-wrap gap-0.5 self-start rounded-[var(--radius-md)] bg-[#f3f4f6] p-[3px]"
          role="tablist"
          aria-label="Rate category"
        >
          {MODES.map((m) => {
            const active = mode === m.value;
            return (
              <button
                key={m.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMode(m.value)}
                className={`h-[30px] rounded-md px-3 text-[13px] font-medium transition-colors ${
                  active ? "bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]" : "text-ink-muted hover:text-ink"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>

          <>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              void run();
            }}
          >
            {isCorMode ? (
              <div className="sm:w-40">
                <label htmlFor="inbox-key" className={LABEL}>
                  Inbox
                </label>
                <div className="relative">
                  <select
                    id="inbox-key"
                    value={inbox}
                    onChange={(e) => setInbox(e.target.value as "sent" | "received")}
                    className="cs-field w-full appearance-none px-3 pr-9"
                  >
                    <SortedOptions>
                      <option value="sent">Sent</option>
                      <option value="received">Received</option>
                    </SortedOptions>
                  </select>
                  <SelectChevron />
                </div>
              </div>
            ) : (
              <>
                {mode === "project" ? (
                  <div className="sm:w-40">
                    <label htmlFor="rate-project" className={LABEL}>
                      Project ID
                    </label>
                    <input
                      id="rate-project"
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      placeholder="e.g. 173077"
                      inputMode="numeric"
                      autoComplete="off"
                      className="cs-field w-full px-3"
                    />
                  </div>
                ) : null}
                <div className="sm:w-40">
                  <label htmlFor="rate-type" className={LABEL}>
                    Rate type
                  </label>
                  <div className="relative">
                    <select
                      id="rate-type"
                      value={rateType}
                      onChange={(e) => setRateType(e.target.value)}
                      className="cs-field w-full appearance-none px-3 pr-9"
                    >
                      <SortedOptions>
                        {RATE_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {capitalize(t)}
                          </option>
                        ))}
                      </SortedOptions>
                    </select>
                    <SelectChevron />
                  </div>
                </div>
                <div className="sm:w-[200px]">
                  <label htmlFor="rate-record" className={LABEL}>
                    Record ID
                  </label>
                  <input
                    id="rate-record"
                    value={recordId}
                    onChange={(e) => setRecordId(e.target.value)}
                    placeholder="e.g. 48213"
                    autoComplete="off"
                    className="cs-field w-full px-3"
                  />
                </div>
              </>
            )}
            <button type="submit" disabled={loading} aria-busy={loading} className={buttonClasses("primary")}>
              {loading ? "Loading…" : actionLabel}
            </button>
          </form>

          <div
            className="flex min-h-[8rem] flex-col gap-2.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-4"
            aria-live="polite"
          >
            {error ? (
              <div
                className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3.5 py-3"
                role="alert"
              >
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7.5v5.5M12 16.5h.01" strokeLinecap="round" />
                </svg>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-red-800">{error.title}</p>
                  <p className="mt-0.5 text-[13px] text-red-700">{error.hint}</p>
                </div>
              </div>
            ) : null}

            {loading ? (
              <div className="flex flex-col gap-3" aria-busy="true">
                <Skeleton className="h-5 w-2/5" />
                <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-[68px] rounded-[var(--radius-md)]" />
                  ))}
                </div>
                <Skeleton className="h-24 rounded-[var(--radius-md)]" />
              </div>
            ) : result ? (
              <>
                {result.payload == null ? (
                  <p className="text-sm text-ink-muted">Clearstory returned nothing for this request.</p>
                ) : result.mode === "company" || result.mode === "project" ? (
                  <RateResult payload={result.payload} rateType={result.rateType} />
                ) : result.mode === "overview" ? (
                  <CorOverviewContent payload={result.payload} />
                ) : result.mode === "contract_summary" ? (
                  <CorContractSummaryResult payload={result.payload} inbox={result.inbox} />
                ) : (
                  <GenericResult payload={result.payload} />
                )}
                {result.fetchedAt ? (
                  <p className="cs-helper">
                    From Clearstory, as of{" "}
                    {new Date(result.fetchedAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                ) : null}
              </>
            ) : !error ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-4 text-center">
                <svg className="mb-1 h-5 w-5 text-ink-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                  <ellipse cx="12" cy="5.5" rx="7" ry="2.5" />
                  <path d="M5 5.5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6M5 11.5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" />
                </svg>
                <p className="text-sm font-semibold text-ink">
                  {isCorMode ? "Ready to load COR data" : "Ready to load rates"}
                </p>
                <p className="cs-helper">Results appear here after you load.</p>
              </div>
            ) : null}
          </div>
          </>
      </section>
    </div>
  );
}
