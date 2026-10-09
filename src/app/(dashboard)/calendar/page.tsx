"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button, buttonClasses } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Skeleton } from "@/components/ui/Skeleton";
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
 * Personal calendar — bid dues, takeoff, workforce time, and custom events.
 * Own calendar by default; admins can pick anyone.
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
      setData(
        await getCalendar({
          ...range,
          userId: viewingSelf ? undefined : (personId ?? undefined),
        })
      );
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
    [data, hidden]
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
    [range.from]
  );

  const title = viewingSelf
    ? "Calendar"
    : data?.person.name
      ? `${data.person.name}'s calendar`
      : "Calendar";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 ui-animate-in">
      <PageHeader
        title={title}
        subtitle="Bid due dates, takeoff, shifts, clocked time, and your own events."
        action={
          viewingSelf ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setEditor({ editing: null, day: anchor })}
            >
              New event
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col gap-0 border-y border-[var(--border-subtle)] bg-surface sm:rounded-[var(--radius)] sm:border">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-3 py-3 sm:px-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAnchor(today)}
              className={buttonClasses("outline", "sm")}
            >
              Today
            </button>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous"
                className="flex h-8 w-8 items-center justify-center rounded-[var(--radius)] text-ink/60 transition hover:bg-canvas hover:text-ink"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next"
                className="flex h-8 w-8 items-center justify-center rounded-[var(--radius)] text-ink/60 transition hover:bg-canvas hover:text-ink"
              >
                ›
              </button>
            </div>
            <h2 className="text-sm font-semibold text-ink sm:text-base">
              {rangeTitle(view, anchor)}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && people.length ? (
              <select
                className="h-8 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-white px-2.5 text-sm text-ink outline-none focus:border-brand"
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
            <div
              className="flex flex-wrap gap-1.5"
              role="tablist"
              aria-label="Calendar view"
            >
              {VIEWS.map((v) => {
                const selected = view === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setView(v.id)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                      selected
                        ? "bg-ink text-white"
                        : "border border-white/70 bg-white/50 text-ink/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-md hover:border-brand/30 hover:text-brand"
                    }`}
                  >
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className="flex flex-wrap gap-1.5 border-b border-[var(--border-subtle)] px-3 py-2.5 sm:px-4"
          aria-label="Show on calendar"
        >
          {SOURCES.map((s) => {
            const meta = SOURCE_META[s];
            const off = hidden.has(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={!off}
                onClick={() => toggle(s)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                  off
                    ? "border-[var(--border-subtle)] text-ink/35 line-through"
                    : meta.chip
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${off ? "bg-ink/20" : meta.dot}`}
                  aria-hidden
                />
                {meta.label}
                <span className="tabular-nums text-ink/40">{counts.get(s) ?? 0}</span>
              </button>
            );
          })}
        </div>

        {data?.warnings.length ? (
          <p
            className="border-b border-[var(--border-subtle)] bg-amber-50 px-4 py-2 text-xs text-amber-900"
            role="status"
          >
            Some items couldn&apos;t be loaded ({data.warnings.join(", ")}).
            Everything else is shown.
          </p>
        ) : null}

        <div className="p-2 sm:p-3">
          {error ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => void load()}
                className="text-sm font-semibold text-brand hover:underline"
              >
                Try again
              </button>
            </div>
          ) : loading && !data ? (
            <div className="flex flex-col gap-3 p-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-64 w-full" />
            </div>
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
            <WeekView
              anchor={anchor}
              today={today}
              byDay={byDay}
              onOpen={setOpen}
            />
          ) : (
            <AgendaView
              days={agendaDays}
              today={today}
              byDay={byDay}
              onOpen={setOpen}
            />
          )}
        </div>
      </div>

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
