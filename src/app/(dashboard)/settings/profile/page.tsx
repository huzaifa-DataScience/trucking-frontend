"use client";

import Link from "next/link";
import { AccountSettingsPanel } from "@/components/settings/AccountSettingsPanel";
import { useAuth } from "@/contexts/AuthContext";

/** My Profile — banner header with Profile / Security tabs (was split with /account). */
export default function SettingsProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="flex w-full flex-col gap-3">
      <nav aria-label="Breadcrumb" className="text-[12px] text-ink-muted">
        <Link href="/settings/profile" className="hover:text-ink">
          Settings
        </Link>
        <span className="mx-1 text-ink-soft">/</span>
        <span className="font-medium text-ink">My Profile</span>
      </nav>
      {/* Company of the signed-in user, not the Company filter in the header. */}
      <AccountSettingsPanel layout="tabs" company={user.company?.trim() || null} />
    </div>
  );
}
