"use client";

import { useEffect, useRef, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { ApiError, getApiErrorMessage } from "@/lib/api/client";
import { useToast } from "@/components/ui/ToastProvider";

function IconPlug({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M12 22v-5M9 8V2M15 8V2M7 8h10v4a5 5 0 01-10 0V8z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCheck({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} aria-hidden>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSpinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity={0.25} strokeWidth={2.5} />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  );
}

function IconLock({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" strokeLinecap="round" />
    </svg>
  );
}

function IconX({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

function IconExternal({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M14 4h6v6M10 14L20 4M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Company Togal session — Estimates secondary rail only (not per bid stage page).
 */
export function TogalConnectRail({ collapsed = false }: { collapsed?: boolean }) {
  const { showToast } = useToast();
  const [connected, setConnected] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [canConnect, setCanConnect] = useState(false);
  const [pending, setPending] = useState<{
    verificationUrl: string;
    userCode: string;
    expiresAt: string;
  } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** When true, ignore late connect/poll results after the user closed. */
  const cancelledRef = useRef(false);

  const stopPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  /** Close = cancel the waiting operation (stop loader/poll). */
  const closeModal = () => {
    cancelledRef.current = true;
    stopPoll();
    setConnecting(false);
    setPending(null);
    setError(null);
    setModalOpen(false);
    // Clear server-side pending when the backend supports cancel.
    void biddingApi.cancelTogalConnect().catch(() => undefined);
  };

  const startPoll = (intervalSeconds: number) => {
    stopPoll();
    const ms = Math.max(5, intervalSeconds) * 1000;
    pollRef.current = setInterval(() => {
      if (cancelledRef.current) {
        stopPoll();
        return;
      }
      void biddingApi
        .pollTogalConnect()
        .then((row) => {
          if (cancelledRef.current) return;
          if (row.connected) {
            setConnected(true);
            setExpiresAt(row.expiresAt);
            setPending(null);
            setConnecting(false);
            setModalOpen(false);
            stopPoll();
          }
        })
        .catch((e) => {
          if (cancelledRef.current) return;
          setConnecting(false);
          stopPoll();
          setError(getApiErrorMessage(e, "Togal login was not approved"));
          setModalOpen(true);
        });
    }, ms);
  };

  useEffect(() => {
    let live = true;
    void biddingApi
      .getTogalStatus()
      .then((s) => {
        if (!live) return;
        setConnected(s.connected);
        setExpiresAt(s.expiresAt);
        setCanConnect(s.canConnect);
        setPending(s.pending);
        setLoaded(true);
        // Resume poll quietly if a login is already waiting — never auto-open the modal on every page.
        if (s.pending && !s.connected) {
          setConnecting(true);
          startPoll(5);
        }
      })
      .catch(() => {
        if (live) setLoaded(true);
      });
    return () => {
      live = false;
      stopPoll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const needsConnect = loaded && !connected;
  const waiting = connecting || pending != null;

  const statusTitle = connected
    ? expiresAt
      ? `Togal connected until ${new Date(expiresAt).toLocaleString()}`
      : "Togal is connected"
    : waiting
      ? "Waiting for Togal approval — click to show code"
      : canConnect
        ? "Connect Togal (bids@ login)"
        : "Togal is not connected — a captain has to approve";

  const onRailClick = () => {
    if (connected) return;
    if (waiting) {
      setModalOpen(true);
      return;
    }
    if (!canConnect) return;
    void (async () => {
      cancelledRef.current = false;
      setError(null);
      setConnecting(true);
      setModalOpen(true);
      try {
        const row = await biddingApi.connectTogal();
        if (cancelledRef.current) {
          void biddingApi.cancelTogalConnect().catch(() => undefined);
          return;
        }
        setPending({
          verificationUrl: row.verificationUrl,
          userCode: row.userCode,
          expiresAt: row.expiresAt,
        });
        startPoll(row.intervalSeconds);
      } catch (e) {
        if (cancelledRef.current) return;
        setConnecting(false);
        const message = getApiErrorMessage(e, "Couldn't start the Togal login");
        setError(message);
        if (e instanceof ApiError && e.status === 403) showToast(message, "error");
      }
    })();
  };

  const railDisabled = !loaded || connected || (!canConnect && !waiting);

  const RailIcon = connected
    ? IconCheck
    : waiting
      ? IconSpinner
      : canConnect
        ? IconPlug
        : IconLock;

  return (
    <>
      <div
        className={`shrink-0 border-t border-[var(--border-subtle)] ${
          collapsed ? "flex flex-col items-center px-1 py-2" : "px-2 py-3"
        }`}
      >
        <button
          type="button"
          disabled={railDisabled}
          title={statusTitle}
          aria-label={statusTitle}
          onClick={onRailClick}
          className={`inline-flex cursor-pointer items-center justify-center rounded-md border transition disabled:cursor-not-allowed disabled:opacity-50 ${
            collapsed ? "h-9 w-9" : "h-9 w-full"
          } border-[var(--border-subtle)] bg-canvas text-ink hover:border-ink/20 hover:bg-[#eef1f5] disabled:hover:border-[var(--border-subtle)] disabled:hover:bg-canvas ${
            connected ? "border-success/30 bg-success/10 text-success" : ""
          } ${needsConnect && canConnect && !waiting ? "border-brand/40 text-brand" : ""} ${
            waiting ? "border-brand/30 text-brand" : ""
          }`}
        >
          <RailIcon className="h-4 w-4 shrink-0" />
        </button>
      </div>

      {modalOpen ? (
        <div
          role="dialog"
          aria-modal
          aria-label="Connect Togal"
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
        >
          <button
            type="button"
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            aria-label="Dismiss"
            onClick={closeModal}
          />
          <div
            className="relative z-10 w-full max-w-md rounded-2xl border border-ink/10 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-ink">
                <IconPlug className="h-5 w-5 text-brand" />
                <h2 className="text-[15px] font-semibold">Togal</h2>
              </div>
              <button
                type="button"
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-ink/45 transition hover:bg-ink/[0.06] hover:text-ink"
                aria-label="Close"
                title="Close"
                onClick={closeModal}
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-ink/60">
              Approve with the <span className="font-semibold text-ink">bids@</span> Togal login.
              Access lasts about 7 days.
            </p>
            {pending ? (
              <div className="mt-4 rounded-xl border border-ink/10 bg-[#f8f9fb] px-3.5 py-3 text-[13px] text-ink/75">
                <a
                  href={pending.verificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-semibold text-brand hover:underline"
                  title="Open Togal approval"
                >
                  <IconExternal className="h-4 w-4" />
                  <span className="font-mono tracking-wide text-ink">{pending.userCode}</span>
                </a>
                <p className="mt-2 flex items-center gap-2 text-[12px] text-ink/45">
                  <IconSpinner className="h-3.5 w-3.5" />
                  Waiting for approval…
                </p>
              </div>
            ) : connecting ? (
              <p className="mt-4 flex items-center gap-2 text-[13px] text-ink/55">
                <IconSpinner className="h-4 w-4" />
                Starting…
              </p>
            ) : null}
            {error ? (
              <p className="mt-3 text-[12.5px] text-danger" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
