"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { post } from "@/lib/api/client";

/** How often a location is sent while the app is open. The backend stops the clock after 10 minutes of silence. */
const PING_EVERY_MS = 2 * 60_000;
/** A reading older than this is not sent (the device stopped updating). */
const MAX_READING_AGE_MS = 3 * 60_000;

/**
 * While someone is signed in with the app open, sends their location every 2 minutes.
 * Nothing runs when signed out, when location is blocked, or when the browser has no location.
 */
export function LocationTracker() {
  const { user } = useAuth();
  const active = user?.status === "active";

  useEffect(() => {
    if (!active || typeof window === "undefined" || !("geolocation" in navigator) || !window.isSecureContext) return;
    let latest: GeolocationPosition | null = null;
    let lastSent = 0;

    const send = () => {
      const p = latest;
      if (!p || Date.now() - p.timestamp > MAX_READING_AGE_MS) return;
      lastSent = Date.now();
      void post("/auth/location-ping", {
        latitude: p.coords.latitude,
        longitude: p.coords.longitude,
        accuracy: p.coords.accuracy,
      }).catch(() => undefined);
    };

    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        // Keep the more accurate of two readings taken close together.
        if (!latest || p.timestamp - latest.timestamp > 30_000 || p.coords.accuracy <= latest.coords.accuracy) latest = p;
        if (Date.now() - lastSent >= PING_EVERY_MS) send();
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 60_000 }
    );
    const timer = window.setInterval(send, PING_EVERY_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastSent >= PING_EVERY_MS) send();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active]);

  return null;
}
