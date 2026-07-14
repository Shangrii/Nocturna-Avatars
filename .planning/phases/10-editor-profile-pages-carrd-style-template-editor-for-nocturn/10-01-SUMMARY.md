---
phase: 10-editor-profile-pages-carrd-style-template-editor-for-nocturn
plan: 01
subsystem: ui
tags: [astro, i18n, routing, data-contract, editors]

# Dependency graph
requires:
  - phase: 06-asset-store
    provides: routeSlugs/navConcepts/localizedPath route map + pages.json/nav.json dictionary idiom
provides:
  - "src/data/editors.json committed as [] — the D-18 array data contract (admin app / bot commit target)"
  - "editors route concept (es=editores / en=editors) in routeSlugs + navConcepts"
  - "editorPath(slug, lang) per-editor path helper (/en/editors/<slug> · /es/editores/<slug>)"
  - "navEditors nav label + editores pages dictionary slice (both locales)"
  - "Canonical editors.json entry+block schema locked inline for all downstream 10-* plans"
affects: [10-02, 10-04, 10-05, 10-06, 10-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Contracts-first: data shape + routing locked before any consuming component/page exists"
    - "Per-item path helper (editorPath) distinct from concept-only localizedPath"
    - "Committed empty [] data file so an absent/empty externally-written file never breaks the build"

key-files:
  created:
    - src/data/editors.json
  modified:
    - src/i18n/routes.ts
    - src/i18n/nav.json
    - src/i18n/pages.json
    - src/components/Nav.astro

key-decisions:
  - "editors.json is a bare [] array (D-18) — no _comment/object wrapper; admin app is sole writer; byte-matches bot json.dumps(indent=2)"
  - "editors added to navConcepts now so the directory becomes a real nav concept (D-20); the directory PAGE itself ships in 10-07"
  - "No availability/status badge field in the schema — contact stays the existing Abrir Ticket CTA (D-01)"

patterns-established:
  - "editorPath(slug, lang) is the canonical per-editor link builder; per-editor language switching that carries the slug is deferred to 10-07"

requirements-completed: [EDIT-01, EDIT-02, EDIT-05, EDIT-08]

# Metrics
duration: ~12min
completed: 2026-07-14
---

# Phase 10 Plan 01: Editors Data + Routing Contract Summary

**Locked the website-side editor-profile contract: `editors.json = []` (D-18 array schema), the `editors` route concept (es=editores/en=editors) with an `editorPath()` helper, the nav link, and the `editores` i18n dictionary slice in both locales — build stays green.**

## Performance

- **Duration:** ~12 min
- **Tasks:** 3
- **Files created:** 1
- **Files modified:** 4

## Accomplishments
- Shipped `src/data/editors.json` as a committed empty array, mirroring `gallery.json`/`reviews.json`, so the whole-site build never breaks on an absent/empty externally-written file (T-10-01-02).
- Registered the `editors` route concept in `routeSlugs` (`{ es: 'editores', en: 'editors' }`) and `navConcepts`, with a new `editorPath(slug, lang)` helper producing `/en/editors/<slug>` · `/es/editores/<slug>`. Directory reverse-lookup round-trips through `conceptForSlug`/`translatePath` automatically.
- Added `navEditors` (Editores/Editors) and an `editores` pages-dictionary slice (tag/title/subtitle/emptyHeading/emptyBody/emptyCta + meta) in both locales, using UI-SPEC Surface A copy verbatim; the nav auto-derives the Editors/Editores link from `navConcepts` via `conceptLabels`.
- Documented the canonical `editors.json` entry + closed block union inline in the plan's `<interfaces>` so 10-02/10-04/10-05/10-06/10-07 implement against a fixed shape.

## Task Commits

Each task was committed atomically:

1. **Task 1: Ship editors.json contract** - `6508f94` (feat)
2. **Task 2: Register editors route concept + editorPath helper** - `910f487` (feat)
3. **Task 3: Add nav label + pages dictionary slice (ES+EN)** - `f7cc5f1` (feat)

## Files Created/Modified
- `src/data/editors.json` - Empty `[]` array; the D-18 data contract and admin/bot commit target
- `src/i18n/routes.ts` - `editors` in `PageConcept`/`routeSlugs`/`navConcepts`; new `editorPath()` helper
- `src/i18n/nav.json` - `navEditors` label (Editores/Editors) in both locales
- `src/i18n/pages.json` - `editores` dictionary slice (both locales) with directory + empty-state copy
- `src/components/Nav.astro` - `conceptLabels.editors = t.navEditors` (auto-derives the nav link)

## Decisions Made
- Kept `editors.json` a bare `[]` (not a `_comment` object wrapper) — D-18 array shape takes precedence over `store.json`'s object idiom because the admin app is the sole writer, and it byte-matches the bot's `json.dumps(array, ensure_ascii=False, indent=2)` output.
- Added `editores` `metaTitle`/`metaDescription` alongside the required fields to mirror the `galeria` slice shape faithfully (the directory page in 10-07 will consume them). Minor, in-scope extension of the "mirror galeria/tienda" instruction.
- `emptyCta` set to the ticket label ("Abrir Ticket" / "Open a Ticket") consistent with the existing `tienda` slice, per the "reuse the existing ticket label key" instruction.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- The Task 2 `node --experimental-strip-types` verify command failed with `ERR_MODULE_NOT_FOUND` because `routes.ts` imports `./ui` extensionless and node's strict ESM resolver won't resolve `.ts` without the extension (environment quirk, not a code defect). Used the plan's documented fallback path via `npx tsx` to run the identical assertions (editorPath both locales, `navConcepts.includes('editors')`, `conceptForSlug` round-trip, `routeSlugs.editors`) — all passed. The full `npm run build` in Task 3 additionally type-checks and renders `routes.ts` end-to-end (14 pages built, green).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The data + routing + i18n contract is locked. Downstream plans can now build against a fixed shape:
  - 10-04 (block library) / 10-07 (pages) render the closed block union and consume `editorPath()`.
  - 10-02 (bot pydantic model) / 10-05 (bot transport) mirror the `editors.json` entry schema.
- Known open by design: the `/en/editors` · `/es/editores` DIRECTORY page is not yet generated (nav links resolve to a not-yet-built route until 10-07 ships the page + `getStaticPaths`). This is intentional per the plan; the nav markup and link are present in `dist`.

## Self-Check: PASSED

All 6 files exist on disk; all 3 task commits (`6508f94`, `910f487`, `f7cc5f1`) present in git history.

---
*Phase: 10-editor-profile-pages-carrd-style-template-editor-for-nocturn*
*Completed: 2026-07-14*
