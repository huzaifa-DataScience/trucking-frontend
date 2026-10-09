"use client";

import { useEffect, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { useBidSheet } from "@/contexts/BidSheetContext";
import { useProcessDraft } from "@/hooks/useProcessDraft";
import { ApiError, getApiErrorMessage } from "@/lib/api/client";
import { useToast } from "@/components/ui/ToastProvider";

/** Drawings / Specs / Takeoff — Load, Run script; Takeoff also gets Pull export. */
export function TogalProjectBar({ pull = false }: { pull?: boolean }) {
  const { bid, setField, editable } = useProcessDraft();
  const { applyBidDetail, refresh } = useBidSheet();
  const { showToast } = useToast();
  const [busy, setBusy] = useState<"load" | "run" | "pull" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const run = async (kind: "load" | "run" | "pull", fn: () => Promise<void>) => {
    if (!bid || !editable) return;
    setBusy(kind);
    setNote(null);
    setLocalError(null);
    try {
      await fn();
    } catch (e) {
      const message = getApiErrorMessage(e, "Togal request failed");
      setLocalError(message);
      if (e instanceof ApiError && e.status === 403) showToast(message, "error");
      if (kind === "load") void refresh().catch(() => undefined);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="intake-section min-w-0">
      <h3 className="intake-section-head">Togal</h3>
      <div className="intake-section-body flex flex-col gap-2">
        <p className="text-[12.5px] text-ink/55">
          Upload on this bid sends drawings, specs, and addenda to Togal. Load retries anything still
          unsent. Snaps and the color-coded export come back on Takeoff.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!editable || busy != null}
            className="intake-head-btn disabled:opacity-50"
            onClick={() =>
              void run("load", async () => {
                const updated = await biddingApi.loadBidInTogal(bid!.id);
                applyBidDetail(updated);
                setField("togal", updated.process?.togal ?? null);
                setNote("Loaded in Togal");
              })
            }
          >
            {busy === "load" ? "Loading…" : "Load in Togal"}
          </button>
          <button
            type="button"
            disabled={!editable || busy != null}
            className="intake-head-btn disabled:opacity-50"
            onClick={() =>
              void run("run", async () => {
                await biddingApi.runTogalScript(bid!.id);
                setNote("Script sent to Togal");
              })
            }
          >
            {busy === "run" ? "Running…" : "Run script"}
          </button>
          {pull ? (
            <button
              type="button"
              disabled={!editable || busy != null}
              className="intake-head-btn disabled:opacity-50"
              onClick={() =>
                void run("pull", async () => {
                  const updated = await biddingApi.pullTogalExport(bid!.id);
                  applyBidDetail(updated);
                  setField("togal", updated.process?.togal ?? null);
                  setNote("Export pulled onto Takeoff");
                })
              }
            >
              {busy === "pull" ? "Pulling…" : "Pull export"}
            </button>
          ) : null}
          {note ? <span className="text-[12px] text-success">{note}</span> : null}
        </div>
        {localError ? (
          <p className="text-[12.5px] text-danger" role="alert">
            {localError}
          </p>
        ) : null}
      </div>
    </section>
  );
}

/** Handoff — instruction script only. Connect lives on the secondary rail. */
export function TogalScriptPanel() {
  const { showToast } = useToast();
  const [body, setBody] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void biddingApi
      .getTogalScript()
      .then((row) => {
        if (!live) return;
        setBody(row.body ?? "");
        setCanEdit(row.canEdit);
      })
      .catch((e) => {
        if (live) setError(getApiErrorMessage(e, "Couldn't load the Togal script"));
      });
    return () => {
      live = false;
    };
  }, []);

  const save = async () => {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    setSavedNote(null);
    try {
      const row = await biddingApi.saveTogalScript(body);
      setBody(row.body);
      setCanEdit(row.canEdit);
      setSavedNote("Script saved");
    } catch (e) {
      const message = getApiErrorMessage(e, "Couldn't save the Togal script");
      setError(message);
      if (e instanceof ApiError && e.status === 403) showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="intake-section min-w-0">
      <h3 className="intake-section-head">Togal instruction script</h3>
      <div className="intake-section-body flex flex-col gap-3">
        <p className="text-[12.5px] text-ink/55">
          One script for every bid. Run script on the bid sends this text into Togal. Connect Togal
          from the stages menu on the left when the session expires.
        </p>
        <textarea
          className="intake-field min-h-[8rem] w-full resize-y"
          value={body}
          disabled={!canEdit}
          maxLength={500_000}
          onChange={(e) => {
            setBody(e.target.value);
            setSavedNote(null);
          }}
          placeholder="Paste the instruction script John uses in Togal…"
        />
        <div className="flex flex-wrap items-center gap-2">
          {canEdit ? (
            <button
              type="button"
              disabled={saving}
              className="intake-head-btn disabled:opacity-50"
              onClick={() => void save()}
            >
              {saving ? "Saving…" : "Save script"}
            </button>
          ) : (
            <button
              type="button"
              className="intake-head-btn"
              onClick={() => {
                void navigator.clipboard.writeText(body).then(
                  () => setSavedNote("Copied"),
                  () => setError("Couldn't copy")
                );
              }}
            >
              Copy script
            </button>
          )}
          {savedNote ? <span className="text-[12px] text-success">{savedNote}</span> : null}
        </div>
        {error ? (
          <p className="text-[12.5px] text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
