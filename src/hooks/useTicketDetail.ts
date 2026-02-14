"use client";

import { useCallback, useState } from "react";
import type { TicketDetail } from "@/lib/types";
import * as ticketsApi from "@/lib/api/endpoints/tickets";

export function useTicketDetail() {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchDetail = useCallback(async (ticketNumber: string, _companyId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await ticketsApi.getTicketDetail(ticketNumber, _companyId);
      setTicket(data);
      return data;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      setTicket(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setTicket(null);
    setError(null);
  }, []);

  return { ticket, loading, error, fetchDetail, clear };
}
