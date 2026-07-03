---
phase: 04-gallery-data-layer
plan: 03
subsystem: ui
tags: [astro, gallery, featured, lightbox, pin-wall, i18n, a11y, landing, conversion]

# Dependency graph
requires:
  - phase: 04-gallery-data-layer
    provides: "Plan 01: gallery.json schema + newest-first sort, gallery.css tile primitives, gallery.viewAll/altFallback i18n keys"
  - phase: 04-gallery-data-layer
    provides: "Plan 02: hand-rolled lightbox controller (gallery.ts) mountable from any page via [data-lightbox-overlay] + [data-gallery-tile] DOM derivation; pin-wall polaroid/pin/tape visual system"
provides:
  - "Landing featured subset (GAL-04): newest-6 auto-curated pin-wall polaroid grid replacing the old featured Teaser placeholder, opening the Plan 02 lightbox in place on the landing"
  - "Shared LightboxOverlay.astro partial — one canonical [data-lightbox-overlay] rendered by BOTH /galeria and the landing (no duplicated/divergent overlay markup)"
  - "Featured-grid responsive CSS (2-up mobile / 3-up desktop, squared 1/1 polaroids) reusing the pin-wall tile primitives without the scatter engine / sky / thread / torch"
affects: [05-photo-bot]

# Tech tracking
tech-stack:
  added: []
  removed: []
  patterns:
    - "Auto-curated featured set: newest-6 by `date` (sort + slice(0,6)) — no per-entry `featured` flag, no manual list, so the bot appending entries keeps the landing current"
    - "Shared overlay partial: LightboxOverlay.astro authored once, rendered on any page; gallery.ts derives entries from that page's [data-gallery-tile] nodes at page-load"
    - "Landing reuses the /galeria pin-wall language (.gallery-tile/.polaroid/.pin/.tape) but a STATIC CSS grid (square photo windows) — pin-wall look without the scatter/sky/thread cost, keeping the conversion path fast"

key-files:
  created:
    - src/components/LightboxOverlay.astro
    - src/components/sections/FeaturedGallery.astro
  modified:
    - src/components/sections/GalleryPage.astro
    - src/pages/[lang]/index.astro
    - src/styles/gallery.css

key-decisions:
  - "Extracted the Plan 02 inline overlay into a shared LightboxOverlay.astro so /galeria and the landing render one canonical [data-lightbox-overlay]; gallery.ts binds exactly one overlay per page"
  - "Landing featured section inherits the 04-02 pin-wall pivot (tilted polaroid cards + pins/tape) instead of the plan's plain flat `featured-tile` and the UI-SPEC's masonry — deviation_context #2; kept a static CSS grid with squared 1/1 photo windows (no scatter/sky/thread/torch) for landing performance"
  - "gallery.ts required NO changes — Plan 02 already wires the lightbox on all [data-gallery-tile] document-wide and no-ops the wall/sky/torch without a [data-gallery-wall]; verified rather than re-authored"
  - "gallery.json left untouched at its 29 sample entries (user cutover decision, deviation_context #4) — the featured grid renders the newest 6; EmptyState path is code-verified, not runtime-tested (would require emptying the array)"

patterns-established:
  - "FeaturedGallery.astro is the landing's data-driven featured subset: same gallery.json import + newest-first sort as GalleryPage, sliced to 6, rendering the shared tile + overlay contract"

requirements-completed: [GAL-04]

# Metrics
duration: ~8min
completed: 2026-07-03
---

# Phase 4 Plan 03: Landing Featured Subset Summary

**Shipped GAL-04 — the landing now renders the newest 6 gallery entries as a responsive pin-wall polaroid grid (2-up mobile / 3-up desktop) in place of the old featured Teaser placeholder, and clicking (or Enter/Space on) any featured photo opens the same hand-rolled Plan 02 lightbox IN PLACE on the landing, keeping the visitor near the CTA; a "View full gallery" link routes to /galeria · /gallery. The Plan 02 inline overlay was extracted into a shared LightboxOverlay.astro so both pages bind one canonical [data-lightbox-overlay].**

