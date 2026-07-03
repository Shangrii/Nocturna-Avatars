---
phase: 04-gallery-data-layer
plan: 02
subsystem: ui
tags: [astro, gallery, lightbox, a11y, scatter-layout, pin-wall, svg, view-transitions, imagesloaded]

# Dependency graph
requires:
  - phase: 04-gallery-data-layer
    provides: "Plan 01: gallery.json schema + public/gallery/ store, GalleryPage tile markup with data-gallery-* hooks, shared gallery.css, imagesloaded pin"
provides:
  - "Hand-rolled lightbox (GAL-02): open/close/nav/loop/counter/caption, keyboard + touch swipe, focus trap + restore, bilingual a11y labels — mountable from any page via [data-lightbox-overlay] + [data-gallery-tile] DOM derivation"
  - "Seeded scatter layout engine (gallery.ts layoutWall): deterministic varied sizes + continuous random positions, no column/row alignment, no overlaps, CLS-safe (fires post-imagesLoaded)"
  - "Pin-wall visual system in gallery.css: polaroid cards (tilt, pin SVG or tape corners), framed board, decor SVG (red thread, garland, board lamps, graffiti doodles), night sky (.gallery-sky) with fireflies + depth parallax + torch"
  - "Swap-safe lifecycle: init on astro:page-load, teardown on astro:before-swap, resize relayout, fonts.ready relayout"
affects: [04-03-featured-grid, 05-photo-bot]

# Tech tracking
tech-stack:
  added: []
  removed: [masonry-layout@4.2.2, "@types/masonry-layout@4.2.8"]
  patterns:
    - "Seeded determinism: every random-looking choice (size class, position, tilt, tape vs pin, decor placement) derives from FNV-1a + mulberry32 on stable keys — identical wall every reload, zero Math.random()"
    - "Decor-as-SVG drawn post-layout from live DOM rects (placedRects), redrawn on resize — thread/garland/lamps/doodles never desync from card positions"
    - "Sky on a dedicated compositor layer (.gallery-sky child + translateZ(0)) — NOT section background — to survive Chromium raster-cache dropout on hard reload"

key-files:
  created: []
  modified:
    - src/scripts/gallery.ts
    - src/components/sections/GalleryPage.astro
    - src/styles/gallery.css
    - src/i18n/pages.json
    - src/data/gallery.json
    - package.json
    - package-lock.json

key-decisions:
  - "DESIGN PIVOT (user-driven, 5 checkpoint feedback rounds): flat masonry wall → 'night evidence board' pin-wall. Supersedes the 04-UI-SPEC masonry layout contract; lightbox/a11y/data contracts unchanged"
  - "Masonry.js replaced by a custom seeded scatter engine — Masonry's column packing was itself the rejected pattern (user: photos must never sit in tidy stacks); masonry-layout uninstalled, imagesloaded retained"
  - "Caption face switched from graffiti (--font-tag) to Space Mono per user readability feedback; graffiti face retained for decoration only (badge, doodles)"
  - "Sample gallery content (29 user photos + populated gallery.json) committed in an isolated chore commit for production-time revert; supersedes Plan 01's ship-empty decision until cutover (user decision)"
  - "Thread connects only PINNED photos (tape-held ones skipped) — organic look for free"
  - "prefers-reduced-motion: torch + parallax off, fireflies/twinkle static, tilt kept, all card motion dropped"

patterns-established:
  - "Lightbox mount contract for 04-03: render [data-lightbox-overlay] + tiles with data-gallery-tile/file/caption/index anywhere; gallery.ts derives entries from the rendered DOM at page-load"
  - "gallery-night section skin (sky + fireflies + grading) is class-scoped — reusable on the landing featured section if desired"

requirements-completed: [GAL-02]

# Metrics
duration: ~9h wall-clock (2 impl tasks ~30min + 5 user-feedback design rounds)
completed: 2026-07-03
---

# Phase 4 Plan 02: Lightbox + Pin-Wall Layout Summary

**Shipped GAL-02's full lightbox (keyboard/touch/focus-trap/bilingual a11y, loop + counter + caption + neighbor preload) and — after a user-driven design pivot across five checkpoint rounds — replaced the planned Masonry wall with a "night evidence board": a seeded scatter engine (varied sizes, no columns, no overlaps) rendering pinned/taped polaroids connected by red thread under fairy lights, on a framed board floating in a starry, color-graded night sky with fireflies, depth parallax and a cursor torch.**

## Deviation from plan

Task 3's human-verify checkpoint returned sustained design feedback instead of approval. The user rejected the masonry aesthetic in stages (spacing → centering → collage sizes → "no visible pattern at all" → pin-wall metaphor), which invalidated the UI-SPEC's masonry layout contract. The lightbox implementation (Tasks 1–2 commits `9be940e`, `983f622`) survived the pivot untouched; the layout/visual layer was rebuilt in `b34f400` + sample content in `d49fdec`. Masonry.js became structurally unusable for the approved design (column packing is the exact pattern the user rejected) and was replaced with a custom deterministic scatter engine. A Chromium raster-cache bug (sky vanishing on hard reload) was fixed by moving the sky onto a dedicated compositor-layer child. All four GSD verification gates for the approved design passed: build exit 0, 0 overlaps in simulation at 4 widths, deterministic layout, reduced-motion coverage.

## Commits

- `9be940e` feat(04-02): swap-safe Masonry + imagesLoaded wall init with tile reveal
- `983f622` feat(04-02): hand-rolled lightbox — overlay, controller, full-polish nav, a11y
- `b34f400` feat(04-02): pin-wall redesign — night evidence board
- `d49fdec` chore(04-02): sample gallery content for verification

## For Plan 04-03

The landing featured section should reuse the pin-wall visual language (polaroid cards + pins/tape from gallery.css) and the lightbox mount contract (render `[data-lightbox-overlay]` + `data-gallery-tile` hooks; gallery.ts picks them up per page-load). `gallery-night` sky skin is optional for the landing — weigh conversion-path performance first.
