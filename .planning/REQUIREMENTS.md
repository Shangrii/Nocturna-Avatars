# Requirements: Nocturna Avatars — Website Revamp

**Defined:** 2026-06-28
**Core Value:** A visitor is visually impressed and reaches "Abrir Ticket" on Discord, while staff keep gallery/catalog current without touching code.

## v1 Requirements

### Foundation & Deploy

- [x] **PLAT-01**: Site is built with Astro and produces static output
- [x] **PLAT-02**: Site deploys to GitHub Pages preserving the existing custom domain (CNAME)
- [x] **PLAT-03**: Brand design system (colors, fonts, grain, shared components) is centralized and reused across all pages
- [ ] **PLAT-04**: A visitor on mobile sees a fully responsive layout

### Internationalization

- [x] **I18N-01**: A visitor can switch between Spanish and English from any page
- [x] **I18N-02**: All UI and marketing copy renders from per-language content dictionaries
- [x] **I18N-03**: Spanish is the default language and URLs are language-scoped (`/es`, `/en`)
- [ ] **I18N-04**: Terms & Conditions render in both Spanish and English

### Structure & Conversion

- [ ] **NAV-01**: A visitor sees a landing with hero, featured work, packages summary, gallery teaser, and about/process
- [ ] **NAV-02**: Dedicated pages exist for Servicios, Galería, and Términos
- [ ] **NAV-03**: An "Abrir Ticket" / Discord CTA is reachable from every page
- [ ] **NAV-04**: Navigating between pages uses animated transitions

### Experimental Motion

- [ ] **FX-01**: The site uses smooth scrolling
- [ ] **FX-02**: Sections animate / reveal on scroll
- [ ] **FX-03**: The hero displays a WebGL shader effect (noise/distortion)
- [ ] **FX-04**: The cursor has an interactive effect

### Service Catalog

- [ ] **CAT-01**: The 3 packages (Penumbra/Umbra/Eclipse) render from `services.json` with features and prices
- [ ] **CAT-02**: A modular catalog lists individual services grouped by category (Unity, Blender/mesh, Textures, Accessories, Extras/NSFW)
- [ ] **CAT-03**: Services with undecided prices display "Cotizar"
- [ ] **CAT-04**: Catalog content is fully editable via JSON without touching code

### Gallery

- [ ] **GAL-01**: The gallery page renders all entries from `gallery.json` as a masonry wall
- [ ] **GAL-02**: A visitor can open any photo in a lightbox
- [ ] **GAL-03**: A photo can show an optional caption / alt text
- [ ] **GAL-04**: The landing shows a featured subset of the gallery

### Bot Automation (nocturna-bot repo)

- [ ] **BOT-01**: The cog detects staff photo posts in the configured channel and marks the message with a ✅ approve control
- [ ] **BOT-02**: When a staff member confirms with ✅, the bot publishes all attachments of that message (1 or many)
- [ ] **BOT-03**: The bot optimizes images (resize/compress) before publishing
- [ ] **BOT-04**: The bot commits images + a `gallery.json` entry to the website repo cross-repo
- [ ] **BOT-05**: A 🗑️ reaction removes the published photos from the site
- [ ] **BOT-06**: The message text is captured as the optional caption

## v2 Requirements

### Experimental Extras

- **FX2-01**: Real-time 3D avatar viewer (Three.js)
- **FX2-02**: Ambient music player / audio toggle

### Gallery

- **GAL2-01**: Filter the gallery by category/tag (requires staff tagging)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Backend / database / CMS | Static site keeps hosting free and the bot-commit flow simple |
| On-site checkout / payments | Sales happen via Discord tickets, not on the site |
| Auto-translating gallery captions | Captions come from staff in one language, shown as written |
| Reworking existing bot cogs (encoding/forum) | Only adding a new photo cog |
| Real 3D viewer in v1 | High weight/time; deferred to v2 |

## Traceability

Which phases cover which requirements. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PLAT-01 | Phase 1 | Complete |
| PLAT-02 | Phase 1 | Complete |
| PLAT-03 | Phase 1 | Complete |
| PLAT-04 | Phase 1 | Pending |
| I18N-01 | Phase 1 | Complete |
| I18N-02 | Phase 1 | Complete |
| I18N-03 | Phase 1 | Complete |
| I18N-04 | Phase 1 | Pending |
| NAV-01 | Phase 1 | Pending |
| NAV-02 | Phase 1 | Pending |
| NAV-03 | Phase 1 | Pending |
| NAV-04 | Phase 2 | Pending |
| FX-01 | Phase 2 | Pending |
| FX-02 | Phase 2 | Pending |
| FX-03 | Phase 2 | Pending |
| FX-04 | Phase 2 | Pending |
| CAT-01 | Phase 3 | Pending |
| CAT-02 | Phase 3 | Pending |
| CAT-03 | Phase 3 | Pending |
| CAT-04 | Phase 3 | Pending |
| GAL-01 | Phase 4 | Pending |
| GAL-02 | Phase 4 | Pending |
| GAL-03 | Phase 4 | Pending |
| GAL-04 | Phase 4 | Pending |
| BOT-01 | Phase 5 | Pending |
| BOT-02 | Phase 5 | Pending |
| BOT-03 | Phase 5 | Pending |
| BOT-04 | Phase 5 | Pending |
| BOT-05 | Phase 5 | Pending |
| BOT-06 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 30 total (PLAT 4 + I18N 4 + NAV 4 + FX 4 + CAT 4 + GAL 4 + BOT 6)
- Mapped to phases: 30 ✓
- Unmapped: 0 ✓

> Note: an earlier draft footer counted "27 v1"; the actual enumerated v1 list contains 30 requirements. Count corrected here.

---
*Requirements defined: 2026-06-28*
*Last updated: 2026-06-28 after roadmap creation (traceability + coverage)*
