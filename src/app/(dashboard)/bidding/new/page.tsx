"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { BidFormField, BidSelect, BidTextInput } from "@/components/bidding/BidFormField";
import { Card } from "@/components/ui/Card";
import { LogoLoader } from "@/components/ui/LogoLoader";
import { useCompany } from "@/contexts/CompanyContext";
import { useBiddingLookups } from "@/hooks/useBiddingLookups";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { getApiErrorMessage } from "@/lib/api/client";

export default function NewBidPage() {
  const router = useRouter();
  const { companyId } = useCompany();
  const lookups = useBiddingLookups();
  const [estimateNumber, setEstimateNumber] = useState("");
  const [bidName, setBidName] = useState("");
  const [entity, setEntity] = useState(
    companyId && companyId !== "all" ? companyId : "1"
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    try {
      const created = await biddingApi.createBid({
        ourEntityId: Number(entity),
        estimateNumber: est,
        bidName: bidName.trim() || undefined,
      });
      router.push(`/bidding/${created.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create estimate"));
      setSubmitting(false);
    }
  };

  if (lookups.loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <LogoLoader />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 bid-animate-in">
      <PageHeader
        title="New estimate"
        subtitle="Create a draft, then fill in the Base Bid sheet — team, wage rate, systems, and live totals."
      />

      <Card className="p-6 sm:p-8">
        <form onSubmit={(e) => void handleCreate(e)} className="space-y-5">
          {error ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {error}
            </div>
          ) : null}

          <BidFormField label="Estimate number" htmlFor="est">
            <BidTextInput
              id="est"
              value={estimateNumber}
              onChange={setEstimateNumber}
              placeholder="e.g. IDC6098"
            />
          </BidFormField>
          <BidFormField label="Bid / project name" htmlFor="name">
            <BidTextInput
              id="name"
              value={bidName}
              onChange={setBidName}
              placeholder="Job name as it appears on the proposal"
            />
          </BidFormField>
          <BidFormField label="Company bidding" htmlFor="co" hint="Matches header company when set.">
            <BidSelect id="co" value={entity} onChange={setEntity} options={entityOptions} />
          </BidFormField>

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
              {submitting ? "Creating…" : "Open bidding sheet"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
