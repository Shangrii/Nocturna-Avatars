---
task: 260709-hm5
title: Limpiar landing (galería duplicada) y tienda (Coming Soon)
type: quick
date: 2026-07-09
requirements: [CLEANUP-01, STORE-COMINGSOON-01]
key-files:
  modified:
    - src/pages/[lang]/index.astro
    - src/components/sections/FeaturedGallery.astro
    - src/data/store.json
  deleted:
    - src/components/sections/Teaser.astro
commits:
  - b3d45da: refactor — remove dead duplicate gallery Teaser from landing
  - e9d8a6e: feat — empty store catalog so Coming Soon empty state renders
metrics:
  tasks: 2
  files: 4
---

# Quick 260709-hm5: Limpiar landing (galería duplicada) y tienda (Coming Soon) Summary

Removed the dead duplicate gallery Teaser placeholder from the landing (deleting the fully-orphaned `Teaser.astro`) and emptied the store catalog so both locales render the already-built "Tienda en camino" / "Store coming soon" empty state instead of 4 fake demo products.

## What Was Done

### Task 1 — Remove dead duplicate gallery Teaser (commit b3d45da)
- Dropped the `Teaser` import and the `<Teaser lang={lang} variant="gallery" />` render from `src/pages/[lang]/index.astro` (it sat between `<PackagesSummary>` and `<Reviews>`, always rendering a static "Muy pronto"/"Coming soon" placeholder superseded by `FeaturedGallery` in Phase 4).
- Rewrote the landing-order comment block to drop the removed gallery-teaser step and correct the ink/paper rhythm description (now featured(ink) → about(paper) → packages(ink) → reviews(paper) → closing(ink)).
- Deleted `src/components/sections/Teaser.astro` (fully dead after the render was removed).
- Repo-wide `grep -rl "Teaser" src/` returns zero matches; `npm run build` succeeds (14 pages).

### Task 2 — Empty store catalog for Coming Soon (commit e9d8a6e)
- Set `"products": []` in `src/data/store.json`, removing the 4 placeholder products (Hoodie Neón Callejero, Alas de Medianoche, Set Lencería Nocturne, Pack de Texturas Graffiti) with their fake jinxxy-cdn.com URLs.
- Preserved the top-level `_comment` schema documentation verbatim so staff can add real products later.
- No changes to StorePage.astro, ProductCard.astro, pages.json, store.ts, or store-cart.ts — the empty-case branch (`products.length` → EmptyState) and ES/EN copy were already in place.
- Verified: valid JSON with only `_comment` + empty `products`; built `dist/es/tienda/index.html` contains "Tienda en camino", `dist/en/store/index.html` contains "Store coming soon", and none of the 4 placeholder product names appear in either built page.

## Deviations from Plan

**1. [Rule 3 - Blocking] Cleaned a stale Teaser reference in FeaturedGallery.astro**
- **Found during:** Task 1 verification
- **Issue:** The plan's `grep -rn "Teaser" src/` gate requires zero matches, but a header doc comment in `src/components/sections/FeaturedGallery.astro` still read "replacing the old `featured` Teaser placeholder" — the last dangling reference blocking a clean grep.
- **Fix:** Updated the comment to "the old `featured` gallery placeholder" (documentation-only, no behavior change).
- **Files modified:** src/components/sections/FeaturedGallery.astro
- **Commit:** b3d45da

## Verification Results

- `npm run build` — succeeds, 14 pages built, both locales.
- `grep -rl "Teaser" src/` — zero matches (component fully removed).
- `store.json` — valid JSON, `products: []`, `_comment` intact.
- Built landing (`dist/es/index.html`, `dist/en/index.html`) — 0 `data-teaser="gallery"` hooks, FeaturedGallery present once.
- Built store pages — empty-state copy present, no placeholder product names.

## Known Stubs

None. The store empty state is the intended launch state (staff add real products via `store.json` per the preserved `_comment`).

## Self-Check: PASSED

- FOUND: src/pages/[lang]/index.astro (modified)
- FOUND: src/components/sections/FeaturedGallery.astro (modified)
- FOUND: src/data/store.json (modified)
- CONFIRMED DELETED: src/components/sections/Teaser.astro
- FOUND commit: b3d45da
- FOUND commit: e9d8a6e
