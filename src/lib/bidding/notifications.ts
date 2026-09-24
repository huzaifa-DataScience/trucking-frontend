import type { MyPlateNotification } from "@/lib/bidding/process-types";

const KIND_LABELS: Record<string, string> = {
  message: "Message",
  due: "Due",
  new_bid: "New bid",
  comment_mention: "Mention",
};

export function notificationKindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? kind;
}

export function chatHref(conversationId: string): string {
  return `/workforce/chat/${encodeURIComponent(conversationId)}`;
}

/** Where clicking a GET /dashboard notification should go. */
export function notificationHref(n: MyPlateNotification): string | null {
  if (n.kind === "message" && n.conversationId) {
    return chatHref(String(n.conversationId));
  }
  if (n.kind === "comment_mention" && n.bidId != null && String(n.bidId).trim()) {
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
