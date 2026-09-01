# Spec sheet — Frontend Handoff

**Give this file to FE.** It replaces last week’s spec-sheet cascade.  
**Last updated:** 2026-08-25  
**Stage:** Estimating Setup (`estimating_setup`) — **before takeoff**  
**Chrome:** [BIDDING_FRONTEND_API.md §0](./BIDDING_FRONTEND_API.md)  
**Source:** PJ catch-up 2026-08-23. Lock this cascade. Nick / Gino / captains vet later.

Enums live in `GET /lookups/bidding/process-meta` → `specSheetEditor`. Do not hardcode if meta already has the list.

This is **not** a spreadsheet. Codes are **never a dropdown**. Estimators may **type the Mike code** (`FGA`) to skip. PMs go family → product.

This is **not** the Specs / Mike **qty** grid.

| Thing | When | What |
|-------|------|------|
| Spec **PDFs** (`insulationSpecs` + labels `hydronic-spec`, `plumbing-spec`, …) | Setup | Which client spec books apply |
| **Spec sheet** (`process.specSheets`) | Setup, **this doc** | Allowed **rules** per system × area × size × material |
| Specs grid + Mike | **Takeoff** | Quantities — [FRONTEND_BIDDING_SPECS.md](./FRONTEND_BIDDING_SPECS.md) |

CSV cross-check is **later**. Day 1 = dropdowns + save. Backend fills codes on GET and PATCH.

---

## Replace last week’s UI

| Was ( rip out ) | Now |
|-----------------|-----|
| Add sheet: Duct / HVAC / Plumbing | **+ Equipment** (`kind: "equipment"`) |
| One long Insulation dropdown | **Family** first, then `GET spec-materials?family=<id>&layer=insulation` |
| Facing + jacket as one finish | **Layer 1** `facing` (factory ASJ/FSK/none) then **Layer 2** `jacket` (field cover) |
| Pipe NPS size lists on duct | Duct = **circumference** / usually blank = any. Show **shape** |
| No manufacturer | `manufacturersAllowed[]` + `manufacturerPreferred` — **not** cheapest |
| “Never type codes” | Estimators get a **skip text box** → `GET spec-materials?code=FGA`. Still not a code dropdown |
| — | Setup **Buy American** checkbox **above** the table (`process.buyAmerican`) |

Aluminum / stainless / PVC covering = **layer 2**, not insulation.

---

## Setup — before the table

Same Estimating Setup screen, **above** spec sheets, next to OCIP:

| UI | Bind | Rule |
|----|------|------|
| Buy American? | `process.buyAmerican` | `true` / `false` / `null`. **Project-level.** Federal work. Not per row. |

Incomplete OK. Save with the rest of Setup.

---

## Cascade (row, in order)

Same list: `process-meta.specSheetEditor.cascade`.

```
1. Type                 Duct | HVAC pipe | Plumbing | Equipment     sheet.kind
2. System               GET spec-systems?kind=<kind>                systemName
   ↳ auto               systemCode + unit (LF/SF) — always show
3. Area                 GET spec-areas                              areaName (shared; protection below is an area)
   ↳ auto               areaCode
4. Family               process-meta.specSheetEditor.families       insulationFamily
5. Insulation           GET spec-materials?family=<id>&layer=insulation
   skip                 GET spec-materials?code=FGA  (estimators)
   ↳ auto               materialCode, facing, sizes[], thicknesses[]
6. Factory jacket       GET spec-facings                            facing   (layer 1)
7. Field covering       process-meta.specSheetEditor.coverings      jacket   (layer 2)
8. Duct shape           only if kind=duct                           ductShape
9. Size from / to       see sizeMode below                          sizeMin / sizeMax
10. Manufacturers       process-meta.specSheetEditor.manufacturers  allowed[] + preferred
11. Accessories         free text                                   accessories
12. Spec § / paragraph  e.g. 230700 / 2.6                           specSection / specParagraph
13. Notes               optional; family=other → otherNote          notes / otherNote
```

**Unit** always from the system. Do not hide it when size/thick are blank.

**Size**

| kind | `sizeMode` (auto if you omit) | UI |
|------|-------------------------------|----|
| `hydronic` / `plumbing` | `nps` | Show from/to **only if** picked material `sizes.length > 0` |
| `duct` | `circumference` | Do **not** use pipe NPS. Blank/blank = **any size** (usual). Else two buckets: 0→break, then greater→unlimited. Rarely a third. |
| `equipment` | `any` | Usually leave size blank |

