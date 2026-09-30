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

function stripExt(name: string): string {
  return name.replace(/\.(csv|xlsx|xls)$/i, "").trim() || name;
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
 * Split detail: select a takeoff on the left, preview + actions on the right.
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
  const [replaceBidId, setReplaceBidId] = useState<number | null>(null);
  const [selectedBidId, setSelectedBidId] = useState<number | null>(null);
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

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedBidId(null);
      return;
    }
    if (
      selectedBidId == null ||
      !filtered.some((t) => t.bidId === selectedBidId)
    ) {
      setSelectedBidId(filtered[0].bidId);
    }
  }, [filtered, selectedBidId]);

  const selected = useMemo(
    () => filtered.find((t) => t.bidId === selectedBidId) ?? null,
    [filtered, selectedBidId]
  );

  const maxRows = useMemo(
    () => Math.max(1, ...filtered.map((t) => t.totalRows)),
    [filtered]
  );

  const openFilePicker = (bidId?: number | null) => {
    setReplaceBidId(bidId ?? null);
    fileRef.current?.click();
  };

  const confirmUpload = async (values: MikeUploadOptions) => {
    const bidId = values.bidId;
    if (!bidId || !pendingFiles?.length) {
      showToast("Select an estimate for this upload", "error");
      return;
    }
    setUploading(true);
    setPendingFiles(null);
    setReplaceBidId(null);
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
            Pick a takeoff on the left — preview and open actions on the right.
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
              onClick={() => openFilePicker(null)}
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
              onClick={() => openFilePicker(null)}
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white"
            >
              Upload Mike files
            </button>
          ) : null}
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 items-start gap-3.5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.95fr)]">
          <div className="min-h-0 overflow-auto rounded-2xl border border-ink/[0.08] bg-surface shadow-[0_1px_3px_rgba(1,1,1,0.04)]">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead className="sticky top-0 z-10 bg-surface">
                <tr className="border-b border-ink/[0.08] text-[10px] uppercase tracking-wide text-ink/40">
                  <th className="px-4 py-3 font-semibold">Takeoff</th>
                  <th className="px-3 py-3 font-semibold">Estimate</th>
                  <th className="px-3 py-3 font-semibold">Rows</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/[0.05]">
                {filtered.map((t) => {
                  const isSelected = t.bidId === selectedBidId;
                  return (
                    <tr
                      key={t.bidId}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-brand/[0.08]"
                          : "hover:bg-canvas/60"
                      }`}
                      onClick={() => setSelectedBidId(t.bidId)}
                      onDoubleClick={() =>
                        router.push(`/bidding/${t.bidId}?stage=takeoff`)
                      }
                    >
                      <td
                        className={`px-4 py-3.5 font-semibold text-ink ${
                          isSelected
                            ? "shadow-[inset_3px_0_0_#ff7b11]"
                            : ""
                        }`}
                      >
                        {t.fileName}
                      </td>
                      <td className="px-3 py-3.5 tabular-nums text-ink/80">
                        {t.estimateNumber ?? "—"}
                      </td>
                      <td className="px-3 py-3.5 tabular-nums text-ink/80">
                        {t.totalRows.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selected ? (
            <aside className="sticky top-4 rounded-2xl border border-ink/[0.08] bg-surface p-[18px] shadow-[0_8px_24px_-14px_rgba(1,1,1,0.2)]">
              <h3 className="text-[1.05rem] font-semibold tracking-tight text-ink">
                {stripExt(selected.fileName)}
              </h3>
              <p className="mb-4 mt-1 text-[13px] text-ink/50">
                Linked to estimate{" "}
                {selected.estimateNumber ?? `#${selected.bidId}`} · opens
                Takeoff stage
              </p>
              <div
                className="mb-3.5 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]"
                aria-hidden
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand to-[#ff9a4a]"
                  style={{
                    width: `${Math.max(
                      8,
                      Math.round((selected.totalRows / maxRows) * 100)
                    )}%`,
                  }}
                />
              </div>
              <div className="mb-4 grid gap-2.5">
                <div className="flex items-center justify-between gap-3 rounded-[10px] bg-canvas px-3 py-2.5 text-[13px]">
                  <span className="font-semibold text-ink/50">Estimate #</span>
                  <span className="text-right font-bold tabular-nums text-ink">
                    {selected.estimateNumber ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-[10px] bg-canvas px-3 py-2.5 text-[13px]">
                  <span className="font-semibold text-ink/50">Bid name</span>
                  <span className="max-w-[14rem] truncate text-right font-bold text-ink">
                    {selected.bidName ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-[10px] bg-canvas px-3 py-2.5 text-[13px]">
                  <span className="font-semibold text-ink/50">Total rows</span>
                  <span className="text-right font-bold tabular-nums text-ink">
                    {selected.totalRows.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-[10px] bg-canvas px-3 py-2.5 text-[13px]">
                  <span className="font-semibold text-ink/50">Updated</span>
                  <span className="text-right font-bold text-ink">
                    {fmtWhen(selected.updatedAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-[10px] bg-canvas px-3 py-2.5 text-[13px]">
                  <span className="font-semibold text-ink/50">Production</span>
                  <span className="text-right font-bold text-ink">
                    Ready to link
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/bidding/${selected.bidId}?stage=takeoff`)
                  }
                  className="inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(255,123,17,0.35)]"
                >
                  Open takeoff
                </button>
                {canWrite ? (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => openFilePicker(selected.bidId)}
                    className="inline-flex items-center justify-center rounded-xl border border-ink/10 bg-surface px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-50"
                  >
                    Replace files
                  </button>
                ) : null}
                <Link
                  href={`/production/${selected.bidId}`}
                  className="inline-flex items-center justify-center rounded-xl border border-ink/10 bg-surface px-4 py-2.5 text-sm font-semibold text-ink"
                >
                  View production
                </Link>
              </div>
            </aside>
          ) : null}
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
          defaultBidId={replaceBidId}
          defaultJobId={null}
          onCancel={() => {
            setPendingFiles(null);
            setReplaceBidId(null);
            if (fileRef.current) fileRef.current.value = "";
          }}
          onConfirm={(values) => void confirmUpload(values)}
        />
      ) : null}
    </div>
  );
}
