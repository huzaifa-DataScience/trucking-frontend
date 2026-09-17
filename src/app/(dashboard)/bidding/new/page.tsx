"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { BidFormField, BidSelect, BidTextInput } from "@/components/bidding/BidFormField";
import { BidStatusBadge } from "@/components/bidding/BidStatusBadge";
import { Card, CardHeader } from "@/components/ui/Card";
import { FormSkeleton, SkeletonListRows } from "@/components/ui/Skeleton";
import { RestrictedState } from "@/components/ui/RestrictedState";
import { useCompany } from "@/contexts/CompanyContext";
import { useBiddingLookups } from "@/hooks/useBiddingLookups";
import { useBiddingAccess } from "@/hooks/useBiddingAccess";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { ApiError, getApiErrorMessage } from "@/lib/api/client";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { BidListItem } from "@/lib/bidding/types";

const RECENT_BIDS_COUNT = 6;

function RecentBidsPanel() {
  const [bids, setBids] = useState<BidListItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void biddingApi
      .listBids()
      .then((rows) => {
        if (cancelled) return;
        const sorted = [...rows].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        setBids(sorted.slice(0, RECENT_BIDS_COUNT));
      })
      .catch(() => {
        if (!cancelled) setBids([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className="lg:sticky lg:top-6">
      <CardHeader title="Recent bids" subtitle="Jump back into something you were just working on." />
      {bids === null ? (
        <SkeletonListRows rows={RECENT_BIDS_COUNT} />
      ) : bids.length === 0 ? (
        <p className="text-sm text-ink/45">No bids yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-ink/[0.06]">
          {bids.map((b) => (
            <li key={b.id}>
              <Link
                href={`/bidding/${b.id}`}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 hover:opacity-70"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">
                    {b.estimateNumber}
                  </span>
                  <span className="block truncate text-xs text-ink/45">
                    {b.bidName || "Untitled"}
                  </span>
                </span>
                <BidStatusBadge status={b.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function existingBidIdFromDuplicate(err: unknown): string | null {
  if (!(err instanceof ApiError)) return null;
  if (err.code !== "BID_DUPLICATE" && err.status !== 409) return null;
  const body = err.details;
  if (!body || typeof body !== "object") return null;
  const root = body as Record<string, unknown>;
  const nested =
    root.details && typeof root.details === "object"
      ? (root.details as Record<string, unknown>)
      : null;
  const id = nested?.existingBidId ?? root.existingBidId;
  return id != null && String(id).trim() ? String(id) : null;
}

export default function NewBidPage() {
  const router = useRouter();
  const { companyId } = useCompany();
  const lookups = useBiddingLookups();
  const { canWrite } = useBiddingAccess();
  const [estimateNumber, setEstimateNumber] = useState("");
  const [bidName, setBidName] = useState("");
  const [workType, setWorkType] = useState("");
  const [entity, setEntity] = useState(
    companyId && companyId !== "all" ? companyId : "1"
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateBidId, setDuplicateBidId] = useState<string | null>(null);

  const entityOptions =
    lookups.ourEntities.length > 0
      ? lookups.ourEntities.map((e) => ({ value: String(e.id), label: e.name }))
      : [
          { value: "1", label: "GOEL" },
          { value: "2", label: "GOEL DC" },
          { value: "3", label: "DCB" },
        ];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const est = estimateNumber.trim();
    if (!est) {
      setError("Estimate number is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setDuplicateBidId(null);
    try {
      const created = await biddingApi.createBid({
        ourEntityId: Number(entity),
        estimateNumber: est,
        bidName: bidName.trim() || undefined,
        process: {
          stage: "intake",
          outcome: "open",
          ...(workType
            ? {
                workType: workType as
                  | "demo"
                  | "insulation"
                  | "gc"
                  | "masonry"
                  | "other",
              }
            : {}),
        },
      });
      router.push(`/bidding/${created.id}?stage=intake`);
    } catch (err) {
      const existingId = existingBidIdFromDuplicate(err);
      if (existingId) {
        setDuplicateBidId(existingId);
        setError(
          getApiErrorMessage(
            err,
            "This opportunity already exists. Open the existing bid and add an invitation."
          )
        );
      } else {
        setError(getApiErrorMessage(err, "Failed to create estimate"));
      }
      setSubmitting(false);
    }
  };

  if (lookups.loading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="New bid" />
        <div className="bid-workspace">
          <div className="min-w-0">
            <Card className="p-6 sm:p-8">
              <FormSkeleton fields={4} />
            </Card>
          </div>
          <div className="min-w-0">
            <RecentBidsPanel />
          </div>
        </div>
      </div>
    );
  }

  if (!canWrite) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <PageHeader title="New estimate" subtitle="Create a draft bidding sheet." />
        <RestrictedState
          title="Edit access required"
          message="You can view bids but cannot create new estimates."
          permission={PERMISSIONS.biddingWrite}
        />
        <Link
          href="/bidding"
          className="text-center text-sm font-medium text-brand hover:underline"
        >
          Back to bidding list
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 bid-animate-in">
      <PageHeader title="New bid" />

      <div className="bid-workspace">
      <div className="min-w-0">
      <Card className="p-6 sm:p-8">
        <form onSubmit={(e) => void handleCreate(e)} className="space-y-5">
          {error ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p>{error}</p>
              {duplicateBidId ? (
                <p className="mt-2">
                  <Link
                    href={`/bidding/${duplicateBidId}?stage=intake`}
                    className="font-semibold text-brand hover:underline"
                  >
                    Open existing bid #{duplicateBidId}
                  </Link>
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-5 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
            <BidFormField label="Estimate number" htmlFor="est">
              <BidTextInput
                id="est"
                value={estimateNumber}
                onChange={setEstimateNumber}
                placeholder="e.g. IDC6098"
              />
            </BidFormField>
            <div className="col-span-full">
              <BidFormField label="Bid / project name" htmlFor="name">
                <BidTextInput
                  id="name"
                  value={bidName}
                  onChange={setBidName}
                  placeholder="Job name as it appears on the proposal"
                />
              </BidFormField>
            </div>
            <BidFormField label="Company bidding" htmlFor="co" hint="Matches header company when set.">
              <BidSelect id="co" value={entity} onChange={setEntity} options={entityOptions} />
            </BidFormField>
            <BidFormField
              label="Work type"
              htmlFor="wt"
              hint="Optional — Setup can finish this later."
            >
              <BidSelect
                id="wt"
                value={workType}
                onChange={setWorkType}
                options={[
                  { value: "", label: "Choose later" },
                  { value: "insulation", label: "Insulation" },
                  { value: "demo", label: "Demo" },
                  { value: "gc", label: "GC" },
                  { value: "masonry", label: "Masonry" },
                  { value: "other", label: "Other" },
                ]}
              />
            </BidFormField>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Link
              href="/bidding"
              className="inline-flex justify-center rounded-xl border border-ink/10 px-4 py-2.5 text-sm font-medium text-ink/70 transition hover:bg-ink/[0.03]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex justify-center rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Continue to Setup"}
            </button>
          </div>
        </form>
      </Card>
      </div>
      <div className="min-w-0">
        <RecentBidsPanel />
      </div>
      </div>
    </div>
  );
}
