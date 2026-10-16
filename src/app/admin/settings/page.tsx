"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
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
import { BiddingLookupsAdmin } from "@/components/admin/BiddingLookupsAdmin";
import { AccountSettingsPanel } from "@/components/settings/AccountSettingsPanel";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/contexts/AuthContext";

const ICONS = {
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z",
  mail: "M3 5h18v14H3zM3 7l9 6 9-6",
  doc: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6",
  pulse: "M3 12h4l3-8 4 16 3-8h4",
  team: "M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6",
  dollar: "M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  layers: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5",
  alert: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  send: "M22 2l-7 20-4-9-9-4z",
} as const;

function NavIcon({ d, className = "h-4 w-4" }: { d: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

type SettingsSection = "profile" | "security" | "email" | "templates" | "diagnostics" | "teams" | "wages" | "burden";

const SETTINGS_NAV: {
  label: string;
  items: { id: SettingsSection; label: string; description: string; icon: string }[];
}[] = [
  {
    label: "Account",
    items: [
      { id: "profile", label: "Profile", description: "Your photo and name.", icon: ICONS.user },
      { id: "security", label: "Password & security", description: "Keep your account safe.", icon: ICONS.lock },
    ],
  },
  {
    label: "Email",
    items: [
      { id: "email", label: "Automations", description: "Scheduled emails the app sends for you.", icon: ICONS.mail },
      { id: "templates", label: "Templates", description: "What the automated emails say.", icon: ICONS.doc },
    ],
  },
  {
    label: "System",
    items: [{ id: "diagnostics", label: "Diagnostics", description: "Check that email delivery works.", icon: ICONS.pulse }],
  },
  {
    label: "Bidding",
    items: [
      { id: "teams", label: "Teams", description: "Bidding crews — captain and assistant estimator on Assignment auto-fill from these.", icon: ICONS.team },
      { id: "wages", label: "Wage rates", description: "Wage lookup used on the Base Bid sheet.", icon: ICONS.dollar },
      { id: "burden", label: "Payroll burden", description: "Lines that roll into the burdened hourly rate on the bid sheet.", icon: ICONS.layers },
    ],
  },
];

const TEMPLATES = [
  {
    purpose: EMAIL_PURPOSE_OVERDUE_LEAD_PM,
    label: "PM overdue",
    summary: "To each lead PM · overdue pay apps",
    description: "Sent to each lead PM with a table of their overdue pay apps.",
  },
  {
    purpose: EMAIL_PURPOSE_CLEARSTORY_GAP,
    label: "Siteline / Clearstory gap",
    summary: "To operations · missing comparisons",
    description: "Sent to operations when Siteline billing exists without a Clearstory comparison.",
  },
];

type AutomationSettings = { envMasterEnabled: boolean; adminToggleEnabled: boolean; effectiveEnabled: boolean };

/** One automated email: a single switch and one plain status instead of env/admin/effective pills. */
function Automation({
  icon,
  tone,
  title,
  description,
  loading,
  settings,
  saving,
  onToggle,
  recipient,
  onOpenTemplate,
  templateLabel,
  action,
}: {
  icon: string;
  tone: "brand" | "violet";
  title: string;
  description: string;
  loading: boolean;
  settings: AutomationSettings | null;
  saving: boolean;
  onToggle: (next: boolean) => void;
  recipient?: string;
  onOpenTemplate: () => void;
  templateLabel: string;
  action?: ReactNode;
}) {
  const on = settings?.adminToggleEnabled ?? false;
  const status = !settings
    ? null
    : settings.effectiveEnabled
      ? { label: "Sending", cls: "bg-[#effaf3] text-success" }
      : !settings.adminToggleEnabled
        ? { label: "Off", cls: "bg-[#f1f2f4] text-ink-muted" }
        : !settings.envMasterEnabled
          ? { label: "Paused by server", cls: "bg-warning-tint text-warning" }
          : { label: "Not sending", cls: "bg-warning-tint text-warning" };

  return (
    <section className="border-b border-[#f0f1f3] px-5 py-4 last:border-b-0">
      <div className="flex items-start gap-3.5">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] ${
            tone === "brand" ? "bg-brand-tint text-brand" : "bg-[#f3e8ff] text-[#7c3aed]"
          }`}
        >
          <NavIcon d={icon} className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
            {status ? (
              <span className={`inline-flex h-[22px] items-center gap-1.5 rounded-full pl-2 pr-[9px] text-[12px] font-medium ${status.cls}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                {status.label}
              </span>
            ) : null}
          </div>
          <p className="text-[13px] text-ink-muted">{description}</p>
        </div>
        {loading ? (
          <Skeleton className="h-[22px] w-[38px] rounded-full" />
        ) : settings ? (
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={title}
            disabled={saving}
            onClick={() => onToggle(!on)}
            className={`relative h-[22px] w-[38px] shrink-0 cursor-pointer rounded-full transition-colors disabled:cursor-wait disabled:opacity-60 ${
              on ? "bg-brand" : "bg-[#d5d9de]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-[left] ${
                on ? "left-[18px]" : "left-0.5"
              }`}
            />
          </button>
        ) : null}
      </div>

      {!loading && !settings ? (
        <p className="ml-[50px] mt-3 text-[12.5px] text-danger">Couldn&apos;t load this setting. Try refreshing the page.</p>
      ) : null}

      {settings && settings.adminToggleEnabled && !settings.envMasterEnabled ? (
        <div className="ml-[50px] mt-3 flex items-start gap-2.5 rounded-[9px] border border-warning-border bg-warning-tint px-3 py-2 text-[12.5px] text-warning">
          <NavIcon d={ICONS.alert} className="mt-px h-[15px] w-[15px] shrink-0" />
          <span>Your switch is on, but email sending is turned off on the server, so nothing is sent. Ask IT to enable it.</span>
        </div>
      ) : null}

      {settings ? (
        <div className="ml-[50px] mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12.5px] text-ink-muted">
          {recipient ? (
            <span>
              Sends to{" "}
              <a href={`mailto:${recipient}`} className="font-medium text-ink hover:text-brand">
                {recipient}
              </a>
            </span>
          ) : null}
          <span>
            Template{" "}
            <button type="button" onClick={onOpenTemplate} className="cursor-pointer font-medium text-brand hover:underline">
              {templateLabel} →
            </button>
          </span>
        </div>
      ) : null}

      {settings && action ? <div className="ml-[50px] mt-3.5">{action}</div> : null}
    </section>
  );
}

