# Phase 6: Asset Store - Context

**Gathered:** 2026-07-07
**Status:** Ready for planning

<domain>
## Phase Boundary

A visitor browses Nocturna's own VRChat assets (digital files: .unitypackage, textures, prefabs) in a dedicated store section (`/tienda` ES + `/en/store` EN) rendered from `src/data/store.json`, adds them to a real purchase cart (reusing the Phase 3.1 cart engine, separate from the /servicios cotización), and completes payment + digital delivery on **Jinxxy** (hosted checkout — no self-hosted backend, Astro static + GitHub Pages + CNAME preserved). Staff add/edit products by editing `store.json` only — no code changes.

**Business model captured this phase:** Nocturna is multi-vendor. The owner manages several editors who sell their own assets in the store; the owner takes a 30% cut. Jinxxy's native per-product collaborator splits handle this automatically — a hard requirement that drove the platform choice.

</domain>

<decisions>
## Implementation Decisions

### Checkout & fulfillment platform (researched via gsd-advisor-researcher, user-confirmed)
- **D-01:** **Platform = Jinxxy** (jinxxy.com), chosen after deep research against SellAuth, Payhip, itch.io, Booth.pm, Gumroad, Ko-fi, Lemon Squeezy. Winning criteria in the user's priority order: (1) native per-product collaborator revenue splits — auto-paid 70/30, TOP priority; (2) fees ~92% net to seller on Standard tier (5% platform + ~3% processing + $1.50/weekly payout); plus PayPal+cards for buyers, México payouts (owner's country), Jinxxy-absorbed chargeback risk, highest VRChat buyer trust, Creator API + webhooks.
- **D-02:** **Platform-agnostic in code:** `store.json` uses a generic `checkoutUrl` field per product. Nothing Jinxxy-specific in components — the platform can be swapped by editing data only.
- **D-03:** **Multi-vendor mechanics (operational, not code):** each editor creates their own free Jinxxy account with their own payout method; the owner adds them as a per-product "collaborator" with a 70% share. Each party sees their own sales dashboard. No accounting code in this phase.
- **D-04:** **NSFW policy reality (constraint):** the store will include NSFW assets. Jinxxy banned *explicit* content Mar 2026 but allows suggestive/mature; community practice (user-confirmed) is SFW listing previews/descriptions with the real content in the delivered file. Explicit products must use SFW listings on Jinxxy. This is a staff/content constraint, not a code one — but the SITE's own NSFW display is code (see D-10).
- **D-05:** **Digital files only** — Jinxxy hosts and delivers all product files. No product files in the repo, ever.
- **D-06:** Buyers pay via PayPal + cards (handled entirely by Jinxxy as merchant of record). Multi-item purchase exists via Jinxxy's shared cart on their checkout.

### Store page & product display
- **D-07:** **Structure: grid + quick-view modal.** One store page per language; clicking a card opens a quick-view modal (photo gallery, full description, "Comprar en Jinxxy" button). Reuses the existing `dc-overlay`/modal + focus-trap pattern — no per-product pages.
- **D-08:** **Cards show:** photo + name + price + editor credit ("por Kira", plain text — see D-16). Grid is **flat** (no filters at launch); `category` exists in the schema so filters can be added later without data migration.
- **D-09:** **Ordering:** `featured: true` products pinned on top; the rest sorted newest-first by `date`.
- **D-10:** **NSFW display on-site: blur + per-card reveal.** Cards with `nsfw: true` render blurred with a click-to-reveal on each card (no global toggle, no persisted 18+ state). Quick-view of an NSFW product follows the same reveal state.
- **D-11:** **Preview images are hotlinked from Jinxxy's CDN** (URLs in `store.json`). Accepted risk: broken images if Jinxxy changes URLs — mitigate with a graceful placeholder fallback (Claude's discretion on implementation).
- **D-12:** **Nav:** "Tienda"/"Store" as a top-level nav item; routes `/tienda` (ES) + `/en/store` (EN) following the existing `src/i18n/routes.ts` pattern. "Abrir Ticket" Discord path stays intact.

### store.json schema (locked)
- **D-13:** File: `src/data/store.json` (mirrors services.json/gallery.json pattern). Shape:
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
- **D-14:** **No discount fields** — single `price`, staff edits the number (keeps it always syncable with Jinxxy).
- **D-15:** **Both `es` + `en` are REQUIRED** for name and description — the EN store never shows Spanish (US audience goal).
- **D-16:** `editor` is a **plain text string**, not clickable — credit without leaking traffic out of the grid.

### Purchase cart vs cotización
- **D-17:** **Local store cart exists**, reusing the Phase 3.1 cart engine patterns (pill + drawer + running total) reframed for purchase.
- **D-18:** **Research task for planning:** verify whether Jinxxy supports add-to-cart-via-URL. If YES → the drawer's "Pagar en Jinxxy" opens Jinxxy's cart pre-filled with all selected products (single checkout). If NO → the drawer lists each selected product with its individual "Comprar" link to Jinxxy.
- **D-19:** **Two fully separate carts:** the /servicios pill shows only the quote cart (ends in "Abrir Ticket" + copy-quote modal — unchanged); the /tienda pill shows only the purchase cart (ends in "Pagar en Jinxxy"). They never mix; each page renders only its own. The cotización flow must not regress.
- **D-20:** **Store cart persists in localStorage** (survives navigation/refresh/revisits). The quote cart keeps its Phase 3.1 reset-on-refresh behavior (D-06 there) — do not add persistence to it.

