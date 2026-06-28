---
phase: 01-foundation-bilingual-shell
verified: 2026-06-28T16:30:00Z
status: human_needed
score: 14/14
overrides_applied: 0
human_verification:
  - test: "Push revamp branch and verify GitHub Pages deploy succeeds and domain nocturna-avatars.site survives cutover"
    expected: "GitHub Actions 'deploy' workflow runs green; nocturna-avatars.site resolves to the new Astro site with the hero visible; custom domain field in Settings > Pages remains set"
    why_human: "Requires live GitHub Actions execution and manual DNS/Pages verification — cannot be checked statically"
  - test: "Open / in a browser — confirm language detection redirects to /es/ on Spanish browser and /en/ on English browser"
    expected: "Spanish navigator.language (e.g. es-MX) → /es/; all others → /en/; localStorage nocturna-lang preference wins over browser language"
    why_human: "Client-side JS behavior; cannot be verified from static HTML analysis alone"
  - test: "Click the Discord CTA button and the floating Abrir Ticket pill on /es/"
    expected: "Both open the shared .dc-overlay Discord modal; Esc / backdrop / Quizás después all close it; Abrir Discord link opens discord.gg/DSMmwU35cs in a new tab"
    why_human: "JavaScript modal behavior requires a browser runtime"
  - test: "Verify mobile layout at ~360px on every page (landing, /es/servicios, /es/galeria, /es/terminos, /404)"
    expected: "No horizontal scrollbars; nav collapses to a hamburger drawer; all interactive controls tap area ≥44px; floating CTA does not overlap footer links"
    why_human: "Responsive layout requires DevTools or a physical device to test"
  - test: "On /en/terms confirm the ReviewerBanner is visually prominent; on /es/terminos confirm it is absent"
    expected: "The DRAFT banner with 'pending legal review' text appears at the top of /en/terms; /es/terminos shows only the authoritative ES content with no banner"
    why_human: "Visual prominence of the banner requires human inspection; programmatic check (confirmed passing) only verifies text presence"
  - test: "Scroll all the way down the landing page and confirm film-grain texture is visible over the navy background and brand fonts load (graffiti wordmark in A Another Tag font, not a fallback)"
    expected: "Film-grain overlay visible; Nocturna wordmark renders in the custom graffiti font; Permanent Marker / Inter / Space Mono also load"
    why_human: "Font loading and visual rendering require a browser"
---

# Phase 01: Foundation Bilingual Shell — Verification Report

