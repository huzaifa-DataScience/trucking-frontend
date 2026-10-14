"use client";

import type { ReactNode } from "react";
import { useLinkStatus } from "next/link";
import { InlineSpinner } from "@/components/ui/LoadingBar";

/**
 * Put inside a <Link>: while the next page is loading after a click, show that the click registered.
 * With `icon`, the label stays and only the icon turns into a spinner (no width jump, for buttons);
 * without it, the label is replaced by a spinner and "Opening…" (for text links).
 */
export function LinkPending({
  children,
  icon,
  iconSide = "end",
  pendingLabel = "Opening…",
}: {
  children: ReactNode;
  icon?: ReactNode;
  iconSide?: "start" | "end";
  pendingLabel?: ReactNode;
}) {
  const { pending } = useLinkStatus();
  if (icon !== undefined) {
    const slot = (
      <span className="inline-flex h-3.5 w-3.5 items-center justify-center" aria-hidden>
        {pending ? <InlineSpinner /> : icon}
      </span>
    );
    return (
      <>
        {iconSide === "start" ? slot : null}
        {children}
        {iconSide === "end" ? slot : null}
        {pending ? <span className="sr-only">Opening…</span> : null}
      </>
    );
  }
  if (!pending) return <>{children}</>;
  return (
    <span className="inline-flex items-center gap-1.5" role="status">
      <InlineSpinner />
      {pendingLabel}
    </span>
  );
}
