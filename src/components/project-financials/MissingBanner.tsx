export function MissingBanner({ missing }: { missing: string[] }) {
  if (!missing.includes("foundation_job_cost")) return null;
  return (
    <p className="rounded-lg border border-amber-500/30 bg-amber-50/80 px-3 py-2 text-[13px] text-[#4b5563]">
      Foundation costs are unavailable. Cost columns are hidden until that feed is back.
    </p>
  );
}
