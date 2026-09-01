/**
 * Live Intake + Assignment API smoke test (FRONTEND_INTAKE.md).
 * Creates a throwaway user via register (returns JWT even if login blocked).
 * Run: npx tsx scripts/intake-smoke.ts
 */
const API = process.env.API_BASE ?? "http://localhost:3005";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function json<T>(
  path: string,
  opts: RequestInit & { token?: string } = {}
): Promise<{ status: number; body: T }> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts.body ? { "Content-Type": "application/json" } : {}),
    ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
  };
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  const text = await res.text();
  let body: T;
  try {
    body = text ? (JSON.parse(text) as T) : (null as T);
  } catch {
    body = text as T;
  }
  return { status: res.status, body };
}

async function main() {
  const results: { name: string; ok: boolean; detail?: string }[] = [];
  const ok = (name: string, detail?: string) =>
    results.push({ name, ok: true, detail });
  const fail = (name: string, detail: string) =>
    results.push({ name, ok: false, detail });

  const email = `intake.smoke.${Date.now()}@example.com`;
  const password = "TestPass123!";

  const reg = await json<{
    access_token?: string;
    user?: { id: number; status?: string };
    message?: string;
  }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      confirmPassword: password,
    }),
  });

  const token = reg.body?.access_token;
  if (!token) {
    fail("register", JSON.stringify(reg.body).slice(0, 200));
    print(results);
    process.exit(1);
  }
  ok("register", `user ${reg.body.user?.id}`);

  // --- Lookups ---
  const meta = await json<Record<string, unknown>>(
    "/lookups/bidding/process-meta",
    { token }
  );
  if (meta.status === 200 && meta.body) {
    ok("process-meta", Object.keys(meta.body).slice(0, 12).join(","));
    const kinds = meta.body.bidKinds ?? meta.body.bidKindLabels;
    if (kinds) ok("process-meta.bidKinds", typeof kinds);
    else fail("process-meta.bidKinds", "missing");
    if (meta.body.tierRoles || meta.body.intakeEditor)
      ok("process-meta.tiers", "tierRoles/intakeEditor present");
    else
      fail(
        "process-meta.tiers",
        "no tierRoles / intakeEditor — FE falls back to defaults"
      );
  } else {
    fail("process-meta", `status ${meta.status}`);
  }

  const teams = await json<unknown[]>("/lookups/bidding/teams", { token });
  if (teams.status === 200 && Array.isArray(teams.body)) {
    ok("teams", `${teams.body.length} teams`);
  } else {
    fail("teams", `status ${teams.status}`);
  }

  const entities = await json<{ id: number; name?: string }[] | { items?: { id: number }[] }>(
    "/lookups/our-entities",
    { token }
  );
  const entityList = Array.isArray(entities.body)
    ? entities.body
    : entities.body &&
        typeof entities.body === "object" &&
        Array.isArray((entities.body as { items?: unknown }).items)
      ? ((entities.body as { items: { id: number }[] }).items)
      : [];
  if (entities.status !== 200 || !entityList.length) {
    fail("our-entities", `status ${entities.status} count ${entityList.length}`);
    print(results);
    process.exit(1);
  }
  ok("our-entities", `${entityList.length}`);
  const ourEntityId = entityList[0]!.id;

  // --- Create bid ---
  const created = await json<{
    id: string | number;
    estimateNumber?: string;
    process?: Record<string, unknown>;
    message?: string;
  }>("/bids", {
    method: "POST",
    token,
    body: JSON.stringify({
      estimateNumber: `INTK-${Date.now().toString().slice(-6)}`,
      ourEntityId,
      bidName: "Smoke Test Drawings",
      process: { workType: "insulation" },
    }),
  });
  if (created.status >= 400 || created.body?.id == null) {
    fail("create bid", `status ${created.status} ${JSON.stringify(created.body).slice(0, 240)}`);
    print(results);
    process.exit(1);
  }
  const bidId = created.body.id;
  ok("create bid", String(bidId));

  // --- PATCH intake shape ---
  const intakePatch = {
    bidName: "Weinberg USP 800 Pharmacy",
    process: {
      drawingName: "Weinberg USP 800 Pharmacy",
      ownerProjectNumber: "C.480.19.1762",
      mechanicalEngineerProjectNumber: "LW19-330-00",
      bidKind: "built_to_print",
      dueDate: "2026-09-04",
      dueTime: "14:00",
      projectAddress: {
        line1: "1800 Orleans St",
        city: "Baltimore",
        state: "MD",
        zip: null,
      },
      owner: { name: "Johns Hopkins" },
      architect: { name: "Ford Keely" },
      mechanicalEngineer: { name: "WSP" },
      relatedBidId: null,
      documentLinks: [
        {
          url: "https://example.com/owner-set",
          label: "Owner set",
          source: "owner",
        },
      ],
      invitations: [
        {
          id: crypto.randomUUID(),
          receivedAt: "2026-08-20",
          contact: {
            name: "Pat",
            email: "pat@mech.com",
            phone: null,
          },
          links: [
            {
              url: "https://example.com/invite",
              label: "Invite set",
              source: "inviter",
            },
          ],
          attachmentIds: [],
          notes: null,
        },
      ],
      contractTiers: [
        {
          sortOrder: 0,
          role: "owner",
          company: "Johns Hopkins",
          hasTheJob: true,
          invitedUs: false,
          isPaying: true,
        },
        {
          sortOrder: 1,
          role: "gc",
          company: "Clark",
          hasTheJob: null,
          invitedUs: false,
          isPaying: false,
        },
        {
          sortOrder: 2,
          role: "mechanical",
          company: "Bowers",
          hasTheJob: null,
          invitedUs: true,
          isPaying: false,
        },
        {
          sortOrder: 3,
          role: "us",
          company: "Goel",
          hasTheJob: false,
          invitedUs: false,
          isPaying: false,
        },
      ],
    },
  };

  const patched = await json<{
    id?: string | number;
    bidName?: string;
    process?: Record<string, unknown>;
    message?: string;
    statusCode?: number;
  }>(`/bids/${bidId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(intakePatch),
  });

  if (patched.status >= 400) {
    fail("PATCH intake", `status ${patched.status} ${JSON.stringify(patched.body).slice(0, 300)}`);
  } else {
    const p = patched.body.process ?? {};
    try {
      assert(patched.body.bidName === "Weinberg USP 800 Pharmacy", "bidName");
      assert(p.drawingName === "Weinberg USP 800 Pharmacy", "drawingName");
      assert(p.ownerProjectNumber === "C.480.19.1762", "ownerProjectNumber");
      assert(
        p.mechanicalEngineerProjectNumber === "LW19-330-00",
        "mechanicalEngineerProjectNumber"
      );
      assert(p.bidKind === "built_to_print", "bidKind");
      assert(p.dueTime === "14:00" || p.dueTime === "14:00:00", `dueTime=${p.dueTime}`);
      assert(Array.isArray(p.invitations) && (p.invitations as unknown[]).length === 1, "invitations");
      assert(Array.isArray(p.documentLinks) && (p.documentLinks as unknown[]).length === 1, "documentLinks");
      assert(Array.isArray(p.contractTiers) && (p.contractTiers as unknown[]).length >= 4, "contractTiers");
      const tiers = p.contractTiers as { invitedUs?: boolean; isPaying?: boolean; hasTheJob?: boolean | null }[];
      assert(tiers.some((t) => t.invitedUs === true), "invitedUs");
      assert(tiers.some((t) => t.isPaying === true), "isPaying");
      ok("PATCH intake", "fields round-trip");
    } catch (e) {
      fail("PATCH intake assert", String(e));
    }
  }

  // budget bidKind
  const budget = await json<{ process?: { bidKind?: string } }>(`/bids/${bidId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ process: { bidKind: "budget" } }),
  });
  if (budget.status < 400 && budget.body.process?.bidKind === "budget") {
    ok("bidKind=budget", "accepted (no budgetOnly checkbox)");
  } else {
    fail(
      "bidKind=budget",
      `status ${budget.status} kind=${budget.body?.process?.bidKind}`
    );
  }

  // design_assist / unknown
  for (const kind of ["design_assist", "unknown"] as const) {
    const r = await json<{ process?: { bidKind?: string } }>(`/bids/${bidId}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ process: { bidKind: kind } }),
    });
    if (r.status < 400 && r.body.process?.bidKind === kind) ok(`bidKind=${kind}`);
    else fail(`bidKind=${kind}`, `status ${r.status} got ${r.body?.process?.bidKind}`);
  }

  // Typeahead filters
  const bySearch = await json<unknown[]>("/bids?search=Weinberg", { token });
  if (bySearch.status === 200 && Array.isArray(bySearch.body)) {
    ok("GET /bids?search=", `${bySearch.body.length} hits`);
  } else fail("GET /bids?search=", `status ${bySearch.status}`);

  const byOwner = await json<unknown[]>(
    "/bids?ownerProjectNumber=C.480.19.1762",
    { token }
  );
  if (byOwner.status === 200 && Array.isArray(byOwner.body)) {
    ok("GET /bids?ownerProjectNumber=", `${byOwner.body.length} hits`);
  } else {
    fail("GET /bids?ownerProjectNumber=", `status ${byOwner.status}`);
  }

  const byMe = await json<unknown[]>(
    "/bids?mechanicalEngineerProjectNumber=LW19-330-00",
    { token }
  );
  if (byMe.status === 200 && Array.isArray(byMe.body)) {
    ok("GET /bids?mechanicalEngineerProjectNumber=", `${byMe.body.length} hits`);
  } else {
    fail("GET /bids?mechanicalEngineerProjectNumber=", `status ${byMe.status}`);
  }

  // Assignment teamId + people
  const teamId =
    teams.status === 200 && Array.isArray(teams.body) && teams.body[0]
      ? Number((teams.body[0] as { id: number }).id)
      : null;

  const assignBody: Record<string, unknown> = {
    process: {
      assignment: {
        pursue: true,
        teamId,
        captain: "Nick",
        assistantEstimator: "PJ",
        bidClerk: "John",
        priority: "high",
      },
      takeoffAssignments: [
        { role: "duct1", assigneeName: "A" },
        { role: "duct2", assigneeName: "B" },
      ],
    },
  };

  const assign = await json<{ process?: { assignment?: Record<string, unknown> } }>(
    `/bids/${bidId}`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify(assignBody),
    }
  );
  if (assign.status < 400) {
    const a = assign.body.process?.assignment ?? {};
    if (a.captain === "Nick" && a.bidClerk === "John") {
      ok("PATCH assignment", `teamId=${String(a.teamId)}`);
    } else {
      fail("PATCH assignment", JSON.stringify(a).slice(0, 200));
    }
  } else {
    fail("PATCH assignment", `status ${assign.status}`);
  }

  // Second invitation replace
  const twoInvites = await json<{ process?: { invitations?: unknown[] } }>(
    `/bids/${bidId}`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify({
        process: {
          invitations: [
            {
              id: crypto.randomUUID(),
              receivedAt: "2026-08-20",
              contact: { name: "Pat", email: "pat@mech.com" },
              links: [],
              attachmentIds: [],
            },
            {
              id: crypto.randomUUID(),
              receivedAt: "2026-08-21",
              contact: { name: "Sam", email: "sam@gc.com" },
              links: [],
              attachmentIds: [],
            },
          ],
        },
      }),
    }
  );
  if (
    twoInvites.status < 400 &&
    (twoInvites.body.process?.invitations?.length ?? 0) === 2
  ) {
    ok("invitations[] replace", "2 rows same bid");
  } else {
    fail(
      "invitations[] replace",
      `status ${twoInvites.status} len=${twoInvites.body.process?.invitations?.length}`
    );
  }

  print(results);
  const failed = results.filter((r) => !r.ok);
  process.exit(failed.length ? 1 : 0);
}

function print(results: { name: string; ok: boolean; detail?: string }[]) {
  console.log("\n=== Intake smoke results ===");
  for (const r of results) {
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  const failed = results.filter((x) => !x.ok).length;
  console.log(
    `\n${results.length - failed}/${results.length} passed${failed ? ` (${failed} failed)` : ""}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
