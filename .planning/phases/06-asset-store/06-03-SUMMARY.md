---
phase: 06-asset-store
plan: 03
subsystem: ui
tags: [astro, store, cart, localStorage, jinxxy, xss, i18n, focus-trap, reconcile]

# Dependency graph
requires:
  - phase: 06-asset-store (Plan 01)
    provides: data-store-products JSON island (attribute channel), store route concept, ProductCard [data-product-id], tienda.addToCart string, store.ts page-load lifecycle
  - phase: 06-asset-store (Plan 02)
    provides: QuickViewModal [data-quickview-actions] slot, store.ts quick-view controller + Map/trapFocus/https-guard, card [data-store-add] exclusion already wired
  - phase: 03.1-catalog-configurator
    provides: cart.ts mechanics copied verbatim (WR-01 open/close, trapFocus, badge sync, astro:page-load lifecycle), CartPill/CartDrawer component precedents
provides:
  - store-cart.ts — sibling purchase-cart engine (localStorage persistence + reconcile + per-product Jinxxy links)
  - StoreCartPill (52px red FAB, #storeCartPill, shopping-cart glyph) + StoreCartDrawer (flat list, per-item buy links + reference total)
  - add-to-cart controls on the ProductCard and in the QuickViewModal right rail
  - store-only cart chrome mount (chrome-bottom, concept-gated) — complete storefront browse -> detail -> cart -> checkout
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Purchase cart is a SIBLING of cart.ts (copied, never imported): distinct Map, distinct #storeCart* DOM contract, distinct localStorage key — the store cart and /servicios cotización never share hooks (D-19)"
    - "localStorage['nocturna-store-cart'] stores [id, qty] pairs only; on init they are reconciled against the canonical [data-store-products] island — unknown ids dropped, name/price/checkoutUrl rebuilt from data (never trust stored price/url — T-06-04)"
    - "Per-product checkout (D-18 NO branch): each drawer row carries its own https-guarded Jinxxy <a target=_blank rel=noopener noreferrer>; the total is a labeled reference only, no single buy-all button"
    - "i18n strings the JS engine needs ride on data-i18n-* attributes of the drawer (single-sourced from pages.json, XSS-safe); every drawer node built with createElement/textContent (T-06-01)"

key-files:
  created:
    - src/scripts/store-cart.ts
    - src/components/StoreCartPill.astro
    - src/components/StoreCartDrawer.astro
  modified:
    - src/i18n/pages.json
    - src/components/ProductCard.astro
    - src/components/QuickViewModal.astro
    - src/components/sections/StorePage.astro
    - src/pages/[lang]/[page].astro
    - src/scripts/store.ts

key-decisions:
  - "Engine i18n carried on the drawer's data-i18n-pill-label / -buy / -remove / -unavailable attributes (single-sourced from pages.json), read by store-cart.ts at runtime — mirrors QuickViewModal's data-label-* channel; keeps copy out of JS and XSS-safe."
  - "The quick-view add button has NO product-id in markup; store.ts sets data-product-id to the currently-viewed product on open, so store-cart.ts's uniform [data-store-add] handler adds the right item from both the card and the quick-view."
  - "Empty state renders heading (cartEmpty) + body (cartEmptyBody) via CSS :empty ::before/::after from data-empty-label / data-empty-body — CSS-only, bilingual, no JS."

requirements-delivered-pending-verify: [STORE-03, STORE-04]

# Metrics
duration: ~13min
completed: 2026-07-07
---

# Phase 06 Plan 03: Asset Store — Purchase Cart Summary

**A real, persistent multi-item purchase cart for the store: add from a card or the quick-view, a running pill badge + slide-in drawer listing each product with its own https-guarded "Comprar en Jinxxy" link and a "Total (referencia)", localStorage persistence reconciled against store.json on load, and full separation from the /servicios cotización — completing the storefront (browse -> detail -> cart -> checkout).**

## Performance
- **Duration:** ~13 min
- **Completed:** 2026-07-07
- **Tasks:** 2 code tasks complete (Task 3 is a blocking human-verify checkpoint — pending)
- **Files:** 9 (3 created, 6 modified)

## Accomplishments
- `store-cart.ts`: a sibling of cart.ts (mechanics COPIED, never imported). Module-level `Map<id, {id,name,price,checkoutUrl,qty}>` (flat, text-only rows), `astro:page-load` + `before-swap` reset + `readyState` fallback lifecycle, WR-01 drawer open/close (unhide-before-active; close re-hides on `transitionend` filtered by `propertyName === 'transform'`, gated by reduced-motion), `trapFocus` on `#storeCartDrawer`, Escape + backdrop-click bound once via a module flag, focus return to `#storeCartPill`.
- Persistence + reconcile (D-20 / T-06-04): `localStorage['nocturna-store-cart']` holds `[id, qty]` pairs only; on hydrate they are reconciled against the canonical `[data-store-products]` island — unknown ids dropped, name/price/checkoutUrl rebuilt from the island (stored price/url never trusted), corrupt storage caught and started empty; `reconcileInMemory()` re-refreshes entries against the island on every navigation and re-persists when ids drop.
- Security: every drawer row built with `createElement` + `textContent` (no raw-HTML sink — T-06-01); per-item buy href assigned ONLY when `checkoutUrl.startsWith('https://')` (T-06-02) else a disabled `linkUnavailable` span; outbound links carry `target="_blank" rel="noopener noreferrer"` (T-06-03).
- `StoreCartPill`: 52px red FAB (`#storeCartPill`, z-index 905), shopping-cart glyph, badge-pop gated to `prefers-reduced-motion: no-preference`, initial aria-label from `cartPillLabel` with n=0, and an `is:global` `.floating-cta` shift so "Abrir Ticket" sits beside the pill (ships store-only).
- `StoreCartDrawer`: namespaced `store-cart-*` FLAT list (no category machinery), per-item Jinxxy `.store-cart-drawer__buy` links, footer = `cartTotalLabel` reference total + `cartFooterNote` (NO buy-all button), CSS-only bilingual empty state.
- add-to-cart controls: an outline `product-card__add` (`data-store-add`) on the card (stopPropagation so it never opens the quick-view) and a secondary `quickview__add` in the quick-view right rail beside the red buy CTA; store.ts points the quick-view button at the viewed product on open.
- Mounted store-only: `[page].astro` renders `StoreCartDrawer` + `StoreCartPill` in the `concept === 'store'` `chrome-bottom` fragment — present on `/en/store` + `/es/tienda`, absent on all services routes (D-19); StorePage imports `store-cart.ts` alongside `store.ts`.
- cart i18n added to `tienda` (es + en): `cartPillLabel`, `cartEyebrow`, `cartTitle`, `cartClose`, `cartBuyItem`, `cartTotalLabel`, `cartFooterNote`, `cartEmpty`, `cartEmptyBody`, `cartRemove`.

## Task Commits
1. **Task 1: StoreCartPill + StoreCartDrawer + cart i18n copy** — `57c2376` (feat)
2. **Task 2: store-cart.ts engine + add-to-cart controls + store-only cart mount** — `9bf4b60` (feat)
3. **Task 3: Human verification — purchase cart + isolation from cotización** — checkpoint (no code; pending human verify)

## Files Created/Modified
- `src/scripts/store-cart.ts` - sibling purchase-cart engine (persistence + reconcile + per-product links + WR-01 drawer)
- `src/components/StoreCartPill.astro` - 52px red FAB, shopping-cart glyph, floating-cta shift
- `src/components/StoreCartDrawer.astro` - flat list drawer, per-item Jinxxy links + reference total
- `src/i18n/pages.json` - `tienda` cart strings (es + en)
- `src/components/ProductCard.astro` - outline add-to-cart control + `addToCart` prop
- `src/components/QuickViewModal.astro` - secondary add-to-cart button + right-rail styling
- `src/components/sections/StorePage.astro` - import store-cart.ts; pass `addToCart` to ProductCard
- `src/pages/[lang]/[page].astro` - store-only chrome-bottom mount of StoreCartDrawer + StoreCartPill
- `src/scripts/store.ts` - set the quick-view add button's data-product-id on open

## Decisions Made
- **Engine i18n via drawer data-i18n-* attributes.** `store-cart.ts` reads `cartPillLabel` / `cartBuyItem` / `cartRemove` / `linkUnavailable` off the drawer's `data-i18n-*` attributes rather than hardcoding copy in JS — single-sourced from `pages.json`, XSS-safe, mirrors the QuickViewModal `data-label-*` pattern.
- **Quick-view add wiring.** The quick-view add button carries no static product-id; `store.ts` sets its `data-product-id` to the opened product, so store-cart.ts's one `[data-store-add]` handler serves both the card and the quick-view.

## Deviations from Plan

### Implementation choices (no user decision required)

**1. [Rule 3 - Gate reconciliation] Reworded a StoreCartPill comment to avoid the literal `#cartPill` token**
- **Found during:** Task 1 verification (namespace-collision grep).
- **Issue:** The acceptance criterion requires that neither component contains the bare `#cartPill`/`#cartDrawer` tokens. A doc comment ("NEVER shares hooks with cart.ts (#cartPill / .cart-pill__badge)") tripped the grep even though it is only explanatory text, not a selector.
- **Fix:** Reworded the comment to "NEVER shares hooks with cart.ts's cotización pill/badge …" — the D-19 intent is preserved and no code behavior changed.
- **Files modified:** src/components/StoreCartPill.astro
- **Verification:** `grep -oE "#cartPill|#cartDrawer"` across both new components = 0.
- **Committed in:** 57c2376

---

**Total deviations:** 1 implementation choice (gate reconciliation). No scope creep; no architectural change.

## Pre-existing Issue Observed (out of scope — logged, not fixed)
- **`/servicios` cotización chrome (pill + drawer + summary modal) does not render in the build.** Discovered while running the D-19 isolation checks. `dist/es/servicios/index.html` (and every services route variant) has `cart-fab` = 0, `data-cart-total` = 0, `"Ver mi cotización"` = 0, while the ServicesPage BODY renders fully (`catalog-row` = 144). This is PRE-EXISTING: the 06-03 diff vs base `19ffee2` touches none of the cotización dependency set (services fragment in `[page].astro` is byte-identical; `CartPill`/`CartDrawer`/`CartSummaryModal`/`ServicesPage`/`routes.ts` untouched; the only shared change, `pages.json`, adds `tienda` keys only). Likely tied to the still-open Phase 03.1 plan `03.1-06` (no SUMMARY yet). Logged to `.planning/phases/06-asset-store/deferred-items.md` (D1). **No 06-03 impact:** D-19 store-side isolation is satisfied — `store-cart-fab` = 0 on all services paths, = 1 on store pages; the store cart never leaks into services. Flagged here so the Task 3 human-verify can distinguish this pre-existing gap from a 06-03 regression.

## Threat Surface Scan
No new security surface beyond the plan's `<threat_model>`. All four registered threats are mitigated in code: T-06-01 (textContent/createElement-only rows), T-06-02 (https-guard before per-item buy href), T-06-03 (`rel="noopener noreferrer"` on every row link), T-06-04 (reconcile stored `[id, qty]` against the canonical island — drop unknown ids, refresh name/price/url). No new endpoints, auth paths, or schema changes.

## Automated Verification (passed)
- `npm run build` exits 0 (14 pages).
- cart i18n present in both locales (node assertion: "cart i18n OK").
- `dist/en/store/index.html` + `dist/es/tienda/index.html` render `storeCartPill` + `storeCartDrawer` (`store-cart-fab` = 1, `store-cart-drawer` present, `data-store-cart-total` = 1); `dist/es/servicios/index.html` renders NEITHER (`store-cart-fab` = 0, `data-store-add` = 0 — concept-gated, D-19).
- `grep -c "innerHTML" src/scripts/store-cart.ts` = 0 (createElement + textContent only — T-06-01).
- store-cart.ts persists to `localStorage['nocturna-store-cart']` and reads `[data-store-products]` for reconcile; `startsWith('https://')` guard present; `noopener noreferrer` on row links.
- store-cart.ts references no `#cartPill` / `#cartDrawer` / `.catalog-` and does not import cart.ts (grep = 0).
- Store renders 4 card add controls + 1 quick-view add control (`data-store-add` = 5); no single buy-all button (`data-store-cart-ticket` = 0).

## Checkpoint — Task 3 (human-verify, blocking) — PENDING
No code changes remain. The purchase-cart slice awaits human visual/functional verification per the plan's how-to-verify steps: `npm run dev`, open `/en/store`, add from two cards (badge = 2, no quick-view opens), add from a quick-view, open the drawer (per-item name / "$N USD" / "Buy on Jinxxy" / × remove; "Total (reference)" + note; no buy-all button), follow a buy link (new tab), single-click remove (no confirm), refresh + navigate (contents persist; `nocturna-store-cart` holds `[id, qty]` pairs), edit store.json price + delete an in-cart product then rebuild (reconcile drops the deleted, shows the new price), keyboard (Tab→Enter opens, focus trapped, Escape closes + returns focus, backdrop closes, reduced-motion), and confirm `/es/servicios` cotización behavior + no store-cart leakage. **Note for the verifier:** the cotización chrome currently does not render on `/servicios` in the build — this is a pre-existing gap (see "Pre-existing Issue Observed" above / deferred-items.md D1), not a 06-03 regression. Resume signal: "approved" or a description of issues.

## Known Stubs
None. `tienda.addToCart` (seeded but unrendered since Plan 01) and the `[data-quickview-actions]` slot (empty since Plan 02) are both now wired and rendered. All added i18n keys are consumed.

## Next Phase Readiness
- The storefront is complete: browse (Plan 01) -> detail/quick-view (Plan 02) -> cart + per-product checkout (Plan 03). STORE-03 + STORE-04 delivered pending the Task 3 human gate.
- Future store enhancements can reuse the `store-cart.ts` persistence+reconcile pattern and the `data-i18n-*` engine-copy channel.

## Self-Check: PASSED
All 3 created files (store-cart.ts, StoreCartPill.astro, StoreCartDrawer.astro) + the 6 modified files exist on disk in the worktree; both task commits (57c2376, 9bf4b60) are present in the worktree branch history.

---

## Checkpoint Fixes (post human-verify, 2026-07-08)

The Task 3 human-verify checkpoint returned two refinements. Both shipped on branch `revamp` as atomic commits.

### Fix 1 — Add-to-cart success feedback + cart pill pulse — `1030e99` (fix)
The add button previously gave no confirmation. Added:
- **Button label swap:** clicking an add control (card **and** quick-view right rail) swaps the label to a bilingual `✓ Añadido` / `✓ Added` with a persistent red-fill `.is-added` state for ~1.5s, then reverts to the default label. textContent-only (T-06-01); the default + added labels ride on `data-label-default` / `data-label-added` (single-sourced from `pages.json` → `addedToCart`). A per-element timer id on the dataset cancels a pending revert on rapid re-click, and `store.ts` clears any stale success state when the shared quick-view button is re-pointed at a new product on open.
- **Screen-reader announcement:** a visually-hidden `role="status" aria-live="polite"` region on the always-rendered `StoreCartPill` (kept OUT of the `[hidden]` drawer, which is `display:none` and would suppress announcements) is written `Añadido al carrito: {name}` / `Added to cart: {name}` (i18n `cartAddedAnnounce`) on each add — cleared then re-set next frame so adding the same product twice still re-announces.
- **Badge pulse:** the pill badge bumps (`store-cart-pill__badge--bump`, scale 1→1.4→1) on every count change; the class is removed on `animationend` and re-triggered via forced reflow. The first-appearance `pop` is retained. Both animations sit inside `@media (prefers-reduced-motion: no-preference)`, and `pulseBadge()` early-returns under reduced motion — reduced-motion users get an instant, animation-free count update. The button feedback is a colour/label change only (no keyframe), so it is reduced-motion safe by construction.

### Fix 2 — Multi-storefront schema prepared (data + quick-view) — `cee7c63` (feat)
Prepared the data model + rendering for future stores (booth, gumroad, …) WITHOUT rendering anything today:
- **Data model:** `store.json` `_comment` now documents an OPTIONAL per-product `storefronts` array of `{ "platform": "booth", "url": "https://…" }`. `checkoutUrl` is unchanged and stays the primary Jinxxy buy button (full backward compat). **No seed product carries `storefronts`.**
- **Flow-through:** `storefronts` threads `store.json` → `StorePage.astro` island (both the resolved-product map and the `data-store-products` island JSON; `undefined` is dropped by `JSON.stringify`, so the island carries no `storefronts` key today) → `store.ts` `QuickViewProduct`.
- **Prepared render loop:** `QuickViewModal.astro` gained a reserved, currently-empty `.quickview__storefronts` container in the right rail below the primary buttons. `store.ts` `renderStorefronts()` appends one platform-labeled outbound `<a>` per entry — same guards as the primary CTA (`https://` check before href — T-06-02; `rel="noopener noreferrer"` — T-06-03; `createElement`/`textContent` only — T-06-01). Because no product defines `storefronts`, the loop renders nothing and `:empty { display: none }` collapses the container so the rail shows no void.
- **JSON-only future edits:** the CTA template `storefrontCta` (`Comprar en {platform}` / `Buy on {platform}`) and a `storefrontNames` display-name map (`jinxxy`/`booth`/`gumroad`/`payhip`, others title-cased) are single-sourced from `pages.json` and passed via `data-label-cta` / `data-platform-names`. **To add a storefront later, a staff member appends `{ "platform": "booth", "url": "https://…" }` to a product's `storefronts` array in `store.json` — no code change, and a labeled button appears in that product's quick-view.**

### Checkpoint-fix verification (build green)
- `npm run build` exits 0 (14 pages) after both fixes.
- Cotización chrome intact + slot fix preserved: `id="cartPill"` = 1 on `/es/servicios` **and** `/en/services`; store cart does not leak (`store-cart-fab` = 0 on services). Store chrome intact: `id="storeCartPill"` = 1 on `/es/tienda` + `/en/store`.
- 5 add controls carry `data-label-added` (4 cards + 1 quick-view); pill SR region `store-cart-sr-status` = 1 on store pages.
- Storefronts prepared but invisible: `data-quickview-storefronts` container = 1 per store page, `data-platform-names` present, **zero** rendered `quickview__storefront` buttons in `dist`, and the product island carries no `storefronts` key (no seed data).
- `grep -c innerHTML src/scripts/store.ts` = 0 (createElement + textContent only — T-06-01).

*Checkpoint fixes completed: 2026-07-08*

---
*Phase: 06-asset-store*
*Completed: 2026-07-07*
