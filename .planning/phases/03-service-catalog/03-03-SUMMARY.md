---
phase: 03-service-catalog
plan: "03"
subsystem: services-catalog
tags: [catalog, components, astro, i18n, services-json]
dependency_graph:
  requires: [03-01-PLAN.md, 03-02-PLAN.md]
  provides: [CatalogSection.astro, ServicesPage-wired]
  affects: [src/components/sections/ServicesPage.astro]
tech_stack:
  added: []
  patterns:
    - "Prop-drilling bilingual data: parent resolves lang, passes strings to child components"
    - "TypeScript type assertion for bilingual object indexing: (obj as {es:string;en:string})[lang]"
    - "Scoped Astro CSS for component-specific rules; global sections.css for shared patterns"
    - "Cotizar sentinel pattern: price.toLowerCase() === 'cotizar' → red color + normalized display text"
key_files:
  created:
    - src/components/CatalogSection.astro
  modified:
    - src/components/sections/ServicesPage.astro
decisions:
  - "CatalogSection receives emptyHeading/emptyBody/emptyTicketLabel as props (not bilingual objects) — parent resolves lang before passing, keeps child interface simple"
  - "EmptyState renders per-category (not one global empty) so each category shows its own Próximamente block — consistent with D-06 (show all 5 categories, never hide empty ones)"
  - "Removed EmptyState direct import from ServicesPage.astro — CatalogSection owns EmptyState internally; ServicesPage no longer needs it"
  - "Removed unused const empty = useTranslations(lang, 'pages').emptyState — the old single-catalog EmptyState placeholder is now replaced by CatalogSection"
metrics:
  duration: "2m 52s"
  completed: "2026-07-01"
  tasks_completed: 3
  files_changed: 2
---

# Phase 03 Plan 03: CatalogSection Build and Wire Summary

CatalogSection.astro created with editorial rows, Cotizar sentinel, per-category EmptyState, and GSAP reveal hooks; fully wired into ServicesPage.astro replacing the Phase 1 EmptyState placeholder — build green, all 5 categories visible in ES and EN.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create CatalogSection.astro | 93995e7 | src/components/CatalogSection.astro (created) |
| 2 | Wire CatalogSection into ServicesPage | a98d69e | src/components/sections/ServicesPage.astro |
| 3 | Final build verify | (no commit) | dist/ verified only |

## What Was Built

### CatalogSection.astro

New component that loops `services.catalog[]` dynamically (D-07). For each category:

- **Section-tag header:** `<div class="section-header reveal">` with `.section-tag` and `.section-title` — reuses global rules from `sections.css`; the `.section--surface .section-tag` rule in sections.css already applies the `--color-red-on-paper` color automatically.
- **Editorial rows (when items exist):** `<ul class="catalog-rows">` / `<li class="catalog-row">` — semantic, accessible (`aria-label` per category). Flex layout: name left (Inter 16px), price right (Space Mono 16px tabular). 1px hairline borders via `color-mix(in srgb, var(--color-ink-on-paper) 14%, transparent)`.
- **Cotizar sentinel:** `item.price.toLowerCase() === 'cotizar'` triggers `catalog-row__price--cotizar` class → `color: var(--color-red-on-paper)`, display text normalized to "Cotizar".
- **EmptyState (when items is empty):** Renders `EmptyState` component with bilingual copy passed from parent. All 5 categories currently render empty states — correct per D-05/D-06.
- **Reveal hooks:** `reveal` class on section headers and content containers, picked up by existing GSAP ScrollTrigger from Phase 2 without changes.
- **TypeScript:** All bilingual object access uses type assertions (`(obj as {es:string;en:string})[lang]`) to satisfy strict TypeScript inference.

### ServicesPage.astro changes

- Replaced `import EmptyState` with `import CatalogSection`
- Removed `const empty = useTranslations(lang, 'pages').emptyState` (no longer used)
- Added bilingual catalog empty-state strings resolved from `lang` prop
- Replaced the single `<div class="reveal"><EmptyState .../></div>` placeholder in the catalog section with `<CatalogSection catalog={servicesData.catalog} lang={lang} emptyHeading={...} emptyBody={...} emptyTicketLabel={...} />`
- Outer `<section class="section section--surface section--rule">` wrapper and global catalogTag/catalogTitle `section-header` preserved above CatalogSection

## Build Verification

All verification checks passed:

| Check | Result |
|-------|--------|
| `npx astro build` exit code | 0 (895ms, 12 pages) |
| `dist/CNAME` | `nocturna-avatars.site` |
| "Próximamente" in ES built HTML | Present (5 occurrences — one per category) |
| "Coming Soon" in EN built HTML | Present (5 occurrences — one per category) |
| "Eclipse" in ES and EN pages | Present (packages section unbroken) |
| Unity / Blender / Texturas / Accesorios / Extras in ES | All present |
| Unity / Blender / Textures / Accessories / Extras in EN | All present |
| TypeScript errors | None |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

All 5 catalog categories have `items: []` — this is intentional per Phase 3 specification (D-05: "all 5 categories ship empty at first deploy"). Staff populate items by editing `services.json`; the EmptyState renders per-category until items are added. This is not a stub defect — it is the designed initial state tracked for staff workflow (CAT-04).

## Phase 3 Success Criteria — Met

- A visitor on /es/servicios and /en/services sees all 5 catalog category blocks with bilingual names (CAT-02).
- "Cotizar" sentinel pattern is implemented in CSS and logic — will render red when staff set price to "cotizar" in services.json (CAT-03).
- Staff can add items to any catalog category in services.json and they render in ES and EN with no code changes required (CAT-04).
- Design matches UI-SPEC: section-tag pattern, editorial rows, paper surface, GSAP reveal hooks.
- Phase 3 goal achieved: packages + catalog both rendered entirely from services.json.

## Self-Check: PASSED

- `src/components/CatalogSection.astro` exists: FOUND
- `src/components/sections/ServicesPage.astro` modified: FOUND
- Commit 93995e7 exists: FOUND
- Commit a98d69e exists: FOUND
- Build dist/es/servicios/index.html exists: FOUND
- Build dist/en/services/index.html exists: FOUND
