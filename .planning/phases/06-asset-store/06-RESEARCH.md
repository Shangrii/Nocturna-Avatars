# Phase 6: Asset Store - Research

**Researched:** 2026-07-07
**Domain:** Static-site digital storefront (Astro) + hosted checkout (Jinxxy) + client-side purchase cart reuse
**Confidence:** HIGH (integration surface fully mapped in-repo; Jinxxy platform behavior verified against official pages, with one MEDIUM item flagged)

## Summary

Phase 6 is unusually low-risk from a research standpoint: the platform decision (Jinxxy) is locked, the design system exists, and the cart engine to be reused (`src/scripts/cart.ts`, 768 lines) is already in production for the /servicios cotización. This phase is **almost entirely composition of existing repo patterns** — a new data file, a new page concept in the central route map, a bilingual product grid, a quick-view modal (existing overlay pattern), and a *second, independent* cart module. **No new npm dependencies are required.**

The one load-bearing external unknown — D-18, "does Jinxxy support add-to-cart-via-URL so our drawer can pre-fill Jinxxy's cart with all selected items in one checkout?" — **resolves to NO.** Jinxxy has a native multi-creator shared cart, but it lives entirely on the buyer side at `jinxxy.com/cart`; there is no documented URL/permalink scheme (unlike Shopify cart permalinks or WooCommerce add-to-cart URLs) that lets an external static site construct a link that pre-populates it. Jinxxy's Creator API is server-side (`x-api-key` header auth) and cannot be used from a static client without leaking the key. Therefore the drawer's "Pagar en Jinxxy" flow must take D-18's **NO branch**: the purchase drawer lists each selected product with its own `checkoutUrl` link to Jinxxy.

**Primary recommendation:** Build a **sibling module `src/scripts/store-cart.ts`** that copies the proven cart.ts patterns (WR-01 drawer open/close, `trapFocus`, `createElement`+`textContent` XSS-safe DOM building, `astro:page-load` re-init) but with its own DOM contract (`#storeCartPill`, `#storeCartDrawer`), its own `localStorage`-persisted state (D-20), a flat product list, and a footer that lists per-product Jinxxy links. Do **not** refactor cart.ts into a shared factory — that risks regressing the working cotización (D-19) for no MVP benefit. Render product images as plain hotlinked `<img loading="lazy">` from Jinxxy's CDN (`jinxxy-c.jinxxy-cdn.com`), never through Astro's `<Image>` (which would require remote-domain config and build-time fetching, breaking the data-only-add promise).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Product catalog rendering (grid + cards) | CDN / Static (Astro build) | — | `store.json` is build-time data; Astro emits static HTML per locale |
| Product data + bilingual copy | CDN / Static (data file) | — | `src/data/store.json`, imported at build; staff edit → commit → Pages rebuild |
| Quick-view modal, NSFW reveal, cart interactions | Browser / Client | — | DOM behavior, per-session; no server |
| Purchase cart state + persistence | Browser / Client (localStorage) | — | Static site has no backend; cart is client-only (D-20) |
| Preview images | CDN / Static (Jinxxy CDN, hotlinked) | Browser (lazy load + error fallback) | Files hosted by Jinxxy (D-05/D-11); site never stores them |
| Checkout, payment, tax, digital fulfillment | External service (Jinxxy) | — | Merchant-of-record; no self-hosted backend (D-01/D-06) |
| Revenue splits (70/30) | External service (Jinxxy) | — | Native per-product collaborator feature; operational, not code (D-03) |
| Navigation to store | CDN / Static (Astro chrome) | — | `routes.ts` + `Nav.astro`, same pattern as existing pages |

**Key correctness note for the planner:** every capability is either static-build or client-side. Nothing in this phase belongs on a server tier — that is the whole point of the Jinxxy choice. Any task that implies a build-time fetch of Jinxxy data, an API key in client code, or a server endpoint is misassigned.

<phase_requirements>
## Phase Requirements

These IDs are NEW and must be added to `.planning/REQUIREMENTS.md` during planning (per CONTEXT specifics + ROADMAP note). Proposed wording, derived from the phase success criteria:

| ID | Description | Research Support |
|----|-------------|------------------|
| STORE-01 | A visitor sees a dedicated store section (`/tienda` ES · `/en/store` EN) listing Nocturna's own VRChat assets rendered from `src/data/store.json`, in ES + EN | `routes.ts` concept-map pattern (§ Standard Stack); bilingual data pattern from services.json |
| STORE-02 | Each product shows price, preview image(s), and description; staff add/edit products by editing `store.json` only — no component/code changes — rendering in both ES and EN | D-13 schema locked; Astro auto-escape (T-03-04); hotlinked CDN images (§ Pitfall 3) |
| STORE-03 | A visitor can add/remove assets to a REAL purchase cart with a running total, reusing the Phase 3.1 cart patterns reframed for purchase — without breaking the /servicios cotización | Sibling-module strategy (§ Pattern 1); D-19/D-20 separation |
| STORE-04 | A visitor can complete a purchase and receive their asset(s): checkout + payment + digital fulfillment on Jinxxy (hosted, no backend), preserving Astro static + GitHub Pages + CNAME | Jinxxy merchant-of-record + CDN delivery (§ Standard Stack); D-18 NO-branch link-out (§ Pattern 2) |
| STORE-05 | The store is reachable from the nav, keeps "Abrir Ticket" intact; responsive + AA contrast + `prefers-reduced-motion` respected, consistent with Refined Street Editorial | `Nav.astro` concept auto-render; existing a11y/reduced-motion patterns in cart.ts/CartDrawer |
</phase_requirements>

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Checkout & fulfillment platform:**
- **D-01:** Platform = **Jinxxy** (jinxxy.com). Chosen for native per-product collaborator revenue splits (auto-paid 70/30, top priority), ~92% net on Standard tier, PayPal+cards, México payouts, Jinxxy-absorbed chargeback risk, VRChat buyer trust, Creator API + webhooks.
- **D-02:** Platform-agnostic in code: `store.json` uses a generic `checkoutUrl` field per product. Nothing Jinxxy-specific in components — swappable by editing data only.
- **D-03:** Multi-vendor mechanics are operational, not code: each editor has their own free Jinxxy account + payout; owner adds them as per-product collaborator at 70%. No accounting code this phase.
- **D-04:** NSFW policy reality: store will include NSFW assets. Jinxxy banned *explicit* content Mar 2026 but allows suggestive/mature; explicit products use SFW listings on Jinxxy (real content in the delivered file). Staff/content constraint, not code — but the SITE's own NSFW display IS code (D-10).
- **D-05:** Digital files only — Jinxxy hosts and delivers all product files. No product files in the repo, ever.
- **D-06:** Buyers pay via PayPal + cards (Jinxxy as merchant of record). Multi-item purchase exists via Jinxxy's shared cart on their checkout.

**Store page & product display:**
- **D-07:** Structure = grid + quick-view modal. One store page per language; clicking a card opens a quick-view modal (photo gallery, full description, "Comprar en Jinxxy" button). Reuses existing `dc-overlay`/modal + focus-trap pattern — no per-product pages.
- **D-08:** Cards show photo + name + price + editor credit ("por Kira", plain text — D-16). Grid is flat (no filters at launch); `category` exists in schema for later filters without migration.
- **D-09:** Ordering: `featured: true` products pinned on top; rest sorted newest-first by `date`.
- **D-10:** NSFW display on-site = blur + per-card reveal. `nsfw: true` cards render blurred with click-to-reveal per card (no global toggle, no persisted 18+ state). Quick-view follows the same reveal state.
- **D-11:** Preview images hotlinked from Jinxxy's CDN (URLs in `store.json`). Accepted risk: broken images if Jinxxy changes URLs — mitigate with graceful placeholder fallback (Claude's discretion on implementation).
- **D-12:** Nav: "Tienda"/"Store" as top-level nav item; routes `/tienda` (ES) + `/en/store` (EN) following existing `routes.ts` pattern. "Abrir Ticket" Discord path stays intact.

**store.json schema (locked — D-13):** File `src/data/store.json`, mirrors services.json/gallery.json. Shape:
```json
{
  "products": [
    {
      "id": "luna-outfit",
      "name": { "es": "Outfit Luna", "en": "Luna Outfit" },
      "description": { "es": "…", "en": "…" },
      "price": "15",
      "images": ["https://cdn.jinxxy.com/…", "…"],
      "checkoutUrl": "https://jinxxy.com/nocturna/luna-outfit",
      "editor": "Kira",
      "category": "outfits",
      "nsfw": true,
      "featured": false,
      "date": "2026-07-07"
    }
  ]
}
```
`images[0]` = card thumbnail; the rest appear in the quick-view gallery. `price` is a plain number string (component renders the $ symbol — same convention as services.json).
- **D-14:** No discount fields — single `price`, staff edits the number (stays syncable with Jinxxy).
- **D-15:** Both `es` + `en` REQUIRED for name and description — the EN store never shows Spanish (US audience goal).
- **D-16:** `editor` is plain text, not clickable — credit without leaking traffic out of the grid.

**Purchase cart vs cotización:**
- **D-17:** Local store cart exists, reusing the Phase 3.1 cart engine patterns (pill + drawer + running total) reframed for purchase.
- **D-18:** RESEARCH TASK FOR PLANNING: verify whether Jinxxy supports add-to-cart-via-URL. If YES → drawer's "Pagar en Jinxxy" opens Jinxxy's cart pre-filled with all selected products (single checkout). If NO → drawer lists each selected product with its individual "Comprar" link. **→ RESOLVED THIS RESEARCH: NO (see § Pattern 2). Take the per-product-link branch.**
- **D-19:** Two fully separate carts: /servicios pill shows only the quote cart (ends in "Abrir Ticket" + copy-quote modal — unchanged); /tienda pill shows only the purchase cart (ends in "Pagar en Jinxxy"). They never mix; each page renders only its own. The cotización flow must not regress.
- **D-20:** Store cart persists in localStorage (survives navigation/refresh/revisits). The quote cart keeps its Phase 3.1 reset-on-refresh behavior — do NOT add persistence to it.

