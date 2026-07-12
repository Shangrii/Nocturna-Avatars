# Requirements: Nocturna Avatars — Website Revamp

**Defined:** 2026-06-28
**Core Value:** A visitor is visually impressed and reaches "Abrir Ticket" on Discord, while staff keep gallery/catalog current without touching code.

## v1 Requirements

### Foundation & Deploy

- [x] **PLAT-01**: Site is built with Astro and produces static output
- [x] **PLAT-02**: Site deploys to GitHub Pages preserving the existing custom domain (CNAME) _(Build-side complete: `dist/CNAME` = `nocturna-avatars.site` on every build, parity-ready. **Domain-survival at the live cutover is human-pending** — the user must push `revamp`, set Pages Source → GitHub Actions, and confirm the domain stays bound; tracked under Deferred Items / 01-04 go-live.)_
- [x] **PLAT-03**: Brand design system (colors, fonts, grain, shared components) is centralized and reused across all pages
- [x] **PLAT-04**: A visitor on mobile sees a fully responsive layout

### Internationalization

- [x] **I18N-01**: A visitor can switch between Spanish and English from any page
- [x] **I18N-02**: All UI and marketing copy renders from per-language content dictionaries
- [x] **I18N-03**: A default language is set and URLs are language-scoped (`/es`, `/en`). _(Superseded in 01-03: **English** is now the primary/default language — defaultLocale `en` — with per-locale English URL slugs (`/en/services`, `/en/gallery`); Spanish browsers are still routed to `/es/`. Original wording said Spanish was default.)_
- [x] **I18N-04**: Terms & Conditions render in both Spanish and English

### Structure & Conversion

- [x] **NAV-01**: A visitor sees a landing with hero, featured work, packages summary, gallery teaser, and about/process
- [x] **NAV-02**: Dedicated pages exist for Servicios, Galería, and Términos
- [x] **NAV-03**: An "Abrir Ticket" / Discord CTA is reachable from every page
- [x] **NAV-04**: Navigating between pages uses animated transitions

### Experimental Motion

- [x] **FX-01**: The site uses smooth scrolling
- [x] **FX-02**: Sections animate / reveal on scroll
- [x] **FX-03**: The hero displays a WebGL shader effect (noise/distortion)
- [x] **FX-04**: The cursor has an interactive effect

### Service Catalog

- [x] **CAT-01**: The 3 packages (Penumbra/Umbra/Eclipse) render from `services.json` with features and prices
- [x] **CAT-02**: A modular catalog lists individual services grouped by category (Unity, Blender/mesh, Textures, Accessories, Extras/NSFW)
- [x] **CAT-03**: Services with undecided prices display "Cotizar"
- [x] **CAT-04**: Catalog content is fully editable via JSON without touching code

### Gallery

- [x] **GAL-01**: The gallery page renders all entries from `gallery.json` as a masonry wall
- [x] **GAL-02**: A visitor can open any photo in a lightbox
- [x] **GAL-03**: A photo can show an optional caption / alt text
- [x] **GAL-04**: The landing shows a featured subset of the gallery

### Bot Automation (nocturna-bot repo)

- [x] **BOT-01**: The cog detects staff photo posts in the configured channel and marks the message with a ✅ approve control
- [x] **BOT-02**: When a staff member confirms with ✅, the bot publishes all attachments of that message (1 or many)
- [x] **BOT-03**: The bot optimizes images (resize/compress) before publishing
- [x] **BOT-04**: The bot commits images + a `gallery.json` entry to the website repo cross-repo
- [x] **BOT-05**: A 🗑️ reaction removes the published photos from the site
- [x] **BOT-06**: The message text is captured as the optional caption

### Asset Store

_Added 2026-07-07 during Phase 6 planning (per ROADMAP Phase 6 note). Wording derived from the Phase 6 success criteria + CONTEXT.md locked decisions D-01…D-20._