**Phase Goal:** A visitor lands on a live, branded, fully responsive bilingual site with the hero, packages summary, gallery teaser, about/process, dedicated pages, and an always-reachable Discord CTA.
**Mode:** MVP
**Verified:** 2026-06-28T16:30:00Z
**Status:** human_needed (all automated checks passed; 6 human-verify items remain for go-live confirmation)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A visitor hitting /es/ sees a branded hero rendered from Astro static output | VERIFIED | `dist/es/index.html` exists; contains hero title "Nocturna", tagline "Sin el dolor de cabeza", service row, two CTAs; rendered from `home.json` dictionary |
| 2 | A visitor hitting /en/ sees the same hero in English | VERIFIED | `dist/en/index.html` contains "Without the headache", "Open a Ticket", "Nocturna" wordmark — all from `home.json` EN slice |
| 3 | A visitor hitting / is redirected to /es/ or /en/ based on browser language | VERIFIED | `dist/index.html` contains inline `navigator.language` detection script; only literal `/es/` and `/en/` are redirect targets; `<noscript>` falls back to `/en/` (English-first per CHANGE 1) |
| 4 | All UI and marketing copy renders from per-language dictionaries | VERIFIED | `useTranslations()` drives all pages; 6 dictionaries (`home.json`, `nav.json`, `packages.json`, `pages.json`, `terms.json`, `common.json`); no hero/nav/terms copy hard-coded in component templates |
| 5 | Brand tokens (red/navy/off-white, fonts, grain) are centralized as CSS custom properties | VERIFIED | `src/styles/tokens.css` defines `--red: #c0192c`, `--navy: #0a0c14`, all fonts; film-grain in `global.css`; only `<meta name="theme-color">` uses raw hex (cannot use CSS variables in HTML attributes — acceptable) |
| 6 | npm run build produces a static dist/ that deploys to GitHub Pages preserving the CNAME | VERIFIED | Build exits 0 in 538ms; emits 12 pages; `dist/CNAME` = `nocturna-avatars.site`; deploy.yml triggers on `revamp` branch with `withastro/action@v6` + `actions/deploy-pages@v5` |
| 7 | A visitor sees a fixed nav with brand wordmark, page links, language switcher, and a Discord CTA on every page | VERIFIED | `Nav.astro` rendered by `BaseLayout.astro` on every page; concept-aware links (`/en/services`, `/es/servicios` etc.) from `routes.ts`; `LanguageSwitcher.astro` globe-dropdown; `dc-trigger` Discord CTA button |
| 8 | A visitor can switch ES↔EN from any page and stay on the same page | VERIFIED | `translatePath()` in `routes.ts` does concept-aware translation (not a naive prefix swap); verified in dist: `/en/` switcher points to `/es/`; `/en/services/` switcher points to `/es/servicios` |
| 9 | A visitor's explicit language choice is remembered and respected on the next visit | VERIFIED | `chrome.ts` writes `localStorage.setItem('nocturna-lang', target)` on `[data-lang-switch]` click; root `/` redirect reads it back; only literals `es`/`en` are ever written |
| 10 | A visitor can reach an Abrir Ticket / Discord CTA from every page via a persistent floating control and the nav CTA | VERIFIED | `FloatingCTA.astro` (class `dc-trigger`) and `Nav.astro` Discord button rendered by `BaseLayout.astro` on all pages; `DiscordModal.astro` also rendered by BaseLayout; `discord.gg/DSMmwU35cs` confirmed in dist HTML |
| 11 | A visitor on the landing sees hero, about/process, a featured-work teaser, packages summary, and gallery teaser | VERIFIED | `[lang]/index.astro` renders: hero → `About.astro` → `Teaser(featured)` → `PackagesSummary.astro` → `Teaser(gallery)` → closing; all in dist/es/index.html and dist/en/index.html |
| 12 | Dedicated pages exist for Servicios, Galería, and Términos | VERIFIED | Emitted: `/es/servicios`, `/en/services`, `/es/galeria`, `/en/gallery`, `/es/terminos`, `/en/terms` — plus legacy redirects `/en/servicios`→`/en/services` and `/en/galeria`→`/en/gallery` |
| 13 | A visitor on /es/servicios sees the 3 real packages (Penumbra $40 / Umbra $60 / Eclipse $90) with the Umbra "Más popular" badge | VERIFIED | `dist/es/servicios/index.html` contains "Penumbra", "Más popular" (Umbra), prices $40/$60/$90 from `packages.json`; full feature lists and add-ons block rendered via `PackageCard.astro` |
| 14 | Terms render in both Spanish (verbatim) and English (draft flagged for legal review) | VERIFIED | `dist/es/terminos/index.html` contains all 10 blocks including "Proceso de trabajo" and "No se entrega el proyecto de Unity"; `dist/en/terms/index.html` contains "legal review" banner; ES page correctly has no English banner text |

