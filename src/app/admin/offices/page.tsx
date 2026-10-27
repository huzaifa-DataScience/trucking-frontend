"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
import { getApiErrorMessage } from "@/lib/api/client";
import { createOffice, deleteOffice, getOffices, type OfficeRow } from "@/lib/api/endpoints/admin";

/** "31.47295, 74.27145" (as Google Maps copies it) → numbers; null if it isn't a valid point. */
function parsePoint(raw: string): { latitude: number; longitude: number } | null {
  const m = raw.trim().match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const latitude = Number(m[1]);
  const longitude = Number(m[2]);
  return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? { latitude, longitude } : null;
}

const field =
  "h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 text-[13.5px] text-ink outline-none transition-colors placeholder:text-ink-soft focus:border-brand";
const th = "whitespace-nowrap border-b border-[var(--border-subtle)] bg-[#fafbfc] px-4 py-[9px] text-left text-[11.5px] font-semibold text-ink-muted";
const td = "whitespace-nowrap border-b border-[#f0f1f3] px-4 py-3 align-middle";

export default function OfficesPage() {
  const { showToast } = useToast();
  const [rows, setRows] = useState<OfficeRow[] | null>(null);
  const [name, setName] = useState("");
  const [point, setPoint] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<OfficeRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await getOffices());
    } catch (e) {
      showToast(getApiErrorMessage(e, "Couldn’t load offices"), "error");
      setRows([]);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const parsed = parsePoint(point);
  const pointError = point.trim() && !parsed ? "Paste it as latitude, longitude, e.g. 31.47295, 74.27145" : "";

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed || !name.trim()) return;
    setSaving(true);
    try {
      await createOffice({ name: name.trim(), ...parsed });
      setName("");
      setPoint("");
      showToast("Office added", "success");
      await load();
    } catch (err) {
      showToast(getApiErrorMessage(err, "Couldn’t add the office"), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader title="Offices" subtitle="Sign-ins are matched to the nearest office on this list." />

      <form
        onSubmit={add}
        className="flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:flex-row sm:items-start"
      >
        <label className="flex flex-1 flex-col gap-1.5 text-[12.5px] font-medium text-ink-muted">
          Office name
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="The Space Co-Working, Lahore" required />
        </label>
        <label className="flex flex-1 flex-col gap-1.5 text-[12.5px] font-medium text-ink-muted">
          Exact spot
          <input className={field} value={point} onChange={(e) => setPoint(e.target.value)} placeholder="31.47295, 74.27145" required />
          <span className={`font-normal ${pointError ? "text-danger" : "text-ink-soft"}`}>
            {pointError || "In Google Maps, right-click the building and click the numbers at the top to copy them."}
          </span>
        </label>
        <button
          type="submit"
          disabled={saving || !parsed || !name.trim()}
          className="h-10 shrink-0 cursor-pointer rounded-lg bg-brand px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-secondary disabled:cursor-not-allowed disabled:opacity-50 sm:mt-[22px]"
        >
          {saving ? "Adding…" : "Add office"}
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        {rows == null ? (
          <TableSkeleton rows={4} toolbar={false} />
        ) : rows.length === 0 ? (
          <EmptyState message="No offices yet. Add one above." />
        ) : (
          <div className="table-scroll overflow-auto">
            <table className="min-w-full border-separate border-spacing-0 text-[13.5px]">
              <thead>
                <tr>
                  <th className={th}>Office</th>
                  <th className={th}>Spot</th>
                  <th className={`${th} w-24`} />
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id}>
                    <td className={`${td} font-semibold text-ink`}>{o.name}</td>
                    <td className={td}>
                      <a
                        href={`https://www.google.com/maps?q=${o.latitude},${o.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-brand hover:underline"
                      >
                        {o.latitude.toFixed(5)}, {o.longitude.toFixed(5)} ↗
                      </a>
                    </td>
                    <td className={`${td} text-right`}>
                      <button
                        type="button"
                        onClick={() => setRemoving(o)}
                        className="cursor-pointer text-[13px] font-medium text-danger hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {removing ? (
        <ConfirmModal
          isOpen
          title="Remove office?"
          message={`Remove ${removing.name}? Past sign-ins at this office will show as “not at an office”.`}
          confirmLabel="Remove"
          variant="danger"
          loading={busy}
          onCancel={() => setRemoving(null)}
          onConfirm={async () => {
            setBusy(true);
            try {
              await deleteOffice(removing.id);
              showToast("Office removed", "success");
              setRemoving(null);
              await load();
            } catch (err) {
              showToast(getApiErrorMessage(err, "Couldn’t remove the office"), "error");
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}
    </div>
  );
}
