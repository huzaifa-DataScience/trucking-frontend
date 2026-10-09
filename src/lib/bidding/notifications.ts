import type { MyPlateNotification } from "@/lib/bidding/process-types";

const KIND_LABELS: Record<string, string> = {
  assigned: "Assigned",
  due: "Due",
  note: "Note",
  comment_mention: "Mention",
};

/** Chat lives in the messages module. Drop it if an older API still copies it into the bell. */
export function withoutChatNotifications<T extends { kind: string }>(items: T[]): T[] {
  return items.filter((n) => n.kind !== "message");
}

export function notificationKindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? kind;
}

export function formatNotificationWhen(at: string | null | undefined): string {
  if (!at) return "";
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return at;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function chatHref(conversationId: string): string {
  return `/messages/${encodeURIComponent(conversationId)}`;
}

/** Where clicking a GET /dashboard notification should go. */
export function notificationHref(n: MyPlateNotification): string | null {
  if ((n.kind === "comment_mention" || n.kind === "note") && n.bidId != null && String(n.bidId).trim()) {
    const q = new URLSearchParams({ notes: "1" });
    if (n.commentId != null) q.set("commentId", String(n.commentId));
    return `/bidding/${n.bidId}?${q.toString()}`;
  }
  if (n.bidId != null && String(n.bidId).trim()) {
    const stage = String(n.processStage || "intake").trim() || "intake";
    return `/bidding/${n.bidId}?stage=${encodeURIComponent(stage)}`;
  }
  return null;
}

export function notificationKey(n: MyPlateNotification, i: number): string {
  return `${n.kind}-${n.commentId ?? n.bidId ?? n.conversationId ?? ""}-${i}`;
}
