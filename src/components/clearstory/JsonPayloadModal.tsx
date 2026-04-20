"use client";

import { useEffect, useMemo } from "react";
import { LogoLoader } from "@/components/ui/LogoLoader";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function looksLikeHtmlString(value: string): boolean {
  return /<\s*\/?\s*[a-zA-Z][^>]*>/.test(value);
}

function htmlToText(value: string): string {
  // Best-effort conversion: preserve <br> and </p> as line breaks.
  const withBreaks = value
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/\s*p\s*>/gi, "\n")
    .replace(/<\s*p(\s+[^>]*)?>/gi, "");

  // Prefer DOMParser for entity decoding when available.
  if (typeof window !== "undefined" && "DOMParser" in window) {
    try {
      const doc = new DOMParser().parseFromString(withBreaks, "text/html");
      const t = doc.body.textContent ?? "";
      return t.replace(/\n{3,}/g, "\n\n").trim();
    } catch {
      /* fall through */
    }
  }

  // Fallback: strip tags.
  return withBreaks.replace(/<[^>]+>/g, " ").replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function formatScalar(v: unknown): string {
  if (v === null) return "—";
  if (v === undefined) return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "—";
}

function previewScalar(v: unknown, maxLen = 220): string {
  const s = formatScalar(v);
  if (!s) return "—";
  const t = String(s);
  return t.length > maxLen ? `${t.slice(0, maxLen - 1)}…` : t;
}

const MAX_ARRAY_ITEMS = 80;

function ValueBlock({ value, depth }: { value: unknown; depth: number }) {
  if (value === null || value === undefined) {
    return <span className="text-sm leading-6 text-ink/45">—</span>;
  }

  if (typeof value === "string") {
    const isHtml = looksLikeHtmlString(value);
    const text = isHtml ? htmlToText(value) : value;
    const isLong = text.length > 360;
    return isLong ? (
      <div className="max-h-[56vh] overflow-auto rounded-xl border border-ink/[0.1] bg-white px-3 py-2.5">
        <div className="whitespace-pre-wrap text-sm leading-6 text-ink [overflow-wrap:anywhere]">{text || "—"}</div>
      </div>
    ) : (
      <span className="text-sm leading-6 text-ink [overflow-wrap:anywhere]">{previewScalar(text, 360)}</span>
    );
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return (
      <span className="text-sm leading-6 text-ink [overflow-wrap:anywhere]">
        {previewScalar(value, 360)}
      </span>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-ink/45">—</span>;
    const items = value.slice(0, MAX_ARRAY_ITEMS);
    return (
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-ink/[0.1] bg-[#f6f7f9] p-4 text-sm leading-6 text-ink shadow-sm"
          >
            {isPlainObject(item) ? (
              <FieldValueList data={item} depth={depth + 1} />
            ) : (
              <span className="[overflow-wrap:anywhere]">{previewScalar(item, 360)}</span>
            )}
          </div>
        ))}
        {value.length > items.length ? (
          <div className="pt-1 text-xs font-medium text-ink/45">
            Showing {items.length} of {value.length}
          </div>
        ) : null}
      </div>
    );
  }

  if (isPlainObject(value)) {
    return (
      <div className="rounded-2xl border border-ink/[0.1] bg-[#f6f7f9] p-4 text-sm leading-6 text-ink shadow-sm">
        <FieldValueList data={value} depth={depth + 1} />
      </div>
    );
  }

  return (
    <span className="text-sm leading-6 text-ink [overflow-wrap:anywhere]">
      {previewScalar(String(value), 360)}
    </span>
  );
}

function FieldValueList({ data, depth }: { data: Record<string, unknown>; depth: number }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return <span className="text-ink/45">—</span>;

  return (
    <dl className="divide-y divide-ink/[0.08]">
      {entries.map(([k, v]) => (
        <div key={k} className="py-3 sm:py-3.5">
          <div className="grid grid-cols-12 items-start gap-x-6 gap-y-2">
            <dt title={k} className="col-span-12 sm:col-span-4">
              <span className="block truncate text-xs font-semibold tracking-wide text-ink/55">
                {k}
              </span>
            </dt>
            <dd className="col-span-12 min-w-0 sm:col-span-8">
              <ValueBlock value={v} depth={depth} />
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

export function JsonPayloadModal({
  open,
  title,
  subtitle,
  loading,
  error,
  lastFetchedAt,
  payload,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  loading: boolean;
  error: string | null;
  lastFetchedAt?: string;
  payload: unknown;
  onClose: () => void;
}) {
  if (!open) return null;

  const parsedPayload = useMemo(() => {
    if (payload === undefined || payload === null) return payload;
    if (typeof payload !== "string") return payload;
    const t = payload.trim();
    if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
      try {
        return JSON.parse(t) as unknown;
      } catch {
        return payload;
      }
    }
    return payload;
  }, [payload]);

  useEffect(() => {
    if (!open) return;
  }, [open, payload]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="json-payload-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(92dvh,880px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-ink/[0.12] bg-surface shadow-[0_20px_80px_rgba(0,0,0,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-ink/[0.08] bg-[#fbfbfd] px-6 py-5">
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="json-payload-modal-title" className="text-base font-semibold tracking-tight text-ink sm:text-lg">
                  {title}
                </h2>
                {lastFetchedAt ? (
                  <span className="inline-flex items-center rounded-full border border-ink/[0.12] bg-white px-2.5 py-1 text-[11px] font-semibold text-ink/55">
                    Fetched {lastFetchedAt}
                  </span>
                ) : null}
              </div>
              {subtitle ? <p className="mt-1.5 text-sm leading-relaxed text-ink/55">{subtitle}</p> : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-ink/65 transition hover:bg-ink/[0.06] hover:text-ink"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-[#f3f4f7] p-4 sm:p-5">
          {loading ? (
            <div className="flex justify-center py-16">
              <LogoLoader size={32} />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
              {error}
            </div>
          ) : (
            <div className="mx-auto w-full max-w-[1100px]">
              <div className="mb-3 text-sm font-semibold text-ink">Details</div>
              <div className="rounded-2xl border border-ink/[0.1] bg-white p-4 shadow-sm sm:p-6">
                {isPlainObject(parsedPayload) ? (
                  <FieldValueList data={parsedPayload} depth={0} />
                ) : Array.isArray(parsedPayload) ? (
                  <ValueBlock value={parsedPayload} depth={0} />
                ) : (
                  <ValueBlock value={parsedPayload} depth={0} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
