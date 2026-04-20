"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getClearstoryProjectCors,
  getClearstoryProjectSummary,
  getClearstoryProjects,
  getClearstoryStatus,
  type ClearstoryCorBucket,
  type ClearstoryCorsResponse,
  type ClearstoryProjectSummaryResponse,
  type ClearstoryProjectsResponse,
  type ClearstoryStatusResponse,
} from "@/lib/api/endpoints/clearstory";
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

export function useClearstoryProjects(params: { search?: string; page: number; pageSize: number }) {
  const [data, setData] = useState<ClearstoryProjectsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getClearstoryProjects({
        search: params.search,
        page: params.page,
        pageSize: params.pageSize,
        allColumns: true,
        full: true,
      });
      setData(res);
    } catch (e) {
      setData(null);
      setError(getApiErrorMessage(e, "Failed to load projects"));
    } finally {
      setLoading(false);
    }
  }, [params.page, params.pageSize, params.search]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, error, loading, refetch };
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
