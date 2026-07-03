# Roadmap: Nocturna Avatars — Website Revamp

## Overview

Rebuild the Nocturna Avatars portfolio as an Astro static site that ships live to GitHub Pages early, then layers in experience and content slice by slice. We start by standing up the bilingual, branded shell with the conversion path intact (Foundation), then make it feel "máximo experimental" (Motion), then make the catalog and gallery fully data-driven so staff can edit content without touching code (Catalog, Gallery), and finally — in a separate repo — wire the Discord bot that auto-publishes gallery photos against the finalized `gallery.json` schema (Bot Cog). Each phase is end-to-end deployable: a visitor can always land, be impressed, and reach "Abrir Ticket."

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Bilingual Shell** - Astro + design system + i18n + structure + deploy; the live, branded, convertible shell (completed 2026-06-28)
- [x] **Phase 2: Experimental Motion Layer** - WebGL hero, smooth scroll, scroll reveals, animated page transitions, cursor effects (completed 2026-06-30)
- [x] **Phase 3: Service Catalog** - Data-driven packages + modular catalog from `services.json` (ES/EN, "Cotizar") (completed 2026-07-01)
- [ ] **Phase 3.1: Catalog Configurator** - Interactive "arma tu paquete" cart: individual services selectable 1-by-1 with prices and running total, "Open Ticket" with cart summary (INSERTED)
- [x] **Phase 4: Gallery & Data Layer** - Masonry gallery + lightbox from `gallery.json`, featured subset on landing, schema finalized (completed 2026-07-03)
- [ ] **Phase 5: Photo-Publishing Bot Cog** - Discord cog in `nocturna-bot` (✅ approve / 🗑️ remove / Pillow optimize / cross-repo commit)
- [ ] **Phase 6: Asset Store** - Dedicated store to sell Nocturna's own VRChat assets via a REAL shopping cart + hosted checkout, reusing the Phase 3.1 cart engine

## Phase Details

### Phase 1: Foundation & Bilingual Shell

**Goal**: A visitor lands on a live, branded, fully responsive bilingual site with the hero, packages summary, gallery teaser, about/process, dedicated pages, and an always-reachable Discord CTA.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: PLAT-01, PLAT-02, PLAT-03, PLAT-04, I18N-01, I18N-02, I18N-03, I18N-04, NAV-01, NAV-02, NAV-03
**Success Criteria** (what must be TRUE):

  1. A visitor reaches the production domain (CNAME preserved) and the site is served from Astro static output on GitHub Pages
  2. A visitor can switch between Spanish and English from any page; **English is default** (updated in 01-03; was ES) and URLs are language-scoped with per-locale slugs (`/en/services` · `/es/servicios`, `/en/gallery` · `/es/galeria`)
  3. A visitor sees a landing with hero, featured work placeholder, packages summary, gallery teaser, and about/process — plus dedicated `/servicios`, `/galeria`, `/terminos` pages
  4. A visitor can reach an "Abrir Ticket" / Discord CTA from every page
  5. A visitor on mobile sees a fully responsive layout using the centralized brand design system (colors, fonts, grain, shared components)
  6. Terms & Conditions render in both Spanish and English (EN flagged for human/legal review before publish)

**Plans**: 4 plans
Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Astro scaffold + i18n routing + design tokens + base layout + localized hero + revamp-branch deploy (thinnest deployable end-to-end slice)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Global chrome: nav, path-preserving language switcher, persistent floating CTA, Discord modal, footer
- [x] 01-03-PLAN.md — Landing composition + dedicated shells (/servicios real packages, /galeria shell, branded 404)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-04-PLAN.md — Terms (ES verbatim + EN flagged draft) + legacy redirects + responsiveness pass + cutover parity

**UI hint**: yes
**Notes**: Brownfield migration — carry over existing content (packages, terms, about/process copy) and brand tokens from `index.html`/`styles.css`/`functions.js`. Establish the i18n routing/dictionary system here so all later content is bilingual from the start. Decide image storage path (`assets/gallery/` vs `public/gallery/`) in this phase. Bump the "A Another Tag" type scale and reserve it for display/accents. **Dependency:** Terms EN translation needs human/legal review (I18N-04 ships with a placeholder/reviewed copy gate).

### Phase 2: Experimental Motion Layer

