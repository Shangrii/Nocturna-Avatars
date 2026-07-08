---
phase: 06-asset-store
plan: 02
subsystem: ui
tags: [astro, i18n, store, quick-view, modal, focus-trap, jinxxy, nsfw, xss]

# Dependency graph
requires:
  - phase: 06-asset-store (Plan 01)
    provides: data-store-products JSON island (attribute channel), ProductCard [data-product-id] + [data-nsfw-reveal], store.ts astro:page-load lifecycle, store route concept
  - phase: 03.1-catalog-configurator
    provides: dc-overlay modal shell + WR-01 open/close + trapFocus pattern (CartSummaryModal, cart.ts)
  - phase: 04
    provides: LightboxOverlay gallery stage + prev/next/counter markup precedent
provides:
  - QuickViewModal.astro (dc-overlay quick-view: gallery + detail + validated buy CTA, JS-populated)
  - store.ts quick-view controller (island parse, open/close focus-trap, gallery, https-guarded buy)
  - single-product outbound purchase path to Jinxxy (STORE-04, link-out per D-18 NO branch)
affects: [06-03-purchase-cart]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Quick-view reuses the verified dc-overlay + WR-01 + trapFocus mechanics (copied, not refactored) — store-namespaced (.quickview-*), never touching cart.ts or #cart* hooks"
    - "Product-data island consumed via el.dataset.storeProducts -> JSON.parse into a per-load Map; every injected node set with textContent only (T-06-01)"
    - "checkoutUrl https-guard (startsWith('https://')) before assigning the buy href, else a disabled 'Enlace no disponible' state (T-06-02); rel=noopener noreferrer (T-06-03)"
    - "Whole ProductCard is a role=button/tabindex=0 quick-view opener; nested NSFW reveal button excluded from card activation via stopPropagation + target.closest() guard"

key-files:
  created:
    - src/components/QuickViewModal.astro
  modified:
    - src/scripts/store.ts
    - src/components/ProductCard.astro
    - src/pages/[lang]/[page].astro
    - src/i18n/pages.json

key-decisions:
  - "Buy vs. unavailable labels carried on data-label-buy / data-label-unavailable attributes of the buy anchor so the controller toggles i18n copy without hardcoding strings in JS (single-source i18n, mirrors LightboxOverlay's data-counter-label)."
  - "Editor credit + price rendered from island data with the localized prefix derived from document.documentElement.lang ('por'/'by', '$N USD') rather than reading card DOM — keeps the modal self-contained."
  - "Gallery counter template ('Imagen {n} de {total}') passed via data-counter-label; controller interpolates {n}/{total}. Prev/next + counter hidden for single-image products."

patterns-established:
  - "Pattern: per-page hooks (cards, overlay) re-bound each astro:page-load with element-level guards (data-qvBound / data-qvControlsBound); document-level Escape bound once via a module flag — mirrors cart.ts lifecycle discipline"

requirements-delivered-pending-verify: [STORE-04, STORE-05]

# Metrics
duration: ~18min
completed: 2026-07-07
---

# Phase 06 Plan 02: Asset Store — Quick-View + Single-Product Buy Summary

**Clicking or keyboard-activating a product card opens a focus-trapped dc-overlay quick-view showing the product's image gallery, full description, price, and editor, with a checkoutUrl-validated "Comprar en Jinxxy" / "Buy on Jinxxy" link — the first slice where a visitor can complete a single-product purchase (link-out to the hosted Jinxxy checkout).**

## Performance
- **Duration:** ~18 min
- **Completed:** 2026-07-07
- **Tasks:** 2 code tasks complete (Task 3 is a blocking human-verify checkpoint — pending)
- **Files:** 5 (1 created, 4 modified)

