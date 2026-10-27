"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { TrackingMap, personColor } from "@/components/admin/TrackingMap";
import { getApiErrorMessage } from "@/lib/api/client";
import { getTracking, type TrackedPerson } from "@/lib/api/endpoints/admin";

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function duration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export default function TrackingPage() {
  const [day, setDay] = useState(todayYmd());
  const [people, setPeople] = useState<TrackedPerson[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isToday = day === todayYmd();

  useEffect(() => {
    const [y, m, d] = day.split("-").map(Number);
    const from = new Date(y!, m! - 1, d!).toISOString();
    const to = new Date(y!, m! - 1, d! + 1).toISOString();
    let stale = false;
    const fetchDay = () =>
      getTracking(from, to)
        .then((rows) => {
          if (stale) return;
          setPeople(rows);
          setError(null);
        })
        .catch((e) => {
          if (stale) return;
          setError(getApiErrorMessage(e, "Couldn’t load tracking"));
          setPeople((cur) => cur ?? []);
        });
    void fetchDay();
    // Today's view refreshes every minute so movement and Live/Stopped stay current.
    const t = isToday ? window.setInterval(() => void fetchDay(), 60_000) : undefined;
    return () => {
      stale = true;
      window.clearInterval(t);
    };
  }, [day, isToday]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader
        title="Tracking"
        subtitle="Where people were while they had the app open. Time stops when no location arrives for 10 minutes."
        action={
          <input
            type="date"
            aria-label="Day"
            value={day}
            max={todayYmd()}
            onChange={(e) => {
              if (!e.target.value) return;
              setPeople(null);
              setDay(e.target.value);
            }}
            className="h-9 rounded-lg border border-[var(--border-subtle)] bg-white px-3 text-[13.5px] text-ink outline-none focus:border-brand"
          />
        }
      />

      {error ? (
        <div className="rounded-[10px] border border-warning-border bg-warning-tint px-4 py-3 text-[13px] text-warning">{error}</div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        {people == null ? (
          <TableSkeleton rows={5} toolbar={false} />
        ) : people.length === 0 ? (
          <EmptyState message={isToday ? "Nobody has been tracked yet today." : "Nobody was tracked on this day."} />
        ) : (
          <ul>
            {people.map((p) => (
              <li key={p.userId} className="flex flex-col gap-2 border-b border-[#f0f1f3] px-[18px] py-3.5 last:border-b-0 sm:flex-row sm:items-start sm:gap-6">
                <div className="flex min-w-[220px] items-start gap-2.5">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: personColor(p.userId) }} aria-hidden />
                  <div>
                    <div className="font-semibold text-ink">{p.name}</div>
                    {p.email && p.email !== p.name ? <div className="text-[12px] text-ink-muted">{p.email}</div> : null}
                  </div>
                </div>
                <div className="min-w-[150px]">
                  {p.live ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#effaf3] px-2.5 py-0.5 text-[12px] font-semibold text-success">
                      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                      Live now
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-[#f1f2f4] px-2.5 py-0.5 text-[12px] font-semibold text-ink-muted">
                      Stopped{p.lastPingAt ? ` · ${time(p.lastPingAt)}` : ""}
                    </span>
                  )}
                  <div className="mt-1 text-[13px] text-ink">
                    <span className="font-semibold tabular-nums">{duration(p.trackedMinutes)}</span>{" "}
                    <span className="text-ink-muted">tracked</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[12.5px] text-ink-muted">
                  {p.stretches.map((s) => (
                    <span key={s.start} className="rounded-md border border-[var(--border-subtle)] px-2 py-0.5 tabular-nums">
                      {time(s.start)} – {time(s.end)} · {duration(s.minutes)}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {people && people.length > 0 ? (
        <section className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="border-b border-[var(--border-subtle)] px-[18px] py-3">
            <h2 className="text-[14px] font-semibold text-ink">Trails</h2>
            <p className="mt-0.5 text-[12.5px] text-ink-muted">
              Each line is one person’s path that day. The big dot is where they were last seen (faded when stopped). Hover the small dots for times.
            </p>
          </div>
          <TrackingMap people={people} time={time} />
        </section>
      ) : null}
    </div>
  );
}
