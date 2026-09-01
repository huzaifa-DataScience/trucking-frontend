"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/ToastProvider";
import * as adminApi from "@/lib/api/endpoints/admin";
import { ApiError, getApiErrorMessage } from "@/lib/api/client";
import type {
  OverdueEmailSendingSettings,
  SitelineClearstoryGapAlertSettings,
} from "@/lib/admin/types";
import {
  EMAIL_PURPOSE_CLEARSTORY_GAP,
  EMAIL_PURPOSE_OVERDUE_LEAD_PM,
} from "@/lib/admin/types";
import { EmailTemplateEditor } from "@/components/admin/EmailTemplateEditor";
import { AccessControlSettings } from "@/components/admin/AccessControlSettings";
import { BiddingLookupsAdmin } from "@/components/admin/BiddingLookupsAdmin";
import { LogoLoader } from "@/components/ui/LogoLoader";
import { StatusPill } from "@/components/ui/StatusPill";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/permissions";

function StatusPills({
  envOn,
  adminOn,
  effective,
}: {
  envOn: boolean;
  adminOn: boolean;
  effective: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <StatusPill tone={envOn ? "success" : "danger"} label={`Env master: ${envOn ? "on" : "off"}`} />
      <StatusPill
        tone={adminOn ? "success" : "neutral"}
        label={`Admin toggle: ${adminOn ? "on" : "off"}`}
      />
      <StatusPill
        tone={effective ? "success" : "neutral"}
        label={`Effective sending: ${effective ? "yes" : "no"}`}
      />
    </div>
  );
}

type SettingsTab = "access" | "email" | "templates" | "diagnostics";

const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: "access", label: "Access control" },
  { id: "email", label: "Email & jobs" },
  { id: "templates", label: "Templates" },
  { id: "diagnostics", label: "Diagnostics" },
];

