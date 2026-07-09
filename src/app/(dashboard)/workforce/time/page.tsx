"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { WorkforceGate } from "@/components/workforce/WorkforceGate";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { LogoLoader } from "@/components/ui/LogoLoader";
import { useWorkforce } from "@/contexts/WorkforceContext";
import { useAuth } from "@/contexts/AuthContext";
import * as connecteamApi from "@/lib/api/endpoints/connecteam";
import { getApiErrorMessage } from "@/lib/api/client";
import type { TimeActivity } from "@/lib/workforce/types";
import { formatDurationMinutes, formatWorkforceDateTime } from "@/lib/workforce/format";

function sourceTone(source?: string): "info" | "neutral" {
  return source === "native" ? "info" : "neutral";
}

function TimePageContent() {
  const { syncSubtitle } = useWorkforce();
  const { isAdmin } = useAuth();
  const searchParams = useSearchParams();
  const jobFilter = searchParams.get("job") ?? "";

  const [jobSearch, setJobSearch] = useState(jobFilter);
  const [activities, setActivities] = useState<TimeActivity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let jobId: string | undefined;
      if (jobSearch.trim()) {
        const jobs = await connecteamApi.listConnecteamJobs({
          search: jobSearch.trim(),
          pageSize: 1,
        });
        jobId = jobs.jobs[0]?.jobId;
      }
      const res = await connecteamApi.listTimeActivities({
        jobId,
        page,
        pageSize: 50,
      });
      const rows =
        (res as { activities?: TimeActivity[] }).activities ??
        (res as { timeActivities?: TimeActivity[] }).timeActivities ??
        [];
      setActivities(rows);
      setTotal(res.total ?? rows.length);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load time activities"));
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [jobSearch, page]);

  useEffect(() => {
    const t = setTimeout(() => void load(), jobSearch ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, jobSearch]);

  return (
    <WorkforceGate>
      <div className="flex min-h-0 flex-1 flex-col gap-6 ui-animate-in">
        <PageHeader
          title="Time & attendance"
          subtitle={`${syncSubtitle} · Mirror data; filter by job #.`}
        />

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="job-filter" className="block text-xs font-medium text-ink/45">
              Job # or name
            </label>
            <input
              id="job-filter"
              type="search"
              value={jobSearch}
              onChange={(e) => {
                setJobSearch(e.target.value);
                setPage(1);
              }}
              placeholder="e.g. 02768"
              className="mt-1 w-64 rounded-xl border border-ink/10 bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <Card>
          <CardHeader
            title="Punches"
            subtitle={`${total} record(s)`}
            action={
              isAdmin ? (
                <span className="text-xs text-ink/40">Manual entry — coming soon</span>
              ) : null
            }
          />
          {loading ? (
            <div className="flex justify-center py-12">
              <LogoLoader />
            </div>
          ) : activities.length === 0 ? (
            <p className="text-sm text-ink/45">No time activities match this filter.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-left text-xs text-ink/45">
                    <th className="py-2 pr-3 font-medium">User</th>
                    <th className="py-2 pr-3 font-medium">Job</th>
                    <th className="py-2 pr-3 font-medium">In</th>
                    <th className="py-2 pr-3 font-medium">Out</th>
                    <th className="py-2 pr-3 font-medium">Hours</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((a) => {
                    const open = a.endTimestamp == null || a.endTimestamp === "";
                    return (
                      <tr key={a.shiftId} className="border-b border-ink/[0.05]">
                        <td className="py-2.5 pr-3 font-medium">#{a.userId}</td>
                        <td className="py-2.5 pr-3 font-mono text-xs text-ink/60">
                          {a.jobId ? a.jobId.slice(0, 12) : "—"}
                        </td>
                        <td className="py-2.5 pr-3 text-xs">
                          {formatWorkforceDateTime(a.startTimestamp)}
                        </td>
                        <td className="py-2.5 pr-3 text-xs">
                          {open ? "—" : formatWorkforceDateTime(a.endTimestamp)}
                        </td>
                        <td className="ui-num py-2.5 pr-3">
                          {open ? "—" : formatDurationMinutes(a.durationMinutes ?? undefined)}
                        </td>
                        <td className="py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {open ? (
                              <StatusPill tone="warning" label="On clock" />
                            ) : (
                              <StatusPill tone="success" label="Closed" />
                            )}
                            <StatusPill
                              tone={sourceTone(a.recordSource)}
                              label={a.recordSource === "native" ? "App" : "Sync"}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {total > 50 ? (
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-ink/10 px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-2 py-1.5 text-sm text-ink/45">Page {page}</span>
              <button
                type="button"
                disabled={page * 50 >= total}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-ink/10 px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          ) : null}
        </Card>
      </div>
    </WorkforceGate>
  );
}

export default function WorkforceTimePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center py-24">
          <LogoLoader />
        </div>
      }
    >
      <TimePageContent />
    </Suspense>
  );
}
