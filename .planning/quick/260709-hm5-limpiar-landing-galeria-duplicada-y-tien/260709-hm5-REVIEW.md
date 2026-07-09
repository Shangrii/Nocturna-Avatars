---
phase: 260709-hm5-limpiar-landing-galeria-duplicada-y-tien
reviewed: 2026-07-09T18:53:01Z
depth: quick
files_reviewed: 24
files_reviewed_list:
  - src/pages/[lang]/index.astro
  - src/components/sections/FeaturedGallery.astro
  - src/data/store.json
  - src/components/sections/StorePage.astro
  - src/pages/[lang]/[page].astro
  - src/pages/en/galeria.astro
  - src/pages/en/servicios.astro
  - src/pages/index.astro
  - src/scripts/motion/choreography.ts
  - src/styles/choreography.css
  - src/i18n/pages.json
  - src/components/CartDrawer.astro
  - src/components/CartPill.astro
  - src/components/CartSummaryModal.astro
  - src/components/StoreCartDrawer.astro
  - src/components/StoreCartPill.astro
  - src/components/QuickViewModal.astro
  - src/components/sections/About.astro
  - src/components/sections/PackagesSummary.astro
  - src/components/sections/Reviews.astro
  - src/components/sections/GalleryPage.astro
  - src/components/sections/ServicesPage.astro
  - src/components/sections/TermsPage.astro
  - src/data/gallery.json
findings:
  critical: 0
  warning: 1
  info: 0
  total: 1
status: fixed
fix_commits:
  WR-01: be8ef22
---

# Phase 260709-hm5: Code Review Report

**Reviewed:** 2026-07-09T18:53:01Z
**Depth:** quick
**Files Reviewed:** 24
**Status:** issues_found

## Summary

Reviewed the 4 required files (landing page, `FeaturedGallery.astro`, `store.json`, `StorePage.astro`) and swept the broader codebase (`src/components/`, `src/components/sections/`, `src/pages/`, `src/scripts/`, `src/styles/`) for other Teaser-like dead code, duplicated sections, or leftover placeholders.

The Teaser removal and store.json emptying are both clean:
- No remaining references to `Teaser` anywhere in `src/` — the component and its imports/usages were removed atomically, no orphaned CSS class hooks left behind under that name.
- `store.json`'s `products: []` correctly drives `StorePage.astro`'s existing `products.length ? ... : <EmptyState .../>` branch — the Coming Soon path is real, not a new code path bolted on.
- Every component under `src/components/` and `src/components/sections/` has at least one live importer (verified via cross-reference: `CartDrawer`/`CartPill`/`CartSummaryModal` are the services-cotización chrome, `StoreCartDrawer`/`StoreCartPill`/`QuickViewModal` are the store chrome — both rendered conditionally by `[lang]/[page].astro`, intentionally parallel, not duplicated dead code per the project's quote-vs-cart split).
- `src/pages/en/galeria.astro` and `src/pages/en/servicios.astro` are intentional legacy-slug redirect stubs (documented as such), not dead pages.

One genuine "Teaser-shaped" defect was found elsewhere: a whole scroll-choreography feature (gallery marquee + featured parallax) is now permanently inert because its DOM hooks were renamed/removed on a past refactor and the JS/CSS were never updated to match.

## Warnings

### WR-01: Landing scroll-choreography effects (D-14 marquee, D-16 parallax) are dead code — DOM hooks no longer exist

**Fixed:** `be8ef22` — removed the D-14/D-16 blocks from `choreography.ts` and the matching dead rules from `choreography.css` (chose removal over re-wiring: no new motion design was requested, and the marquee's only real target was the placeholder section just deleted).

**File:** `src/scripts/motion/choreography.ts:51-98`
**Issue:** `initChoreography()` looks for `[data-teaser="gallery"] [data-teaser-body]` (D-14 gallery marquee) and `[data-teaser="featured"] [data-teaser-body]` (D-16 featured parallax) via `document.querySelector`. Neither attribute exists anywhere in the current markup — a full-codebase search of `src/pages/` and `src/components/` for `data-teaser` and `data-teaser-body` returns zero matches. The current `FeaturedGallery.astro` section (`src/components/sections/FeaturedGallery.astro:77`) uses `data-featured-gallery` instead, and no element anywhere carries `data-teaser="gallery"`. Both `if (galleryTrack)` / `if (featured)` guards are always false, so this ~50-line block silently no-ops on every page load. The matching CSS in `src/styles/choreography.css:132-144` (and its reduced-motion reset at `:156-164`) targets the same non-existent selectors and is equally inert.

This is the same class of bug as the just-fixed duplicate-Teaser issue: a feature that reads as "wired up" (detailed doc comments citing D-14/D-16 design decisions) but structurally can never fire because the component it targeted was renamed/replaced (likely during the `FeaturedGallery.astro` introduction) without updating the script/stylesheet that depended on it.

**Fix:** Either restore the intended effect or remove the dead code — do not leave both. If the marquee/parallax are still wanted:
```astro
<!-- src/components/sections/FeaturedGallery.astro -->
<section class="section section--rule" data-featured-gallery data-teaser="featured">
  ...
  <div class="featured-grid reveal" data-teaser-body>
```
(and similarly wire a `data-teaser="gallery"` + `data-teaser-body` pair wherever the D-14 marquee is meant to live today — there is currently no gallery-marquee host at all, so that half of the feature may need a design decision, not just a selector fix).

If the effects are no longer wanted, delete `choreography.ts:51-98` (D-14/D-16 blocks) and the corresponding dead rules in `choreography.css:132-144,156-164` to stop shipping unreachable code and unused CSS.

---

_Reviewed: 2026-07-09T18:53:01Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: quick_
