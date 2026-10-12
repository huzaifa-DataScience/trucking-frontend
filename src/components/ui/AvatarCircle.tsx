"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { getApiUrl } from "@/lib/api/config";
import { getAccessToken } from "@/lib/auth/store";
import type { AuthUser } from "@/lib/auth/types";

export function userInitials(user: AuthUser | null): string {
  if (!user) return "?";
  const f = user.firstName?.[0];
  const l = user.lastName?.[0];
  if (f && l) return `${f}${l}`.toUpperCase();
  const parts = user.displayName?.split(/\s+/).filter(Boolean) ?? [];
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
  return user.email.slice(0, 2).toUpperCase();
}

const SIZE_CLASSES = {
  sm: "h-9 w-9 text-[11px] sm:h-10 sm:w-10 sm:text-xs",
  lg: "h-14 w-14 text-base",
  xl: "h-24 w-24 text-2xl",
} as const;

/** Bumps when photo changes so every AvatarCircle reloads even if path is unchanged. */
let avatarRevision = 0;
const avatarListeners = new Set<() => void>();

/** Instant local preview after pick/upload — beats stale server/HTTP cache. */
let localPreview: { userId: number; url: string } | null = null;

function subscribeAvatarRevision(onStoreChange: () => void) {
  avatarListeners.add(onStoreChange);
  return () => {
    avatarListeners.delete(onStoreChange);
  };
}

function getAvatarRevision() {
  return avatarRevision;
}

function bumpAvatarRevision() {
  avatarRevision += 1;
  for (const listener of avatarListeners) listener();
}

/** Call after upload/delete so the same `/auth/avatar/:id` path reloads fresh bytes. */
export function invalidateAvatarCache(_avatarUrl?: string | null) {
  bumpAvatarRevision();
}

/** Show this file immediately in every AvatarCircle for this user (upload). Pass null to clear. */
export function setAvatarLocalPreview(userId: number, file: File | null) {
  if (localPreview?.url.startsWith("blob:")) {
    URL.revokeObjectURL(localPreview.url);
  }
  localPreview =
    file && userId > 0
      ? { userId, url: URL.createObjectURL(file) }
      : null;
  bumpAvatarRevision();
}

/** Clear preview (e.g. after remove photo). */
export function clearAvatarLocalPreview() {
  if (localPreview?.url.startsWith("blob:")) {
    URL.revokeObjectURL(localPreview.url);
  }
  localPreview = null;
  bumpAvatarRevision();
}

/** Always bypass HTTP cache — same path gets new bytes after upload/replace. */
async function fetchAvatarObjectUrl(avatarUrl: string, revision: number): Promise<string> {
  if (/^https?:\/\//i.test(avatarUrl)) {
    const sep = avatarUrl.includes("?") ? "&" : "?";
    return `${avatarUrl}${sep}v=${revision}`;
  }
  const token = getAccessToken();
  const url = getApiUrl(avatarUrl, { v: `${revision}-${Date.now()}` });
  const response = await fetch(url, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(response.statusText || "Avatar fetch failed");
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

function AvatarLightbox({
  src,
  name,
  onClose,
}: {
  src: string;
  name: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal
      aria-label={name}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-ink/55 backdrop-blur-sm"
        aria-label="Close preview"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col items-center gap-3">
        <div className="flex w-full items-center justify-between gap-3 text-white">
          <p className="truncate text-sm font-medium">{name}</p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
            aria-label="Close"
            title="Close"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={name}
          className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl ring-1 ring-white/20"
        />
      </div>
    </div>,
    document.body
  );
}

export function AvatarCircle({
  user,
  size = "sm",
  className = "",
  /** When true (default), clicking a photo opens a large preview. */
  previewable = true,
}: {
  user: AuthUser | null;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
  previewable?: boolean;
}) {
  const dims = SIZE_CLASSES[size];
  const revision = useSyncExternalStore(
    subscribeAvatarRevision,
    getAvatarRevision,
    getAvatarRevision
  );
  const previewUrl =
    user && localPreview && localPreview.userId === user.id ? localPreview.url : null;
  const [src, setSrc] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const reqIdRef = useRef(0);
  const srcRef = useRef<string | null>(null);

  useEffect(() => {
    // Local file preview wins — don't fight it with a stale server fetch.
    if (previewUrl) {
      setImgFailed(false);
      setSrc(null);
      return;
    }

    const reqId = ++reqIdRef.current;
    setImgFailed(false);

    const prev = srcRef.current;
    srcRef.current = null;
    setSrc(null);
    if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);

    const path = user?.avatarUrl?.trim();
    if (!path) return;

    let cancelled = false;

    void fetchAvatarObjectUrl(path, revision)
      .then((url) => {
        if (cancelled || reqId !== reqIdRef.current) {
          if (url.startsWith("blob:")) URL.revokeObjectURL(url);
          return;
        }
        // Preview may have been set while we were fetching — don't clobber it.
        if (localPreview && user && localPreview.userId === user.id) {
          if (url.startsWith("blob:")) URL.revokeObjectURL(url);
          return;
        }
        srcRef.current = url;
        setSrc(url);
      })
      .catch(() => {
        if (cancelled || reqId !== reqIdRef.current) return;
        setImgFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.avatarUrl, user?.id, revision, previewUrl]);

  useEffect(() => {
    return () => {
      if (srcRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(srcRef.current);
        srcRef.current = null;
      }
    };
  }, []);

  const displaySrc = previewUrl || (user?.avatarUrl && src && !imgFailed ? src : null);
  const displayName =
    user?.displayName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Profile photo";

  if (displaySrc) {
    const img = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={previewUrl ? `preview-${revision}` : `${user?.avatarUrl}-${revision}`}
        src={displaySrc}
        alt={displayName}
        className={`${dims} shrink-0 rounded-full object-cover ring-2 ring-white/80 ${className} ${
          previewable ? "cursor-pointer" : ""
        }`}
        onError={() => {
          if (!previewUrl) setImgFailed(true);
        }}
      />
    );

    return (
      <>
        {previewable ? (
          <button
            type="button"
            className="shrink-0 rounded-full p-0"
            title="View photo"
            aria-label={`View photo — ${displayName}`}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setLightboxOpen(true);
            }}
          >
            {img}
          </button>
        ) : (
          img
        )}
        {lightboxOpen
          ? (
              <AvatarLightbox
                src={displaySrc}
                name={displayName}
                onClose={() => setLightboxOpen(false)}
              />
            )
          : null}
      </>
    );
  }

  return (
    <div
      className={`flex ${dims} shrink-0 items-center justify-center rounded-full font-bold text-white ${className}`}
      style={{ background: "linear-gradient(135deg, var(--brand) 0%, var(--brand-secondary) 100%)" }}
      aria-hidden
    >
      {userInitials(user)}
    </div>
  );
}
