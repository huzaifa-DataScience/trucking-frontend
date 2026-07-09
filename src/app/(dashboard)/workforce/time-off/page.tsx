"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { WorkforceGate } from "@/components/workforce/WorkforceGate";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { LogoLoader } from "@/components/ui/LogoLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useWorkforce } from "@/contexts/WorkforceContext";
import { useAuth } from "@/contexts/AuthContext";
import * as connecteamApi from "@/lib/api/endpoints/connecteam";
import { getApiErrorMessage } from "@/lib/api/client";
import type { TimeOffRequest, TimeOffStatus } from "@/lib/workforce/types";
import { DEFAULT_TIMEZONE } from "@/lib/workforce/format";

function statusTone(s: TimeOffStatus): "warning" | "success" | "danger" {
  if (s === "approved") return "success";
  if (s === "denied") return "danger";
  return "warning";
}

export default function WorkforceTimeOffPage() {
  const { syncSubtitle, me } = useWorkforce();
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [tab, setTab] = useState<"mine" | "team">("mine");
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await connecteamApi.listTimeOff({
        userId: tab === "mine" ? me?.connecteamUser?.userId : undefined,
        status: tab === "team" && isAdmin ? "pending" : undefined,
        pageSize: 50,
      });
      setRequests(res.requests ?? []);
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to load time off"), "error");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [tab, me?.connecteamUser?.userId, isAdmin, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = me?.connecteamUser?.userId;
    if (!uid || !startDate || !endDate) return;
    setSubmitting(true);
    try {
      await connecteamApi.createTimeOff({
        userId: uid,
        startDate,
        endDate,
        isAllDay: true,
        employeeNote: note.trim() || undefined,
        timezone: DEFAULT_TIMEZONE,
      });
      showToast("Time off request submitted.", "success");
      setStartDate("");
      setEndDate("");
      setNote("");
      await load();
    } catch (err) {
      showToast(getApiErrorMessage(err, "Request failed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatus = async (requestId: number, status: "approved" | "denied") => {
    try {
      await connecteamApi.patchTimeOffStatus(requestId, { status });
      showToast(`Request ${status}.`, "success");
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e, "Update failed"), "error");
    }
  };

  return (
    <WorkforceGate requireLinked={tab === "mine"}>
      <div className="flex min-h-0 flex-1 flex-col gap-6 ui-animate-in">
        <PageHeader title="Time off" subtitle={syncSubtitle} />

        <div className="flex gap-1 rounded-xl border border-ink/[0.08] bg-surface p-1 w-fit">
          <button
            type="button"
            onClick={() => setTab("mine")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === "mine" ? "bg-ink text-white" : "text-ink/55 hover:bg-ink/[0.04]"
            }`}
          >
            My requests
          </button>
          {isAdmin ? (
            <button
              type="button"
              onClick={() => setTab("team")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === "team" ? "bg-ink text-white" : "text-ink/55 hover:bg-ink/[0.04]"
              }`}
            >
              Pending approvals
            </button>
          ) : null}
        </div>

        {tab === "mine" ? (
          <Card className="max-w-lg p-6">
            <CardHeader title="Request time off" />
            <form onSubmit={(e) => void handleRequest(e)} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="start" className="text-xs font-medium text-ink/45">
                    Start
                  </label>
                  <input
                    id="start"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-ink/10 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="end" className="text-xs font-medium text-ink/45">
                    End
                  </label>
                  <input
                    id="end"
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-ink/10 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="note" className="text-xs font-medium text-ink/45">
                  Note
                </label>
                <input
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Vacation, appointment…"
                  className="mt-1 w-full rounded-xl border border-ink/10 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit request"}
              </button>
            </form>
          </Card>
        ) : null}

        <Card>
          <CardHeader title={tab === "team" ? "Pending requests" : "My time off"} />
          {loading ? (
            <div className="flex justify-center py-12">
              <LogoLoader />
            </div>
          ) : requests.length === 0 ? (
            <p className="text-sm text-ink/45">No requests.</p>
          ) : (
            <ul className="space-y-2">
              {requests.map((r) => (
                <li
                  key={r.requestId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/[0.06] px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-ink">
                      User #{r.userId} · {r.startDate} → {r.endDate}
                    </p>
                    {r.employeeNote ? (
                      <p className="mt-0.5 text-xs text-ink/45">{r.employeeNote}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill tone={statusTone(r.status)} label={r.status} />
                    {isAdmin && tab === "team" && r.status === "pending" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleStatus(r.requestId, "approved")}
                          className="rounded-lg border border-success-border bg-success-tint px-2 py-1 text-xs font-semibold text-success"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleStatus(r.requestId, "denied")}
                          className="rounded-lg border border-danger-border bg-danger-tint px-2 py-1 text-xs font-semibold text-danger"
                        >
                          Deny
                        </button>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </WorkforceGate>
  );
}
