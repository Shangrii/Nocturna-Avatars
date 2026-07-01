# Phase 3: Service Catalog - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-30
**Phase:** 03-service-catalog
**Areas discussed:** Data file — location & bilingual, Catalog content, Catalog layout, Add-ons

---

## Data File — Location & Bilingual

### Q1: Where should services.json live?

| Option | Description | Selected |
|--------|-------------|----------|
| `src/data/services.json` | Astro static import at build time — typed, no runtime fetch, collocated with source | ✓ |
| `public/data/services.json` | Public asset, fetched at runtime — overkill for static Astro site | |
| `src/i18n/` alongside packages.json | Stays in i18n dir; consistent pattern but mixes catalog data with UI copy | |

**User's choice:** `src/data/services.json`

---

### Q2: How should ES/EN content live in services.json?

| Option | Description | Selected |
|--------|-------------|----------|
| Two-lang-per-entry | Each item has `{name: {es, en}, price}` — one file, both languages together | ✓ |
| Two separate files | `services.es.json` + `services.en.json` — simple but staff must keep two files in sync | |
| English only + i18n for labels | English text in JSON, translated labels in pages.json — not fully bilingual | |

**User's choice:** Two-lang-per-entry

---

### Q3: Should package tiers migrate from packages.json into services.json?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep packages.json separate, add services.json for catalog only | Minimal migration risk; two files for staff to know about | |
| Migrate everything into services.json (one source of truth) | Packages + add-ons + catalog all in one file; staff edit one file | ✓ |

**User's choice:** Migrate everything

---

### Q4: Top-level structure of services.json?

| Option | Description | Selected |
|--------|-------------|----------|
| `{ packages: {...}, catalog: [...] }` flat keys | Clear section separation; staff know which key to edit | ✓ |
| `{ packages: {...}, catalog: { unity: [...], blender: [...], ... } }` | Keyed object — harder to add new categories | |

**User's choice:** `{ packages: { tiers, addons, addonsNote }, catalog: [] }`

---

## Catalog Content

### Q1: Real items or schema-ready shell?

| Option | Description | Selected |
|--------|-------------|----------|
| Ship with real items — have the list | Provide catalog items now; ships with live content | |
| Schema-ready shell — staff populate later | Define schema and structure; staff add items once prices agreed | ✓ |

**User's choice:** Schema-ready shell

---

### Q2: Empty category behavior?

| Option | Description | Selected |
|--------|-------------|----------|
| "Coming soon" / empty state per category | Render EmptyState component when items array is empty | ✓ |
| Hide empty categories entirely | Don't render a category with no items | |
| Show categories with CTA only | Category header + "Cotizar" / "Open a Ticket" button, no item list | |

**User's choice:** "Coming soon" empty state per category (reuse EmptyState.astro)

---

### Q3: Category list — dynamic or hardcoded?

| Option | Description | Selected |
|--------|-------------|----------|
| Category list from services.json | Catalog array contains category objects; staff add categories in JSON | ✓ |
| Categories hardcoded in the component | 5 fixed category keys; staff can't add categories without code | |

**User's choice:** Category list from services.json

---

## Catalog Layout

### Q1: How should individual services display?

| Option | Description | Selected |
|--------|-------------|----------|
| Editorial rows — name + price side-by-side | Horizontal row, hairline rule between items, Space Mono for prices | ✓ |
| Cards grid | One card per service — more visual weight, new card variant needed | |
| Accordion — category headers collapse/expand | JS complexity, hides content by default | |

**User's choice:** Editorial rows

---

### Q2: Description field per service item?

| Option | Description | Selected |
|--------|-------------|----------|
| Name + price only | Simple schema; catalog is a quick-scan pricing reference | ✓ |
| Name + optional description + price | Short subtitle under name — more content for staff to maintain | |

**User's choice:** Name + price only

---

### Q3: Category visual separator?

| Option | Description | Selected |
|--------|-------------|----------|
| Section tag + category title, then rows | Editorial section-tag pattern (Space Mono uppercase, red) + heading | ✓ |
| Tab bar — click category to show services | Compact but JS-heavy; hides content by default | |

**User's choice:** Section tag + category title pattern (consistent with existing sections)

---

## Add-ons

### Q1: Where do add-ons belong?

| Option | Description | Selected |
|--------|-------------|----------|
| Inside packages in services.json | `packages.addons[]` — add-ons are package modifiers, not catalog services | ✓ |
| Treat add-ons as a special catalog category | Unified list structure but logical mismatch | |

**User's choice:** Add-ons nested inside `packages` key

---

### Q2: addonsNote — prose note or CTA?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep as free-text bilingual note | `addonsNote: {es, en}` — staff edit prose in services.json | ✓ |
| Replace with CTA button | "Get a custom quote" button opens Discord modal; loses explanatory context | |

**User's choice:** Keep as free-text note

---

## Claude's Discretion

- Exact CSS for editorial row layout (name/price spacing, hairline style, hover)
- Tailwind token choices for catalog section surface (ink vs. paper alternation)
- Wording for per-category "coming soon" empty state text
- Whether to add a `ui` key to services.json for section headings vs. keeping those in pages.json

## Deferred Ideas

None — discussion stayed within Phase 3 scope.
