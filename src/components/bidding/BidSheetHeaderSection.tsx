"use client";

import Link from "next/link";
import { DatePicker } from "@/components/ui/DatePicker";
import { Card, CardHeader } from "@/components/ui/Card";
import { BidFormField, BidNumberInput, BidSelect, BidTextInput } from "@/components/bidding/BidFormField";
import type { BidDetail } from "@/lib/bidding/types";
import type { LookupItem } from "@/lib/api/types";

export function BidSheetHeaderSection({
  bid,
  isEditable,
  identityLocked = false,
  entityOptions,
  jobs,
  onEstimateNumber,
  onBidName,
  onBidDate,
  onSubmitDate,
  onTimeEstimate,
  onEntity,
  onJobChange,
}: {
  bid: BidDetail;
  isEditable: boolean;
  /** Proposal output mode — estimate #, bid name, company from Intake (read-only). */
  identityLocked?: boolean;
  entityOptions: { value: string; label: string }[];
  jobs: LookupItem[];
  onEstimateNumber: (v: string) => void;
  onBidName: (v: string) => void;
  onBidDate: (v: string) => void;
  onSubmitDate: (v: string) => void;
  onTimeEstimate: (v: number | undefined) => void;
  onEntity: (v: string) => void;
  onJobChange: (jobId: number | null, prefillCompany: boolean) => void;
}) {
  const bidDate =
    (typeof bid.baseBid?.bidDate === "string"
      ? String(bid.baseBid.bidDate).slice(0, 10)
      : "") ||
    bid.bidDate?.slice(0, 10) ||
    "";
  const submitDate = bid.submitDate?.slice(0, 10) ?? "";
  const identityDisabled = !isEditable || identityLocked;

  const jobOptions = [
    { value: "", label: "No job linked" },
    ...jobs.map((j) => ({
      value: String(j.id),
      label: j.name || `Job #${j.id}`,
    })),
  ];

  const companyLabel =
    entityOptions.find((o) => o.value === String(bid.ourEntityId))?.label ||
    bid.companyName ||
    `Company #${bid.ourEntityId}`;

  const dueDate = bid.process?.dueDate?.slice(0, 10);
  const dueLabel = dueDate
    ? new Date(`${dueDate}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) +
      (bid.process?.dueTime
        ? ` · ${new Date(`2000-01-01T${bid.process.dueTime.slice(0, 5)}`).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
        : "")
    : null;

  return (
    <Card>
      <CardHeader
        title="Cover sheet"
        subtitle="Estimate #, name, and company come from Intake."
      />
      {identityLocked ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-ink/[0.06] bg-ink/[0.02] px-3.5 py-3 text-sm">
          <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-ink">
            <span className="font-mono text-[13px] text-ink/55">
              {bid.estimateNumber || "—"}
            </span>
            <span className="text-ink/25" aria-hidden>
              ·
            </span>
            <span className="font-semibold">
              {bid.bidName || bid.process?.drawingName || "Untitled estimate"}
            </span>
            <span className="text-ink/25" aria-hidden>
              ·
            </span>
            <span>
              Bidding as <strong>{companyLabel}</strong>
            </span>
            {dueLabel ? (
              <>
                <span className="text-ink/25" aria-hidden>
                  ·
                </span>
                <span>
                  Due <strong>{dueLabel}</strong>
                </span>
              </>
            ) : null}
          </p>
          <Link
            href={`/bidding/${bid.id}?stage=intake`}
            className="shrink-0 text-[13px] font-semibold text-[#c2410c] hover:underline"
          >
            Edit in Intake
          </Link>
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <BidFormField
          label="Linked job"
          htmlFor="job"
          hint="Link so Trimble quantities flow into this bid."
        >
          <BidSelect
            id="job"
            value={bid.jobId ? String(bid.jobId) : ""}
            onChange={(v) => {
              const jobId = v ? Number(v) : null;
              const prefill = Boolean(jobId && jobId !== bid.jobId);
              onJobChange(jobId, prefill);
            }}
            options={jobOptions}
            disabled={!isEditable}
          />
        </BidFormField>
        {identityLocked ? null : (
          <>
            <BidFormField label="Estimate number" htmlFor="est-num">
              <BidTextInput
                id="est-num"
                value={bid.estimateNumber ?? ""}
                onChange={onEstimateNumber}
                disabled={identityDisabled}
              />
            </BidFormField>
            <BidFormField label="Bid / project name" htmlFor="bid-name">
              <BidTextInput
                id="bid-name"
                value={bid.bidName ?? ""}
                onChange={onBidName}
                disabled={identityDisabled}
              />
            </BidFormField>
            <BidFormField
              label="Company bidding (us)"
              htmlFor="entity"
              hint="GOEL / GOEL DC / DCB"
            >
              <BidSelect
                id="entity"
                value={String(bid.ourEntityId)}
                onChange={onEntity}
                options={entityOptions}
                disabled={identityDisabled}
              />
            </BidFormField>
          </>
        )}
        <BidFormField label="Bid date" htmlFor="bid-date">
          <DatePicker
            ariaLabel="Bid date"
            value={bidDate}
            onChange={onBidDate}
            disabled={!isEditable}
            matchFieldWidth
            className="mt-1.5 box-border h-11 w-full rounded-xl border border-ink/10 bg-white px-3.5 text-[15px] font-medium disabled:cursor-not-allowed disabled:opacity-50"
          />
        </BidFormField>
        <BidFormField
          label="Submit date"
          htmlFor="submit-date"
          hint="Auto-filled when you submit if left empty."
        >
          <DatePicker
            ariaLabel="Submit date"
            value={submitDate}
            onChange={onSubmitDate}
            matchFieldWidth
            className="mt-1.5 box-border h-11 w-full rounded-xl border border-ink/10 bg-white px-3.5 text-[15px] font-medium disabled:cursor-not-allowed disabled:opacity-50"
          />
        </BidFormField>
        <BidFormField label="Time estimate (hrs)" htmlFor="time-est">
          <BidNumberInput
            id="time-est"
            value={bid.timeEstimate ?? undefined}
            onChange={onTimeEstimate}
            disabled={false}
          />
        </BidFormField>
      </div>
    </Card>
  );
}
