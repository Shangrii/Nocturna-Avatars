# Phase 4: Gallery & Data Layer - Context

**Gathered:** 2026-07-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a data-driven photo gallery: a masonry wall with a lightbox on `/galeria` (es) · `/gallery` (en) rendered from `gallery.json`, plus a featured subset on the landing — and **finalize the `gallery.json` entry schema + image storage path** as the contract the Phase 5 Discord bot writes against.

**In scope:** masonry wall, lightbox, optional captions/alt, featured-on-landing subset, the finalized `gallery.json` schema, and the finalized image storage path.

**Out of scope (own phases / deferred):** category/tag filtering (GAL2-01, v2), caption auto-translation (explicit non-goal — captions are single-language, shown as written), and the bot itself (Phase 5). Discussion here only clarifies HOW to implement what's scoped.

</domain>

<decisions>
## Implementation Decisions

### gallery.json schema (the Phase 5 bot contract)
- **D-01:** Entry shape is `{ file, caption?, width, height, date }`. Example:
  ```json
  {
    "file": "2026-07-02-luna-a1b2c3.webp",
    "caption": "Luna — full outfit + toggles",
    "width": 1600,
    "height": 2000,
    "date": "2026-07-02T18:30:00Z"
  }
  ```
- **D-02:** **Identity = `file`** (the unique filename). No separate `id`. BOT-03 guarantees unique filenames, so the 🗑️ remove flow (BOT-05) filters out the entry whose `file` matches. Removing an entry also removes its image at `public/gallery/<file>`.
- **D-03:** **`caption` is a single optional string, single-language** (the Discord message text per BOT-06), shown as-is (no translation). Used as the `<img alt>` when present; a **generic localized alt fallback** (e.g. "Nocturna Avatars — VRChat avatar edit") when absent. NOT a bilingual-per-field object like `services.json`.
- **D-04:** **`width` + `height` are stored** and written by the bot (Pillow already opens each image to resize it, so dimensions are free). The site sets `<img width height>` + aspect-ratio boxes so the wall lays out CLS-free and Masonry doesn't reflow.
- **D-05:** **`date` is a required ISO 8601 string.** Both the wall and the featured subset sort **newest-first**. `date` drives the featured "newest N" rule.
- **D-06:** `gallery.json` lives at **`src/data/gallery.json`** (mirrors `services.json`, imported at build). The bot commits `src/data/gallery.json` + `public/gallery/<file>` together in one cross-repo push.

### Image storage & serving
- **D-07:** Images live in **`public/gallery/`** — bot commits final web-ready files, GitHub Pages serves them as-is, simplest cross-repo commit, no Astro import wiring. (The bot already resizes/compresses via Pillow, so build-time optimization would be redundant.)
- **D-08:** The **site is image-format-agnostic** — it renders whatever `file` points to; the bot chooses the format (WebP/JPEG via Pillow).
- **D-09:** `loading="lazy"` + `decoding="async"` on all wall images except the first row.

### Masonry wall (`/galeria`)
- **D-10:** Masonry via **Masonry.js** (desandro) + **`imagesLoaded`**, driven by the stored `width`/`height` so layout settles without reflow. *(User chose the library over pure CSS `column-count` for true row balancing.)*
- **D-11:** The wall **renders all entries** (no pagination) with native lazy images. Realistic photo counts (tens–low hundreds) make this the simplest fast option; revisit a "load more" cap only if the gallery exceeds ~200 entries.
- **D-12:** **Captions show in the lightbox only** — the wall stays clean and even when only some entries have captions (caption still serves a11y as `alt`). When `gallery.json` is empty, the page keeps the branded **`EmptyState`** fallback (never looks broken; CTA reachable).

### Lightbox
- **D-13:** **Hand-rolled**, built on the existing **`dc-overlay`/`dc-modal` + focus-trap** pattern (reuse `chrome.ts` Escape/outside-click handlers). NOT PhotoSwipe/GLightbox. Caption is shown inside the lightbox.
- **D-14:** **Full polish:** loop at the ends, a counter (`3 / 24`), preload neighbor images for instant nav, Escape + backdrop-click to close, and mobile swipe (horizontal to navigate, down-to-close). All transitions respect `prefers-reduced-motion`.

### Featured subset (landing — GAL-04)
- **D-15:** Featured = **newest N=6 by `date`**, auto-curated. The bot just appends entries and the freshest work floats to the landing — no per-entry `featured` flag, no manual list, matches "staff keep the gallery current without touching code." N is adjustable.
- **D-16:** Featured presentation = a **responsive grid** (2-up mobile / 3-up desktop), lighter than a second Masonry instance above the fold. Clicking a featured photo **opens the lightbox in place** (keeps visitors on the landing near the CTA); a separate **"View full gallery"** link goes to `/galeria`. This **replaces the current `featured` Teaser** placeholder; the secondary "gallery" teaser CTA stays as a link-out.

