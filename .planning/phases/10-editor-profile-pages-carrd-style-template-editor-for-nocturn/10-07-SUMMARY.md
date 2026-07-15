---
phase: 10-editor-profile-pages-carrd-style-template-editor-for-nocturn
plan: 07
subsystem: ui
tags: [astro, i18n, routing, per-item-route, editors, directory, xss-safety]

# Dependency graph
requires:
  - phase: 10-editor-profile-pages-carrd-style-template-editor-for-nocturn
    plan: 01
    provides: editors.json contract, editors route concept, editorPath, translatePath, editores pages dict
  - phase: 10-editor-profile-pages-carrd-style-template-editor-for-nocturn
    plan: 04
    provides: BlockRenderer + editorTypes (Editor/EditorBlock) render layer
provides:
  - "src/pages/[lang]/[concept]/[slug].astro — the site's first per-ITEM × per-lang static route (/en/editors/<slug> · /es/editores/<slug>)"
  - "src/components/sections/EditorsDirectory.astro — published-editor card grid + EmptyState (D-20)"
  - "translatePath now carries the editor <slug> across locales (per-editor language switch)"
  - "editors concept wired into [lang]/[page].astro (directory pages build in both locales)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "First per-item × per-lang dynamic route via a DYNAMIC [concept] middle segment so the directory slug localizes (editors/editores) — a literal folder can't"
    - "getStaticPaths cartesian product: published editors × langCodes, defensive copy-before-filter so one malformed/unpublished entry never breaks the whole-site build"
    - "translatePath detects the editors concept from the first path segment and reattaches the trailing slug (item-level, not concept-level)"
    - "Directory section mirrors StorePage's defensive read → filter → sort → grid/EmptyState discipline"

key-files:
  created:
    - src/pages/[lang]/[concept]/[slug].astro
    - src/components/sections/EditorsDirectory.astro
  modified:
    - src/i18n/routes.ts
    - src/pages/[lang]/[page].astro

key-decisions:
  - "Route lives at [lang]/[concept]/[slug].astro (dynamic middle segment), NOT the plan's literal [lang]/editores/[slug].astro — a literal folder emits /en/editores/... for BOTH locales and fails D-19's /en/editors/<slug>. Emitting routeSlugs.editors[lang] as the concept param is what localizes the directory slug."
  - "Header custom links (editor.links) render as their own stacked link-buttons distinct from a links block — they are core header fields per D-01, not a block."
  - "Per-editor meta title/description derived from editor name + tagline (no per-editor dictionary needed)."

requirements-completed: [EDIT-01, EDIT-02]

# Metrics
duration: ~12min
completed: 2026-07-14
---

# Phase 10 Plan 07: Public Editor Pages + Directory Summary

**Shipped Surface A — the site's first per-item × per-lang dynamic route (`/en/editors/<slug>` · `/es/editores/<slug>`) rendering the header + ordered blocks via the 10-04 BlockRenderer in a ~640px ink column, plus the `/editores` · `/editors` directory (D-20) with an EmptyState fallback, and extended `translatePath` so the language switcher carries the editor `<slug>` between locales.**

## Performance

- **Duration:** ~12 min
- **Tasks:** 2 auto tasks executed + 1 lint cleanup (Task 3 is a human-verify checkpoint, pending post-merge)
- **Files created:** 2
- **Files modified:** 2

## Accomplishments
- Created `src/pages/[lang]/[concept]/[slug].astro`: `getStaticPaths` emits the cartesian product of published editors (`published===true` + valid string slug) × `langCodes`, passing each editor as a prop. The page wraps `BaseLayout` (inherits Nav/Footer/FloatingCTA/LanguageSwitcher/NightBackground so "Abrir Ticket" stays reachable — NAV-03), renders the header (circular 120–160px avatar, red-accent name in Space Grotesk 700, dim tagline, stacked custom link-buttons with `rel="noopener noreferrer nofollow"`), then loops `editor.blocks` in order through `<BlockRenderer>` at `md` (24px) rhythm inside a ~640px centered ink column. Every read is defensive so a malformed/unpublished entry never fails the build; empty `editors.json` → zero editor pages, build stays green.
- Extended `translatePath` in `routes.ts`: when the path is `/<lang>/<editorsSlug>/<slug>` it detects the editors concept from the first path segment and rebuilds the counterpart with the same slug via `editorPath`, so the language switch lands on `/es/editores/<slug>` instead of the locale root. Verified: `translatePath('/en/editors/aria','es') → /es/editores/aria` and the reverse.
- Created `src/components/sections/EditorsDirectory.astro` modeled on `StorePage`: defensive copy-before-filter of `editors.json` keeping only `published` entries with a string slug, sorted A→Z by name, rendered as a responsive 1→2→3-column card grid (`lg` 32px gap) of avatar + red-accent name + tagline cards, each linking via `editorPath`. Empty list falls back to the branded `EmptyState` (heading/body/ctaTicket from the `editores` dict) so an empty directory never looks broken and the Discord CTA stays reachable.
- Wired the `editors` branch into `[lang]/[page].astro` (getStaticPaths `staticPathsForConcept('editors')`, meta from the `editores` dict, and the `EditorsDirectory` render), so `/en/editors` · `/es/editores` build (16 pages total).

## Task Commits

1. **Task 1: Per-editor page route + slug-carrying language switch** — `9b31dd2` (feat)
2. **Task 2: EditorsDirectory section + wire editors concept** — `2097825` (feat)
3. **Lint cleanup: drop unused Lang type import** — `d273943` (refactor)

