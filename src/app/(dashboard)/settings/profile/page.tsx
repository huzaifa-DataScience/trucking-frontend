"use client";

import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { buttonClasses } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { roleLabel } from "@/lib/auth/roles";

function Field({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="cs-form-label">{label}</p>
      <p className="cs-form-value mt-1">{value || "—"}</p>
    </div>
  );
}

export default function SettingsProfilePage() {
  const { user } = useAuth();
  const { company } = useCompany();

  if (!user) return null;

  const displayName =
    user.displayName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <PageHeader
        title="My Profile"
        breadcrumbs={[
          { label: "Settings", href: "/settings/profile" },
          { label: "My Profile" },
        ]}
      />

      <div className="cs-content-panel px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="cs-section-title">Details</h2>
          <button type="button" className={buttonClasses("secondary", "sm")} disabled title="Coming soon">
            Edit
          </button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-4">
          <Field label="First Name" value={user.firstName?.trim() || displayName.split(/\s+/)[0] || ""} />
          <Field label="Last Name" value={user.lastName?.trim() || displayName.split(/\s+/).slice(1).join(" ") || ""} />
          <Field label="Company" value={company?.name ?? "—"} />
          <Field label="Role" value={roleLabel(user.role)} />
        </div>

        <hr className="cs-section-divider" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="cs-section-title">Account Access</h2>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-4">
          <Field label="Email" value={user.email} />
          <div className="min-w-0 sm:col-span-2">
            <p className="cs-form-label">Password</p>
            <p className="cs-form-value mt-1">••••••••</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/account" className={buttonClasses("secondary", "sm")}>
                Change Email
              </Link>
            </div>
          </div>
        </div>

        <hr className="cs-section-divider" />

        <p className="cs-helper">
          Estimating crew and seat assignments live on{" "}
          <Link href="/settings/my-team" className="font-medium text-ink underline underline-offset-2">
            My team
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
