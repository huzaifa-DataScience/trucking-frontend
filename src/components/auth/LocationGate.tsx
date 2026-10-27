"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { post } from "@/lib/api/client";
import { AuthError, AuthSubmit } from "@/components/auth/AuthForm";
import { isLocationConfirmed, markLocationConfirmed, useLocationFields } from "@/components/auth/useLocationFields";

/** Pages reached before or without signing in; never blocked. */
const OPEN_PATHS = ["/login", "/register", "/pending", "/forgot-password", "/reset-password"];

/**
 * Anyone in the app who hasn't confirmed their location since signing in (they came in through
 * sign-up, approval, or an older session) must confirm office and floor before using it.
 */
export function LocationGate() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [confirmed, setConfirmed] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const blocked =
    user?.status === "active" && confirmed === false && !OPEN_PATHS.some((p) => pathname?.startsWith(p));
  const { fields, resolve, locating } = useLocationFields(blocked, "Your location and floor are saved for this sign-in.");

  // localStorage is only readable in the browser, so the check runs after mount.
  useEffect(() => {
    const id = user?.id;
    queueMicrotask(() => setConfirmed(id ? isLocationConfirmed(id) : null));
  }, [user?.id]);

  if (!blocked || !user) return null;

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await post("/auth/sign-in-location", await resolve());
      markLocationConfirmed(user!.id);
      setConfirmed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t save your location");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(17,24,39,0.55)] px-4" role="dialog" aria-modal="true" aria-labelledby="location-gate-title">
      <form onSubmit={confirm} className="flex w-full max-w-[460px] flex-col gap-5 rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div>
          <h2 id="location-gate-title" className="text-[22px] font-semibold text-ink">
            Confirm your location
          </h2>
          <p className="mt-1.5 text-[14.5px] text-[#6b7280]">
            Before you continue, confirm where you are. Your browser will ask to share your location.
          </p>
        </div>
        {error ? <AuthError title={error}>{null}</AuthError> : null}
        {fields}
        <AuthSubmit loading={saving} label="Continue" loadingLabel={locating ? "Finding your location…" : "Saving…"} />
        <button type="button" onClick={logout} className="cursor-pointer text-center text-[14px] font-medium text-ink-muted hover:text-ink hover:underline">
          Sign out instead
        </button>
      </form>
    </div>
  );
}
