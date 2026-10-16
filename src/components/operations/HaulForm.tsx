"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as opsApi from "@/lib/api/endpoints/operations";
import * as lookupsApi from "@/lib/api/endpoints/lookups";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  AGGREGATE_FIELD_META,
  LEED_FIELD_META,
  type DisposalRateCard,
  type HaulAggregates,
  type HaulerRateCard,
  type HaulLeed,
  type HaulWriteBody,
  type OperationsHaul,
} from "@/lib/operations/types";
import { money, parseOptionalNumber } from "@/lib/operations/format";
import {
  opsBtnDanger,
  opsBtnGhost,
  opsBtnPrimary,
  opsFieldClass,
} from "@/components/operations/OperationsChrome";
import { OPS_SHELL } from "@/components/operations/tableScroll";
import { SortedOptions } from "@/components/ui/SortedOptions";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

type FormState = {
  ticketDate: string;
  jobNumber: string;
  jobName: string;
  jobId: string;
  haulerRateId: string;
  hours: string;
  disposalRateId: string;
  goelTicketNumber: string;
  haulingTicketNumber: string;
  disposalTicketNumber: string;
  wasteManifestNumber: string;
  transferJobNumber: string;
  weightTons: string;
  leed: Record<string, string>;
  aggregates: Record<string, string>;
};

function emptyForm(today: string): FormState {
  return {
    ticketDate: today,
    jobNumber: "",
    jobName: "",
    jobId: "",
    haulerRateId: "",
    hours: "",
    disposalRateId: "",
    goelTicketNumber: "",
    haulingTicketNumber: "",
    disposalTicketNumber: "",
    wasteManifestNumber: "",
    transferJobNumber: "",
    weightTons: "",
    leed: Object.fromEntries(LEED_FIELD_META.map((f) => [f.key, ""])),
    aggregates: Object.fromEntries(AGGREGATE_FIELD_META.map((f) => [f.key, ""])),
  };
}

function fromHaul(haul: OperationsHaul): FormState {
  return {
    ticketDate: haul.ticketDate?.slice(0, 10) || "",
    jobNumber: haul.jobNumber ?? "",
    jobName: haul.jobName ?? "",
    jobId: haul.jobId != null ? String(haul.jobId) : "",
    haulerRateId: haul.haulerRateId != null ? String(haul.haulerRateId) : "",
    hours: haul.hours != null ? String(haul.hours) : "",
    disposalRateId: haul.disposalRateId != null ? String(haul.disposalRateId) : "",
    goelTicketNumber: haul.goelTicketNumber ?? "",
    haulingTicketNumber: haul.haulingTicketNumber ?? "",
    disposalTicketNumber: haul.disposalTicketNumber ?? "",
    wasteManifestNumber: haul.wasteManifestNumber ?? "",
    transferJobNumber: haul.transferJobNumber ?? "",
    weightTons: haul.weightTons != null ? String(haul.weightTons) : "",
    leed: Object.fromEntries(
      LEED_FIELD_META.map((f) => [
        f.key,
        haul.leed?.[f.key] != null ? String(haul.leed[f.key]) : "",
      ])
    ),
    aggregates: Object.fromEntries(
      AGGREGATE_FIELD_META.map((f) => [
        f.key,
        haul.aggregates?.[f.key] != null ? String(haul.aggregates[f.key]) : "",
      ])
    ),
  };
}

function compactQty(map: Record<string, string>): Record<string, number> | null {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(map)) {
    const n = parseOptionalNumber(v);
    if (n != null) out[k] = n;
  }
  return Object.keys(out).length ? out : null;
}

function toBody(form: FormState): HaulWriteBody {
  return {
    ticketDate: form.ticketDate,
    jobNumber: form.jobNumber.trim() || null,
    jobName: form.jobName.trim() || null,
    jobId: form.jobId ? Number(form.jobId) : null,
    haulerRateId: form.haulerRateId ? Number(form.haulerRateId) : null,
    hours: parseOptionalNumber(form.hours),
    disposalRateId: form.disposalRateId ? Number(form.disposalRateId) : null,
    goelTicketNumber: form.goelTicketNumber.trim() || null,
    haulingTicketNumber: form.haulingTicketNumber.trim() || null,
    disposalTicketNumber: form.disposalTicketNumber.trim() || null,
    wasteManifestNumber: form.wasteManifestNumber.trim() || null,
    transferJobNumber: form.transferJobNumber.trim() || null,
    weightTons: parseOptionalNumber(form.weightTons),
    leed: compactQty(form.leed) as HaulLeed | null,
    aggregates: compactQty(form.aggregates) as HaulAggregates | null,
  };
}

