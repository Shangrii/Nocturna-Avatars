# Phase 6: Asset Store - Pattern Map

**Mapped:** 2026-07-07
**Files analyzed:** 13 (8 new, 5 modified)
**Analogs found:** 12 / 13 (1 static asset has no code analog)

> This phase adds **zero new architectural primitives**. Every new file copies a
> proven, in-production analog. The planner should treat each "Analog" below as the
> file to open side-by-side while writing the plan action, and copy the cited line
> ranges rather than inventing structure.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/data/store.json` | data (model) | build-time data | `src/data/services.json` | exact (bilingual `{es,en}` fields, plain-string price) |
| `src/components/sections/StorePage.astro` | component (section body) | transform (data→grid) | `src/components/sections/ServicesPage.astro` + `GalleryPage.astro` | exact (data import + sort + map + EmptyState + script tag) |
| `src/components/ProductCard.astro` | component (card) | request-response (props→DOM) | `src/components/PackageCard.astro` | exact (props iface, featured badge, auto-escaped copy) |
| `src/components/QuickViewModal.astro` | component (modal) | event-driven (JS-populated) | `src/components/CartSummaryModal.astro` + `LightboxOverlay.astro` | exact (`dc-overlay` + `data-lenis-prevent` + gallery pattern) |
| `src/components/StoreCartPill.astro` | component (FAB) | event-driven | `src/components/CartPill.astro` | exact (52px red circle, badge, aria-label) |
| `src/components/StoreCartDrawer.astro` | component (drawer) | event-driven | `src/components/CartDrawer.astro` | exact (WR-01 slide-in, footer, `is:global` CSS) |
| `src/scripts/store-cart.ts` | script (client engine) | event-driven + persistence | `src/scripts/cart.ts` | role-match (sibling copy; adds localStorage, drops category grouping) |
| `public/store/placeholder.svg` | asset (static) | file-I/O (fallback img) | — | **no analog** (new branded SVG) |
| `src/i18n/routes.ts` | config (route map) | — | (self — edit existing) | exact (add `store` concept in-place) |
| `src/pages/[lang]/[page].astro` | route (resolver) | request-response | (self — edit existing) | exact (add `staticPathsForConcept('store')` + chrome slot) |
| `src/components/Nav.astro` | component (chrome) | — | (self — edit existing) | exact (add `store: t.navStore` to `conceptLabels`) |
| `src/i18n/nav.json` | config (i18n) | — | (self — edit existing) | exact (add `navStore` both locales) |
| `src/i18n/pages.json` | config (i18n) | — | (self — edit existing) | exact (add `tienda` key both locales) |

**No `src/i18n/ui.ts` edit needed** — store UI copy lives under the existing `pages` dictionary (RESEARCH Open Question 2). Only edit `ui.ts` if a dedicated `shop` namespace is chosen (not recommended).

---

## Pattern Assignments

### `src/data/store.json` (data, build-time)

**Analog:** `src/data/services.json`

**Bilingual field pattern** (services.json lines 6-13): every user-facing field is a `{ "es": …, "en": … }` object; `price` is a plain string **without** the `$` (component adds it). Copy this exact shape for the locked D-13 schema. The top-level key is `products` (array), mirroring services.json's `packages.tiers` / `catalog`.

```json
{ "name": { "es": "Outfit Luna", "en": "Luna Outfit" }, "price": "15" }
```

Store adds fields services.json does not have: `images[]` (CDN URLs), `checkoutUrl`, `editor` (plain string), `category`, `nsfw`, `featured`, `date`. `images[0]` = card thumbnail; rest = quick-view gallery.

---

### `src/components/sections/StorePage.astro` (component, transform)

**Analog:** `src/components/sections/ServicesPage.astro` (structure) + `GalleryPage.astro` (data-sort + EmptyState + script pattern)

**Frontmatter data import + resolve pattern** (ServicesPage lines 10-37): import the JSON, resolve `{es,en}` fields to `lang` via `.map`, pass to child cards.

```astro
import storeData from '../../data/store.json';
const products = storeData.products.slice()
  .sort((a, b) =>
    (b.featured ? 1 : 0) - (a.featured ? 1 : 0) ||   // featured pinned (D-09)
    b.date.localeCompare(a.date))                     // then newest-first
  .map((p) => ({ ...p, name: p.name[lang], description: p.description[lang] }));