**Goal**: The site feels "máximo experimental" — smooth scroll, scroll-triggered reveals, a WebGL hero shader, animated page transitions, and an interactive cursor — without burying the conversion path.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: FX-01, FX-02, FX-03, FX-04, NAV-04
**Success Criteria** (what must be TRUE):

  1. A visitor experiences smooth scrolling (Lenis) across the site
  2. A visitor sees sections animate/reveal as they scroll (GSAP/ScrollTrigger)
  3. A visitor sees a WebGL noise/distortion shader in the hero
  4. A visitor sees an interactive cursor effect and micro-interactions
  5. A visitor navigating between pages sees animated transitions (Astro View Transitions), and the site still loads fast with the CTA reachable

**Plans**: 4 plans
Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Foundation slice: ClientRouter + lifecycle motion controller + Lenis smooth scroll (FX-01) + GSAP/ScrollTrigger+SplitText reveals (FX-02) + mandatory chrome.ts swap-safe migration + global.css scroll-behavior guard

**Wave 2** *(blocked on Wave 1)*

- [x] 02-02-PLAN.md — Hero WebGL shader slice (FX-03): hand-authored full-screen-quad grain/chromatic/glitch shader + static fallback image + capability/perf degradation

**Wave 3** *(blocked on Wave 2 — shares the motion controller)*

- [x] 02-03-PLAN.md — Cursor + micro-interactions (FX-04) + landing choreography: gallery marquee (D-14), card 3D tilt (D-15), featured parallax (D-16)

**Wave 4** *(blocked on Wave 3 — shares the motion controller + BaseLayout)*

- [x] 02-04-PLAN.md — Page transitions (NAV-04): glitch-wipe + first-visit intro (D-18) + nav hide-on-scroll & persistent pulsing CTA (D-19)

**UI hint**: yes
**Notes**: Performance budget is a hard constraint — experimental but fast; the "Abrir Ticket" path must remain reachable in all motion states. WebGL is a single hero shader, not a 3D scene (Three.js explicitly deferred to v2). MVP vertical-slice sequencing; the 4 plans serialize because each effect registers into the shared motion controller (`src/scripts/motion/index.ts`) — true wave-parallelism is blocked by that single shared file, but each wave is independently shippable with the CTA reachable throughout (D-19/D-20).

### Phase 02.1: Visual Redesign — Refined Street Editorial (INSERTED)

**Goal**: The existing site is re-skinned to the "Refined Street Editorial" look on top of the Phase 2 motion layer — oversized Space Grotesk editorial type with graffiti as a signature accent, a red/navy editorial rhythm (alternating ink/paper sections), Tailwind v4 design tokens, the custom cursor removed, and the landing reordered (featured gallery above about) — without breaking the conversion path, i18n, or content.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: PLAT-03, PLAT-04 (visual quality + a11y; design contract in `docs/superpowers/specs/2026-06-30-website-redesign-design.md`)
**Success Criteria** (what must be TRUE):

  1. A visitor sees the new editorial type system — Space Grotesk for oversized display, the graffiti face reserved for the wordmark/section tags/one hero accent — legible at every size
  2. Sections alternate an ink (navy) / paper (off-white) editorial rhythm with red used surgically as the single accent; brand identity stays recognizable
  3. Tailwind v4 is integrated CSS-first (`@tailwindcss/vite` + `@theme`), brand tokens become utilities, the old `tokens.css` is retired, and no React/shadcn is added; site stays Astro static on GitHub Pages with CNAME intact
  4. The custom cursor is removed and the Phase 2 motion layer (smooth scroll, reveals, page transitions, hero backdrop) still works, re-skinned
  5. The landing order is hero → featured gallery → about + process → packages summary → closing CTA (gallery raised for visual-first impact)
  6. `/servicios`, `/galeria`, `/terminos`, 404, and chrome (nav/footer/floating CTA/lang switcher) are restyled to the system; "Abrir Ticket" reachable from every page; responsive at 375/768/1024/1440; AA contrast in both ink and paper sections; `prefers-reduced-motion` respected

