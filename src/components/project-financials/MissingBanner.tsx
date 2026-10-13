export function MissingBanner({ missing }: { missing: string[] }) {
  const foundation = missing.includes("foundation_job_cost");
  const trimble = missing.includes("trimble_bom");
  if (!foundation && !trimble) return null;
  return (
    <div className="flex flex-col gap-2">
      {foundation ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-50/80 px-3 py-2 text-[13px] text-[#4b5563]">
          Foundation costs are unavailable. Cost columns are hidden until that feed is back.
        </p>
      ) : null}
      {trimble ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-50/80 px-3 py-2 text-[13px] text-[#4b5563]">
          Trimble BOM is unavailable. Trimble columns are hidden until that feed is back.
        </p>
      ) : null}
    </div>
  );
}
