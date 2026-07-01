---
phase: 03-service-catalog
plan: "02"
subsystem: i18n / service-catalog
tags: [services, i18n, packages, migration, astro]
dependency_graph:
  requires: [03-01-PLAN.md]
  provides: [services.json as live data source for packages section]
  affects: [PackagesSummary.astro, ServicesPage.astro, ui.ts, pages.json]
tech_stack:
  added: []
  patterns:
    - bilingual-per-entry resolution (field[lang]) for services.json tiers/addons
    - UI copy labels in pages.json servicios/services keys; data in services.json
key_files:
  created: []
  modified:
    - src/i18n/pages.json
    - src/components/sections/PackagesSummary.astro
    - src/components/sections/ServicesPage.astro
    - src/i18n/ui.ts
decisions:
  - "en.servicios key (not en.services) is correct — pages.json uses 'servicios' for both locales; verification script adapted accordingly"
  - "Type assertions (field as {es: string; en: string})[lang] used to satisfy TypeScript on bilingual JSON fields inferred as unions"
metrics:
  duration: "~10 minutes"
  completed: "2026-07-01T06:04:38Z"
  tasks_completed: 5
  files_modified: 4
---

# Phase 3 Plan 02: Migrate packages section consumers to services.json — Summary

**One-liner:** Rewired PackagesSummary and ServicesPage to import services.json directly with per-field bilingual resolution; retired packages dict from ui.ts.

## What Was Done

### Task 1 — pages.json UI label strings
Added 6 UI copy fields to both `es.servicios` and `en.servicios` in `src/i18n/pages.json`:
- `advanceNote`, `usd`, `popularBadge`, `ctaTicket`, `summaryCtaAll`, `addonsTitle`

Values copied verbatim from `packages.json` ES/EN slices.

### Task 2 — PackagesSummary.astro
- Replaced `useTranslations(lang, 'packages')` with `useTranslations(lang, 'pages').servicios`
- Added `import servicesData from '../../data/services.json'`
- Added `resolvedTiers` map applying `(field as {es:string;en:string})[lang]` resolution
- Template updated: all `t.*` references replaced with `page.*` and `resolvedTiers.map`

### Task 3 — ServicesPage.astro
- Removed `const pkg = useTranslations(lang, 'packages')`
- Added `import servicesData from '../../data/services.json'`
- Added `resolvedTiers`, `resolvedAddons`, `addonsNote` with bilingual field resolution
- Template updated: all `pkg.*` references replaced with `page.*` / `resolvedAddons` / `{addonsNote}`
- Catalog section (second `<section>`) left untouched — still shows EmptyState placeholder (Wave 3 wires it)

### Task 4 — ui.ts
- Removed `import packagesDict from './packages.json'`
- Removed `packages: packagesDict as Dict<...>` from dictionaries object
- Pre-check: `grep -rn "useTranslations.*packages" src/` returned no output (zero callsites)
- `src/i18n/packages.json` file retained as historical reference (not deleted)

### Task 5 — Build verify
- `npm run build` exited 0 in 675ms
- `dist/CNAME` = `nocturna-avatars.site`
- "Penumbra" confirmed in both `dist/es/servicios/index.html` and `dist/en/services/index.html`

## Verification Results

```
pages.json check: OK
PackagesSummary.astro grep check: OK
ServicesPage.astro grep check: OK
ui.ts grep check: OK
Build: 12 pages built in 675ms — exit 0
dist/CNAME: nocturna-avatars.site
Penumbra in dist/es/servicios/index.html: FOUND
Penumbra in dist/en/services/index.html: FOUND
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Adaptation] pages.json uses `en.servicios` not `en.services`**
- **Found during:** Task 1
- **Issue:** The plan's verification script referenced `p.en.services[k]` but the actual JSON file uses `en.servicios` for the English locale (consistent with how `useTranslations(lang, 'pages').servicios` works in components — both locales use the same key name)
- **Fix:** Added the 6 fields to `en.servicios` (the real key), verified with `p.en.servicios[k]`. No structural change to the file needed.
- **Files modified:** `src/i18n/pages.json`
- **Commit:** 71ded44

**2. [Rule 2 - TypeScript] Type assertions for bilingual JSON fields**
- **Found during:** Tasks 2 & 3
- **Issue:** The plan noted TypeScript may complain about `tier.tier[lang]` because Astro infers the JSON type as `string | {es: string; en: string}`
- **Fix:** Applied `(tier.tier as { es: string; en: string })[lang]` pattern to all bilingual fields (tier, subtitle, oneLiner, features[].text, addons[].name, addonsNote) as directed in the plan's TypeScript type notes section
- **Files modified:** `src/components/sections/PackagesSummary.astro`, `src/components/sections/ServicesPage.astro`

## Catalog Section Status

The second `<section>` in `ServicesPage.astro` (Catálogo modular / Modular catalog) still shows the original `EmptyState` placeholder. This is intentional — Wave 3 (Plan 03) will wire the modular catalog items from `services.json`.

## Commits

| Task | Hash    | Message |
|------|---------|---------|
| 1    | 71ded44 | feat(03-02): add UI label strings to pages.json servicios/services keys |
| 2    | dcfe618 | feat(03-02): rewire PackagesSummary.astro to read tiers from services.json |
| 3    | fc265d3 | feat(03-02): rewire ServicesPage.astro packages section to services.json |
| 4    | 2c00420 | chore(03-02): remove packages dict from ui.ts registry |
| 5    | (build verify — no file changes) | Build green; Penumbra confirmed in both locale outputs |

## Known Stubs

None — all three package tiers (Penumbra, Umbra, Eclipse) render from real services.json data in both ES and EN.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced. Only static JSON imports and component rewiring.

## Self-Check: PASSED

- src/i18n/pages.json: FOUND
- src/components/sections/PackagesSummary.astro: FOUND
- src/components/sections/ServicesPage.astro: FOUND
- src/i18n/ui.ts: FOUND
- .planning/phases/03-service-catalog/03-02-SUMMARY.md: FOUND
- Commits 71ded44, dcfe618, fc265d3, 2c00420: ALL FOUND in git log
