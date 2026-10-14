"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { buttonClasses } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ClearstorySwaggerTable } from "@/components/clearstory/ClearstorySwaggerTable";
import { ClearstoryTagsList } from "@/components/clearstory/ClearstoryTagsList";
import { useClearstoryTable } from "@/hooks/useClearstoryTable";
import {
  getClearstoryApiPayload,
} from "@/lib/api/endpoints/clearstory";
import { ApiError } from "@/lib/api/client";
import {
  DirectoryRecordCard,
  humanizeKey,
  type DirectoryType,
} from "@/components/clearstory/ClearstoryDirectoryRecord";

type Tab = "lookup" | "customers" | "contracts" | "tags";

const TABS: { value: Tab; label: string }[] = [
  { value: "lookup", label: "Lookup" },
  { value: "customers", label: "Customers" },
  { value: "contracts", label: "Contracts" },
  { value: "tags", label: "Tags" },
];

const LABEL = "mb-1.5 block text-[13px] font-medium text-ink-muted";

/** Directory › Lookup record types, in chip order: what to enter and how to describe it. */
const LOOKUP_TYPES: { value: DirectoryType; label: string; field: string | null; tip: string }[] = [
  { value: "customer", label: "Customer", field: "Customer ID", tip: "The number Clearstory gives the customer." },
  { value: "contract", label: "Contract", field: "Contract ID", tip: "The contract's Clearstory ID." },
  { value: "user", label: "User", field: "User ID", tip: "The person's Clearstory user ID." },
  { value: "office", label: "Office", field: "Office ID", tip: "The office's Clearstory ID." },
  { value: "label", label: "Label", field: "Label ID", tip: "The label's Clearstory ID." },
  { value: "division", label: "Division", field: "Division", tip: "Type a division name, or pick a suggestion." },
  { value: "company", label: "Company", field: null, tip: "Your company's details. No ID needed." },
];

/** Known Clearstory division keys, offered as suggestions; any other division can be typed. */
const DIVISIONS = ["concrete_work", "demolition", "masonry", "thermal_insulation"];
/** "Concrete work" / "concrete-work" / "Concrete_Work" → Clearstory's key "concrete_work". */
const divisionKey = (typed: string) =>
  typed
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

type LookupError = { title: string; hint: string };

function describeLookupError(e: unknown, typeLabel: string, key: string): LookupError {
  if (!(e instanceof ApiError)) {
    return {
      title: "Can't reach the server",
      hint: "Check your internet connection, then try again. If other pages load fine, the server may be restarting; wait a minute.",
    };
  }
  if (e.status === 404) {
    return {
      title: `No ${typeLabel.toLowerCase()} with ID ${key}`,
      hint: "Check the number. Records added in Clearstory today appear after the next sync.",
    };
  }
  if (e.status === 403) return { title: "You don't have access to the directory", hint: "Ask an admin to give your account access." };
  return {
    title: "Something went wrong loading this record",
    hint: "Try again. If it keeps happening, tell the team which record you looked up.",
  };
}

/**
 * Division box: free typing with a styled suggestion list (the known divisions, filtered by what's typed).
 * Arrow keys move, Enter picks, Esc closes; clicking outside closes. Any other division can still be typed.
 */
