const API = "http://localhost:3005";

async function j(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      Accept: "application/json",
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function main() {
  const email = `dbg.${Date.now()}@example.com`;
  const reg = await j("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email,
      password: "TestPass123!",
      confirmPassword: "TestPass123!",
    }),
  });
  const token = reg.body.access_token;
  const ents = await j("/lookups/our-entities", { token });
  const ourEntityId = Array.isArray(ents.body)
    ? ents.body[0].id
    : ents.body.items[0].id;
  const meta = await j("/lookups/bidding/process-meta", { token });
  console.log("bidKinds:", JSON.stringify(meta.body.bidKinds).slice(0, 500));
  console.log(
    "bidKindLabels:",
    JSON.stringify(meta.body.bidKindLabels)?.slice(0, 300)
  );
  console.log(
    "intakeEditor keys:",
    meta.body.intakeEditor && Object.keys(meta.body.intakeEditor)
  );

  const created = await j("/bids", {
    method: "POST",
    token,
    body: JSON.stringify({
      estimateNumber: `DBG-${Date.now().toString().slice(-5)}`,
      ourEntityId,
      bidName: "Dbg",
    }),
  });
  const id = created.body.id;
  console.log("created", id, "status", created.status);

  const patch = await j(`/bids/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify({
      bidName: "Weinberg USP 800 Pharmacy",
      process: {
        drawingName: "Weinberg USP 800 Pharmacy",
        ownerProjectNumber: "C.480.19.1762",
        mechanicalEngineerProjectNumber: "LW19-330-00",
        bidKind: "built_to_print",
        dueTime: "14:00",
        invitations: [
          {
            id: "x1",
            receivedAt: "2026-08-20",
            contact: { name: "Pat" },
            links: [],
            attachmentIds: [],
          },
        ],
        documentLinks: [
          { url: "https://ex.com", label: "Owner", source: "owner" },
        ],
        contractTiers: [
          {
            sortOrder: 0,
            role: "owner",
            company: "JH",
            hasTheJob: true,
            invitedUs: false,
            isPaying: true,
          },
        ],
      },
    }),
  });
  console.log("PATCH status", patch.status);
  if (patch.status >= 400) {
    console.log("PATCH err", JSON.stringify(patch.body).slice(0, 1000));
  } else {
    const p = patch.body.process || {};
    console.log(
      "returned keys sample:",
      Object.keys(p).filter((k) =>
        /owner|mech|invite|document|tier|drawing|bidKind|due/i.test(k)
      )
    );
    console.log("drawingName", p.drawingName);
    console.log("ownerProjectNumber", p.ownerProjectNumber);
    console.log(
      "mechanicalEngineerProjectNumber",
      p.mechanicalEngineerProjectNumber
    );
    console.log("bidKind", p.bidKind);
    console.log("dueTime", p.dueTime);
    console.log("invitations", JSON.stringify(p.invitations)?.slice(0, 400));
    console.log(
      "documentLinks",
      JSON.stringify(p.documentLinks)?.slice(0, 200)
    );
    console.log(
      "contractTiers",
      JSON.stringify(p.contractTiers)?.slice(0, 400)
    );
    console.log("bidName header", patch.body.bidName);
  }

  for (const kind of [
    "budget",
    "design_assist",
    "unknown",
    "design_build",
    "built_to_print",
    "other",
  ]) {
    const r = await j(`/bids/${id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ process: { bidKind: kind } }),
    });
    console.log(
      `bidKind ${kind}:`,
      r.status,
      r.body?.process?.bidKind ??
        r.body?.message ??
        JSON.stringify(r.body).slice(0, 160)
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
