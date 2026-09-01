"use client";

import { useCallback, useEffect, useState } from "react";
import * as biddingSpecsApi from "@/lib/api/endpoints/biddingSpecs";
import { getSpecsErrorMessage } from "@/lib/bidding/specs-errors";
import type { CatalogItem } from "@/lib/bidding/specs-types";

export function CatalogPriceDialog({
  open,
  onClose,
  initialSearch,
  size1,
  size2,
  onPriceUpdated,
}: {
  open: boolean;
  onClose: () => void;
  initialSearch?: string;
  size1?: number | null;
  size2?: number | null;
  onPriceUpdated: () => void;
}) {
  const [search, setSearch] = useState(initialSearch ?? "");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [priceDraft, setPriceDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await biddingSpecsApi.searchItemCatalog({
        search: search.trim() || undefined,
        size1: size1 ?? undefined,
        size2: size2 ?? undefined,
        limit: 100,
      });
      setItems(list);
    } catch (e) {
      setError(getSpecsErrorMessage(e, "Failed to load catalog"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [search, size1, size2]);

  useEffect(() => {
    if (!open) return;
    setSearch(initialSearch ?? "");
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
  }, [open, initialSearch, load]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div
        role="dialog"
        aria-modal
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-ink/[0.08] bg-surface shadow-xl"
      >
        <div className="shrink-0 border-b border-ink/[0.06] px-5 py-4">
          <h2 className="text-lg font-semibold text-ink">Item catalog</h2>
          <p className="mt-1 text-sm text-ink/50">
            Optional admin price edit. Specs show a collective item list — not a
            cheapest / vendor pick.
          </p>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search catalog…"
            className="mt-3 w-full rounded-xl border border-ink/10 bg-canvas px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>

        <div className="ui-scroll-light min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <p className="py-8 text-center text-sm text-ink/45">Loading…</p>
          ) : error ? (
            <p className="py-8 text-center text-sm text-danger">{error}</p>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink/45">No catalog items.</p>
          ) : (
            <ul className="divide-y divide-ink/[0.05]">
              {items.map((item) => (
                <li key={item.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{item.itemName}</p>
                    <p className="text-[11px] text-ink/40">
                      size1={item.size1 ?? "—"} · size2={item.size2 ?? "—"}
                    </p>
                  </div>
                  {editingId === item.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={priceDraft}
                        onChange={(e) => setPriceDraft(e.target.value)}
                        className="w-24 rounded-lg border border-ink/10 bg-canvas px-2 py-1.5 text-sm"
                      />
                      <button
                        type="button"
                        disabled={saving}
                        onClick={async () => {
                          const price = Number(priceDraft);
                          if (!Number.isFinite(price) || price < 0) {
                            setError("Price must be ≥ 0");
                            return;
                          }
                          setSaving(true);
                          try {
                            await biddingSpecsApi.patchCatalogItemPrice(item.id, price);
                            setEditingId(null);
                            onPriceUpdated();
                            await load();
                          } catch (e) {
                            setError(getSpecsErrorMessage(e, "Failed to update price"));
                          } finally {
                            setSaving(false);
                          }
                        }}
                        className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-xs text-ink/50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-ink">
                        {item.price != null ? `$${item.price.toFixed(2)}` : "—"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(item.id);
                          setPriceDraft(item.price != null ? String(item.price) : "0");
                        }}
                        className="text-xs font-semibold text-brand"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-ink/[0.06] px-5 py-3 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-ink/60 hover:bg-ink/[0.04]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
