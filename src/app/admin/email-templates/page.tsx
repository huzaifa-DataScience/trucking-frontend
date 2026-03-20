"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/ToastProvider";
import * as adminApi from "@/lib/api/endpoints/admin";
import { getApiErrorMessage } from "@/lib/api/client";
import type {
  AdminEmailTemplateActive,
  AdminEmailTemplateListItem,
} from "@/lib/admin/types";

const EMAIL_PREVIEW_WIDTH_PX = 640;

function replaceTokens(template: string, replacements: Record<string, string>): string {
  let result = template;
  for (const [token, value] of Object.entries(replacements)) {
    result = result.split(token).join(value);
  }
  return result;
}

function extractTokens(template: string): string[] {
  const tokens = template.match(/{{[a-zA-Z0-9_]+}}/g) ?? [];
  // Uniquify but keep stable order.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function getSampleItemsTableHtml() {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
      <thead>
        <tr>
          <th style="text-align:left;border-bottom:1px solid #e5e7eb;padding:10px 0;">Pay App</th>
          <th style="text-align:left;border-bottom:1px solid #e5e7eb;padding:10px 0;">Customer</th>
          <th style="text-align:right;border-bottom:1px solid #e5e7eb;padding:10px 0;">Days Overdue</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border-bottom:1px solid #f1f5f9;padding:10px 0;">PA-10021</td>
          <td style="border-bottom:1px solid #f1f5f9;padding:10px 0;">Northline Supplies</td>
          <td style="border-bottom:1px solid #f1f5f9;padding:10px 0;text-align:right;">72</td>
        </tr>
        <tr>
          <td style="border-bottom:1px solid #f1f5f9;padding:10px 0;">PA-10077</td>
          <td style="border-bottom:1px solid #f1f5f9;padding:10px 0;">Evergreen Builders</td>
          <td style="border-bottom:1px solid #f1f5f9;padding:10px 0;text-align:right;">58</td>
        </tr>
      </tbody>
    </table>
  `.trim();
}

function tokenToHumanLabel(token: string): string {
  const raw = token.replace(/[{}]/g, "");
  const map: Record<string, string> = {
    leadPmName: "Lead PM display name",
    daysThreshold: "Days threshold from OVERDUE_EMAIL_DAYS (e.g. 50)",
    itemCount: "Number of overdue pay apps in this email",
    itemsTableHtml: "Backend-provided HTML table of overdue items",
  };
  return map[raw] ?? humanizeIdentifier(raw);
}

function humanizeIdentifier(value: string): string {
  return value
    .replace(/[._-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function AdminEmailTemplatesPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [purposes, setPurposes] = useState<string[]>([]);
  const [purposesLoading, setPurposesLoading] = useState(true);

  const purposeFromQuery = searchParams.get("purpose") ?? undefined;
  const [selectedPurpose, setSelectedPurpose] = useState<string | null>(null);

  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templates, setTemplates] = useState<AdminEmailTemplateListItem[]>([]);

  const [activePlaceholders, setActivePlaceholders] = useState<string[]>([]);
  const [placeholdersLoading, setPlaceholdersLoading] = useState(false);
  const [placeholdersError, setPlaceholdersError] = useState<string | null>(null);

  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string | null>(null);

  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateKey) return null;
    return templates.find((t) => t.templateKey === selectedTemplateKey) ?? null;
  }, [selectedTemplateKey, templates]);

  const [name, setName] = useState("");
  const [subjectTemplate, setSubjectTemplate] = useState("");
  const [bodyHtmlTemplate, setBodyHtmlTemplate] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  // Dirty detection: compare current editor values to the selected template snapshot.
  const loadedSnapshotRef = useRef<{ name: string; subjectTemplate: string; bodyHtmlTemplate: string } | null>(null);

  const dirty = useMemo(() => {
    if (!loadedSnapshotRef.current) return false;
    return (
      name !== loadedSnapshotRef.current.name ||
      subjectTemplate !== loadedSnapshotRef.current.subjectTemplate ||
      bodyHtmlTemplate !== loadedSnapshotRef.current.bodyHtmlTemplate
    );
  }, [name, subjectTemplate, bodyHtmlTemplate]);

  const tokensInEditor = useMemo(() => {
    return Array.from(new Set([...extractTokens(subjectTemplate), ...extractTokens(bodyHtmlTemplate)])).sort();
  }, [subjectTemplate, bodyHtmlTemplate]);

  const previewTokenReplacements = useMemo(() => {
    const replacements: Record<string, string> = {};

    // Known siteline tokens (so the preview looks good immediately).
    replacements["{{leadPmName}}"] = "Alex Morgan";
    replacements["{{daysThreshold}}"] = "50";
    replacements["{{itemCount}}"] = "2";
    replacements["{{itemsTableHtml}}"] = getSampleItemsTableHtml();

    // Generic fallback for unknown tokens.
    for (const token of tokensInEditor) {
      if (replacements[token] !== undefined) continue;
      const raw = token.replace(/[{}]/g, "");
      replacements[token] = raw;
    }
    return replacements;
  }, [tokensInEditor]);

  const previewSubject = useMemo(() => {
    return replaceTokens(subjectTemplate || "", previewTokenReplacements);
  }, [subjectTemplate, previewTokenReplacements]);

  const previewBodyHtml = useMemo(() => {
    if (!bodyHtmlTemplate) return "<p style=\"color:#6b7280;\">Body template is empty.</p>";
    return replaceTokens(bodyHtmlTemplate, previewTokenReplacements);
  }, [bodyHtmlTemplate, previewTokenReplacements]);

  const previewSrcDoc = useMemo(() => {
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { margin: 0; padding: 16px; background: #ffffff; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
      .emailPreviewWrap { max-width: ${EMAIL_PREVIEW_WIDTH_PX}px; margin: 0 auto; }
      img { max-width: 100%; }
    </style>
  </head>
  <body>
    <div class="emailPreviewWrap">
      ${previewBodyHtml}
    </div>
  </body>
</html>`;
  }, [previewBodyHtml]);

  const subjectInputRef = useRef<HTMLInputElement | null>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const insertToken = useCallback(
    (token: string, target: "subject" | "body") => {
      const el = target === "subject" ? subjectInputRef.current : bodyTextareaRef.current;
      if (!el) return;

      const currentValue = el.value ?? "";
      const start = typeof el.selectionStart === "number" ? el.selectionStart : currentValue.length;
      const end = typeof el.selectionEnd === "number" ? el.selectionEnd : currentValue.length;

      const nextValue = currentValue.slice(0, start) + token + currentValue.slice(end);
      if (target === "subject") setSubjectTemplate(nextValue);
      else setBodyHtmlTemplate(nextValue);

      const nextCaret = start + token.length;
      requestAnimationFrame(() => {
        try {
          el.focus();
          el.setSelectionRange(nextCaret, nextCaret);
        } catch {
          // Ignore selection errors.
        }
      });
    },
    []
  );

  const loadPurposes = useCallback(async () => {
    setPurposesLoading(true);
    try {
      const res = await adminApi.getEmailTemplatePurposes();
      setPurposes(res.purposes ?? []);
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to load purposes"), "error");
      setPurposes([]);
    } finally {
      setPurposesLoading(false);
    }
  }, [showToast]);

  const loadTemplates = useCallback(
    async (purpose: string) => {
      setTemplatesLoading(true);
      setTemplates([]);
      try {
        const res = await adminApi.listEmailTemplates({ purpose });
        setTemplates(res ?? []);
      } catch (e) {
        showToast(getApiErrorMessage(e, "Failed to load templates"), "error");
      } finally {
        setTemplatesLoading(false);
      }
    },
    [showToast]
  );

  const loadPlaceholdersForPurpose = useCallback(
    async (purpose: string) => {
      setPlaceholdersLoading(true);
      setPlaceholdersError(null);
      try {
        const res: AdminEmailTemplateActive = await adminApi.getActiveEmailTemplateByPurpose(purpose);
        setActivePlaceholders(res.placeholders ?? []);
      } catch (e) {
        // Contract says this fails until an active template exists.
        setPlaceholdersError(getApiErrorMessage(e, "Failed to load placeholders"));
        setActivePlaceholders([]);
      } finally {
        setPlaceholdersLoading(false);
      }
    },
    []
  );

  // Initial load: purposes + initial selected purpose (from query if present).
  useEffect(() => {
    void (async () => {
      await loadPurposes();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (purposesLoading) return;
    if (selectedPurpose) return;

    if (purposeFromQuery && purposes.includes(purposeFromQuery)) {
      setSelectedPurpose(purposeFromQuery);
      return;
    }
    setSelectedPurpose(purposes[0] ?? null);
  }, [purposes, purposesLoading, purposeFromQuery, selectedPurpose]);

  // Load templates when selected purpose changes.
  useEffect(() => {
    if (!selectedPurpose) return;
    void loadTemplates(selectedPurpose);
    void loadPlaceholdersForPurpose(selectedPurpose);
  }, [selectedPurpose, loadTemplates, loadPlaceholdersForPurpose]);

  // Select an initial template when templates load.
  useEffect(() => {
    if (templatesLoading) return;
    if (templates.length === 0) {
      setSelectedTemplateKey(null);
      return;
    }

    // Prefer active template in the list.
    const active = templates.find((t) => t.isActive);
    const nextKey = active?.templateKey ?? templates[0].templateKey;
    setSelectedTemplateKey((prev) => prev ?? nextKey);
  }, [templates, templatesLoading]);

  // When the selected template changes, snapshot its values into the editor.
  useEffect(() => {
    if (!selectedTemplate) return;
    setName(selectedTemplate.name ?? "");
    setSubjectTemplate(selectedTemplate.subjectTemplate ?? "");
    setBodyHtmlTemplate(selectedTemplate.bodyHtmlTemplate ?? "");
    setUpdatedAt(selectedTemplate.updatedAt ?? null);
    loadedSnapshotRef.current = {
      name: selectedTemplate.name ?? "",
      subjectTemplate: selectedTemplate.subjectTemplate ?? "",
      bodyHtmlTemplate: selectedTemplate.bodyHtmlTemplate ?? "",
    };
  }, [selectedTemplate]);

  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!selectedTemplate) return;
    if (!dirty) return;

    setSaving(true);
    try {
      await adminApi.updateEmailTemplateByKey(selectedTemplate.templateKey, {
        name,
        subjectTemplate,
        bodyHtmlTemplate,
        isActive: selectedTemplate.isActive,
      });

      showToast("Email template saved.", "success");

      // Reload list so updatedAt and editor snapshot are consistent.
      await loadTemplates(selectedTemplate.purpose);

      // Force selection to remain stable.
      setSelectedTemplateKey(selectedTemplate.templateKey);
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to save template"), "error");
    } finally {
      setSaving(false);
    }
  }, [
    bodyHtmlTemplate,
    dirty,
    loadTemplates,
    name,
    selectedTemplate,
    showToast,
    subjectTemplate,
  ]);

  const handleActivate = useCallback(async () => {
    if (!selectedTemplate) return;
    if (selectedTemplate.isActive) return;

    setSaving(true);
    try {
      await adminApi.activateEmailTemplateByKey(selectedTemplate.templateKey);
      showToast("Template activated.", "success");

      // Refresh list and placeholders for this purpose.
      await loadTemplates(selectedTemplate.purpose);
      await loadPlaceholdersForPurpose(selectedTemplate.purpose);
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to activate template"), "error");
    } finally {
      setSaving(false);
    }
  }, [loadPlaceholdersForPurpose, loadTemplates, selectedTemplate, showToast]);

  const placeholderTokensForChips = useMemo(() => {
    if (activePlaceholders.length > 0) return activePlaceholders;
    return tokensInEditor;
  }, [activePlaceholders, tokensInEditor]);

  const isSelectedActive = selectedTemplate?.isActive ?? false;

  const purposeValue = selectedPurpose ?? "";
  const selectedPurposeLabel = selectedPurpose ? humanizeIdentifier(selectedPurpose) : "";

  const handlePurposeChange = useCallback(
    (nextPurpose: string) => {
      setSelectedPurpose(nextPurpose);
      setSelectedTemplateKey(null);

      const params = new URLSearchParams(searchParams.toString());
      if (nextPurpose) params.set("purpose", nextPurpose);
      router.push(`/admin/email-templates?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
              Email templates
            </h1>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
              Select a purpose, pick a template (active or inactive), edit subject/body, and activate when ready.
            </p>
            {selectedPurpose ? (
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                Current purpose: {selectedPurposeLabel}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">
                Purpose
              </label>
              <select
                value={purposeValue}
                onChange={(e) => handlePurposeChange(e.target.value)}
                disabled={purposesLoading || saving}
                className="mt-1 w-full min-w-[260px] rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              >
                {purposes.map((p) => (
                  <option key={p} value={p}>
                    {humanizeIdentifier(p)}
                  </option>
                ))}
              </select>
            </div>

            {dirty ? (
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
                Unsaved changes
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-600 dark:border-stone-800 dark:bg-stone-900/40 dark:text-stone-300">
                Up to date
              </span>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: template selector */}
        <div className="lg:col-span-4">
          <Card>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Templates</h2>
                {templatesLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                ) : (
                  <span className="text-xs text-stone-500 dark:text-stone-400">
                    {templates.length} template{templates.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              {templatesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                </div>
              ) : templates.length === 0 ? (
                <div className="rounded-lg border border-stone-200 bg-white px-4 py-8 text-center dark:border-stone-800 dark:bg-stone-900/40">
                  <p className="text-sm text-stone-600 dark:text-stone-400">
                    No templates found for this purpose.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {templates.map((t) => {
                    const isSelected = t.templateKey === selectedTemplateKey;
                    return (
                      <button
                        key={t.templateKey}
                        type="button"
                        onClick={() => setSelectedTemplateKey(t.templateKey)}
                        className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                          isSelected
                            ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20"
                            : "border-stone-200 bg-white hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900/40 dark:hover:bg-stone-900/70"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {t.isActive ? (
                                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-900 dark:bg-green-950/20 dark:text-green-200">
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-stone-50 px-2 py-0.5 text-[11px] font-semibold text-stone-600 dark:bg-stone-900/70 dark:text-stone-300">
                                  Inactive
                                </span>
                              )}
                              <div className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                                {t.name}
                              </div>
                            </div>
                            <div className="mt-1 truncate text-xs font-mono text-stone-500 dark:text-stone-400">
                              {t.templateKey}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right: editor + preview */}
        <div className="lg:col-span-8">
          {selectedTemplate ? (
            <div className="space-y-6">
              <Card>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      Editing: {selectedTemplate.name}
                    </div>
                    <div className="mt-1 text-xs font-mono text-stone-500 dark:text-stone-400">
                      {selectedTemplate.templateKey}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void handleSave()}
                      disabled={saving || !dirty}
                      className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 dark:bg-amber-600 dark:hover:bg-amber-500"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleActivate()}
                      disabled={saving || isSelectedActive}
                      className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
                      title={isSelectedActive ? "Already active" : "Activate this template for the current purpose"}
                    >
                      {isSelectedActive ? "Active" : saving ? "Activating…" : "Activate"}
                    </button>
                  </div>
                </div>

                {updatedAt && (
                  <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                    Last updated: {new Date(updatedAt).toLocaleString()}
                  </p>
                )}
              </Card>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label
                        htmlFor="templateName"
                        className="block text-sm font-medium text-stone-700 dark:text-stone-300"
                      >
                        Name
                      </label>
                      <input
                        id="templateName"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                        autoComplete="off"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-end justify-between gap-4">
                        <label
                          htmlFor="subjectTemplate"
                          className="block text-sm font-medium text-stone-700 dark:text-stone-300"
                        >
                          Subject template
                        </label>
                        <span className="text-xs text-stone-500 dark:text-stone-400">
                          {subjectTemplate.length} chars
                        </span>
                      </div>
                      <input
                        id="subjectTemplate"
                        ref={subjectInputRef}
                        type="text"
                        value={subjectTemplate}
                        onChange={(e) => setSubjectTemplate(e.target.value)}
                        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                        autoComplete="off"
                        placeholder="Overdue pay apps (> {{daysThreshold}} days): {{itemCount}} item(s)"
                      />
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs font-medium text-stone-600 dark:text-stone-400">Insert:</span>
                        {placeholderTokensForChips.length > 0 ? (
                      placeholderTokensForChips.map((token) => (
                              <button
                                key={token}
                                type="button"
                                onClick={() => insertToken(token, "subject")}
                                className="rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900/40 dark:text-stone-200 dark:hover:bg-stone-800"
                                title={tokenToHumanLabel(token)}
                              >
                                <code className="font-mono">{token}</code>
                              </button>
                      ))
                        ) : (
                          <span className="text-xs text-stone-500 dark:text-stone-400">No placeholders yet.</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="bodyHtmlTemplate"
                        className="block text-sm font-medium text-stone-700 dark:text-stone-300"
                      >
                        Body (HTML)
                      </label>
                      <textarea
                        id="bodyHtmlTemplate"
                        ref={bodyTextareaRef}
                        value={bodyHtmlTemplate}
                        onChange={(e) => setBodyHtmlTemplate(e.target.value)}
                        rows={22}
                        spellCheck={false}
                        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-sm text-stone-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                        placeholder={`Example:\n<p>Hi {{leadPmName}},</p>\n{{itemsTableHtml}}\n`}
                      />

                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs font-medium text-stone-600 dark:text-stone-400">Insert:</span>
                        {placeholderTokensForChips.map((token) => (
                          <button
                            key={token}
                            type="button"
                            onClick={() => insertToken(token, "body")}
                            className="rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900/40 dark:text-stone-200 dark:hover:bg-stone-800"
                            title={tokenToHumanLabel(token)}
                          >
                            <code className="font-mono">{token}</code>
                          </button>
                        ))}
                      </div>

                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Preview uses sample values. The backend replaces placeholders with real context at send time.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Rendered preview</h2>
                        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                          Subject preview uses current templates and sample values.
                        </p>
                      </div>
                      {placeholdersLoading ? (
                        <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-600 dark:border-stone-800 dark:bg-stone-900/40 dark:text-stone-300">
                          Loading placeholders…
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200">
                          Live
                        </span>
                      )}
                    </div>

                    <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-900/40">
                      <div className="text-xs font-medium text-stone-500 dark:text-stone-400">Subject</div>
                      <div className="mt-1 line-clamp-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
                        {previewSubject || <span className="text-stone-400">—</span>}
                      </div>
                    </div>

                    {placeholdersError ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
                        {placeholdersError}
                      </div>
                    ) : null}

                    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900/40">
                      <iframe
                        title="Email body preview"
                        sandbox="allow-same-origin"
                        referrerPolicy="no-referrer"
                        srcDoc={previewSrcDoc}
                        className="h-[520px] w-full"
                      />
                    </div>
                  </div>
                </Card>
              </div>

              <section className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Placeholders</h2>
                    <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                      Tokens the backend will replace for this purpose.
                    </p>
                  </div>
                  <div className="text-xs text-stone-500 dark:text-stone-400">
                    Source: <span className="font-mono">GET /active?purpose=&lt;purpose&gt;</span>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 dark:border-stone-700">
                        <th className="py-2 pr-4 font-medium text-stone-700 dark:text-stone-300">Placeholder</th>
                        <th className="py-2 font-medium text-stone-700 dark:text-stone-300">Meaning</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(activePlaceholders.length > 0 ? activePlaceholders : tokensInEditor).map((token) => (
                        <tr
                          key={token}
                          className="border-b border-stone-100 dark:border-stone-800"
                        >
                          <td className="py-2 pr-4 font-mono text-xs text-amber-800 dark:text-amber-200">
                            {token}
                          </td>
                          <td className="py-2 text-stone-600 dark:text-stone-400">{tokenToHumanLabel(token)}</td>
                        </tr>
                      ))}
                      {((activePlaceholders.length > 0 ? activePlaceholders : tokensInEditor).length === 0) ? (
                        <tr>
                          <td className="py-4 text-sm text-stone-500 dark:text-stone-400" colSpan={2}>
                            No placeholders detected yet.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          ) : (
            <Card>
              <div className="py-8 text-center">
                <p className="text-sm text-stone-600 dark:text-stone-400">
                  Select a template to start editing.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

