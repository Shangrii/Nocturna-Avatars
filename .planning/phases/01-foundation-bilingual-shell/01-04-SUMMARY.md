---
phase: 01-foundation-bilingual-shell
plan: 04
subsystem: ui
tags: [astro, i18n, legal, terms, localized-slugs, responsive, cutover, github-pages]

# Dependency graph
requires:
  - phase: 01-01
    provides: BaseLayout chrome, useTranslations helper, brand tokens, root English-first redirect, CNAME + deploy workflow
  - phase: 01-02
    provides: global chrome (nav, globe switcher, footer, floating CTA, Discord modal), .dc-trigger contract
  - phase: 01-03
    provides: routes.ts concept→slug map (terms already mapped /es/terminos · /en/terms), [lang]/[page].astro resolver, English-first default locale, localized slugs
provides:
  - Full Terms & Conditions page in both locales via the resolver — /es/terminos (ES verbatim) and /en/terms (EN draft)
  - terms.json dictionary (10 numbered blocks ES verbatim + faithful EN draft, 4-item summary, EN banner copy)
  - ReviewerBanner component — prominent EN-only "pending legal review" draft notice (D-13)
  - terms.css — tokenized long-form legal styling (--lh-legal 1.8), reviewer banner, summary, numbered blocks
  - Responsiveness finalization: footer bottom-clearance so the floating CTA never covers footer links/copy (PLAT-04)
  - Cutover-parity build: all 11 routes emit + CNAME preserved in dist (PLAT-02, D-09 — domain survival pending the user's go-live cutover)
affects:
  - 03 (services catalog renders into the /servicios·/services shell)
  - 04 (gallery renders into the /galeria·/gallery shell)
  - "go-live cutover (user action): push revamp + set Pages Source → GitHub Actions, confirm custom domain stays bound"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Terms ships as a *concept* in the central route map + [lang]/[page].astro resolver (no standalone terminos.astro) — nav/switcher pick it up automatically via routes.ts"
    - "Long-form legal copy modeled as per-segment {text, strong?} arrays in the dictionary so bold clauses are static template markup, never set:html (T-01-13)"
    - "EN legal text ships as a flagged DRAFT behind a prominent ReviewerBanner; ES is authoritative/verbatim (D-13)"
    - "Floating-CTA/footer overlap solved by reserving footer bottom-clearance (token-sized to the CTA height + offset) rather than per-page hacks"

key-files:
  created:
    - src/i18n/terms.json
    - src/components/ReviewerBanner.astro
    - src/components/sections/TermsPage.astro
    - src/styles/terms.css
  modified:
    - src/i18n/ui.ts
    - src/pages/[lang]/[page].astro
    - src/styles/chrome.css

key-decisions:
  - "Terms wired into the [lang]/[page].astro resolver (added staticPathsForConcept('terms') + a terms branch), NOT a standalone [lang]/terminos.astro — matches the post-01-03 localized-slug foundation; URLs are /es/terminos and /en/terms"
  - "ES Terms ported VERBATIM from the old site (all 10 blocks, bolded clauses intact: 50% anticipo, no Unity .unitypackage, 48h, 5 días hábiles) — D-12"
  - "EN Terms are a faithful Claude-written DRAFT gated by a prominent EN-only ReviewerBanner noting Spanish is authoritative — D-13; banner removal is the user's later legal-signoff action"
  - "Standalone src/pages/index.html.astro OMITTED: it collides with the root index.astro's dist/index.html output (Astro emits index.html/ as a directory). The root English-first redirect already serves legacy /index.html and resolves Spanish browsers to /es/ — D-02 intent fully met"
  - "Responsiveness pass needed only one fix (footer clearance for the floating CTA); hamburger drawer, in-flow lang dropdown, clamp() type, ≥44px targets, and global overflow-x guard were already in place from 01-02/01-03"

patterns-established:
  - "Add a legal/content page = add a concept to routes.ts + a branch in the resolver + a dictionary; no new route file needed"
  - "Author-controlled rich text in dictionaries uses {text, strong?} segment arrays, never raw HTML"

requirements-completed: [I18N-04]

# Metrics
duration: 6min
completed: 2026-06-28
---

# Phase 1 Plan 04: Terms & Cutover Parity Summary

**Full bilingual Terms & Conditions wired through the localized-slug resolver — /es/terminos (ES verbatim from the live site) and /en/terms (a faithful EN draft gated by a prominent "pending legal review" reviewer banner) — plus a responsiveness finalization (footer clearance for the floating CTA) and a CNAME-preserving, parity-ready build for the user's GitHub Pages cutover.**

## Performance

- **Duration:** ~6 min (implementation; excludes the user's local human-verify)
- **Started:** 2026-06-28T18:26:19Z
- **Completed:** 2026-06-28T18:32:47Z
- **Tasks:** 2 implementation + 1 human-verify checkpoint (APPROVED by the user locally)
- **Files:** 4 created, 3 modified

## Accomplishments

- **Terms in both locales via the resolver** — added the `terms` concept to `src/pages/[lang]/[page].astro` (`staticPathsForConcept('terms')` + a `concept === 'terms'` branch). `routes.ts` already mapped the slugs, so the emitted URLs are **`/es/terminos`** and **`/en/terms`**, and the nav + globe language switcher pick them up automatically (on `/en/terms` → Español → `/es/terminos`).
- **ES Terms ported VERBATIM** from the old `index.html` — all 10 numbered blocks (01 Proceso de trabajo … 10 Modificaciones) with the bolded clauses intact: *50% del total como anticipo*, *No se entrega el proyecto de Unity (.unitypackage)*, *48 horas*, *5 días hábiles* — plus the 4-item summary intro.
- **EN Terms** are a faithful Claude-written **draft**, gated by a prominent accent-bordered **ReviewerBanner** ("Draft — translation pending legal review", noting Spanish is authoritative). The banner renders **only** on `/en/terms` — verified 0 banner markup on `/es/terminos`.
- **Long-form legal styling** (`terms.css`) using the `--lh-legal` (1.8) line height, with the reviewer banner, summary card, and numbered blocks — all token-driven.
- **Legacy `/index.html`** resolves to a localized shell via the root English-first redirect (Spanish browsers → `/es/`), satisfying D-02 without a separate redirect file (see Deviations).
- **Responsiveness finalization (PLAT-04):** reserved footer bottom-clearance so the fixed floating CTA never covers footer links/copy at any width.
- **Cutover parity (PLAT-02, D-09):** clean build emits all 11 routes and `dist/CNAME` = `nocturna-avatars.site`. Nothing was pushed; the Pages cutover is the user's pending go-live action.

## Task Commits

Each task was committed atomically on `revamp`:

1. **Task 1: Terms page (ES verbatim + EN flagged draft) via the resolver** — `19c8712` (feat)
2. **Task 2: Responsiveness pass — footer clearance for the floating CTA** — `23c65ad` (feat)
3. **Progress marker (STATE → awaiting-checkpoint)** — `c49a291` (docs)

**Plan metadata:** final docs commit (SUMMARY + STATE + ROADMAP + REQUIREMENTS).

## Files Created/Modified

**Created:**
- `src/i18n/terms.json` — `{ es, en }` Terms dictionary: `metaTitle/metaDescription`, `tag/title/subtitle`, `summaryTitle`, `summary[] { lead, rest }` (4 items), `blocks[] { num, title, body[] { text, strong? } }` (10 blocks). EN slice adds `bannerTitle`/`bannerBody`. ES is verbatim from the old site; EN is a faithful draft.
- `src/components/ReviewerBanner.astro` — EN-only `<aside role="note">` with a DRAFT flag + title + body (props from terms.json); accessible `aria-label` includes "revisión legal".
- `src/components/sections/TermsPage.astro` — page body: header, summary, all 10 blocks (bold via per-segment `strong` flag, no `set:html`), and the `ReviewerBanner` on EN only. Inherits chrome from BaseLayout.
- `src/styles/terms.css` — tokenized legal styling: `.terms-wrap` (760px max), reviewer banner, summary card, numbered blocks (`--lh-legal` 1.8, red-underlined strong clauses), responsive stacking at ≤768px.

**Modified:**
- `src/i18n/ui.ts` — registered the `terms` dictionary.
- `src/pages/[lang]/[page].astro` — imported `TermsPage` + `terms.css`, added `staticPathsForConcept('terms')`, branched meta + body on the `terms` concept.
- `src/styles/chrome.css` — footer `padding-bottom` reserves clearance for the floating CTA (PLAT-04).

## Decisions Made

- **Terms via the resolver, not a standalone file** — adapts to the 01-03 English-first/localized-slug refactor. Adding a `terms` branch keeps a single source of truth in `routes.ts`; nav and the globe switcher need no extra wiring.
- **ES verbatim (D-12), EN flagged draft (D-13)** — the authoritative Spanish text is preserved exactly; the English text is explicitly labeled as a working translation pending legal review, with a note that Spanish prevails on any discrepancy.
- **Author-controlled rich text as segment arrays** — bold clauses render as static `<strong>` markup driven by a `strong` flag, never `set:html` from data (T-01-13).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Omitted the standalone `src/pages/index.html.astro` legacy redirect (route collision)**
- **Found during:** Task 2 (legacy redirects / cutover-parity prep)
- **Issue:** The plan's file list (written before the 01-03 English-first refactor) called for `src/pages/index.html.astro` emitting a `/es/` redirect. Astro treats `index.html.astro` as a route named `index.html`, emitting `dist/index.html/index.html` (a directory), which collides with the root `src/pages/index.astro` that already emits the file `dist/index.html` — the build failed with `EISDIR: illegal operation on a directory ... dist\index.html`.
- **Fix:** Removed the conflicting file. The root `index.astro` already builds to `dist/index.html` and performs English-first language detection (stored choice wins; Spanish browsers → `/es/`, else `/en/`; `<noscript>` → `/en/`). A legacy `/index.html` request therefore already resolves to the correct localized shell — D-02 intent fully met. Verified `dist/index.html` contains both `/es/` and `/en/` targets.
- **Files modified:** (created then removed `src/pages/index.html.astro`; net change is its absence)
- **Verification:** Clean `npm run build` (no EISDIR), `dist/index.html` present as a file, contains `/es/` and `/en/`.
- **Committed in:** `23c65ad` (Task 2 commit; documented in the message)

**2. [Foundation adaptation] Terms slugs are `/es/terminos` + `/en/terms` (not `/en/terminos`)**
- **Found during:** Task 1
- **Issue:** The plan's automated check and file list predate the 01-03 localized-slug refactor (which set the EN Terms slug to `terms` in `routes.ts`).
- **Fix:** Built Terms through the resolver against the existing `routes.ts` map; adjusted the verification paths to `/es/terminos` and `/en/terms`.
- **Files modified:** `src/pages/[lang]/[page].astro`, `src/i18n/ui.ts`, plus the new Terms files.
- **Verification:** Both routes emit; ES contains "Proceso de trabajo" + "No se entrega el proyecto de Unity"; EN contains the "legal review" banner and ES does not.
- **Committed in:** `19c8712` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed blocking (route collision) + 1 foundation adaptation (slug naming). No autonomous scope creep.
**Impact on plan:** Every plan deliverable shipped; the only structural change (resolver vs standalone file, single root redirect vs duplicate) is forced by and consistent with the English-first/localized-slug foundation established in 01-03.

## Issues Encountered

- `index.html.astro` route collision (resolved — see Deviation 1).
- On Windows, `npm run build` prints a libuv `async.c` assertion line at process exit after a successful build — a known Node/Windows teardown warning (noted in 01-03), not a build failure; all routes emit and the build reports `Complete!`.

## User Setup Required

**Pending go-live cutover (the user's action — deferred, tracked as verification debt; NOT a blocker):**
1. `git push` the `revamp` branch (nothing was pushed by this plan).
2. In the repo's GitHub Pages settings, set **Source → GitHub Actions** on the production branch so the Astro build deploys.
3. **Confirm the custom domain `nocturna-avatars.site` is still bound** and serves the new site after the switch (D-09 / PLAT-02 domain-survival — verifiable only post-cutover). Rollback if needed: revert the Pages Source to the previous branch.

The human-verify checkpoint was **approved** by the user locally for the implementation (Terms render in both languages with the EN draft flagged, the site is responsive, legacy `/index.html` redirects). Only the live cutover + domain-survival confirmation remain.

## Next Phase Readiness

- **Phase 1 content surface is complete:** Terms (I18N-04) closes the last required bilingual page. The `/servicios`·/services and `/galeria`·/gallery shells remain the mount points for Phase 3 (services catalog) and Phase 4 (gallery grid).
- **Carried blocker:** gallery image storage path (`assets/gallery/` vs `public/gallery/`) still to be finalized in Phase 4.
- **Pending user action:** the GitHub Pages cutover + domain-survival confirmation (above) — the only open item before go-live.

## Self-Check: PASSED

- All 4 created files verified present on disk (`terms.json`, `ReviewerBanner.astro`, `TermsPage.astro`, `terms.css`).
- `src/pages/index.html.astro` confirmed absent (intentional — Deviation 1, route collision).
- All 3 commits verified in git history (`19c8712`, `23c65ad`, `c49a291`).
- `npm run build` emits all 11 routes incl. `/es/terminos` + `/en/terms`; `dist/CNAME` = `nocturna-avatars.site`; EN banner present only on `/en/terms`.

---
*Phase: 01-foundation-bilingual-shell*
*Completed: 2026-06-28*
