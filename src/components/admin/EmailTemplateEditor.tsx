"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as adminApi from "@/lib/api/endpoints/admin";
import { getApiErrorMessage } from "@/lib/api/client";
import { useToast } from "@/components/ui/ToastProvider";
import { FormSkeleton } from "@/components/ui/Skeleton";

type EmailTemplateEditorProps = {
  purpose: string;
  title: string;
  description: string;
};

type Saved = { name: string; subjectTemplate: string; bodyHtmlTemplate: string };

const inputClass =
  "h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 text-[13.5px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Body HTML with each {{placeholder}} shown as a tag — no sample data is invented. */
function previewDoc(bodyHtml: string): string {
  const tagged = bodyHtml.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, name: string) => {
    const label = /tablehtml$/i.test(name) ? `${name} (table)` : name;
    return `<span style="display:inline-block;background:#e3f2fd;color:#1565c0;border-radius:4px;padding:0 5px;font:12px ui-monospace,monospace">${escapeHtml(label)}</span>`;
  });
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:14px;font:13px/1.5 system-ui,sans-serif;color:#1f2328}table{border-collapse:collapse}td,th{border:1px solid #e6e8eb;padding:4px 8px}</style></head><body>${tagged}</body></html>`;
}

/** Edit one email template: name, subject and HTML body with a live preview beside it. */
export function EmailTemplateEditor({ purpose, title, description }: EmailTemplateEditorProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [subjectTemplate, setSubjectTemplate] = useState("");
  const [bodyHtmlTemplate, setBodyHtmlTemplate] = useState("");
  const [saved, setSaved] = useState<Saved | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  /** Where "Insert" puts a placeholder: the last field the cursor was in. */
  const lastField = useRef<"subject" | "body">("body");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const tpl = await adminApi.getActiveEmailTemplateByPurpose(purpose);
      setName(tpl.name);
      setSubjectTemplate(tpl.subjectTemplate);
      setBodyHtmlTemplate(tpl.bodyHtmlTemplate);
      setPlaceholders(tpl.placeholders ?? []);
      setSaved({ name: tpl.name, subjectTemplate: tpl.subjectTemplate, bodyHtmlTemplate: tpl.bodyHtmlTemplate });
    } catch (e) {
      showToast(getApiErrorMessage(e, `Couldn't load the "${title}" template`), "error");
    } finally {
      setLoading(false);
    }
  }, [purpose, title, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty =
    saved != null &&
    (saved.name !== name || saved.subjectTemplate !== subjectTemplate || saved.bodyHtmlTemplate !== bodyHtmlTemplate);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await adminApi.updateActiveEmailTemplateByPurpose(purpose, {
        name: name.trim() || title,
        subjectTemplate,
        bodyHtmlTemplate,
      });
      showToast("Template saved.", "success");
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to save template"), "error");
    } finally {
      setSaving(false);
    }
  }, [purpose, name, title, subjectTemplate, bodyHtmlTemplate, load, showToast]);

  const discard = () => {
    if (!saved) return;
    setName(saved.name);
    setSubjectTemplate(saved.subjectTemplate);
    setBodyHtmlTemplate(saved.bodyHtmlTemplate);
  };

  const insert = (ph: string) => {
    const field = lastField.current;
    const el = field === "subject" ? subjectRef.current : bodyRef.current;
    const value = field === "subject" ? subjectTemplate : bodyHtmlTemplate;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + ph + value.slice(end);
    if (field === "subject") setSubjectTemplate(next);
    else setBodyHtmlTemplate(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + ph.length, start + ph.length);
    });
  };

  const srcDoc = useMemo(() => previewDoc(bodyHtmlTemplate), [bodyHtmlTemplate]);

  if (loading) {
    return <FormSkeleton fields={4} />;
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        <p className="mt-0.5 text-[12.5px] text-ink-muted">{description}</p>
      </div>

      <label className="flex max-w-[360px] flex-col gap-1.5">
        <span className="text-[12.5px] font-medium text-ink-muted">Template name</span>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-medium text-ink-muted">Subject</span>
        <input
          ref={subjectRef}
          type="text"
          value={subjectTemplate}
          onFocus={() => (lastField.current = "subject")}
          onChange={(e) => setSubjectTemplate(e.target.value)}
          className={inputClass}
        />
      </label>

      <div className="grid gap-3 xl:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[12.5px] font-medium text-ink-muted">Body (HTML)</span>
          <textarea
            ref={bodyRef}
            value={bodyHtmlTemplate}
            onFocus={() => (lastField.current = "body")}
            onChange={(e) => setBodyHtmlTemplate(e.target.value)}
            spellCheck={false}
            className="h-[300px] w-full resize-y rounded-lg border border-[var(--border-subtle)] bg-[#fbfbfc] px-3.5 py-3 font-mono text-[12.5px] leading-relaxed text-[#374151] outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/15"
          />
        </label>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[12.5px] font-medium text-ink-muted">Live preview</span>
          {/* sandbox="" — template HTML can't run scripts or navigate */}
          <iframe
            title={`${title} preview`}
            sandbox=""
            srcDoc={srcDoc}
            className="h-[300px] w-full rounded-lg border border-[var(--border-subtle)] bg-white"
          />
        </div>
      </div>

      {placeholders.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[12px] text-ink-muted">Insert:</span>
          {placeholders.map((ph) => (
            <button
              key={ph}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insert(ph)}
              title={`Insert ${ph} at the cursor`}
              className="cursor-pointer rounded-[5px] bg-[#f1f2f4] px-1.5 py-0.5 font-mono text-[12px] text-[#374151] transition hover:bg-brand-tint hover:text-brand-secondary"
            >
              {ph}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex justify-end gap-2 border-t border-[#f0f1f3] pt-3.5">
        <button
          type="button"
          onClick={discard}
          disabled={!dirty || saving}
          className="inline-flex h-[34px] cursor-pointer items-center rounded-lg border border-[var(--border-subtle)] bg-white px-3.5 text-[13px] font-medium text-ink transition hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!dirty || saving}
          className="inline-flex h-[34px] cursor-pointer items-center rounded-lg bg-brand px-3.5 text-[13px] font-medium text-white transition hover:bg-brand-secondary disabled:cursor-not-allowed disabled:opacity-45"
        >
          {saving ? "Saving…" : "Save template"}
        </button>
      </div>
    </div>
  );
}