function DivisionCombobox({
  value,
  onChange,
  onPick,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Called when a suggestion is chosen (click or Enter). */
  onPick: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // Filter only while the user is typing; opening the list (click, focus, chevron) shows every division.
  const [filtering, setFiltering] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // The list is drawn in a layer on <body> (fixed position under the box) so the Directory panel,
  // which clips its contents for the rounded corners, can't cut it off.
  const [pos, setPos] = useState<{ top: number; left: number; width: number; up: boolean } | null>(null);
  const place = () => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    const listH = 8 + DIVISIONS.length * 36;
    const up = r.bottom + 4 + listH > window.innerHeight && r.top - 4 - listH > 0;
    setPos({ top: up ? r.top - 4 - listH : r.bottom + 4, left: r.left, width: r.width, up });
  };
  const q = value.trim().toLowerCase();
  const all = DIVISIONS.map(humanizeKey);
  const options = filtering && q ? all.filter((d) => d.toLowerCase().includes(q)) : all;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  const show = () => {
    setFiltering(false);
    place();
    setOpen(true);
  };
  const pick = (v: string) => {
    onChange(v);
    onPick(v);
    setOpen(false);
    setFiltering(false);
    setActive(-1);
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        id="dir-key"
        role="combobox"
        aria-expanded={open && options.length > 0}
        aria-controls="dir-division-list"
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `dir-division-${active}` : undefined}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setFiltering(true);
          if (!open) place();
          setOpen(true);
          setActive(-1);
        }}
        onFocus={show}
        onClick={() => {
          if (!open) show();
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!open) show();
            setActive((i) => (options.length ? (i + 1) % options.length : -1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (options.length ? (i <= 0 ? options.length - 1 : i - 1) : -1));
          } else if (e.key === "Enter" && open && active >= 0 && options[active]) {
            e.preventDefault();
            pick(options[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
            setActive(-1);
          }
        }}
        placeholder="e.g. Demolition"
        autoComplete="off"
        className="cs-field w-full px-3 pr-9"
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Show divisions"
        onClick={() => (open ? setOpen(false) : show())}
        className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-ink/40 hover:bg-[#f3f4f6] hover:text-ink"
      >
        <svg
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && pos && options.length > 0 ? createPortal(
        <ul
          ref={listRef}
          id="dir-division-list"
          role="listbox"
          aria-label="Divisions"
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
          className="z-[60] overflow-hidden rounded-[10px] border border-[var(--border-subtle)] bg-white py-1 shadow-[0_12px_28px_-8px_rgba(1,1,1,0.18)]"
        >
          {options.map((o, i) => {
            const selected = o.toLowerCase() === q;
            return (
              <li
                key={o}
                id={`dir-division-${i}`}
                role="option"
                aria-selected={selected}
                // mousedown (not click) so the input keeps focus and the outside-click handler doesn't run first.
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(o);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-[13px] ${
                  i === active ? "bg-brand-tint text-brand-secondary" : "text-ink"
                }`}
              >
                {o}
                {selected ? (
                  <svg className="h-3.5 w-3.5 text-brand-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden>
                    <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
              </li>
            );
          })}
        </ul>,
        document.body
      ) : null}
    </div>
  );
}

/** Single Clearstory record by type + ID, shown as a readable card. */
function LookupTab() {
  const [entityType, setEntityType] = useState<DirectoryType>("customer");
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<LookupError | null>(null);
  const [result, setResult] = useState<{ type: DirectoryType; payload: unknown; fetchedAt: string | null } | null>(null);

  const meta = LOOKUP_TYPES.find((t) => t.value === entityType)!;
  const isCompany = entityType === "company";
  const isDivision = entityType === "division";

  const pickType = (t: DirectoryType) => {
    setEntityType(t);
    setKey("");
    setError(null);
    setResult(null);
  };

  const run = async (override?: string) => {
    const typed = override ?? key;
    const k = isCompany ? "current" : isDivision ? divisionKey(typed) : typed.trim();
    if (!k) {
      setError({
        title: isDivision ? "Enter a division" : `Enter a ${meta.field?.toLowerCase()}`,
        hint: isDivision ? `For example ${DIVISIONS.map(humanizeKey).join(", ")}.` : meta.tip,
      });
      return;
    }
    if (!isCompany && !isDivision && !/^\d+$/.test(k)) {
      setError({ title: `The ${meta.field?.toLowerCase()} should be a number`, hint: "Use digits only." });
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await getClearstoryApiPayload({ type: entityType, key: k });
      setResult({ type: entityType, payload: res.payload, fetchedAt: res.lastFetchedAt ?? null });
    } catch (e) {
      setError(describeLookupError(e, isDivision ? "division" : meta.label, isDivision ? humanizeKey(k) : k));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <span className={LABEL}>What are you looking up?</span>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Record type">
          {LOOKUP_TYPES.map((t) => {
            const active = t.value === entityType;
            return (
              <button
                key={t.value}
                type="button"
                aria-pressed={active}
                onClick={() => pickType(t.value)}
                className={`inline-flex h-[30px] items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors ${
                  active
                    ? "border-[#b9d8f6] bg-brand-tint text-brand-secondary"
                    : "border-[var(--border-subtle)] bg-white text-ink-muted hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-start"
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        {isCompany ? (
          <p className="cs-helper self-center">{meta.tip}</p>
        ) : (
          <div className="sm:w-[260px]">
            <label htmlFor="dir-key" className={LABEL}>
              {meta.field}
            </label>
            {isDivision ? (
              <DivisionCombobox value={key} onChange={setKey} onPick={(v) => void run(v)} />
            ) : (
              <input
                id="dir-key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                inputMode="numeric"
                autoComplete="off"
                className="cs-field w-full px-3"
              />
            )}
            <p className="mt-1.5 text-[12px] text-ink-muted">{meta.tip}</p>
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className={`${buttonClasses("primary")} ${isCompany ? "" : "sm:mt-[26px]"}`}
        >
          {loading ? "Loading…" : isCompany ? "Show company" : "Look up"}
        </button>
      </form>

      <div className="flex flex-col gap-2.5" aria-live="polite">
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
          <div className="flex flex-col gap-4 rounded-[10px] border border-[var(--border-subtle)] px-5 py-[18px]" aria-busy="true">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-[10px]" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-1/5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-9" />
              ))}
            </div>
          </div>
        ) : result ? (
          <DirectoryRecordCard type={result.type} payload={result.payload} fetchedAt={result.fetchedAt} />
        ) : null}
      </div>
    </div>
  );
}

/** Synced table (customers / contracts) shown inside the Directory box. */
function TableTab({ module, title }: { module: "customers" | "contracts"; title: string }) {
  const { rows, total, page, pageSize, setPage, setPageSize, isLoading, error } = useClearstoryTable(module);

  return (
    <div className="flex min-h-0 flex-col">
      <ClearstorySwaggerTable
        variant="panel"
        bare
        title={title}
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        loading={isLoading}
        error={error}
        footer={
          <span className="text-[13px] text-ink-muted">
            <span className="font-semibold text-ink">{total.toLocaleString()}</span> {title.toLowerCase()}
          </span>
        }
      />
    </div>
  );
}

export default function ClearstoryDirectoryPage() {
  const [tab, setTab] = useState<Tab>("lookup");

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col ui-animate-in [--radius:10px] [--radius-md:8px]">
      <section className="cs-content-panel flex flex-col gap-4 rounded-lg p-5">
        <div>
          <h1 className="cs-page-title">Directory</h1>
          <p className="cs-helper mt-1">Find and explore Clearstory records</p>
        </div>

        <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border-subtle)] bg-white">
          <div
            className="flex flex-wrap gap-1.5 border-b border-[var(--border-subtle)] p-3"
            role="tablist"
            aria-label="Directory views"
          >
            {TABS.map((t) => {
              const active = tab === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.value)}
                  className={`h-8 rounded-[var(--radius-md)] px-3 text-[13px] font-medium transition-colors ${
                    active
                      ? "bg-brand-tint text-brand-secondary"
                      : "bg-[#f3f4f6] text-ink-muted hover:bg-[#e9eaec] hover:text-ink"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <div role="tabpanel" aria-label={TABS.find((t) => t.value === tab)?.label}>
            {tab === "lookup" ? <LookupTab /> : null}
            {tab === "customers" ? <TableTab key="customers" module="customers" title="Customers" /> : null}
            {tab === "contracts" ? <TableTab key="contracts" module="contracts" title="Contracts" /> : null}
            {tab === "tags" ? <ClearstoryTagsList embedded /> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