## Files Created/Modified
- `src/pages/[lang]/[concept]/[slug].astro` — per-editor × per-lang route; cartesian getStaticPaths; header + BlockRenderer loop; defensive read; no raw-HTML directive
- `src/components/sections/EditorsDirectory.astro` — published-editor card grid + EmptyState (D-20); StorePage-style defensive read
- `src/i18n/routes.ts` — `translatePath` carries the editor slug across locales
- `src/pages/[lang]/[page].astro` — `editors` concept branch (staticPaths + meta + render)

## Decisions Made
- **Dynamic `[concept]` middle segment instead of a literal `editores/` folder.** See Deviations — this is the substantive shape change required to satisfy D-19.
- **Header custom links are core fields, not a block.** `editor.links` render as their own stacked link-buttons in the header (D-01: name/avatar/tagline/links are core), separate from any `links` block an editor adds to `blocks[]`.
- **Per-editor meta from name + tagline.** `title = "${name} — Nocturna Avatars"`, `description = tagline || name` — no separate per-editor dictionary needed; the `editores` dict covers only the directory.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Route path changed to a dynamic concept segment so the EN directory slug localizes**
- **Found during:** Task 1 (first build)
- **Issue:** The plan specified `src/pages/[lang]/editores/[slug].astro`. A literal `editores/` folder is a STATIC path segment, so Astro emitted BOTH locales under it — `/en/editores/aria` and `/es/editores/aria` — which violates D-19 ("Routes: /es/editores/<slug> · /en/editors/<slug>") and the plan's own acceptance criteria / verify command (`ls dist/en/editors/`). The EN page must live at `/en/editors/<slug>`.
- **Fix:** Renamed the route to `src/pages/[lang]/[concept]/[slug].astro` with a DYNAMIC middle segment, emitting `params: { lang, concept: routeSlugs.editors[lang], slug }`. This localizes the directory slug (`editors` en / `editores` es), producing `/en/editors/aria` and `/es/editores/aria` as required. No collision with `[lang]/[page].astro` (2 segments vs 3). All other plan behavior (cartesian product, defensive read, header + blocks) is unchanged.
- **Files modified:** src/pages/[lang]/[concept]/[slug].astro (the file the plan named `editores/[slug].astro`)
- **Commit:** 9b31dd2

**2. [Rule 1 - Lint] Removed an unused `Lang` type import**
- **Found during:** Post-Task-2 `astro check`
- **Issue:** `[concept]/[slug].astro` imported `type Lang` but never referenced it (ts 6133 warning).
- **Fix:** Dropped `Lang` from the `../../../i18n/ui` import; build + check clean.
- **Commit:** d273943

## Deferred / Checkpoint

**Task 3 (`checkpoint:human-verify`, gate=blocking) is NOT auto-approved** — auto-advance is off (`.planning/config.json` workflow.auto_advance=false), and visual verification cannot be automated. All automatable code is complete and build-verified; the human visual sign-off against the UI-SPEC is pending and should be performed by the orchestrator/user after this worktree merges. See "Human-Verify Checkpoint" below for the exact steps.

## Issues Encountered
- **`astro check` requires an interactive install of `@astrojs/check` + `typescript`** (not in the manifest — same environment gap the 10-01/10-04 executors hit). Installed with `npm i --no-save` so no committed manifest/lockfile diff. My two new `.astro` files + `routes.ts` are warning/error-clean.
- **`astro check` reports 25 pre-existing errors** in the phase-6 store scripts (`cart.ts`, `store-cart.ts`, `store.ts`) — the known "Cannot redeclare block-scoped variable" / "Duplicate function implementation" quirk of type-checking sibling inline `<script>` modules in a shared global scope. **Zero** are in my files; out of scope (SCOPE BOUNDARY — pre-existing, not caused by this plan). `npm run build` is green (16 pages).

## Human-Verify Checkpoint (Task 3 — pending, post-merge)
1. Add one sample entry to `src/data/editors.json` (published, a couple of blocks incl. `portfolio`) or use a temporary fixture, then `npm run dev`.
2. Visit `/en/editors` and `/es/editores` — confirm the directory grid + card layout, and the EmptyState-when-empty behavior (reset to `[]`).
3. Visit `/en/editors/<slug>` — confirm ~640px centered ink column, circular avatar, red-accent name, tagline, link-buttons, block order/rhythm, AA contrast, responsive at 375/768/1024/1440, and "Abrir Ticket" reachable.
4. Toggle the language switcher on the editor page — confirm it lands on `/es/editores/<slug>` (slug carried), not the locale root.
5. **Reset `editors.json` to `[]` before approving** (it must ship empty — the admin app/bot is the sole writer).

## Self-Check: PASSED

- Files exist: `src/pages/[lang]/[concept]/[slug].astro` ✓, `src/components/sections/EditorsDirectory.astro` ✓
- Commits present: `9b31dd2` ✓, `2097825` ✓, `d273943` ✓
- `npm run build` green (16 pages); `editors.json` unmodified (`[]`); no `set:html` in either new component; `/en/editors/<slug>` · `/es/editores/<slug>` + `/en/editors` · `/es/editores` verified with a temporary fixture.

---
*Phase: 10-editor-profile-pages-carrd-style-template-editor-for-nocturn*
*Completed: 2026-07-14*
