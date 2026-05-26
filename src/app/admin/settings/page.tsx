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
import { LogoLoader } from "@/components/ui/LogoLoader";

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
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
          envOn
            ? "bg-green-50 text-green-900 dark:bg-green-950/30 dark:text-green-200"
            : "bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-200"
        }`}
      >
        Env master: {envOn ? "on" : "off"}
      </span>
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
          adminOn
            ? "bg-green-50 text-green-900 dark:bg-green-950/30 dark:text-green-200"
            : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
        }`}
      >
        Admin toggle: {adminOn ? "on" : "off"}
      </span>
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
          effective
            ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
            : "bg-brand/8 text-ink dark:bg-brand/10 dark:text-white"
        }`}
      >
        Effective sending: {effective ? "yes" : "no"}
      </span>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { showToast } = useToast();

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
          Siteline PM overdue mail, Siteline ↔ Clearstory gap alerts, and SMTP diagnostics.
        </p>
      </div>

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
    </div>
  );
}