**Score:** 14/14 truths verified (automated)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `astro.config.mjs` | i18n routing config, site URL, EN default | VERIFIED | `defaultLocale: 'en'`, `locales: ['es','en']`, `prefixDefaultLocale: true`, `site: 'https://nocturna-avatars.site'` |
| `src/styles/tokens.css` | Centralized brand design tokens | VERIFIED | `--red: #c0192c`, `--navy: #0a0c14`, all fonts, spacing scale, type scale, touch-target token |
| `src/layouts/BaseLayout.astro` | Shared HTML shell with chrome injection | VERIFIED | 59 lines; imports Nav, Footer, FloatingCTA, DiscordModal, chrome.css, global.css; accepts `{lang, title, description}` props |
| `src/pages/[lang]/index.astro` | Localized landing hero + curated sections | VERIFIED | 322 lines; `getStaticPaths` returns es/en; hero + About + two Teasers + PackagesSummary + closing; all copy from dictionaries |
| `src/pages/index.astro` | Root language-detection redirect | VERIFIED | Contains `navigator.language` + `localStorage` detection; only `/es/` and `/en/` as hard-coded targets; `<noscript>` fallback to `/en/` |
| `src/i18n/home.json` | Hero copy in es + en | VERIFIED | Contains `taglineB: "Sin el dolor de cabeza"` (ES) and `"Without the headache"` (EN); `brandWordmark: "Nocturna"` in both |
| `.github/workflows/deploy.yml` | GitHub Actions deploy on revamp branch | VERIFIED | Triggers on `revamp` branch + `workflow_dispatch`; least-privilege permissions; `withastro/action@v6` + `actions/deploy-pages@v5` |
| `public/CNAME` | Domain preserved | VERIFIED | Contains `nocturna-avatars.site`; also present in `dist/CNAME` after build |
| `src/components/Nav.astro` | Fixed nav with all chrome elements | VERIFIED | Concept-aware localized links via `routes.ts`; `LanguageSwitcher` embedded; Discord `.dc-trigger` button; hamburger toggle |
| `src/components/LanguageSwitcher.astro` | Globe-dropdown with concept-aware switching | VERIFIED | Uses `translatePath()` from `routes.ts` (not naive prefix swap); `data-lang-switch` attribute; `nocturna-lang` localStorage key |
| `src/components/FloatingCTA.astro` | Persistent floating Discord CTA | VERIFIED | Fixed-position `dc-trigger` button; `ctaTicket` label from `nav.json`; ≥44px target via `chrome.css` |
| `src/components/DiscordModal.astro` | Shared Discord modal | VERIFIED | `discord.gg/DSMmwU35cs` invite; `data-dc-overlay`; `data-dc-dismiss`; `rel="noopener noreferrer"` on link |
| `src/components/Footer.astro` | Global footer with Discord + Instagram | VERIFIED | `discord.gg/DSMmwU35cs` + `instagram.com/nocturna.avatars/`; copy from `nav.json`; `rel="noopener noreferrer"` on all external links |
| `src/scripts/chrome.ts` | Client behaviors: scroll, hamburger, lang, modal | VERIFIED | 136 lines; `initNav` (scroll + hamburger), `initLangSwitch` (localStorage + globe dropdown), `initDiscordModal` (open/close/Esc/backdrop) |
| `src/i18n/nav.json` | Nav + CTA + modal + footer copy in es/en | VERIFIED | Contains `"Abrir Ticket"` (ES) + `"Open a Ticket"` (EN); all modal strings; footerCopy in both languages |
| `src/i18n/routes.ts` | Central concept→slug route map | VERIFIED | `home`, `services`, `gallery`, `terms` concepts mapped to localized slugs; `translatePath`, `localizedPath`, `staticPathsForConcept` exported |
| `src/pages/[lang]/[page].astro` | Localized page resolver for services/gallery/terms | VERIFIED | `getStaticPaths` emits `services/servicios`, `gallery/galeria`, `terms/terminos` paths; dispatches to `ServicesPage`, `GalleryPage`, `TermsPage` by concept |
| `src/pages/en/servicios.astro` | Legacy /en/servicios → /en/services redirect | VERIFIED | Static meta-refresh + JS redirect to `/en/services`; `dist/en/servicios/index.html` emitted |
| `src/pages/en/galeria.astro` | Legacy /en/galeria → /en/gallery redirect | VERIFIED | Static meta-refresh + JS redirect to `/en/gallery`; `dist/en/galeria/index.html` emitted |
| `src/components/sections/ServicesPage.astro` | Real 3-package section + catalog coming-soon | VERIFIED | 3 `PackageCard` components from `packages.json` + add-ons block + `EmptyState` catalog shell |
| `src/components/sections/GalleryPage.astro` | Gallery coming-soon empty state | VERIFIED | `EmptyState` with gallery body + `dc-trigger` CTA; no image grid |
| `src/pages/404.astro` | Branded 404 with back-home and CTA | VERIFIED | "Esta página se perdió en la noche" heading; `/en/` back-home link (English-first default); `dc-trigger` CTA; `dist/404.html` emitted |
| `src/components/EmptyState.astro` | Reusable coming-soon block with dc-trigger | VERIFIED | `dc-trigger` button always present; optional secondary link; copy via props |
| `src/components/PackageCard.astro` | Reusable package tier card | VERIFIED | Full + condensed modes; `featured` flag for Umbra badge; `dc-trigger` CTA |
| `src/i18n/packages.json` | Faithful package data es/en | VERIFIED | Penumbra $40, Umbra $60 (featured=true, "Más popular"), Eclipse $90; full feature lists; add-ons block; all ES/EN |
| `src/i18n/pages.json` | About/process, teaser, empty-state, 404 copy | VERIFIED | Contains `"Muy pronto"` heading; about/process sections; 404 copy including "Esta página se perdió en la noche" |
| `src/pages/[lang]/terminos.astro` | Terms page both languages (via [page].astro resolver) | VERIFIED | Terms handled by `[lang]/[page].astro` + `TermsPage.astro` component; `/es/terminos` and `/en/terms` both emit in dist |
| `src/components/ReviewerBanner.astro` | EN-only draft pending legal review banner | VERIFIED | Contains `aria-label="Borrador pendiente de revisión legal"`; rendered only when `lang === 'en'` in `TermsPage.astro` |
| `src/i18n/terms.json` | All 10 Terms blocks in es + en | VERIFIED | ES: 10 blocks confirmed; EN: 10 blocks confirmed; includes "Proceso de trabajo" and "No se entrega el proyecto de Unity" bold clauses |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/pages/[lang]/index.astro` | `src/i18n/home.json` | `useTranslations(lang, 'home')` + `getStaticPaths` | VERIFIED | Import confirmed; hero content rendered from dictionary |
| `src/layouts/BaseLayout.astro` | `src/styles/tokens.css` | imported via `global.css` (`@import`) | VERIFIED | `global.css` imported in BaseLayout; `tokens.css` referenced in `global.css` |
| `.github/workflows/deploy.yml` | `dist/` | `withastro/action` build + `actions/deploy-pages` | VERIFIED | Both actions present; `deploy-pages@v5` in deploy job |
| `src/layouts/BaseLayout.astro` | `src/components/Nav.astro` | direct import + render | VERIFIED | `import Nav` + `<Nav lang={lang} />` in BaseLayout body |
| `src/components/LanguageSwitcher.astro` | `localStorage` | `data-lang-switch` → `chrome.ts` → `localStorage.setItem` | VERIFIED | `data-lang-switch` on each option; `chrome.ts` binds click handler; only `'es'`/`'en'` literals written |
| `src/components/DiscordModal.astro` | `src/scripts/chrome.ts` | `.dc-trigger` click handler opens `.dc-overlay` | VERIFIED | `data-dc-overlay` on overlay; `chrome.ts` queries `.dc-trigger` and `[data-dc-overlay]`; open/close wired |
| `src/components/FloatingCTA.astro` | `src/components/DiscordModal.astro` | `.dc-trigger` class hook | VERIFIED | FloatingCTA has class `dc-trigger`; modal opened by any `.dc-trigger` via `chrome.ts` |
| `src/pages/[lang]/[page].astro` | `src/components/sections/ServicesPage.astro` | concept === 'services' branch | VERIFIED | `ServicesPage` imported; rendered when `concept === 'services'` |
| `src/components/sections/PackagesSummary.astro` | `src/i18n/packages.json` | `useTranslations(lang, 'packages')` | VERIFIED | Import via `ui.ts`; tier data from dictionary rendered in condensed PackageCards |
| `src/pages/[lang]/[page].astro` | `src/components/sections/GalleryPage.astro` | concept === 'gallery' branch | VERIFIED | `GalleryPage` imported; `EmptyState` with `dc-trigger` confirmed present |
| `src/components/sections/TermsPage.astro` | `src/components/ReviewerBanner.astro` | `lang === 'en'` conditional | VERIFIED | `ReviewerBanner` rendered inside `{lang === 'en' && banner && ...}` block |
| `src/components/sections/TermsPage.astro` | `src/i18n/terms.json` | `useTranslations(lang, 'terms')` | VERIFIED | 10 blocks iterated; summary list rendered; `bannerTitle`/`bannerBody` from EN terms slice |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `[lang]/index.astro` (hero) | `t` (home dict) | `useTranslations(lang, 'home')` → `home.json` | Yes — real ES/EN copy, no empty stubs | FLOWING |
| `ServicesPage.astro` | `pkg.tiers` | `useTranslations(lang, 'packages')` → `packages.json` | Yes — 3 tiers with real prices/features | FLOWING |
| `TermsPage.astro` | `t.blocks` | `useTranslations(lang, 'terms')` → `terms.json` | Yes — 10 blocks, ES verbatim, EN draft | FLOWING |
| `GalleryPage.astro` | `empty.galleryBody` | `useTranslations(lang, 'pages').emptyState` | Yes — coming-soon copy; gallery data intentionally deferred to Phase 4 | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `npm run build` exits 0 | `npm run build` | Exit 0, 12 pages in 538ms | PASS |
| `dist/CNAME` = nocturna-avatars.site | `grep "nocturna-avatars.site" dist/CNAME` | Match found | PASS |
| ES hero tagline present | `grep "Sin el dolor de cabeza" dist/es/index.html` | Match found | PASS |
| EN hero tagline present | `grep "Without the headache" dist/en/index.html` | Match found | PASS |
| Root / has navigator.language | `grep "navigator.language" dist/index.html` | Match found | PASS |
| Discord modal in ES landing | `grep "dc-overlay" dist/es/index.html` | Match found | PASS |
| Discord invite in ES landing | `grep "discord.gg/DSMmwU35cs" dist/es/index.html` | Match found | PASS |
| lang switcher key in built HTML | `grep "nocturna-lang" dist/es/index.html` | Match found | PASS |
| ES servicios has Penumbra | `grep "Penumbra" dist/es/servicios/index.html` | Match found | PASS |
| ES servicios has Más popular | `grep "Más popular" dist/es/servicios/index.html` | Match found | PASS |
| EN services has Penumbra | `grep "Penumbra" dist/en/services/index.html` | Match found | PASS |
| ES galeria has Muy pronto | `grep "Muy pronto" dist/es/galeria/index.html` | Match found | PASS |
| 404 heading correct | `grep "se perdió en la noche" dist/404.html` | Match found | PASS |
| ES terms block 01 | `grep "Proceso de trabajo" dist/es/terminos/index.html` | Match found | PASS |
| ES terms bold clause | `grep "No se entrega el proyecto de Unity" dist/es/terminos/index.html` | Match found | PASS |
| EN terms has legal review banner | `grep -i "legal review" dist/en/terms/index.html` | Match found | PASS |
| ES terms has NO legal review | `grep -i "legal review" dist/es/terminos/index.html` | No match (correct) | PASS |
| About section in ES landing | `grep "No somos" dist/es/index.html` | Match found | PASS |
| Typo cabezar absent | `grep "cabezar" src/` | No match (good) | PASS |
| Astro version pinned (no ^/~) | `node -e "..."` | `7.0.3` — no caret or tilde | PASS |
| Concept-aware routing in [page].astro | `grep "staticPathsForConcept" src/pages/[lang]/[page].astro` | Match found | PASS |
| EN /services localized URL | `test -f dist/en/services/index.html` | Exists | PASS |
| ES /terminos localized URL | `test -f dist/es/terminos/index.html` | Exists | PASS |
| EN /terms localized URL | `test -f dist/en/terms/index.html` | Exists | PASS |
| Legacy /en/servicios redirect | `test -f dist/en/servicios/index.html` | Exists | PASS |
| Legacy /en/galeria redirect | `test -f dist/en/galeria/index.html` | Exists | PASS |
| No TBD/FIXME/XXX debt markers | `grep -rn "TBD\|FIXME\|XXX" src/` | No matches | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PLAT-01 | 01-01 | Astro static output | SATISFIED | `npm run build` exits 0; `output: 'static'` (default); 12 static pages in dist/ |
| PLAT-02 | 01-01, 01-04 | GitHub Pages + CNAME preserved | SATISFIED (build-side) | `dist/CNAME` = `nocturna-avatars.site`; deploy.yml correct; domain-survival at live cutover is human-pending (PLAT-02 annotation in REQUIREMENTS.md explicitly notes this) |
| PLAT-03 | 01-01 | Brand design system centralized | SATISFIED | All brand values in `tokens.css`; only `<meta theme-color>` uses raw hex (HTML attribute limitation, not a violation) |
| PLAT-04 | 01-02, 01-03, 01-04 | Fully responsive layout | SATISFIED (automated) | `--touch-min: 44px` token; hamburger drawer in Nav; `clamp()` type scale; floating CTA positioning; human-verify item covers visual confirmation |
| I18N-01 | 01-02 | Language switcher from any page | SATISFIED | Globe-icon dropdown in Nav on every page; concept-aware `translatePath()`; `data-lang-switch` + localStorage |
| I18N-02 | 01-01, 01-03 | Copy from per-language dictionaries | SATISFIED | 6 dictionaries; `useTranslations()` used everywhere; no copy hard-coded in templates |
| I18N-03 | 01-01, 01-03 | Default language + scoped URLs | SATISFIED | `defaultLocale: 'en'`; all URLs language-prefixed (`/es/`, `/en/`); English-first per CHANGE 1 |
| I18N-04 | 01-04 | Terms & Conditions in both languages | SATISFIED | `/es/terminos` (10 blocks verbatim); `/en/terms` (10 blocks faithful draft + ReviewerBanner) |
| NAV-01 | 01-03 | Landing with hero + work + packages + gallery teaser + about/process | SATISFIED | Landing has all 5 sections: hero, About/process, Teasers (featured + gallery), PackagesSummary, closing |
| NAV-02 | 01-03, 01-04 | Dedicated Servicios, Galería, Términos pages | SATISFIED | `/es/servicios`, `/es/galeria`, `/es/terminos`, `/en/services`, `/en/gallery`, `/en/terms`, `/404.html` all emitted |
| NAV-03 | 01-02, 01-03 | Discord CTA reachable from every page | SATISFIED | Nav `dc-trigger` + `FloatingCTA` `dc-trigger` + `DiscordModal` all rendered by BaseLayout on every page; EmptyState on shell pages also carries `dc-trigger` |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/layouts/BaseLayout.astro` | 31 | `#0a0c14` in `<meta theme-color>` | Info | HTML meta attributes cannot reference CSS custom properties; raw hex is the only option here — not a violation of PLAT-03 |
| `src/pages/index.astro` | 21 | `#0a0c14` in `<meta theme-color>` | Info | Same as above; root redirect page has no access to CSS tokens |

