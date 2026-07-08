---
phase: "06"
status: issues_found
depth: standard
reviewed: 2026-07-08
files_reviewed: 16
files_reviewed_list:
  - src/components/Nav.astro
  - src/components/ProductCard.astro
  - src/components/QuickViewModal.astro
  - src/components/StoreCartDrawer.astro
  - src/components/StoreCartPill.astro
  - src/components/sections/StorePage.astro
  - src/data/store.json
  - src/i18n/nav.json
  - src/i18n/pages.json
  - src/i18n/routes.ts
  - src/pages/[lang]/[page].astro
  - src/scripts/store-cart.ts
  - src/scripts/store.ts
  - src/styles/choreography.css
  - src/styles/chrome.css
  - public/store/placeholder.svg
critical: 1
warning: 5
info: 6
---

# Phase 06: Asset Store — Code Review Report

**Reviewed:** 2026-07-08
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

Reviewed all 16 files changed in phase 06 (product grid, quick-view modal, purchase cart) against the plans' threat models and the executor claims.

**Claimed mitigations — verified in code:**

- **T-06-01 (no raw-HTML sinks):** HOLDS. Grep across all changed files finds zero `innerHTML` / `outerHTML` / `insertAdjacentHTML` / `set:html` usages. Every JS-driven node in `store.ts` and `store-cart.ts` is built with `createElement` + `textContent`; server-side product copy renders through Astro auto-escaping; the product island rides an auto-escaped `data-store-products` attribute (breakout-safe).
- **T-06-02 (https guard):** HOLDS, fails closed. `startsWith('https://')` guards the quick-view buy CTA (store.ts:321), extra storefronts (store.ts:191), and per-row drawer links (store-cart.ts:268). Case tricks (`HTTPS://`), `javascript:`, and whitespace-prefixed URLs all fail the guard and render the disabled state.
- **T-06-03 (reverse tabnabbing):** HOLDS. `rel="noopener noreferrer"` is present on the static buy anchor (QuickViewModal.astro:112), runtime storefront buttons (store.ts:201), and runtime drawer rows (store-cart.ts:275).
- **T-06-04 (localStorage reconciliation):** the mechanism exists and drops unknown ids/never trusts stored price/url — **but its implementation causes CR-01 below**: it also wipes the entire cart on any soft navigation off the store page.
- **Cotización isolation (D-19):** HOLDS. `cart.ts` contains no `localStorage` usage; the store cart uses distinct DOM hooks (`#storeCart*`, `.store-cart-*`) and its own `nocturna-store-cart` key. The `chrome.ts` Discord modal binds `[data-dc-overlay]`/`[data-dc-dismiss]` attributes, so the quick-view's reuse of the `.dc-overlay`/`.dc-dismiss` classes does not collide.

**Key concern:** the cart persistence contract is broken by a canonical-island edge case (CR-01), and the shared `transitionend {once:true}` close pattern in both new controllers has two real failure modes (WR-01).

## Critical

### CR-01: Store cart is wiped (memory + localStorage) by soft-navigating to any non-store page

**File:** `src/scripts/store-cart.ts:74-94, 149-164, 534-547`
**Issue:** The site uses Astro's `ClientRouter` (BaseLayout.astro:60), so `store-cart.ts` stays loaded for the whole browsing session once the store page has been visited, and `initStoreCart()` re-runs on **every** `astro:page-load` (the `initRanThisLoad` guard is reset on `astro:before-swap`). On a non-store page there is no `[data-store-products]` island, so `parseCanonical()` leaves `canonical` empty, and `reconcileInMemory()` then treats every cart entry as an unknown id: it deletes all entries and calls `persist()`, writing an **empty** cart to `localStorage['nocturna-store-cart']`.

Reproduction: hard-load `/es/tienda` → add items → click "Servicios" (or Home/Galería/Términos) in the nav → return to the store. The cart is empty and storage is overwritten. This defeats the phase's own acceptance criterion that the cart persists across navigations, and it is silent data loss for the user. The T-06-04 "drop unknown ids" logic is correct for a store page with a changed catalog, but "no island at all" (not a store page) must not be conflated with "island present, id unknown".

**Fix:**
```ts
/** Returns true when the current page carries the product island. */
function parseCanonical(): boolean {
  canonical = new Map();
  const island = document.querySelector<HTMLElement>('[data-store-products]');
  if (!island) return false; // not a store page — leave the cart untouched
  const raw = island.dataset.storeProducts;
  if (!raw) return false;
  try { /* ...existing parse... */ } catch { canonical = new Map(); }
  return true;
}

function initStoreCart(): void {
  if (initRanThisLoad) return;
  initRanThisLoad = true;
  const hasIsland = parseCanonical();
  if (hasIsland) {
    hydrateFromStorage();
    reconcileInMemory();
  }
  bindAddControls();
  bindPillAndClose();
  bindDocListeners();
  syncCartUI();
}
```

## Warning

