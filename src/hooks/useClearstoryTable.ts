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
  options: { projectId?: string } = {}
) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [data, setData] = useState<ClearstoryTablePageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const projectId = options.projectId?.trim() || undefined;
  const prevProjectId = useRef(projectId);
  useEffect(() => {
    if (prevProjectId.current !== projectId) {
      prevProjectId.current = projectId;
      setPage(1);
    }
  }, [projectId]);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getClearstoryTablePage(module, { page, pageSize, projectId });
      setData(res);
    } catch (e) {
      setData(null);
      setError(getApiErrorMessage(e, "Failed to load table"));
    } finally {
      setLoading(false);
    }
  }, [module, page, pageSize, projectId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? page,
    pageSize: data?.pageSize ?? pageSize,
    setPage,
    setPageSize,
    totalPages,
    isLoading: loading,
    error,
    refetch,
  };
}
