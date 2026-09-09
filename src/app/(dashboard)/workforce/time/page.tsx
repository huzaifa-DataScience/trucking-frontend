"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { WorkforceGate } from "@/components/workforce/WorkforceGate";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { LogoLoader } from "@/components/ui/LogoLoader";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { WorkforcePagination } from "@/components/workforce/WorkforcePagination";
import { WorkforceScrollPanel } from "@/components/workforce/WorkforceScrollPanel";
import { useWorkforce } from "@/contexts/WorkforceContext";
import { useAuth } from "@/contexts/AuthContext";
import * as connecteamApi from "@/lib/api/endpoints/connecteam";
import { getApiErrorMessage } from "@/lib/api/client";
import type { TimeActivity } from "@/lib/workforce/types";
import {
  activityDurationDisplay,
  activityEndDisplay,
  activityStartDisplay,
  extractTimeActivities,
  isActivityOpen,
  jobDisplayLabel,
  userDisplayName,
  WORKFORCE_PAGE_SIZE,
} from "@/lib/workforce/display";

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
        pageSize: WORKFORCE_PAGE_SIZE,
      });
      const rows = extractTimeActivities(res);
      setActivities(rows);
      setTotal(res.total ?? rows.length);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load time activities"));
      setActivities([]);
      setTotal(0);
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
          subtitle={`${syncSubtitle} · Mirror data; filter by job # or name.`}
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
            <TableSkeleton rows={6} toolbar={false} />
          ) : activities.length === 0 ? (
            <p className="text-sm text-ink/45">No time activities match this filter.</p>
          ) : (
            <>
              <WorkforceScrollPanel maxHeightClass="max-h-[min(560px,65vh)]">
                <table className="w-full min-w-[800px] text-sm">
                  <thead className="sticky top-0 z-10 bg-surface">
                    <tr className="border-b border-ink/10 text-left text-xs text-ink/45">
                      <th className="py-2 pl-3 pr-3 font-medium">Employee</th>
                      <th className="py-2 pr-3 font-medium">Job</th>
                      <th className="py-2 pr-3 font-medium">Clock</th>
                      <th className="py-2 pr-3 font-medium">In</th>
                      <th className="py-2 pr-3 font-medium">Out</th>
                      <th className="py-2 pr-3 font-medium">Hours</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((a) => {
                      const open = isActivityOpen(a);
                      return (
                        <tr key={a.shiftId} className="border-b border-ink/[0.05]">
                          <td className="py-2.5 pl-3 pr-3 font-medium">
                            {userDisplayName(a.user, a.userId)}
                          </td>
                          <td className="max-w-[200px] py-2.5 pr-3 text-xs text-ink/70">
                            <span className="line-clamp-2">
                              {jobDisplayLabel(a.job, { jobId: a.jobId })}
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 text-xs text-ink/50">
                            {a.timeClockName ?? "—"}
                          </td>
                          <td className="py-2.5 pr-3 text-xs whitespace-nowrap">
                            {activityStartDisplay(a)}
                          </td>
                          <td className="py-2.5 pr-3 text-xs whitespace-nowrap">
                            {activityEndDisplay(a)}
                          </td>
                          <td className="ui-num py-2.5 pr-3 whitespace-nowrap">
                            {activityDurationDisplay(a)}
                          </td>
                          <td className="py-2.5 pr-3">
                            <div className="flex flex-wrap gap-1">
                              {open ? (
                                <StatusPill tone="warning" label="On clock" />
                              ) : (
                                <StatusPill tone="success" label="Closed" />
                              )}
                              {a.recordSource ? (
                                <StatusPill
                                  tone={sourceTone(a.recordSource)}
                                  label={a.recordSource === "native" ? "App" : "Sync"}
                                />
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </WorkforceScrollPanel>
              <WorkforcePagination
                page={page}
                pageSize={WORKFORCE_PAGE_SIZE}
                total={total}
                onPageChange={setPage}
                className="mt-3"
              />
            </>
          )}
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
