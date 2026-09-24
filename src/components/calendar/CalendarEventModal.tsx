"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  createCalendarEvent,
  listCalendarBids,
  updateCalendarEvent,
} from "@/lib/api/endpoints/calendar";
import { toYmd, type CalendarBidInfo, type CalendarEventBody, type CalendarItem } from "@/lib/calendar/calendar";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-ink/10 bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink/30 focus:border-brand focus:ring-2 focus:ring-brand/20";
const labelClass = "block text-xs font-semibold text-ink/60";

type FormState = {
  title: string;
  allDay: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  description: string;
  bidId: string;
};

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function initialState(editing: CalendarItem | null, day: string): FormState {
  if (!editing) {
    return {
      title: "",
      allDay: false,
      startDate: day,
      startTime: "09:00",
      endDate: day,
      endTime: "10:00",
      location: "",
      description: "",
      bidId: "",
    };
  }
  const start = editing.allDay ? null : new Date(editing.start);
  const end = editing.end && !editing.allDay ? new Date(editing.end) : null;
  return {
    title: editing.title,
    allDay: editing.allDay,
    startDate: start ? toYmd(start) : editing.start.slice(0, 10),
    startTime: start ? hhmm(start) : "09:00",
    endDate: end ? toYmd(end) : (editing.end ?? editing.start).slice(0, 10),
    endTime: end ? hhmm(end) : start ? hhmm(new Date(start.getTime() + 3600_000)) : "10:00",
    location: editing.location ?? "",
    description: editing.description ?? "",
    bidId: editing.bid ? String(editing.bid.id) : "",
  };
}

/** Local date + time → ISO instant. */
function localIso(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(y, m - 1, d, h, min).toISOString();
}

/** Create or edit one of the viewer's own calendar events. Mount it only while open. */
export function CalendarEventModal({
  editing,
  defaultDay,
  onClose,
  onSaved,
}: {
  editing: CalendarItem | null;
  defaultDay: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => initialState(editing, defaultDay));
  const [bids, setBids] = useState<CalendarBidInfo[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listCalendarBids()
      .then((rows) => !cancelled && setBids(rows))
      .catch(() => !cancelled && setBids([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    if (!form.title.trim()) {
      setError("Add a title.");
      return;
    }
    const body: CalendarEventBody = form.allDay
      ? {
          title: form.title.trim(),
          allDay: true,
          start: form.startDate,
          end: form.endDate && form.endDate !== form.startDate ? form.endDate : null,
        }
      : {
          title: form.title.trim(),
          allDay: false,
          start: localIso(form.startDate, form.startTime),
          end: localIso(form.endDate || form.startDate, form.endTime),
        };
    body.location = form.location.trim() || null;
    body.description = form.description.trim() || null;
    body.bidId = form.bidId ? Number(form.bidId) : null;

    setSaving(true);
    setError(null);
    try {
      if (editing?.customEventId != null) await updateCalendarEvent(editing.customEventId, body);
      else await createCalendarEvent(body);
      onSaved();
    } catch (e) {
      setError(getApiErrorMessage(e, "Could not save the event."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-event-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-ink/[0.08] bg-surface shadow-[0_16px_40px_-12px_rgba(1,1,1,0.28)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 sm:px-6">
          <h3 id="calendar-event-title" className="text-base font-semibold text-ink">
            {editing ? "Edit event" : "New event"}
          </h3>

          <div className="mt-4 space-y-4">
            <label className={labelClass}>
              Title
              <input
                className={inputClass}
                value={form.title}
                maxLength={200}
                autoFocus
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Site walk with GC"
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-ink/70">
              <input
                type="checkbox"
                checked={form.allDay}
                onChange={(e) => set("allDay", e.target.checked)}
                className="h-4 w-4 rounded border-ink/20 accent-[var(--brand)]"
              />
              All day
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div className={labelClass}>
                Starts
                <DatePicker
                  className={inputClass}
                  value={form.startDate}
                  ariaLabel="Start date"
                  onChange={(v) => {
                    set("startDate", v);
                    if (form.endDate < v) set("endDate", v);
                  }}
                />
                {!form.allDay ? (
                  <TimePicker
                    className={inputClass}
                    value={form.startTime}
                    ariaLabel="Start time"
                    onChange={(v) => set("startTime", v ?? "09:00")}
                  />
                ) : null}
              </div>
              <div className={labelClass}>
                Ends
                <DatePicker
                  className={inputClass}
                  value={form.endDate}
                  ariaLabel="End date"
                  onChange={(v) => set("endDate", v)}
                />
                {!form.allDay ? (
                  <TimePicker
                    className={inputClass}
                    value={form.endTime}
                    ariaLabel="End time"
                    onChange={(v) => set("endTime", v ?? "10:00")}
                  />
                ) : null}
              </div>
            </div>

            <label className={labelClass}>
              Related bid (optional)
              <select className={`${inputClass} pr-9`} value={form.bidId} onChange={(e) => set("bidId", e.target.value)}>
                <option value="">None</option>
                {(bids ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bidName ? `${b.estimateNumber} · ${b.bidName}` : b.estimateNumber}
                  </option>
                ))}
                {editing?.bid && !(bids ?? []).some((b) => b.id === editing.bid!.id) ? (
                  <option value={editing.bid.id}>{editing.bid.estimateNumber}</option>
                ) : null}
              </select>
            </label>

            <label className={labelClass}>
              Location
              <input
                className={inputClass}
                value={form.location}
                maxLength={300}
                onChange={(e) => set("location", e.target.value)}
              />
            </label>

            <label className={labelClass}>
              Notes
              <textarea
                className={`${inputClass} min-h-[5rem]`}
                value={form.description}
                maxLength={2000}
                onChange={(e) => set("description", e.target.value)}
              />
            </label>

            {error ? (
              <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-ink/[0.06] px-5 py-3.5 sm:px-6">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={saving}>
            {editing ? "Save" : "Add event"}
          </Button>
        </div>
      </div>
    </div>
  );
}
