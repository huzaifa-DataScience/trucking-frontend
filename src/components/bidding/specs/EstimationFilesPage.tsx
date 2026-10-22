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
import type { EstimationTakeoffsPage } from "@/lib/api/endpoints/biddingSpecs";
import { ApiError } from "@/lib/api/client";
import { SortHeader } from "@/hooks/useTableSort";
import { sortRows, type SortDir, type SortValue } from "@/lib/sort";
import { ListPager } from "@/components/bidding/ListPager";
import { LoadingBar } from "@/components/ui/LoadingBar";

/** Takeoffs per page (server-side). */
const TAKEOFFS_PAGE_SIZE = 50;

const TAKEOFF_SORT: Record<string, (t: TakeoffRow) => SortValue> = {
  takeoff: (t) => t.fileName,
  estimate: (t) => t.estimateNumber,
  bidName: (t) => t.bidName,
  rows: (t) => t.totalRows,
  updated: (t) => t.updatedAt,
};

/** One takeoff per bid from the raw file list (latest file's name, rows added up), newest first. */
function takeoffsFromFiles(files: MikeFileInfo[]): TakeoffRow[] {
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
      if (updated && (!existing.updatedAt || updated > existing.updatedAt)) {
        existing.updatedAt = updated;
        existing.fileId = f.id;
        existing.fileName = name;
      }
    }
  }
  return [...map.values()].sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));
}

/** A backend without the paged endpoint (404): the old capped list, grouped, sorted and paged here. */
async function takeoffsPageFallback(
  search: string,
  page: number,
  sort: { key: string | null; dir: SortDir }
): Promise<EstimationTakeoffsPage> {
  const files = await biddingSpecsApi.listEstimationFiles({ q: search || undefined, limit: 200 });
  const needle = search.trim().toLowerCase();
  let all = takeoffsFromFiles(files).filter(
    (t) => !needle || [t.fileName, t.estimateNumber, t.bidName].some((v) => (v ?? "").toLowerCase().includes(needle))
  );
  if (sort.key && TAKEOFF_SORT[sort.key]) all = sortRows(all, TAKEOFF_SORT[sort.key], sort.dir);
  const pages = Math.max(1, Math.ceil(all.length / TAKEOFFS_PAGE_SIZE));
  const p = Math.min(pages, Math.max(1, page));
  return {
    items: all.slice((p - 1) * TAKEOFFS_PAGE_SIZE, p * TAKEOFFS_PAGE_SIZE),
    total: all.length,
    page: p,
    pageSize: TAKEOFFS_PAGE_SIZE,
  };
}

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

  const [data, setData] = useState<EstimationTakeoffsPage | null>(null);
  const [bids, setBids] = useState<BidListItem[]>([]);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  // Every bid's takeoff name, fetched when the upload dialog opens (the table only holds one page).
  const [takeoffNames, setTakeoffNames] = useState<{ bidId: number; fileName: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sorting and paging happen on the server; a search or sort change goes back to page 1.
  const [sort, setSort] = useState<{ key: string | null; dir: SortDir }>({ key: null, dir: "asc" });
  const toggleSort = (key: string) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  const filterKey = `${search}|${sort.key}|${sort.dir}`;
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ key: filterKey, page: next });
  const header = (key: string, label: string) => (
    <SortHeader label={label} active={sort.key === key} dir={sort.dir} onClick={() => toggleSort(key)} />
  );

  // Every estimate's takeoff name, kept from the latest page load: the upload dialog's backup if
  // the fresh request fails when it opens. Not waited for, and a failure here is ignored.
  const [loadedNames, setLoadedNames] = useState<{ bidId: number; fileName: string | null }[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    void biddingSpecsApi
      .listTakeoffNames()
      .then(setLoadedNames)
      .catch(() => {});
    try {
      const query = { q: search || undefined, page, pageSize: TAKEOFFS_PAGE_SIZE, sortBy: sort.key, sortDir: sort.dir };
      const [list, bidList] = await Promise.all([
        biddingSpecsApi.listEstimationTakeoffsPage(query).catch((e) => {
          // Older backend: no paged endpoint yet.
          if (e instanceof ApiError && (e.status === 404 || e.status === 400)) return takeoffsPageFallback(search, page, sort);
          throw e;
        }),
        // The upload dialog's estimate picker needs every bid.
        biddingApi.listBids().catch(() => [] as BidListItem[]),
      ]);
      setData(list);
      setBids(bidList);
    } catch (e) {
      setError(getSpecsErrorMessage(e, "Failed to load estimation files"));
    } finally {
      setLoading(false);
    }
  }, [search, page, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = data?.items ?? [];

  // The dialog opens only once every estimate's takeoff name is in hand, so picking an estimate
  // fills its name straight away (as when the whole list was on screen). If both requests fail,
  // the names from the page load are used, and failing those, the rows on screen.
  const [preparingUpload, setPreparingUpload] = useState(false);
  const openUpload = async (list: File[]) => {
    setPreparingUpload(true);
    const names = await biddingSpecsApi
      .listTakeoffNames()
      .catch(() =>
        biddingSpecsApi
          .listEstimationFiles({ limit: 200 })
          .then((files) => takeoffsFromFiles(files).map((t) => ({ bidId: t.bidId, fileName: t.fileName })))
      )
      .catch(() => loadedNames ?? rows.map((t) => ({ bidId: t.bidId, fileName: t.fileName })));
    setTakeoffNames(names);
    setPreparingUpload(false);
    setPendingFiles(list);
  };

  // Built only when the bids or names change: the dialog re-applies the takeoff name whenever this
  // list changes, so rebuilding it on every render could overwrite a name the user typed.
  const dialogBids = useMemo(
    () =>
      bids.map((b) => ({
        id: b.id,
        estimateNumber: b.estimateNumber,
        bidName: b.bidName,
        existingTakeoffName: takeoffNames.find((t) => String(t.bidId) === String(b.id))?.fileName ?? undefined,
      })),
    [bids, takeoffNames]
  );

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
                if (list.length) void openUpload(list);
              }}
            />
            <button
              type="button"
              disabled={uploading || preparingUpload || bids.length === 0}
              title={
                bids.length === 0
                  ? "No estimates available yet"
                  : "Select one or more CSV / XLSX"
              }
              onClick={() => fileRef.current?.click()}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(91,173,232,0.35)] disabled:opacity-50"
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

      {loading && !data ? (
        <EstimationLibrarySkeleton />
      ) : rows.length === 0 && !loading ? (
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
        <>
        <div className="table-scroll relative min-h-0 flex-1 overflow-auto rounded-2xl border border-ink/[0.08] bg-surface shadow-[0_1px_3px_rgba(1,1,1,0.04)]">
          {loading ? <LoadingBar label="Loading estimation files" /> : null}
          <table className="min-w-[720px] w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-surface">
              <tr className="border-b border-ink/[0.08] text-[10px] uppercase tracking-wide text-ink/40">
                <th className="px-4 py-3 font-semibold">{header("takeoff", "Takeoff")}</th>
                <th className="px-3 py-3 font-semibold">{header("estimate", "Estimate #")}</th>
                <th className="px-3 py-3 font-semibold">{header("bidName", "Bid name")}</th>
                <th className="px-3 py-3 font-semibold">{header("rows", "Rows")}</th>
                <th className="px-3 py-3 font-semibold">{header("updated", "Updated")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/[0.05]">
              {rows.map((t) => (
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
        {data ? (
          <ListPager page={data.page} pageSize={data.pageSize} total={data.total} noun="takeoff" busy={loading} onPage={setPage} />
        ) : null}
        </>
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
          bids={dialogBids}
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
