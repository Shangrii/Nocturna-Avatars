---
phase: quick-260707-1yi
plan: 01
subsystem: website-chrome-and-content-surfaces
tags: [footer, stacking-context, night-sky, readability, services, terms, css]
requires:
  - "NightBackground fixed field (quick 260707-0q0) mounted on Services/Terms"
provides:
  - "Footer paint-order fix: .footer positioned at z-index 0 so it draws above the fixed night backdrop"
  - ".night-panel readability surface class (night-sky.css) mirroring the Level 1/2/3 package cards"
  - "Services catalog + Terms legal column mounted on ink-raised bordered panels"
affects:
  - "/es/servicios, /en/services, /es/terminos, /en/terms (all four affected routes)"
tech-stack:
  added: []
  patterns:
    - ".night-panel: static readability surface reusing .card/.cards treatment (ink-raised + hairline border) without the card hover/flex behavior"
    - "Footer stacking: position: relative + z-index: 0 restores DOM-order painting under a view-transition <main> stacking context"
key-files:
  created: []
  modified:
    - "src/styles/chrome.css (footer stacking fix)"
    - "src/styles/night-sky.css (.night-panel + .terms-wrap.night-panel + 640px override)"
    - "src/components/sections/ServicesPage.astro (catalog + contact note wrapped in .night-panel--catalog)"
    - "src/components/sections/TermsPage.astro (night-panel added to .terms-wrap)"
decisions:
  - "Fixed the invisible footer with the minimal footer-only stacking change (position:relative + z-index:0) rather than restructuring NightBackground out of <main> or editing night-sky z-indexes — covers all four routes and is inert on Home/Gallery"
  - "Panel width for Services set to calc(1000px + var(--space-lg) * 2) so the inner .catalog-cat column keeps its native 1000px measure inside the panel's horizontal padding"
  - ".night-panel lives in night-sky.css (shared with Gallery via NightBackground import) — additive and unused on Gallery, so no gallery regression risk"
metrics:
  duration: ~6 min
  completed: 2026-07-07
---

# Quick 260707-1yi: Fix Invisible Footer + Readability Panels Summary

Restored the buried footer on Services/Terms by positioning it above the fixed night backdrop, and gave the Services catalog and Terms legal column solid ink-raised panels matching the Level 1/2/3 package cards — Home and Gallery untouched.

## What Was Done

**Task 1 — Footer paint-order fix** (`fix(chrome)`, commit `b0f1d36`)
- Added `position: relative; z-index: 0;` to `.footer` in `src/styles/chrome.css` with a WHY comment. Background/border untouched (opaque `--color-ink` over the night sky is the intended look).

**Task 2 — Readability panels** (`feat(services,terms)`, commit `df2dc05`)
- Added `.night-panel` to `src/styles/night-sky.css`: `background: var(--color-ink-raised); border: 1px solid var(--color-border); padding: var(--space-xl) var(--space-lg); position: relative;` — a static echo of the `.card`/`.cards` treatment (no hover lift, no red top-rule, no flex column). Added a `.terms-wrap.night-panel` vertical-padding rule and a 640px small-viewport padding override.
- ServicesPage.astro: wrapped `<CatalogSection />` and the `.catalog-contact-note` in `<div class="night-panel night-panel--catalog reveal">`; added scoped `.night-panel--catalog { max-width: calc(1000px + var(--space-lg) * 2); margin-inline: auto; }` and trimmed the contact note's page-gutter padding / auto max-width so it no longer double-pads inside the panel. Section header stays outside the panel.
- TermsPage.astro: added `night-panel` to the existing `.terms-wrap` div. The 760px measure (from terms.css) is preserved; the `.terms-wrap.night-panel` rule restores vertical padding inside the panel.

## Confirmed Root Cause (footer)

Evidence-based, matches the plan diagnosis exactly: `<main>` carries a view-transition-name (assigned by Astro's ClientRouter), which forces it to form a **stacking context** and paint atomically. `<NightBackground fixed />` mounts *inside* `<main>` on Services/Terms; its `.night-bg--fixed` is `position: fixed; inset: 0; z-index: -1` with an **opaque** full-viewport field. Because `z-index: -1` is scoped to main's own stacking context, it cannot escape below main's later static siblings — so main's atomic layer (including the covering night field) painted **on top of** the static, z-index-less `<Footer>`. Nav and FloatingCTA survived only because they are `position: fixed` with explicit z-indexes. Positioning the footer at z-index 0 puts it in the same paint phase as main; equal stacking level resolves by DOM order, and the footer is after `</main>`, so it now draws above the night field. No-op on Home (no NightBackground) and Gallery (non-fixed `.night-bg` is `position: absolute`, scoped to its section).

## Panel Pattern Introduced

`.night-panel` (night-sky.css) is the reusable readability surface for content over the fixed night backdrop. It reuses the package-card visual language (ink-raised fill + hairline border) per user request but is a static panel, not an interactive card. Because it lives in night-sky.css it ships exactly on the pages that mount `<NightBackground />`; it is additive and unused on Gallery, so Gallery is unaffected.

## Verification

- `npm run build` exits 0 (12 pages built).
- Built CSS ships `.footer{z-index:0;...position:relative}` (`dist/_astro/sections.*.css`) and `.night-panel{background:var(--color-ink-raised);border:1px solid var(--color-border);...}` (`dist/_astro/_page_.*.css`).
- Footer markup present in `dist/es/servicios/index.html` and `dist/es/terminos/index.html`.
- `night-panel` present in built HTML for all four real routes: `dist/es/servicios`, `dist/en/services`, `dist/es/terminos`, `dist/en/terms`. (Note: `/en/servicios` is a meta-refresh redirect stub — the real EN services slug is `/en/services` per routes.ts.)
- `night-panel` **absent** from `dist/es/galeria`, `dist/en/gallery`, `dist/es/index.html`, `dist/en/index.html`, `dist/index.html` — Home and Gallery output unchanged.
- 2 atomic commits (footer fix, panels); no file deletions; no stray untracked files.

## Deviations from Plan

None — plan executed exactly as written.

## Threat Flags

None. CSS/markup-only change; no new dependencies, no user input, no data flow, no new trust boundaries (matches the plan's threat register — T-q1yi-01 accepted, no installs).

## Known Stubs

None.

## Commits

- `b0f1d36` — fix(chrome): raise footer above fixed night backdrop on services/terms
- `df2dc05` — feat(services,terms): card-style readability panels over the night backdrop

## Self-Check: PASSED

- FOUND: src/styles/chrome.css (footer z-index rule ships in dist)
- FOUND: src/styles/night-sky.css (.night-panel ships in dist)
- FOUND: src/components/sections/ServicesPage.astro (night-panel--catalog in built HTML)
- FOUND: src/components/sections/TermsPage.astro (night-panel in built HTML)
- FOUND: commit b0f1d36
- FOUND: commit df2dc05