### Claude's Discretion
- Exact grid breakpoints/gutters and masonry column widths; keep consistent with the Refined Street Editorial system.
- Reveal choreography for tiles (stagger like other Phase 2.1 reveals; must respect `prefers-reduced-motion`).
- Tiles render at natural aspect ratio in the wall (that's the point of masonry); lightbox shows the full image.
- Wording of the generic alt fallback + adding it (and any new gallery/lightbox UI strings) to the i18n dictionaries (`pages.json`), bilingual.
- Filename convention (date-slug-hash) is a bot-side concern; the site only relies on `file` being unique and stable.
- Script organization for Masonry + lightbox (e.g. a `src/scripts/gallery.ts`), mounted **swap-safe** via the View Transitions lifecycle (init on `astro:page-load`, teardown on `astro:before-swap`) like other Phase 2 scripts.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema contract & requirements
- `.planning/ROADMAP.md` — Phase 4 section (goal + 5 success criteria, esp. #5 "schema + image storage path finalized and documented for the bot") **and** Phase 5 section (BOT-01..06 — the downstream consumer that WRITES `gallery.json` and images, and the 🗑️ remove flow the schema must support)
- `.planning/REQUIREMENTS.md` — GAL-01..04 (in scope), the Non-Goals table (no caption auto-translation), and GAL2-01 (tag/category filter deferred to v2)

### Data-driven pattern to mirror
- `src/data/services.json` — the established build-imported data-file pattern (note: gallery captions are single-language, not bilingual-per-field like services)
- `src/pages/[lang]/[page].astro` — localized page resolver that renders section bodies
- `src/pages/en/galeria.astro` — the EN gallery route entry

### Reuse for the lightbox + wall
- `src/scripts/chrome.ts` — document-level Escape/outside-click + modal open/close handlers (re-query live DOM post-swap); base for lightbox behavior
- `src/components/CartSummaryModal.astro`, `src/components/CartDrawer.astro` — Phase 3.1 `dc-overlay`/`dc-modal` + focus-trap + `createElement`/`textContent` (XSS-safe) reference implementations
- `src/components/sections/GalleryPage.astro` — current `/galeria` shell (EmptyState) to replace with the masonry wall
- `src/components/sections/Teaser.astro` — landing `featured`/`gallery` teasers; the `featured` variant is replaced by the real subset
- `src/pages/[lang]/index.astro` — landing composition (order: hero → featured → about+process → packages → gallery teaser → closing) where the featured grid mounts

### Styling / motion
- `src/styles/sections.css` — section + ink/paper rhythm + reveal system the gallery must sit inside
- `src/scripts/motion/` — motion controller lifecycle (`initMotion`/`teardownMotion`) that gallery scripts must integrate with for swap safety + reduced-motion

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`chrome.ts` modal handlers** (Escape/outside-click, live-DOM re-query after View Transitions swap) — base for lightbox open/close.
- **Phase 3.1 cart modal** (`dc-overlay`/`dc-modal`, focus trap, `createElement` + `textContent` safe rendering) — pattern for building the lightbox DOM and rendering captions XSS-safe.
- **`EmptyState.astro`** — the gallery's empty fallback when `gallery.json` has no entries.
- **`services.json` import in `ServicesPage`/`PackagesSummary`** — the exact mirror for importing `gallery.json` at build time.

### Established Patterns
- **Astro View Transitions (ClientRouter) + motion lifecycle** — `initMotion` on `astro:page-load`, teardown on `astro:before-swap`. Masonry init + lightbox listeners MUST be swap-safe the same way, or they leak/duplicate across navigations.
- **Reveal choreography (Phase 2.1)** with a `prefers-reduced-motion` guard — reuse for gallery tile reveals.
- **i18n dictionaries (`pages.json`)** — gallery/teaser/lightbox copy + the alt fallback string flow through here, bilingual.

### Integration Points
- New `src/data/gallery.json` imported by both the wall (`GalleryPage`) and the landing featured grid.
- New `public/gallery/` directory — the image path the Phase 5 bot targets.
- `GalleryPage.astro` swapped from `EmptyState` → masonry wall.
- `index.astro` `featured` Teaser swapped → real featured grid (newest 6).
- New gallery script (Masonry + lightbox) mounted swap-safe via the motion lifecycle.

</code_context>

<specifics>
## Specific Ideas

- **Masonry.js (desandro) + imagesLoaded** was specifically chosen for the wall over pure CSS `column-count`.
- **Hand-rolled lightbox** was specifically chosen over PhotoSwipe/GLightbox (reuse existing modal + zero deps).
- **Featured N = 6**, newest-first, auto-curated from `date`.
- The `gallery.json` schema is deliberately minimal and bot-writable — this phase's #1 job is to lock it so Phase 5 can build against it without rework.

</specifics>

<deferred>
## Deferred Ideas

- **Filter gallery by category/tag** (GAL2-01) — already deferred to v2; requires staff tagging.
- **"Load more" / pagination / infinite scroll** for the wall — only if the gallery grows past ~200 entries; render-all + lazy images until then.
- **Separate `alt` field distinct from `caption`** — considered and rejected; a single caption reused as alt (with generic fallback) is enough given the bot supplies one string.
- **Pure CSS `column-count` / CSS-Grid-native masonry** — considered; rejected in favor of Masonry.js (grid-native masonry lacks production browser support in 2026).
- **Reuse the Phase 2 gallery marquee (D-14) for featured** — considered; rejected in favor of a static responsive grid (motion/conversion + reduced-motion trade-off).

None of these are lost — they're recorded for future phases.

</deferred>

---

*Phase: 04-gallery-data-layer*
*Context gathered: 2026-07-02*
