import type { MyPlateNotification } from "@/lib/bidding/process-types";

const STORAGE_KEY = "notifications-seen-v1";
export const NOTIFICATIONS_SEEN_EVENT = "notifications-seen-updated";

/** Stable id for a notification row (no list index — survives reordering). */
export function notificationStableId(n: MyPlateNotification): string {
  return [
    n.kind,
    n.bidId ?? "",
    n.commentId ?? "",
    n.conversationId ?? "",
    n.at ?? "",
    n.title ?? "",
    n.body ?? "",
  ].join("|");
}

function readSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function writeSeen(ids: Set<string>): void {
  try {
    // Cap growth — keep newest ~500 ids
    const list = [...ids];
    const trimmed = list.length > 500 ? list.slice(list.length - 500) : list;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
}

export function loadSeenNotificationIds(): Set<string> {
  return readSeen();
}

/** Mark these notifications as seen; returns how many were newly marked. */
export function markNotificationsSeen(items: MyPlateNotification[]): number {
  if (items.length === 0) return 0;
  const seen = readSeen();
  let added = 0;
  for (const n of items) {
    const id = notificationStableId(n);
    if (!seen.has(id)) {
      seen.add(id);
      added += 1;
    }
  }
  if (added > 0) {
    writeSeen(seen);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(NOTIFICATIONS_SEEN_EVENT));
    }
  }
  return added;
}

export function countUnseenNotifications(items: MyPlateNotification[]): number {
  const seen = readSeen();
  return items.filter((n) => !seen.has(notificationStableId(n))).length;
}
