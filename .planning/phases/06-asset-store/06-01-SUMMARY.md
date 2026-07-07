---
phase: 06-asset-store
plan: 01
subsystem: ui
tags: [astro, i18n, store, catalog, json-island, nsfw, image-fallback, tailwind]

# Dependency graph
requires:
  - phase: 03.1-catalog-configurator
    provides: cart.ts astro:page-load lifecycle pattern (per-load guard + readyState fallback), CartPill/CartDrawer DOM precedents
  - phase: 02.1-visual-redesign
    provides: theme.css @theme tokens (--color-*, --space-*, --type-*, --font-*), NightBackground, interior-page nav-dark pattern
  - phase: 04
    provides: GalleryPage copy-before-sort + CLS-free aspect-box + EmptyState precedent
provides:
  - store.json D-13 product catalog data contract (staff-editable, no code change)
  - StorePage + ProductCard components (bilingual grid, featured-then-newest sort, nsfw blur/reveal, image fallback)
  - store.ts client display module (swap-safe image-fallback + nsfw reveal)
  - 'store' route concept (/es/tienda + /en/store) wired into routes.ts + nav + resolver
  - data-store-products JSON island (attribute channel) for Plans 02/03 to consume
affects: [06-02-quick-view, 06-03-purchase-cart]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "JSON island via data-* ATTRIBUTE (not <script> textContent): Astro attribute auto-escaping + browser attribute decoding is lossless AND breakout-safe, satisfying T-06-01 without set:html"
    - "Store display behaviors in a dedicated swap-safe module (store.ts) mirroring cart.ts page-load lifecycle; no cart logic (Plan 03)"
    - "NSFW reveal: per-card per-session class toggle with a re-hide chip; blur filter kept under reduced-motion, only the transition gated"

key-files:
  created:
    - src/data/store.json
    - public/store/placeholder.svg
    - src/components/ProductCard.astro
    - src/components/sections/StorePage.astro
    - src/scripts/store.ts
  modified:
    - src/i18n/pages.json
    - src/i18n/routes.ts
    - src/i18n/nav.json
    - src/components/Nav.astro
    - src/pages/[lang]/[page].astro

key-decisions:
  - "JSON island emitted via the data-store-products ATTRIBUTE rather than <script> textContent — the only channel that is both XSS-breakout-safe and lossless while satisfying the acceptance grep (set:html count = 0). Consumers read el.dataset.storeProducts then JSON.parse."
  - "NSFW reveal button persists after reveal as a corner Ocultar/Hide chip so its label can toggle reveal<->hide (plan's store.ts contract requires the label swap)."

patterns-established:
  - "Pattern: staff-editable data catalog with a leading _comment documenting the edit contract (mirrors services.json convention)"
  - "Pattern: store route reuses the central concept map — one line in routes.ts/nav auto-wires nav link, active state, and language switcher by concept"

requirements-completed: [STORE-01, STORE-02, STORE-05]

# Metrics
duration: 16min
completed: 2026-07-07
---

# Phase 06 Plan 01: Asset Store — Browse Slice Summary

**A bilingual /tienda · /en/store page renders products from staff-editable store.json — featured-pinned-then-newest grid with $price USD, editor credit, NSFW blur/keyboard-reveal, broken-image placeholder fallback, a JSON data island for later slices, and a branded empty state.**

## Performance

- **Duration:** ~16 min
- **Completed:** 2026-07-07
- **Tasks:** 2 code tasks complete (Task 3 is a human-verify checkpoint — pending)
- **Files modified:** 10 (5 created, 5 modified)

## Accomplishments
- `store.json` D-13 locked schema with 4 seed products (one `featured`, one `nsfw`, varied dates) — every name/description bilingual (D-15); staff edit data only, no code change (D-05/D-13).
- `StorePage` + `ProductCard`: bilingual resolve, `.slice()` before sort, featured-then-newest ordering (D-09), `${price} USD`, plain-text `por/by {editor}` (D-16), featured red badge, NSFW blur + keyboard-operable reveal (D-10), CLS-free aspect box with image-error fallback to `/store/placeholder.svg` (D-11).
- `store.ts`: swap-safe (`astro:page-load` guard + `readyState` fallback) image-fallback + NSFW reveal behaviors; no cart logic (Plan 03).
- `store` route concept wired: `/es/tienda` + `/en/store` emit as distinct static pages; nav shows Tienda/Store with active state + language-switcher-by-concept; `/servicios` cotización chrome untouched.
- `data-store-products` JSON island emitted losslessly (verified round-trip parse) for the Plan 02 quick-view + Plan 03 purchase cart.

## Task Commits

1. **Task 1: Seed store data + product grid components** — `b13f01e` (feat)
2. **Task 2: Register store route concept + nav link + resolver render** — `65c216d` (feat)
3. **Task 3: Human verification — browse slice** — checkpoint (no code; pending human verify)

## Files Created/Modified
- `src/data/store.json` - D-13 product catalog (staff write-target, `_comment` documents the contract)
- `public/store/placeholder.svg` - branded broken-image fallback (navy ground, red accent, off-white glyph)
- `src/components/ProductCard.astro` - single product card (image, name, price, editor, featured badge, NSFW blur/reveal)
- `src/components/sections/StorePage.astro` - grid body, bilingual resolve + sort, JSON island, night backdrop, EmptyState
- `src/scripts/store.ts` - swap-safe image-fallback + NSFW reveal client module
- `src/i18n/pages.json` - `tienda` strings (es + en)
- `src/i18n/routes.ts` - `store` concept (/es/tienda, /en/store) + navConcepts slot
- `src/i18n/nav.json` - `navStore` (Tienda / Store)
- `src/components/Nav.astro` - `conceptLabels.store = t.navStore`
- `src/pages/[lang]/[page].astro` - StorePage import, getStaticPaths, meta branch, body render

