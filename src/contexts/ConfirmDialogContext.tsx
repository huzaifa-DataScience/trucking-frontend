"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export type ConfirmDialogOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
};

type ConfirmDialogContextValue = {
  /** In-app modal confirm — replaces `window.confirm`. */
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
};

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(
  null
);

type Pending = ConfirmDialogOptions & {
  resolve: (value: boolean) => void;
};

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);

  const close = useCallback((value: boolean) => {
    const current = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    current?.resolve(value);
  }, []);

  const confirm = useCallback((options: ConfirmDialogOptions) => {
    return new Promise<boolean>((resolve) => {
      // If a dialog is already open, reject the previous waiter as cancel.
      if (pendingRef.current) {
        pendingRef.current.resolve(false);
      }
      const next: Pending = { ...options, resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      <ConfirmModal
        isOpen={pending != null}
        title={pending?.title ?? ""}
        message={pending?.message ?? ""}
        confirmLabel={pending?.confirmLabel}
        cancelLabel={pending?.cancelLabel}
        variant={pending?.variant}
        onConfirm={() => close(true)}
        onCancel={() => close(false)}
      />
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog(): ConfirmDialogContextValue["confirm"] {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error(
      "useConfirmDialog must be used within ConfirmDialogProvider"
    );
  }
  return ctx.confirm;
}
