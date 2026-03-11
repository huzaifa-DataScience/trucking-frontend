"use client";

import type { SitelineContract, SitelinePayApp } from "@/lib/api/endpoints/siteline";
import { Card, CardHeader } from "@/components/ui/Card";

const formatCurrency = (value: number | undefined) =>
  value != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)
    : "—";

const formatPercent = (value: number | undefined) =>
  value != null ? `${(value * 100).toFixed(1)}%` : "—";

interface ContractDetailModalProps {
  contract: SitelineContract | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onOpenPayApp: (payApp: SitelinePayApp) => void;
}

export function ContractDetailModal({
  contract,
  loading,
  error,
  onClose,
  onOpenPayApp,
}: ContractDetailModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contract-detail-title"
    >
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-xl dark:border-stone-700 dark:bg-stone-900">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white px-6 py-4 dark:border-stone-700 dark:bg-stone-900">
          <h2 id="contract-detail-title" className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            {contract?.project?.name ?? "Contract"}
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
          {!loading && !error && contract && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <p className="text-sm">
                  <span className="font-medium text-stone-500 dark:text-stone-400">Project</span>
                  <span className="ml-2 text-stone-900 dark:text-stone-100">
                    {contract.project?.name ?? "—"}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-stone-500 dark:text-stone-400">Project #</span>
                  <span className="ml-2 text-stone-900 dark:text-stone-100">
                    {contract.project?.projectNumber ?? "—"}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-stone-500 dark:text-stone-400">Contract #</span>
                  <span className="ml-2 text-stone-900 dark:text-stone-100">
                    {contract.sov?.contractNumber ?? "—"}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-stone-500 dark:text-stone-400">Internal project #</span>
                  <span className="ml-2 text-stone-900 dark:text-stone-100">
                    {contract.internalProjectNumber ?? "—"}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-stone-500 dark:text-stone-400">Status</span>
                  <span className="ml-2 text-stone-900 dark:text-stone-100">
                    {contract.status ?? "—"}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-stone-500 dark:text-stone-400">Billing type</span>
                  <span className="ml-2 text-stone-900 dark:text-stone-100">
                    {contract.billingType ?? "—"}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-stone-500 dark:text-stone-400">Total value</span>
                  <span className="ml-2 text-stone-900 dark:text-stone-100">
                    {formatCurrency(contract.sov?.totalValue)}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-stone-500 dark:text-stone-400">Total billed</span>
                  <span className="ml-2 text-stone-900 dark:text-stone-100">
                    {formatCurrency(contract.sov?.totalBilled)}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-stone-500 dark:text-stone-400">Total retention</span>
                  <span className="ml-2 text-stone-900 dark:text-stone-100">
                    {formatCurrency(contract.sov?.totalRetention)}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-stone-500 dark:text-stone-400">Progress</span>
                  <span className="ml-2 text-stone-900 dark:text-stone-100">
                    {formatPercent(contract.sov?.progressComplete)}
                  </span>
                </p>
              </div>

              {contract.sov?.lineItems && contract.sov.lineItems.length > 0 && (
                <Card>
                  <CardHeader title="Schedule of values (SOV)" subtitle="Line items" />
                  <div className="overflow-x-auto overflow-y-auto max-h-80 -mx-1 px-1 sm:mx-0 sm:px-0">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-stone-200 dark:border-stone-700">
                          <th className="text-left px-2 py-2 text-xs font-medium text-stone-600 dark:text-stone-400">Code</th>
                          <th className="text-left px-2 py-2 text-xs font-medium text-stone-600 dark:text-stone-400">Name</th>
                          <th className="text-right px-2 py-2 text-xs font-medium text-stone-600 dark:text-stone-400">Original</th>
                          <th className="text-right px-2 py-2 text-xs font-medium text-stone-600 dark:text-stone-400">Latest</th>
                          <th className="text-right px-2 py-2 text-xs font-medium text-stone-600 dark:text-stone-400">Billed</th>
                          <th className="text-right px-2 py-2 text-xs font-medium text-stone-600 dark:text-stone-400">Progress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contract.sov.lineItems.map((item) => (
                          <tr key={item.id} className="border-b border-stone-100 last:border-0 dark:border-stone-800">
                            <td className="px-2 py-2 text-stone-800 dark:text-stone-200">
                              {item.code ?? "—"}
                            </td>
                            <td className="px-2 py-2 text-stone-800 dark:text-stone-200">
                              {item.name ?? "—"}
                            </td>
                            <td className="px-2 py-2 text-right text-stone-800 dark:text-stone-200">
                              {formatCurrency(item.originalTotalValue)}
                            </td>
                            <td className="px-2 py-2 text-right text-stone-800 dark:text-stone-200">
                              {formatCurrency(item.latestTotalValue)}
                            </td>
                            <td className="px-2 py-2 text-right text-stone-800 dark:text-stone-200">
                              {formatCurrency(item.totalBilled)}
                            </td>
                            <td className="px-2 py-2 text-right text-stone-800 dark:text-stone-200">
                              {formatPercent(item.progressComplete)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {contract.payApps && contract.payApps.length > 0 && (
                <Card>
                  <CardHeader title="Pay applications" subtitle={`${contract.payApps.length} pay app(s)`} />
                  <div className="overflow-x-auto overflow-y-auto max-h-80 -mx-1 px-1 sm:mx-0 sm:px-0">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-stone-200 dark:border-stone-700">
                          <th className="text-left px-2 py-2 text-xs font-medium text-stone-600 dark:text-stone-400">#</th>
                          <th className="text-left px-2 py-2 text-xs font-medium text-stone-600 dark:text-stone-400">Period</th>
                          <th className="text-left px-2 py-2 text-xs font-medium text-stone-600 dark:text-stone-400">Due date</th>
                          <th className="text-left px-2 py-2 text-xs font-medium text-stone-600 dark:text-stone-400">Status</th>
                          <th className="text-left px-2 py-2 text-xs font-medium text-stone-600 dark:text-stone-400">Updated at</th>
                          <th className="text-right px-2 py-2 text-xs font-medium text-stone-600 dark:text-stone-400">Current billed</th>
                          <th className="text-right px-2 py-2 text-xs font-medium text-stone-600 dark:text-stone-400">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contract.payApps.map((pa) => (
                          <tr key={pa.id} className="border-b border-stone-100 last:border-0 dark:border-stone-800">
                            <td className="px-2 py-2 text-stone-800 dark:text-stone-200">
                              {pa.payAppNumber ?? "—"}
                            </td>
                            <td className="px-2 py-2 text-stone-800 dark:text-stone-200">
                              {pa.billingStart && pa.billingEnd ? `${pa.billingStart} – ${pa.billingEnd}` : "—"}
                            </td>
                            <td className="px-2 py-2 text-stone-800 dark:text-stone-200">
                              {pa.payAppDueDate ?? "—"}
                            </td>
                            <td className="px-2 py-2 text-stone-800 dark:text-stone-200">
                              {pa.status ?? "—"}
                            </td>
                            <td className="px-2 py-2 text-stone-800 dark:text-stone-200">
                              {pa.updatedAt ?? "—"}
                            </td>
                            <td className="px-2 py-2 text-right text-stone-800 dark:text-stone-200">
                              {formatCurrency(pa.currentBilled)}
                            </td>
                            <td className="px-2 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => onOpenPayApp(pa)}
                                className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 font-medium"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {contract.changeOrderRequests && contract.changeOrderRequests.length > 0 && (
                <Card>
                  <CardHeader title="Change orders" subtitle={`${contract.changeOrderRequests.length} change order(s)`} />
                  <div className="overflow-x-auto overflow-y-auto max-h-80 -mx-1 px-1 sm:mx-0 sm:px-0">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-stone-200 dark:border-stone-700">
                          <th className="text-left px-2 py-2 text-xs font-medium text-stone-600 dark:text-stone-400">
                            Internal #
                          </th>
                          <th className="text-left px-2 py-2 text-xs font-medium text-stone-600 dark:text-stone-400">
                            Name
                          </th>
                          <th className="text-right px-2 py-2 text-xs font-medium text-stone-600 dark:text-stone-400">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {contract.changeOrderRequests.map((co) => (
                          <tr key={co.id} className="border-b border-stone-100 last:border-0 dark:border-stone-800">
                            <td className="px-2 py-2 text-stone-800 dark:text-stone-200">
                              {co.internalNumber ?? "—"}
                            </td>
                            <td className="px-2 py-2 text-stone-800 dark:text-stone-200">
                              {co.name ?? "—"}
                            </td>
                            <td className="px-2 py-2 text-right text-stone-800 dark:text-stone-200">
                              {formatCurrency(co.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
