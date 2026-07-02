---
phase: 04-gallery-data-layer
plan: 01
subsystem: ui
tags: [astro, masonry-layout, imagesloaded, i18n, gallery, json-schema, cls, lazy-loading]

# Dependency graph
requires:
  - phase: 03.1-catalog-configurator
    provides: "services.json build-import + per-lang render pattern (ServicesPage), EmptyState component, i18n pages.json dictionary, Refined Street Editorial token system"
  - phase: 02.1-visual-redesign
    provides: ".reveal motion system (motion.css), .dc-open-btn focus-visible ring, --color-ink-raised / --color-red / --space-* tokens (theme.css)"
provides:
  - "Finalized gallery.json entry schema { file, caption?, width, height, date } shipped as an empty array — the exact Phase 5 bot write-target"
  - "public/gallery/ image storage directory (.gitkeep) — the Phase 5 bot image commit target, served as-is by GitHub Pages"
  - "masonry-layout@4.2.2 + imagesloaded@5.0.0 exact-pinned runtime deps (+ @types), audit-clean — the wall's layout libraries for Plan 02"
  - "Data-driven GalleryPage.astro masonry wall with data-gallery-wall / data-gallery-tile hooks + EmptyState fallback"
  - "src/styles/gallery.css: squared CLS-free tiles, tokenized responsive gutters, red focus ring, reduced-motion-safe hover"
  - "Bilingual gallery.altFallback + gallery.viewAll i18n keys under pages.es / pages.en"
affects: [04-02-lightbox-masonry-init, 04-03-featured-grid, 05-photo-bot]

# Tech tracking
tech-stack:
  added: [masonry-layout@4.2.2, imagesloaded@5.0.0, "@types/masonry-layout@4.2.8", "@types/imagesloaded@4.1.7"]
  patterns:
    - "gallery.json as a flat top-level array of single-language-caption entries (diverges from services.json bilingual-per-field objects)"
    - "Tile data hooks (data-gallery-tile / data-file / data-caption / data-index) let Plan 02's lightbox build its state from rendered DOM — no JSON re-import"
    - "Inline aspect-ratio:{w}/{h} + <img width height> for CLS-free layout before Masonry init"

key-files:
  created:
    - src/data/gallery.json
    - public/gallery/.gitkeep
    - src/styles/gallery.css
  modified:
    - src/components/sections/GalleryPage.astro
    - src/i18n/pages.json
    - package.json
    - package-lock.json

key-decisions:
  - "gallery.json shipped as a flat top-level array [] (not { entries: [] }) — locked as the exact Phase 5 bot write-target"
  - "Eager-load the first 4 tiles (desktop column count) then lazy + decoding=async for the rest (D-09)"
  - "gallery.css imported in GalleryPage frontmatter (Astro hoists it to a global stylesheet) rather than a scoped <style> block, so Plan 02 wall + Plan 03 featured grid can share it"
  - "New pages.gallery i18n object is distinct from the existing pages.teaser.gallery — no key collision"

patterns-established:
  - "Gallery data layer: flat array in src/data/gallery.json, images in public/gallery/<file>, consumed via build-time import + newest-first date sort"
  - "Tile-as-button a11y contract: each tile is a focusable <button> carrying data-* hooks the lightbox reads at open time"

requirements-completed: [GAL-01, GAL-03]

# Metrics
duration: ~12min
completed: 2026-07-02
---

# Phase 4 Plan 01: Gallery Data Layer + Masonry Wall Summary

**Finalized the `gallery.json` entry schema `{ file, caption?, width, height, date }` (empty array, the Phase 5 bot write-target) and the `public/gallery/` image path, and shipped a data-driven `GalleryPage.astro` masonry wall that consumes them — CLS-free aspect-box tiles, caption-or-fallback alt, native lazy-loading, and a branded EmptyState fallback when empty.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-02T18:08Z (execution start)
- **Completed:** 2026-07-02
- **Tasks:** 2
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments
- Locked the `gallery.json` entry schema as an empty top-level array `[]` — the phase's #1 job and the hard Phase 5 prerequisite (success criterion #5, D-01/D-02/D-06).
- Created `public/gallery/.gitkeep` so the image store survives an empty git tree and the build succeeds with zero photos — the Phase 5 bot commit target (D-07/D-08).
- Installed and exact-pinned `masonry-layout@4.2.2` + `imagesloaded@5.0.0` (+ `@types`), `npm audit` clean with 0 vulnerabilities (T-04-SC).
- Rewrote `GalleryPage.astro` into a data-driven wall: imports `gallery.json`, sorts newest-first by `date` (D-05), renders focusable `data-gallery-tile` buttons in inline `aspect-ratio` boxes (D-04) with caption-or-fallback `alt` (D-03/GAL-03) and eager/lazy `loading` per row (D-09); preserves the branded `EmptyState` when empty (D-12).
- Added `src/styles/gallery.css` (squared tiles, tokenized responsive gutters, `--color-ink-raised` placeholder, red `focus-visible` ring, reduced-motion-safe hover) and the bilingual `gallery.altFallback` / `gallery.viewAll` i18n keys.
- `npm run build` exits 0; the built `/es/galeria` + `/en/gallery` pages render the EmptyState (wall absent) against the empty `gallery.json`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Finalize gallery.json schema + public/gallery storage + pinned deps** - `ac84298` (feat)
2. **Task 2: Add gallery i18n keys + render the data-driven masonry wall** - `0e67a90` (feat)

