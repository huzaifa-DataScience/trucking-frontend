"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/Card";
import { BidFormField, BidSelect, BidTextInput } from "@/components/bidding/BidFormField";
import { use, useState } from "react";

export default function BidStartupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [jobName, setJobName] = useState("SCU Replacement Basement to 6th Floor, East & West");
  const [contractor, setContractor] = useState("");
  const [contractType, setContractType] = useState("prime");

  return (
    <div className="bid-animate-in flex flex-col gap-6 lg:flex-row lg:gap-8">
      <div className="min-w-0 flex-1 space-y-6">
        <Card>
          <CardHeader title="Project identity" subtitle="Matches Startup sheet — job and contract party." />
          <div className="grid gap-4 sm:grid-cols-2">
            <BidFormField label="Job name" htmlFor="job">
              <BidTextInput id="job" value={jobName} onChange={setJobName} />
            </BidFormField>
            <BidFormField label="Job number" htmlFor="jno">
              <BidTextInput id="jno" value="24037" onChange={() => {}} />
            </BidFormField>
            <div className="sm:col-span-2">
              <BidFormField label="Mechanical contractor" htmlFor="mc">
                <BidTextInput
                  id="mc"
                  value={contractor}
                  onChange={setContractor}
                  placeholder="Who we have contract with"
                />
              </BidFormField>
            </div>
            <BidFormField label="Contract type" htmlFor="ctype">
              <BidSelect
                id="ctype"
                value={contractType}
                onChange={setContractType}
                options={[
                  { value: "prime", label: "Prime contractor" },
                  { value: "sub", label: "Subcontractor" },
                ]}
              />
            </BidFormField>
          </div>
        </Card>

        <Card>
          <CardHeader title="Client & billing contacts" />
          <div className="grid gap-4 sm:grid-cols-2">
            <BidFormField label="Client contact" htmlFor="cc">
              <BidTextInput id="cc" value="" onChange={() => {}} placeholder="Name" />
            </BidFormField>
            <BidFormField label="Client email" htmlFor="ce">
              <BidTextInput id="ce" value="" onChange={() => {}} type="email" />
            </BidFormField>
          </div>
        </Card>

        <Card>
          <CardHeader title="Company domains" subtitle="Goel / Goel DC / DCB applicability matrix." />
          <div className="overflow-hidden rounded-xl border border-ink/[0.06]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink/[0.06] bg-[#f8f9fb] text-left text-[10px] font-semibold uppercase tracking-wider text-ink/40">
                  <th className="px-4 py-2.5">Company</th>
                  <th className="px-4 py-2.5">Domain</th>
                  <th className="px-4 py-2.5">Applicable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/[0.06]">
                {[
                  ["Goel Services, Inc.", "goelservices.com", "Applicable"],
                  ["Goel DC, LLC", "goeldc.com", "Not applicable"],
                  ["DCB", "dcbbuilders.com", "Not applicable"],
                ].map(([co, dom, app]) => (
                  <tr key={co} className="transition hover:bg-ink/[0.02]">
                    <td className="px-4 py-3 font-medium text-ink">{co}</td>
                    <td className="px-4 py-3 text-ink/55">{dom}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          app === "Applicable"
                            ? "bg-emerald-500/10 text-emerald-800"
                            : "bg-ink/[0.05] text-ink/45"
                        }`}
                      >
                        {app}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <aside className="w-full shrink-0 lg:w-72">
        <div className="sticky top-24 space-y-4 rounded-2xl border border-ink/[0.08] bg-[#fafbfc] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">Tip</p>
          <p className="text-sm leading-relaxed text-ink/60">
            Fields here map to the <strong className="font-medium text-ink">Startup</strong> tab. Bonding
            and wage-holiday rows recalc when you set labor on the next steps.
          </p>
          <Link
            href={`/bidding/${id}/base-bid`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-2.5 text-sm font-semibold text-white transition hover:bg-ink/90"
          >
            Continue to base bid
            <span aria-hidden>→</span>
          </Link>
        </div>
      </aside>
    </div>
  );
}
