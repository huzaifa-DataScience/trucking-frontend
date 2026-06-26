"use client";

import Link from "next/link";
import { RestrictedState } from "@/components/ui/RestrictedState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { WorkforceGate } from "@/components/workforce/WorkforceGate";
import { useWorkforce } from "@/contexts/WorkforceContext";

export default function LinkRequiredPage() {
  const { syncSubtitle, me } = useWorkforce();

  return (
    <WorkforceGate>
      <div className="flex min-h-0 flex-1 flex-col gap-6">
        <PageHeader title="Workforce" subtitle={syncSubtitle} />
        <div className="mx-auto max-w-lg py-8">
          <RestrictedState
            title="Workforce profile not linked"
            message="Your portal account is not linked to a crew roster entry. Ask an administrator to link your email under Workforce → Crew."
          />
          {!me?.linked ? (
            <p className="mt-6 text-center text-sm text-ink/50">
              <Link href="/workforce/crew" className="font-semibold text-brand hover:underline">
                View crew roster
              </Link>
              {" · "}
              <Link href="/workforce" className="font-semibold text-brand hover:underline">
                Overview
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </WorkforceGate>
  );
}
