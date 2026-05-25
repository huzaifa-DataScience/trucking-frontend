"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { LogoLoader } from "@/components/ui/LogoLoader";
import { getClearstoryApiPayload } from "@/lib/api/endpoints/clearstory";
import { getApiErrorMessage } from "@/lib/api/client";

export default function ClearstoryChangeNotificationsPage() {
  const [mode, setMode] = useState<"cn" | "cn_contract">("cn");
  const [cnId, setCnId] = useState("");
  const [contractId, setContractId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [json, setJson] = useState<string | null>(null);
  const [meta, setMeta] = useState<string | null>(null);

  const run = async () => {
    const cn = cnId.trim();
    if (!cn) {
      setError("CN id is required.");
      return;
    }
    if (mode === "cn_contract" && !contractId.trim()) {
      setError("Contract id is required for CN ↔ contract.");
      return;
    }
    setLoading(true);
    setError(null);
    setJson(null);
    setMeta(null);
    try {
      const res =
        mode === "cn"
          ? await getClearstoryApiPayload({ type: "change_notification", key: cn })
          : await getClearstoryApiPayload({
              type: "cn_contract",
              cnId: cn,
              contractId: contractId.trim(),
            });
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
        title="Change notifications"
        subtitle="Route: /clearstory/change-notifications. No inbox list API yet — fetch one CN or one CN↔contract row by id. Prefer cnId + contractId query params for cn_contract."
      />

      <Card>
        <CardHeader title="Fetch payload" />
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="cn-mode"
              checked={mode === "cn"}
              onChange={() => setMode("cn")}
            />
            Change notification
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="cn-mode"
              checked={mode === "cn_contract"}
              onChange={() => setMode("cn_contract")}
            />
            CN ↔ contract
          </label>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div>
            <label htmlFor="cn-id" className="mb-1 block text-xs font-semibold text-ink/50">
              CN id
            </label>
            <input
              id="cn-id"
              value={cnId}
              onChange={(e) => setCnId(e.target.value)}
              className="w-full min-w-[10rem] rounded-xl border border-ink/10 bg-[#f8f9fb] px-3 py-2 text-sm sm:w-48"
            />
          </div>
          {mode === "cn_contract" ? (
            <div>
              <label htmlFor="cn-contract-id" className="mb-1 block text-xs font-semibold text-ink/50">
                Contract id
              </label>
              <input
                id="cn-contract-id"
                value={contractId}
                onChange={(e) => setContractId(e.target.value)}
                className="w-full min-w-[10rem] rounded-xl border border-ink/10 bg-[#f8f9fb] px-3 py-2 text-sm sm:w-48"
              />
            </div>
          ) : null}
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
