"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusPill, type StatusTone } from "@/components/ui/StatusPill";
import { DocumentViewer } from "@/components/daily-reports/DocumentViewer";
import { ReviewPanel, type Corrections } from "@/components/daily-reports/ReviewPanel";
import { useAuth } from "@/contexts/AuthContext";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  getDailyReportDocument,
  getDailyReportTemplate,
  reextractDailyReport,
  uploadDailyReport,
  validateDailyReport,
  type DailyReportTemplate,
  type ExtractedField,
  type ExtractionResult,
  type FieldValue,
  type ReviewResult,
} from "@/lib/api/endpoints/daily-reports";
import { can, PERMISSIONS } from "@/lib/auth/permissions";

const ACCEPT = "image/jpeg,image/png,application/pdf";
const MAX_FILES = 20;

type Phase = "queued" | "uploading" | "extracting" | "review" | "failed" | "error";

type Item = {
  id: string;
  fileName: string;
  file?: File;
  phase: Phase;
  progress: number;
  result?: ExtractionResult;
  error?: string;
  /** Review state — fields/review are the latest server re-check. */
  corrections: Corrections;
  fields?: ExtractedField[];
  review?: ReviewResult;
  checking?: boolean;
};

const PHASE: Record<Phase, { tone: StatusTone; label: string }> = {
  queued: { tone: "neutral", label: "Queued" },
  uploading: { tone: "info", label: "Uploading" },
  extracting: { tone: "info", label: "Reading form" },
  review: { tone: "warning", label: "Review required" },
  failed: { tone: "danger", label: "Extraction failed" },
  error: { tone: "danger", label: "Upload failed" },
};

function applyResult(item: Item, result: ExtractionResult): Item {
  if (result.extraction.status === "complete") {
    return {
      ...item,
      file: undefined,
      phase: "review",
      progress: 1,
      result,
      error: undefined,
      corrections: {},
      fields: result.extraction.fields,
      review: result.extraction.review,
    };
  }
  return { ...item, file: undefined, phase: "failed", progress: 1, result, error: result.extraction.message };
}

let seq = 0;

