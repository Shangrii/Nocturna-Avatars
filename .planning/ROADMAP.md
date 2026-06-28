# Roadmap: Nocturna Avatars — Website Revamp

## Overview

Rebuild the Nocturna Avatars portfolio as an Astro static site that ships live to GitHub Pages early, then layers in experience and content slice by slice. We start by standing up the bilingual, branded shell with the conversion path intact (Foundation), then make it feel "máximo experimental" (Motion), then make the catalog and gallery fully data-driven so staff can edit content without touching code (Catalog, Gallery), and finally — in a separate repo — wire the Discord bot that auto-publishes gallery photos against the finalized `gallery.json` schema (Bot Cog). Each phase is end-to-end deployable: a visitor can always land, be impressed, and reach "Abrir Ticket."

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Bilingual Shell** - Astro + design system + i18n + structure + deploy; the live, branded, convertible shell
- [ ] **Phase 2: Experimental Motion Layer** - WebGL hero, smooth scroll, scroll reveals, animated page transitions, cursor effects
- [ ] **Phase 3: Service Catalog** - Data-driven packages + modular catalog from `services.json` (ES/EN, "Cotizar")
- [ ] **Phase 4: Gallery & Data Layer** - Masonry gallery + lightbox from `gallery.json`, featured subset on landing, schema finalized
- [ ] **Phase 5: Photo-Publishing Bot Cog** - Discord cog in `nocturna-bot` (✅ approve / 🗑️ remove / Pillow optimize / cross-repo commit)

## Phase Details

### Phase 1: Foundation & Bilingual Shell

**Goal**: A visitor lands on a live, branded, fully responsive bilingual site with the hero, packages summary, gallery teaser, about/process, dedicated pages, and an always-reachable Discord CTA.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: PLAT-01, PLAT-02, PLAT-03, PLAT-04, I18N-01, I18N-02, I18N-03, I18N-04, NAV-01, NAV-02, NAV-03
**Success Criteria** (what must be TRUE):

  1. A visitor reaches the production domain (CNAME preserved) and the site is served from Astro static output on GitHub Pages
  2. A visitor can switch between Spanish and English from any page; ES is default and URLs are language-scoped (`/es`, `/en`)
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
- [ ] 01-03-PLAN.md — Landing composition + dedicated shells (/servicios real packages, /galeria shell, branded 404)

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 01-04-PLAN.md — Terms (ES verbatim + EN flagged draft) + legacy redirects + responsiveness pass + cutover parity

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

**Plans**: TBD
**UI hint**: yes
**Notes**: Performance budget is a hard constraint — experimental but fast; the "Abrir Ticket" path must remain reachable in all motion states. WebGL is a single hero shader, not a 3D scene (Three.js explicitly deferred to v2).

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

**Plans**: TBD
**UI hint**: yes
**Notes**: Migrate package data (Penumbra $40 / Umbra $60 / Eclipse $90) from the current site. **Open content item:** modular catalog prices are not yet agreed by the team → render as "Cotizar" until decided. Catalog copy flows through the i18n dictionaries established in Phase 1.

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
  5. The `gallery.json` entry schema (`{ file, caption?, date }`) and image storage path are finalized and documented for the bot to target

**Plans**: TBD
**UI hint**: yes
**Notes**: This phase finalizes the `gallery.json` schema — a hard prerequisite for Phase 5. Captions are shown as written (single language from staff, not auto-translated).

### Phase 5: Photo-Publishing Bot Cog

**Goal**: Staff publish gallery photos straight from Discord — a ✅ approves a message's attachments, the bot optimizes and commits them cross-repo to the website, and a 🗑️ removes them — with zero code changes to keep the gallery current.
**Mode:** mvp
**Depends on**: Phase 4 (finalized `gallery.json` schema + image storage path)
**Requirements**: BOT-01, BOT-02, BOT-03, BOT-04, BOT-05, BOT-06
**Success Criteria** (what must be TRUE):

  1. The cog detects staff photo posts in channel `1416329356426481717` and reacts ✅ as an approve control
  2. When a staff member confirms with ✅, the bot publishes all attachments of that message (1 or many)
  3. The bot optimizes images (resize/compress via Pillow) before publishing, with unique filenames
  4. The bot commits images + a `gallery.json` entry to the website repo cross-repo (via PAT/deploy key), triggering a GitHub Pages rebuild so photos go live
  5. A 🗑️ reaction removes the published photos (and their `gallery.json` entries) from the site
  6. The message text is captured as the optional caption on published entries

**Plans**: TBD
**Notes**: **Cross-repo:** this cog lives 100% inside the separate `nocturna-bot` repo (https://github.com/Shangrii/nocturna-bot), following its existing cogs structure (encoding.py, forum.py). No bot code in the website repo, no site code in the bot. It pushes to the website repo via a GitHub PAT/deploy key in the bot's `.env`. Hard dependency on Phase 4's finalized `gallery.json` schema and image storage path. Existing cogs (encoding/forum) are not reworked.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

(Phases 2, 3, and 4 each depend only on Phase 1 and may be planned in parallel; Phase 5 must follow Phase 4.)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Bilingual Shell | 2/4 | In Progress|  |
| 2. Experimental Motion Layer | 0/TBD | Not started | - |
| 3. Service Catalog | 0/TBD | Not started | - |
| 4. Gallery & Data Layer | 0/TBD | Not started | - |
| 5. Photo-Publishing Bot Cog | 0/TBD | Not started | - |
