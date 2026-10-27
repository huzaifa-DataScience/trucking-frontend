"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { TrackedPerson } from "@/lib/api/endpoints/admin";

/** Fixed colour per person (by user id), so a refresh never repaints anyone. */
const COLORS = ["#1565c0", "#e65100", "#2e7d32", "#6a1b9a", "#c62828", "#00838f", "#ad1457", "#5d4037"];
export const personColor = (userId: number) => COLORS[Math.abs(userId) % COLORS.length]!;

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Each person's trail for the day, with a dot where they were last seen. */
export function TrackingMap({ people, time }: { people: TrackedPerson[]; time: (iso: string) => string }) {
  const box = useRef<HTMLDivElement>(null);
  const view = useRef<{ center: [number, number]; zoom: number } | null>(null);

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

      const bounds = L.latLngBounds([]);
      for (const p of people) {
        const color = personColor(p.userId);
        const line = p.trail.map((t) => L.latLng(t.latitude, t.longitude));
        if (line.length > 1) L.polyline(line, { color, weight: 3, opacity: 0.8 }).addTo(map);
        for (const t of p.trail.slice(0, -1)) {
          L.circleMarker([t.latitude, t.longitude], { radius: 3, color, weight: 1, fillColor: color, fillOpacity: 0.6 })
            .bindTooltip(esc(`${p.name} · ${time(t.at)}`))
            .addTo(map);
        }
        if (p.last && p.lastPingAt) {
          const at = L.latLng(p.last.latitude, p.last.longitude);
          L.circleMarker(at, { radius: 8, color: "#ffffff", weight: 2, fillColor: color, fillOpacity: p.live ? 1 : 0.45 })
            .bindTooltip(esc(p.name), { permanent: true, direction: "right", offset: [9, 0] })
            .bindPopup(
              `<b>${esc(p.name)}</b><br>${p.live ? "Live now" : `Stopped · last seen ${esc(time(p.lastPingAt))}`}<br>` +
                `Within ± ${Math.round(p.last.accuracyM)} m`
            )
            .addTo(map);
        }
        line.forEach((pt) => bounds.extend(pt));
      }
      // Keep the admin's own pan/zoom across the once-a-minute refresh.
      if (view.current) map.setView(view.current.center, view.current.zoom);
      else if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
      else map.setView([20, 0], 2);
      map.on("moveend", () => {
        const c = map!.getCenter();
        view.current = { center: [c.lat, c.lng], zoom: map!.getZoom() };
      });
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [people, time]);

  return <div ref={box} className="h-[520px] w-full" role="region" aria-label="Map of everyone's trail today" />;
}
