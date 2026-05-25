"use client";

import { useCallback, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { LogoLoader } from "@/components/ui/LogoLoader";
import { useClearstoryStatus } from "@/hooks/useClearstory";
import { getClearstoryApiPayload, postClearstorySync } from "@/lib/api/endpoints/clearstory";
import { getApiErrorMessage } from "@/lib/api/client";

function formatDataAsOf(iso: string | undefined | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
}

export default function ClearstoryOpsPage() {
  const { data: statusData, error: statusError, loading: statusLoading, refetch } = useClearstoryStatus();
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [overviewJson, setOverviewJson] = useState<string | null>(null);

  const serverSyncRunning = statusData?.syncRunning === true;

  const runSync = useCallback(async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await postClearstorySync();
      setSyncMessage(res.message ?? (res.ok ? "Sync requested." : "Sync did not start (may already be running)."));
      await refetch();
    } catch (e) {
      setSyncMessage(getApiErrorMessage(e, "Sync failed"));
    } finally {
      setSyncing(false);
    }
  }, [refetch]);

  const loadOverview = async (inbox: "sent" | "received") => {
    setOverviewLoading(true);
    setOverviewError(null);
    setOverviewJson(null);
    try {
      const res = await getClearstoryApiPayload({
        type: "cors_overview",
        key: `inbox=${inbox}`,
      });
      setOverviewJson(JSON.stringify(res.payload, null, 2));
    } catch (e) {
      setOverviewError(getApiErrorMessage(e, "Failed to load overview"));
    } finally {
      setOverviewLoading(false);
    }
  };

  const ready =
    statusData &&
    (typeof statusData.ready === "boolean"
      ? statusData.ready
      : typeof statusData.ok === "boolean"
        ? statusData.ok
        : undefined);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader
        title="Ops"
        subtitle="Sync health, manual full pull, and quick access to stored COR overview payloads."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Status"
            action={
              <button
                type="button"
                onClick={() => void refetch()}
                className="text-xs font-semibold text-brand hover:text-brand-secondary"
              >
                Refresh
              </button>
            }
          />
          {statusLoading ? (
            <div className="flex justify-center py-8">
              <LogoLoader size={32} />
            </div>
          ) : statusError ? (
            <p className="text-sm text-red-600">{statusError}</p>
          ) : (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink/45">module</dt>
                <dd className="font-mono text-xs text-ink">{String(statusData?.module ?? "—")}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink/45">ready</dt>
                <dd className="text-ink">{ready === undefined ? "—" : ready ? "yes" : "no"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink/45">syncRunning</dt>
                <dd className="text-ink">{serverSyncRunning ? "yes" : "no"}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-ink/45">lastSuccessfulRunAt</dt>
                <dd className="text-ink">{formatDataAsOf(statusData?.lastSuccessfulRunAt ?? null)}</dd>
              </div>
              {typeof statusData?.message === "string" && statusData.message ? (
                <div className="flex flex-col gap-1 border-t border-ink/[0.06] pt-2">
                  <dt className="text-ink/45">message</dt>
                  <dd className="text-xs text-ink/70">{statusData.message}</dd>
                </div>
              ) : null}
            </dl>
          )}
        </Card>

        <Card>
          <CardHeader title="Manual sync" subtitle="Same work as the scheduled job. Disabled while syncRunning." />
          <button
            type="button"
            onClick={() => void runSync()}
            disabled={syncing || serverSyncRunning}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-secondary disabled:opacity-60"
          >
            {syncing || serverSyncRunning ? "Sync in progress…" : "POST /clearstory/sync"}
          </button>
          {syncMessage ? (
            <p className="mt-3 text-sm text-ink/70" role="status">
              {syncMessage}
            </p>
          ) : null}
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Stored COR overview (api-payload)"
          subtitle="type=cors_overview · keys inbox=sent | inbox=received only (per sync contract)."
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={overviewLoading}
            onClick={() => void loadOverview("sent")}
            className="rounded-xl border border-ink/10 bg-[#f8f9fb] px-3 py-2 text-xs font-semibold hover:border-brand/30 disabled:opacity-60"
          >
            Load inbox=sent
          </button>
          <button
            type="button"
            disabled={overviewLoading}
            onClick={() => void loadOverview("received")}
            className="rounded-xl border border-ink/10 bg-[#f8f9fb] px-3 py-2 text-xs font-semibold hover:border-brand/30 disabled:opacity-60"
          >
            Load inbox=received
          </button>
        </div>
        {overviewError ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {overviewError}
          </p>
        ) : null}
        {overviewLoading ? (
          <div className="mt-4 flex justify-center py-8">
            <LogoLoader size={32} />
          </div>
        ) : overviewJson ? (
          <pre className="mt-4 max-h-[min(50dvh,400px)] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[#0d1117] p-4 text-xs text-[#e6edf3]">
            {overviewJson}
          </pre>
        ) : null}
      </Card>

      {statusData && !statusLoading ? (
        <Card>
          <CardHeader title="Raw status JSON" subtitle="For debugging; shape matches frontend-clearstory-api.md." />
          <pre className="max-h-48 overflow-auto rounded-xl bg-[#0d1117] p-4 text-xs text-[#e6edf3]">
            {JSON.stringify(statusData, null, 2)}
          </pre>
        </Card>
      ) : null}
    </div>
  );
}
