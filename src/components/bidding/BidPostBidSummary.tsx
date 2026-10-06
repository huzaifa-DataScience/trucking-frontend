"use client";

import { buildBidCrmSnapshot, type CrmContact } from "@/lib/bidding/bid-crm-snapshot";
import { formatBidDateAndTime, formatMoney, telHref } from "@/lib/bidding/format";
import { formatWorkType } from "@/lib/bidding/process-types";
import type { BidDetail } from "@/lib/bidding/types";
import { BidTeamBadge } from "@/components/bidding/BidTeamBadge";

function ContactLine({ c }: { c: CrmContact }) {
  const tel = telHref(c.phone);
  const bits = [c.company, c.name].filter(Boolean).join(" · ");
  return (
    <li className="text-[12.5px] text-ink/75">
      <span className="font-medium text-ink/55">{c.label}: </span>
      {bits || "—"}
      {tel ? (
        <>
          {" · "}
          <a href={tel} className="font-medium text-brand hover:underline">
            {c.phone}
          </a>
        </>
      ) : c.phone ? (
        <> · {c.phone}</>
      ) : null}
    </li>
  );
}

/** Compact call-ready summary at top of Post-Bid — projects existing bid data only. */
export function BidPostBidSummary({
  bid,
  teamName,
}: {
  bid: BidDetail;
  teamName?: string | null;
}) {
  const snap = buildBidCrmSnapshot(bid);
  const when = formatBidDateAndTime({
    bidDate: snap.bidDate,
    dueDate: snap.dueDate,
    dueTime: snap.dueTime,
  });

  return (
    <section className="intake-section min-w-0">
      <div className="intake-section-head-bar">
        <div>
          <h3>Call summary</h3>
          <p>Quick briefing before you dial</p>
        </div>
      </div>
      <div className="intake-section-body grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">What</p>
          <p className="mt-0.5 text-[13px] font-semibold text-ink">
            {snap.estimateNumber} — {snap.bidName}
          </p>
          {snap.workType ? (
            <p className="text-[12px] text-ink/55">{formatWorkType(snap.workType)}</p>
          ) : null}
          {snap.whatWasBid ? (
            <p className="mt-1 text-[12.5px] text-ink/70">
              Bid amount:{" "}
              <span className="font-semibold text-ink">
                {snap.baseBidAmount != null ? formatMoney(snap.baseBidAmount) : snap.whatWasBid}
              </span>
            </p>
          ) : null}
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">Where</p>
          <p className="mt-0.5 text-[13px] text-ink/80">{snap.location || "—"}</p>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">When</p>
          <p className="mt-0.5 text-[13px] font-medium text-ink">{when.label}</p>
        </div>

        <div className="sm:col-span-2 lg:col-span-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">Who / team</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <BidTeamBadge teamId={snap.teamId} teamName={teamName} compact />
            {snap.teamCaptain ? (
              <span className="text-[12px] text-ink/70">Captain: {snap.teamCaptain}</span>
            ) : null}
            {snap.assistantEstimator ? (
              <span className="text-[12px] text-ink/55">AE: {snap.assistantEstimator}</span>
            ) : null}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">
            Submitted to / invites
          </p>
          {snap.submittedTo.length === 0 ? (
            <p className="mt-0.5 text-[12.5px] text-ink/40">—</p>
          ) : (
            <ul className="mt-0.5 space-y-0.5">
              {snap.submittedTo.slice(0, 4).map((c, i) => (
                <ContactLine key={`${c.label}-${i}`} c={c} />
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">
            GCs / Mechanical
          </p>
          {snap.generalContractors.length === 0 && snap.mechanicals.length === 0 ? (
            <p className="mt-0.5 text-[12.5px] text-ink/40">—</p>
          ) : (
            <ul className="mt-0.5 space-y-0.5">
              {snap.generalContractors.map((g, i) => {
                const c = {
                  label: "GC",
                  name: g.contactName || g.name,
                  company: g.company,
                  phone: g.phone,
                  email: g.email,
                };
                return <ContactLine key={`gc-${i}`} c={c} />;
              })}
              {snap.mechanicals.map((m, i) => {
                const c = {
                  label: "Mech",
                  name: m.contactName || m.name,
                  company: m.company,
                  phone: m.phone,
                  email: m.email,
                };
                return <ContactLine key={`mech-${i}`} c={c} />;
              })}
            </ul>
          )}
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">
            Key contacts
          </p>
          {snap.keyContacts.length === 0 ? (
            <p className="mt-0.5 text-[12.5px] text-ink/40">—</p>
          ) : (
            <ul className="mt-0.5 space-y-0.5">
              {snap.keyContacts.slice(0, 6).map((c, i) => (
                <ContactLine key={`${c.label}-${i}`} c={c} />
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">
            Competitors / bidders
          </p>
          {snap.competitors.length === 0 ? (
            <p className="mt-0.5 text-[12.5px] text-ink/40">—</p>
          ) : (
            <ul className="mt-0.5 space-y-0.5 text-[12.5px] text-ink/75">
              {snap.competitors.map((c, i) => (
                <li key={i}>
                  {c.name || "—"}
                  {c.amount != null ? ` · ${formatMoney(c.amount)}` : ""}
                  {c.atBid ? " · at bid" : ""}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">Why / follow-up</p>
          <p className="mt-0.5 whitespace-pre-wrap text-[12.5px] text-ink/70">
            {snap.followUpWhy?.trim() || "—"}
          </p>
        </div>
      </div>
    </section>
  );
}