### WR-01: `transitionend { once: true }` + `propertyName` filter is self-contradictory — overlay/drawer can stay un-hidden, or a re-opened one can be force-hidden

**File:** `src/scripts/store.ts:398-408` (closeQuickView), `src/scripts/store-cart.ts:447-461` (closeDrawer)
**Issue:** Both close paths attach a `transitionend` listener with `{ once: true }` and then filter by `e.propertyName`. `once` removes the listener after the **first** event regardless of the filter, and `transitionend` **bubbles**, so two concrete failure modes exist:

1. **Never hidden:** a child transition ending first consumes the listener. For the quick-view, `.dc-modal` transitions `transform` for the same 0.35s as the overlay's `opacity` (chrome.css:416, 437) and its `transitionend` bubbles to the overlay — plus any 0.2s hover/color transition on a child (close button, buy CTA) that un-hovers during close fires earlier. When the consumed event's `propertyName` doesn't match, `[hidden]` is never re-added: the overlay stays `display:flex` at `opacity:0` with `aria-hidden="true"` while its buy link and buttons remain in the Tab order (focusable, invisible, activatable — an a11y and correctness defect). Same mechanics for the drawer (item-row/close-button 0.18–0.2s transitions end before the 0.3s transform).
2. **Stale listener hides a re-opened panel:** re-open within the ~300–350ms close transition and the still-pending close listener matches the **open** transition's end (`opacity`/`transform`) and slams `[hidden]` onto the now-active overlay/drawer.

**Fix:** replace `{ once: true }` with a self-removing named handler that checks target and property, and cancel any pending close handler when opening:
```ts
let pendingHide: ((e: TransitionEvent) => void) | null = null;

// in close:
pendingHide = (e: TransitionEvent) => {
  if (e.target !== overlay || e.propertyName !== 'opacity') return;
  overlay.setAttribute('hidden', '');
  overlay.removeEventListener('transitionend', pendingHide!);
  pendingHide = null;
};
overlay.addEventListener('transitionend', pendingHide);

// in open, before removing [hidden]:
if (pendingHide) { overlay.removeEventListener('transitionend', pendingHide); pendingHide = null; }
```

### WR-02: Quick-view initial focus targets a hidden button for single-image products

**File:** `src/scripts/store.ts:374-375`
**Issue:** `overlay.querySelector('button, [href]')` matches the gallery prev button first in DOM order, but prev/next carry `[hidden]` whenever the product has a single image (3 of the 4 seed products). `.focus()` on a `display:none` element is a no-op, so keyboard/SR focus stays on the card behind the modal — the dialog opens without focus moving into it (WCAG 2.4.3 failure for the majority of the catalog).
**Fix:** apply the same visibility filter used by `trapFocus`:
```ts
const firstFocusable = Array.from(
  overlay.querySelectorAll<HTMLElement>('button, [href]'),
).find((el) => !el.hasAttribute('disabled') && !el.closest('[hidden]'));
```
(or simply focus the close button / the modal container with `tabindex="-1"`).

### WR-03: `role="button"` product card contains nested interactive controls (invalid ARIA)

**File:** `src/components/ProductCard.astro:47-104`
**Issue:** The `<article role="button" tabindex="0" aria-label={product.name}>` wraps two real `<button>`s (NSFW reveal, add-to-cart). Per the ARIA spec, descendants of a `button` role are treated as presentational, so assistive tech may not expose the reveal or add controls at all; the container's `aria-label` also replaces the card's name/price/editor content in the accessibility tree. Mouse/keyboard code paths work, but SR users can lose both the NSFW reveal (they get a blurred product with no operable reveal) and add-to-cart.
**Fix:** drop `role="button"`/`tabindex` from the article; make the product name (`h3`) contain a `<button class="product-card__open">` that opens the quick-view (stretch its hit area with a pseudo-element if the whole-card click affordance should stay), keeping reveal/add as siblings, not descendants, of a button role.

### WR-04: One malformed staff edit to store.json crashes the whole site build (including gallery auto-publish deploys)

**File:** `src/components/sections/StorePage.astro:55-63`
**Issue:** `b.date.localeCompare(a.date)` throws `TypeError` at build time if any product omits `date`, and `p.name[lang]` / `p.description[lang]` render `undefined` (or throw on a missing object) if a locale key is missing. store.json is explicitly the staff write-target ("no code changes needed"), and the same repo build publishes the Discord-driven gallery — so a single typo'd product blocks **all** deploys, freezing the auto-updating gallery until a developer intervenes. This contradicts the phase's core "staff edit data, not code" value.
**Fix:** defensive access plus a filter, e.g.:
```ts
const products = ([...(storeData.products as StoreProduct[])])
  .filter((p) => p && typeof p.id === 'string' && p.name && p.description)
  .sort((a, b) =>
    (b.featured ? 1 : 0) - (a.featured ? 1 : 0) ||
    String(b.date ?? '').localeCompare(String(a.date ?? '')),
  )
  .map((p) => ({
    name: p.name[lang] ?? p.name.es ?? p.name.en ?? '',
    /* … same fallback for description … */
  }));
```

