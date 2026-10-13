"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getClearstoryTablePage,
  type ClearstoryTableModuleName,
  type ClearstoryTablePageResponse,
} from "@/lib/api/endpoints/clearstory";
import { getApiErrorMessage } from "@/lib/api/client";

const DEFAULT_PAGE_SIZE = 50;

export function useClearstoryTable(
  module: ClearstoryTableModuleName,
  options: { projectId?: string; status?: string; search?: string; sort?: string; sortDir?: "asc" | "desc" } = {}
) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [data, setData] = useState<ClearstoryTablePageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);

  const projectId = options.projectId?.trim() || undefined;
  const status = options.status || undefined;
  const search = options.search?.trim() || undefined;
  const sort = options.sort || undefined;
  const sortDir = sort ? options.sortDir : undefined;
  // Any filter change goes back to page 1.
  const filterKey = `${projectId ?? ""}|${status ?? ""}|${search ?? ""}|${sort ?? ""}|${sortDir ?? ""}`;
  const prevFilterKey = useRef(filterKey);
  useEffect(() => {
    if (prevFilterKey.current !== filterKey) {
      prevFilterKey.current = filterKey;
      setPage(1);
    }
  }, [filterKey]);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getClearstoryTablePage(module, { page, pageSize, projectId, status, search, sort, sortDir });
      setData(res);
    } catch (e) {
      setData(null);
      setError(getApiErrorMessage(e, "Failed to load table"));
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [module, page, pageSize, projectId, status, search, sort, sortDir]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    statusCounts: data?.statusCounts,
    page: data?.page ?? page,
    pageSize: data?.pageSize ?? pageSize,
    setPage,
    setPageSize,
    totalPages,
    isLoading: loading,
    isInitialLoading: initialLoading,
    error,
    refetch,
  };
}
