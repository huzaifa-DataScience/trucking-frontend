"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { splitProjectName } from "@/lib/siteline-project-name";
import { LinkPending } from "@/components/ui/LinkPending";
import { entityBrandForName, type EntityBrandTokens } from "@/lib/branding/entity-colors";

export type DirectoryType = "customer" | "contract" | "user" | "office" | "label" | "division" | "company";

type Payload = Record<string, unknown>;

const obj = (v: unknown): Payload => (v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Payload) : {});
const str = (v: unknown): string | null => {
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
};
const money = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v)
    ? v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : null;
const day = (v: unknown) => {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
/** "concrete_work" → "Concrete work" */
export const humanizeKey = (s: string) => s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
/** "(202)-457-0111" → "(202) 457-0111" */
const phone = (v: unknown) => str(v)?.replace(/\)-/, ") ") ?? null;
/** Street, City, ST ZIP on one line; skips missing parts. */
const address = (street: unknown, city: unknown, state: unknown, zip: unknown) => {
  const cityLine = [str(city), [str(state)?.toUpperCase(), str(zip)].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return [str(street), cityLine].filter(Boolean).join(", ") || null;
};

const ICONS: Record<DirectoryType, ReactNode> = {
  customer: <path d="M3 21V7l9-4 9 4v14M9 21v-6h6v6" />,
  contract: (
    <>
      <path d="M14 3H6v18h12V7z" />
      <path d="M14 3v4h4M9 13h6M9 17h4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  office: <path d="M4 21V5h10v16M14 9h6v12M8 9h2M8 13h2M8 17h2" />,
  label: (
    <>
      <path d="M3 12V4h8l10 10-8 8z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </>
  ),
  division: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  company: <path d="M3 21h18M5 21V8l7-5 7 5v13M10 21v-5h4v5" />,
};

export function DirectoryIcon({ type, className = "h-5 w-5" }: { type: DirectoryType; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      {ICONS[type]}
    </svg>
  );
}

type Field = { label: string; value: ReactNode | null };

const SECTION_TITLE = "mb-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-ink-muted";

/**
 * "Delaware Cornerstone Builders, Inc. (DCB) - Demolition Division" → company + "Demolition Division";
 * "Goel DC, LLC (CBE - Demolition)" → "Goel DC, LLC" + "CBE - Demolition".
 */
function splitOfficeName(name: string): { company: string; division: string | null } {
  const dash = name.lastIndexOf(" - ");
  if (dash > 0 && !name.slice(dash).includes(")")) {
    return { company: name.slice(0, dash).trim(), division: name.slice(dash + 3).trim() || null };
  }
  const paren = name.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  if (paren && / - /.test(paren[2])) return { company: paren[1].trim(), division: paren[2].trim() };
  return { company: name, division: null };
}

const ACTION_BTN =
  "inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-white px-3 text-[12.5px] font-medium text-ink transition-colors hover:border-[#b9d8f6] hover:bg-brand-tint hover:text-brand-secondary";

function LinkAction({ href, icon, children }: { href: string; icon: "mail" | "phone"; children: ReactNode }) {
  return (
    <a href={href} className={ACTION_BTN}>
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        {icon === "mail" ? (
          <>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </>
        ) : (
          <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
        )}
      </svg>
      {children}
    </a>
  );
}

type Row = { label: string; value: ReactNode | null | undefined };

function Rows({ rows }: { rows: Row[] }) {
  const shown = rows.filter((r) => r.value != null && r.value !== "");
  if (!shown.length) return <p className="text-[13px] text-ink-muted">Nothing recorded in Clearstory.</p>;
  return (
    <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[13px]">
      {shown.map((r) => (
        <div key={r.label} className="contents">
          <dt className="text-ink-muted">{r.label}</dt>
          <dd className="font-medium text-ink [overflow-wrap:anywhere]">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Shared record layout (user, office, label, division): header with avatar, name, tag, ID and
 * actions; two sections side by side; "From Clearstory, as of" footer.
 */
function RecordShell({
  avatar,
  title,
  tag,
  idLine,
  actions,
  left,
  right,
  asOf,
}: {
  avatar: ReactNode;
  title: string;
  tag?: { text: string; tone?: "good" | "muted"; className?: string } | null;
  idLine?: string | null;
  actions?: ReactNode;
  left: { title: string; body: ReactNode };
  right: { title: string; body: ReactNode };
  asOf: string | null;
}) {
  return (
    <article className="overflow-hidden rounded-[12px] border border-[var(--border-subtle)] bg-white">
      <header className="flex flex-wrap items-center gap-3.5 border-b border-[var(--border-subtle)] bg-gradient-to-b from-[#f7f9fc] to-white px-5 py-4">
        {avatar}
        <div className="min-w-0">
          <h2 className="text-[18px] font-semibold leading-snug text-ink">{title}</h2>
          {tag || idLine ? (
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-muted">
              {tag ? (
                <span
                  className={`inline-flex h-5 items-center rounded-full px-2 text-[11.5px] font-semibold ${
                    tag.className ?? (tag.tone === "good" ? "bg-green-50 text-green-700" : "bg-[#f3f4f6] text-ink")
                  }`}
                >
                  {tag.text}
                </span>
              ) : null}
              {idLine ? <span>{idLine}</span> : null}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2 sm:ml-auto">{actions}</div> : null}
      </header>

      <div className="grid md:grid-cols-2">
        <section className="px-5 py-4">
          <h3 className={SECTION_TITLE}>{left.title}</h3>
          {left.body}
        </section>
        <section className="border-t border-[var(--border-subtle)] px-5 py-4 md:border-l md:border-t-0">
          <h3 className={SECTION_TITLE}>{right.title}</h3>
          {right.body}
        </section>
      </div>

      {asOf ? (
        <p className="border-t border-[var(--border-subtle)] bg-[#fcfcfd] px-5 py-2.5 text-[12px] text-ink-muted">
          From Clearstory, as of {asOf}
        </p>
      ) : null}
    </article>
  );
}

/** Round initials (people) or a rounded icon tile (things). */
function Avatar({ initials, type, brand }: { initials?: string; type?: DirectoryType; brand?: EntityBrandTokens }) {
  if (initials) {
    return (
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-[15px] font-bold text-white"
        aria-hidden
      >
        {initials}
      </span>
    );
  }
  return (
    <span
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-[12px] ${brand ? `${brand.bg} ${brand.text}` : "bg-brand-tint text-brand-secondary"}`}
      aria-hidden
    >
      <DirectoryIcon type={type ?? "company"} />
    </span>
  );
}

function UserRecordCard({ p, asOf }: { p: Payload; asOf: string | null }) {
  const id = str(p.id);
  const first = str(p.firstName);
  const last = str(p.lastName);
  const email = str(p.email);
  const role = str(p.roleName);
  const name = [first, last].filter(Boolean).join(" ") || email || `User ${id ?? ""}`.trim();
  const initials = ((first?.[0] ?? "") + (last?.[0] ?? "")).toUpperCase() || name.slice(0, 1).toUpperCase();
  const offices = (Array.isArray(p.offices) ? p.offices : [])
    .map((o) => obj(o))
    .filter((o) => str(o.name))
    .map((o) => ({
      key: str(o.id) ?? str(o.name)!,
      ...splitOfficeName(str(o.name)!),
      location: [str(o.city), str(o.state)?.toUpperCase()].filter(Boolean).join(", ") || null,
      brand: entityBrandForName(str(o.name)),
    }));

  return (
    <RecordShell
      avatar={<Avatar initials={initials} />}
      title={name}
      tag={role ? { text: role } : null}
      idLine={id ? `User ${id}` : null}
      actions={
        <>
          {email ? (
            <LinkAction href={`mailto:${email}`} icon="mail">
              Email
            </LinkAction>
          ) : null}
        </>
      }
      left={{
        title: "Details",
        body: (
          <Rows
            rows={[
              {
                label: "Email",
                value: email ? (
                  <a href={`mailto:${email}`} className="text-brand-secondary hover:underline">
                    {email}
                  </a>
                ) : null,
              },
              { label: "Role", value: role },
              { label: "Joined", value: day(p.createdAt) },
              { label: "Last updated", value: day(p.updatedAt) },
            ]}
          />
        ),
      }}
      right={{
        title: `Offices (${offices.length})`,
        body: offices.length ? (
          <ul className="flex flex-col">
            {offices.map((o) => (
              <li
                key={o.key}
                className="flex items-center gap-2.5 border-b border-[var(--border-subtle)] py-2 last:border-b-0"
              >
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${o.brand.bg} ${o.brand.text}`}>
                  <DirectoryIcon type="office" className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 text-[13px]">
                  <span className="block font-medium text-ink">{o.company}</span>
                  {o.division || o.location ? (
                    <span className="block text-[12px] text-ink-muted">
                      {[o.division, o.location].filter(Boolean).join(" · ")}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-ink-muted">Not assigned to an office.</p>
        ),
      }}
      asOf={asOf}
    />
  );
}

/** Office: company name with its division as the tag; contact on the left, other details on the right. */
function OfficeRecordCard({ p, asOf }: { p: Payload; asOf: string | null }) {
  const id = str(p.id);
  const full = str(p.name) ?? str(p.businessName) ?? `Office ${id ?? ""}`.trim();
  const { company, division } = splitOfficeName(full);
  const brand = entityBrandForName(full);
  const tel = str(p.phone);
  return (
    <RecordShell
      avatar={<Avatar type="office" brand={brand} />}
      title={company}
      tag={division ? { text: division, className: `border ${brand.bg} ${brand.text} ${brand.border}` } : null}
      idLine={id ? `Office ${id}` : null}
      actions={
        <>
          {tel ? (
            <LinkAction href={`tel:${tel.replace(/[^\d+]/g, "")}`} icon="phone">
              Call
            </LinkAction>
          ) : null}
        </>
      }
      left={{
        title: "Contact",
        body: (
          <Rows
            rows={[
              { label: "Address", value: address(p.address, p.city, p.state, p.zipCode) },
              { label: "Phone", value: phone(p.phone) },
              { label: "Fax", value: phone(p.fax) },
            ]}
          />
        ),
      }}
      right={{
        title: "Details",
        body: (
          <Rows
            rows={[
              { label: "Business name", value: str(p.businessName) !== full ? str(p.businessName) : null },
              { label: "Time zone", value: str(p.tzName) },
              { label: "Custom ID", value: str(p.customId) },
              { label: "Created", value: day(p.createdAt) },
              { label: "Last updated", value: day(p.updatedAt) },
            ]}
          />
        ),
      }}
      asOf={asOf}
    />
  );
}

/** Label: name with Active/Inactive tag; details on the left, dates on the right. */
function LabelRecordCard({ p, asOf }: { p: Payload; asOf: string | null }) {
  const id = str(p.id);
  const active = typeof p.active === "boolean" ? p.active : null;
  return (
    <RecordShell
      avatar={<Avatar type="label" />}
      title={str(p.name) ?? `Label ${id ?? ""}`.trim()}
      tag={active == null ? null : active ? { text: "Active", tone: "good" } : { text: "Inactive" }}
      idLine={id ? `Label ${id}` : null}
      left={{
        title: "Details",
        body: (
          <Rows
            rows={[
              { label: "Status", value: active == null ? null : active ? "Active" : "Inactive" },
              {
                label: "Company standard",
                value: typeof p.companyStandard === "boolean" ? (p.companyStandard ? "Yes" : "No") : null,
              },
            ]}
          />
        ),
      }}
      right={{
        title: "History",
        body: (
          <Rows
            rows={[
              { label: "Created", value: day(p.createdAt) },
              { label: "Last updated", value: day(p.updatedAt) },
            ]}
          />
        ),
      }}
      asOf={asOf}
    />
  );
}

/** Division: readable name; its Clearstory key on the left (what other records use), dates on the right. */
function DivisionRecordCard({ p, asOf }: { p: Payload; asOf: string | null }) {
  const key = str(p.division);
  return (
    <RecordShell
      avatar={<Avatar type="division" />}
      title={key ? humanizeKey(key) : "Division"}
      tag={{ text: "Division" }}
      left={{
        title: "Details",
        body: (
          <Rows
            rows={[
              { label: "Name", value: key ? humanizeKey(key) : null },
              {
                label: "Clearstory key",
                value: key ? <code className="rounded bg-[#f3f4f6] px-1.5 py-0.5 text-[12px]">{key}</code> : null,
              },
            ]}
          />
        ),
      }}
      right={{
        title: "History",
        body: (
          <Rows
            rows={[
              { label: "Created", value: day(p.createdAt) },
              { label: "Last updated", value: day(p.updatedAt) },
            ]}
          />
        ),
      }}
      asOf={asOf}
    />
  );
}

/** One looked-up Clearstory record as a readable card (no raw data). */
export function DirectoryRecordCard({
  type,
  payload,
  fetchedAt,
}: {
  type: DirectoryType;
  payload: unknown;
  fetchedAt: string | null;
}) {
  if (type === "user" || type === "office" || type === "label" || type === "division") {
    const asOf = fetchedAt
      ? new Date(fetchedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : null;
    const rec = obj(payload);
    if (type === "user") return <UserRecordCard p={rec} asOf={asOf} />;
    if (type === "office") return <OfficeRecordCard p={rec} asOf={asOf} />;
    if (type === "label") return <LabelRecordCard p={rec} asOf={asOf} />;
    return <DivisionRecordCard p={rec} asOf={asOf} />;
  }
  const p = obj(payload);
  const id = str(p.id);
  let title = str(p.name) ?? "";
  const sub: string[] = [];
  let badge: { text: string; good: boolean } | null = null;
  let fields: Field[] = [];
  let extra: ReactNode = null;

  if (type === "customer") {
    sub.push(`Customer ${id ?? "—"}`);
    fields = [
      { label: "Address", value: address(p.address, p.city, p.state, p.zipCode) },
      { label: "Phone", value: phone(p.phone) },
      { label: "Fax", value: phone(p.fax) },
      { label: "Country", value: str(p.country) },
      { label: "Internal ID", value: str(p.internalId) },
    ];
  } else if (type === "contract") {
    const proj = obj(p.contractorProject ?? p.customerProject);
    const projTitle = str(proj.projectTitle);
    const split = projTitle ? splitProjectName(projTitle) : null;
    const job = str(proj.jobNumber) ?? split?.number ?? null;
    if (!title) title = split?.name ?? projTitle ?? "";
    sub.push(`Contract ${id ?? "—"}`);
    if (typeof proj.archived === "boolean")
      badge = proj.archived ? { text: "Archived", good: false } : { text: "Active", good: true };
    const addr = obj(proj.address);
    fields = [
      { label: "Contract value", value: money(p.contractValue) },
      { label: "Division", value: str(proj.division) ? humanizeKey(str(proj.division)!) : null },
      { label: "Site", value: address(addr.streetAddress, addr.city, addr.state, addr.postalCode ?? addr.zipCode) },
      { label: "Customer job #", value: str(proj.customerJobNumber) },
      { label: "Created", value: day(proj.createdAt) },
    ];
    const projectId = str(proj.id);
    if (projTitle || job) {
      extra = (
        <div>
          <h3 className={SECTION_TITLE}>Project</h3>
          <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[#e3e9f3] bg-[#f7f9fc] px-3 py-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#e3f2fd] text-[#1565c0]">
              <DirectoryIcon type="contract" className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-ink">
                {job ? `${job} · ` : ""}
                {split?.name ?? projTitle}
              </span>
              {split?.detail ? <span className="block truncate text-[12px] text-ink-muted">{split.detail}</span> : null}
            </span>
            {projectId ? (
              <Link
                href={`/clearstory/projects/${encodeURIComponent(projectId)}`}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--border-subtle)] bg-white pl-3 pr-2.5 text-[12.5px] font-medium text-ink transition-colors hover:border-[#b9d8f6] hover:bg-brand-tint hover:text-brand-secondary"
              >
                <LinkPending
                  icon={
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.2}
                    >
                      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  }
                >
                  Open project
                </LinkPending>
              </Link>
            ) : null}
          </div>
        </div>
      );
    }
  } else {
    sub.push(`Company ${id ?? "—"}`);
    if (str(p.domain)) sub.push(str(p.domain)!);
    fields = [
      {
        label: "Address",
        value: address([str(p.address), str(p.address2)].filter(Boolean).join(", "), p.city, p.state, p.zipCode),
      },
      { label: "Phone", value: phone(p.phone) },
      { label: "Fax", value: phone(p.fax) },
      { label: "Time zone", value: str(p.tzName) },
      {
        label: "Divisions",
        value: typeof p.divisionsEnabled === "boolean" ? (p.divisionsEnabled ? "Enabled" : "Not enabled") : null,
      },
    ];
  }

  if (!title) title = `${humanizeKey(type)} ${id ?? ""}`.trim();
  const shown = fields.filter((f) => f.value != null && f.value !== "");
  const asOf = fetchedAt
    ? new Date(fetchedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <article className="flex flex-col gap-4 rounded-[10px] border border-[var(--border-subtle)] bg-white px-5 py-[18px]">
      <header className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-[#e3f2fd] text-[#1565c0]">
          <DirectoryIcon type={type} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-semibold leading-snug text-ink">{title}</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-muted">{sub.join(" · ")}</p>
        </div>
        {badge ? (
          <span
            className={`inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[11.5px] font-semibold ${
              badge.good ? "bg-green-50 text-green-700" : "bg-[#f3f4f6] text-ink-muted"
            }`}
          >
            {badge.text}
          </span>
        ) : null}
      </header>

      {shown.length ? (
        <dl className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-x-5 gap-y-3 text-[13px]">
          {shown.map((f) => (
            <div key={f.label} className="min-w-0">
              <dt className="text-[12px] text-ink-muted">{f.label}</dt>
              <dd className="mt-0.5 font-medium text-ink [overflow-wrap:anywhere]">{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-[13px] text-ink-muted">Clearstory has no other details for this record.</p>
      )}

      {extra}

      {asOf ? <p className="text-[12px] text-ink-muted">From Clearstory, as of {asOf}</p> : null}
    </article>
  );
}