export default function AdminSettingsPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const canSeeAccess =
    can(user, PERMISSIONS.adminRbac) || user?.role === "super_admin";
  const [tab, setTab] = useState<SettingsTab>("access");
  const activeTab: SettingsTab =
    tab === "access" && !canSeeAccess ? "email" : tab;

  const [overdueSending, setOverdueSending] = useState<OverdueEmailSendingSettings | null>(null);
  const [overdueSendingLoading, setOverdueSendingLoading] = useState(false);
  const [overdueSendingSaving, setOverdueSendingSaving] = useState(false);

  const [gapAlert, setGapAlert] = useState<SitelineClearstoryGapAlertSettings | null>(null);
  const [gapAlertLoading, setGapAlertLoading] = useState(false);
  const [gapAlertSaving, setGapAlertSaving] = useState(false);
  const [gapJobRunning, setGapJobRunning] = useState(false);

  const [smtpTestTo, setSmtpTestTo] = useState("joannabelle.salalila@Goelservices.com");
  const [smtpTesting, setSmtpTesting] = useState(false);

  const loadOverdueSendingSettings = useCallback(async () => {
    setOverdueSendingLoading(true);
    try {
      const res = await adminApi.getOverdueEmailSendingSettings();
      setOverdueSending(res);
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to load overdue email settings"), "error");
      setOverdueSending(null);
    } finally {
      setOverdueSendingLoading(false);
    }
  }, [showToast]);

  const loadGapAlertSettings = useCallback(async () => {
    setGapAlertLoading(true);
    try {
      const res = await adminApi.getSitelineClearstoryGapAlertSettings();
      setGapAlert(res);
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to load gap alert settings"), "error");
      setGapAlert(null);
    } finally {
      setGapAlertLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadOverdueSendingSettings();
    void loadGapAlertSettings();
  }, [loadOverdueSendingSettings, loadGapAlertSettings]);

  const handleOverdueAdminToggle = useCallback(
    async (nextEnabled: boolean) => {
      setOverdueSendingSaving(true);
      try {
        await adminApi.patchOverdueEmailSendingSettings(nextEnabled);
        await loadOverdueSendingSettings();
        showToast(
          nextEnabled ? "PM overdue emails enabled." : "PM overdue emails disabled.",
          "success"
        );
      } catch (e) {
        showToast(getApiErrorMessage(e, "Failed to update overdue email setting"), "error");
      } finally {
        setOverdueSendingSaving(false);
      }
    },
    [loadOverdueSendingSettings, showToast]
  );

  const handleGapAlertToggle = useCallback(
    async (nextEnabled: boolean) => {
      setGapAlertSaving(true);
      try {
        await adminApi.patchSitelineClearstoryGapAlertSettings(nextEnabled);
        await loadGapAlertSettings();
        showToast(
          nextEnabled ? "Clearstory gap alerts enabled." : "Clearstory gap alerts disabled.",
          "success"
        );
      } catch (e) {
        showToast(getApiErrorMessage(e, "Failed to update gap alert setting"), "error");
      } finally {
        setGapAlertSaving(false);
      }
    },
    [loadGapAlertSettings, showToast]
  );

  const handleRunGapJob = useCallback(async () => {
    setGapJobRunning(true);
    try {
      const res = await adminApi.postRunSitelineClearstoryGapAlertJob();
      showToast(
        res.message ||
          (res.ok
            ? `Gap alert job completed (${res.gapCount ?? 0} gap(s)).`
            : "Gap alert job finished."),
        res.ok ? "success" : "info"
      );
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to run gap alert job"), "error");
    } finally {
      setGapJobRunning(false);
    }
  }, [showToast]);

  const handleSmtpTestSend = useCallback(async () => {
    const to = smtpTestTo.trim();
    if (!to) {
      showToast("Enter a recipient email address.", "error");
      return;
    }
    setSmtpTesting(true);
    try {
      const res = await adminApi.postSmtpTestEmail(to);
      showToast(res.message || (res.ok ? "Test email sent." : "Request completed."), res.ok ? "success" : "info");
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && e.details && typeof e.details === "object" && e.details !== null) {
        const missing = (e.details as { missing?: unknown }).missing;
        if (Array.isArray(missing) && missing.length > 0) {
          showToast(`SMTP not configured: missing ${missing.join(", ")}`, "error");
          return;
        }
      }
      showToast(getApiErrorMessage(e, "Failed to send test email"), "error");
    } finally {
      setSmtpTesting(false);
    }
  }, [showToast, smtpTestTo]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">Settings</h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Bidding access, Siteline PM overdue mail, Siteline ↔ Clearstory gap alerts, and SMTP
          diagnostics.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Settings sections"
        className="flex flex-wrap gap-1 rounded-xl border border-ink/[0.08] bg-surface p-1"
      >
        {SETTINGS_TABS.filter((t) => t.id !== "access" || canSeeAccess).map(
          (t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              activeTab === t.id
                ? "bg-ink text-white"
                : "text-ink/55 hover:bg-ink/[0.04] hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "access" && canSeeAccess && (
        <>
          <AccessControlSettings />
          <BiddingLookupsAdmin />
        </>
      )}

      {activeTab === "email" && (
      <Card>
        <div className="space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Lead PM overdue emails
            </h2>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Sends grouped overdue pay-app tables to each project manager&apos;s email from Siteline sync data.
            </p>
          </div>

          {overdueSendingLoading ? (
            <div className="flex justify-center py-6">
              <LogoLoader size={28} />
            </div>
          ) : overdueSending ? (
            <div className="space-y-4">
              <StatusPills
                envOn={overdueSending.envMasterEnabled}
                adminOn={overdueSending.adminToggleEnabled}
                effective={overdueSending.effectiveEnabled}
              />
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-2 dark:border-stone-700 dark:bg-stone-900/40">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-stone-300 text-brand focus:ring-brand"
                  checked={overdueSending.adminToggleEnabled}
                  disabled={overdueSendingSaving}
                  onChange={(e) => void handleOverdueAdminToggle(e.target.checked)}
                />
                <span className="text-sm text-stone-800 dark:text-stone-200">
                  Enable automated overdue emails to lead PMs
                </span>
              </label>
            </div>
          ) : (
            <p className="text-sm text-stone-500">Could not load overdue email settings (backend may not expose endpoint yet).</p>
          )}
        </div>
      </Card>
      )}

      {activeTab === "email" && (
      <Card>
        <div className="space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Siteline / Clearstory gap alerts
            </h2>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              When Siteline has billing or overdue data but Clearstory has no project to compare, email operations
              (default: joannabelle.salalila@Goelservices.com).
            </p>
          </div>

          {gapAlertLoading ? (
            <div className="flex justify-center py-6">
              <LogoLoader size={28} />
            </div>
          ) : gapAlert ? (
            <div className="space-y-4">
              <StatusPills
                envOn={gapAlert.envMasterEnabled}
                adminOn={gapAlert.adminToggleEnabled}
                effective={gapAlert.effectiveEnabled}
              />
              <p className="text-sm text-stone-700 dark:text-stone-300">
                Recipient:{" "}
                <a href={`mailto:${gapAlert.recipientTo}`} className="font-medium text-brand hover:underline">
                  {gapAlert.recipientTo}
                </a>
              </p>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-2 dark:border-stone-700 dark:bg-stone-900/40">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-stone-300 text-brand focus:ring-brand"
                  checked={gapAlert.adminToggleEnabled}
                  disabled={gapAlertSaving}
                  onChange={(e) => void handleGapAlertToggle(e.target.checked)}
                />
                <span className="text-sm text-stone-800 dark:text-stone-200">
                  Enable Siteline / Clearstory gap alert emails
                </span>
              </label>
              <button
                type="button"
                onClick={() => void handleRunGapJob()}
                disabled={gapJobRunning}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200"
              >
                {gapJobRunning ? "Running…" : "Run gap alert job now"}
              </button>
            </div>
          ) : (
            <p className="text-sm text-stone-500">
              Could not load gap alert settings. Implement{" "}
              <code className="text-xs">GET /admin/settings/siteline-clearstory-gap-alert</code> on the backend.
            </p>
          )}
        </div>
      </Card>
      )}

      {activeTab === "templates" && (
        <>
          <Card>
            <EmailTemplateEditor
              purpose={EMAIL_PURPOSE_OVERDUE_LEAD_PM}
              title="Template: PM overdue"
              description="Email sent to each lead PM with an HTML table of overdue pay apps."
            />
          </Card>

          <Card>
            <EmailTemplateEditor
              purpose={EMAIL_PURPOSE_CLEARSTORY_GAP}
              title="Template: Siteline / Clearstory gap"
              description="Email sent to operations when Siteline billing exists without a Clearstory comparison."
            />
          </Card>
        </>
      )}

      {activeTab === "diagnostics" && (
      <Card>
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">SMTP test</h2>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Verify server SMTP configuration. Does not require cron jobs to be enabled.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="smtpTestTo" className="block text-xs font-medium text-stone-500 dark:text-stone-400">
                Send test email to
              </label>
              <input
                id="smtpTestTo"
                type="email"
                autoComplete="email"
                value={smtpTestTo}
                onChange={(e) => setSmtpTestTo(e.target.value)}
                placeholder="you@company.com"
                className="mt-1 w-full max-w-md rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleSmtpTestSend()}
              disabled={smtpTesting}
              className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-900 disabled:opacity-50 dark:bg-stone-200 dark:text-stone-900 dark:hover:bg-white"
            >
              {smtpTesting ? "Sending…" : "Send test email"}
            </button>
          </div>
        </div>
      </Card>
      )}
    </div>
  );
}
