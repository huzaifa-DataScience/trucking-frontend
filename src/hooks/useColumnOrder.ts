"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const CHANGE_EVENT = "column-order-change";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* storage blocked: order just won't persist */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Saved order, minus columns that no longer exist; new columns slot in after their default neighbour. */
function mergeOrder(saved: string[] | null, defaults: string[]): string[] {
  if (!saved) return defaults;
  const known = new Set(defaults);
  const order = saved.filter((k, i) => known.has(k) && saved.indexOf(k) === i);
  defaults.forEach((key, i) => {
    if (order.includes(key)) return;
    const before = defaults.slice(0, i).reverse().find((k) => order.includes(k));
    order.splice(before ? order.indexOf(before) + 1 : 0, 0, key);
  });
  return order;
}

/**
 * User-chosen column order for one table, kept in this browser (localStorage).
 * `defaults` is the built-in order; it is also what Reset goes back to.
 */
export function useColumnOrder(storageKey: string, defaults: string[]) {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(storageKey),
    () => null
  );
  const defaultsKey = defaults.join("\u0000");
  const order = useMemo(() => {
    let saved: string[] | null = null;
    try {
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) saved = parsed.filter((k): k is string => typeof k === "string");
    } catch {
      saved = null;
    }
    return mergeOrder(saved, defaultsKey ? defaultsKey.split("\u0000") : []);
  }, [raw, defaultsKey]);

  const setOrder = useCallback((keys: string[]) => write(storageKey, JSON.stringify(keys)), [storageKey]);
  const reset = useCallback(() => write(storageKey, null), [storageKey]);
  return { order, setOrder, reset, isCustom: raw != null };
}