export default function DailyReportsPage() {
  const { user } = useAuth();
  const canUpload = can(user, PERMISSIONS.connecteamWrite);
  const [template, setTemplate] = useState<DailyReportTemplate | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [docUrl, setDocUrl] = useState<{ id: string; url: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const queue = useRef<{ id: string; file: File }[]>([]);

  useEffect(() => {
    getDailyReportTemplate()
      .then(setTemplate)
      .catch((e) => setTemplateError(getApiErrorMessage(e, "Couldn't load the report template")));
  }, []);

  const update = useCallback((id: string, patch: (item: Item) => Item) => {
    setItems((list) => list.map((it) => (it.id === id ? patch(it) : it)));
  }, []);

  /** Upload one at a time so extraction doesn't flood the provider. */
  const drain = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      for (let next = queue.current.shift(); next; next = queue.current.shift()) {
        const { id, file } = next;
        update(id, (it) => ({ ...it, phase: "uploading", progress: 0 }));
        try {
          const result = await uploadDailyReport(file, {
            onProgress: (p) => update(id, (it) => ({ ...it, progress: p })),
            onUploaded: () => update(id, (it) => ({ ...it, phase: "extracting", progress: 1 })),
          });
          update(id, (it) => applyResult(it, result));
          setSelectedId((cur) => cur ?? id);
        } catch (e) {
          update(id, (it) => ({ ...it, file: undefined, phase: "error", error: getApiErrorMessage(e, "Upload failed") }));
        }
      }
    } finally {
      busy.current = false;
    }
  }, [update]);

  const addFiles = useCallback(
    (list: FileList | File[] | null) => {
      const files = Array.from(list ?? []);
      if (!files.length) return;
      const accepted: Item[] = [];
      const rejected: string[] = [];
      for (const file of files.slice(0, MAX_FILES)) {
        if (!ACCEPT.split(",").includes(file.type) || file.size === 0) {
          rejected.push(`${file.name}: only JPG, PNG or PDF`);
        } else if (template && file.size > template.maxUploadBytes) {
          rejected.push(`${file.name}: larger than ${Math.round(template.maxUploadBytes / 1048576)} MB`);
        } else {
          accepted.push({ id: `u${++seq}`, fileName: file.name, file, phase: "queued", progress: 0, corrections: {} });
        }
      }
      if (files.length > MAX_FILES) rejected.push(`Only the first ${MAX_FILES} files were added`);
      setNotice(rejected.length ? rejected.join(" · ") : null);
      if (!accepted.length) return;
      setItems((cur) => [...cur, ...accepted]);
      for (const it of accepted) queue.current.push({ id: it.id, file: it.file! });
      void drain();
    },
    [drain, template]
  );

  const selected = items.find((it) => it.id === selectedId) ?? null;
  const documentId = selected?.result?.document.id ?? null;

  // Fetch the private original for the selected report.
  useEffect(() => {
    if (!documentId) return;
    let url: string | null = null;
    let cancelled = false;
    getDailyReportDocument(documentId)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setDocUrl({ id: documentId, url });
      })
      .catch(() => {
        if (!cancelled) setNotice("Couldn't load the original document.");
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [documentId]);

  // Re-check on the server after edits (same engine as extraction).
  const correctionsKey = selected ? JSON.stringify(selected.corrections) : "";
  const selectedPhase = selected?.phase;
  useEffect(() => {
    if (!selected || selectedPhase !== "review" || selected.result?.extraction.status !== "complete") return;
    if (!Object.keys(selected.corrections).length) return;
    const id = selected.id;
    const original = selected.result.extraction.fields;
    const corrections = selected.corrections;
    const handle = window.setTimeout(() => {
      update(id, (it) => ({ ...it, checking: true }));
      validateDailyReport(original, corrections)
        .then((res) => update(id, (it) => ({ ...it, fields: res.fields, review: res.review, checking: false })))
        .catch((e) => {
          update(id, (it) => ({ ...it, checking: false }));
          setNotice(getApiErrorMessage(e, "Couldn't re-check the report"));
        });
    }, 400);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the serialized corrections
  }, [selected?.id, selectedPhase, correctionsKey, update]);

  const correct = (key: string, value: FieldValue) => {
    if (!selected) return;
    update(selected.id, (it) => ({ ...it, corrections: { ...it.corrections, [key]: value } }));
  };

  const retry = async (item: Item) => {
    const docId = item.result?.document.id;
    if (!docId) return;
    update(item.id, (it) => ({ ...it, phase: "extracting", error: undefined }));
    try {
      const result = await reextractDailyReport(docId);
      update(item.id, (it) => applyResult(it, result));
    } catch (e) {
      update(item.id, (it) => ({ ...it, phase: "failed", error: getApiErrorMessage(e, "Extraction failed") }));
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (canUpload) addFiles(e.dataTransfer.files);
  };

  if (templateError) {
    return <EmptyState message={templateError} />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 ui-animate-in">
      <PageHeader
        title="Daily work reports"
        subtitle="Review and manage employee daily work, labor hours, and production activity."
        action={
          canUpload ? (
            <button type="button" className={buttonClasses("primary")} onClick={() => fileInput.current?.click()}>
              Upload reports
            </button>
          ) : undefined
        }
      />

      <input
        ref={fileInput}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {template && !template.providerConfigured ? (
        <div role="status" className="rounded-lg border border-warning-border bg-warning-tint px-4 py-3 text-[13px] text-warning">
          AI extraction isn&apos;t configured on the server (OPENAI_API_KEY). Uploads are stored, but forms can&apos;t be read until it is set.
        </div>
      ) : null}
      {notice ? (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-lg border border-danger-border bg-danger-tint px-4 py-2.5 text-[13px] text-danger">
          <span>{notice}</span>
          <button type="button" className="shrink-0 font-semibold hover:underline" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      {canUpload ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
            dragging ? "border-brand bg-brand-tint" : "border-[var(--border-subtle)] bg-white"
          }`}
        >
          <p className="text-[14px] font-medium text-ink">Drop photos or PDFs of the Daily Work &amp; Time Report</p>
          <p className="text-[12.5px] text-ink-muted">JPG, PNG or PDF · up to {MAX_FILES} files at a time</p>
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            <button type="button" className={buttonClasses("secondary", "sm")} onClick={() => fileInput.current?.click()}>
              Choose files
            </button>
            <button type="button" className={`${buttonClasses("secondary", "sm")} sm:hidden`} onClick={() => cameraInput.current?.click()}>
              Take photo
            </button>
          </div>
        </div>
      ) : null}

      {items.length ? (
        <section className="overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-white">
          <ul className="divide-y divide-[var(--border-subtle)]">
            {items.map((it) => {
              const phase = PHASE[it.phase];
              const blocking = it.review?.issues.filter((i) => i.severity === "blocking").length ?? 0;
              const active = it.id === selectedId;
              return (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => it.result && setSelectedId(it.id)}
                    disabled={!it.result}
                    aria-current={active ? "true" : undefined}
                    className={`flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-left transition-colors disabled:cursor-default ${
                      active ? "bg-brand-tint shadow-[inset_3px_0_0_var(--brand)]" : "hover:bg-[#fafbfc]"
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{it.fileName}</span>
                    {it.result?.duplicate ? <span className="text-[12px] text-ink-muted">Already uploaded</span> : null}
                    {it.phase === "review" ? (
                      <span className="text-[12px] text-ink-muted">{blocking ? `${blocking} to fix` : "No blocking issues"}</span>
                    ) : null}
                    {it.error && it.phase !== "failed" ? <span className="text-[12px] text-danger">{it.error}</span> : null}
                    <StatusPill tone={phase.tone} label={phase.label} />
                    {it.phase === "uploading" ? (
                      <span className="h-1 w-full overflow-hidden rounded-full bg-[#eef0f3]">
                        <span className="block h-full bg-brand transition-[width]" style={{ width: `${Math.round(it.progress * 100)}%` }} />
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {!template ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : selected?.result ? (
        <div className="grid min-h-0 gap-4 lg:grid-cols-2">
          <div className="lg:sticky lg:top-4 lg:h-[calc(100dvh-8rem)]">
            <DocumentViewer meta={selected.result.document} url={docUrl?.id === documentId ? docUrl.url : null} />
          </div>
          {selected.phase === "review" && selected.fields && selected.review && selected.result.extraction.status === "complete" ? (
            <ReviewPanel
              template={template}
              original={selected.result.extraction.fields}
              current={selected.fields}
              review={selected.review}
              corrections={selected.corrections}
              onCorrect={correct}
              checking={Boolean(selected.checking)}
            />
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-lg border border-[var(--border-subtle)] bg-white p-5">
              <StatusPill tone={PHASE[selected.phase].tone} label={PHASE[selected.phase].label} />
              <p className="text-[13px] text-ink">
                {selected.phase === "extracting" ? "Reading the form…" : selected.error ?? "The form couldn't be read."}
              </p>
              <p className="text-[12.5px] text-ink-muted">The original is stored; you can try reading it again.</p>
              {canUpload && selected.phase === "failed" ? (
                <button type="button" className={buttonClasses("secondary", "sm")} onClick={() => void retry(selected)}>
                  Retry extraction
                </button>
              ) : null}
            </div>
          )}
        </div>
      ) : !items.length ? (
        <EmptyState message={canUpload ? "Upload a report to read and review it." : "You don't have permission to upload reports."} />
      ) : null}
    </div>
  );
}
