# Phase 4: Gallery & Data Layer - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-02
**Phase:** 4-gallery-data-layer
**Areas discussed:** Image storage path, Masonry technique, Lightbox approach, Featured subset rule, Entry identity, Caption/alt, Stored dimensions, Date/ordering, Featured landing presentation, Full-wall loading strategy, Captions on wall tiles, Lightbox behavior polish

---

## Image storage path

| Option | Description | Selected |
|--------|-------------|----------|
| public/gallery/ | Bot commits final web-ready files; served as-is; simplest cross-repo push; no Astro import wiring (bot already optimizes via Pillow) | ✓ |
| src/assets/gallery/ | Astro optimizes/hashes at build, but bot-added images need glob-import wiring and every bot commit reprocesses | |

**User's choice:** public/gallery/ (Recommended)
**Notes:** Aligns with the cross-repo bot flow — bot drops file + JSON entry, GitHub Pages serves directly.

---

## Masonry technique

| Option | Description | Selected |
|--------|-------------|----------|
| CSS column-count | Pure CSS, zero JS, fast; fills top-to-bottom per column | |
| JS library (Masonry.js) | True row balancing/left-to-right, adds a dependency + layout JS | ✓ |
| CSS Grid masonry | Cleanest semantics but limited/experimental browser support in 2026 | |

**User's choice:** JS library (Masonry.js) — overrode the CSS-columns recommendation.
**Notes:** Plan will pair Masonry.js with imagesLoaded and stored width/height so layout settles without reflow.

---

## Lightbox approach

| Option | Description | Selected |
|--------|-------------|----------|
| Hand-rolled on existing modal | Reuses dc-overlay/dc-modal + focus-trap + Escape/outside-click; zero deps; on-brand | ✓ |
| PhotoSwipe | Pinch-zoom/swipe/a11y out of the box, but sizeable dep + own styling | |
| GLightbox | Lighter library, still an external dep to style | |

**User's choice:** Hand-rolled on existing modal (Recommended)
**Notes:** Add keyboard prev/next + touch swipe; caption shown inside.

---

## Featured subset rule (GAL-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Newest N by date | Auto-curates; bot just appends; zero upkeep; matches "staff never touch code" | ✓ |
| featured: true flag per entry | Explicit curation, but bot/staff must set the flag | |
| Manual ordered list | Most editorial control; hand-maintained, drifts | |

**User's choice:** Newest N by date (Recommended). N=6 default, adjustable.
**Notes:** No per-entry flag needed; bot appends and freshest work floats to landing.

---

## Entry identity (BOT-05 remove flow)

| Option | Description | Selected |
|--------|-------------|----------|
| Filename is the key | Unique filenames (BOT-03) make `file` a natural stable id; remove = drop matching entry | ✓ |
| Explicit id field | Decouples identity from filename; robust if renamed, but redundant | |

**User's choice:** Filename is the key (Recommended)

---

## Caption / alt (GAL-03)

| Option | Description | Selected |
|--------|-------------|----------|
| One caption, reused as alt | Single optional string (Discord message); used as caption + img alt; generic fallback when absent | ✓ |
| Separate caption + alt fields | Better SR text in theory, but bot supplies one string so alt usually empty | |

**User's choice:** One caption, reused as alt (Recommended)
**Notes:** Captions are single-language (auto-translation is an explicit non-goal).

---

## Stored dimensions

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, bot writes width+height | Pillow already opens the image; enables `<img width height>` + aspect boxes → zero CLS, Masonry lays out without reflow | ✓ |
| No dimensions | Simpler entry, risks CLS/Masonry reflow; needs imagesLoaded to settle | |

**User's choice:** Yes, bot writes width+height (Recommended)

---

## Date field + ordering

| Option | Description | Selected |
|--------|-------------|----------|
| ISO 8601, newest first | Required ISO string; wall + featured sort newest-first; drives featured rule | ✓ |
| No date, insertion order | Rely on array order; no reliable chronological sort | |

**User's choice:** ISO 8601, newest first (Recommended)

---

## Featured landing presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Responsive grid + in-place lightbox | 2-up mobile / 3-up desktop; lighter than a 2nd Masonry above the fold; opens lightbox in place; keeps a "View full gallery" link | ✓ |
| Mini-masonry (same Masonry.js) | Visually consistent, but mounts a 2nd Masonry instance high on the landing | |
| Reuse Phase 2 gallery marquee (D-14) | Most "experimental", but motion needs reduced-motion fallback and can pull focus from CTA | |

**User's choice:** Responsive grid + in-place lightbox (Recommended)
**Notes:** Replaces the current `featured` Teaser placeholder; secondary gallery teaser CTA stays.

---

## Full-wall loading strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Render all + lazy images | Simplest; native lazy defers offscreen bytes; fine for tens–low hundreds | ✓ |
| Initial cap + "Load more" | Caps initial cost, scales to hundreds; adds UI + Masonry re-layout on append | |
| Infinite scroll | Smooth but complex; can bury footer/CTA | |

**User's choice:** Render all + lazy images (Recommended)
**Notes:** Revisit "load more" only past ~200 photos.

---

## Captions on wall tiles

| Option | Description | Selected |
|--------|-------------|----------|
| Lightbox only | Cleanest wall; even layout when some entries lack captions; caption still serves a11y as alt | ✓ |
| Hover/focus overlay on tile | More info-dense; adds visual noise + touch ambiguity | |
| Always-visible strip under tile | Editorial/accessible, but breaks masonry rhythm and looks uneven | |

**User's choice:** Lightbox only (Recommended)

---

## Lightbox behavior polish

| Option | Description | Selected |
|--------|-------------|----------|
| Full polish bundle | Loop, counter, neighbor preload, Escape + backdrop close, mobile swipe (nav + down-to-close); respects reduced-motion | ✓ |
| Minimal | Prev/next + Escape + backdrop-close only | |

**User's choice:** Full polish bundle (Recommended)

---

## Claude's Discretion

- Exact grid breakpoints/gutters and masonry column widths (keep consistent with the Refined Street Editorial system).
- Tile reveal choreography (stagger like Phase 2.1 reveals; respect prefers-reduced-motion).
- Natural-aspect tiles in the wall; full image in lightbox.
- Generic alt fallback wording + adding gallery/lightbox strings to i18n (`pages.json`), bilingual.
- Filename convention (date-slug-hash) is a bot-side concern; site relies only on `file` uniqueness.
- Script organization for Masonry + lightbox, mounted swap-safe via the View Transitions lifecycle.

## Deferred Ideas

- Filter gallery by category/tag (GAL2-01) — v2, needs staff tagging.
- "Load more"/pagination/infinite scroll — only past ~200 entries.
- Separate alt field distinct from caption — rejected (single caption reused).
- CSS column-count / CSS-Grid-native masonry — rejected in favor of Masonry.js.
- Reuse Phase 2 marquee for featured — rejected (motion/conversion + reduced-motion trade).