## Accomplishments
- **Task 1 — shared overlay:** Moved Plan 02's inline `dc-overlay lightbox` markup verbatim into `src/components/LightboxOverlay.astro` (role=dialog, aria-modal, data-lenis-prevent, data-counter-label, all controls + bilingual labels). `GalleryPage.astro` now renders `<LightboxOverlay lang={lang} />` in place of the inline block; /galeria is byte-for-byte unchanged in behavior.
- **Task 2 — featured subset:** `FeaturedGallery.astro` imports `gallery.json`, sorts newest-first by `date`, `.slice(0, 6)` (auto-curated, no `featured` flag), and renders focusable `<button data-gallery-tile data-index data-file data-caption>` polaroid cards reusing the pin-wall language (pins/tape/tilt/caption + the "new!" scribble on the newest). Renders the shared overlay + imports `gallery.ts` so the lightbox opens in place. A `.link-arrow` "View full gallery" link uses `localizedPath('gallery', lang)`; an `EmptyState` renders when the gallery is empty. `index.astro` swaps `<Teaser variant="featured">` for `<FeaturedGallery>` (no other section touched).
- **Task 3 — styling:** Added `.featured-grid` responsive rules to `gallery.css` (2-up / 3-up at 768px, tokenized gaps, centered max-width, square 1/1 photo windows, top spacing for pin/tape overhang) reusing the pin-wall tiles' hover/focus/z-index. `gallery.ts` required no change (Plan 02 already document-wide).
- `npm run build` exits 0; the built `/es/` and `/en/` landings render exactly 6 featured tiles (data-index 0..5, data-file + caption-or-fallback alt), the shared overlay (all controls + a11y attrs), and the view-all link routing to `/es/galeria` · `/en/gallery`.

## Task Commits

Each task committed atomically:

1. **Task 1: Extract shared LightboxOverlay partial** — `9ee3595` (feat)
2. **Task 2: FeaturedGallery newest-6 grid + landing wiring** — `9a0db07` (feat)
3. **Task 3: Featured-grid responsive styling** — `092ec84` (feat)

## Files Created/Modified
- `src/components/LightboxOverlay.astro` (created) — shared hidden lightbox overlay partial; one canonical `[data-lightbox-overlay]` for both pages.
- `src/components/sections/FeaturedGallery.astro` (created) — landing newest-6 pin-wall polaroid grid, in-place lightbox wiring, view-all link, EmptyState fallback.
- `src/components/sections/GalleryPage.astro` (modified) — renders `<LightboxOverlay>` instead of the inline overlay; dropped the now-unused `lightbox` const.
- `src/pages/[lang]/index.astro` (modified) — imports + renders `<FeaturedGallery>` in the featured slot; gallery link-out + all other sections unchanged.
- `src/styles/gallery.css` (modified) — `.featured-grid` / `.featured-tile` / `.featured-action` responsive rules (2-up/3-up, square polaroids).

