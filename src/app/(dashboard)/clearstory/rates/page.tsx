"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { LogoLoader } from "@/components/ui/LogoLoader";
import { getClearstoryApiPayload } from "@/lib/api/endpoints/clearstory";
import { getApiErrorMessage } from "@/lib/api/client";

const RATE_TYPES = ["labor", "material", "equipment", "other"] as const;

export default function ClearstoryRatesPage() {
  const [mode, setMode] = useState<"company" | "project" | "overview" | "contract_summary">("company");
  const [rateType, setRateType] = useState<string>("labor");
  const [recordId, setRecordId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [inbox, setInbox] = useState<"sent" | "received">("sent");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [json, setJson] = useState<string | null>(null);
  const [meta, setMeta] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setJson(null);
    setMeta(null);
    try {
      let res;
      if (mode === "company") {
        const rid = recordId.trim();
        if (!rid) {
          setError("recordId is required.");
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
          setError("projectId and recordId are required.");
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
        title="Rates"
        subtitle="Company and project LMEO rows via structured query params. Overview payloads use fixed keys inbox=sent | inbox=received."
      />

      <Card>
        <CardHeader title="Fetch payload" />
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["company", "Company rate"],
              ["project", "Project rate"],
              ["overview", "COR overview"],
              ["contract_summary", "COR contract summary"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setMode(v)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                mode === v ? "bg-brand text-white" : "bg-ink/[0.06] text-ink/70"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "overview" || mode === "contract_summary" ? (
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor="inbox-key" className="mb-1 block text-xs font-semibold text-ink/50">
                Stored key
              </label>
              <select
                id="inbox-key"
                value={inbox}
                onChange={(e) => setInbox(e.target.value as "sent" | "received")}
                className="rounded-xl border border-ink/10 bg-[#f8f9fb] px-3 py-2 text-sm"
              >
                <option value="sent">inbox=sent</option>
                <option value="received">inbox=received</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => void run()}
              disabled={loading}
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-secondary disabled:opacity-60"
            >
              Load
            </button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            {mode === "project" ? (
              <div>
                <label htmlFor="rate-project" className="mb-1 block text-xs font-semibold text-ink/50">
                  projectId
                </label>
                <input
                  id="rate-project"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full min-w-[10rem] rounded-xl border border-ink/10 bg-[#f8f9fb] px-3 py-2 text-sm sm:w-48"
                />
              </div>
            ) : null}
            <div>
              <label htmlFor="rate-type" className="mb-1 block text-xs font-semibold text-ink/50">
                rateType
              </label>
              <select
                id="rate-type"
                value={rateType}
                onChange={(e) => setRateType(e.target.value)}
                className="rounded-xl border border-ink/10 bg-[#f8f9fb] px-3 py-2 text-sm"
              >
                {RATE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="rate-record" className="mb-1 block text-xs font-semibold text-ink/50">
                recordId
              </label>
              <input
                id="rate-record"
                value={recordId}
                onChange={(e) => setRecordId(e.target.value)}
                className="w-full min-w-[10rem] rounded-xl border border-ink/10 bg-[#f8f9fb] px-3 py-2 text-sm sm:w-48"
              />
            </div>
            <button
              type="button"
              onClick={() => void run()}
              disabled={loading}
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-secondary disabled:opacity-60"
            >
              Load
            </button>
          </div>
        )}

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