**UI hint**: yes
**Notes**: Pure visual + structural re-skin — no copy, i18n logic, gallery automation, or catalog data changes. Sequenced BEFORE Phase 3/4 so the catalog and gallery are built directly in the new design system. Tailwind migration is incremental (add tokens alongside existing CSS, then convert component-by-component, retiring old CSS as each lands) so the site stays shippable throughout. Graffiti/film-grain/hero-backdrop effects stay as small custom CSS layers; only `cursor.ts`/`cursor.css` are deleted from the motion layer.

**Plans**: 4 plans
Plans:
**Wave 1**

- [x] 02.1-01-PLAN.md — Tailwind v4 + @theme token foundation in BaseLayout + cursor removal (enabling slice; existing look intact)

**Wave 2** *(blocked on Wave 1 — owns shared sections.css/PackageCard/EmptyState)*

- [x] 02.1-02-PLAN.md — Landing re-skin: editorial hero + featured-first reorder + ink/paper section system

**Wave 3** *(blocked on Wave 2 — consumes re-skinned shared blocks)*

- [x] 02.1-03-PLAN.md — Dedicated pages re-skin: /servicios + /galeria + /terminos paper column + 404

**Wave 4** *(blocked on Wave 3 — global chrome in BaseLayout, final a11y/responsive sweep)*

- [x] 02.1-04-PLAN.md — Chrome re-skin: nav/footer/floating CTA/modal/lang switcher + whole-site quality-bar sweep

### Phase 3: Service Catalog

**Goal**: A visitor sees the 3 packages and a modular catalog rendered entirely from `services.json`, in both languages, with undecided prices shown as "Cotizar" — fully editable without touching code.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: CAT-01, CAT-02, CAT-03, CAT-04
**Success Criteria** (what must be TRUE):

  1. A visitor sees the 3 packages (Penumbra/Umbra/Eclipse) with features and prices rendered from `services.json`
  2. A visitor sees a modular catalog of individual services grouped by category (Unity, Blender/mesh, Textures, Accessories, Extras/NSFW)
  3. A visitor sees "Cotizar" for any service whose price is not yet agreed
  4. A staff member can edit packages and catalog content by editing JSON only — no component/code changes needed — and the change renders in both ES and EN

**Plans**: 3 plans
Plans:
**Wave 1**

- [x] 03-01-PLAN.md — Create `src/data/services.json`: bilingual-per-entry schema, migrated package data (3 tiers, 8 add-ons, addonsNote), 5 empty catalog categories

**Wave 2** *(blocked on Wave 1 — consumers need the data file)*

- [x] 03-02-PLAN.md — Migrate packages consumers: rewire PackagesSummary + ServicesPage to import services.json directly; add UI labels to pages.json; retire packages from ui.ts

**Wave 3** *(blocked on Wave 2 — catalog section needs wired package section)*

- [x] 03-03-PLAN.md — Build CatalogSection.astro + wire into ServicesPage; editorial rows, Cotizar styling, per-category EmptyState

**UI hint**: yes
**Notes**: Migrate package data (Penumbra $40 / Umbra $60 / Eclipse $90) from the current site. **Open content item:** modular catalog prices are not yet agreed by the team → render as "Cotizar" until decided. Catalog copy flows through the i18n dictionaries established in Phase 1.

### Phase 3.1: Catalog Configurator (INSERTED)

**Goal**: A visitor can browse the modular catalog, select individual services 1-by-1 into a cart, see a running total, and open a Discord ticket with their selection pre-summarized — without any backend or code changes needed when staff update prices.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: CAT-02, CAT-03 (extends)
**Success Criteria** (what must be TRUE):

  1. A visitor can add/remove individual catalog services to a cart, one at a time
  2. The cart shows a running price total of selected items
  3. A visitor clicks "Abrir Ticket" and sees their full selection summarized (with a copy-to-clipboard option) before going to Discord
  4. Prices for individual services show $99 USD placeholder; staff update them in `services.json` only — no code changes needed
  5. The tiers (Penumbra/Umbra/Eclipse) coexist with the configurator — quick picks vs. custom builds
  6. The configurator works in both ES and EN

**Plans**: 6 plans
Plans:
**Wave 1**

- [x] 03.1-01-PLAN.md — Restructure services.json (4 categories, 26 items, id+repeatable schema) + remove addons block from ServicesPage

**Wave 2** *(blocked on Wave 1)*