```

**Copy-before-sort guard** (GalleryPage lines 47-49): `[...data].sort(...)` — never mutate the imported module array. StorePage must `.slice()` before `.sort()`.

**Empty-state branch** (GalleryPage lines 96, 153-161): `{entries.length ? (<grid/>) : (<EmptyState .../>)}`. Reuse `EmptyState.astro` with the store copy from UI-SPEC (heading "Tienda en camino" / "Store coming soon").

**Section header pattern** (ServicesPage lines 47-52): `.section-header.reveal` > `.section-tag` (eyebrow) + `.section-title` + `.section-subtitle`, all from the `pages.tienda` dictionary.

**Client script tag** (ServicesPage line 173-175 / GalleryPage 173-175): a trailing `<script>import '../../scripts/store-cart.ts';</script>` — this is how page-specific engines load.

**Night backdrop** (ServicesPage line 45): `<NightBackground fixed />` + the `is:global` transparent-section override (ServicesPage lines 109-133) if the store should show the night field. Confirm with UI-SPEC (store lives on `--color-ink`).

---

### `src/components/ProductCard.astro` (component, request-response)

**Analog:** `src/components/PackageCard.astro`

**Props interface + destructure** (PackageCard lines 13-40): typed `interface Props`, `const { ... } = Astro.props`. Model `interface Product` on the resolved (post-`lang`) shape.

**Featured highlight pattern** (PackageCard lines 43-44): `class={`card${tier.featured ? ' featured' : ''}...`}` + `{tier.featured && <div class="card-popular">{popularBadge}</div>}`. Store: `featured` → red highlight border + "Destacado"/"Featured" badge (UI-SPEC — the only red-accented card).

**Price with component-added currency** (PackageCard line 52): `<div class="card-price">{tier.price} <span>{usd}</span></div>`. Store renders `${price} USD` (Space Mono 700, tabular-nums per UI-SPEC).

**Auto-escaped copy** (PackageCard lines 48, 50 — no `set:html`): `{p.name}` / `{editor}` are auto-escaped by Astro (T-03-04). Never use `set:html` for `store.json` fields.

**Data-attr trigger button pattern** (PackageCard lines 68-78): the add-to-cart control is a `<button type="button">` carrying `data-*` hooks the client script reads (mirror `data-package-name` / `data-package-price` → `data-product-id` etc.). Add-to-cart must **stop propagation** so it does not open the quick-view (UI-SPEC interaction contract) — new behavior, but the button+data-attr shape is copied.

**Store-specific (no analog in PackageCard):**
- Thumbnail `<img>` — copy GalleryPage lines 137-146 (`loading="lazy" decoding="async"`, explicit aspect-ratio box for CLS). Add `onerror`→placeholder swap (Pitfall 3).
- NSFW blur + `<button>` reveal — new; keyboard-operable, ≥44px, `filter: blur()` gated transition (Pitfall 4).

---

### `src/components/QuickViewModal.astro` (component, event-driven)

**Analog:** `src/components/CartSummaryModal.astro` (overlay shell + `is:global` CSS) + `LightboxOverlay.astro` (image gallery within `dc-overlay`)

**Overlay attribute set** (CartSummaryModal lines 34-44 / LightboxOverlay lines 25-35): `class="dc-overlay …"`, `hidden`, `aria-hidden="true"`, `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `data-lenis-prevent`. Copy verbatim — this is the canonical modal contract (z-index 10000, above the drawer's 8001 per UI-SPEC).

**Header (icon badge + eyebrow + title)** (CartSummaryModal lines 48-61): reuse `.dc-modal` > `.dc-body` structure and the circular icon badge register.

**Gallery + prev/next controls** (LightboxOverlay lines 46-75): if the quick-view shows `images[]` as a gallery, copy the `lightbox__stage` / `lightbox__prev` / `lightbox__next` / `lightbox__counter` markup and its `data-*` hooks.

**XSS-safe JS population** (CartSummaryModal lines 63-65 + note lines 17-19; LightboxOverlay lines 11-14): any JS-injected node uses `createElement` + `textContent`, never `innerHTML` (T-03.1-08). Description/name populated this way if injected at runtime.

**`is:global` CSS requirement** (CartSummaryModal lines 110-114): runtime-created rows never get Astro's scoped `[data-astro-cid]`, so modal CSS must be `is:global` with a namespaced (`.quickview-*`) selector prefix.

**Buy CTA** — outbound link, not a button: copy the `rel="noopener noreferrer" target="_blank"` pattern from CartSummaryModal line 84 (`.cart-modal__join` anchor). Validate `checkoutUrl` starts with `https://` before rendering (Pitfall 5).

---

### `src/components/StoreCartPill.astro` (component, event-driven)

**Analog:** `src/components/CartPill.astro`

**Full-file copy with namespace swap.** Copy CartPill lines 20-36 (button + SVG + badge) and lines 38-111 (CSS) verbatim, changing only:
- `id="cartPill"` → `id="storeCartPill"`, `.cart-pill__badge` → `.store-cart-pill__badge`.
- `aria-label` copy → "Ver mi carrito: N productos" / "View my cart: N items" (UI-SPEC).
- SVG glyph: CartPill uses a **receipt/quote sheet** (deliberately not a cart, lines 26-34) because it drives a cotización. The store IS a real cart — swap to a shopping-cart glyph.

**Keep identical:** 52px red circle (lines 39-56), `z-index: 905` (line 42), badge navy-on-red (lines 70-89), badge pop animation gated to `prefers-reduced-motion: no-preference` (lines 96-110).

---

### `src/components/StoreCartDrawer.astro` (component, event-driven)

**Analog:** `src/components/CartDrawer.astro`

**Full-file copy with namespace swap + footer change.** Copy CartDrawer's structure (lines 19-83) and its `is:global` CSS (lines 91-392) verbatim, changing:
- DOM contract: `#cartBackdrop`→`#storeCartBackdrop`, `#cartDrawer`→`#storeCartDrawer`, `.cart-drawer__items`→`.store-cart-drawer__items`, `[data-cart-total]`→`[data-store-cart-total]`, `[data-cart-close]`→`[data-store-cart-close]`.
- **Drop the category-header machinery** (CartDrawer relies on cart.ts's `.cart-drawer__cat` grouping, lines 231-268) — store cart is a **flat list**, no categories.
- **Footer CTA** (CartDrawer lines 67-82): replace the single "Continuar en Discord" button (`data-cart-ticket`) with the D-18 NO-branch — **per-item "Comprar en Jinxxy" links** rendered into each row + a total labeled "Total (referencia)" + the footer note. **No single "buy all" button** (RESEARCH anti-pattern).

**Keep identical (load-bearing):** `data-lenis-prevent` on backdrop+drawer (lines 21, 32), WR-01 CSS (backdrop `z 8000` line 98, drawer `z 8001` line 120, `transform: translateX(100%)` line 127 + `.active` line 131), `:empty` CSS empty-state with `data-empty-label` (lines 214-229 — reuse with the "Tu carrito está vacío" copy), the `is:global` requirement note (lines 85-90).

---

### `src/scripts/store-cart.ts` (script, event-driven + persistence)

**Analog:** `src/scripts/cart.ts` (768 lines, read in full)

**Copy these mechanics VERBATIM (change selectors to the store namespace):**

| Mechanic | cart.ts lines | Note |
|----------|--------------|------|
| WR-01 drawer open | 376-413 | unhide `[hidden]` BEFORE `.active`; `requestAnimationFrame` gated by `prefers-reduced-motion` (383-401); focus first control + `trapFocus` (403-412) |
| WR-01 drawer close | 415-454 | re-add `[hidden]` only on `transitionend` filtered by `e.propertyName === 'transform'` (440-450) — avoids opacity-fires-first bug |
| `trapFocus(container)` | 516-531 | Tab/Shift+Tab cycle, filters `[hidden]`-ancestor elements |
| Escape + backdrop click, bound ONCE via module flag | 472-494 + guard 31, 746-750 | re-queries live DOM at event time — survives ClientRouter swaps |
| `astro:page-load` re-init + `astro:before-swap` reset + `readyState` fallback | 735-767 | `initStoreRanThisLoad` per-load guard (36) + `storeDocListenersBound` (31) |
| Module-level `Map` state | 28 | `const cart = new Map()` persists across page-loads |
| XSS-safe row building | 229-258 (drawer rows), 570-581 (modal rows) | `createElement` + `textContent`, never `innerHTML` (T-03.1-08) |
| Pill badge sync (count + aria-label + `[hidden]` toggle) | 147-184 | copy the `syncCartUI` badge logic (149-183) |

**Differences store-cart.ts introduces (NOT in cart.ts):**
- **State entry shape:** `{ id, name, price, checkoutUrl, qty }` — flat, no `categoryId`/`categoryName`, no image (cart rows are text-only). Drop cart.ts's category grouping (Section 3 lines 187-260 `groups`/`CATEGORY_ORDER`) — store rows are ungrouped.
- **localStorage persistence (D-20):** on every mutation `localStorage.setItem('nocturna-store-cart', ...)`; on init, **hydrate + reconcile against current `store.json`** — drop unknown ids, refresh `name`/`price`/`checkoutUrl` from data (Pitfall 2). cart.ts has NO persistence — this is net-new (RESEARCH Code Examples § persistence).
- **Footer = per-product Jinxxy links** (D-18 NO): each row carries a `<a href={checkoutUrl} target="_blank" rel="noopener noreferrer">` built XSS-safe. Replace cart.ts's `openCartModal`/`buildClipboardText`/Discord-copy flow (Sections 8-9, lines 497-706) — **not** copied.
- **No quantity stepper category logic / package CTAs** (cart.ts lines 302-370 catalog-row binding, 718-733 package tickets) — store binds add-to-cart from `ProductCard` `data-*` attrs instead.
- **Price:** store prices are plain numbers → `$${price} USD`. cart.ts's `parsePrice`/`formatEntryPrice` (lines 95-141) handle ranges + "cotizar" — the store can use a **simplified** numeric formatter (no ranges, no quote), but copy the `formatTotal` USD-suffix shape (lines 135-141).

**CRITICAL isolation (Pitfall 1 / D-19):** never import cart.ts on the store page or store-cart.ts on the services page. Distinct `Map`, distinct DOM contract, distinct localStorage key. The `[page].astro` chrome slot is already concept-gated (see below), which enforces this.

---

### `src/i18n/routes.ts` (config, edit-in-place)

**Pattern:** add a `PageConcept` — mirrors the existing services/gallery/terms wiring exactly.

- Line 17: add `'store'` to the `PageConcept` union.
- Lines 20-25: add `store: { es: 'tienda', en: 'store' }` to `routeSlugs`.
- Line 28: append `'store'` to `navConcepts` (position controls nav order — UI-SPEC wants it top-level; place before `'terms'`).

`localizedPath`, `conceptForSlug`, `translatePath`, `staticPathsForConcept` (lines 31-74) need **no change** — they derive from the maps.

---

### `src/pages/[lang]/[page].astro` (route, edit-in-place)

**Analog:** self (the services/gallery/terms wiring already in the file).

- Imports (lines 16-22): add `StorePage`, `StoreCartDrawer`, `StoreCartPill`, `QuickViewModal`.
- `getStaticPaths` (lines 28-34): add `...staticPathsForConcept('store')`.
- Meta resolution (lines 43-50): add a `concept === 'store'` branch reading `pages.tienda.metaTitle/metaDescription`.
- Body render (lines 53-56): add `{concept === 'store' && <StorePage lang={lang} />}`.
- **Chrome-bottom slot** (lines 61-67): add a `concept === 'store'` `<Fragment slot="chrome-bottom">` with `<StoreCartDrawer/>` + `<StoreCartPill/>` + `<QuickViewModal/>`. This concept-gating is what guarantees the store cart chrome never renders on /servicios (D-19).

---

### `src/components/Nav.astro` (component, edit-in-place)

- `conceptLabels` map (lines 26-31): add `store: t.navStore`. The `.map` over `navConcepts` (lines 32-35) auto-renders the new link once `routes.ts` includes `'store'`. No other change.

---

### `src/i18n/nav.json` (config, edit-in-place)

- Add `"navStore": "Tienda"` to the `es` block (after line 6) and `"navStore": "Store"` to the `en` block (after line 27). Mirror the existing `navServices`/`navGallery` entries.

---

### `src/i18n/pages.json` (config, edit-in-place)

**Analog:** the `servicios` + `emptyState` entries (lines 61-89, 160-189).

- Add a `tienda` key to BOTH `es` and `en` blocks, mirroring `servicios` (metaTitle, metaDescription, tag, title, subtitle) — lines 75-89.
- Add the store UI-copy strings from UI-SPEC's Copywriting Contract (card add-to-cart, editor credit, featured badge, quick-view CTAs, cart drawer labels/note, empty-cart, NSFW reveal, error fallbacks) — either nested under `tienda` or as a sibling `store`/`tiendaUi` object. Both locales REQUIRED (D-15).
- The empty-store state reuses the `emptyState` dictionary shape (lines 61-67) — add a store-specific body or reuse the pattern.

---

## Shared Patterns

### WR-01 modal/drawer open-close (the single most-reused pattern)
**Source:** `src/scripts/cart.ts` lines 376-454 (drawer), 603-609 + 693-701 (modal).
**Apply to:** `store-cart.ts` (drawer), `QuickViewModal` controller logic.
Unhide `[hidden]` BEFORE `.active` on open; on close re-add `[hidden]` only on `transitionend` filtered by `e.propertyName === 'transform'`. Gate the `requestAnimationFrame` activation behind `prefers-reduced-motion`.

### Focus trap
**Source:** `src/scripts/cart.ts` lines 516-531 (`trapFocus`).
**Apply to:** store cart drawer + quick-view modal. Copy verbatim.

### View-Transitions-safe init
**Source:** `src/scripts/cart.ts` lines 735-767.
**Apply to:** `store-cart.ts`. Per-load guard + `astro:before-swap` reset + `astro:page-load` listener + `readyState` fallback. Required because ClientRouter is active.

### XSS-safe DOM building (T-03.1-08)
**Source:** `src/scripts/cart.ts` lines 229-258, 570-591; component note in `CartSummaryModal.astro` lines 17-19.
**Apply to:** every runtime-injected node in `store-cart.ts` and `QuickViewModal`. `createElement` + `textContent`, never `innerHTML`. Astro auto-escape covers build-time `{…}` in `.astro` files (no `set:html`).

### `dc-overlay` modal shell
**Source:** `src/components/CartSummaryModal.astro` lines 34-44; `LightboxOverlay.astro` lines 25-35.
**Apply to:** `QuickViewModal`. The `dc-overlay` + `data-lenis-prevent` + `role="dialog"`/`aria-modal` attribute set is the canonical modal contract (z 10000).

### Bilingual data resolution
**Source:** `src/components/sections/ServicesPage.astro` lines 28-37; `src/data/services.json` lines 6-13.
**Apply to:** `StorePage.astro` (resolve `name[lang]`/`description[lang]`), `store.json` (`{es,en}` field shape).

### Outbound-link security
**Source:** `src/components/CartSummaryModal.astro` line 84 (`rel="noopener noreferrer" target="_blank"`).
**Apply to:** every Jinxxy `checkoutUrl` link (drawer rows + quick-view CTA). Plus validate `startsWith('https://')` before render (Pitfall 5).

### Image lazy-load + CLS box
**Source:** `src/components/sections/GalleryPage.astro` lines 137-146.
**Apply to:** `ProductCard` thumbnail + `QuickViewModal` gallery. `loading="lazy" decoding="async"` + explicit aspect-ratio box. Add `onerror`→`public/store/placeholder.svg` swap (Pitfall 3, new behavior).

### `is:global` for JS-injected rows
**Source:** `src/components/CartDrawer.astro` lines 85-90; `CartSummaryModal.astro` lines 110-114.
**Apply to:** `StoreCartDrawer` + `QuickViewModal` CSS. Runtime nodes lack scoped `[data-astro-cid]`; use `is:global` + a namespaced (`.store-cart-*`/`.quickview-*`) selector prefix.

### Concept-gated chrome slot (cart isolation, D-19)
**Source:** `src/pages/[lang]/[page].astro` lines 61-67.
**Apply to:** the new `concept === 'store'` chrome fragment. This gating is the structural guarantee the two carts never co-render.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `public/store/placeholder.svg` | asset (static) | file-I/O | No existing branded placeholder SVG in `public/`. New asset — brand it with Nocturna red/navy tokens per UI-SPEC ("Imagen no disponible"). Not code; no pattern to copy. |

**Partial-analog notes for the planner:**
- **localStorage persistence** has no in-repo analog (cart.ts is deliberately non-persistent, D-06). Use RESEARCH Code Examples § persistence (hydrate + reconcile) — lines 366-379 of `06-RESEARCH.md`.
- **NSFW blur/reveal** has no in-repo analog. Build per UI-SPEC interaction contract (Pitfall 4): `<button>`-toggled `filter: blur()`, transition gated by `prefers-reduced-motion`.

---

## Metadata

**Analog search scope:** `src/components/`, `src/components/sections/`, `src/scripts/`, `src/data/`, `src/i18n/`, `src/pages/`
**Files scanned:** 48 (via Glob `src/**/*.{astro,ts,json}`); 14 read in full/targeted for pattern extraction
**Key insight:** Phase 6 is composition, not invention — 12 of 13 files have exact or role-match analogs already in production. The only genuinely new client code is localStorage persistence and the NSFW reveal, both fully specified in RESEARCH + UI-SPEC.
**Pattern extraction date:** 2026-07-07