- [x] **STORE-01**: A visitor sees a dedicated store section (`/tienda` ES · `/en/store` EN) listing Nocturna's own VRChat assets rendered from `src/data/store.json`, in ES + EN
- [x] **STORE-02**: Each product shows price, preview image(s), and description; staff add/edit products by editing `store.json` only — no component/code changes — rendering in both ES and EN
- [x] **STORE-03**: A visitor can add/remove assets to a REAL purchase cart with a running total, reusing the Phase 3.1 cart patterns reframed for purchase — without breaking the /servicios cotización
- [x] **STORE-04**: A visitor can complete a purchase and receive their asset(s): checkout + payment + digital fulfillment on Jinxxy (hosted third-party, no self-hosted backend), preserving Astro static + GitHub Pages + CNAME
- [x] **STORE-05**: The store is reachable from the nav, keeps "Abrir Ticket" intact; responsive + AA contrast + `prefers-reduced-motion` respected, consistent with the Refined Street Editorial system

### Reviews Publishing (nocturna-bot repo + website)

_Added 2026-07-08 during Phase 7 planning (phase captured post-milestone from the 2026-07-03 todo). Wording derived from the Phase 7 goal + CONTEXT.md decisions._

- [x] **REV-01**: The website landing renders published reviews from `src/data/reviews.json` as a bilingual testimonials section (verbatim text, localized chrome), and renders nothing when empty
- [x] **REV-02**: A `ReviewsCog` in `nocturna-bot` collects reviews via a 2-button embed (named / anonymous) + a 500-char modal, AND accepts plain typed client reviews in the reviews channel, marking each with a ✅ pending control
- [x] **REV-03**: A staff ✅ publishes a review to `reviews.json` cross-repo; a 🌙 or message delete unpublishes it — staff-role-gated, mirroring the gallery pipeline
- [x] **REV-04**: Anonymous reviews store `author: null` and never expose the submitter's identity in the repo or any public bot message
- [x] **REV-05**: The reviews commit transport reuses the existing cross-repo GitHub transport without regressing gallery publishing; a bot restart converges state via backfill + orphan reconcile

### Store Auto-Sync (nocturna-bot repo + website data)

_Added 2026-07-10 during Phase 9 planning. Promotes v2 **STORE2-03** to active; scope reduced to API-available fields + a Discord attach flow per the live-probe decisions D-14/D-15 (the Creator API exposes no product images/descriptions)._

- [x] **STORE-SYNC-01**: A `JinxxyCog` in `nocturna-bot` keeps `src/data/store.json` mirrored to the Jinxxy storefront via the Creator API — on a 6–12h scheduled poll plus a staff-gated `/tienda sync` — adding newly-published products, propagating changes to the sync-owned fields (`name`, `price`, `checkoutUrl`, `category`, `nsfw`, `date`), and removing delisted products, using a three-way snapshot merge that never overwrites staff-edited fields and never mass-removes on an API failure; each change is committed cross-repo (preserving the `_comment` schema doc) and announced to `JINXXY_ANNOUNCE_CHANNEL_ID`, while errors go to logs only
- [x] **STORE-SYNC-02**: Staff supply the two non-API fields — product images and description — through a Discord attach flow (`/tienda medios`) that optimizes attachments to WebP, commits them under `public/store/`, and writes `images[]` / `description{es,en}` into the matching `store.json` product; until supplied the card renders the branded placeholder and an empty description. These two fields stay 100% staff-owned — the sync never overwrites them

## v2 Requirements

### Experimental Extras

- **FX2-01**: Real-time 3D avatar viewer (Three.js)
- **FX2-02**: Ambient music player / audio toggle

### Gallery

- **GAL2-01**: Filter the gallery by category/tag (requires staff tagging)

### Asset Store (v2)

- **STORE2-01**: Category filters on the store grid (schema-ready via the `category` field; UI deferred until inventory grows)
- **STORE2-02**: Discord bot × Jinxxy integration (Creator API/webhooks for sales pings + split accounting) — future bot phase
- **STORE2-03**: Creator API price/product sync between Jinxxy and `store.json` (manual sync in v1) — _promoted to active in Phase 9 as STORE-SYNC-01/02 (reduced scope per D-14/D-15)._

### Reviews (v2)

