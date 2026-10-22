/** Project board status from GET /bids — FRONTEND_MEETING_2026-10-21.md */

export type BoardStatus =
  | "not_started"
  | "bidding"
  | "bid_submitted"
  | "won"
  | "lost"
  | "no_bid"
  | "on_hold"
  | "cancelled";

export const BOARD_STATUS_LABELS: Record<BoardStatus, string> = {
  not_started: "Not Started",
  bidding: "Bidding",
  bid_submitted: "Bid Submitted",
  won: "Won",
  lost: "Lost",
  no_bid: "No Bid",
  on_hold: "On Hold",
  cancelled: "Cancelled",
};

const BOARD_STATUS_SET = new Set<string>(Object.keys(BOARD_STATUS_LABELS));

export function isBoardStatus(raw: string | null | undefined): raw is BoardStatus {
  return typeof raw === "string" && BOARD_STATUS_SET.has(raw);
}

export function formatBoardStatus(raw: string | null | undefined): string {
  if (!raw) return "—";
  if (isBoardStatus(raw)) return BOARD_STATUS_LABELS[raw];
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export type BiddingClientKind = "gc" | "mechanical" | "invitation";

export interface BiddingClientRow {
  kind: BiddingClientKind | string;
  company?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  /** That contractor’s bidPrice */
  baseBid?: number | null;
}

export function formatBiddingClientKind(kind: string | null | undefined): string {
  switch (kind) {
    case "gc":
      return "GC";
    case "mechanical":
      return "Mechanical";
    case "invitation":
      return "Invitation";
    default:
      return kind ? kind.replace(/_/g, " ") : "—";
  }
}
