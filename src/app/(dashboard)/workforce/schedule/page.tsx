"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { WorkforceGate } from "@/components/workforce/WorkforceGate";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { LogoLoader } from "@/components/ui/LogoLoader";
import { WorkforcePagination } from "@/components/workforce/WorkforcePagination";
import { WorkforceScrollPanel } from "@/components/workforce/WorkforceScrollPanel";
import { useWorkforce } from "@/contexts/WorkforceContext";
import { useAuth } from "@/contexts/AuthContext";
import * as connecteamApi from "@/lib/api/endpoints/connecteam";
import { getApiErrorMessage } from "@/lib/api/client";
import type { ScheduledShift, Scheduler } from "@/lib/workforce/types";
import {
  jobDisplayLabel,
  shiftAssignedDisplay,
  shiftDisplayTitle,
  shiftEndDisplay,
  shiftGroupDateKey,
  shiftStartDisplay,
  WORKFORCE_PAGE_SIZE,
} from "@/lib/workforce/display";

export default function WorkforceSchedulePage() {
  const { syncSubtitle } = useWorkforce();
  const { isAdmin } = useAuth();

  const [schedulers, setSchedulers] = useState<Scheduler[]>([]);
  const [schedulerId, setSchedulerId] = useState<number | null>(null);
  const [shifts, setShifts] = useState<ScheduledShift[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSchedulers = useCallback(async () => {
    const { schedulers: list } = await connecteamApi.listSchedulers();
    setSchedulers(list);
    if (!schedulerId && list[0]) setSchedulerId(list[0].schedulerId);
    return list;
  }, [schedulerId]);

  const loadShifts = useCallback(async () => {
    if (!schedulerId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await connecteamApi.listScheduledShifts({
        schedulerId,
        page,
        pageSize: WORKFORCE_PAGE_SIZE,
      });
      setShifts(res.shifts ?? []);
      setTotal(res.total ?? res.shifts?.length ?? 0);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load schedule"));
      setShifts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [schedulerId, page]);

  useEffect(() => {
    void loadSchedulers().catch((e) => {
      setError(getApiErrorMessage(e, "Failed to load schedulers"));
    });
  }, [loadSchedulers]);

  useEffect(() => {
    if (schedulerId) void loadShifts();
  }, [loadShifts, schedulerId]);

  const grouped = useMemo(() => {
    return shifts.reduce<Record<string, ScheduledShift[]>>((acc, s) => {
      const key = shiftGroupDateKey(s);
      if (!acc[key]) acc[key] = [];
      acc[key].push(s);
      return acc;
    }, {});
  }, [shifts]);

  return (
    <WorkforceGate>
      <div className="flex min-h-0 flex-1 flex-col gap-6 ui-animate-in">
        <PageHeader
          title="Schedule"
          subtitle={`${syncSubtitle}${isAdmin ? " · Admins can add shifts via API" : ""}`}
        />

        {schedulers.length > 1 ? (
          <div>
            <label htmlFor="sched" className="text-xs font-medium text-ink/45">
              Scheduler
            </label>
            <select
              id="sched"
              value={schedulerId ?? ""}
              onChange={(e) => {
                setSchedulerId(Number(e.target.value));
                setPage(1);
              }}
              className="mt-1 rounded-xl border border-ink/10 bg-surface px-3 py-2 text-sm"
            >
              {schedulers.map((s) => (
                <option key={s.schedulerId} value={s.schedulerId}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        {loading ? (
          <div className="flex justify-center py-16">
            <LogoLoader />
          </div>
        ) : shifts.length === 0 ? (
          <Card className="p-8 text-center text-sm text-ink/45">
            No scheduled shifts in this view.
          </Card>
        ) : (
          <Card>
            <CardHeader title="Shifts" subtitle={`${total} total`} />
            <WorkforceScrollPanel maxHeightClass="max-h-[min(640px,70vh)]">
              <div className="space-y-6 p-1">
                {Object.entries(grouped).map(([day, dayShifts]) => (
                  <div key={day}>
                    <p className="sticky top-0 z-10 bg-surface px-1 py-2 text-xs font-semibold uppercase tracking-wider text-ink/45">
                      {day}
                    </p>
                    <ul className="space-y-2">
                      {dayShifts.map((s) => (
                        <li
                          key={s.shiftId}
                          className="rounded-xl border border-ink/[0.06] bg-canvas px-4 py-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <p className="font-medium text-ink">{shiftDisplayTitle(s)}</p>
                            <div className="flex flex-wrap gap-1">
                              {s.isOpenShift ? (
                                <StatusPill tone="info" label="Open shift" />
                              ) : null}
                              {s.isPublished === false ? (
                                <StatusPill tone="neutral" label="Draft" />
                              ) : null}
                            </div>
                          </div>
                          <p className="mt-1 text-sm text-ink/55">
                            {shiftStartDisplay(s)} – {shiftEndDisplay(s)}
                          </p>
                          {s.job ? (
                            <p className="mt-1 text-xs text-ink/50">
                              {jobDisplayLabel(s.job, { jobId: s.jobId })}
                            </p>
                          ) : null}
                          {s.locationAddress ? (
                            <p className="mt-1 text-xs text-ink/40">{s.locationAddress}</p>
                          ) : null}
                          <p className="mt-1 text-xs text-ink/40">{shiftAssignedDisplay(s)}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </WorkforceScrollPanel>
            <WorkforcePagination
              page={page}
              pageSize={WORKFORCE_PAGE_SIZE}
              total={total}
              onPageChange={setPage}
              className="mt-3 px-1"
            />
          </Card>
        )}
      </div>
    </WorkforceGate>
  );
}