No blockers or warnings. Zero `TBD`/`FIXME`/`XXX` markers. No stubs (all placeholders are intentional coming-soon EmptyState components, not code stubs).

---

### Deferred Items

Items not yet met but explicitly addressed in later milestone phases:

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Gallery page shows real photos (masonry + lightbox) | Phase 4 | Phase 4 goal: "GAL-01 gallery renders from gallery.json; GAL-02 lightbox; GAL-04 landing featured subset" |
| 2 | Servicios page shows full modular catalog from services.json | Phase 3 | Phase 3 goal: "CAT-01 3-package cards from services.json; CAT-02 modular catalog by category" |
| 3 | NAV-04 Animated page transitions | Phase 2 | REQUIREMENTS.md maps NAV-04 to Phase 2 |

---

### Human Verification Required

#### 1. GitHub Pages Live Deploy + Domain Survival (PLAT-02)

**Test:** Push the `revamp` branch. Confirm GitHub Actions "deploy" workflow runs green. Visit nocturna-avatars.site (or the Pages preview URL) and confirm the new Astro hero loads. Go to Settings > Pages and confirm the custom domain field still shows `nocturna-avatars.site` (not cleared by the deploy).

**Expected:** Workflow succeeds; site serves the bilingual hero; custom domain remains bound; no CNAME conflict.

