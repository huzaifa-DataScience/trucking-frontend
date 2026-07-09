export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-success-tint text-success border-success-border",
  warning: "bg-warning-tint text-warning border-warning-border",
  danger: "bg-danger-tint text-danger border-danger-border",
  info: "bg-info-tint text-info border-info-border",
  neutral: "bg-ink/[0.05] text-ink/60 border-ink/10",
};

const DOT_CLASSES: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "bg-ink/35",
};

/**
 * Semantic status pill: tint background + dark text + dot + label.
 * Status is never communicated by color alone (UX doc §2.5).
 */
export function StatusPill({
  tone,
  label,
  className = "",
}: {
  tone: StatusTone;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${TONE_CLASSES[tone]} ${className}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_CLASSES[tone]}`} aria-hidden />
      {label}
    </span>
  );
}
