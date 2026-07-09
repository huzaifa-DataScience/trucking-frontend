"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkforce } from "@/contexts/WorkforceContext";
import { WorkforceGate } from "@/components/workforce/WorkforceGate";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { KpiStat } from "@/components/ui/KpiStat";
import { Card, CardHeader } from "@/components/ui/Card";
import { SkeletonStatRow } from "@/components/ui/Skeleton";
import { LogoLoader } from "@/components/ui/LogoLoader";
import Link from "next/link";
import { useCallback, useState } from "react";
import * as connecteamApi from "@/lib/api/endpoints/connecteam";
import { getApiErrorMessage } from "@/lib/api/client";
import type { HoursByJobRow, TimeActivity } from "@/lib/workforce/types";
import {
  formatHours,
  formatSyncAge,
  formatWorkforceTime,
} from "@/lib/workforce/format";

function OverviewContent() {
  const { syncSubtitle, status } = useWorkforce();
  const [hoursRows, setHoursRows] = useState<HoursByJobRow[]>([]);
  const [openShifts, setOpenShifts] = useState<TimeActivity[]>([]);
  const [pendingPto, setPendingPto] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [hours, activities, pto] = await Promise.all([
        connecteamApi.getHoursByJob({ limit: 50 }),
        connecteamApi.listTimeActivities({ pageSize: 100 }),
        connecteamApi.listTimeOff({ status: "pending", pageSize: 1 }),
      ]);
      setHoursRows(hours.rows ?? []);
      const activityList =
        (activities as { activities?: TimeActivity[]; timeActivities?: TimeActivity[] })
          .activities ??
        (activities as { timeActivities?: TimeActivity[] }).timeActivities ??
        [];
      setOpenShifts(
        activityList.filter((a) => a.endTimestamp == null || a.endTimestamp === "")
      );
      setPendingPto(pto.total ?? 0);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load overview"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totalHours = hoursRows.reduce((s, r) => s + (r.totalHours ?? 0), 0);
  const jobCount = hoursRows.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 ui-animate-in">
      <PageHeader title="Workforce" subtitle={syncSubtitle} />

      {loading ? (
        <SkeletonStatRow count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiStat label="Hours (reported)" value={formatHours(totalHours)} />
          <KpiStat label="Clocked in now" value={openShifts.length} />
          <KpiStat label="Pending PTO" value={pendingPto} />
          <KpiStat label="Jobs with hours" value={jobCount} />
        </div>
      )}

      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Hours by job" subtitle="From workforce mirror — may lag sync." />
          {loading ? (
            <div className="flex justify-center py-8">
              <LogoLoader size={28} />
            </div>
          ) : hoursRows.length === 0 ? (
            <p className="text-sm text-ink/45">No hours reported yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-left text-xs text-ink/45">
                    <th className="py-2 pr-3 font-medium">Job #</th>
                    <th className="py-2 pr-3 font-medium">Hours</th>
                    <th className="py-2 font-medium">Shifts</th>
                  </tr>
                </thead>
                <tbody>
                  {hoursRows.map((row) => (
                    <tr key={row.jobId ?? row.normalizedJobNumber ?? "unknown"} className="border-b border-ink/[0.05]">
                      <td className="py-2.5 pr-3">
                        {row.normalizedJobNumber ?? row.jobId ? (
                          <Link
                            href={`/workforce/time?job=${encodeURIComponent(row.normalizedJobNumber ?? row.jobId ?? "")}`}
                            className="font-mono font-medium text-brand hover:underline"
                          >
                            {row.normalizedJobNumber ?? row.jobId?.slice(0, 8) ?? "—"}
                          </Link>
                        ) : (
                          <span className="font-mono text-ink/45">—</span>
                        )}
                        {row.title ? (
                          <p className="text-xs text-ink/45">{row.title}</p>
                        ) : null}
                      </td>
                      <td className="ui-num py-2.5 pr-3 font-medium">{formatHours(row.totalHours)}</td>
                      <td className="ui-num py-2.5">{row.shiftCount ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="On site now" subtitle="Open shifts (no clock-out yet)." />
          {loading ? (
            <div className="flex justify-center py-8">
              <LogoLoader size={28} />
            </div>
          ) : openShifts.length === 0 ? (
            <p className="text-sm text-ink/45">No one clocked in.</p>
          ) : (
            <ul className="space-y-2">
              {openShifts.slice(0, 12).map((s) => (
                <li
                  key={s.shiftId}
                  className="flex items-center justify-between rounded-lg border border-ink/[0.06] px-3 py-2 text-sm"
                >
                  <span className="font-medium text-ink">User #{s.userId}</span>
                  <span className="text-xs text-ink/45">
                    since {formatWorkforceTime(s.startTimestamp)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {status?.lastSyncAt ? (
        <p className="text-xs text-ink/40">
          Last mirror sync: {formatSyncAge(status.lastSyncAt)} ({new Date(status.lastSyncAt).toLocaleString()})
        </p>
      ) : null}
    </div>
  );
}

export default function WorkforceOverviewPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { loading, me } = useWorkforce();

  useEffect(() => {
    if (loading) return;
    if (!isAdmin && !me?.linked) {
      router.replace("/workforce/link-required");
      return;
    }
    if (!isAdmin && me?.linked) {
      router.replace("/workforce/my-day");
    }
  }, [loading, isAdmin, me?.linked, router]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <LogoLoader />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <LogoLoader />
      </div>
    );
  }

  return (
    <WorkforceGate>
      <OverviewContent />
    </WorkforceGate>
  );
}
