"use client";

import { useEffect, useState } from "react";
import type { WorkforceUserSummary } from "@/lib/workforce/types";
import { userInitials } from "@/lib/workforce/display";

export function UserAvatar({
  user,
  size = 32,
}: {
  user?: WorkforceUserSummary | null;
  size?: number;
}) {
  const initials = userInitials(user);
  const src = user?.profilePictureUrl;
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  if (src && !imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover ring-1 ring-ink/10"
        style={{ width: size, height: size }}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-brand/15 text-[10px] font-bold text-brand ring-1 ring-brand/20"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
