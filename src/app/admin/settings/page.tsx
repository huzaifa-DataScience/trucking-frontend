"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/ToastProvider";
import * as adminApi from "@/lib/api/endpoints/admin";
import { ApiError, getApiErrorMessage } from "@/lib/api/client";
import type { OverdueEmailSendingSettings } from "@/lib/admin/types";
import { LogoLoader } from "@/components/ui/LogoLoader";

export default function AdminSettingsPage() {
  const { showToast } = useToast();

  const [overdueSending, setOverdueSending] = useState<OverdueEmailSendingSettings | null>(null);
  const [overdueSendingLoading, setOverdueSendingLoading] = useState(false);
  const [overdueSendingSaving, setOverdueSendingSaving] = useState(false);

  const [smtpTestTo, setSmtpTestTo] = useState("");
  const [smtpTesting, setSmtpTesting] = useState(false);

  const loadOverdueSendingSettings = useCallback(async () => {
    setOverdueSendingLoading(true);
    try {
      const res = await adminApi.getOverdueEmailSendingSettings();
      setOverdueSending(res);
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to load email sending settings"), "error");
      setOverdueSending(null);
    } finally {
      setOverdueSendingLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadOverdueSendingSettings();
  }, [loadOverdueSendingSettings]);

  const handleOverdueAdminToggle = useCallback(
    async (nextEnabled: boolean) => {
      setOverdueSendingSaving(true);
      try {
        await adminApi.patchOverdueEmailSendingSettings(nextEnabled);
        await loadOverdueSendingSettings();
        showToast(
          nextEnabled ? "Email sending enabled (admin toggle)." : "Email sending disabled (admin toggle).",
          "success"
        );
      } catch (e) {
        showToast(getApiErrorMessage(e, "Failed to update email sending setting"), "error");
      } finally {
        setOverdueSendingSaving(false);
      }
    },
    [loadOverdueSendingSettings, showToast]
  );

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
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">Admin controls for email delivery and diagnostics.</p>
      </div>

      <Card>
        <div className="space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Email service</h2>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Automated overdue emails send only when the server env flag and this admin toggle are both on.
            </p>
          </div>

          {overdueSendingLoading ? (
            <div className="flex justify-center py-6">
              <LogoLoader size={28} />
            </div>
          ) : overdueSending ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                    overdueSending.envMasterEnabled
                      ? "bg-green-50 text-green-900 dark:bg-green-950/30 dark:text-green-200"
                      : "bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-200"
                  }`}
                >
                  Env master: {overdueSending.envMasterEnabled ? "on" : "off"}
                </span>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                    overdueSending.adminToggleEnabled
                      ? "bg-green-50 text-green-900 dark:bg-green-950/30 dark:text-green-200"
                      : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                  }`}
                >
                  Admin toggle: {overdueSending.adminToggleEnabled ? "on" : "off"}
                </span>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    overdueSending.effectiveEnabled
                      ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
                      : "bg-brand/8 text-ink dark:bg-brand/10 dark:text-white"
                  }`}
                >
                  Effective sending: {overdueSending.effectiveEnabled ? "yes" : "no"}
                </span>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-2 dark:border-stone-700 dark:bg-stone-900/40">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-stone-300 text-brand focus:ring-brand"
                  checked={overdueSending.adminToggleEnabled}
                  disabled={overdueSendingSaving}
                  onChange={(e) => void handleOverdueAdminToggle(e.target.checked)}
                />
                <span className="text-sm text-stone-800 dark:text-stone-200">Enable automated overdue emails</span>
              </label>
            </div>
          ) : (
            <p className="text-sm text-stone-500 dark:text-stone-400">Could not load email service settings.</p>
          )}
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Demo / test email sender</h2>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Sends a test email using server SMTP environment variables. Does not require overdue cron to be enabled.
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

