/**
 * Siteline project names look like "21190 - UMES Medical Center HVAC (Poole & Kent)(DCB-PW)(JO/JS)".
 * Split into the job number, the readable name, and the bracketed codes (GC, crew, initials).
 */
export function splitProjectName(full: string): { number: string | null; name: string; detail: string; tags: string[] } {
  const m = full.match(/^\s*(\d[\w.-]*)\s*-\s*(.*)$/);
  const number = m ? m[1] : null;
  const rest = (m ? m[2] : full).trim();
  const paren = rest.indexOf("(");
  const name = (paren > 0 ? rest.slice(0, paren) : rest).trim() || rest;
  const tags =
    paren > 0
      ? (rest.slice(paren).match(/\(([^()]*)\)/g) ?? []).map((t) => t.slice(1, -1).trim()).filter(Boolean)
      : [];
  return { number, name, detail: tags.join(" · "), tags };
}
