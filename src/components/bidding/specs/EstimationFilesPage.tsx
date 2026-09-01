"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import * as biddingSpecsApi from "@/lib/api/endpoints/biddingSpecs";
import { useBiddingAccess } from "@/hooks/useBiddingAccess";
import { useToast } from "@/components/ui/ToastProvider";
import { RestrictedState } from "@/components/ui/RestrictedState";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { EstimationLibrarySkeleton } from "@/components/bidding/MikeModuleSkeletons";
import { MikeUploadDialog } from "@/components/bidding/specs/MikeUploadDialog";
import { getSpecsErrorMessage } from "@/lib/bidding/specs-errors";
import {
  uploadMikeFilesAndBuildSpecs,
  type MikeUploadOptions,
} from "@/lib/bidding/uploadMikeSpecs";
import type { MikeFileInfo } from "@/lib/bidding/specs-types";
import type { BidListItem } from "@/lib/bidding/types";

function fmtWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

type TakeoffRow = {
  bidId: number;
  fileId: number;
  fileName: string;
  estimateNumber: string | null;
  bidName: string | null;
  totalRows: number;
  updatedAt: string | null;
};

/**
 * Estimation library — Mike main: list takeoffs + Upload Mike files.
 */
export function EstimationFilesPage() {
  const { canRead, canWrite } = useBiddingAccess();
  const { showToast } = useToast();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<MikeFileInfo[]>([]);
  const [bids, setBids] = useState<BidListItem[]>([]);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, bidList] = await Promise.all([
        biddingSpecsApi.listEstimationFiles({
          q: search || undefined,
          limit: 200,
        }),
        biddingApi.listBids().catch(() => [] as BidListItem[]),
      ]);
      setFiles(list);
      setBids(bidList);
    } catch (e) {
      setError(getSpecsErrorMessage(e, "Failed to load estimation files"));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  const takeoffs = useMemo(() => {
    const map = new Map<number, TakeoffRow>();
    for (const f of files) {
      const existing = map.get(f.bidId);
      const updated = f.updatedAt || f.createdAt || null;
      const name = f.fileName || `File #${f.id}`;
      if (!existing) {
        map.set(f.bidId, {
          bidId: f.bidId,
          fileId: f.id,
          fileName: name,
          estimateNumber: f.estimateNumber ?? null,
          bidName: f.bidName ?? null,
          totalRows: f.rowCount ?? 0,
          updatedAt: updated,
        });
      } else {
        existing.totalRows += f.rowCount ?? 0;
        if (
          updated &&
          (!existing.updatedAt || updated > existing.updatedAt)
        ) {
          existing.updatedAt = updated;
          existing.fileId = f.id;
          existing.fileName = name;
        }
      }
    }
    return [...map.values()].sort((a, b) =>
      String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""))
    );
  }, [files]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return takeoffs;
    return takeoffs.filter((t) =>
      [t.fileName, t.estimateNumber, t.bidName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle))
    );
  }, [takeoffs, search]);

  const confirmUpload = async (values: MikeUploadOptions) => {
    const bidId = values.bidId;
    if (!bidId || !pendingFiles?.length) {
      showToast("Select an estimate for this upload", "error");
      return;
    }
    setUploading(true);
    setPendingFiles(null);
    try {
      const result = await uploadMikeFilesAndBuildSpecs(
        bidId,
        pendingFiles,
        values
      );
      showToast(
        `Uploaded ${result.imported} rows · “${values.fileName.trim()}”`,
        "success"
      );
      await load();
      router.push(`/bidding/${bidId}?stage=takeoff`);
    } catch (e) {
      showToast(getSpecsErrorMessage(e, "Upload failed"), "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (!canRead) {
    return (
      <div className="mx-auto flex max-w-2xl flex-1 flex-col justify-center py-16">
        <RestrictedState
          title="Access required"
          message="You do not have permission to open Estimation files."
          permission={PERMISSIONS.biddingRead}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
            Library
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            Estimation files
          </h1>
          <p className="mt-1 text-sm text-ink/50">
            Upload Mike takeoffs here — one takeoff per estimate.
          </p>
        </div>
        {canWrite ? (
          <>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="hidden"
              onChange={(e) => {
                const list = e.target.files ? Array.from(e.target.files) : [];
                if (list.length) setPendingFiles(list);
              }}
            />
            <button
              type="button"
              disabled={uploading || bids.length === 0}
              title={
                bids.length === 0
                  ? "No estimates available yet"
                  : "Select one or more CSV / XLSX"
              }
              onClick={() => fileRef.current?.click()}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(255,123,17,0.35)] disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload Mike files"}
            </button>
          </>
        ) : null}
      </header>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(q.trim());
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search takeoff, estimate #, bid name…"
          className="min-w-0 flex-1 rounded-xl border border-ink/10 bg-surface px-3 py-2 text-sm text-ink"
        />
        <button
          type="submit"
          className="rounded-xl border border-ink/10 bg-surface px-4 py-2 text-sm font-semibold text-ink/70"
        >
          Search
        </button>
      </form>

      {error ? (
        <p className="rounded-xl border border-danger-border bg-danger-tint px-4 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {loading ? (
        <EstimationLibrarySkeleton />
      ) : filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink/15 bg-canvas/40 px-6 py-20 text-center">
          <h2 className="text-lg font-semibold text-ink">No takeoffs yet</h2>
          <p className="max-w-md text-sm text-ink/50">
            {bids.length === 0
              ? "No estimates in the system yet — create one under Bidding, then upload Mike here."
              : "Upload Mike CSV / XLSX — pick estimate, takeoff name, and job in the dialog."}
          </p>
          {canWrite && bids.length > 0 ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white"
            >
              Upload Mike files
            </button>
          ) : null}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-ink/[0.08] bg-surface shadow-[0_1px_3px_rgba(1,1,1,0.04)]">
          <table className="min-w-[720px] w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-surface">
              <tr className="border-b border-ink/[0.08] text-[10px] uppercase tracking-wide text-ink/40">
                <th className="px-4 py-3 font-semibold">Takeoff</th>
                <th className="px-3 py-3 font-semibold">Estimate #</th>
                <th className="px-3 py-3 font-semibold">Bid name</th>
                <th className="px-3 py-3 font-semibold">Rows</th>
                <th className="px-3 py-3 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/[0.05]">
              {filtered.map((t) => (
                <tr
                  key={t.bidId}
                  className="cursor-pointer hover:bg-canvas/60"
                  onClick={() =>
                    router.push(`/bidding/${t.bidId}?stage=takeoff`)
                  }
                >
                  <td className="px-4 py-3 font-medium text-ink">
                    {t.fileName}
                  </td>
                  <td className="px-3 py-3 text-ink/80">
                    {t.estimateNumber ?? "—"}
                  </td>
                  <td className="max-w-[14rem] truncate px-3 py-3 text-ink/80">
                    {t.bidName ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-ink/80">
                    {t.totalRows.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-ink/80">
                    {fmtWhen(t.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-center text-xs text-ink/40">
        <Link href="/production" className="font-semibold text-brand hover:underline">
          Production
        </Link>{" "}
        uses the same takeoff per estimate.
      </p>

      {pendingFiles ? (
        <MikeUploadDialog
          files={pendingFiles}
          bids={bids.map((b) => ({
            id: b.id,
            estimateNumber: b.estimateNumber,
            bidName: b.bidName,
            existingTakeoffName: takeoffs.find(
              (t) => String(t.bidId) === String(b.id)
            )?.fileName,
          }))}
          defaultJobId={null}
          onCancel={() => {
            setPendingFiles(null);
            if (fileRef.current) fileRef.current.value = "";
          }}
          onConfirm={(values) => void confirmUpload(values)}
        />
      ) : null}
    </div>
  );
}
