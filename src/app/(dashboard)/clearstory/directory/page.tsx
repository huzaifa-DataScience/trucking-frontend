"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { LogoLoader } from "@/components/ui/LogoLoader";
import { getClearstoryApiPayload } from "@/lib/api/endpoints/clearstory";
import { getApiErrorMessage } from "@/lib/api/client";

const ENTITY_TYPES: { value: string; label: string; keyHint: string }[] = [
  { value: "company", label: "Company (current)", keyHint: "Use key: current" },
  { value: "user", label: "User", keyHint: "User id (e.g. 42)" },
  { value: "office", label: "Office", keyHint: "Office id" },
  { value: "division", label: "Division", keyHint: "Full division string (case-sensitive)" },
  { value: "contract", label: "Contract", keyHint: "Contract id" },
  { value: "customer", label: "Customer", keyHint: "Customer id" },
  { value: "label", label: "Label", keyHint: "Label id" },
];

export default function ClearstoryDirectoryPage() {
  const [entityType, setEntityType] = useState("customer");
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [json, setJson] = useState<string | null>(null);
  const [meta, setMeta] = useState<string | null>(null);

  const hint = ENTITY_TYPES.find((e) => e.value === entityType)?.keyHint ?? "";

  const run = async () => {
    const k = entityType === "company" ? "current" : key.trim();
    if (!k) {
      setError("Enter a lookup key (company always uses current).");
      return;
    }
    setLoading(true);
    setError(null);
    setJson(null);
    setMeta(null);
    try {
      const res = await getClearstoryApiPayload({ type: entityType, key: k });
      setMeta(
        `resourceKey: ${res.resourceKey}` +
          (res.lastFetchedAt ? ` · lastFetchedAt: ${res.lastFetchedAt}` : "")
      );
      setJson(JSON.stringify(res.payload, null, 2));
    } catch (e) {
      setError(getApiErrorMessage(e, "Request failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader
        title="Directory"
        subtitle="Look up a single Clearstory record by type and key."
        action={
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <Link href="/clearstory/directory/customers" className="text-brand hover:text-brand-secondary">
              Customers table
            </Link>
            <span className="text-ink/25">·</span>
            <Link href="/clearstory/directory/contracts" className="text-brand hover:text-brand-secondary">
              Contracts table
            </Link>
            <span className="text-ink/25">·</span>
            <Link href="/clearstory/tags" className="text-brand hover:text-brand-secondary">
              Tags table
            </Link>
          </div>
        }
      />

      <Card>
        <CardHeader title="Fetch payload" subtitle={hint} />
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div>
            <label htmlFor="dir-type" className="mb-1 block text-xs font-semibold text-ink/50">
              type (snake_case)
            </label>
            <select
              id="dir-type"
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                if (e.target.value === "company") setKey("current");
              }}
              className="rounded-xl border border-ink/10 bg-[#f8f9fb] px-3 py-2 text-sm"
            >
              {ENTITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          {entityType !== "company" ? (
            <div className="min-w-[12rem] flex-1">
              <label htmlFor="dir-key" className="mb-1 block text-xs font-semibold text-ink/50">
                key
              </label>
              <input
                id="dir-key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Exact id"
                className="w-full rounded-xl border border-ink/10 bg-[#f8f9fb] px-3 py-2 text-sm"
              />
            </div>
          ) : (
            <p className="text-sm text-ink/50">Key is fixed to <code className="rounded bg-ink/5 px-1">current</code>.</p>
          )}
          <button
            type="button"
            onClick={() => void run()}
            disabled={loading}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-secondary disabled:opacity-60"
          >
            Load
          </button>
        </div>
        {meta ? <p className="mt-3 text-xs text-ink/45">{meta}</p> : null}
        {error ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {loading ? (
          <div className="mt-6 flex justify-center py-8">
            <LogoLoader size={32} />
          </div>
        ) : json ? (
          <pre className="mt-4 max-h-[min(60dvh,480px)] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[#0d1117] p-4 text-xs text-[#e6edf3]">
            {json}
          </pre>
        ) : null}
      </Card>
    </div>
  );
}