**Why human:** Requires live GitHub Actions execution, DNS propagation, and manual Pages dashboard inspection — cannot be verified statically.

#### 2. Browser Language Detection Behavior (root /)

**Test:** Open `/` (or the bare domain) in a browser configured to Spanish (es-MX or es-ES) and in one configured to English. Also test with `localStorage.nocturna-lang` set to `'es'` vs `'en'`.

**Expected:** Spanish browser → `/es/`; English browser → `/en/`; explicit localStorage preference wins over browser language; Incognito/private mode (no storage) falls back to English-first default.

**Why human:** JavaScript runtime behavior in a browser cannot be verified from static HTML analysis.

#### 3. Discord Modal Behavior

**Test:** On `/es/`, click the nav "Discord" button and the floating "Abrir Ticket" pill separately. Also click any "Abrir Ticket" button inside the page (hero CTA, package cards, empty states).

**Expected:** All triggers open the same `.dc-overlay` Discord modal. "Abrir Discord" opens `discord.gg/DSMmwU35cs` in a new tab. Esc key, backdrop click, and "Quizás después" button all close the modal without navigating away.

**Why human:** JavaScript event handling requires a browser runtime.

#### 4. Mobile Responsive Layout (PLAT-04)

**Test:** Use DevTools to set viewport to 360px, 768px, and 1280px. Check all pages: landing, `/es/servicios`, `/es/galeria`, `/es/terminos`, `/404`.