## Decisions Made
- **JSON island via attribute, not textContent.** The plan describes serializing the island with `<` → `<` to prevent a `</script>` breakout (T-06-01). Emitting that into `<script>` textContent requires `set:html` (Astro auto-escaping inside script data would corrupt the JSON, since the HTML parser does not decode entities in script data). The acceptance criteria forbids `set:html` (grep count must be 0). The `data-store-products` attribute channel resolves both: Astro auto-escapes the attribute value and the browser losslessly decodes it in the attribute-value state, so a `</script>` in staff data becomes an inert string and JSON stays valid. Verified: the emitted island round-trips through `JSON.parse` to 4 products. Consumers read `el.dataset.storeProducts`.
- **NSFW reveal is a toggle.** The plan's `store.ts` action requires swapping the button label between the reveal/hide strings, which requires the button to remain operable after reveal. Implemented as a centered reveal button that shrinks to a corner "Ocultar/Hide" chip once revealed; `ProductCard` gained an `nsfwHide` prop and `data-label-reveal` / `data-label-hide` attributes.

## Deviations from Plan

### Implementation choices (no user decision required)

**1. [Rule 3 - Blocking constraint reconciliation] JSON island uses the `data-store-products` attribute instead of `<script>` textContent**
- **Found during:** Task 1 (StorePage)
- **Issue:** The plan's literal instruction (island *content* = serialized JSON) collides with the acceptance criteria (`set:html` grep count = 0). Lossless JSON inside `<script>` textContent is only achievable with `set:html`; Astro auto-escaping of a text child corrupts JSON because the HTML parser does not decode entities in script data.
- **Fix:** Serialized the products to the `data-store-products` attribute value (auto-escaped by Astro, decoded losslessly by the browser). Same `<script type="application/json" data-store-products>` element and grep target; XSS-breakout-safe (T-06-01) and lossless.
- **Files modified:** src/components/sections/StorePage.astro
- **Verification:** dist round-trip `JSON.parse` yields 4 products; `set:html` grep = 0 on both components.
- **Committed in:** b13f01e

**2. [Rule 2 - Missing critical for the stated behavior] NSFW reveal made a persistent toggle**
- **Found during:** Task 1 (ProductCard + store.ts)
- **Issue:** The `store.ts` action requires swapping the button label reveal↔hide, but a button that vanishes on reveal cannot toggle back.
- **Fix:** Reveal button persists (corner chip when revealed); `nsfwHide` prop + label data attributes added; store.ts swaps `textContent` (XSS-safe) and `aria-pressed`.
- **Files modified:** src/components/ProductCard.astro, src/components/sections/StorePage.astro, src/scripts/store.ts
- **Verification:** build green; `data-nsfw-reveal` present in dist.
- **Committed in:** b13f01e

---

**Total deviations:** 2 implementation choices (1 constraint reconciliation, 1 behavior completion). No scope creep; no architectural change.
**Impact on plan:** Both keep the plan's intent (breakout-safe island; keyboard-operable NSFW reveal with label swap) while satisfying the automated acceptance gates.

## Known Stubs
- `pages.json` `tienda.addToCart` string is seeded (per the plan's browse-slice string list) but not yet rendered — the add-to-cart control ships in Plan 03. Intentional forward-looking string; does not block the browse capability.
- `store.ts` contains no cart logic by design (purchase cart is Plan 03's sibling `store-cart.ts`). Documented in the module header.

## Issues Encountered
- Worktree Write/Edit required the canonical uppercase-drive absolute path (`C:\...`); the lowercase `c:\...` form was rejected by the isolation guard. Resolved by using the canonical path form.

## Automated Verification (passed)
- `npm run build` exits 0 (14 pages; +2 store pages).
- store.json node assertion: "store.json OK: 4 products" (bilingual fields complete, featured + nsfw seeds present).
- `dist/es/tienda/index.html` + `dist/en/store/index.html` exist with `product-card` markup and the correct localized nav links.
- No language leak: EN name present + ES name absent on `/en/store`, and vice-versa on `/es/tienda`.
- `set:html` grep = 0 on ProductCard + StorePage; `data-store-products` island present and round-trips through `JSON.parse`.
- `/es/servicios` unchanged: no `storeCart` id leaked, cotización `cartPill` intact.

## Checkpoint — Task 3 (human-verify, blocking) — PENDING
No code changes remain. The browse slice awaits human visual/functional verification (see the plan's how-to-verify steps: run `npm run dev`, open `/en/store`, check grid/ordering/NSFW reveal/keyboard, switch to `/es/tienda` for i18n, resize 375/768/1024/1440 + reduced-motion, and confirm `/es/servicios` cotización still works). Resume signal: "approved" or a description of issues.

## Next Phase Readiness
- Data contract, route, grid, and JSON island are the foundation Plan 02 (quick-view) and Plan 03 (purchase cart) build on.
- Consumers of the island: read `document.querySelector('[data-store-products]').dataset.storeProducts` → `JSON.parse` (fields: id, name, description, price, images, checkoutUrl, editor, nsfw).
- Blocker: none for code; browse slice pending the Task 3 human verification gate.

## Self-Check: PASSED
All 5 created source files + SUMMARY.md exist on disk; both task commits (b13f01e, 65c216d) are present in git history.

---
*Phase: 06-asset-store*
*Completed: 2026-07-07*