`process-meta.specSheetEditor.sizes` / `thicknesses` are **[] on purpose**. After insulation pick, use **that material row’s** `sizes` / `thicknesses`. Empty → leave blank.

**Two layers.** Layer 1 = factory product + factory jacket. Layer 2 = field cover. Do not pick a combination Mike code (CSS) first — it is derived later.

Show **code next to every name**. Save names; send codes if you have them.

---

## What to build

Setup → **Add spec** → Duct / HVAC pipe / Plumbing / **Equipment**. Clone `specSheetTemplates[].empty` (6 blank rows). New `id` on the sheet **and** each row (`crypto.randomUUID()`). Never keep `new-duct`.

Sheet chrome: title, optional spec number (`230700`), footer note, images (`label=spec-sheet-image`).

**+ Add row** / delete. Multiple sheets per bid. Max 12 sheets, 60 rows, 20 images/sheet.

Incomplete rows OK. Architect / EOR stay on **Intake**.

---

## Lookups (live — do not clone)

Cache `GET /lookups/bidding/process-meta` once.

### `specSheetEditor` lists (exact ids)

**Families** (`insulationFamily`):

| id | Label |
|----|--------|
| `fiberglass` | Fiberglass |
| `elastomeric` | Elastomeric |
| `polyiso` | Polyiso |
| `phenolic` | Phenolic foam |
| `mineral_wool` | Mineral wool |
| `calcium_silicate` | Calcium silicate |
| `foamglas` | Foamglas |
| `fire_rated_duct_wrap` | Fire-rated duct wrap |
| `closed_cell_polyethylene` | Closed-cell polyethylene / bubble wrap |
| `other` | Other |

**Coverings** (`jacket`, layer 2):

`none` · `aluminum_016` · `aluminum_020` · `aluminum_024` · `stainless` · `pvc` · `canvas` · `sound_lag` · `other`

**Manufacturers** (`manufacturersAllowed` / `manufacturerPreferred`):

`owens_corning` · `johns_manville` · `knauf` · `manson` · `other`

**Duct shapes:** `rectangular` · `square` · `round` · `oval`

### HTTP

```
GET /lookups/bidding/spec-systems?kind=duct|hydronic|plumbing|equipment
    → { id, systemName, code, unit, kind, sortOrder }
    equipment: Expansion Tank, Chiller, Pumps, … if DB empty, backend still returns the list

GET /lookups/bidding/spec-areas
    → { id, areaName, code, sortOrder }

GET /lookups/bidding/spec-materials?family=fiberglass&layer=insulation
GET /lookups/bidding/spec-materials?code=FGA
GET /lookups/bidding/spec-materials?q=wrap
    → {
         id, description, code, kind, facing, jacket,
         family,          // fiberglass | …
         layer,           // insulation | covering
         skuCount,
         sizes: [{ value, label, sortOrder }],
         thicknesses: [{ value, label, sortOrder }]
       }
    ?kind= is ignored. Unfiltered GET still returns family+layer on every row (filter in the client if you cached all).

GET /lookups/bidding/spec-sizes?code=FGA          → pipe NPS. [] = leave blank. Do not use on duct.
GET /lookups/bidding/spec-thicknesses?code=FGA
GET /lookups/bidding/spec-facings                 → layer 1 factory jacket (ASJ, FSK, …)
```

On pick, copy blanks only:

| From | Onto row |
|------|----------|
| system `code` / `unit` | `systemCode` / `unit` (unit **always**) |
| area `code` | `areaCode` |
| material `code` / `family` | `materialCode` / `insulationFamily` |
| material `facing` / `jacket` / `weight` | same, if the row field is empty |

---

## API

```
GET   /bids/:id              → process.specSheets + process.buyAmerican (codes filled)
PATCH /bids/:id              { "process": { "buyAmerican": true, "specSheets": [ /* FULL array */ ] } }
POST  /bids/:id/attachments  label=spec-sheet-image
```

Arrays **replace**. `sizeMax < sizeMin` → `400`.

---

## Shape

