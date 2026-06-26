"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { LogoLoader } from "@/components/ui/LogoLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { RestrictedState } from "@/components/ui/RestrictedState";
import { useWorkforce } from "@/contexts/WorkforceContext";

export function WorkforceGate({
  children,
  requireLinked = false,
  requireAdmin = false,
  isAdmin = false,
}: {
  children: ReactNode;
  requireLinked?: boolean;
  requireAdmin?: boolean;
  isAdmin?: boolean;
}) {
  const { status, me, loading, error } = useWorkforce();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <LogoLoader />
      </div>
    );
  }

  if (error || !status) {
    return (
      <EmptyState
        message={error ?? "Could not reach workforce API."}
        action={
          <Link href="/job" className="text-sm font-semibold text-brand hover:underline">
            Back to operations
          </Link>
        }
      />
    );
  }

  if (!status.ready) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <RestrictedState
          title="Workforce not configured"
          message={
            status.message ??
            "The workforce mirror is not ready. Ask an administrator to run connecteam-migrate and sync on the backend."
          }
        />
      </div>
    );
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <RestrictedState
          title="Admin access required"
          message="This workforce screen is limited to administrators."
        />
      </div>
    );
  }

  if (requireLinked && !me?.linked) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <RestrictedState
          title="Workforce profile not linked"
          message="Your portal account is not linked to a crew roster entry. Ask an administrator to link your email under Workforce → Crew."
        />
        <p className="mt-4 text-center">
          <Link href="/workforce/crew" className="text-sm font-semibold text-brand hover:underline">
            View crew roster
          </Link>
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