## Accomplishments
- `QuickViewModal.astro`: canonical `dc-overlay` contract (`role="dialog"`, `aria-modal`, `aria-labelledby`, `data-lenis-prevent`, `hidden`) with empty `[data-quickview-*]` hooks — gallery stage (img + prev/next + counter), title, editor, price, description, primary buy anchor (`target="_blank" rel="noopener noreferrer"`), a `[data-quickview-actions]` slot reserved for Plan 03's add-to-cart, and a `.dc-dismiss` close. `is:global` `.quickview-*` CSS; the buy button uses the reserved red-fill CTA register.
- `store.ts` quick-view controller: parses the `[data-store-products]` island into a per-load `Map`, opens/closes a focus-trapped modal (WR-01 unhide-before-active; close re-hides on `transitionend` filtered by `propertyName === 'opacity'`, gated by reduced-motion), Escape + backdrop close, focus return to the originating card.
- Gallery: shows `images[0]`, prev/next cycle + live counter (`Imagen {n} de {total}`), controls hidden for single-image products; NSFW products inherit the card's reveal state (blurred quick-view when the card was not revealed, D-10).
- Security: buy `href` assigned only after `checkoutUrl.startsWith('https://')` (T-06-02) — otherwise the control drops its href, gains `aria-disabled` + `.quickview__buy--disabled`, and shows "Enlace no disponible" / "Link unavailable"; every injected node uses `textContent` (T-06-01); `rel="noopener noreferrer"` on the outbound link (T-06-03).
- `ProductCard`: whole card is a `role="button"` / `tabindex="0"` opener with an `aria-label` (product name) and a `:focus-visible` ring; the NSFW reveal `<button>` `stopPropagation`s and is excluded via `target.closest('[data-nsfw-reveal]')` so it toggles blur without opening the modal.
- Mounted store-only: `[lang]/[page].astro` renders `<QuickViewModal>` in the `concept === 'store'` `chrome-bottom` slot (escapes `<main>`'s view-transition stacking context). Present on `/en/store` + `/es/tienda`, absent on `/es/servicios`.

## Task Commits
1. **Task 1: QuickViewModal shell + quick-view i18n copy** — `c0c9eb1` (feat)
2. **Task 2: quick-view controller + card wiring + store mount** — `a076623` (feat)
3. **Task 3: Human verification — quick-view + single-product buy** — checkpoint (no code; pending human verify)

## Files Created/Modified
- `src/components/QuickViewModal.astro` - dc-overlay quick-view shell (gallery + detail + validated buy CTA), JS-populated, `.quickview-*` is:global CSS
- `src/scripts/store.ts` - added the quick-view controller (island parse, open/close focus-trap, gallery, https-guarded buy, Escape/backdrop) alongside the existing browse behaviors
- `src/components/ProductCard.astro` - card made a keyboard-operable `role="button"` opener with focus-visible ring
- `src/pages/[lang]/[page].astro` - import + store-only `chrome-bottom` mount of `QuickViewModal`
- `src/i18n/pages.json` - `tienda` quick-view strings (es + en): `buyCta`, `quickViewClose`, `linkUnavailable`, `galleryPrev`, `galleryNext`, `galleryCounter`

## Decisions Made
- **i18n labels carried on data-* attributes.** The buy anchor exposes `data-label-buy` / `data-label-unavailable` and the overlay exposes `data-counter-label`, so the controller swaps localized copy without hardcoding strings in JS — the same channel LightboxOverlay uses for its counter/close labels.
- **Editor/price derived in-controller from island data + `documentElement.lang`.** `${credit} ${editor}` ('por'/'by') and `$${price} USD` are built from the island product, keeping the modal self-contained rather than scraping card DOM.

## Deviations from Plan

### Implementation choices (no user decision required)

**1. [Rule 3 - Blocking gate reconciliation] Reworded comment mentions of the raw-HTML sink to pass the literal `innerHTML` grep gate**
- **Found during:** Task 2 (store.ts verification)
- **Issue:** The acceptance gate is a literal `grep -c "innerHTML" src/scripts/store.ts` that must return 0, but explanatory comments ("textContent — never innerHTML") tripped it (count 4) even though no raw-HTML sink is used.
- **Fix:** Reworded the four comment occurrences to "no raw-HTML sink" while keeping the T-06-01 intent explicit. No code behavior changed — population is `createElement`/`textContent` only.
- **Files modified:** src/scripts/store.ts
- **Verification:** `grep -c innerHTML src/scripts/store.ts` = 0; build green.
- **Committed in:** a076623

**2. [Rule 2 - Missing hook for the stated behavior] Added `data-label-buy` / `data-label-unavailable` to the buy anchor**
- **Found during:** Task 2 (wiring the buy control)
- **Issue:** The controller must toggle the anchor label between "Comprar en Jinxxy" and "Enlace no disponible" across reuses of the single shared modal; a stable, localized source for both labels was required (the live textContent is unstable once toggled).
- **Fix:** Added `data-label-buy={t.buyCta}` and `data-label-unavailable={t.linkUnavailable}` to the buy anchor in `QuickViewModal.astro` (folded into the Task 2 commit). Keeps i18n single-sourced in `pages.json`.
- **Files modified:** src/components/QuickViewModal.astro
- **Committed in:** a076623

---

**Total deviations:** 2 implementation choices (1 gate reconciliation, 1 missing hook). No scope creep; no architectural change.

## Worktree / Environment Note
- This plan ran as a parallel worktree executor. Early Bash calls `cd`-ed into the **main** repo path (cwd-drift, #3097), so the first Task-1 edits landed in the main working tree on `revamp`. Detected via the pre-commit HEAD assertion (branch came back `revamp`, not `worktree-agent-*`). Recovered cleanly: reverted the main repo (`git checkout -- src/i18n/pages.json`, removed the stray component), then re-applied all work inside the worktree using worktree-absolute paths and `git -C <worktree>`. The main repo working tree is clean; every 06-02 commit lives on `worktree-agent-af2f6195b45a5b24c`.
- The worktree had no `node_modules` (git worktrees don't copy gitignored dirs); created a directory junction to the main repo's `node_modules` (gitignored, not committed) so `npm run build` runs in-worktree. All build verification above ran against the worktree source.

## Threat Surface Scan
No new security surface beyond the plan's `<threat_model>`. All three registered threats are mitigated in code: T-06-01 (textContent-only injection), T-06-02 (https-guard before buy href), T-06-03 (`rel="noopener noreferrer"`). No new endpoints, auth paths, or schema changes.

## Automated Verification (passed)
- `npm run build` exits 0 (14 pages).
- Quick-view i18n present in both locales (node assertion: "quick-view i18n OK").
- `dist/en/store/index.html` + `dist/es/tienda/index.html` contain `data-quickview-overlay`; `dist/es/servicios/index.html` does NOT (store-only, concept-gated).
- `grep -c set:html src/components/QuickViewModal.astro` = 0; `grep -c innerHTML src/scripts/store.ts` = 0.
- store.ts contains the `startsWith('https://')` buy-href guard and the NSFW `stopPropagation` exclusion; no `#cart*` / `data-cart-*` / `cart-modal` DOM hooks referenced (cotización untouched).
- `/es/servicios` still ships the cotización `cartPill` (no regression).

## Checkpoint — Task 3 (human-verify, blocking) — PENDING
No code changes remain. The quick-view + single-product-buy slice awaits human visual/functional verification per the plan's how-to-verify steps: `npm run dev`, open `/en/store`, click a card (gallery + description + "$N USD" + "by {editor}" + "Buy on Jinxxy"), follow the buy link to Jinxxy in a new tab, exercise prev/next + counter on a multi-image product, keyboard flow (Tab→Enter opens, Tab trapped, Escape closes + focus returns, backdrop closes), NSFW reveal-then-open (blur inherited), a non-https `checkoutUrl` shows "Link unavailable", `/es/tienda` renders Spanish copy, and `/es/servicios` cotización is intact with no quick-view. Resume signal: "approved" or a description of issues.

## Known Stubs
- `[data-quickview-actions]` slot renders empty — the secondary "Agregar al carrito" button is Plan 03's insertion point (intentional forward-looking hook; the primary buy path is fully functional without it). `tienda.addToCart` remains seeded-but-unrendered from Plan 01 for the same reason.

## Next Phase Readiness
- Plan 03 (purchase cart) can inject its add-to-cart control into `[data-quickview-actions]` and will be excluded from card activation via the existing `target.closest('[data-store-add]')` guard already wired in `store.ts`.
- The island-parse `Map`, focus-trap helper, and https-guard are reusable by the sibling `store-cart.ts`.

## Self-Check: PASSED
All 5 source files (1 created + 4 modified) exist on disk in the worktree; both task commits (c0c9eb1, a076623) are present in the worktree branch history.

---
*Phase: 06-asset-store*
*Completed: 2026-07-07*