```ts
type SpecSheetKind = 'duct' | 'hydronic' | 'plumbing' | 'equipment';

type SpecSheetRow = {
  id: string;
  systemName: string | null;
  systemCode: string | null;
  unit: string | null;
  areaName: string | null;
  areaCode: string | null;
  sizeMin: number | null;
  sizeMax: number | null;
  sizeMode: 'nps' | 'circumference' | 'any' | null;
  ductShape: 'rectangular' | 'square' | 'round' | 'oval' | null;
  insulationFamily:
    | 'fiberglass' | 'elastomeric' | 'polyiso' | 'phenolic' | 'mineral_wool'
    | 'calcium_silicate' | 'foamglas' | 'fire_rated_duct_wrap'
    | 'closed_cell_polyethylene' | 'other' | null;
  materialName: string | null;
  materialCode: string | null;
  thicknessIn: number | null;
  weight: number | null;
  facing: string | null;
  jacket: string | null;
  manufacturersAllowed: string[];
  manufacturerPreferred: string | null;
  accessories: string | null;
  specSection: string | null;
  specParagraph: string | null;
  otherNote: string | null;
  notes: string | null;
};

type SpecSheet = {
  id: string;
  kind: SpecSheetKind;
  title: string;
  specNumber: string | null;
  rows: SpecSheetRow[];
  footerNote: string | null;
  imageAttachmentIds: number[];
};
```

### Add a sheet

1. User picks Duct / HVAC / Plumbing / Equipment.
2. Clone `specSheetTemplates[].empty` from process-meta.
3. New `id` on the sheet **and** each row.
4. PATCH full `specSheets`.

### Save

Debounced `PATCH { process: { specSheets, buyAmerican } }`. Empty rows allowed. Names are enough.

```json
{
  "process": {
    "buyAmerican": true,
    "specSheets": [
      {
        "id": "8f3c1a2e-…",
        "kind": "plumbing",
        "title": "Plumbing Piping Insulation",
        "specNumber": "220719",
        "rows": [
          {
            "id": "r1",
            "systemName": "Domestic Hot Water",
            "systemCode": "DHW",
            "unit": "LF",
            "areaName": "Exposed",
            "areaCode": "E",
            "sizeMin": 0,
            "sizeMax": 1.5,
            "sizeMode": "nps",
            "ductShape": null,
            "insulationFamily": "fiberglass",
            "materialName": "Fiberglass with ASJ",
            "materialCode": "FGA",
            "thicknessIn": 1,
            "weight": null,
            "facing": "ASJ",
            "jacket": "none",
            "manufacturersAllowed": ["owens_corning", "johns_manville"],
            "manufacturerPreferred": "owens_corning",
            "accessories": null,
            "specSection": "230700",
            "specParagraph": "2.2",
            "otherNote": null,
            "notes": "*Underground piping not insulated."
          }
        ],
        "footerNote": "*Underground piping not insulated.",
        "imageAttachmentIds": [12]
      }
    ]
  }
}
```

Duct row example (any size, two layers):

```json
{
  "kind": "duct",
  "systemName": "Exhaust Air",
  "unit": "SF",
  "areaName": "Outdoor",
  "sizeMin": null,
  "sizeMax": null,
  "sizeMode": "circumference",
  "ductShape": "rectangular",
  "insulationFamily": "fiberglass",
  "materialName": "Fiberglass Duct Wrap",
  "facing": "FSK",
  "jacket": "aluminum_016"
}
```

---

## Do not

- FortuneSheet / Handsontable / free-text grid
- Rebuild Specs qty / Mike here
- Invent a second systems/areas/materials API
- Filter systems by name substring
- Filter insulation by sheet kind (use **family + layer**)
- Treat aluminum / stainless / PVC as layer-1 insulation
- Pipe NPS dropdowns on a **duct** row
- Auto-pick the cheapest manufacturer
- Global inch list from `process-meta.specSheetEditor.sizes`
- Hide **unit** when size/thick are blank
- Put Mike codes in a **dropdown** (skip text field is OK)
- Require every cell before handoff (`approvedForTakeoff` is still the only Setup → Takeoff gate)

---

## FE checklist

- [ ] Add sheet kind **Equipment**
- [ ] Family dropdown from `specSheetEditor.families`
- [ ] Materials `?family=&layer=insulation` (or filter cached list by `family` + `layer`)
- [ ] Estimator skip box → `?code=`
- [ ] Split facing (layer 1) vs jacket/coverings (layer 2)
- [ ] Duct: shape + no pipe NPS; blank size = any
- [ ] Manufacturer multi + preferred
- [ ] Accessories, spec section, spec paragraph, `otherNote`
- [ ] Setup **Buy American** above the table
- [ ] PATCH full `specSheets` array; new UUIDs