- **REV2-01**: Ticket-close invite embed pointing clients to the reviews channel (design (a) companion) — deferred, own quick task later
- **REV2-02**: Bot auto-ticket creation (deferred at milestone level per the services-quote-vs-store-cart decision)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Backend / database / CMS | Static site keeps hosting free and the bot-commit flow simple |
| On-site payment processing / self-hosted checkout | Payments, tax, chargebacks, and digital fulfillment are pushed to Jinxxy (merchant of record); the site is a bilingual catalog + link-out (Phase 6, D-01/D-05/D-06) |
| Auto-translating gallery captions | Captions come from staff in one language, shown as written |
| Auto-translating review text | Reviews are user-generated and rendered verbatim in their original language (Phase 7 CONTEXT) |
| Auto-translating store listings | Jinxxy names/descriptions are copied verbatim into both locales; staff hand-polish (Phase 9, D-10) |
| Scraping the Jinxxy storefront | "API or nothing" — the Creator API is the only data source (Phase 9, D-04) |
| Reworking existing bot cogs (encoding/forum) | Only adding new cogs (photo cog Phase 5, reviews cog Phase 7, jinxxy cog Phase 9) |
| Real 3D viewer in v1 | High weight/time; deferred to v2 |
| Explicit NSFW on Jinxxy listings | Jinxxy banned explicit content Mar 2026; explicit products use SFW listings with real content in the delivered file (Phase 6, D-04) — a staff/content constraint |

## Traceability

Which phases cover which requirements. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PLAT-01 | Phase 1 | Complete |
| PLAT-02 | Phase 1 | Complete |
| PLAT-03 | Phase 1 | Complete |
| PLAT-04 | Phase 1 | Complete |
| I18N-01 | Phase 1 | Complete |
| I18N-02 | Phase 1 | Complete |
| I18N-03 | Phase 1 | Complete |
| I18N-04 | Phase 1 | Complete |
| NAV-01 | Phase 1 | Complete |
| NAV-02 | Phase 1 | Complete |
| NAV-03 | Phase 1 | Complete |
| NAV-04 | Phase 2 | Complete |
| FX-01 | Phase 2 | Complete |
| FX-02 | Phase 2 | Complete |
| FX-03 | Phase 2 | Complete |
| FX-04 | Phase 2 | Complete |
| CAT-01 | Phase 3 | Complete |
| CAT-02 | Phase 3 | Complete |
| CAT-03 | Phase 3 | Complete |
| CAT-04 | Phase 3 | Complete |
| GAL-01 | Phase 4 | Complete |
| GAL-02 | Phase 4 | Complete |
| GAL-03 | Phase 4 | Complete |
| GAL-04 | Phase 4 | Complete |
| BOT-01 | Phase 5 | Complete |
| BOT-02 | Phase 5 | Complete |
| BOT-03 | Phase 5 | Complete |
| BOT-04 | Phase 5 | Complete |
| BOT-05 | Phase 5 | Complete |
| BOT-06 | Phase 5 | Complete |
| STORE-01 | Phase 6 | Complete (06-01) |
| STORE-02 | Phase 6 | Complete (06-01) |
| STORE-03 | Phase 6 | Complete (06-03) |
| STORE-04 | Phase 6 | Complete (06-02, 06-03) |
| STORE-05 | Phase 6 | Complete (06-01, 06-02, 06-03) |
| REV-01 | Phase 7 | Planned (07-01) |
| REV-02 | Phase 7 | Planned (07-03, 07-04) |
| REV-03 | Phase 7 | Complete (07-03) |
| REV-04 | Phase 7 | Planned (07-02, 07-04) |
| REV-05 | Phase 7 | Planned (07-02, 07-03, 07-04) |
| STORE-SYNC-01 | Phase 9 | Complete (09-01..09-05, gap closure 09-07..09-12) |
| STORE-SYNC-02 | Phase 9 | Complete (09-06, editor write path 09-12) |

**Coverage:**
- v1 requirements: 42 total (PLAT 4 + I18N 4 + NAV 4 + FX 4 + CAT 4 + GAL 4 + BOT 6 + STORE 5 + REV 5 + STORE-SYNC 2)
- Mapped to phases: 42 ✓
- Unmapped: 0 ✓

> Note: an earlier draft footer counted "27 v1"; the enumerated v1 list contained 30, then 35 after the Phase 6 STORE-* requirements were added (2026-07-07), then 40 after the Phase 7 REV-* requirements were added (2026-07-08), then 42 after the Phase 9 STORE-SYNC-* requirements were added (2026-07-10).

---
*Requirements defined: 2026-06-28*
*Last updated: 2026-07-10 — STORE-SYNC-01/02 added during Phase 9 planning (promotes v2 STORE2-03; reduced scope per D-14/D-15)*