## Decisions Made
- **Shared overlay via extraction** (Task 1) so both pages render identical overlay markup/selectors — the plan's own preferred path, and it keeps GalleryPage and the landing binding one `[data-lightbox-overlay]`.
- **Featured = pin-wall polaroids, not flat tiles** — per deviation_context #2 and the 04-02 pivot, the landing inherits the polaroid/pin/tape language, but as a static CSS grid with squared 1/1 photo windows (no scatter engine, sky, thread or torch) so it stays fast and conversion-focused.
- **No gallery.ts change** — Plan 02 already queries `[data-gallery-tile]` document-wide and runs `initLightbox()` gated only on the overlay (not the wall), with no `innerHTML`/`set:html`. Verified, not re-authored (scope boundary: don't modify working code needlessly).

## Deviations from Plan

### Adapted to deviation_context (design pivot)

**1. [Design-pivot adaptation] Featured tiles render as pin-wall polaroid cards, not the plan's plain `featured-tile` squares**
- **Found during:** Task 2/3.
- **Reason:** The plan (and UI-SPEC "Featured Grid") predates the 04-02 pin-wall pivot; deviation_context #2 directs the landing to inherit the pin-wall visual language (reuse `.polaroid`/`.pin`/`.tape`/`.gallery-tile`).
- **Adaptation:** Rendered tilted polaroid cards (deterministic pin/tape + tilt, "new!" scribble on the newest) in a static CSS grid; kept the plan's responsive 2-up/3-up + squared 1/1 photo windows for a tidy, fast landing grid (no scatter/sky/thread/torch).
- **Files:** FeaturedGallery.astro, gallery.css.
- **Commits:** `9a0db07`, `092ec84`.

**2. [Scope boundary] gallery.ts NOT modified though the plan lists it in files_modified**
- **Found during:** Task 3.
- **Reason:** Plan 02 already implemented document-wide `[data-gallery-tile]` wiring and wall-independent `initLightbox()` (the 04-02 SUMMARY's "mountable from any page" contract). Verified: doc-wide tile query ✓, lightbox gated only on overlay ✓, no `innerHTML`/`set:html` ✓.
- **Adaptation:** Left gallery.ts untouched; documented that no change was required.

**3. [Verify-regex] Inlined `.slice(0, 6)` literal instead of a named constant**
- **Found during:** Task 2 verify.
- **Reason:** The plan's automated check `!/slice\(0,\s*6\)/` is a literal source match; a `FEATURED_COUNT` constant tripped it (mirrors 04-01's `set:html` wording adjustment).
- **Adaptation:** Used `.slice(0, 6)` directly with an explanatory comment. No behavior change.

**Total deviations:** 3 (all adaptations to the documented design pivot / verify literals; no behavior/security/scope regressions).

## Threat Surface Scan
No new endpoints, auth paths, file-access patterns, or schema changes. The headline threat (T-04-07: Discord `caption` → featured `<img alt>` + reused lightbox caption) is mitigated exactly as planned — featured alt is set through Astro auto-escaping only (no `set:html`), and the in-place lightbox reuses Plan 02's `textContent` path (no `innerHTML`). No threat flags.

## Known Stubs
None new. `src/data/gallery.json` currently holds 29 sample entries (user cutover decision from 04-02, deviation_context #4) — the featured grid renders the newest 6 of them; it is not a stub. The empty-gallery `EmptyState` fallback is code-verified (the `featured.length >= 1` else branch) but not runtime-tested, because emptying `gallery.json` was intentionally avoided per deviation_context #4.

## Human Verification (Task 4 checkpoint — recommended user QA)
Automated verification passed (build exit 0; built landing HTML confirmed to carry 6 featured tiles with data-index 0..5, caption-or-fallback alt, the shared overlay with all controls + a11y attrs, and the view-all link routing to `/es/galeria` · `/en/gallery`). The plan's `checkpoint:human-verify` remains as recommended manual QA against the existing sample content:
1. `npm run dev`, visit `/` (es) and `/en/`: confirm the featured section shows the newest 6 as a 2-up (mobile) / 3-up (≥768px) grid in slot #2 (after hero, before About); the `gallery` link-out further down is unchanged.
2. Click a featured photo (and Enter/Space on a focused tile): the lightbox opens in place, focus moves to Close, ‹/› + ←/→ loop with the counter updating, Escape / backdrop / ✕ / swipe-down close and return focus to the tile.
3. Confirm "View full gallery" → `/galeria` (es) · `/gallery` (en) lands on the full pin-wall.
4. Enable OS "reduce motion": featured tiles show at full opacity, hover scale neutralized (tilt kept), lightbox opens/navigates/closes instantly.
5. `focus-visible` shows a 2px red ring on featured tiles; alt text present.

## Self-Check: PASSED

All created files exist (LightboxOverlay.astro, FeaturedGallery.astro) and all three task commits (`9ee3595`, `9a0db07`, `092ec84`) are present in git history; `npm run build` exits 0.

---
*Phase: 04-gallery-data-layer*
*Completed: 2026-07-03*