- [x] 03.1-02-PLAN.md — CartPill.astro + CartDrawer.astro static shells (HTML/CSS, no behavior)
- [x] 03.1-03-PLAN.md — CartSummaryModal.astro static shell (reuses dc-overlay/dc-modal)
- [x] 03.1-04-PLAN.md — CatalogSection cart controls + mount all cart components in ServicesPage

**Wave 3** *(blocked on Wave 2)*

- [x] 03.1-05-PLAN.md — cart.ts engine (Map state, add/remove/qty, DOM sync, drawer open/close, WR-01 pattern)

**Wave 4** *(blocked on Wave 3)*

- [ ] 03.1-06-PLAN.md — Modal behavior + clipboard copy + focus traps + a11y + human verification

**UI hint**: yes
**Notes**: Pure client-side JS (no backend). Cart state lives in the page; prices in `services.json`. The "Open Ticket" flow cannot pre-fill a Discord ticket directly — a modal with cart summary + "Copiar selección" + Discord link is the UX. Builds directly on Phase 3's CatalogSection and services.json schema.

### Phase 4: Gallery & Data Layer

**Goal**: A visitor browses a masonry photo wall with lightbox rendered from `gallery.json`, sees a featured subset on the landing, and the `gallery.json` schema is finalized so the bot can write to it.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: GAL-01, GAL-02, GAL-03, GAL-04
**Success Criteria** (what must be TRUE):

  1. A visitor sees all entries from `gallery.json` rendered as a masonry wall on `/galeria`
  2. A visitor can open any photo in a lightbox
  3. A photo can display an optional caption / alt text when present in the entry
  4. A visitor sees a featured subset of the gallery on the landing
  5. The `gallery.json` entry schema (`{ file, caption?, width, height, date }`) and image storage path are finalized and documented for the bot to target

**Plans**: TBD
**UI hint**: yes
**Notes**: This phase finalizes the `gallery.json` schema — a hard prerequisite for Phase 5. Captions are shown as written (single language from staff, not auto-translated).

### Phase 5: Photo-Publishing Bot Cog

**Goal**: Staff publish gallery photos straight from Discord — a ✅ approves a message's attachments, the bot optimizes and commits them cross-repo to the website, and a 🌙 removes them — with zero code changes to keep the gallery current.
**Mode:** mvp
**Depends on**: Phase 4 (finalized `gallery.json` schema + image storage path)
**Requirements**: BOT-01, BOT-02, BOT-03, BOT-04, BOT-05, BOT-06
**Success Criteria** (what must be TRUE):

  1. The cog detects staff photo posts in channel `1416329356426481717` and reacts ✅ as an approve control
  2. When a staff member confirms with ✅, the bot publishes all attachments of that message (1 or many)
  3. The bot optimizes images (resize/compress via Pillow) before publishing, with unique filenames
  4. The bot commits images + a `gallery.json` entry to the website repo cross-repo (via PAT/deploy key), triggering a GitHub Pages rebuild so photos go live
  5. A 🌙 reaction removes the published photos (and their `gallery.json` entries) from the site (supersedes the 🗑️ literal per D-06 — behavior unchanged)
  6. The message text is captured as the optional caption on published entries

**Plans**: 5 plans
Plans:
**Wave 1**

- [x] 05-01-PLAN.md — Config surface + deps (Pillow/pytest) + Pillow image-optimization pipeline (test-first); WebP downscale-only + EXIF strip (BOT-03)

**Wave 2** *(blocked on Wave 1 — needs config + test harness)*

- [ ] 05-02-PLAN.md — Atomic cross-repo commit transport `core/github_publish.py` via GitHub Git Data API (blobs→tree→commit→ref), publish + removal, lock + retry (test-first) (BOT-04)

**Wave 3** *(blocked on Waves 1+2 — the cog wires both cores)*

- [ ] 05-03-PLAN.md — `cogs/gallery.py` publish slice: staff-post detection + ✅ approve + publish orchestration + bot.py loader + config validation (BOT-01/BOT-02/BOT-06)

**Wave 4** *(blocked on Wave 3 — shares `cogs/gallery.py`)*

- [ ] 05-04-PLAN.md — Removal + auto-unpublish (🌙 + message-delete) + persistent error surfacing + startup backfill cursor/reconcile (BOT-05/D-10/D-19/D-20)

**Wave 5** *(blocked on Wave 4 — live secrets + acceptance)*