export function HaulForm({ haul }: { haul?: OperationsHaul | null }) {
  const router = useRouter();
  const isEdit = haul != null;
  const [form, setForm] = useState<FormState>(() =>
    haul ? fromHaul(haul) : emptyForm(new Date().toISOString().slice(0, 10))
  );
  const [haulers, setHaulers] = useState<HaulerRateCard[]>([]);
  const [disposals, setDisposals] = useState<DisposalRateCard[]>([]);
  const [jobs, setJobs] = useState<{ id: number; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLeed, setShowLeed] = useState(false);

  useEffect(() => {
    if (haul) setForm(fromHaul(haul));
  }, [haul]);

  useEffect(() => {
    void Promise.all([
      opsApi.listHaulerRates().catch(() => [] as HaulerRateCard[]),
      opsApi.listDisposalRates().catch(() => [] as DisposalRateCard[]),
      lookupsApi.getJobs().catch(() => [] as { id: number; name: string }[]),
    ]).then(([h, d, j]) => {
      setHaulers(h);
      setDisposals(d);
      setJobs(j);
    });
  }, []);

  const activeHaulers = useMemo(
    () =>
      haulers.filter(
        (h) => h.isActive || (haul?.haulerRateId != null && h.id === haul.haulerRateId)
      ),
    [haulers, haul?.haulerRateId]
  );
  const activeDisposals = useMemo(
    () =>
      disposals.filter(
        (d) => d.isActive || (haul?.disposalRateId != null && d.id === haul.disposalRateId)
      ),
    [disposals, haul?.disposalRateId]
  );

  const patch = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const onJobPick = (jobIdRaw: string) => {
    const job = jobs.find((j) => String(j.id) === jobIdRaw);
    setForm((prev) => ({
      ...prev,
      jobId: jobIdRaw,
      jobNumber: job ? String(job.id) : prev.jobNumber,
      jobName: job?.name ?? prev.jobName,
    }));
  };

  const save = async () => {
    if (!form.ticketDate.trim()) {
      setError("Ticket date is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = toBody(form);
      if (isEdit && haul) {
        await opsApi.updateHaul(haul.id, body);
        router.push(`/operations/hauls/${haul.id}`);
        router.refresh();
      } else {
        const created = await opsApi.createHaul(body);
        router.push(`/operations/hauls/${created.id}`);
      }
    } catch (e) {
      setError(getApiErrorMessage(e, "Could not save haul"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!haul) return;
    setDeleting(true);
    setError(null);
    try {
      await opsApi.deleteHaul(haul.id);
      setConfirmDelete(false);
      router.push("/operations");
    } catch (e) {
      setError(getApiErrorMessage(e, "Could not delete haul"));
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {haul ? (
        <div className={`${OPS_SHELL} grid gap-3 px-4 py-3 sm:grid-cols-3`}>
          <ReadCost label="Trucking" value={money(haul.truckingCost)} />
          <ReadCost label="Disposal" value={money(haul.disposalCost)} />
          <ReadCost label="Total" value={money(haul.totalCost)} emphasis />
        </div>
      ) : (
        <p className="text-[12.5px] text-ink/50">
          Costs are calculated on the server after save — do not enter trucking or disposal dollars
          here.
        </p>
      )}

      <section className={OPS_SHELL}>
        <div className="border-b border-ink/[0.06] bg-[#f8f9fb] px-4 py-2.5">
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-ink/50">Trip</h3>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Ticket date *" required>
          <input
            type="date"
            className={opsFieldClass}
            value={form.ticketDate}
            onChange={(e) => patch("ticketDate", e.target.value)}
          />
        </Field>
        <Field label="Job #">
          <input
            className={opsFieldClass}
            value={form.jobNumber}
            onChange={(e) => patch("jobNumber", e.target.value)}
            placeholder="19009"
          />
        </Field>
        <Field label="Job name">
          <input
            className={opsFieldClass}
            value={form.jobName}
            onChange={(e) => patch("jobName", e.target.value)}
            placeholder="Stored on the row even if not in Ref_Jobs"
          />
        </Field>
        <Field label="Link to job (optional)">
          <select
            className={opsFieldClass}
            value={form.jobId}
            onChange={(e) => onJobPick(e.target.value)}
          >
            <SortedOptions>
              <option value="">—</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.id} — {j.name}
                </option>
              ))}
            </SortedOptions>
          </select>
        </Field>
        <Field label="Who hauled">
          <select
            className={opsFieldClass}
            value={form.haulerRateId}
            onChange={(e) => patch("haulerRateId", e.target.value)}
          >
            <SortedOptions>
              <option value="">—</option>
              {activeHaulers.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.label}
                  {!h.isActive ? " (inactive)" : ""}
                </option>
              ))}
            </SortedOptions>
          </select>
        </Field>
        <Field label="Trucking hours">
          <input
            className={opsFieldClass}
            inputMode="decimal"
            value={form.hours}
            onChange={(e) => patch("hours", e.target.value)}
            placeholder="Only for hourly haulers"
          />
        </Field>
        <Field label="Where and what was hauled">
          <select
            className={opsFieldClass}
            value={form.disposalRateId}
            onChange={(e) => patch("disposalRateId", e.target.value)}
          >
            <SortedOptions>
              <option value="">—</option>
              {activeDisposals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                  {!d.isActive ? " (inactive)" : ""}
                </option>
              ))}
            </SortedOptions>
          </select>
        </Field>
        <Field label="Weight (tons)">
          <input
            className={opsFieldClass}
            inputMode="decimal"
            value={form.weightTons}
            onChange={(e) => patch("weightTons", e.target.value)}
          />
        </Field>
        <Field label="Goel ticket #">
          <input
            className={opsFieldClass}
            value={form.goelTicketNumber}
            onChange={(e) => patch("goelTicketNumber", e.target.value)}
          />
        </Field>
        <Field label="Hauling ticket #">
          <input
            className={opsFieldClass}
            value={form.haulingTicketNumber}
            onChange={(e) => patch("haulingTicketNumber", e.target.value)}
          />
        </Field>
        <Field label="Disposal ticket #">
          <input
            className={opsFieldClass}
            value={form.disposalTicketNumber}
            onChange={(e) => patch("disposalTicketNumber", e.target.value)}
          />
        </Field>
        <Field label="Waste manifest #">
          <input
            className={opsFieldClass}
            value={form.wasteManifestNumber}
            onChange={(e) => patch("wasteManifestNumber", e.target.value)}
          />
        </Field>
        <Field label="Transfer job #">
          <input
            className={opsFieldClass}
            value={form.transferJobNumber}
            onChange={(e) => patch("transferJobNumber", e.target.value)}
          />
        </Field>
        </div>
      </section>

      <section className={OPS_SHELL}>
        <button
          type="button"
          className="flex w-full items-center justify-between bg-[#f8f9fb] px-4 py-2.5 text-left transition hover:bg-[#f3f6f9]"
          onClick={() => setShowLeed((v) => !v)}
        >
          <span className="text-[12px] font-semibold uppercase tracking-wide text-ink/50">
            LEED quantities &amp; aggregates
          </span>
          <span className="text-[12px] font-medium text-ink/40">
            {showLeed ? "Hide" : "Show"}
          </span>
        </button>
        {showLeed ? (
          <div className="grid gap-3 border-t border-ink/[0.06] p-4 sm:grid-cols-2 lg:grid-cols-3">
            {LEED_FIELD_META.map((f) => (
              <Field key={f.key} label={f.label}>
                <input
                  className={opsFieldClass}
                  inputMode="decimal"
                  value={form.leed[f.key] ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      leed: { ...prev.leed, [f.key]: e.target.value },
                    }))
                  }
                />
              </Field>
            ))}
            {AGGREGATE_FIELD_META.map((f) => (
              <Field key={f.key} label={f.label}>
                <input
                  className={opsFieldClass}
                  inputMode="decimal"
                  value={form.aggregates[f.key] ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      aggregates: { ...prev.aggregates, [f.key]: e.target.value },
                    }))
                  }
                />
              </Field>
            ))}
          </div>
        ) : null}
      </section>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-0 z-[1] -mx-1 flex flex-wrap items-center gap-2 border-t border-ink/[0.06] bg-canvas/95 px-1 py-3 backdrop-blur-sm">
        <button
          type="button"
          disabled={saving || deleting}
          onClick={() => void save()}
          className={opsBtnPrimary}
        >
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create haul"}
        </button>
        <Link href="/operations" className={opsBtnGhost}>
          Back to log
        </Link>
        {isEdit ? (
          <button
            type="button"
            disabled={saving || deleting}
            onClick={() => setConfirmDelete(true)}
            className={`${opsBtnDanger} ml-auto`}
          >
            Delete
          </button>
        ) : null}
      </div>

      <ConfirmModal
        isOpen={confirmDelete}
        title="Delete haul?"
        message="This removes the trip from the log. Costs on reports will update after delete."
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        variant="danger"
        onConfirm={() => void remove()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-medium text-ink/45">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function ReadCost({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink/40">{label}</p>
      <p className={`mt-0.5 tabular-nums ${emphasis ? "text-lg font-semibold text-ink" : "text-[15px] font-medium text-ink/80"}`}>
        {value}
      </p>
    </div>
  );
}
