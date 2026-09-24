/**
 * Personal calendar API — backend docs/CALENDAR.md.
 * `userId` is only sent by admins viewing someone else's calendar.
 */
import { del, get, patch, post } from "../client";
import type {
  CalendarBidInfo,
  CalendarEventBody,
  CalendarItem,
  CalendarPerson,
  CalendarResponse,
} from "@/lib/calendar/calendar";

export async function getCalendar(params: { from: string; to: string; userId?: number }): Promise<CalendarResponse> {
  return get<CalendarResponse>("/calendar", { from: params.from, to: params.to, userId: params.userId });
}

/** Admin-only person picker. */
export async function listCalendarPeople(): Promise<CalendarPerson[]> {
  return get<CalendarPerson[]>("/calendar/people");
}

/** Bids this person is on — for linking a custom event. */
export async function listCalendarBids(): Promise<CalendarBidInfo[]> {
  return get<CalendarBidInfo[]>("/calendar/bids");
}

export async function createCalendarEvent(body: CalendarEventBody): Promise<CalendarItem> {
  return post<CalendarItem>("/calendar/events", body);
}

export async function updateCalendarEvent(id: number, body: CalendarEventBody): Promise<CalendarItem> {
  return patch<CalendarItem>(`/calendar/events/${id}`, body);
}

export async function deleteCalendarEvent(id: number): Promise<{ ok: boolean }> {
  return del<{ ok: boolean }>(`/calendar/events/${id}`);
}
