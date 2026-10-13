"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/Skeleton";
import { buttonClasses } from "@/components/ui/Button";
import { ApiError, getApiErrorMessage } from "@/lib/api/client";
import {
  getSitelineProjectDetail,
  type SitelineProjectDetail,
  type SitelineProjectDetailCor,
  type SitelineProjectDetailPayApp,
} from "@/lib/api/endpoints/siteline";
import { splitProjectName } from "@/lib/siteline-project-name";
import { BillingProjectNav } from "@/components/billings/BillingProjectNav";

const DAY_MS = 86_400_000;

const money = (n: number | null | undefined) =>
  n == null
    ? "—"
    : `${n < 0 ? "−" : ""}${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Math.abs(n))}`;

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

const monthYear = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }) : "—";

const titleCase = (s: string | null) =>
  s ? s.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : "—";

/** Pay apps the GC has (Draft = not sent; Paid = done). Everything else is waiting on payment. */
const isSentUnpaid = (p: SitelineProjectDetailPayApp) => {
  const st = (p.status ?? "").toUpperCase();
  return st !== "PAID" && st !== "DRAFT";
};

const daysLate = (p: SitelineProjectDetailPayApp, now: number) =>
  p.dueDate ? Math.floor((now - new Date(p.dueDate).getTime()) / DAY_MS) : null;

const lateClass = (d: number) =>
  d >= 90 ? "bg-red-50 text-red-800" : d >= 60 ? "bg-orange-50 text-orange-800" : d >= 30 ? "bg-amber-50 text-amber-800" : "bg-[#f3f4f6] text-ink-muted";

const COR_STATUS: Record<string, { label: string; cls: string }> = {
  in_review: { label: "In review", cls: "bg-amber-50 text-amber-800" },
  approved_to_proceed: { label: "Approved to proceed", cls: "bg-blue-50 text-blue-700" },
  approved_co_issued: { label: "Approved, CO issued", cls: "bg-green-50 text-green-700" },
  rejected: { label: "Rejected", cls: "bg-red-50 text-red-700" },
  placeholder: { label: "Placeholder", cls: "bg-[#f3f4f6] text-ink-muted" },
  void: { label: "Void", cls: "bg-[#f3f4f6] text-ink-muted" },
};

function Pill({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={`inline-flex h-[22px] items-center whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium ${className}`}>
      {children}
    </span>
  );
}

function PayAppStatus({ status }: { status: string | null }) {
  const st = (status ?? "").toUpperCase();
  const cls =
    st === "PAID" ? "bg-green-50 text-green-700" : st === "DRAFT" ? "bg-[#f3f4f6] text-ink-muted" : "bg-blue-50 text-blue-700";
  return <Pill className={cls}>{titleCase(status)}</Pill>;
}

function LateBadge({ p, now }: { p: SitelineProjectDetailPayApp; now: number }) {
  const st = (p.status ?? "").toUpperCase();
  if (st === "PAID") return <Pill className="bg-green-50 text-green-700">Paid</Pill>;
  const d = daysLate(p, now);
  if (d == null) return <span className="text-ink-soft">—</span>;
  if (d <= 0) return <Pill className="bg-[#f3f4f6] text-ink-muted">{d === 0 ? "Due today" : `Due in ${-d} days`}</Pill>;
  return <Pill className={`font-semibold ${lateClass(d)}`}>{d} days late</Pill>;
}

/** Money bar segment colours: paid → late (severity) → retention → draft → left to bill. */
const SEG = {
  paid: "#2e7d32",
  late60: "#b42318",
  late30: "#e8590c",
  late0: "#f2a541",
  notDue: "#5598e7",
  retention: "#8fa9c9",
  draft: "#c4c9d0",
  left: "#eef0f3",
};

type Tab = "overview" | "payapps" | "cors";

export default function BillingProjectPage() {
  const { contractId } = useParams<{ contractId: string }>();
  return <ProjectView key={contractId} contractId={contractId} />;
}

