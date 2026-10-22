"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getClearstoryProjectCors,
  getClearstoryProjectSummary,
  getClearstoryProjects,
  getClearstoryStatus,
  type ClearstoryCorBucket,
  type ClearstoryProjectFilterGroup,
  type ClearstoryCorsResponse,
  type ClearstoryProjectSummaryResponse,
  type ClearstoryProjectsResponse,
  type ClearstoryStatusResponse,
} from "@/lib/api/endpoints/clearstory";
import { rowMatchesGroups, type FilterGroup } from "@/lib/filters/types";
import { sortProjectRows } from "@/lib/clearstory/projectSort";
import { getApiErrorMessage } from "@/lib/api/client";

export function useClearstoryStatus() {
  const [data, setData] = useState<ClearstoryStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getClearstoryStatus();
      setData(res);
    } catch (e) {
      setData(null);
      setError(getApiErrorMessage(e, "Failed to load Clearstory status"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, error, loading, refetch };
}

export function useClearstoryProjects(params: {
  search?: string;
  page: number;
  pageSize: number;
  /** Sort / filters run on the server so they cover every project, not just one page. */
  sortBy?: string | null;
  sortDir?: "asc" | "desc";
  filters?: ClearstoryProjectFilterGroup[];
}) {
  const [data, setData] = useState<ClearstoryProjectsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  // Only the newest request may update the list (page / sort / filter clicks can overlap).
  const requestSeq = useRef(0);
  const filtersKey = JSON.stringify(params.filters ?? []);

  const refetch = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    try {
      const filters = JSON.parse(filtersKey) as ClearstoryProjectFilterGroup[];
      let res = await getClearstoryProjects({
        search: params.search,
        page: params.page,
        pageSize: params.pageSize,
        allColumns: true,
        full: true,
        sortBy: params.sortBy,
        sortDir: params.sortDir,
        filters,
      });
      // An older backend ignores sortBy / filters: then fetch the whole list once and filter, sort and
      // page it here, so the count and page numbers still match the filter.
      const wantsServerWork = Boolean(params.sortBy) || filters.some((g) => g.conditions.length > 0);
      if (wantsServerWork && !("sortedAndFilteredOnServer" in res && res.sortedAndFilteredOnServer)) {
        const all = await getClearstoryProjects({ search: params.search, allColumns: true, full: true });
        const matched = (all.projects ?? []).filter((p) =>
          rowMatchesGroups(p as unknown as Record<string, unknown>, filters as unknown as FilterGroup[])
        );
        const sorted = sortProjectRows(matched, params.sortBy, params.sortDir ?? "asc");
        const pages = Math.max(1, Math.ceil(sorted.length / params.pageSize));
        const page = Math.min(pages, Math.max(1, params.page));
        res = {
          page,
          pageSize: params.pageSize,
          total: sorted.length,
          projects: sorted.slice((page - 1) * params.pageSize, page * params.pageSize),
          sortedAndFilteredOnServer: false,
        };
      }
      if (seq !== requestSeq.current) return;
      setData(res);
    } catch (e) {
      if (seq !== requestSeq.current) return;
      setData(null);
      setError(getApiErrorMessage(e, "Failed to load projects"));
    } finally {
      if (seq === requestSeq.current) {
        setLoading(false);
        setInitialLoading(false);
      }
    }
  }, [params.page, params.pageSize, params.search, params.sortBy, params.sortDir, filtersKey]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, error, loading, initialLoading, refetch };
}

export function useClearstoryProjectSummary(projectId: string | null, enabled: boolean) {
  const [data, setData] = useState<ClearstoryProjectSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!enabled || !projectId) {
      setData(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getClearstoryProjectSummary(projectId);
      setData(res);
    } catch (e) {
      setData(null);
      setError(getApiErrorMessage(e, "Failed to load project summary"));
    } finally {
      setLoading(false);
    }
  }, [enabled, projectId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, error, loading, refetch };
}

export function useClearstoryCors(
  projectId: string | null,
  enabled: boolean,
  bucket: ClearstoryCorBucket | undefined,
  statusFilter?: string,
  stageFilter?: string
) {
  const [data, setData] = useState<ClearstoryCorsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!enabled || !projectId) {
      setData(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getClearstoryProjectCors(projectId, {
        bucket,
        status: statusFilter,
        stage: stageFilter,
      });
      setData(res);
    } catch (e) {
      setData(null);
      setError(getApiErrorMessage(e, "Failed to load change orders"));
    } finally {
      setLoading(false);
    }
  }, [enabled, projectId, bucket, statusFilter, stageFilter]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, error, loading, refetch };
}