### WR-05: Quick-view gallery image has no broken-image fallback

**File:** `src/scripts/store.ts:260-261`, `src/components/QuickViewModal.astro:68`
**Issue:** Card thumbnails get the T-06-05 error→placeholder swap via `[data-store-img]`, but the modal's `[data-quickview-img]` gets `img.src = src` with no error handler — a dead Jinxxy CDN hotlink renders a raw broken-image glyph inside the flagship quick-view. The seed data URLs are documented placeholders ("Replace the example jinxxy-cdn.com URLs"), so this state is guaranteed until real links land, and remains likely afterwards (hotlinked CDN). Note the modal's doc comment also claims store.ts sets the img `alt` — it never does (alt stays `""`).
**Fix:** in `renderGalleryImage()`, bind (once) the same self-removing `error` handler used by `bindImageFallbacks` to swap to `/store/placeholder.svg`, and set `img.alt = product.name` on open.

## Info

### IN-01: Dead prop `imgUnavailable` threaded through but never rendered

**File:** `src/components/ProductCard.astro:36`, `src/components/sections/StorePage.astro:123`, `src/i18n/pages.json:114,259`
**Issue:** `imgUnavailable` is declared in Props, passed from StorePage, present in both locales — and never destructured or rendered anywhere (the placeholder SVG carries its own baked-in bilingual text). Dead code.
**Fix:** remove the prop and the pass-through (keep the i18n key only if WR-05's fix wants it for the quick-view img alt).

### IN-02: Discord modal copy still announces the store as "coming soon"

**File:** `src/i18n/nav.json:17,39`
**Issue:** `modalBody` (es/en) says "muy pronto abriremos nuestra propia tienda de assets — próximamente" / "very soon we'll be opening our own asset store — coming soon", but phase 06 ships the store and its nav link. Every "Abrir Ticket" conversion popup now contradicts the visible nav.
**Fix:** update the copy to point at the live store (e.g., "…y ya puedes explorar nuestra tienda de assets").

### IN-03: NSFW quick-view is blur-only with no in-modal reveal

**File:** `src/scripts/store.ts:307-311`, `src/components/QuickViewModal.astro:238-241`
**Issue:** Opening an unrevealed NSFW product's quick-view shows a permanently blurred gallery — there is no reveal control inside the modal (the user must close, find the card's reveal chip, reopen). Also, the modal applies only `blur(28px)` without the card's dark scrim, and at ~600px rendered size a blurred image leaks more silhouette than the scrimmed card does.
**Fix:** add a reveal button inside `[data-quickview-gallery]` that toggles `quickview__gallery--nsfw` (and optionally syncs the card's revealed class), plus a scrim overlay matching `.product-card__scrim`.

### IN-04: Hydrated cart quantity is unbounded (Infinity survives the type filter)

**File:** `src/scripts/store-cart.ts:121-124,135`
**Issue:** The hydration filter only checks `typeof p[1] === 'number'`; `JSON.parse('[["id",1e999]]')` yields `Infinity`, which passes, and `Math.max(1, Math.floor(qty))` keeps it — badge shows "Infinity", total shows "$Infinity USD". Self-inflicted (tampered own storage) so cosmetic, but a one-line clamp closes it.
**Fix:** `const cleanQty = Number.isFinite(qty) ? Math.min(99, Math.max(1, Math.floor(qty))) : 1;`

### IN-05: Nav focus underline gated behind `@media (hover: hover)`

**File:** `src/styles/chrome.css:107-112`
**Issue:** `.nav-link:focus-visible::after` lives inside the `(hover: hover)` media query, so keyboard users on touch-primary devices never get the red underline on focus. The separate 2px outline (chrome.css:113-115) still marks focus, so this is minor — but `:focus-visible` doesn't belong under a hover capability query.
**Fix:** move `.nav-link:focus-visible::after { transform: scaleX(1); }` outside the media query, keeping only `:hover::after` inside it.

### IN-06: Focus-trap/WR-01 machinery now triplicated (cart.ts, store.ts, store-cart.ts)

**File:** `src/scripts/store.ts:232-249`, `src/scripts/store-cart.ts:375-392`
**Issue:** The sibling-copy architecture is a locked decision (D-19) and is respected — but the copies are already diverging in exactly the fragile spot (quick-view close filters `propertyName === 'opacity'`, drawer close filters `'transform'`, cart.ts has its own variant), which is how WR-01 will get fixed in one copy and not the others. Not a defect today; a maintenance trap.
**Fix:** when WR-01 is fixed, extract `trapFocus` + the open/close-with-hidden helpers into a shared `src/scripts/overlay-utils.ts` consumed by all three engines (state stays separate; only the mechanics are shared).

---

_Reviewed: 2026-07-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
