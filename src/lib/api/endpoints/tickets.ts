import { get } from "../client";
import type { ApiTicketDetail } from "../types";

/**
 * Shared ticket detail endpoint (backend: GET /tickets/detail/:ticketNumber).
 * Does not require companyId currently.
 */
export async function getTicketDetail(ticketNumber: string, _companyId?: string): Promise<ApiTicketDetail | null> {
  const path = `/tickets/detail/${encodeURIComponent(ticketNumber)}`;
  return get<ApiTicketDetail | null>(path);
}