### Claude's Discretion
- Placeholder/fallback behavior for broken Jinxxy CDN images (D-11).
- Exact blur treatment + reveal microinteraction for NSFW cards (within Refined Street Editorial + `prefers-reduced-motion`).
- Whether "add to cart" lives on the card, the quick-view, or both.
- Technical separation strategy for the two carts (namespaced module, separate storage keys, etc.) — as long as D-19/D-20 hold.
- Store page copy/i18n strings (new namespace or equivalent), empty-state when `store.json` has no products (reuse `EmptyState`).
- Jinxxy fee tier (Standard vs Supporter) is an account-level staff choice, not code; assume Standard (5%).

### Deferred Ideas (OUT OF SCOPE)
- Discord bot × Jinxxy integration (Creator API/webhooks for sales pings/accounting; `jinx` OSS bot is prior art) — future bot phase.
- Creator API price/product sync between Jinxxy and `store.json` — manual sync this phase.
- Watching Jinxxy's announced "alternative" for adult creators (could later relax D-04's SFW-listing constraint).
- Category filters on the store grid — schema-ready (`category`), UI deferred until inventory grows.
- (Own-phase todos, not this phase: bot reminders command; Carrd-style editor template; reviews-channel → website publishing.)
</user_constraints>

## Standard Stack

### Core (all already in-repo — NO installs)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Astro | 7.0.3 (pinned) | Static site generator; emits per-locale HTML | Locked project stack (PLAT-01), GitHub Pages target |
| TypeScript (vanilla, no framework) | repo default | Cart/quick-view client logic | cart.ts precedent — zero-dependency client scripts |
| Tailwind v4 (`@tailwindcss/vite` 4.3.2) | 4.3.2 (pinned) | Utility styling + `@theme` brand tokens | 02.1 design system (`src/styles/theme.css`) |