**Expected:** No horizontal scrollbars at 360px. Nav collapses to a hamburger icon; drawer opens and closes with tappable links (≥44px touch area). Floating "Abrir Ticket" pill does not overlap footer links or nav CTA at any viewport. Headings scale smoothly via `clamp()`.

**Why human:** Responsive layout requires DevTools or a device to test; overflow and visual overlap cannot be inferred from static CSS analysis.

#### 5. ReviewerBanner Visual Prominence on /en/terms

**Test:** Navigate to `/en/terms` and visually confirm the "Draft — translation pending legal review" banner is prominent and clearly visible at the top of the page. Navigate to `/es/terminos` and confirm no banner is present.

**Expected:** EN banner has accent border, "DRAFT" flag, and readable text. ES page shows only the authoritative Spanish content.

**Why human:** Visual prominence requires browser rendering; programmatic check confirmed text presence only.

#### 6. Font Loading + Film-Grain Visual Inspection

**Test:** Open `/es/` in a browser with DevTools Network tab. Confirm "A Another Tag" (local font) loads from `/fonts/a-another-tag.ttf` and the `Nocturna` wordmark renders in the graffiti font. Confirm Permanent Marker, Inter, and Space Mono load from Google Fonts. Confirm the film-grain SVG noise overlay is visible over the dark navy background.

