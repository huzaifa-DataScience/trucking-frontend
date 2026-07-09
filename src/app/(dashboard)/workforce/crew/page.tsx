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
import type { ConnecteamUser } from "@/lib/workforce/types";
import { connecteamUserName } from "@/lib/workforce/format";

export default function WorkforceCrewPage() {
  const { syncSubtitle } = useWorkforce();
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<ConnecteamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkingId, setLinkingId] = useState<number | null>(null);
  const [appUserIdInput, setAppUserIdInput] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await connecteamApi.listConnecteamUsers({
        search: search.trim() || undefined,
        pageSize: 50,
      });
      setUsers(res.users);
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to load crew"), "error");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [search, showToast]);

  useEffect(() => {
    const t = setTimeout(() => void load(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const handleLink = async (connecteamUserId: number) => {
    const appUserId = Number(appUserIdInput);
    if (!appUserId || Number.isNaN(appUserId)) {
      showToast("Enter a valid portal user ID.", "error");
      return;
    }
    setLinkingId(connecteamUserId);
    try {
      await connecteamApi.linkConnecteamUser(connecteamUserId, { appUserId });
      showToast("User linked.", "success");
      setLinkingId(null);
      setAppUserIdInput("");
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e, "Link failed"), "error");
    } finally {
      setLinkingId(null);
    }
  };

  return (
    <WorkforceGate>
      <div className="flex min-h-0 flex-1 flex-col gap-6 ui-animate-in">
        <PageHeader
          title="Crew"
          subtitle={`${syncSubtitle} · Roster mirror${isAdmin ? " · link portal accounts" : ""}`}
        />

        <input
          type="search"
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md rounded-xl border border-ink/10 bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />

        <Card>
          <CardHeader title="Roster" subtitle={`${users.length} shown`} />
          {loading ? (
            <div className="flex justify-center py-12">
              <LogoLoader />
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-ink/45">No crew members match your search.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-left text-xs text-ink/45">
                    <th className="py-2 pr-3 font-medium">Name</th>
                    <th className="py-2 pr-3 font-medium">Email</th>
                    <th className="py-2 pr-3 font-medium">Employee ID</th>
                    <th className="py-2 pr-3 font-medium">Portal</th>
                    {isAdmin ? <th className="py-2 font-medium">Link</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.userId} className="border-b border-ink/[0.05]">
                      <td className="py-2.5 pr-3 font-medium">{connecteamUserName(u)}</td>
                      <td className="py-2.5 pr-3 text-ink/60">{u.email}</td>
                      <td className="py-2.5 pr-3 font-mono text-xs">{u.employeeId ?? "—"}</td>
                      <td className="py-2.5 pr-3">
                        {u.appUserId ? (
                          <StatusPill tone="success" label={`Linked #${u.appUserId}`} />
                        ) : (
                          <StatusPill tone="warning" label="Not linked" />
                        )}
                      </td>
                      {isAdmin ? (
                        <td className="py-2.5">
                          {!u.appUserId && linkingId === u.userId ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                placeholder="App user ID"
                                value={appUserIdInput}
                                onChange={(e) => setAppUserIdInput(e.target.value)}
                                className="w-28 rounded-lg border border-ink/10 px-2 py-1 text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => void handleLink(u.userId)}
                                className="text-xs font-semibold text-brand hover:underline"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setLinkingId(null)}
                                className="text-xs text-ink/40"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : !u.appUserId ? (
                            <button
                              type="button"
                              onClick={() => setLinkingId(u.userId)}
                              className="text-xs font-semibold text-brand hover:underline"
                            >
                              Link…
                            </button>
                          ) : null}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {isAdmin ? (
          <p className="text-xs text-ink/40">
            Portal user IDs are listed under Admin → User Management. Email match also links
            automatically on the backend.
          </p>
        ) : null}
      </div>
    </WorkforceGate>
  );
}
