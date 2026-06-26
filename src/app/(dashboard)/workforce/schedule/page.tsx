"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { WorkforceGate } from "@/components/workforce/WorkforceGate";
import { Card, CardHeader } from "@/components/ui/Card";
import { LogoLoader } from "@/components/ui/LogoLoader";
import { useWorkforce } from "@/contexts/WorkforceContext";
import { useAuth } from "@/contexts/AuthContext";
import * as connecteamApi from "@/lib/api/endpoints/connecteam";
import { getApiErrorMessage } from "@/lib/api/client";
import type { ScheduledShift, Scheduler } from "@/lib/workforce/types";
import {
  formatWorkforceDateTime,
  parseUserIdsJson,
} from "@/lib/workforce/format";

export default function WorkforceSchedulePage() {
  const { syncSubtitle } = useWorkforce();
  const { isAdmin } = useAuth();

  const [schedulers, setSchedulers] = useState<Scheduler[]>([]);
  const [schedulerId, setSchedulerId] = useState<number | null>(null);
  const [shifts, setShifts] = useState<ScheduledShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { schedulers: list } = await connecteamApi.listSchedulers();
      setSchedulers(list);
      const sid = schedulerId ?? list[0]?.schedulerId ?? null;
      if (sid && !schedulerId) setSchedulerId(sid);
      if (sid) {
        const res = await connecteamApi.listScheduledShifts({
          schedulerId: sid,
          pageSize: 100,
        });
        setShifts(res.shifts ?? []);
      }
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load schedule"));
    } finally {
      setLoading(false);
    }
  }, [schedulerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = shifts.reduce<Record<string, ScheduledShift[]>>((acc, s) => {
    const d = new Date(Number(s.startTime) * 1000);
    const key = d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

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
              onChange={(e) => setSchedulerId(Number(e.target.value))}
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
          <Card className="p-8 text-center text-sm text-ink/45">No scheduled shifts in this view.</Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([day, dayShifts]) => (
              <Card key={day}>
                <CardHeader title={day} />
                <ul className="space-y-2">
                  {dayShifts.map((s) => (
                    <li
                      key={s.shiftId}
                      className="rounded-xl border border-ink/[0.06] bg-canvas px-4 py-3"
                    >
                      <p className="font-medium text-ink">{s.title ?? "Shift"}</p>
                      <p className="mt-1 text-sm text-ink/55">
                        {formatWorkforceDateTime(s.startTime)} –{" "}
                        {formatWorkforceDateTime(s.endTime)}
                      </p>
                      {s.locationAddress ? (
                        <p className="mt-1 text-xs text-ink/40">{s.locationAddress}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-ink/40">
                        {parseUserIdsJson(s.assignedUserIdsJson).length} assigned
                        {s.jobId ? ` · Job ${s.jobId.slice(0, 8)}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </div>
    </WorkforceGate>
  );
}
