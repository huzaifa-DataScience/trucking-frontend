"use client";

import type { SitelinePayApp } from "@/lib/api/endpoints/siteline";

const formatCurrency = (value: number | undefined) =>
  value != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)
    : "—";

const formatDateTimeParts = (value?: string, timeZone?: string) => {
  if (!value) return { date: "—", time: "—" };
  const d = new Date(value);
  const tz = timeZone || "UTC";
  const date = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: tz,
  }).format(d);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  }).format(d);
  return { date, time };
};

interface PayAppDetailModalProps {
  payApp: SitelinePayApp | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

const G702_LABELS: Record<string, string> = {
  originalContractSum: "Original contract sum",
  netChangeByChangeOrders: "Net change by change orders",
  contractSumToDate: "Contract sum to date",
  totalCompletedToDate: "Total completed to date",
  totalRetention: "Total retention",
  previousPayments: "Previous payments",
  currentPaymentDue: "Current payment due",
  balanceToFinish: "Balance to finish",
  balanceToFinishWithRetention: "Balance to finish with retention",
};

export function PayAppDetailModal({
  payApp,
  loading,
  error,
  onClose,
}: PayAppDetailModalProps) {
  const g702 = payApp?.g702Values as Record<string, number> | undefined;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payapp-detail-title"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-xl dark:border-stone-700 dark:bg-stone-900">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white px-6 py-4 dark:border-stone-700 dark:bg-stone-900">
          <h2 id="payapp-detail-title" className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            Pay application #{payApp?.payAppNumber ?? "—"} {payApp?.contract?.project?.name && `· ${payApp.contract.project.name}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            Close
          </button>
        </div>
        <div className="p-6 space-y-6">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
              {error}
            </div>
          )}
          {!loading && !error && payApp && (
            <>
              {(() => {
                const start = formatDateTimeParts(payApp.billingStart, payApp.timeZone);
                const end = formatDateTimeParts(payApp.billingEnd, payApp.timeZone);
                const updated = formatDateTimeParts(payApp.updatedAt, payApp.timeZone);
                return (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <p className="text-sm">
                      <span className="font-medium text-stone-500 dark:text-stone-400">Period (dates)</span>
                      <span className="ml-2 text-stone-900 dark:text-stone-100">
                        {payApp.billingStart && payApp.billingEnd
                          ? `${start.date} – ${end.date}`
                          : "—"}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="font-medium text-stone-500 dark:text-stone-400">Period (times)</span>
                      <span className="ml-2 text-stone-900 dark:text-stone-100">
                        {payApp.billingStart && payApp.billingEnd
                          ? `${start.time} – ${end.time}`
                          : "—"}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="font-medium text-stone-500 dark:text-stone-400">Due date</span>
                      <span className="ml-2 text-stone-900 dark:text-stone-100">
                        {payApp.payAppDueDate ?? "—"}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="font-medium text-stone-500 dark:text-stone-400">Status</span>
                      <span className="ml-2 text-stone-900 dark:text-stone-100">
                        {payApp.status ?? "—"}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="font-medium text-stone-500 dark:text-stone-400">Updated date</span>
                      <span className="ml-2 text-stone-900 dark:text-stone-100">
                        {updated.date}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="font-medium text-stone-500 dark:text-stone-400">Updated time</span>
                      <span className="ml-2 text-stone-900 dark:text-stone-100">
                        {updated.time}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="font-medium text-stone-500 dark:text-stone-400">Current billed</span>
                      <span className="ml-2 text-stone-900 dark:text-stone-100">
                        {formatCurrency(payApp.currentBilled)}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="font-medium text-stone-500 dark:text-stone-400">Total value</span>
                      <span className="ml-2 text-stone-900 dark:text-stone-100">
                        {formatCurrency(payApp.totalValue)}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="font-medium text-stone-500 dark:text-stone-400">Balance to finish</span>
                      <span className="ml-2 text-stone-900 dark:text-stone-100">
                        {formatCurrency(payApp.balanceToFinish)}
                      </span>
                    </p>
                  </div>
                );
              })()}

              {g702 && Object.keys(g702).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3">G702 summary</h3>
                  <dl className="space-y-2">
                    {Object.entries(g702).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <dt className="text-stone-500 dark:text-stone-400">
                          {G702_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").trim()}
                        </dt>
                        <dd className="font-medium text-stone-900 dark:text-stone-100">
                          {typeof value === "number" ? formatCurrency(value) : String(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