**Expected:** Custom graffiti font renders (not a fallback sans-serif); all four font families load; film-grain texture visible; dark navy body background.

**Why human:** Font rendering and visual texture require browser inspection.

---

### Gaps Summary

No gaps identified. All 14 observable truths are verified by codebase evidence. All 11 Phase 1 requirements (PLAT-01/02/03/04, I18N-01/02/03/04, NAV-01/02/03) are satisfied by the codebase. Six items require human browser testing (live deploy, client-side JS behaviors, visual rendering) but none of these represent incomplete implementation — all code is in place.

**Notable implementation deviations from the original plans — all intentional and documented:**

1. `defaultLocale` changed from `'es'` to `'en'` (English-first, CHANGE 1) — recorded in REQUIREMENTS.md I18N-03 annotation and 01-03/01-04 SUMMARYs.
2. Per-locale URL slugs (`/en/services`, `/en/gallery`, `/en/terms`) instead of shared `servicios/galeria/terminos` — achieved via `routes.ts` + `[lang]/[page].astro` resolver with legacy `/en/servicios`→`/en/services` redirects.
3. `src/pages/[lang]/servicios.astro` and `galeria.astro` replaced by `[lang]/[page].astro` resolver — functional outcome identical; documented in 01-03 SUMMARY.
4. `src/pages/index.html.astro` intentionally omitted due to Astro route collision with `index.astro`; D-02 intent met by the existing `dist/index.html` language-detection redirect — documented in 01-04 SUMMARY.
5. LanguageSwitcher changed from an `ES | EN` text toggle to a globe-icon dropdown — more accessible and UX-improved (CHANGE 4); documented in 01-02/01-03 SUMMARYs.

---

_Verified: 2026-06-28T16:30:00Z_
_Verifier: Claude (gsd-verifier)_