### Claude's Discretion
- Placeholder/fallback behavior for broken Jinxxy CDN images (D-11).
- Exact blur treatment + reveal microinteraction for NSFW cards (within Refined Street Editorial + `prefers-reduced-motion`).
- Whether "add to cart" lives on the card, the quick-view, or both.
- Technical separation strategy for the two carts (namespaced module, separate storage keys, etc.) — as long as D-19/D-20 hold.
- Store page copy/i18n strings (new `src/i18n/store.json` or equivalent), empty-state when `store.json` has no products (reuse `EmptyState`).
- Jinxxy fee tier (Standard vs Supporter) is an account-level staff choice, not code; assume Standard (5%).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Jinxxy platform (external — load-bearing for D-01…D-06, D-18)
- https://jinxxy.com/about/selling — fees (5%/10% tiers, ~3% processing, $1.50 payout), shared cart, merchant-of-record model
- https://support.jinxxy.com/hc/en-us/articles/31550733077645-Collaborating-on-Products — per-product collaborator revenue splits (the 70/30 mechanism). NOTE: Zendesk returns 403 to plain fetches — use a browser/user-agent workaround when verifying.
- https://support.jinxxy.com/hc/en-us/articles/16765872965517-Mature-Content-Policy — what NSFW listings may show (post Mar-2026 explicit ban)
- https://support.jinxxy.com/hc/en-us/articles/28052364650637-How-can-I-access-the-Creator-API — Creator API (future bot integration; not used this phase)

### Internal (prior-phase contracts this phase must respect)
- `.planning/phases/03.1-catalog-configurator/03.1-CONTEXT.md` — cart engine decisions (D-06 no-persistence for quote cart, price string convention, a11y drawer contract)
- `.planning/phases/02.1-visual-redesign-refined-street-editorial/02.1-CONTEXT.md` — design system the store must match
- `src/scripts/cart.ts` — the engine being reused/reframed (768 lines; sections 1–10 documented inline)
- `src/i18n/routes.ts` — bilingual route mapping pattern for the new /tienda ↔ /en/store pair

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/scripts/cart.ts` — full cart engine: Map state, add/remove/qty, price parsing/formatting (ES/EN), drawer + modal open/close with WR-01 pattern, focus traps, astro:page-load re-init. The store cart adapts these patterns.
- `src/components/CartPill.astro`, `CartDrawer.astro` — pill + drawer UI to mirror (or parameterize) for the store cart.
- Modal/lightbox patterns: `CartSummaryModal.astro`, `LightboxOverlay.astro`, `DiscordModal.astro` (`dc-overlay` + focus trap + Escape/outside-click via `chrome.ts`) — basis for the product quick-view.
- `src/components/EmptyState.astro` — branded empty state for a product-less store.
- `src/components/sections/GalleryPage.astro` + `src/styles/gallery.css` — grid-of-images page reference.

### Established Patterns
- Bilingual data files: `{ "es": …, "en": … }` per field; prices as plain number strings; component adds currency symbol (`services.json`).
- Data imported at build from `src/data/*.json`; staff edit data → commit → Pages rebuild.
- Pages: `/` ES root + `/en/*` EN mirrors; route names mapped in `src/i18n/routes.ts`; UI strings in `src/i18n/*.json`.
- z-index contract: nav `z-999`, cart pill above drawer backdrop (Phase 3.1 specifics).
- XSS guard: DOM built with `createElement` + `textContent`, never `innerHTML` (T-03.1-08).

### Integration Points
- `src/components/Nav.astro` + `src/i18n/nav.json` — new "Tienda"/"Store" top-level entry.
- `src/i18n/routes.ts` — register `tienda ↔ store` page pair; new page files under `src/pages/` (ES) + `src/pages/en/`.
- `src/data/` — new `store.json` alongside services.json/gallery.json.
- Cart engine: decide reuse strategy (shared module with namespaces vs sibling `store-cart.ts`) without touching the /servicios behavior.

</code_context>

<specifics>
## Specific Ideas

- The user's platform bar: "priorizando el tracking de ventas y ya de segundo el que no cobre comisiones tan caras" — tracking first, fees second. Jinxxy's auto-split ("Fua, es que lo de que el split esté nativo es demasiado bueno") is what won.
- On NSFW platform policies, the user's read (confirmed by research): platforms "prohibit" NSFW but tolerate it when the listing itself is SFW — sell with censored previews, real content in the file.
- The user loved Payhip's on-domain overlay checkout ("me encantaría poder manejar todo desde mi página") — chose Jinxxy anyway for the splits. Make the on-site part (grid, quick-view, cart) feel as store-like as possible so only the final payment step leaves the domain.
- STORE-01…STORE-05 requirements must be added to `.planning/REQUIREMENTS.md` during planning (per ROADMAP note).

</specifics>

<deferred>
## Deferred Ideas

- **Discord bot × Jinxxy integration** (future bot phase): consume the Creator API/webhooks for sales notifications/accounting; the `jinx` open-source Discord bot (github.com/zkxs/jinx) is prior art. User floated this for split accounting if manual — moot now, but valuable for sales pings.
- **Creator API price/product sync** between Jinxxy and `store.json` (build-time or bot-driven) — manual sync this phase.
- **Watch Jinxxy's announced "alternative" for adult creators** (from their Mar 2026 statement) — could relax D-04's SFW-listing constraint.
- **Category filters on the store grid** — schema-ready (`category` field), UI deferred until inventory grows.

### Reviewed Todos (not folded)
User wants each promoted to its **own phase** (run `/gsd-phase add` to slot into ROADMAP.md):
- **Bot reminders command (weekly/monthly, custom message)** — bot-repo feature, unrelated to the store.
- **Carrd-style template editor for Nocturna editors** — staff tooling, its own capability.
- **Reviews channel → website publishing system** — a new publishing pipeline (Phase-5-like bot cog + site section).

</deferred>

---

*Phase: 6-asset-store*
*Context gathered: 2026-07-07*