- [ ] 05-05-PLAN.md — Live setup (fine-grained PAT + staff role IDs + deploy) + end-to-end human verification of all 6 criteria

**Notes**: **Cross-repo:** this cog lives 100% inside the separate `nocturna-bot` repo (https://github.com/Shangrii/nocturna-bot), following its existing cogs structure (encoding.py, forum.py). No bot code in the website repo, no site code in the bot. It pushes to the website repo (`Shangrii/Nocturna-Avatars` @ `revamp`) via a GitHub PAT/deploy key in the bot's `.env`. Hard dependency on Phase 4's finalized `gallery.json` schema and image storage path. Existing cogs (encoding/forum) are not reworked. The 5 plans serialize (Waves 1→5): plans 03/04 share the single `cogs/gallery.py` file, mirroring Phase 2's motion-controller serialization; each wave is independently shippable-and-tested (unit tests) with live end-to-end proof gated to plan 05-05.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

(Phases 2, 3, and 4 each depend only on Phase 1 and may be planned in parallel; Phase 5 must follow Phase 4. Phase 6 (Asset Store) depends only on Phase 3.1's cart engine + Phase 2.1's design system — independent of Phases 4/5, so it may be sequenced flexibly.)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Bilingual Shell | 4/4 | Complete   | 2026-06-28 |
| 2. Experimental Motion Layer | 4/4 | Complete   | 2026-06-30 |
| 2.1 Visual Redesign — Refined Street Editorial | 4/4 | Complete   | 2026-06-30 |
| 3. Service Catalog | 3/3 | Complete   | 2026-07-01 |
| 3.1 Catalog Configurator | 5/6 | In Progress|  |
| 4. Gallery & Data Layer | 3/3 | Complete   | 2026-07-03 |
| 5. Photo-Publishing Bot Cog | 1/5 | In Progress|  |
| 6. Asset Store | 0/TBD | Not started | - |

### Phase 6: Asset Store

**Goal**: A visitor can browse Nocturna's own VRChat assets in a dedicated store section, add them to a REAL shopping cart (a purchase flow, distinct from the /servicios cotización), and complete a purchase via a hosted checkout — with staff able to add/edit products by editing data only, no code changes.
**Mode:** mvp
**Depends on**: Phase 3.1 (reuses the cart engine + Cart* components) and Phase 2.1 (design system). Independent of Phase 4 (Gallery) and Phase 5 (Bot) — can be sequenced flexibly.
**Requirements**: STORE-01, STORE-02, STORE-03, STORE-04, STORE-05 (NEW — add to REQUIREMENTS.md during planning)
**Success Criteria** (what must be TRUE):

  1. A visitor sees a dedicated store section listing Nocturna's own VRChat assets rendered from a data file (e.g. `store.json`), in ES + EN
  2. Each product shows price, preview image(s), and description; staff add/edit products by editing data only — no component/code changes — rendering in both ES and EN
  3. A visitor can add/remove assets to a REAL shopping cart with a running total, reusing the Phase 3.1 cart engine (cart.ts + Cart* components) reframed for purchase — without breaking the /servicios cotización
  4. A visitor can complete a purchase and receive their asset(s): checkout + payment + digital fulfillment handled by a hosted third-party service (no self-hosted backend), preserving Astro static + GitHub Pages + CNAME
  5. The store is reachable from the site chrome (nav) and keeps the "Abrir Ticket" Discord path intact; responsive + AA contrast + `prefers-reduced-motion` respected, consistent with the Refined Street Editorial system

**UI hint**: yes
**Notes**: **Static-site constraint** — no self-hosted payment/fulfillment backend. Payment provider is an in-phase decision: a static-site cart+checkout (e.g. Snipcart / Foxy.io) to keep OUR multi-item cart, OR per-product hosted links (Gumroad / Payhip / Lemon Squeezy / Ko-fi / Stripe Payment Links). Reuses the cart engine built in Phase 3.1 (the /servicios "cotización" is the same engine reframed as non-purchase). Product data, asset-file hosting, and preview-image storage path decided in-phase. STORE-* requirements to be added to REQUIREMENTS.md during discuss/plan.

**Plans**: TBD (run `/gsd-plan-phase 6` to break down)
Plans:
- [ ] TBD
