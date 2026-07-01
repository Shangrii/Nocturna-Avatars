---
plan: 03-01
phase: 03-service-catalog
status: complete
completed: 2026-06-30
duration: ~5min
files_changed: 1
tasks_completed: 2
tasks_total: 2
commit: 994e6fb
subsystem: data
tags: [data, i18n, services, catalog]
dependency_graph:
  requires: []
  provides: [src/data/services.json]
  affects: [Plan 03-02 PackagesSummary, Plan 03-03 ServicesPage]
tech_stack:
  added: []
  patterns: [bilingual-per-entry {es,en} schema (D-02)]
key_files:
  created:
    - src/data/services.json
  modified: []
decisions:
  - "Eclipse featured:true corrected (packages.json had it inverted vs UI-SPEC)"
  - "Umbra featured:false (was true in packages.json)"
  - "5 catalog categories seeded with empty items[] per D-05"
---

# Phase 3 Plan 01: services.json Created

Single source of truth for all service content: bilingual-per-entry schema with 3 package tiers, 8 add-ons, addonsNote, and 5 empty catalog categories.

## What was built

- `src/data/services.json`: bilingual-per-entry `{es,en}` schema (D-02) with:
  - `packages.tiers[]`: 3 tiers — Penumbra ($40), Umbra ($60), Eclipse ($90)
  - `packages.addons[]`: 8 add-ons with bilingual names and original prices
  - `packages.addonsNote`: bilingual `{es,en}` object with verbatim note
  - `catalog[]`: 5 category objects (unity, blender, textures, accessories, extras) with empty `items[]` arrays
- Eclipse `featured: true` corrected from packages.json inversion (UI-SPEC §Featured Package Card)
- Umbra `featured: false` (was `true` in packages.json)

## Verification

- JSON validation script: **OK** — all 3 tiers, 8 add-ons, 5 catalog categories pass bilingual checks
- Eclipse `featured: true` confirmed
- `npm run build`: exit 0, 12 pages built in 1.49s
- `dist/CNAME` = `nocturna-avatars.site`
- No existing source files modified (git diff shows only new file)

## Deviations from Plan

None — plan executed exactly as written. The Eclipse/Umbra `featured` flag inversion was an expected correction documented in the plan itself, not a deviation.

## Known Stubs

`catalog[].items` arrays are intentionally empty per D-05. Staff populate prices once agreed; no code change needed. Plans 02/03 wire the catalog shell into components. These are tracked as intentional — future plans will populate items.

## Next

Wave 2 (03-02-PLAN.md): migrate PackagesSummary + ServicesPage consumers to read from services.json

## Self-Check: PASSED

- `src/data/services.json` exists: FOUND
- Commit `994e6fb` exists: FOUND
- No existing files modified
- Build green, CNAME correct
