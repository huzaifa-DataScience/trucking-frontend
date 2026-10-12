"use client";

import { PageHeader } from "@/components/dashboard/PageHeader";
import { AccountSettingsPanel } from "@/components/settings/AccountSettingsPanel";
import { useAuth } from "@/contexts/AuthContext";

export default function AccountPage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader title="Account" subtitle="Manage your profile photo and password." />
      <AccountSettingsPanel />
    </div>
  );
}
