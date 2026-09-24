"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
import { CalendarEventModal } from "@/components/calendar/CalendarEventModal";
import { CalendarItemPanel } from "@/components/calendar/CalendarItemPanel";
import { AgendaView, MonthView, WeekView } from "@/components/calendar/CalendarViews";
import { useAuth } from "@/contexts/AuthContext";
import { getApiErrorMessage } from "@/lib/api/client";
import { deleteCalendarEvent, getCalendar, listCalendarPeople } from "@/lib/api/endpoints/calendar";
import {
  addDays,
  addMonths,
  groupByDay,
  rangeTitle,
  SOURCE_META,
  SOURCES,
  toYmd,
  viewRange,
  type CalendarItem,
  type CalendarPerson,
  type CalendarResponse,
  type CalendarSource,
  type CalendarView,
} from "@/lib/calendar/calendar";

const VIEWS: Array<{ id: CalendarView; label: string }> = [
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "agenda", label: "Agenda" },
];

/**
 * Personal calendar: every bid deadline, takeoff assignment, tracked time, shift,
 * task, time off and custom event for one person. Own calendar only; admins can pick anyone.
 */
export default function CalendarPage() {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const today = toYmd(new Date());

  const [view, setView] = useState<CalendarView>("month");
  const [anchor, setAnchor] = useState(today);
  const [personId, setPersonId] = useState<number | null>(null);
  const [people, setPeople] = useState<CalendarPerson[]>([]);
  const [hidden, setHidden] = useState<Set<CalendarSource>>(new Set());
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<CalendarItem | null>(null);
  const [editor, setEditor] = useState<{ editing: CalendarItem | null; day: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CalendarItem | null>(null);

  const range = useMemo(() => viewRange(view, anchor), [view, anchor]);
  const viewingSelf = personId == null || personId === user?.id;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getCalendar({ ...range, userId: viewingSelf ? undefined : personId ?? undefined }));
    } catch (e) {
      setError(getApiErrorMessage(e, "Could not load the calendar."));
    } finally {
      setLoading(false);
    }
  }, [range, personId, viewingSelf]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isAdmin) return;
    listCalendarPeople()
      .then(setPeople)
      .catch(() => setPeople([]));
  }, [isAdmin]);

  const visibleItems = useMemo(
    () => (data?.items ?? []).filter((i) => !hidden.has(i.source)),
    [data, hidden],
  );
  const byDay = useMemo(() => groupByDay(visibleItems), [visibleItems]);
  const counts = useMemo(() => {
    const c = new Map<CalendarSource, number>();
    for (const i of data?.items ?? []) c.set(i.source, (c.get(i.source) ?? 0) + 1);
    return c;
  }, [data]);

  const step = (dir: -1 | 1) => {
    if (view === "month") setAnchor((a) => addMonths(a, dir));
    else setAnchor((a) => addDays(a, dir * (view === "week" ? 7 : 30)));
  };

  const toggle = (s: CalendarSource) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const doDelete = async () => {
    const item = confirmDelete;
    setConfirmDelete(null);
    if (item?.customEventId == null) return;
    try {
      await deleteCalendarEvent(item.customEventId);
      setOpen(null);
      showToast("Event deleted", "success");
      void load();
    } catch (e) {
      showToast(getApiErrorMessage(e, "Could not delete the event."), "error");
    }
  };

  const agendaDays = useMemo(
    () => Array.from({ length: 30 }, (_, i) => addDays(range.from, i)),
    [range.from],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title={viewingSelf ? "My calendar" : `${data?.person.name ?? "Calendar"}`}
        subtitle="Bid deadlines, takeoff work, tracked time, shifts, tasks, time off and your own events."
        action={
          viewingSelf ? (
            <Button variant="primary" onClick={() => setEditor({ editing: null, day: anchor })}>
              New event
            </Button>
          ) : null
        }
      />

      <Card className="!p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/[0.06] px-4 py-3">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setAnchor(today)}>
              Today
            </Button>
            <div className="flex">
              <Button size="sm" variant="ghost" onClick={() => step(-1)} aria-label="Previous">
                ‹
              </Button>
              <Button size="sm" variant="ghost" onClick={() => step(1)} aria-label="Next">
                ›
              </Button>
            </div>
            <h2 className="text-base font-semibold text-ink">{rangeTitle(view, anchor)}</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && people.length ? (
              <select
                className="rounded-xl border border-ink/10 bg-surface px-3 py-1.5 text-sm text-ink outline-none focus:border-brand"
                value={personId ?? user?.id ?? ""}
                onChange={(e) => setPersonId(Number(e.target.value))}
                aria-label="Whose calendar"
              >
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id === user?.id ? `${p.name} (me)` : p.name}
                  </option>
                ))}
              </select>
            ) : null}
            <div className="flex rounded-xl border border-ink/10 p-0.5" role="tablist" aria-label="Calendar view">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  role="tab"
                  aria-selected={view === v.id}
                  onClick={() => setView(v.id)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                    view === v.id ? "bg-ink text-white" : "text-ink/60 hover:text-ink"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 border-b border-ink/[0.06] px-4 py-2.5" aria-label="Show on calendar">
          {SOURCES.map((s) => {
            const meta = SOURCE_META[s];
            const off = hidden.has(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={!off}
                onClick={() => toggle(s)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  off ? "border-ink/10 text-ink/35 line-through" : meta.chip
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${off ? "bg-ink/20" : meta.dot}`} aria-hidden />
                {meta.label}
                <span className="text-ink/40">{counts.get(s) ?? 0}</span>
              </button>
            );
          })}
        </div>

        {data?.warnings.length ? (
          <p className="border-b border-ink/[0.06] bg-warning/10 px-4 py-2 text-xs text-ink/70" role="status">
            Some items couldn&apos;t be loaded ({data.warnings.join(", ")}). Everything else is shown.
          </p>
        ) : null}

        <div className="p-2 sm:p-3">
          {error ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ink/[0.03] px-4 py-3 text-sm text-ink/60">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={load}>
                Try again
              </Button>
            </div>
          ) : loading && !data ? (
            <TableSkeleton rows={6} />
          ) : view === "month" ? (
            <MonthView
              anchor={anchor}
              today={today}
              byDay={byDay}
              onOpen={setOpen}
              onPickDay={(day) => {
                setAnchor(day);
                setView("agenda");
              }}
            />
          ) : view === "week" ? (
            <WeekView anchor={anchor} today={today} byDay={byDay} onOpen={setOpen} />
          ) : (
            <AgendaView days={agendaDays} today={today} byDay={byDay} onOpen={setOpen} />
          )}
        </div>
      </Card>

      <CalendarItemPanel
        item={open}
        onClose={() => setOpen(null)}
        onEdit={(item) => {
          setOpen(null);
          setEditor({ editing: item, day: anchor });
        }}
        onDelete={(item) => setConfirmDelete(item)}
      />

      {editor ? (
        <CalendarEventModal
          key={editor.editing?.id ?? `new-${editor.day}`}
          editing={editor.editing}
          defaultDay={editor.day}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            showToast(editor.editing ? "Event updated" : "Event added", "success");
            void load();
          }}
        />
      ) : null}

      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Delete event?"
        message={`"${confirmDelete?.title ?? ""}" will be removed from your calendar.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
