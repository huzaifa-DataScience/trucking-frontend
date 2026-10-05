"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { FinancialsAlert, FinancialsQuery, FinancialsView } from "@/lib/project-financials/types";

export function useFinancialsQuery() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const query = useMemo<FinancialsQuery>(() => {
    const entityRaw = searchParams.get("entityId");
    const entityId =
      entityRaw === "1" || entityRaw === "2" || entityRaw === "3" ? Number(entityRaw) : undefined;
    const pm = searchParams.get("pm")?.trim() || undefined;
    const search = searchParams.get("search")?.trim() || undefined;
    const view: FinancialsView = searchParams.get("view") === "all" ? "all" : "active";
    const alertRaw = searchParams.get("alert");
    const alert: FinancialsAlert | undefined =
      alertRaw === "fix" || alertRaw === "not_in_siteline" || alertRaw === "any" ? alertRaw : undefined;
    return { entityId, pm, search, view, alert };
  }, [searchParams]);

  const setQuery = useCallback(
    (patch: Partial<FinancialsQuery>) => {
      const next = new URLSearchParams(searchParams.toString());
      const merged: FinancialsQuery = { ...query, ...patch };
      if (merged.entityId) next.set("entityId", String(merged.entityId));
      else next.delete("entityId");
      if (merged.pm) next.set("pm", merged.pm);
      else next.delete("pm");
      if (merged.search) next.set("search", merged.search);
      else next.delete("search");
      if (merged.view === "all") next.set("view", "all");
      else next.delete("view");
      if (merged.alert) next.set("alert", merged.alert);
      else next.delete("alert");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, query, router, searchParams]
  );

  const queryString = searchParams.toString();

  return { query, setQuery, queryString };
}
