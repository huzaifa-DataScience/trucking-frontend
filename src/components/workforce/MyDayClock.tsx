"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { LogoLoader } from "@/components/ui/LogoLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useWorkforce } from "@/contexts/WorkforceContext";
import * as connecteamApi from "@/lib/api/endpoints/connecteam";
import { jobLabel } from "@/lib/api/endpoints/connecteam";
import { getApiErrorMessage } from "@/lib/api/client";
import type { ConnecteamJob, ScheduledShift, TimeActivity, TimeClock } from "@/lib/workforce/types";
import {
  DEFAULT_TIMEZONE,
  connecteamUserName,
  getStoredLastJobId,
  getStoredTimeClockId,
  setStoredLastJobId,
  setStoredTimeClockId,
} from "@/lib/workforce/format";
import {
  activityElapsedDisplay,
  activityStartDisplay,
  shiftDisplayTitle,
  shiftEndDisplay,
  shiftStartDisplay,
} from "@/lib/workforce/display";

export function MyDayClock() {
  const { showToast } = useToast();
  const { me, refreshMe } = useWorkforce();
  const user = me?.connecteamUser;

  const [clocks, setClocks] = useState<TimeClock[]>([]);
  const [timeClockId, setTimeClockId] = useState<number | null>(null);
  const [openShift, setOpenShift] = useState<TimeActivity | null>(null);
  const [todayShifts, setTodayShifts] = useState<ScheduledShift[]>([]);
  const [jobs, setJobs] = useState<ConnecteamJob[]>([]);
  const [jobSearch, setJobSearch] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(() => getStoredLastJobId());
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [, setTick] = useState(0);

  const loadState = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { timeClocks } = await connecteamApi.getConnecteamTimeClocks();
      const active = timeClocks.filter((c) => !c.isArchived);
      setClocks(active);
      const stored = getStoredTimeClockId();
      const clock =
        active.find((c) => c.timeClockId === stored) ?? active[0] ?? null;
      setTimeClockId(clock?.timeClockId ?? null);
      if (clock) setStoredTimeClockId(clock.timeClockId);

      if (clock) {
        const open = await connecteamApi.getOpenShift(clock.timeClockId, user.userId);
        setOpenShift(open.openShift);
      }

      const sched = await connecteamApi.listScheduledShifts({
        userId: user.userId,
        pageSize: 20,
      });
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      const today = sched.shifts.filter((s) => {
        const startMs = s.startAt
          ? new Date(s.startAt).getTime()
          : Number(s.startTime) * 1000;
        return startMs >= todayStart.getTime() && startMs <= todayEnd.getTime();
      });
      setTodayShifts(today);
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to load clock status"), "error");
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  useEffect(() => {
    if (!openShift) return;
    const t = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, [openShift]);

  useEffect(() => {
    if (!jobSearch.trim()) {
      setJobs([]);
      return;
    }
    const t = setTimeout(() => {
      void connecteamApi
        .listConnecteamJobs({ search: jobSearch.trim(), pageSize: 15 })
        .then((res) => setJobs(res.jobs))
        .catch(() => setJobs([]));
    }, 300);
    return () => clearTimeout(t);
  }, [jobSearch]);

  const selectedJob = useMemo(
    () => jobs.find((j) => j.jobId === selectedJobId) ?? null,
    [jobs, selectedJobId]
  );

  const clockName = clocks.find((c) => c.timeClockId === timeClockId)?.name ?? "Time clock";

  const handleClockIn = async () => {
    if (!user || !timeClockId) return;
    setActing(true);
    try {
      await connecteamApi.clockIn(timeClockId, {
        userId: user.userId,
        jobId: selectedJobId ?? undefined,
        timezone: DEFAULT_TIMEZONE,
      });
      if (selectedJobId) setStoredLastJobId(selectedJobId);
      showToast("Clocked in.", "success");
      await loadState();
      await refreshMe();
    } catch (e) {
      showToast(getApiErrorMessage(e, "Clock in failed"), "error");
    } finally {
      setActing(false);
    }
  };

  const handleClockOut = async () => {
    if (!user || !timeClockId) return;
    setActing(true);
    try {
      await connecteamApi.clockOut(timeClockId, {
        userId: user.userId,
        timezone: DEFAULT_TIMEZONE,
      });
      showToast("Clocked out.", "success");
      await loadState();
    } catch (e) {
      showToast(getApiErrorMessage(e, "Clock out failed"), "error");
    } finally {
      setActing(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LogoLoader />
      </div>
    );
  }

  const isClockedIn = Boolean(openShift);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <Card className="p-6 text-center">
        <p className="text-lg font-semibold text-ink">{connecteamUserName(user)}</p>
        <p className="mt-1 text-sm text-ink/50">{clockName}</p>
        {selectedJob ? (
          <p className="mt-2 text-sm font-medium text-brand">{jobLabel(selectedJob)}</p>
        ) : selectedJobId ? (
          <p className="mt-2 text-sm text-ink/45">Job linked</p>
        ) : null}

        {isClockedIn && openShift ? (
          <div className="mt-6 rounded-xl border border-success-border bg-success-tint px-4 py-3">
            <p className="text-sm font-semibold text-success">On the clock</p>
            <p className="ui-num mt-1 text-2xl font-bold text-ink">
              {activityElapsedDisplay(openShift)}
            </p>
            <p className="mt-1 text-xs text-ink/45">
              Since {activityStartDisplay(openShift)}
            </p>
          </div>
        ) : (
          <p className="mt-6 text-sm text-ink/45">Not clocked in</p>
        )}
      </Card>

      {!isClockedIn ? (
        <Card className="p-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-ink/40">
            Job (optional)
          </label>
          <input
            type="search"
            placeholder="Search job # or name…"
            value={jobSearch}
            onChange={(e) => setJobSearch(e.target.value)}
            className="mt-2 w-full rounded-xl border border-ink/10 bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          {jobs.length > 0 ? (
            <ul className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-ink/[0.06]">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedJobId(null);
                    setStoredLastJobId(null);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-ink/[0.03] ${
                    !selectedJobId ? "bg-brand/[0.06] font-medium" : ""
                  }`}
                >
                  No job
                </button>
              </li>
              {jobs.map((j) => (
                <li key={j.jobId}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedJobId(j.jobId);
                      setStoredLastJobId(j.jobId);
                      setJobSearch("");
                      setJobs([]);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-ink/[0.03] ${
                      selectedJobId === j.jobId ? "bg-brand/[0.06] font-medium" : ""
                    }`}
                  >
                    {jobLabel(j)}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      ) : null}

      {todayShifts.length > 0 ? (
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">
            Today&apos;s schedule
          </p>
          <ul className="mt-3 space-y-2">
            {todayShifts.map((s) => (
              <li
                key={s.shiftId}
                className="rounded-lg border border-ink/[0.06] bg-canvas px-3 py-2 text-sm"
              >
                <p className="font-medium text-ink">{shiftDisplayTitle(s)}</p>
                <p className="text-xs text-ink/45">
                  {shiftStartDisplay(s)} – {shiftEndDisplay(s)}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {clocks.length > 1 ? (
        <Card className="p-4">
          <label htmlFor="clock-select" className="text-xs font-semibold uppercase tracking-wider text-ink/40">
            Time clock
          </label>
          <select
            id="clock-select"
            value={timeClockId ?? ""}
            onChange={(e) => {
              const id = Number(e.target.value);
              setTimeClockId(id);
              setStoredTimeClockId(id);
              void loadState();
            }}
            className="mt-2 w-full rounded-xl border border-ink/10 bg-surface px-3 py-2.5 text-sm"
          >
            {clocks.map((c) => (
              <option key={c.timeClockId} value={c.timeClockId}>
                {c.name}
              </option>
            ))}
          </select>
        </Card>
      ) : null}

      <div className="sticky bottom-0 z-10 border-t border-ink/[0.06] bg-canvas/95 py-3 backdrop-blur-md">
        {isClockedIn ? (
          <button
            type="button"
            disabled={acting || !timeClockId}
            onClick={() => void handleClockOut()}
            className="w-full rounded-2xl bg-brand py-4 text-base font-semibold text-white shadow-[0_2px_8px_rgba(255,123,17,0.35)] transition hover:bg-brand-secondary disabled:opacity-50"
          >
            {acting ? "Clocking out…" : "Clock out"}
          </button>
        ) : (
          <button
            type="button"
            disabled={acting || !timeClockId}
            onClick={() => void handleClockIn()}
            className="w-full rounded-2xl bg-brand py-4 text-base font-semibold text-white shadow-[0_2px_8px_rgba(255,123,17,0.35)] transition hover:bg-brand-secondary disabled:opacity-50"
          >
            {acting ? "Clocking in…" : "Clock in"}
          </button>
        )}
      </div>
    </div>
  );
}
