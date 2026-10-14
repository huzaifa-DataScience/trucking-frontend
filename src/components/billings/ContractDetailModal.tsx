"use client";

import type { SitelineContract, SitelinePayApp } from "@/lib/api/endpoints/siteline";
import { Card, CardHeader } from "@/components/ui/Card";
import { FormSkeleton } from "@/components/ui/Skeleton";

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
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-white shadow-lg  dark:bg-ink">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border-subtle)] bg-white px-6 py-4  dark:bg-ink">
          <h2 id="contract-detail-title" className="text-lg font-semibold text-ink">
            {contract?.project?.name ?? "Contract"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted hover:bg-canvas "
          >
            Close
          </button>
        </div>
        <div className="p-6 space-y-6">
          {loading && <FormSkeleton fields={5} />}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
              {error}
            </div>
          )}
          {!loading && !error && contract && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <p className="text-sm">
                  <span className="font-medium text-ink-muted">Project</span>
                  <span className="ml-2 text-ink">
                    {contract.project?.name ?? "—"}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-ink-muted">Project #</span>
                  <span className="ml-2 text-ink">
                    {contract.project?.projectNumber ?? "—"}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-ink-muted">Contract #</span>
                  <span className="ml-2 text-ink">
                    {contract.sov?.contractNumber ?? "—"}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-ink-muted">Internal project #</span>
                  <span className="ml-2 text-ink">
                    {contract.internalProjectNumber ?? "—"}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-ink-muted">Status</span>
                  <span className="ml-2 text-ink">
                    {contract.status ?? "—"}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-ink-muted">Billing type</span>
                  <span className="ml-2 text-ink">
                    {contract.billingType ?? "—"}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-ink-muted">Total value</span>
                  <span className="ml-2 text-ink">
                    {formatCurrency(contract.sov?.totalValue)}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-ink-muted">Total billed</span>
                  <span className="ml-2 text-ink">
                    {formatCurrency(contract.sov?.totalBilled)}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-ink-muted">Total retention</span>
                  <span className="ml-2 text-ink">
                    {formatCurrency(contract.sov?.totalRetention)}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-ink-muted">Progress</span>
                  <span className="ml-2 text-ink">
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
                        <tr className="border-b border-[var(--border-subtle)]">
                          <th className="text-left px-2 py-2 text-xs font-medium text-ink-muted">Code</th>
                          <th className="text-left px-2 py-2 text-xs font-medium text-ink-muted">Name</th>
                          <th className="text-right px-2 py-2 text-xs font-medium text-ink-muted">Original</th>
                          <th className="text-right px-2 py-2 text-xs font-medium text-ink-muted">Latest</th>
                          <th className="text-right px-2 py-2 text-xs font-medium text-ink-muted">Billed</th>
                          <th className="text-right px-2 py-2 text-xs font-medium text-ink-muted">Progress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contract.sov.lineItems.map((item) => (
                          <tr key={item.id} className="border-b border-[var(--border-subtle)] last:border-0">
                            <td className="px-2 py-2 text-ink">
                              {item.code ?? "—"}
                            </td>
                            <td className="px-2 py-2 text-ink">
                              {item.name ?? "—"}
                            </td>
                            <td className="px-2 py-2 text-right text-ink">
                              {formatCurrency(item.originalTotalValue)}
                            </td>
                            <td className="px-2 py-2 text-right text-ink">
                              {formatCurrency(item.latestTotalValue)}
                            </td>
                            <td className="px-2 py-2 text-right text-ink">
                              {formatCurrency(item.totalBilled)}
                            </td>
                            <td className="px-2 py-2 text-right text-ink">
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
                        <tr className="border-b border-[var(--border-subtle)]">
                          <th className="text-left px-2 py-2 text-xs font-medium text-ink-muted">#</th>
                          <th className="text-left px-2 py-2 text-xs font-medium text-ink-muted">Period</th>
                          <th className="text-left px-2 py-2 text-xs font-medium text-ink-muted">Due date</th>
                          <th className="text-left px-2 py-2 text-xs font-medium text-ink-muted">Status</th>
                          <th className="text-left px-2 py-2 text-xs font-medium text-ink-muted">Updated at</th>
                          <th className="text-right px-2 py-2 text-xs font-medium text-ink-muted">Current billed</th>
                          <th className="text-right px-2 py-2 text-xs font-medium text-ink-muted">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contract.payApps.map((pa) => (
                          <tr key={pa.id} className="border-b border-[var(--border-subtle)] last:border-0">
                            <td className="px-2 py-2 text-ink">
                              {pa.payAppNumber ?? "—"}
                            </td>
                            <td className="px-2 py-2 text-ink">
                              {pa.billingStart && pa.billingEnd ? `${pa.billingStart} – ${pa.billingEnd}` : "—"}
                            </td>
                            <td className="px-2 py-2 text-ink">
                              {pa.payAppDueDate ?? "—"}
                            </td>
                            <td className="px-2 py-2 text-ink">
                              {pa.status ?? "—"}
                            </td>
                            <td className="px-2 py-2 text-ink">
                              {pa.updatedAt ?? "—"}
                            </td>
                            <td className="px-2 py-2 text-right text-ink">
                              {formatCurrency(pa.currentBilled)}
                            </td>
                            <td className="px-2 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => onOpenPayApp(pa)}
                                className="text-brand hover:text-brand-secondary dark:text-brand dark:hover:text-white font-medium"
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
                        <tr className="border-b border-[var(--border-subtle)]">
                          <th className="text-left px-2 py-2 text-xs font-medium text-ink-muted">
                            Internal #
                          </th>
                          <th className="text-left px-2 py-2 text-xs font-medium text-ink-muted">
                            Name
                          </th>
                          <th className="text-right px-2 py-2 text-xs font-medium text-ink-muted">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {contract.changeOrderRequests.map((co) => (
                          <tr key={co.id} className="border-b border-[var(--border-subtle)] last:border-0">
                            <td className="px-2 py-2 text-ink">
                              {co.internalNumber ?? "—"}
                            </td>
                            <td className="px-2 py-2 text-ink">
                              {co.name ?? "—"}
                            </td>
                            <td className="px-2 py-2 text-right text-ink">
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
