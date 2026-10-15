"use client";

import { useRef, useState } from "react";
import { buttonClasses } from "@/components/ui/Button";
import type { DocumentMeta } from "@/lib/api/endpoints/daily-reports";

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

/** Original form: zoom / fit / rotate / fullscreen / download. PDFs use the browser viewer. */
export function DocumentViewer({ meta, url }: { meta: DocumentMeta; url: string | null }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number | "fit">("fit");
  const [rotation, setRotation] = useState(0);
  const isPdf = meta.contentType === "application/pdf";
  const zoomIndex = zoom === "fit" ? ZOOMS.indexOf(1) : ZOOMS.indexOf(zoom);
  const sideways = rotation % 180 !== 0;

  const step = (dir: 1 | -1) => {
    const next = ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, zoomIndex + dir))];
    setZoom(next);
  };

  const fullscreen = () => {
    const el = frameRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };

  const tool = `${buttonClasses("secondary", "sm")} h-8 min-w-8 px-2`;

  return (
    <div ref={frameRef} className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-white">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border-subtle)] px-3 py-2">
        <p className="mr-auto min-w-0 truncate text-[13px] font-medium text-ink" title={meta.fileName}>
          {meta.fileName}
        </p>
        {!isPdf ? (
          <>
            <button type="button" className={tool} onClick={() => step(-1)} aria-label="Zoom out" disabled={zoomIndex <= 0}>
              −
            </button>
            <span className="w-12 text-center text-[12px] tabular-nums text-ink-muted" aria-live="polite">
              {zoom === "fit" ? "Fit" : `${Math.round(zoom * 100)}%`}
            </span>
            <button type="button" className={tool} onClick={() => step(1)} aria-label="Zoom in" disabled={zoomIndex >= ZOOMS.length - 1}>
              +
            </button>
            <button type="button" className={tool} onClick={() => setZoom("fit")} aria-pressed={zoom === "fit"}>
              Fit width
            </button>
            <button type="button" className={tool} onClick={() => setRotation((r) => (r + 90) % 360)} aria-label="Rotate 90°">
              ↻ Rotate
            </button>
          </>
        ) : null}
        <button type="button" className={tool} onClick={fullscreen}>
          ⛶ Fullscreen
        </button>
        {url ? (
          <a className={tool} href={url} download={meta.fileName}>
            ⤓ Download
          </a>
        ) : null}
      </div>
      <div className="min-h-[420px] flex-1 overflow-auto bg-[#f3f4f6]">
        {!url ? (
          <div className="grid h-full place-items-center text-[13px] text-ink-muted">Loading document…</div>
        ) : isPdf ? (
          <iframe src={url} title={meta.fileName} className="h-full min-h-[600px] w-full border-0" />
        ) : (
          <div className="flex min-h-full items-start justify-center p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- private blob URL, not optimisable */}
            <img
              src={url}
              alt={`Original report ${meta.fileName}`}
              className="max-w-none origin-center shadow-sm transition-transform"
              style={{
                width: zoom === "fit" ? (sideways ? "auto" : "100%") : `${zoom * 100}%`,
                maxHeight: zoom === "fit" && sideways ? "calc(100vw)" : undefined,
                transform: `rotate(${rotation}deg)`,
                margin: sideways ? "12% 0" : undefined,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