function ProjectView({ contractId }: { contractId: string }) {
  const [data, setData] = useState<SitelineProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [openPa, setOpenPa] = useState<string | null>(null);
  const [openCor, setOpenCor] = useState<string | null>(null);
  const [checkOpen, setCheckOpen] = useState(false);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    getSitelineProjectDetail(contractId)
      .then((d) => !cancelled && setData(d))
      .catch((e) => {
        if (cancelled) return;
        setError(
          e instanceof ApiError && e.status === 404
            ? "This project hasn't been synced from Siteline, or the link is wrong."
            : getApiErrorMessage(e, "Couldn't load this project")
        );
      });
    return () => {
      cancelled = true;
    };
  }, [contractId]);

  const m = useMemo(() => {
    if (!data) return null;
    const apps = data.payApps;
    const sum = (xs: SitelineProjectDetailPayApp[], f: (p: SitelineProjectDetailPayApp) => number | null) =>
      xs.reduce((a, p) => a + (f(p) ?? 0), 0);
    const paidApps = apps.filter((p) => (p.status ?? "").toUpperCase() === "PAID");
    const draftApps = apps.filter((p) => (p.status ?? "").toUpperCase() === "DRAFT");
    const unpaid = apps.filter(isSentUnpaid);
    const late = unpaid.filter((p) => (daysLate(p, now) ?? 0) > 0);
    const bucket = (lo: number, hi: number) =>
      sum(late.filter((p) => { const d = daysLate(p, now) ?? 0; return d >= lo && d < hi; }), (p) => p.amountDue);
    const billed = sum(apps, (p) => p.billed);
    const contract = data.contract.contractValue ?? 0;
    const cors = data.clearstory?.cors ?? [];
    const inReview = cors.filter((c) => (c.status ?? "") === "in_review");
    return {
      paid: sum(paidApps, (p) => p.billed),
      late60: bucket(60, Infinity),
      late30: bucket(30, 60),
      late0: bucket(1, 30),
      notDue: sum(unpaid.filter((p) => (daysLate(p, now) ?? 0) <= 0), (p) => p.amountDue),
      retentionUnpaid: sum(unpaid, (p) => p.retention),
      draft: sum(draftApps, (p) => p.billed),
      billed,
      retentionAll: sum(apps, (p) => p.retention),
      left: Math.max(0, contract - billed),
      contract,
      late,
      lateTotal: sum(late, (p) => p.amountDue),
      oldestLate: late.reduce((a, p) => Math.max(a, daysLate(p, now) ?? 0), 0),
      unpaidTotal: sum(unpaid, (p) => p.amountDue),
      cors,
      inReview,
      inReviewTotal: inReview.reduce((a, c) => a + (c.requestedAmount ?? 0), 0),
      inReviewAvgDays: inReview.length
        ? Math.round(inReview.reduce((a, c) => a + (c.daysInReview ?? 0), 0) / inReview.length)
        : 0,
      inReviewMaxDays: inReview.reduce((a, c) => Math.max(a, c.daysInReview ?? 0), 0),
    };
  }, [data, now]);

  if (error) {
    return (
      <div className="flex flex-col gap-4 [--radius:10px] [--radius-md:8px]">
        <Link href="/billings" className="text-[12.5px] text-brand-secondary hover:underline">← Billing</Link>
        <p className="cs-content-panel rounded-lg px-5 py-6 text-center text-[13px] text-ink-muted" role="alert">{error}</p>
      </div>
    );
  }

  if (!data || !m) {
    return (
      <div className="flex flex-col gap-4 [--radius:10px] [--radius-md:8px]" aria-busy>
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-36 rounded-[var(--radius)]" />
        <div className="grid gap-3 md:grid-cols-2"><Skeleton className="h-32 rounded-[var(--radius)]" /><Skeleton className="h-32 rounded-[var(--radius)]" /></div>
        <Skeleton className="h-64 rounded-[var(--radius)]" />
      </div>
    );
  }

  const c = data.contract;
  const p = splitProjectName(c.projectName ?? c.internalProjectNumber ?? "Project");
  const csBase = data.clearstory?.baseContractValue ?? null;
  const contractMismatch =
    csBase != null && c.contractValue != null && Math.abs(csBase - c.contractValue) > Math.max(1, c.contractValue * 0.01);
  const pmFirst = c.leadPmName?.split(" ")[0] ?? "PM";
  const mail = c.leadPmEmail
    ? `mailto:${c.leadPmEmail}?subject=${encodeURIComponent(`${p.number ?? ""} ${p.name} – billing`.trim())}`
    : null;

  const segments = [
    { key: "paid", label: "Paid", v: m.paid, color: SEG.paid },
    { key: "late60", label: "60+ days late", v: m.late60, color: SEG.late60 },
    { key: "late30", label: "30–59 days late", v: m.late30, color: SEG.late30 },
    { key: "late0", label: "Under 30 days late", v: m.late0, color: SEG.late0 },
    { key: "notDue", label: "Sent, not due yet", v: m.notDue, color: SEG.notDue },
    { key: "ret", label: "Retention held", v: m.retentionUnpaid, color: SEG.retention },
    { key: "draft", label: "Draft, not sent", v: m.draft, color: SEG.draft },
    { key: "left", label: "Left to bill", v: m.left, color: SEG.left },
  ].filter((s) => s.v > 0);
  const barTotal = segments.reduce((a, s) => a + s.v, 0);

  const tabs: { value: Tab; label: string; count?: number }[] = [
    { value: "overview", label: "Overview" },
    { value: "payapps", label: "Pay apps", count: data.payApps.length },
    ...(data.clearstory ? [{ value: "cors" as const, label: "Change orders", count: m.cors.length }] : []),
  ];

  const corsByWait = [...m.cors].sort((a, b) => (b.daysInReview ?? 0) - (a.daysInReview ?? 0));

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3.5 ui-animate-in [--radius:10px] [--radius-md:8px]">
      {/* Header: navigation line (Back · breadcrumb · prev / next), then the project */}
      <section className="cs-content-panel rounded-lg px-5 py-4">
        <BillingProjectNav contractId={contractId} entityId={c.entityId} />
        <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold leading-tight text-ink">
            {p.number ? <span className="font-medium tabular-nums text-ink-muted">{p.number} · </span> : null}
            {p.name}
          </h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {c.status ? (
              <Pill className={c.status.toUpperCase() === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-[#f3f4f6] text-ink-muted"}>
                {titleCase(c.status)}
              </Pill>
            ) : null}
            {data.clearstory?.customerName ? <Pill className="bg-[#f3f4f6] text-ink-muted">{data.clearstory.customerName} (GC)</Pill> : null}
            {c.billingType ? <Pill className="bg-[#f3f4f6] text-ink-muted">{titleCase(c.billingType)}</Pill> : null}
            {c.contractNumber ? <Pill className="bg-[#f3f4f6] text-ink-muted">Contract #{c.contractNumber}</Pill> : null}
            {contractMismatch ? (
              <button
                type="button"
                onClick={() => setCheckOpen((v) => !v)}
                aria-expanded={checkOpen}
                className="inline-flex h-[22px] items-center rounded-full bg-amber-50 px-2.5 text-[12px] font-medium text-amber-800 hover:bg-amber-100"
              >
                ⚠ 1 data check
              </button>
            ) : null}
          </div>
          {contractMismatch && checkOpen ? (
            <p className="mt-2.5 max-w-[72ch] rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">
              <span className="font-semibold text-ink">Contract value differs between systems.</span> Siteline: {money(c.contractValue)} ·
              Clearstory: {money(csBase)}. This page uses Siteline because billing comes from there. Check with the PM which is current.
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-muted">
            {c.leadPmName ? (
              <span>
                PM <span className="font-medium text-ink">{c.leadPmName}</span>
                {c.leadPmEmail ? ` · ${c.leadPmEmail}` : ""}
              </span>
            ) : null}
            {data.averageDaysToPaid ? (
              <span>
                GC usually pays in <span className="font-medium text-ink">{data.averageDaysToPaid} days</span>
              </span>
            ) : null}
            {c.lastSyncedAt ? <span>Siteline synced {day(c.lastSyncedAt)}</span> : null}
          </div>
        </div>
        {mail ? (
          <a href={mail} className={buttonClasses("primary")}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M4 6h16v12H4z" />
              <path d="m4 7 8 6 8-6" />
            </svg>
            Email {pmFirst}
          </a>
        ) : null}
        </div>
      </section>

      {/* Needs attention */}
      <section className="grid gap-3 md:grid-cols-2" aria-label="Needs attention">
        <div
          className={`flex flex-col gap-1.5 rounded-[var(--radius)] border px-4 py-3.5 ${
            m.late.length ? "border-red-200 bg-red-50" : "border-[var(--border-subtle)] bg-white"
          }`}
        >
          <span className={`text-[12px] font-semibold uppercase tracking-wide ${m.late.length ? "text-red-800" : "text-ink-muted"}`}>
            Late pay apps
          </span>
          {m.late.length ? (
            <>
              <span className="text-[20px] font-semibold tabular-nums text-ink">{money(m.lateTotal)}</span>
              <p className="text-[13px] text-ink-muted">
                {m.late.length} pay app{m.late.length === 1 ? "" : "s"} past the due date, oldest{" "}
                <span className="font-medium text-ink">{m.oldestLate} days</span>.
                {m.late60 > 0 ? (
                  <> <span className="font-medium text-ink">{money(m.late60)}</span> is 60+ days late.</>
                ) : null}
              </p>
              <button type="button" onClick={() => setTab("payapps")} className="self-start text-[13px] font-medium text-brand-secondary hover:underline">
                See pay apps →
              </button>
            </>
          ) : (
            <p className="text-[13px] text-ink-muted">Nothing is past its due date. 🎉</p>
          )}
        </div>
        <div
          className={`flex flex-col gap-1.5 rounded-[var(--radius)] border px-4 py-3.5 ${
            m.inReview.length ? "border-amber-200 bg-amber-50" : "border-[var(--border-subtle)] bg-white"
          }`}
        >
          <span className={`text-[12px] font-semibold uppercase tracking-wide ${m.inReview.length ? "text-amber-800" : "text-ink-muted"}`}>
            Change orders waiting
          </span>
          {!data.clearstory ? (
            <p className="text-[13px] text-ink-muted">No Clearstory project matches job {c.internalProjectNumber ?? "—"}.</p>
          ) : m.inReview.length ? (
            <>
              <span className="text-[20px] font-semibold tabular-nums text-ink">{money(m.inReviewTotal)}</span>
              <p className="text-[13px] text-ink-muted">
                <span className="font-medium text-ink">{m.inReview.length}</span> in review
                {m.inReviewMaxDays <= 0 ? (
                  <>, submitted today.</>
                ) : (
                  <>
                    , on average <span className="font-medium text-ink">{m.inReviewAvgDays} days</span>; the longest has waited{" "}
                    <span className="font-medium text-ink">{m.inReviewMaxDays} days</span>.
                  </>
                )}
              </p>
              <button type="button" onClick={() => setTab("cors")} className="self-start text-[13px] font-medium text-brand-secondary hover:underline">
                See change orders →
              </button>
            </>
          ) : (
            <p className="text-[13px] text-ink-muted">No change orders waiting for an answer.</p>
          )}
        </div>
      </section>

      {/* Tabs (same strip as Tags / Billing) */}
      <div className="sticky top-0 z-10 box-border flex h-[52px] w-full items-center overflow-hidden rounded-[14px] border border-[#E5E7EB] bg-white px-1.5 shadow-[0_1px_2px_rgba(33,33,33,0.04)]">
        <div role="tablist" aria-label="Project sections" className="flex min-w-0 flex-1 flex-nowrap items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((t) => {
            const active = tab === t.value;
            return (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.value)}
                className={`inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 text-[13px] leading-none transition-colors ${
                  active ? "bg-[#DBEAFE] font-semibold text-[#1D4ED8]" : "font-medium text-[#616161] hover:bg-[rgba(33,33,33,0.05)] hover:text-[#212121]"
                }`}
              >
                {t.label}
                {t.count != null ? <span className={`tabular-nums ${active ? "opacity-70" : "opacity-60"}`}>{t.count}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "overview" ? (
        <section className="cs-content-panel flex flex-col gap-4 rounded-lg px-5 py-4" role="tabpanel" aria-label="Overview">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-ink">Where the contract stands</h2>
            <span className="text-[13px] text-ink-muted">
              Contract value <span className="font-semibold tabular-nums text-ink">{money(m.contract)}</span>
              {c.percentComplete != null ? ` · ${Math.round(c.percentComplete * 100)}% complete` : ""}
            </span>
          </div>
          {barTotal > 0 ? (
            <>
              <div className="flex h-[18px] gap-[2px]" role="img" aria-label="Contract value split into paid, late, retention, draft and left to bill">
                {segments.map((s, i) => (
                  <span
                    key={s.key}
                    title={`${s.label}: ${money(s.v)}`}
                    className={`block h-full ${i === 0 ? "rounded-l-[5px]" : ""} ${i === segments.length - 1 ? "rounded-r-[5px]" : ""} ${
                      s.key === "left" ? "shadow-[inset_0_0_0_1px_#dfe3e8]" : ""
                    }`}
                    style={{ flex: s.v, background: s.color }}
                  />
                ))}
              </div>
              <dl className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4">
                {segments.map((s) => (
                  <div key={s.key} className="min-w-0">
                    <dt className="flex items-center gap-1.5 text-[12px] text-ink-muted">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-[3px] border border-black/5" style={{ background: s.color }} aria-hidden />
                      {s.label}
                    </dt>
                    <dd className="text-[13.5px] font-semibold tabular-nums text-ink">{money(s.v)}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className="cs-helper">No billing on this contract yet.</p>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-3 py-2.5">
              <span className="block text-[12px] text-ink-muted">Billed to date</span>
              <span className="text-[16px] font-semibold tabular-nums text-ink">{money(m.billed)}</span>
              <span className="block text-[12px] text-ink-muted">{data.payApps.length} pay apps · retention {money(m.retentionAll)}</span>
            </div>
            <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-3 py-2.5">
              <span className="block text-[12px] text-ink-muted">Waiting on payment</span>
              <span className={`text-[16px] font-semibold tabular-nums ${m.lateTotal > 0 ? "text-red-800" : "text-ink"}`}>{money(m.unpaidTotal)}</span>
              <span className="block text-[12px] text-ink-muted">{money(m.lateTotal)} of it is past due</span>
            </div>
            <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-3 py-2.5">
              <span className="block text-[12px] text-ink-muted">If change orders in review are approved</span>
              <span className="text-[16px] font-semibold tabular-nums text-ink">{money(m.contract + m.inReviewTotal)}</span>
              <span className="block text-[12px] text-ink-muted">+{money(m.inReviewTotal)} in review</span>
            </div>
          </div>
        </section>
      ) : null}

      {tab === "payapps" ? (
        <section className="cs-content-panel flex flex-col gap-3 rounded-lg px-5 py-4" role="tabpanel" aria-label="Pay apps">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-ink">Pay apps</h2>
            <span className="text-[12.5px] text-ink-muted">Click a row for details · late counted from the due date</span>
          </div>
          {data.payApps.length === 0 ? (
            <p className="cs-helper py-4">No pay apps on this contract yet.</p>
          ) : (
            <div className="cs-data-table cs-table-shell">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <caption className="sr-only">Pay apps</caption>
                <thead>
                  <tr>
                    <th className="w-8 px-3 py-2" aria-hidden />
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Period</th>
                    <th className="px-3 py-2 text-right">Billed</th>
                    <th className="px-3 py-2 text-right">Retention</th>
                    <th className="px-3 py-2 text-right">Amount due</th>
                    <th className="px-3 py-2">Due date</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Late</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payApps.map((pa) => {
                    const open = openPa === pa.id;
                    const paid = (pa.status ?? "").toUpperCase() === "PAID";
                    return (
                      <Fragment key={pa.id}>
                        <tr
                          tabIndex={0}
                          aria-expanded={open}
                          onClick={() => setOpenPa(open ? null : pa.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setOpenPa(open ? null : pa.id);
                            }
                          }}
                          className={`cursor-pointer border-b border-[var(--border-subtle)] text-[13px] transition-colors ${open ? "bg-brand-tint/60" : "bg-white hover:bg-canvas"}`}
                        >
                          <td className="px-3 py-2.5 text-ink-soft" aria-hidden>
                            <span className={`inline-block transition-transform ${open ? "rotate-90 text-brand-secondary" : ""}`}>›</span>
                          </td>
                          <td className="px-3 py-2.5 tabular-nums">#{pa.number ?? "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2.5">{monthYear(pa.periodStart)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{money(pa.billed)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{money(pa.retention)}</td>
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{paid ? "—" : money(pa.amountDue)}</td>
                          <td className="whitespace-nowrap px-3 py-2.5">{day(pa.dueDate)}</td>
                          <td className="px-3 py-2.5"><PayAppStatus status={pa.status} /></td>
                          <td className="px-3 py-2.5"><LateBadge p={pa} now={now} /></td>
                        </tr>
                        {open ? (
                          <tr className="border-b border-[var(--border-subtle)] bg-[#f8fafc]">
                            <td colSpan={9} className="px-4 py-3 pl-10">
                              <div className="flex flex-wrap items-center gap-x-7 gap-y-2 text-[13px]">
                                <span><span className="block text-[12px] text-ink-muted">Billing period</span>{day(pa.periodStart)} – {day(pa.periodEnd)}</span>
                                <span><span className="block text-[12px] text-ink-muted">Gross billed</span><span className="tabular-nums">{money(pa.billed)}</span></span>
                                <span><span className="block text-[12px] text-ink-muted">Retention</span><span className="tabular-nums">{money(pa.retention)}</span></span>
                                <span><span className="block text-[12px] text-ink-muted">Amount due</span><span className="font-semibold tabular-nums">{money(pa.amountDue)}</span></span>
                                {mail && isSentUnpaid(pa) ? (
                                  <a
                                    className={`${buttonClasses("outline", "sm")} ml-auto`}
                                    href={`mailto:${c.leadPmEmail}?subject=${encodeURIComponent(`${p.number ?? ""} pay app #${pa.number ?? ""} – payment status`.trim())}`}
                                  >
                                    Ask {pmFirst} about this pay app
                                  </a>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-[#f3f4f6] text-[13px] font-semibold">
                    <td />
                    <td className="px-3 py-2.5" colSpan={2}>Total</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{money(m.billed)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{money(m.retentionAll)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{money(m.unpaidTotal)}</td>
                    <td className="px-3 py-2.5 font-medium text-ink-muted" colSpan={3}>due on sent pay apps</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {tab === "cors" && data.clearstory ? (
        <section className="cs-content-panel flex flex-col gap-3 rounded-lg px-5 py-4" role="tabpanel" aria-label="Change orders">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              Change orders
              <span className="inline-flex h-[22px] items-center rounded-full border border-[var(--border-subtle)] px-2 text-[11.5px] font-medium text-ink-muted">from Clearstory</span>
            </h2>
            <Link href={`/clearstory/projects/${data.clearstory.projectId}`} className="text-[13px] font-medium text-brand-secondary hover:underline">
              Open Clearstory project →
            </Link>
          </div>
          {m.cors.length === 0 ? (
            <p className="cs-helper py-4">No change orders on this job.</p>
          ) : (
            <div className="cs-data-table cs-table-shell">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <caption className="sr-only">Change orders, longest waiting first</caption>
                <thead>
                  <tr>
                    <th className="w-8 px-3 py-2" aria-hidden />
                    <th className="px-3 py-2">COR #</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2">Submitted</th>
                    <th className="px-3 py-2">Waiting</th>
                  </tr>
                </thead>
                <tbody>
                  {corsByWait.map((cor: SitelineProjectDetailCor) => {
                    const open = openCor === cor.id;
                    const st = COR_STATUS[cor.status ?? ""] ?? { label: titleCase(cor.status), cls: "bg-[#f3f4f6] text-ink-muted" };
                    const d = cor.daysInReview;
                    return (
                      <Fragment key={cor.id}>
                        <tr
                          tabIndex={0}
                          aria-expanded={open}
                          onClick={() => setOpenCor(open ? null : cor.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setOpenCor(open ? null : cor.id);
                            }
                          }}
                          className={`cursor-pointer border-b border-[var(--border-subtle)] text-[13px] transition-colors ${open ? "bg-brand-tint/60" : "bg-white hover:bg-canvas"}`}
                        >
                          <td className="px-3 py-2.5 text-ink-soft" aria-hidden>
                            <span className={`inline-block transition-transform ${open ? "rotate-90 text-brand-secondary" : ""}`}>›</span>
                          </td>
                          <td className="px-3 py-2.5 tabular-nums">{cor.corNumber ?? "—"}</td>
                          <td className="max-w-[24rem] px-3 py-2.5"><span className="block truncate" title={cor.title ?? undefined}>{cor.title ?? "—"}</span></td>
                          <td className="px-3 py-2.5"><Pill className={st.cls}>{st.label}</Pill></td>
                          <td className={`px-3 py-2.5 text-right font-medium tabular-nums ${(cor.requestedAmount ?? 0) < 0 ? "text-ink-muted" : ""}`}>
                            {money(cor.requestedAmount)}
                            {(cor.requestedAmount ?? 0) < 0 ? <span className="ml-1 text-[11px] font-normal">credit</span> : null}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5">{day(cor.dateSubmitted)}</td>
                          <td className="px-3 py-2.5">
                            {cor.status === "in_review" && d != null ? (
                              <Pill className={`font-semibold ${lateClass(d >= 270 ? 90 : d >= 120 ? 60 : d >= 30 ? 30 : 0)}`}>{d} days</Pill>
                            ) : (
                              <span className="text-ink-soft">—</span>
                            )}
                          </td>
                        </tr>
                        {open ? (
                          <tr className="border-b border-[var(--border-subtle)] bg-[#f8fafc]">
                            <td colSpan={7} className="px-4 py-3 pl-10 text-[13px]">
                              <p className="max-w-[90ch] whitespace-normal text-ink">
                                <span className="font-semibold">COR {cor.corNumber}:</span> {cor.title ?? "—"}
                              </p>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
