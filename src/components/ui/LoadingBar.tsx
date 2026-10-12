/**
 * Thin indeterminate progress bar for "a request is running" over content that's already on screen
 * (tab/filter/page changes). Place inside a `relative` container; it pins to that container's top edge.
 */
export function LoadingBar({ label = "Loading" }: { label?: string }) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-30 h-[3px] overflow-hidden rounded-full bg-brand/15"
      role="progressbar"
      aria-label={label}
      aria-busy="true"
    >
      <div className="h-full w-1/3 animate-[ticket-grid-loading_1s_ease-in-out_infinite] bg-brand motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-60" />
    </div>
  );
}

/** Small inline spinner that inherits the text colour. */
export function InlineSpinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none ${className}`}
      aria-hidden
    />
  );
}
