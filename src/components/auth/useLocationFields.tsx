"use client";

import { useCallback, useEffect, useState } from "react";
import { nearbyOffices } from "@/lib/api/endpoints/auth";
import type { SignInLocation } from "@/lib/auth/types";

function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${s}`;
}

function distanceLabel(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(m >= 10_000 ? 0 : 1)} km` : `${Math.round(m)} m`;
}

const FLOORS = ["Basement", ...Array.from({ length: 30 }, (_, i) => `${ordinal(i + 1)} floor`), "Not in a building"];

/** Stop early once a reading is this precise. */
const GOOD_ENOUGH_M = 20;
/** Keep collecting readings this long, then use the most precise one. */
const COLLECT_MS = 10_000;
/** Give up if not even one reading arrived by then. */
const GIVE_UP_MS = 20_000;

function locationError(err: GeolocationPositionError): Error {
  if (err.code === err.PERMISSION_DENIED) {
    return new Error("Location is blocked. Click the icon at the left of the address bar, allow Location for this site, then try again.");
  }
  if (err.code === err.TIMEOUT) return new Error("Finding your location took too long. Please try again.");
  return new Error("Couldn’t find your location. Turn on location services on this device and try again.");
}

/**
 * The most precise position the device gives within ~10 seconds. The first reading is often a
 * rough guess (± 500 m) that sharpens as Wi-Fi/GPS kick in, so readings are watched and the best kept.
 * A reading up to 30 s old is accepted (the tracker may already hold one). Rejects with a message the person can act on.
 */
function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      reject(new Error("This browser can’t share your location. Use Chrome, Edge or Safari to sign in."));
      return;
    }
    if (!window.isSecureContext) {
      reject(new Error("Location only works on a secure (https) address. Open the app with https:// to sign in."));
      return;
    }
    let best: GeolocationPosition | null = null;
    let lastError: Error | null = null;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      navigator.geolocation.clearWatch(watchId);
      window.clearTimeout(collect);
      window.clearTimeout(giveUp);
      if (best) resolve(best);
      else reject(lastError ?? new Error("Finding your location took too long. Please try again."));
    };
    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        if (!best || p.coords.accuracy < best.coords.accuracy) best = p;
        if (p.coords.accuracy <= GOOD_ENOUGH_M) finish();
      },
      (err) => {
        lastError = locationError(err);
        if (err.code === err.PERMISSION_DENIED) finish();
      },
      { enableHighAccuracy: true, timeout: GIVE_UP_MS, maximumAge: 30_000 }
    );
    const collect = window.setTimeout(() => best && finish(), COLLECT_MS);
    const giveUp = window.setTimeout(finish, GIVE_UP_MS);
  });
}

/** Which signed-in user has confirmed their location since signing in. Cleared on sign-out (store.clearAuth). */
export const LOCATION_CONFIRMED_KEY = "construction-logistics-location-confirmed";

export function markLocationConfirmed(userId: number): void {
  try {
    localStorage.setItem(LOCATION_CONFIRMED_KEY, String(userId));
  } catch {
    /* storage blocked: the person is asked again next time */
  }
}

export function isLocationConfirmed(userId: number): boolean {
  try {
    return localStorage.getItem(LOCATION_CONFIRMED_KEY) === String(userId);
  } catch {
    return false;
  }
}

const selectCls =
  "h-[54px] w-full cursor-pointer rounded-[12px] border border-[#d1d5db] bg-white px-4 text-[16px] outline-none transition-[border-color,box-shadow] focus:border-brand focus:shadow-[0_0_0_3px_rgba(30,136,229,0.15)]";
const labelCls = "mb-2 block text-[15px] font-medium leading-[1.2] text-[#6b7280]";

/**
 * The detected location (shown as an address) and the floor question, shared by the login form
 * and the "Confirm your location" box. Finds the location as soon as `enabled` is true.
 * If an admin has added offices, the one the person is at is matched silently.
 */
export function useLocationFields(enabled: boolean, note: string) {
  const [floor, setFloor] = useState("");
  /** Matched office (only when an admin has added offices), and the address we're at. */
  const [officeId, setOfficeId] = useState<number | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  const [pos, setPos] = useState<GeolocationPosition | null>(null);
  const [locError, setLocError] = useState("");
  const [locating, setLocating] = useState(false);

  /** Gets the location, then lists offices nearest first and pre-selects the one we're at (if any). */
  const findLocation = useCallback(async (): Promise<GeolocationPosition | null> => {
    setLocating(true);
    setLocError("");
    try {
      const p = await currentPosition();
      setPos(p);
      const near = await nearbyOffices({
        latitude: p.coords.latitude,
        longitude: p.coords.longitude,
        accuracy: p.coords.accuracy,
      }).catch(() => ({ offices: [], suggestedId: null, address: null }));
      const office = near.offices.find((o) => o.id === near.suggestedId);
      setOfficeId(office?.id ?? null);
      setPlace(office?.name ?? near.address);
      return p;
    } catch (err) {
      setLocError(err instanceof Error ? err.message : "Couldn’t find your location.");
      return null;
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void findLocation();
  }, [enabled, findLocation]);

  /** The location to send; finds it again if it isn't known yet. */
  const resolve = useCallback(async (): Promise<SignInLocation> => {
    const at = pos ?? (await findLocation());
    if (!at) throw new Error("Your location is required. Allow location, then try again.");
    return {
      latitude: at.coords.latitude,
      longitude: at.coords.longitude,
      accuracy: at.coords.accuracy,
      officeId,
      floor,
    };
  }, [pos, findLocation, officeId, floor]);

  const fields = (
    <>
      <div>
        <p className={labelCls}>Your location</p>
        <div
          className="flex min-h-[54px] items-center gap-3 rounded-[12px] border border-[#d1d5db] bg-[#f9fafb] px-4 py-2.5 text-[15px] text-[#374151]"
          aria-live="polite"
        >
          <svg className="h-5 w-5 shrink-0 text-ink-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          <span className="min-w-0">
            {locating ? (
              "Finding your most precise location…"
            ) : pos ? (
              <>
                {place ? `You’re near ${place}` : "Location found"}
                <span className="text-[#6b7280]"> (± {distanceLabel(pos.coords.accuracy)})</span>
              </>
            ) : (
              <span className="text-[#6b7280]">Not found yet</span>
            )}
          </span>
        </div>
        {locError ? (
          <p className="mt-2 text-[13.5px] leading-snug text-danger">
            {locError}{" "}
            <button type="button" onClick={() => void findLocation()} className="cursor-pointer font-semibold underline">
              Try again
            </button>
          </p>
        ) : null}
      </div>
      <div>
        <label htmlFor="floor" className={labelCls}>
          Which floor are you on?
        </label>
        <select
          id="floor"
          required
          value={floor}
          onChange={(e) => setFloor(e.target.value)}
          className={`${selectCls} ${floor ? "text-[#374151]" : "text-ink-soft"}`}
        >
          <option value="" disabled>
            Choose a floor
          </option>
          {FLOORS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <p className="mt-2 text-[13.5px] leading-snug text-[#6b7280]">{note}</p>
      </div>
    </>
  );

  return { fields, resolve, locating };
}
