"use client";

import type { ReactNode } from "react";
import type { ProposalSheet, ProposalSheetCopy } from "@/lib/bidding/process-types";
import {
  formatProposalDate,
  formatProposalMoney,
  lumpTotal,
  resolveAlternatePrice,
  resolveBucketPrice,
  type ProposalLetterhead,
} from "@/lib/bidding/proposal-sheet";

type BucketDef = { value: string; label: string };
type ExceptionDef = { key: string; label: string };

export function BidProposalLetter({
  sheet,
  buckets,
  boilerplate,
  exDefs,
  cert,
  letterhead,
  copy,
  estimateNumber,
  bidName,
  estimatorLabel,
}: {
  sheet: ProposalSheet;
  buckets: BucketDef[];
  boilerplate: string[];
  exDefs: ExceptionDef[];
  cert: boolean;
  letterhead: ProposalLetterhead;
  copy: ProposalSheetCopy | null;
  estimateNumber: string;
  bidName: string;
  estimatorLabel: string;
}) {
  const showQty = copy?.showQuantities === true;
  const recipient = copy?.toCompany?.trim() || "Master";
  const total = lumpTotal(
    sheet,
    buckets.map((b) => b.value),
    copy
  );
  const title = `${estimateNumber} — ${bidName}`.replace(/\s+/g, " ").trim();
  const notes = sheet.specialNotes?.trim() || "";
  const hasNotes = Boolean(notes);
  const hasAlts = (sheet.alternates ?? []).length > 0;
  const isDcb = letterhead.kind === "dcb";

  let page = 0;
  const nextPage = () => ++page;
  const breakdownPage = nextPage();
  const notesPage = hasNotes ? nextPage() : 0;
  const exceptionPage = exDefs.length > 0 ? nextPage() : 0;
  const certPageNum = cert ? nextPage() : 0;

  return (
    <div id="proposal-print-root" className={`proposal-letter proposal-letter--${letterhead.kind}`}>
      {isDcb ? (
        <DcbCoverPage
          sheet={sheet}
          letterhead={letterhead}
          copy={copy}
          estimateNumber={estimateNumber}
          bidName={bidName}
          estimatorLabel={estimatorLabel}
          title={title}
        />
      ) : (
        <GoelCoverPage
          sheet={sheet}
          letterhead={letterhead}
          copy={copy}
          estimateNumber={estimateNumber}
          bidName={bidName}
          estimatorLabel={estimatorLabel}
          title={title}
        />
      )}

      <article className="proposal-page proposal-page--inner">
        <div className="proposal-spine" aria-hidden>
          <span className="proposal-spine-dark" />
          <span className="proposal-spine-orange" />
        </div>
        <div className="proposal-inner">
          <h2 className="proposal-breakdown-title">Insulation proposal breakdown sheet</h2>
          <p className="proposal-lead">
            {letterhead.divisionLine} is pleased to submit the following proposal to furnish and
            install the following:
          </p>
          {boilerplate.length > 0 ? (
            <ul className="proposal-bullets">
              {boilerplate.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}

          <table className={`proposal-breakdown ${showQty ? "" : "proposal-breakdown--no-qty"}`}>
            <thead>
              <tr>
                <th>Description</th>
                {showQty ? <th className="proposal-col-qty">Qty</th> : null}
                <th className="proposal-col-price">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => {
                const line = (sheet.lines ?? []).find((l) => l.bucket === b.value);
                const price = resolveBucketPrice(sheet, b.value, copy);
                const systems = (line?.systems ?? "").trim();
                return (
                  <tr key={b.value}>
                    <td>
                      <span className="proposal-bucket">{b.label}</span>
                      <span className={`proposal-systems ${systems ? "" : "proposal-systems--empty"}`}>
                        {systems || "—"}
                      </span>
                    </td>
                    {showQty ? (
                      <td className="proposal-col-qty">{(line?.quantity ?? "").trim() || ""}</td>
                    ) : null}
                    <td className="proposal-col-price">{formatProposalMoney(price)}</td>
                  </tr>
                );
              })}
              <tr className="proposal-total-row">
                <td colSpan={showQty ? 2 : 1}>Total</td>
                <td className="proposal-col-price">{formatProposalMoney(total)}</td>
              </tr>
            </tbody>
          </table>

          <div className="proposal-alt-bar">Add / VE options / alternates (not in price above)</div>
          {hasAlts ? (
            <table className={`proposal-breakdown ${showQty ? "" : "proposal-breakdown--no-qty"}`}>
              <thead>
                <tr>
                  <th>Description</th>
                  {showQty ? <th className="proposal-col-qty">Qty</th> : null}
                  <th className="proposal-col-price">Price</th>
                </tr>
              </thead>
              <tbody>
                {(sheet.alternates ?? []).map((alt, i) => (
                  <tr key={i}>
                    <td>{alt.description?.trim() || `Alternate ${i + 1}`}</td>
                    {showQty ? (
                      <td className="proposal-col-qty">{(alt.quantity ?? "").trim() || ""}</td>
                    ) : null}
                    <td className="proposal-col-price">
                      {formatProposalMoney(resolveAlternatePrice(alt, i, copy))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="proposal-alt-empty-row">
              <span />
              <span className="proposal-col-price">{formatProposalMoney(0)}</span>
            </div>
          )}

          <InnerFooter
            isDcb={isDcb}
            bidName={bidName}
            recipient={recipient}
            page={breakdownPage}
          />
        </div>
      </article>

      {hasNotes ? (
        <article className="proposal-page proposal-page--inner">
          <div className="proposal-spine" aria-hidden>
            <span className="proposal-spine-dark" />
            <span className="proposal-spine-orange" />
          </div>
          <div className="proposal-inner">
            <h2 className="proposal-breakdown-title">Special notes</h2>
            <div className="proposal-notes">
              {notes.split(/\n+/).map((para, i) => {
                const t = para.trim();
                if (!t) return null;
                const bullet = t.startsWith("•") || t.startsWith("-") || t.startsWith("*");
                return (
                  <p key={i} className={bullet ? "proposal-notes-bullet" : undefined}>
                    {bullet ? t.replace(/^[•\-*]\s*/, "") : t}
                  </p>
                );
              })}
            </div>
            <InnerFooter isDcb={isDcb} bidName={bidName} recipient={recipient} page={notesPage} />
          </div>
        </article>
      ) : null}

      {exDefs.length > 0 ? (
        <article className="proposal-page proposal-page--inner">
          <div className="proposal-spine" aria-hidden>
            <span className="proposal-spine-dark" />
            <span className="proposal-spine-orange" />
          </div>
          <div className="proposal-inner">
            <div className="proposal-ex-head">
              <h2>Exception</h2>
              <div className="proposal-ex-cols">
                <span>Included</span>
                <span>Not included</span>
              </div>
            </div>
            <table className="proposal-exceptions">
              <tbody>
                {exDefs.map((ex) => {
                  const row = (sheet.exceptions ?? []).find((r) => r.key === ex.key);
                  const included = row?.included === true;
                  const excluded = row?.included === false;
                  return (
                    <tr key={ex.key}>
                      <td className="proposal-ex-item">{ex.label}</td>
                      <td className="proposal-ex-mark">
                        {included ? <span className="proposal-x">X</span> : null}
                      </td>
                      <td className="proposal-ex-mark">
                        {excluded ? <span className="proposal-x">X</span> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <InnerFooter
              isDcb={isDcb}
              bidName={bidName}
              recipient={recipient}
              page={exceptionPage}
            />
          </div>
        </article>
      ) : null}

      {cert ? (
        <article className="proposal-page proposal-page--inner">
          <div className="proposal-spine proposal-spine--gold" aria-hidden>
            <span className="proposal-spine-dark" />
            <span className="proposal-spine-orange" />
          </div>
          <div className="proposal-inner">
            <h2 className="proposal-breakdown-title">MBE certifications</h2>
            <CertBody companyName={letterhead.companyName} />
            <InnerFooter isDcb={isDcb} bidName={bidName} recipient={recipient} page={certPageNum} />
          </div>
        </article>
      ) : null}
    </div>
  );
}

function GoelCoverPage({
  sheet,
  letterhead,
  copy,
  estimateNumber,
  bidName,
  estimatorLabel,
  title,
}: {
  sheet: ProposalSheet;
  letterhead: ProposalLetterhead;
  copy: ProposalSheetCopy | null;
  estimateNumber: string;
  bidName: string;
  estimatorLabel: string;
  title: string;
}) {
  const meta: { label: string; value: string }[] = [
    { label: "Goel bid number", value: estimateNumber || "—" },
    { label: "Goel estimator", value: (estimatorLabel || "—").toUpperCase() },
    { label: "Drawings/date of drawings", value: sheet.drawings?.trim() || "—" },
    { label: "Date of proposal", value: formatProposalDate(sheet.proposalDate) },
    { label: "Specifications", value: sheet.specifications?.trim() || "—" },
    { label: "Wage scale", value: (sheet.wageScale?.trim() || "—").toUpperCase() },
    { label: "Amendments / addendums", value: (sheet.addenda?.trim() || "—").toUpperCase() },
    { label: "Proposal revision #", value: sheet.revision?.trim() || "0" },
    { label: "Mechanical designer", value: sheet.mechanicalDesigner?.trim() || "—" },
  ];

  return (
    <article className="proposal-page proposal-page--goel-cover">
      <div className="goel-cover-top">
        <div className="goel-cover-photos">
          <div className="goel-photo-grid">
            {/* Order matches ProposalExample cover: L-top, R-top, L-bot, R-bot */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="goel-photo goel-photo--tl" src="/proposal/goel/hero-3.png" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="goel-photo goel-photo--tr" src="/proposal/goel/hero-1.png" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="goel-photo goel-photo--bl" src="/proposal/goel/hero-4.png" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="goel-photo goel-photo--br" src="/proposal/goel/hero-2.png" alt="" />
          </div>
          <div className="goel-cover-overlay">
            <p className="goel-cover-kicker">Mechanical insulation proposal</p>
            <h1>{title || bidName}</h1>
          </div>
        </div>

        <aside className="goel-cover-side">
          <div className="goel-party">
            <h3>Proposal from:</h3>
            <p className="goel-party-strong">{estimatorLabel || "—"}</p>
            <p className="goel-party-strong">{letterhead.companyName}</p>
            {letterhead.addressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p>{letterhead.mainPhone}</p>
            {letterhead.website ? <p>{letterhead.website}</p> : null}
            {letterhead.additionalContact ? (
              <>
                <p className="goel-party-gap" />
                <h3>Additional questions call:</h3>
                <p className="goel-party-strong">
                  {letterhead.additionalContact.name}, {letterhead.additionalContact.title}
                </p>
                <p>Direct: {letterhead.additionalContact.phone}</p>
                <p>{letterhead.additionalContact.email}</p>
              </>
            ) : null}
          </div>

          <div className="goel-party goel-party--to">
            <h3>Proposal to:</h3>
            {copy ? (
              <>
                <p className="goel-party-strong">{copy.toName?.trim() || "—"}</p>
                <p className="goel-party-strong">{copy.toCompany?.trim() || "—"}</p>
                {copy.toAddress?.trim()
                  ? copy.toAddress
                      .split(/\n/)
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .map((line) => <p key={line}>{line}</p>)
                  : null}
                <p>Mobile: {copy.toPhone?.trim() || ""}</p>
                <p>Office:</p>
                {copy.toEmail?.trim() ? <p>{copy.toEmail}</p> : null}
              </>
            ) : (
              <p className="goel-party-muted">Add a recipient copy to fill this block.</p>
            )}
          </div>
        </aside>
      </div>

      <div className="goel-bidlist-bar">
        <span>Please add us to your bid list for mechanical insulation:</span>
        <strong>{letterhead.bidListEmail || "INSULATION.BIDS@GOELSERVICES.COM"}</strong>
      </div>

      <div className="goel-cover-footer">
        <div className="goel-footer-main">
          <div className="goel-cover-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/proposal/goel/logo-insulation-light.png" alt="Goel Insulation" />
          </div>
          <div className="goel-meta-grid">
            {meta.map((cell) => (
              <div key={cell.label} className="goel-meta-cell">
                <span className="goel-meta-label">{cell.label}</span>
                <span className="goel-meta-value">{cell.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="goel-cover-bottom">
          <div className="goel-services-block">
            <h4>Other services</h4>
            <ul>
              {letterhead.services.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div className="goel-affils">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/proposal/goel/logo-services-wrecking-light.png" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/proposal/goel/logo-services-sewer-light.png" alt="" />
          </div>
        </div>

        <div className="goel-cover-legal">
          <div>
            <p className="goel-sdb">{letterhead.badge}</p>
            <p className="goel-locs">Landover, MD | Baltimore, MD</p>
          </div>
          <div className="goel-mascot-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="goel-affil-liuna" src="/proposal/goel/logo-liuna.png" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="goel-mascot" src="/proposal/goel/mascot.png" alt="" />
          </div>
        </div>
      </div>
    </article>
  );
}

function DcbCoverPage({
  sheet,
  letterhead,
  copy,
  estimateNumber,
  bidName,
  estimatorLabel,
  title,
}: {
  sheet: ProposalSheet;
  letterhead: ProposalLetterhead;
  copy: ProposalSheetCopy | null;
  estimateNumber: string;
  bidName: string;
  estimatorLabel: string;
  title: string;
}) {
  return (
    <article className="proposal-page proposal-page--dcb-cover">
      <div className="dcb-cover-top">
        <div className="dcb-logo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/proposal/dcb/logo.png" alt="DCB Insulation Division" />
        </div>
        <div className="dcb-hero-pair">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/proposal/dcb/hero-1.png" alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/proposal/dcb/hero-2.png" alt="" />
        </div>
      </div>

      <div className="dcb-title-bar">{title || bidName}</div>

      <div className="dcb-body">
        <div className="dcb-gold-spine" aria-hidden>
          <span>{letterhead.badge}</span>
        </div>
        <div className="dcb-cols">
          <div className="dcb-col">
            <Field label="Date" value={formatProposalDate(sheet.proposalDate)} />
            <Field
              label="From"
              value={
                <>
                  <strong>Prabodh K. (P.K.) Goel, President</strong>
                  <br />
                  {letterhead.mainPhone}
                  <br />
                  pk.goel@dcbuilders.com
                </>
              }
            />
            <Field
              label="Estimator to contact"
              value={
                <>
                  <strong>{estimatorLabel || "—"}</strong>
                </>
              }
            />
          </div>
          <div className="dcb-col">
            <Field
              label="To"
              value={
                copy ? (
                  <>
                    <strong>{copy.toName?.trim() || "—"}</strong>
                    <br />
                    {copy.toCompany?.trim() || "—"}
                    {copy.toAddress?.trim() ? (
                      <>
                        <br />
                        {copy.toAddress}
                      </>
                    ) : null}
                    {copy.toEmail?.trim() ? (
                      <>
                        <br />
                        {copy.toEmail}
                      </>
                    ) : null}
                  </>
                ) : (
                  "Add a recipient copy"
                )
              }
            />
            <Field label="DCB proposal number" value={estimateNumber || "—"} />
            <Field label="Revision" value={sheet.revision?.trim() || "00"} />
            <Field label="Wage rate" value={sheet.wageScale?.trim() || "—"} />
          </div>
          <div className="dcb-col">
            <Field label="Drawing set / date" value={sheet.drawings?.trim() || "—"} />
            <Field label="Mechanical designer" value={sheet.mechanicalDesigner?.trim() || "—"} />
            <Field label="Specification number" value={sheet.specifications?.trim() || "—"} />
            <Field label="Addendum" value={sheet.addenda?.trim() || "—"} />
          </div>
        </div>
      </div>

      <div className="dcb-footer">
        <div>
          <p className="dcb-footer-company">{letterhead.companyName}</p>
          {letterhead.addressLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div>
          <p className="dcb-footer-head">Other services</p>
          <ul>
            {letterhead.services.slice(0, 7).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="dcb-footer-head">Mechanical insulation fabrication</p>
          <ul>
            {letterhead.services.slice(7).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="dcb-field">
      <span className="dcb-field-label">{label}</span>
      <div className="dcb-field-value">{value}</div>
    </div>
  );
}

function InnerFooter({
  isDcb,
  bidName,
  recipient,
  page,
}: {
  isDcb: boolean;
  bidName: string;
  recipient: string;
  page: number;
}) {
  return (
    <footer className="proposal-inner-footer">
      <div className="proposal-inner-footer-logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={isDcb ? "/proposal/dcb/logo.png" : "/proposal/goel/logo-insulation.png"}
          alt=""
        />
      </div>
      <p className="proposal-inner-footer-meta">
        {bidName}
        <span>|</span>
        {recipient}
        <span>|</span>
        {page}
      </p>
    </footer>
  );
}

function CertBody({ companyName }: { companyName: string }) {
  return (
    <div className="proposal-cert">
      <p className="proposal-cert-intro">
        {companyName} — Minority / disadvantaged business certifications (attach current certificates
        when submitting).
      </p>
      <div className="proposal-cert-grid">
        <div>
          <h4>Maryland MDOT</h4>
          <p>Asian American Sub-Continent · MBE — 95-099</p>
          <p>NAICS 238220 · 238290 · 425120 · 541620 · 562910</p>
        </div>
        <div>
          <h4>Prince George&apos;s County</h4>
          <p>MBE · CBB · CBSB · CLB</p>
          <p>238310 — Insulation Contractors</p>
        </div>
        <div>
          <h4>MWAA / DC-DOT / WMATA</h4>
          <p>DB20259586 · DBE0003788 · SBE0003788</p>
        </div>
        <div>
          <h4>Virginia SWaM / DBE</h4>
          <p>DB20259586 · 236220 · 238110 · 238310 · 238910 · 562910</p>
        </div>
        <div>
          <h4>Baltimore MWBOO</h4>
          <p>MBE — Asian · 19-376451</p>
        </div>
        <div>
          <h4>Federal</h4>
          <p>US Small Business Program · Self-Certified SDB</p>
        </div>
      </div>
    </div>
  );
}
