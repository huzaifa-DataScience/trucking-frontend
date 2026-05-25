"use client";

import { useEffect, useState } from "react";
import {
  getClearstoryApiPayload,
  type ClearstoryApiPayloadResponse,
} from "@/lib/api/endpoints/clearstory";
import { getApiErrorMessage } from "@/lib/api/client";
import { JsonPayloadModal } from "./JsonPayloadModal";

function formatFetchedAt(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
}

export function CorPayloadModal({
  corId,
  onClose,
}: {
  corId: string | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ClearstoryApiPayloadResponse | null>(null);

  useEffect(() => {
    if (!corId) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    void (async () => {
      try {
        const res = await getClearstoryApiPayload({ type: "cor", key: corId });
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(getApiErrorMessage(e, "Failed to load COR payload"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [corId]);

  return (
    <JsonPayloadModal
      open={!!corId}
      title="Change order — full payload"
      subtitle={corId ? `Clearstory id: ${corId}` : undefined}
      loading={loading}
      error={error}
      lastFetchedAt={formatFetchedAt(data?.lastFetchedAt)}
      payload={data?.payload}
      onClose={onClose}
    />
  );
}

export function ProjectPayloadModal({
  projectId,
  onClose,
}: {
  projectId: string | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ClearstoryApiPayloadResponse | null>(null);

  useEffect(() => {
    if (!projectId) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    void (async () => {
      try {
        const res = await getClearstoryApiPayload({ type: "project", key: projectId });
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(getApiErrorMessage(e, "Failed to load project payload"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <JsonPayloadModal
      open={!!projectId}
      title="Project — full payload"
      subtitle={projectId ? `Clearstory id: ${projectId}` : undefined}
      loading={loading}
      error={error}
      lastFetchedAt={formatFetchedAt(data?.lastFetchedAt)}
      payload={data?.payload}
      onClose={onClose}
    />
  );
}
