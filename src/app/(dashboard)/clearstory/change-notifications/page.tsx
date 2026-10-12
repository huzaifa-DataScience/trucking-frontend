"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { splitProjectName } from "@/lib/siteline-project-name";
import { LinkPending } from "@/components/ui/LinkPending";
import { buttonClasses } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { getClearstoryApiPayload } from "@/lib/api/endpoints/clearstory";
import { ApiError, getApiErrorMessage } from "@/lib/api/client";

type Mode = "cn" | "cn_contract";

const MODES: { value: Mode; label: string }[] = [
  { value: "cn", label: "Change notification" },
  { value: "cn_contract", label: "Related contract" },
];

const LABEL = "mb-1.5 block text-[13px] font-medium text-ink-muted";

const STATUS_PILL: Record<string, string> = {
  approved: "bg-green-50 text-green-700",
  draft: "bg-[#f3f4f6] text-ink-muted",
  rejected: "bg-red-50 text-red-700",
};

type Payload = Record<string, unknown>;

function obj(v: unknown): Payload | null {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Payload) : null;
}

function text(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number") return String(v);
  return null;
}

function money(v: unknown): string | null {
  return typeof v === "number"
    ? v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : null;
}

function day(v: unknown): string | null {
  const s = text(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

/** Clearstory descriptions are HTML; show them as plain text (parsed inertly, never injected). */
function plain(v: unknown): string | null {
  const s = text(v);
  if (!s) return null;
  if (typeof window === "undefined" || !s.includes("<")) return s;
  return new DOMParser().parseFromString(s, "text/html").body.textContent?.replace(/\s+/g, " ").trim() || null;
}

function humanize(key: string): string {
  return key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium capitalize ${
        STATUS_PILL[status] ?? "bg-[#f3f4f6] text-ink-muted"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {status.replace(/_/g, " ")}
    </span>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-ink-muted">{label}</dt>
      <dd className="mt-0.5 break-words font-medium text-ink">{children}</dd>
    </div>
  );
}

const CARD = "rounded-[10px] border border-[var(--border-subtle)] bg-white";
const SECTION_TITLE = "text-[12px] font-semibold uppercase tracking-[0.04em] text-ink-muted";

/** Label/value rows for the side panel. */
function KeyValues({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-2.5 gap-y-[7px] text-[13px]">
      {rows.map((r) => (
        <div key={r.label} className="contents">
          <dt className="pt-px text-[12px] text-ink-muted">{r.label}</dt>
          <dd className="font-medium text-ink [overflow-wrap:anywhere]">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

type Step = { label: ReactNode; when: string | null; state: "done" | "late" | "todo" };

/** Created → due → submitted → responses, as a small vertical timeline. */
function Timeline({ steps }: { steps: Step[] }) {
  return (
    <ol className="flex flex-col">
      {steps.map((s, i) => (
        <li key={i} className="relative grid grid-cols-[14px_minmax(0,1fr)_auto] items-start gap-2 pb-2.5 last:pb-0">
          {i < steps.length - 1 ? (
            <span className="absolute bottom-0 left-[6px] top-[14px] w-0.5 bg-[var(--border-subtle)]" aria-hidden />
          ) : null}
          <span
            className={`mt-0.5 h-3.5 w-3.5 rounded-full border-2 ${
              s.state === "done"
                ? "border-brand bg-brand"
                : s.state === "late"
                  ? "border-[#d97706] bg-white"
                  : "border-[var(--border-subtle)] bg-white"
            }`}
            aria-hidden
          />
          <span className={`text-[13px] ${s.state === "todo" ? "text-ink-muted" : "text-ink"}`}>{s.label}</span>
          <span className="text-[12px] tabular-nums text-ink-muted">{s.when ?? "—"}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Change notification (option A): what it says on the left (amounts, email message, description),
 * the project and a timeline on the right. A CN ↔ contract row shows its contract fields.
 */
function ResultCard({
  mode,
  payload,
  fetchedAt,
  loadedAt,
}: {
  mode: Mode;
  payload: Payload;
  fetchedAt: string | null;
  /** When this result was loaded; "past due" is judged against it. */
  loadedAt: number;
}) {
  const status = text(payload.status);
  const asOf = fetchedAt
    ? new Date(fetchedAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;
  const footer = asOf ? <p className="cs-helper">From Clearstory, as of {asOf}</p> : null;

  if (mode === "cn_contract") {
    const fields: { label: string; value: ReactNode }[] = [];
    const add = (label: string, value: ReactNode | null) => {
      if (value != null && value !== "") fields.push({ label, value });
    };
    const known = ["contractName", "contractId", "contractValue", "estimate", "hasResponded", "noCostImpact"];
    add("Contract", text(payload.contractName));
    add("Contract ID", text(payload.contractId));
    add("Contract value", money(payload.contractValue));
    add("Estimate", money(payload.estimate));
    if (typeof payload.hasResponded === "boolean") add("Responded", payload.hasResponded ? "Yes" : "No");
    if (typeof payload.noCostImpact === "boolean") add("No cost impact", payload.noCostImpact ? "Yes" : "No");
    for (const [k, v] of Object.entries(payload)) {
      if (known.includes(k) || fields.length >= 12) continue;
      if (typeof v === "string" || typeof v === "number") add(humanize(k), String(v));
    }
    return (
      <div className="flex flex-col gap-2.5">
        <div className={`${CARD} flex flex-col gap-4 px-5 py-[18px]`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-[17px] font-semibold leading-snug text-ink">{text(payload.contractName) ?? "Related contract"}</h2>
            {status ? <StatusPill status={status} /> : null}
          </div>
          {fields.length ? (
            <dl className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-x-5 gap-y-3 text-[13px]">
              {fields.map((f) => (
                <Field key={f.label} label={f.label}>
                  {f.value}
                </Field>
              ))}
            </dl>
          ) : (
            <p className="cs-helper">Clearstory has no details for this contract link.</p>
          )}
        </div>
        {footer}
      </div>
    );
  }

  const project = obj(payload.project);
  const title = text(payload.title) ?? "Change notification";
  const reference = text(payload.customerReferenceNumber);
  const message = plain(payload.emailMessage);
  const description = plain(payload.description);

  // Project: "09838 - USNA MacDonough Hall Repair - Building 102 (Consigli)" → job link + customer.
  const projectId = text(project?.id);
  const projectTitle = text(project?.projectTitle);
  const split = projectTitle ? splitProjectName(projectTitle) : null;
  const jobNumber = text(project?.jobNumber) ?? split?.number ?? null;
  const jobLabel = split ? `${jobNumber ? `${jobNumber} · ` : ""}${split.name}` : jobNumber;
  // Clearstory often leaves customerName empty; a single bracketed name in the title is the customer.
  const customer = text(project?.customerName) ?? (split?.tags.length === 1 ? split.tags[0] : null);
  const projectRows: { label: string; value: ReactNode }[] = [];
  if (customer) projectRows.push({ label: "Customer", value: customer });
  if (text(project?.customerJobNumber)) projectRows.push({ label: "Customer job #", value: text(project?.customerJobNumber) });
  const division = text(project?.division);
  if (division) {
    projectRows.push({ label: "Division", value: division.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) });
  }
  if (money(project?.contractValue)) projectRows.push({ label: "Contract value", value: money(project?.contractValue) });
  if (project?.isArchived === true) projectRows.push({ label: "Project", value: "Archived" });

  // Timeline: past due when the due date has gone by and it was never submitted.
  const submitted = day(payload.dateSubmitted);
  const dueRaw = text(payload.dueDate);
  const pastDue = Boolean(dueRaw && !submitted && new Date(dueRaw).getTime() < loadedAt);
  const responses = Array.isArray(payload.responses) ? payload.responses.length : 0;
  const steps: Step[] = [
    { label: "Created", when: day(payload.createdAt), state: "done" },
    ...(dueRaw
      ? [
          {
            label: pastDue ? (
              <>
                Due{" "}
                <span className="ml-1 inline-flex h-5 items-center rounded-full bg-amber-50 px-2 text-[11.5px] font-medium text-amber-800">
                  Past due
                </span>
              </>
            ) : (
              "Due"
            ),
            when: day(dueRaw),
            state: pastDue ? ("late" as const) : submitted ? ("done" as const) : ("todo" as const),
          },
        ]
      : []),
    submitted
      ? { label: "Submitted", when: submitted, state: "done" }
      : { label: "Not submitted yet", when: null, state: "todo" },
    responses > 0
      ? { label: `${responses} response${responses === 1 ? "" : "s"}`, when: null, state: "done" }
      : { label: "No responses yet", when: null, state: "todo" },
  ];
  const updated = day(payload.updatedAt);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className={`${CARD} flex min-w-0 flex-col gap-[18px] px-5 py-[18px]`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[17px] font-semibold leading-snug text-ink">{title}</h2>
              <p className="mt-1 flex flex-wrap gap-x-2.5 gap-y-1 text-[12.5px] text-ink-muted">
                <span>CN {text(payload.id) ?? "—"}</span>
                {text(payload.type) ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>{text(payload.type)}</span>
                  </>
                ) : null}
                {reference ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>Ref: {reference}</span>
                  </>
                ) : null}
              </p>
            </div>
            {status ? <StatusPill status={status} /> : null}
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {[
              { label: "Estimate", value: money(payload.estimate) },
              { label: "Cost impact", value: money(payload.costImpact) },
              { label: "Projected cost", value: money(payload.projectedCost) },
            ].map((m) => (
              <div key={m.label} className="rounded-[var(--radius-md)] bg-[#f7f9fc] px-3 py-2.5">
                <p className="text-[12px] text-ink-muted">{m.label}</p>
                <p className="text-[18px] font-semibold tabular-nums text-ink">{m.value ?? "—"}</p>
              </div>
            ))}
          </div>

          {message ? (
            <div className="flex flex-col gap-1.5">
              <h3 className={SECTION_TITLE}>Email message</h3>
              <p className="max-w-[72ch] rounded-r-[var(--radius-md)] border-l-[3px] border-brand bg-[#f7f9fc] px-3 py-2 text-[13px] text-ink">
                {message}
              </p>
            </div>
          ) : null}
          {description ? (
            <div className="flex flex-col gap-1.5">
              <h3 className={SECTION_TITLE}>Description</h3>
              <p className="max-w-[72ch] text-[13px] leading-relaxed text-ink">{description}</p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          {jobLabel || projectRows.length ? (
            <div className={`${CARD} flex flex-col gap-2.5 px-4 py-3.5`}>
              <h3 className={SECTION_TITLE}>Project</h3>
              {jobLabel ? (
                projectId ? (
                  <Link
                    href={`/clearstory/projects/${encodeURIComponent(projectId)}`}
                    className="text-[13px] font-semibold leading-snug text-brand-secondary hover:underline"
                    title={projectTitle ?? undefined}
                  >
                    <LinkPending>{jobLabel}</LinkPending>
                  </Link>
                ) : (
                  <p className="text-[13px] font-semibold leading-snug text-ink">{jobLabel}</p>
                )
              ) : null}
              {projectRows.length ? <KeyValues rows={projectRows} /> : null}
            </div>
          ) : null}
          <div className={`${CARD} flex flex-col gap-2.5 px-4 py-3.5`}>
            <h3 className={SECTION_TITLE}>Timeline</h3>
            <Timeline steps={steps} />
            {updated ? <p className="text-[12px] text-ink-muted">Last updated {updated}</p> : null}
          </div>
        </div>
      </div>
      {footer}
    </div>
  );
}

export default function ClearstoryChangeNotificationsPage() {
  const [mode, setMode] = useState<Mode>("cn");
  const [cnId, setCnId] = useState("");
  const [contractId, setContractId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ mode: Mode; payload: Payload; fetchedAt: string | null; loadedAt: number } | null>(null);

  const run = async () => {
    const cn = cnId.trim();
    if (!cn) {
      setError("Enter a change notification ID.");
      return;
    }
    if (mode === "cn_contract" && !contractId.trim()) {
      setError("Enter the contract ID to find the related contract.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res =
        mode === "cn"
          ? await getClearstoryApiPayload({ type: "change_notification", key: cn })
          : await getClearstoryApiPayload({
              type: "cn_contract",
              cnId: cn,
              contractId: contractId.trim(),
            });
      const payload = obj(res.payload) ?? { value: res.payload };
      setResult({
        mode,
        payload,
        fetchedAt: res.lastFetchedAt ?? null,
        loadedAt: Date.now(),
      });
    } catch (e) {
      // 404 = nothing synced for that key; say so in plain words instead of the backend's sync hint.
      if (e instanceof ApiError && e.status === 404) {
        setError(
          mode === "cn"
            ? `No change notification ${cn} has been synced from Clearstory. Check the ID, or try again after the next sync.`
            : `No contract ${contractId.trim()} is linked to change notification ${cn}. Links show up here once that contract responds to the notification in Clearstory.`
        );
      } else {
        setError(getApiErrorMessage(e, "Couldn't load the details"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col ui-animate-in [--radius:10px] [--radius-md:8px]">
      <section className="cs-content-panel flex flex-col gap-4 rounded-lg p-5">
        <div>
          <h1 className="cs-page-title">Change Notifications</h1>
          <p className="cs-helper mt-1">Look up a change notification from Clearstory</p>
        </div>

        <div
          className="inline-flex max-w-full flex-wrap gap-1 self-start rounded-[var(--radius)] bg-[#f3f4f6] p-1"
          role="radiogroup"
          aria-label="Lookup type"
        >
          {MODES.map((m) => {
            const active = mode === m.value;
            return (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setMode(m.value);
                  setError(null);
                }}
                className={`h-9 rounded-[var(--radius-md)] px-4 text-[13.5px] font-medium transition-colors ${
                  active ? "bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]" : "text-ink-muted hover:text-ink"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        <form
          className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void run();
          }}
        >
          <div className="sm:w-[200px]">
            <label htmlFor="cn-id" className={LABEL}>
              Change notification ID
            </label>
            <input
              id="cn-id"
              value={cnId}
              onChange={(e) => setCnId(e.target.value)}
              placeholder="e.g. 467"
              inputMode="numeric"
              autoComplete="off"
              className="cs-field w-full px-3"
            />
          </div>
          {mode === "cn_contract" ? (
            <div className="sm:w-[200px]">
              <label htmlFor="cn-contract-id" className={LABEL}>
                Contract ID
              </label>
              <input
                id="cn-contract-id"
                value={contractId}
                onChange={(e) => setContractId(e.target.value)}
                placeholder="Enter contract ID"
                inputMode="numeric"
                autoComplete="off"
                className="cs-field w-full px-3"
              />
            </div>
          ) : null}
          <button type="submit" disabled={loading} aria-busy={loading} className={buttonClasses("primary")}>
            {loading ? "Loading…" : "Load details"}
          </button>
        </form>

        <div className="flex flex-col gap-2.5" aria-live="polite">
          {error ? (
            <p
              className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          {loading ? (
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]" aria-busy="true">
              <div className="flex flex-col gap-4 rounded-[10px] border border-[var(--border-subtle)] px-5 py-[18px]">
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-3.5 w-2/5" />
                <div className="grid grid-cols-3 gap-2.5">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-[60px] rounded-[var(--radius-md)]" />
                  ))}
                </div>
                <Skeleton className="h-16 w-full" />
              </div>
              <div className="flex flex-col gap-3">
                <Skeleton className="h-[150px] rounded-[10px]" />
                <Skeleton className="h-[140px] rounded-[10px]" />
              </div>
            </div>
          ) : result ? (
            <ResultCard mode={result.mode} payload={result.payload} fetchedAt={result.fetchedAt} loadedAt={result.loadedAt} />
          ) : !error ? (
            <div className="flex flex-col items-center gap-1 rounded-[var(--radius)] border border-[var(--border-subtle)] px-4 py-6 text-center">
              <p className="text-[13.5px] font-semibold text-ink">Nothing loaded yet</p>
              <p className="cs-helper">
                {mode === "cn"
                  ? "Enter a change notification ID and load its details."
                  : "Enter a change notification ID and a contract ID to see how they're linked."}
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
