"use client";

import { useCallback, useEffect, useState } from "react";
import * as adminApi from "@/lib/api/endpoints/admin";
import { getApiErrorMessage } from "@/lib/api/client";
import { useToast } from "@/components/ui/ToastProvider";
import { FormSkeleton } from "@/components/ui/Skeleton";

type EmailTemplateEditorProps = {
  purpose: string;
  title: string;
  description: string;
};

export function EmailTemplateEditor({ purpose, title, description }: EmailTemplateEditorProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [subjectTemplate, setSubjectTemplate] = useState("");
  const [bodyHtmlTemplate, setBodyHtmlTemplate] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const tpl = await adminApi.getActiveEmailTemplateByPurpose(purpose);
      setName(tpl.name);
      setSubjectTemplate(tpl.subjectTemplate);
      setBodyHtmlTemplate(tpl.bodyHtmlTemplate);
      setPlaceholders(tpl.placeholders ?? []);
    } catch (e) {
      showToast(getApiErrorMessage(e, `Failed to load template for ${purpose}`), "error");
    } finally {
      setLoading(false);
    }
  }, [purpose, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

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

  if (loading) {
    return <FormSkeleton fields={4} />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">{title}</h3>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{description}</p>
        <p className="mt-1 font-mono text-[11px] text-stone-400">purpose: {purpose}</p>
      </div>

      {placeholders.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {placeholders.map((ph) => (
            <code
              key={ph}
              className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] text-stone-700 dark:bg-stone-800 dark:text-stone-300"
            >
              {ph}
            </code>
          ))}
        </div>
      ) : null}

      <div>
        <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Template name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Subject</label>
        <input
          type="text"
          value={subjectTemplate}
          onChange={(e) => setSubjectTemplate(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Body (HTML)</label>
        <textarea
          value={bodyHtmlTemplate}
          onChange={(e) => setBodyHtmlTemplate(e.target.value)}
          rows={10}
          className="mt-1 w-full font-mono text-xs rounded-lg border border-stone-300 bg-white px-3 py-2 dark:border-stone-600 dark:bg-stone-900"
        />
      </div>

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save template"}
      </button>
    </div>
  );
}