**Plan metadata:** (docs commit — this SUMMARY + STATE/ROADMAP updates)

## Files Created/Modified
- `src/data/gallery.json` - Empty top-level array `[]`; the finalized Phase 5 bot write-target schema.
- `public/gallery/.gitkeep` - Keeps the image store directory in git; Phase 5 bot image commit target.
- `src/styles/gallery.css` - Wall/tile styling: squared 0px tiles, responsive tokenized gutters, CLS-free aspect-box placeholder, red focus ring, reduced-motion-safe hover.
- `src/components/sections/GalleryPage.astro` - Data-driven masonry wall (data-gallery-wall / data-gallery-tile) with EmptyState fallback; imports gallery.json + gallery.css.
- `src/i18n/pages.json` - Added `gallery.altFallback` + `gallery.viewAll` under both `pages.es` and `pages.en`.
- `package.json` / `package-lock.json` - Added masonry-layout + imagesloaded (deps) and their @types (devDeps), all exact-pinned.

## Decisions Made
- **gallery.json shape locked as a flat array `[]`** (not `{ entries: [] }`) — simplest bot append target; the bot commits entries of `{ file, caption?, width, height, date }` directly against this array (D-06).
- **Eager-load the first 4 tiles** (matching the desktop column count) then `loading="lazy"` + `decoding="async"` for the rest, so the fold fills fast without JS (D-09).
- **`gallery.css` imported in the component frontmatter** (Astro hoists it global) rather than a scoped `<style>` — Plan 02's wall init and Plan 03's featured grid can reuse the same tile primitives.
- **Tile data hooks** (`data-file`, `data-caption`, `data-index`) are Astro-auto-escaped and let the Plan 02 lightbox build its entry from rendered DOM, avoiding a second JSON import.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Rephrased a doc-comment to satisfy the plan's `set:html` verification regex**
- **Found during:** Task 2 (GalleryPage render)
- **Issue:** The plan's automated check `!/set:html/.test(s)` is a literal string match. My documentation comment "…rendered through Astro auto-escaping — never set:html" contained the literal token `set:html`, tripping the guard as a false positive even though no `set:html` directive is used.
- **Fix:** Reworded the comment to "raw HTML injection is never used" — the file still contains zero `set:html` directives; the security posture (T-04-01, auto-escaping only) is unchanged.
- **Files modified:** src/components/sections/GalleryPage.astro
- **Verification:** `node -e "…!/set:html/.test(s)…"` now passes; `npm run build` still exits 0.
- **Committed in:** `0e67a90` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Trivial doc-comment wording change; no behavior, security, or scope impact. Plan executed as designed.

## Issues Encountered
- None beyond the deviation above. LF→CRLF git warnings on Windows are informational (autocrlf), not errors.

## Known Stubs
`src/data/gallery.json` is intentionally shipped **empty** (`[]`) per D-06/D-12 — this is the finalized contract, not an unfinished stub. The wall renders the branded EmptyState until the Phase 5 bot appends real entries + images. Plan 02 (lightbox + Masonry init) and Plan 03 (featured grid) build on the schema and DOM hooks locked here.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- **Plan 04-02 ready:** the `data-gallery-wall` / `data-gallery-tile` DOM hooks, the `width`/`height` aspect boxes, and the exact-pinned Masonry.js + imagesLoaded deps are in place for the swap-safe Masonry init + hand-rolled lightbox.
- **Plan 04-03 ready:** `gallery.json` (newest-first sort), `gallery.viewAll` i18n key, and the shared `gallery.css` tile primitives are available for the landing featured grid.
- **Phase 5 unblocked:** the `gallery.json` schema and `public/gallery/<file>` image path — the phase's #1 job and the hard bot prerequisite — are finalized and committed.

## Self-Check: PASSED

All claimed files exist (gallery.json, public/gallery/.gitkeep, gallery.css, GalleryPage.astro, pages.json, this SUMMARY) and both task commits (`ac84298`, `0e67a90`) are present in git history.

---
*Phase: 04-gallery-data-layer*
*Completed: 2026-07-02*
