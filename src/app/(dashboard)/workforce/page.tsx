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
import { UserAvatar } from "@/components/workforce/UserAvatar";
import { WorkforceScrollPanel } from "@/components/workforce/WorkforceScrollPanel";
import Link from "next/link";
import { useCallback, useState } from "react";
import * as connecteamApi from "@/lib/api/endpoints/connecteam";
import { getApiErrorMessage } from "@/lib/api/client";
import type { HoursByJobRow, TimeActivity } from "@/lib/workforce/types";
import { formatHours, formatSyncAge } from "@/lib/workforce/format";
import {
  activityStartDisplay,
  extractTimeActivities,
  hoursByJobDisplayLabel,
  isActivityOpen,
  jobDisplayLabel,
  userDisplayName,
} from "@/lib/workforce/display";

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
      const activityList = extractTimeActivities(activities);
      setOpenShifts(activityList.filter(isActivityOpen));
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

      {error ? <p className="text-sm text-danger">{error}</p> : null}

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
            <WorkforceScrollPanel maxHeightClass="max-h-[min(400px,50vh)]">
              <table className="w-full min-w-[320px] text-sm">
                <thead className="sticky top-0 z-10 bg-surface">
                  <tr className="border-b border-ink/10 text-left text-xs text-ink/45">
                    <th className="py-2 pl-3 pr-3 font-medium">Job</th>
                    <th className="py-2 pr-3 font-medium">Hours</th>
                    <th className="py-2 pr-3 font-medium">Shifts</th>
                  </tr>
                </thead>
                <tbody>
                  {hoursRows.map((row) => {
                    const label = hoursByJobDisplayLabel(row);
                    const filterKey = row.normalizedJobNumber ?? row.jobId ?? "";
                    return (
                      <tr
                        key={row.jobId ?? row.normalizedJobNumber ?? label}
                        className="border-b border-ink/[0.05]"
                      >
                        <td className="py-2.5 pl-3 pr-3">
                          {filterKey ? (
                            <Link
                              href={`/workforce/time?job=${encodeURIComponent(filterKey)}`}
                              className="font-medium text-brand hover:underline"
                            >
                              {label}
                            </Link>
                          ) : (
                            <span className="text-ink/45">{label}</span>
                          )}
                          {row.companyLabel ? (
                            <p className="text-xs text-ink/45">{row.companyLabel}</p>
                          ) : null}
                        </td>
                        <td className="ui-num py-2.5 pr-3 font-medium">
                          {formatHours(row.totalHours)}
                        </td>
                        <td className="ui-num py-2.5 pr-3">{row.shiftCount ?? 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </WorkforceScrollPanel>
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
            <WorkforceScrollPanel maxHeightClass="max-h-[min(400px,50vh)]">
              <ul className="divide-y divide-ink/[0.06]">
                {openShifts.map((s) => (
                  <li
                    key={s.shiftId}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <UserAvatar user={s.user} size={28} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">
                          {userDisplayName(s.user, s.userId)}
                        </p>
                        <p className="truncate text-xs text-ink/45">
                          {jobDisplayLabel(s.job, { jobId: s.jobId })}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-ink/45 whitespace-nowrap">
                      since {activityStartDisplay(s)}
                    </span>
                  </li>
                ))}
              </ul>
            </WorkforceScrollPanel>
          )}
        </Card>
      </div>

      {status?.lastSyncAt ? (
        <p className="text-xs text-ink/40">
          Last mirror sync: {formatSyncAge(status.lastSyncAt)} (
          {new Date(status.lastSyncAt).toLocaleString()})
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
