import { getBaseUrl } from "@/lib/api/config";
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

export function AvatarCircle({
  user,
  size = "sm",
}: {
  user: AuthUser | null;
  size?: keyof typeof SIZE_CLASSES;
}) {
  const dims = SIZE_CLASSES[size];
  if (user?.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`${getBaseUrl()}${user.avatarUrl}`}
        alt=""
        className={`${dims} shrink-0 rounded-full object-cover ring-2 ring-white/80`}
      />
    );
  }
  return (
    <div
      className={`flex ${dims} shrink-0 items-center justify-center rounded-full font-bold text-white`}
      style={{ background: "linear-gradient(135deg, var(--brand) 0%, var(--brand-secondary) 100%)" }}
      aria-hidden
    >
      {userInitials(user)}
    </div>
  );
}
