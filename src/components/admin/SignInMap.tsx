"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { SignInLocationRow } from "@/lib/api/endpoints/admin";

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Each person's latest sign-in (rows come newest first). */
function latestPerPerson(rows: SignInLocationRow[]): SignInLocationRow[] {
  const seen = new Set<number>();
  return rows.filter((r) => (seen.has(r.userId) ? false : (seen.add(r.userId), true)));
}

/**
 * Map of where everyone last signed in. At a confirmed office the dot sits on the office's
 * exact spot. Otherwise it is the browser's guess, and the shaded circle is its accuracy.
 */
export function SignInMap({ rows, when }: { rows: SignInLocationRow[]; when: (iso: string) => string }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!box.current) return;
    let map: import("leaflet").Map | null = null;
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !box.current) return;
      map = L.map(box.current, { scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const people = latestPerPerson(rows);
      const bounds = L.latLngBounds([]);
      for (const r of people) {
        const atOffice = r.officeLatitude != null && r.officeLongitude != null;
        const at = atOffice ? L.latLng(r.officeLatitude!, r.officeLongitude!) : L.latLng(r.latitude, r.longitude);
        if (!atOffice) L.circle(at, { radius: r.accuracyM, color: "#1e88e5", weight: 1, fillOpacity: 0.08 }).addTo(map);
        L.circleMarker(at, { radius: 7, color: "#ffffff", weight: 2, fillColor: "#1565c0", fillOpacity: 1 })
          .bindTooltip(esc(atOffice ? `${r.name} · ${r.officeName}` : r.name), { permanent: true, direction: "right", offset: [8, 0] })
          .bindPopup(
            `<b>${esc(r.name)}</b><br>${esc(r.officeName ?? "Not at an office")} · ${esc(r.floor)}<br>` +
              (r.address ? `${esc(r.address)}<br>` : "") +
              `${esc(when(r.signedInAt))}<br>` +
              (atOffice ? "Shown at the office’s exact spot" : `Browser guess, within ± ${Math.round(r.accuracyM)} m`)
          )
          .addTo(map);
        bounds.extend(at);
      }
      if (people.length === 1) map.setView(bounds.getCenter(), 17);
      else if (people.length > 1) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
      else map.setView([20, 0], 2);
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [rows, when]);

  return <div ref={box} className="h-[460px] w-full" role="region" aria-label="Map of where people signed in" />;
}