export default function AdminSettingsPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [section, setSection] = useState<SettingsSection>("profile");
  const [template, setTemplate] = useState<string>(EMAIL_PURPOSE_OVERDUE_LEAD_PM);

  const [overdueSending, setOverdueSending] = useState<OverdueEmailSendingSettings | null>(null);
  const [overdueSendingLoading, setOverdueSendingLoading] = useState(false);
  const [overdueSendingSaving, setOverdueSendingSaving] = useState(false);

  const [gapAlert, setGapAlert] = useState<SitelineClearstoryGapAlertSettings | null>(null);
  const [gapAlertLoading, setGapAlertLoading] = useState(false);
  const [gapAlertSaving, setGapAlertSaving] = useState(false);
  const [gapJobRunning, setGapJobRunning] = useState(false);

  const [smtpTestTo, setSmtpTestTo] = useState(() => user?.email ?? "");
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

  const automationsOn = [overdueSending?.adminToggleEnabled, gapAlert?.adminToggleEnabled].filter(Boolean).length;
  const current = SETTINGS_NAV.flatMap((g) => g.items).find((i) => i.id === section) ?? SETTINGS_NAV[0].items[0];

  return (
    <div className="w-full">
      <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Settings</h1>
      <p className="mt-0.5 text-[13px] text-ink-muted">Manage your account, email automations and bidding setup.</p>

      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        {/* Section menu */}
        <nav aria-label="Settings sections" className="lg:sticky lg:top-20">
          {SETTINGS_NAV.map((group, gi) => (
            <div key={group.label} className={gi ? "mt-4" : ""}>
              <p className="mx-2.5 mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-soft">{group.label}</p>
              <ul className="flex flex-wrap gap-1 lg:flex-col lg:gap-0.5">
                {group.items.map((item) => {
                  const on = item.id === section;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        aria-current={on ? "page" : undefined}
                        onClick={() => setSection(item.id)}
                        className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-[7px] text-left text-[13.5px] font-medium transition-colors ${
                          on
                            ? "border-[var(--border-subtle)] bg-white text-ink shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
                            : "border-transparent text-ink-muted hover:bg-white/70 hover:text-ink"
                        }`}
                      >
                        <span className={on ? "text-brand" : "text-ink-soft"}>
                          <NavIcon d={item.icon} />
                        </span>
                        {item.label}
                        {item.id === "email" && overdueSending && gapAlert ? (
                          <span
                            className={`ml-auto rounded-full px-[7px] py-px text-[11px] font-semibold ${
                              automationsOn ? "bg-[#effaf3] text-success" : "bg-[#f1f2f4] text-ink-muted"
                            }`}
                          >
                            {automationsOn} on
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Section content */}
        <div className="min-w-0">
          <div className="mb-3">
            <h2 className="text-[17px] font-semibold text-ink">{current.label}</h2>
            <p className="text-[13px] text-ink-muted">{current.description}</p>
          </div>

          {section === "profile" ? <AccountSettingsPanel section="profile" layout="settings" /> : null}
          {section === "security" ? <AccountSettingsPanel section="security" layout="settings" /> : null}

          {section === "email" ? (
            <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <Automation
                icon={ICONS.mail}
                tone="brand"
                title="Overdue pay-app emails to lead PMs"
                description="Each project manager gets a table of their overdue pay apps from Siteline."
                loading={overdueSendingLoading}
                settings={overdueSending}
                saving={overdueSendingSaving}
                onToggle={(next) => void handleOverdueAdminToggle(next)}
                onOpenTemplate={() => {
                  setTemplate(EMAIL_PURPOSE_OVERDUE_LEAD_PM);
                  setSection("templates");
                }}
                templateLabel="PM overdue"
              />
              <Automation
                icon={ICONS.alert}
                tone="violet"
                title="Siteline / Clearstory gap alerts"
                description="Emails operations when Siteline has billing but Clearstory has no project to compare."
                loading={gapAlertLoading}
                settings={gapAlert}
                saving={gapAlertSaving}
                onToggle={(next) => void handleGapAlertToggle(next)}
                recipient={gapAlert?.recipientTo}
                onOpenTemplate={() => {
                  setTemplate(EMAIL_PURPOSE_CLEARSTORY_GAP);
                  setSection("templates");
                }}
                templateLabel="Siteline / Clearstory gap"
                action={
                  <button
                    type="button"
                    onClick={() => void handleRunGapJob()}
                    disabled={gapJobRunning}
                    className="inline-flex h-[30px] cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-white px-3 text-[12.5px] font-medium text-ink transition hover:bg-[#f9fafb] disabled:cursor-wait disabled:opacity-60"
                  >
                    {gapJobRunning ? (
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
                    ) : (
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M7 5v14l11-7z" />
                      </svg>
                    )}
                    {gapJobRunning ? "Running…" : "Run now"}
                  </button>
                }
              />
            </div>
          ) : null}

          {section === "templates" ? (
            <div className="grid overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] md:grid-cols-[220px_minmax(0,1fr)]">
              <ul className="flex gap-1 border-b border-[var(--border-subtle)] bg-[#fafbfc] p-2.5 md:flex-col md:border-b-0 md:border-r">
                {TEMPLATES.map((t) => {
                  const on = t.purpose === template;
                  return (
                    <li key={t.purpose}>
                      <button
                        type="button"
                        aria-current={on ? "true" : undefined}
                        onClick={() => setTemplate(t.purpose)}
                        className={`w-full cursor-pointer rounded-[9px] px-3 py-2.5 text-left transition-colors ${
                          on ? "bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]" : "hover:bg-white/70"
                        }`}
                      >
                        <span className={`block text-[13.5px] font-semibold ${on ? "text-brand-secondary" : "text-ink"}`}>
                          {t.label}
                        </span>
                        <span className="block text-[12px] text-ink-muted">{t.summary}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="min-w-0 p-4">
                {TEMPLATES.filter((t) => t.purpose === template).map((t) => (
                  <EmailTemplateEditor key={t.purpose} purpose={t.purpose} title={t.label} description={t.description} />
                ))}
              </div>
            </div>
          ) : null}

          {section === "diagnostics" ? (
            <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <section className="grid md:grid-cols-[220px_minmax(0,1fr)]">
                <div className="border-b border-[var(--border-subtle)] bg-[#fafbfc] px-5 py-4 md:border-b-0 md:border-r">
                  <h3 className="text-[14px] font-semibold text-ink">Send a test email</h3>
                  <p className="mt-[3px] text-[12.5px] text-ink-muted">
                    Checks the email server works. Doesn&apos;t need the automations to be on.
                  </p>
                </div>
                <form
                  className="flex max-w-[560px] flex-col gap-2 self-center px-5 py-4 sm:flex-row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSmtpTestSend();
                  }}
                >
                  <label className="sr-only" htmlFor="smtpTestTo">
                    Send test email to
                  </label>
                  <input
                    id="smtpTestTo"
                    type="email"
                    autoComplete="email"
                    value={smtpTestTo}
                    onChange={(e) => setSmtpTestTo(e.target.value)}
                    placeholder="you@company.com"
                    className="h-9 min-w-0 flex-1 rounded-lg border border-[var(--border-subtle)] bg-white px-3 text-[13.5px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                  />
                  <button
                    type="submit"
                    disabled={smtpTesting}
                    className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-medium text-white transition hover:bg-brand-secondary disabled:cursor-wait disabled:opacity-60"
                  >
                    {smtpTesting ? (
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
                    ) : (
                      <NavIcon d={ICONS.send} className="h-3.5 w-3.5" />
                    )}
                    {smtpTesting ? "Sending…" : "Send test"}
                  </button>
                </form>
              </section>
            </div>
          ) : null}

          {section === "teams" ? <BiddingLookupsAdmin section="teams" /> : null}
          {section === "wages" ? <BiddingLookupsAdmin section="wages" /> : null}
          {section === "burden" ? <BiddingLookupsAdmin section="burden" /> : null}
        </div>
      </div>
    </div>
  );
}
