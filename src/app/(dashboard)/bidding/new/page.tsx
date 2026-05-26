"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { BidFormField, BidSelect, BidTextInput } from "@/components/bidding/BidFormField";
import { Card } from "@/components/ui/Card";
import { useCompany } from "@/contexts/CompanyContext";

const COMPANIES = [
  { value: "1", label: "GOEL" },
  { value: "2", label: "GOEL DC" },
  { value: "3", label: "DCB" },
];

export default function NewBidPage() {
  const router = useRouter();
  const { companyId } = useCompany();
  const [estimateNumber, setEstimateNumber] = useState("");
  const [bidName, setBidName] = useState("");
  const [entity, setEntity] = useState(companyId && companyId !== "all" ? companyId : "2");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/bidding/1/startup");
  };

  return (
    <div className="mx-auto max-w-xl flex flex-col gap-8 bid-animate-in">
      <PageHeader
        title="New estimate"
        subtitle="A few details to start — you can complete startup, wages, and labor in the guided steps next."
      />

      <Card className="p-6 sm:p-8">
        <form onSubmit={handleCreate} className="space-y-5">
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
            <BidSelect id="co" value={entity} onChange={setEntity} options={COMPANIES} />
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
              className="inline-flex justify-center rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/90"
            >
              Continue to startup
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
