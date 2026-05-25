"use client";

import { useCallback, useEffect, useState } from "react";
import { getClearstoryCompanyTable, type ClearstoryCompanyTableResponse } from "@/lib/api/endpoints/clearstory";
import { getApiErrorMessage } from "@/lib/api/client";

export function useClearstoryCompany() {
  const [data, setData] = useState<ClearstoryCompanyTableResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getClearstoryCompanyTable();
      setData(res);
    } catch (e) {
      setData(null);
      setError(getApiErrorMessage(e, "Failed to load company"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { row: data?.row ?? null, loading, error, refetch };
}