### Supporting (external service — account/data, not a package)
| Service | Tier | Purpose | Integration |
|---------|------|---------|-------------|
| Jinxxy | Standard (5%) | Hosted checkout, payment, tax, digital file delivery, revenue splits | Plain outbound `<a href>` to `checkoutUrl`; merchant of record. No SDK, no build-time call. |
| Jinxxy CDN (`jinxxy-c.jinxxy-cdn.com`) | included | Preview-image hosting (hotlinked) | Plain `<img>` src in `store.json` (D-11) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Jinxxy | Snipcart / Foxy.io | Keeps OUR cart through to payment, but adds a paid SaaS + JS SDK + no native 70/30 splits — the split feature is what won Jinxxy (D-01) |
| Jinxxy | Payhip / Gumroad / Lemon Squeezy | On-domain overlay checkout (user liked Payhip's), but no native per-product collaborator splits — dealbreaker |
| Astro `<Image>` for previews | plain hotlinked `<img>` | `<Image>` would require `image.remotePatterns` config + build-time fetch of every product image, breaking the "add a product by editing data only, no rebuild-of-code" promise and coupling builds to Jinxxy uptime. Use plain `<img>`. |

**Installation:**
```bash
# NONE. This phase adds no npm packages.
# It composes existing repo primitives: Astro pages, a JSON data file,
# .astro components, and a vanilla-TS client module.
```

**Version verification:** No registry lookups performed because no packages are added or upgraded. Astro 7.0.3 and Tailwind 4.3.2 are already pinned and npm-audit-clean per STATE.md (T-01-SC / T-02.1-SC).

## Package Legitimacy Audit

**Not applicable — this phase installs no external packages.** The store is built entirely from primitives already present and audited in the repo (Astro, Tailwind v4, vanilla TypeScript). No `npm install`, no new `dependencies` or `devDependencies` entries. Jinxxy is an external *service* consumed via plain HTML links and hotlinked image URLs, not an npm package or client SDK.

If, during planning, someone proposes a Jinxxy JS SDK, a cart library (Snipcart/Foxy), or an image library, **stop and run the Package Legitimacy Gate first** — but the locked decisions (D-01 link-out, D-02 platform-agnostic, plain `<img>` previews) mean none should be needed.

## Architecture Patterns

### System Architecture Diagram

```
                         BUILD TIME (Astro, GitHub Actions → gh-pages)
  src/data/store.json  ──────────────────────────────────────────────┐
  (staff-edited,          [page].astro resolver                       │
   bilingual products)     • getStaticPaths: staticPathsForConcept('store')
        │                  • concept = 'store' → render <StorePage lang>
        │                  • sort: featured first, then date desc (D-09)
        ▼                        │
  StorePage.astro  ──────────────┤ emits per-locale static HTML
   • product grid (cards)        │   /es/tienda   +   /en/store
   • card = images[0] + name +   │
     price + "por {editor}"      │  chrome-bottom slot:
   • nsfw ⇒ blurred + reveal     │   StoreCartPill + StoreCartDrawer + QuickViewModal
        │                        ▼
        └──────────────► static HTML on GitHub Pages (CNAME preserved)

                         RUNTIME (browser only — no server)
  visitor loads /tienda
        │
        ├─ card click ─────► QuickViewModal (dc-overlay + focus trap)
        │                     gallery(images[]) + full desc + "Comprar en Jinxxy"──┐
        │                                                                          │
        ├─ "add to cart" ──► store-cart.ts                                         │
        │                     • Map state, add/remove, running total               │
        │                     • persist → localStorage (D-20)                      │
        │                     • #storeCartPill badge + #storeCartDrawer            │
        │                          │                                               │
        │                          └─ drawer "Pagar en Jinxxy" ───────────────┐    │
        │                             (D-18 NO branch: per-product links)     │    │
        ▼                                                                      ▼    ▼
  preview <img> ──hotlink──► jinxxy-c.jinxxy-cdn.com          EXTERNAL: jinxxy.com/nocturna/<product>
   (onerror → local placeholder)                              → Jinxxy checkout (PayPal/cards,
                                                                 merchant of record, digital delivery,
                                                                 70/30 split auto-applied)
```

### Recommended Project Structure
```
src/
├── data/
│   └── store.json                    # NEW — product data (D-13 schema)
├── i18n/
│   ├── routes.ts                     # EDIT — add 'store' concept { es:'tienda', en:'store' }
│   ├── nav.json                      # EDIT — add navStore label (es/en)
│   ├── pages.json                    # EDIT — add 'tienda' meta (metaTitle/metaDescription) + store UI copy
│   └── ui.ts                         # EDIT (optional) — register a new 'shop' dictionary IF store UI strings get their own file
├── pages/
│   └── [lang]/[page].astro           # EDIT — add staticPathsForConcept('store') + StorePage render + store cart chrome
├── components/
│   ├── Nav.astro                     # EDIT — add navStore to conceptLabels map
│   ├── sections/
│   │   └── StorePage.astro           # NEW — grid body (mirrors ServicesPage/GalleryPage)
│   ├── ProductCard.astro             # NEW — card (photo, name, price, editor, nsfw blur)
│   ├── QuickViewModal.astro          # NEW — dc-overlay quick-view (gallery + desc + Jinxxy CTA)
│   ├── StoreCartPill.astro           # NEW — mirrors CartPill, distinct #storeCartPill contract
│   └── StoreCartDrawer.astro         # NEW — mirrors CartDrawer, "Pagar en Jinxxy" footer
└── scripts/
    └── store-cart.ts                 # NEW — sibling of cart.ts (localStorage, own DOM contract)
```

### Pattern 1: Sibling cart module (NOT a shared refactor)
**What:** A new `store-cart.ts` that reproduces cart.ts's proven mechanics but is a wholly separate module with its own state, DOM contract, and persistence.
**When to use:** Whenever two carts must coexist without cross-contamination (D-19) and one needs behavior the other must NOT get (localStorage persistence, D-20).
**Why not refactor cart.ts into a factory:** cart.ts hard-codes services-specific selectors (`.catalog-row`, `.catalog-cat`, `CATEGORY_ORDER = ['unity','blender','textures','extras']`), a module-level singleton `cart` Map, and a Discord copy-quote modal. Generalizing it means editing the file that ships the *working, verified* cotización — a regression surface with no MVP payoff. Copy the patterns, keep the modules isolated.

**Reuse verbatim from cart.ts (copy the proven code):**
- WR-01 drawer open/close: unhide `[hidden]` BEFORE `.active`; on close, re-add `[hidden]` only on `transitionend` filtered by `e.propertyName === 'transform'` (cart.ts:434-450) — avoids the opacity-fires-first bug.
- `trapFocus(container)` (cart.ts:516-531) — Tab/Shift+Tab cycle, filtering `[hidden]` ancestors.
- `astro:page-load` re-init with a per-load guard + `astro:before-swap` reset + `readyState` fallback (cart.ts:735-767) — required for View Transitions (ClientRouter).
- `document`-level Escape + backdrop-click handlers bound ONCE via a module-level `bound` flag, re-querying live DOM at event time (cart.ts:472-494) — survives page swaps.
- **XSS guard (T-03.1-08):** build every drawer/modal row with `createElement` + `textContent`, never `innerHTML`.

**Differences store-cart.ts introduces:**
- State entry = `{ id, name, price, checkoutUrl, qty }` (no category grouping; flat list; rows are text-only, so no per-row image field).
- **Persistence (D-20):** on every mutation, `localStorage.setItem('nocturna-store-cart', JSON.stringify([...cart]))`; on init, hydrate and **validate each stored id against the current `store.json` product set — drop unknown ids and refresh name/price/checkoutUrl from data** (guards against stale products / price drift, see Pitfall 2).
- DOM contract namespaced: `#storeCartPill`, `.store-cart-pill__badge`, `#storeCartDrawer`, `#storeCartBackdrop`, `.store-cart-drawer__items`, `[data-store-cart-total]`, `[data-store-cart-checkout]`.
- Footer CTA = "Pagar en Jinxxy" → renders per-product links (Pattern 2), not a Discord modal.

### Pattern 2: Link-out checkout (D-18 resolves to NO)
**What:** The purchase drawer does not hand a pre-filled cart to Jinxxy. Each selected product row carries its own `checkoutUrl`; checkout is per-product on Jinxxy.
**Why (verified):** Jinxxy's multi-creator shared cart is real but **buyer-side only** (`jinxxy.com/cart`) — there is no public add-to-cart-URL / cart-permalink scheme for an external site to construct (contrast Shopify cart permalinks / WooCommerce add-to-cart URLs, which Jinxxy lacks). The Creator API (`api.creators.jinxxy.com`, `x-api-key`) is server-authenticated and cannot run in a static client without exposing the key.
**Recommended UX (Claude's discretion within D-18 NO branch):**
- Each drawer row: product name + price + a per-item "Comprar en Jinxxy" link (`target="_blank" rel="noopener noreferrer"`).
- Drawer footer: a short bilingual note that each item checks out on Jinxxy, plus the running total (informational — final charge happens on Jinxxy).
- **Avoid** a single button that `window.open()`s all links at once — popup blockers kill all-but-first, and it's a confusing UX. Per-item links are cleaner and accessible.
- Optional nicety: because a buyer CAN assemble a Jinxxy cart natively, the note may say "add each to your Jinxxy cart to check out together" — but the site cannot automate that step.
```typescript
// store-cart.ts drawer row (XSS-safe, per-product Jinxxy link)
const a = document.createElement('a');
a.className = 'store-cart-drawer__buy';
a.href = entry.checkoutUrl;              // from store.json, validated https (see Security)
a.target = '_blank';
a.rel = 'noopener noreferrer';
a.textContent = lang === 'es' ? 'Comprar en Jinxxy' : 'Buy on Jinxxy';
```

### Pattern 3: New page concept via the central route map
**What:** Register `store` as a `PageConcept` so nav, language switcher, and routing all derive URLs from one source (no naive prefix swap).
**Steps (mirrors the existing services/gallery/terms wiring exactly):**
1. `routes.ts`: add `'store'` to `PageConcept`, `routeSlugs.store = { es: 'tienda', en: 'store' }`, and append `'store'` to `navConcepts`.
2. `[lang]/[page].astro`: add `...staticPathsForConcept('store')` to `getStaticPaths`; add `{concept === 'store' && <StorePage lang={lang} />}` and a `concept === 'store'` chrome-bottom slot with the store cart + quick-view overlays.
3. `Nav.astro`: add `store: t.navStore` to `conceptLabels` (nav auto-renders it from `navConcepts`).
4. `nav.json`: add `navStore` ("Tienda"/"Store") to both locales.
5. `pages.json`: add a `tienda` entry (metaTitle/metaDescription) + store UI copy.
**Result:** `/es/tienda` and `/en/store` emit as distinct static slugs; the language switcher translates between them by concept automatically (`translatePath`).

### Pattern 4: Bilingual data resolution (services.json precedent)
**What:** Resolve `{es,en}` fields at build in the `.astro` component, exactly like `ServicesPage.astro` does for tiers.
```astro
---
import storeData from '../../data/store.json';
const products = storeData.products
  .slice()
  .sort((a, b) =>
    (b.featured ? 1 : 0) - (a.featured ? 1 : 0) ||           // featured pinned (D-09)
    b.date.localeCompare(a.date))                            // then newest-first
  .map((p) => ({
    ...p,
    name: p.name[lang],
    description: p.description[lang],
  }));
---
{products.map((p) => <ProductCard product={p} lang={lang} />)}
```
Astro auto-escapes `{p.name}` / `{p.description}` (T-03-04) — safe against a malformed data edit. Price renders with a component-added `$` (same convention as services.json / cart.ts `formatEntryPrice`).

### Anti-Patterns to Avoid
- **Refactoring cart.ts in place** to serve both carts — regresses the verified cotización (D-19). Sibling module instead.
- **Astro `<Image>` on Jinxxy CDN URLs** — forces `image.remotePatterns` config + build-time image fetch; breaks data-only product adds and couples builds to Jinxxy uptime. Use plain `<img>`.
- **`innerHTML` for cart/quick-view rows** — violates T-03.1-08. Use `createElement` + `textContent`.
- **A single "buy all" button that opens N tabs** — popup-blocked, confusing. Per-item links.
- **Persisting the quote cart** — D-20 explicitly keeps the /servicios cart reset-on-refresh; only the store cart persists.
- **Global 18+ toggle / persisted NSFW state** — D-10 is per-card, per-session reveal only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Payment processing, tax, chargebacks | Any checkout/payment code | Jinxxy (merchant of record) | Illegal/impossible on a static site; Jinxxy owns compliance (D-01) |
| Digital file delivery + license keys | File hosting / download gating | Jinxxy CDN + secure delivery | D-05; Jinxxy handles versioning + buyer re-download |
| Revenue splits / editor payouts | Accounting/split code | Jinxxy per-product collaborators | Native 70/30 auto-payout (D-03) — the reason Jinxxy was chosen |
| Drawer open/close + focus trap + View-Transition re-init | New modal engine | Copy cart.ts WR-01 + `trapFocus` + page-load pattern | Already solved, verified, a11y-correct (Phase 3.1) |
| Empty state | New empty component | `EmptyState.astro` | Branded, bilingual, already used by gallery/catalog |
| Image CDN optimization | Build-time resize pipeline | Jinxxy CDN `/cdn-cgi/image/format=auto` | CDN already optimizes; hotlink and move on |

**Key insight:** The static-site constraint isn't a limitation to engineer around — it's satisfied by pushing every hard problem (payments, fulfillment, splits, file hosting) onto Jinxxy and keeping the site as a bilingual catalog + link-out. The only genuinely new client code is the persisted purchase cart, and even that is a copy of an existing, verified module.

## Common Pitfalls

### Pitfall 1: Two carts leaking into each other
**What goes wrong:** Reusing cart.ts's selectors/state for the store makes adding a service show up in the store cart (or vice versa), or a shared localStorage key cross-contaminates.
**Why it happens:** cart.ts's `cart` Map is a module-level singleton; its DOM contract (`#cartPill`, `.catalog-row`) is global.
**How to avoid:** Fully separate `store-cart.ts` with a namespaced DOM contract (`#storeCartPill` etc.) and a distinct localStorage key (`nocturna-store-cart`). Each page renders only its own cart chrome (the `[page].astro` chrome-bottom slot is already concept-gated). Never import cart.ts on the store page or store-cart.ts on the services page.
**Warning signs:** Adding a service increments the store badge; a store item appears in the cotización copy-text; the /servicios drawer shows "Pagar en Jinxxy".

### Pitfall 2: Stale localStorage after a data edit
**What goes wrong:** A visitor adds product X, staff later delete or reprice X in `store.json`, the visitor returns — the cart shows a phantom product or an outdated price, and its `checkoutUrl` may 404 on Jinxxy.
**Why it happens:** localStorage snapshots data that then drifts from the source of truth.
**How to avoid:** On hydration, **reconcile against the current `store.json`** — drop any stored id not in the current product set, and refresh `name`/`price`/`checkoutUrl` from data (treat store.json as canonical; localStorage stores only *which* ids + qty). This keeps price display honest and links valid.
**Warning signs:** A cart row with a price that doesn't match the grid; a "Comprar" link that 404s.

### Pitfall 3: Broken hotlinked preview images (D-11 accepted risk)
**What goes wrong:** Jinxxy changes a CDN URL or removes a product image; cards show broken-image icons.
**Why it happens:** Images are hotlinked, not stored (D-05/D-11).
**How to avoid:** Attach an `error` handler (or an `onerror` attribute on the static `<img>`) that swaps `src` to a local branded placeholder in `public/` (e.g. `public/store/placeholder.svg`). Set explicit `width`/`height` or an aspect-ratio box so a broken/late image doesn't cause layout shift (CLS). Use `loading="lazy" decoding="async"`.
**Warning signs:** Broken-image glyphs; grid reflow as images load.

### Pitfall 4: NSFW reveal fighting reduced-motion / a11y
**What goes wrong:** A fancy blur-reveal animation ignores `prefers-reduced-motion`, or the reveal isn't keyboard-operable, or the blurred image is still readable.
**Why it happens:** Treating the reveal as pure decoration.
**How to avoid:** The reveal is a `<button>`-driven class toggle (keyboard + screen-reader operable) with a clear label ("Mostrar contenido sensible" / "Show sensitive content"). Use a strong `filter: blur(…)` (plus a scrim) so nothing explicit is legible pre-reveal. Under `prefers-reduced-motion: reduce`, apply the blur/unblur instantly (no transition) — the blur *filter* is fine (it's not motion), only the *transition* is gated. Quick-view inherits the card's reveal state (D-10).
**Warning signs:** Blur visibly animates under reduced-motion; can't reveal via keyboard; sensitive detail readable while "blurred".

### Pitfall 5: checkoutUrl as an injection / open-redirect vector
**What goes wrong:** A malformed or malicious `checkoutUrl` in `store.json` (e.g. `javascript:…`) becomes a live link.
**Why it happens:** `checkoutUrl` flows straight from data into an `href`.
**How to avoid:** Validate at build/render that `checkoutUrl` starts with `https://` (optionally that host endsWith `jinxxy.com`); skip/placeholder the buy control otherwise. Always `rel="noopener noreferrer"` on `target="_blank"` links. Low real-world risk (staff-authored data) but a cheap guard.
**Warning signs:** A buy link with a non-https scheme; a link pointing off-platform unexpectedly.

## Code Examples

### Register the store route concept
```typescript
// src/i18n/routes.ts — Source: existing routes.ts pattern (in-repo)
export type PageConcept = 'home' | 'services' | 'gallery' | 'terms' | 'store';
export const routeSlugs: Record<PageConcept, Record<Lang, string>> = {
  home:     { es: '', en: '' },
  services: { es: 'servicios', en: 'services' },
  gallery:  { es: 'galeria', en: 'gallery' },
  terms:    { es: 'terminos', en: 'terms' },
  store:    { es: 'tienda', en: 'store' },   // NEW
};
export const navConcepts: PageConcept[] = ['home', 'services', 'gallery', 'store', 'terms'];
```

### WR-01 drawer open (copied pattern, store namespace)
```typescript
// store-cart.ts — Source: cart.ts:376-413 (verified WR-01 pattern)
function openStoreDrawer(): void {
  const drawer = document.querySelector<HTMLElement>('#storeCartDrawer');
  const backdrop = document.querySelector<HTMLElement>('#storeCartBackdrop');
  if (!drawer || !backdrop) return;
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  backdrop.removeAttribute('hidden');
  drawer.removeAttribute('hidden');            // unhide BEFORE .active (WR-01)
  document.body.style.overflow = 'hidden';
  const activate = () => { backdrop.classList.add('active'); drawer.classList.add('active'); };
  prefersReduced ? activate() : requestAnimationFrame(activate);
  // …focus first control + attach trapFocus(drawer), same as cart.ts
}
```

### localStorage persistence + reconcile on init
```typescript
// store-cart.ts — persistence (D-20) + stale-id reconcile (Pitfall 2)
const KEY = 'nocturna-store-cart';
function persist() { localStorage.setItem(KEY, JSON.stringify([...cart].map(([id, e]) => [id, e.qty]))); }
function hydrate(products: Record<string, Product>) {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]') as [string, number][];
    for (const [id, qty] of raw) {
      const p = products[id];                  // canonical data
      if (p && qty > 0) cart.set(id, { ...p, qty });   // drop unknown ids; refresh price/url
    }
  } catch { /* corrupt storage → start empty */ }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jinxxy allowed explicit NSFW | Explicit content banned; suggestive/mature allowed | Mar 2026 | D-04: explicit products must use SFW listings (real content in the file) — content/staff constraint |
| No programmatic access | Creator API + webhooks (`api.creators.jinxxy.com`, `x-api-key`) | 2025→2026 | Enables a FUTURE bot phase (deferred); server-side only, unusable in static client |

**Deprecated/outdated:**
- Treating Jinxxy like Shopify/WooCommerce for cart permalinks — Jinxxy has **no** external add-to-cart-URL scheme (verified). Any plan assuming a pre-fillable cart link is wrong (D-18 = NO).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Individual Jinxxy product URLs follow `jinxxy.com/<creator>/<product-slug>` (matches D-13's locked example) | Pattern 2 / D-13 | LOW — `checkoutUrl` is authored per-product in `store.json` (D-02 platform-agnostic), so the exact structure never needs to be derived in code; staff paste the real URL. Verified the store/profile base (`jinxxy.com/<name>`) but could not 100% confirm the product-slug segment via anonymous fetch (product pages gated/dynamic). |
| A2 | Jinxxy CDN image URLs are stable enough to hotlink for the lifetime of a listing | Pitfall 3 / D-11 | LOW — already an accepted risk (D-11) with a placeholder-fallback mitigation planned. CDN domain confirmed as `jinxxy-c.jinxxy-cdn.com`. |
| A3 | Adding a new i18n dictionary namespace requires a one-line edit to `ui.ts`'s `dictionaries` map | Project Structure | LOW — verified from `ui.ts`; avoidable entirely by putting store UI copy under the existing `pages.json` namespace (no `ui.ts` edit). Either path is fine; the "no code change" rule (D-13) governs *product adds*, not the initial scaffold. |

**Note:** These are all LOW-risk and none block planning. A1 is fully neutralized by D-02 (URLs are data, not derived). No user confirmation required before execution.

## Open Questions (RESOLVED)

1. **Multi-item purchase UX wording (D-18 NO branch)**
   - What we know: the site cannot pre-fill Jinxxy's cart; each product links out individually.
   - What's unclear: whether the drawer should nudge buyers to assemble a Jinxxy-native cart ("add each to your Jinxxy cart to buy together") or just present N independent buy links.
   - Recommendation: present per-item "Comprar en Jinxxy" links with a one-line note that final payment is on Jinxxy; keep it simple for MVP. Copy is Claude's discretion — no blocker.
   - **RESOLVED (2026-07-07):** per-item "Comprar en Jinxxy" links + a bilingual footer note that each product checks out separately on Jinxxy, no single buy-all button. Adopted by 06-03-PLAN (D-18 NO branch) and the UI-SPEC Copywriting Contract.

2. **Store UI strings location**
   - What we know: meta can live in `pages.json`; richer store copy (buy labels, quick-view, cart, empty state) could too, or in a dedicated namespace.
   - Recommendation: put everything in `pages.json` under a `tienda` key to avoid a `ui.ts` edit and the `src/data/store.json` vs `src/i18n/store.json` naming clash. Discretion, non-blocking.
   - **RESOLVED (2026-07-07):** all store UI strings live under the `pages.json` `tienda` key (no `ui.ts` edit, no data/i18n naming clash). Adopted by 06-01/06-02/06-03 plans.

## Environment Availability

No new external build/runtime dependencies are introduced. The store builds with the existing Astro + Tailwind toolchain already verified in CI (gh-pages deploy). Jinxxy is a runtime *destination* (outbound links) and an image *source* (hotlinks) — neither is required at build time, so a Jinxxy outage cannot break a build or deploy. **Section otherwise skipped (no probeable external tool/service dependency for this phase's build).**

## Security Domain

`security_enforcement` is not set in `.planning/config.json` → treated as enabled. This is a **static, backend-less, auth-less** site, so most ASVS categories are N/A. The real surface is: (a) rendering staff-authored JSON, (b) outbound links, (c) client-side cart state.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No accounts/login on-site (Jinxxy owns buyer auth) |
| V3 Session Management | no | No sessions; localStorage cart is non-sensitive |
| V4 Access Control | no | No protected resources on-site |
| V5 Input Validation / Output Encoding | yes | Astro auto-escapes rendered `{…}` (T-03-04); cart/quick-view DOM built with `createElement`+`textContent` (T-03.1-08); validate `checkoutUrl` is `https://` before use |
| V6 Cryptography | no | No secrets on the static client; Creator API key (server-only) is NOT shipped |

### Known Threat Patterns for {static Astro + hotlinked CDN + link-out}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via malformed `store.json` field (name/description) | Tampering | Astro auto-escape in `.astro`; never `innerHTML` in cart JS — `textContent` only |
| `javascript:`/`data:` URI in `checkoutUrl` | Tampering / Elevation | Validate `checkoutUrl.startsWith('https://')` (optionally host endsWith `jinxxy.com`) before rendering the buy link |
| Reverse-tabnabbing via `target="_blank"` | Tampering | `rel="noopener noreferrer"` on all outbound Jinxxy links |
| Leaking Creator API key | Info Disclosure | Do NOT use the Creator API client-side; it stays out of this phase entirely (deferred) |
| localStorage tampering (edit cart contents) | Tampering | Reconcile against canonical `store.json` on hydrate (price/url never trusted from storage) — also fixes Pitfall 2 |

## Sources

### Primary (HIGH confidence)
- In-repo code (authoritative for the integration surface): `src/scripts/cart.ts`, `src/i18n/routes.ts`, `src/pages/[lang]/[page].astro`, `src/components/CartPill.astro`, `src/components/CartDrawer.astro`, `src/components/CatalogSection.astro`, `src/components/sections/ServicesPage.astro`, `src/i18n/ui.ts`, `src/i18n/nav.json`, `src/data/services.json`, `.planning/config.json`
- `.planning/phases/06-asset-store/06-CONTEXT.md` — locked decisions D-01…D-20
- https://jinxxy.com/about/selling — fees (Standard 5% → 92% net, Supporter 10% → 87%, 3% processor fee, $1.50/payout), multi-creator shared cart, merchant of record, CDN + secure file delivery, version management

### Secondary (MEDIUM confidence)
- https://jinxxy.com/Api/products — confirmed CDN image domain `jinxxy-c.jinxxy-cdn.com` with `/cdn-cgi/image/format=auto/` optimization; store/profile base URL pattern `jinxxy.com/<name>`
- https://support.jinxxy.com/hc/en-us/articles/28052364650637-How-can-I-access-the-Creator-API and https://dashboard.jinxxy.com/api-keys — Creator API is server-side (`x-api-key`, scopes `products_read`/`orders_read`/`licenses_write`), webhooks for orders — confirms it is unusable in a static client
- WebSearch (multiple queries) — no Jinxxy add-to-cart-URL / cart-permalink documentation exists; cart lives at `jinxxy.com/cart` (buyer-side). Absence of an external cart-link scheme is the basis for the D-18 = NO conclusion.

### Tertiary (LOW confidence)
- Exact `jinxxy.com/<creator>/<product-slug>` product-page structure (A1) — inferred from D-13's locked example + profile base URL; not needed in code (D-02).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all primitives verified in-repo
- Architecture / cart reuse: HIGH — cart.ts read in full; sibling-module strategy grounded in its actual selectors/state
- Jinxxy checkout model (fees, merchant of record, shared cart, CDN): HIGH — official selling page
- D-18 (no external add-to-cart URL): MEDIUM-HIGH — a negative claim; verified via absence across official pages + Creator-API server-only nature + no permalink docs. Cannot prove a non-existence absolutely, but the platform-agnostic `checkoutUrl` design (D-02) makes the per-product-link branch correct regardless.
- Pitfalls: HIGH — derived from in-repo patterns (WR-01, XSS guard, localStorage reconcile) and the accepted D-11 risk

**Research date:** 2026-07-07
**Valid until:** 2026-08-06 (30 days; Jinxxy is evolving — re-check the mature-content policy and any new cart/checkout-link features before a much-later execution)
