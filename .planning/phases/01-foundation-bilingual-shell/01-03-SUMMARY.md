---
phase: 01-foundation-bilingual-shell
plan: 03
subsystem: ui
tags: [astro, i18n, routing, localized-slugs, packages, empty-state, a11y, language-switcher]

# Dependency graph
requires:
  - phase: 01-01
    provides: BaseLayout chrome slots, useTranslations helper, brand tokens, i18n routing, root redirect, localized hero
  - phase: 01-02
    provides: global chrome (nav, language switcher, footer, floating CTA, Discord modal), .dc-trigger contract, nocturna-lang localStorage contract
provides:
  - Curated bilingual landing below the preserved hero (About/process, featured + gallery teasers, condensed packages summary, closing nudge)
  - Dedicated page shells — /servicios (es) · /services (en), /galeria (es) · /gallery (en) — and a branded /404
  - Faithful package data (Penumbra $40 / Umbra $60 featured / Eclipse $90 + add-ons) in packages.json (es/en)
  - pages.json dictionary (about/process, story, teaser, empty-state, page meta, 404) in es/en
  - Reusable EmptyState + PackageCard (full/condensed) components
  - Central localized-route map (src/i18n/routes.ts) with concept→{es,en} slug + path helpers
  - [lang]/[page].astro resolver emitting per-locale slugs + legacy /en/servicios→/en/services & /en/galeria→/en/gallery redirects
  - Globe-icon accessible language switcher with concept-aware path translation
  - English-first default locale (supersedes the earlier ES-default assumption)
affects:
  - 01-04 (Terms page — terms slugs /es/terminos · /en/terms already mapped in routes.ts; cutover/responsiveness pass; legacy redirects pattern)
  - 03 (services catalog renders into the /servicios·/services shell; packages.json shape informs services.json)
  - 04 (gallery renders into the /galeria·/gallery shell; replaces the gallery teaser/empty state)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Central localized-route map (routes.ts): concept→{es,en} slug is the single source of truth; nav, switcher, and getStaticPaths all derive URLs from it (never a naive prefix swap)"
    - "Per-locale URL slugs via a [lang]/[page].astro resolver whose getStaticPaths emits each locale's distinct slug; concept recovered from (lang, slug)"
    - "Legacy redirects as static meta-refresh + JS pages (GitHub Pages has no server rewrites)"
    - "Dictionary-driven sections: data-only JSON (packages.json/pages.json) with inline SVG keyed by a stable icon name; copy stays translatable, glyphs stay in markup"
    - "Reusable EmptyState keeps the conversion path (.dc-trigger) reachable on every shell so pages never look broken"
    - "Accessible disclosure switcher: real <button> + role=menu, aria-haspopup/expanded, Escape/outside-click close"

key-files:
  created:
    - src/i18n/packages.json
    - src/i18n/pages.json
    - src/i18n/routes.ts
    - src/styles/sections.css
    - src/components/EmptyState.astro
    - src/components/PackageCard.astro
    - src/components/sections/About.astro
    - src/components/sections/PackagesSummary.astro
    - src/components/sections/Teaser.astro
    - src/components/sections/ServicesPage.astro
    - src/components/sections/GalleryPage.astro
    - src/pages/[lang]/[page].astro
    - src/pages/en/servicios.astro
    - src/pages/en/galeria.astro
    - src/pages/404.astro
  modified:
    - src/i18n/ui.ts
    - src/i18n/home.json
    - src/pages/[lang]/index.astro
    - src/pages/index.astro
    - astro.config.mjs
    - src/components/Nav.astro
    - src/components/LanguageSwitcher.astro
    - src/scripts/chrome.ts
    - src/styles/chrome.css
  removed:
    - src/pages/[lang]/servicios.astro
    - src/pages/[lang]/galeria.astro

key-decisions:
  - "English is the primary/default language (defaultLocale en, defaultLang en); supersedes the earlier ES-default assumption (I18N-03). Spanish browsers still routed to /es/ by navigator.language."
  - "Per-locale English URL slugs: /en/services and /en/gallery (vs Spanish /es/servicios, /es/galeria), driven by a central concept→slug route map"
  - "Legacy /en/servicios→/en/services and /en/galeria→/en/gallery redirects so old links don't break"
  - "Language switcher translates by page concept (route map), not by prefix swap — /en/services → /es/servicios"
  - "Hero wordmark casing NOCTURNA → Nocturna (hero <h1> only; nav/footer brand marks unchanged)"
  - "404 is a single locale-agnostic page (GH Pages serves one dist/404.html): branded ES heading + EN body line, back-home → /en/ (new default)"
  - "Package data ported faithfully from index.html (D-12); no invention/simplification"

patterns-established:
  - "routes.ts is the only place URL slugs live; add a concept there and nav/switcher/routing pick it up"
  - "Shell pages compose a *Page section component inside the [lang]/[page].astro resolver, inheriting chrome from BaseLayout"
  - "Empty states and the 404 always carry the .dc-trigger CTA (conversion reachable everywhere, NAV-03)"

requirements-completed: [NAV-01, NAV-02, I18N-02, PLAT-04]

# Metrics
duration: 78min
completed: 2026-06-28
---

# Phase 1 Plan 03: Landing Composition & Dedicated Shells Summary

**Curated bilingual landing (hero + about/process + teasers + condensed packages summary) and dedicated /servicios·/services, /galeria·/gallery and branded /404 shells — all dictionary-driven, with faithful package data, plus a post-checkpoint pivot to an English-first default and per-locale localized URL slugs governed by a central route map and an accessible globe-icon switcher.**

## Performance

- **Duration:** ~78 min (includes two human-verify rounds: initial content + cross-cutting revisions)
- **Started:** 2026-06-28T16:57:43Z
- **Completed:** 2026-06-28T18:15:44Z
- **Tasks:** 2 implementation + 1 human-verify checkpoint (approved) + 1 post-checkpoint revision round (4 cross-cutting changes, re-verified & approved)
- **Files:** 15 created, 9 modified, 2 removed

## Accomplishments

- Extended the landing **below the preserved hero** into a curated summary (D-10): About/"¿Quiénes somos?" (3 feature cards + 6 workflow steps with tooltips + "Nuestra historia") → featured-work teaser → condensed 3-tier packages summary → gallery teaser → closing conversion nudge.
- Shipped the dedicated **page shells**: real 3-package section (faithful prices/features) + add-ons + catalog coming-soon on Servicios; branded coming-soon on Galería; a branded 404 — all bilingual, all inheriting chrome from BaseLayout.
- Faithful **package data** (D-12) migrated to `packages.json`: Penumbra $40, Umbra $60 (featured / "Más popular"), Eclipse $90, full feature lists, "50% de anticipo requerido", and the 8 add-ons.
- **English-first pivot** (post-checkpoint): `defaultLocale`/`defaultLang` → `en`; root redirect defaults to `/en/` and still sends Spanish browsers to `/es/`.
- **Per-locale localized slugs**: a central `routes.ts` concept→{es,en} map + a `[lang]/[page].astro` resolver emit `/es/servicios` · `/en/services` and `/es/galeria` · `/en/gallery`, with legacy redirects from the old English slugs.
- **Globe-icon accessible language switcher** that translates the current page to its counterpart slug in the other locale (concept-aware), keeping `nocturna-lang` persistence.
- Hero wordmark casing **NOCTURNA → Nocturna**.

## Task Commits

Each task/change was committed atomically on `revamp`:

1. **Task 1: Landing composition — About, teasers, packages summary, EmptyState/PackageCard** — `c36e066` (feat)
2. **Task 2: Dedicated shells — /servicios, /galeria, branded /404** — `70e1478` (feat)
3. **Progress marker (STATE position, pre-checkpoint)** — `36977e2` (docs)
4. **Task 3: human-verify checkpoint** — APPROVED (content), then the user requested cross-cutting revisions.

Post-checkpoint revision round (re-verified & approved):

5. **CHANGE 1 — English-first default locale** — `006e633` (feat)
6. **CHANGE 2 — hero wordmark NOCTURNA → Nocturna** — `1b14f94` (feat)
7. **CHANGE 3 — per-locale URL slugs via central route map** — `f1c37d2` (feat)
8. **CHANGE 4 — language switcher → globe icon + dropdown** — `48c1483` (feat)
9. **Progress marker (STATE, revision round)** — `cb9afad` (docs)

**Plan metadata:** final docs commit (SUMMARY + STATE + ROADMAP + REQUIREMENTS).

## Files Created/Modified

**Created:**
- `src/i18n/packages.json` — faithful tier data (es/en): names, levels, $40/$60/$90, subtitles, feature lists (+highlights), deposit note, add-ons, one-liners for the condensed summary.
- `src/i18n/pages.json` — about/process (tag, title, subtitle, feature cards, workflow steps + tooltips, story), teaser, empty-state, per-page meta + headers, and 404 copy (es/en).
- `src/i18n/routes.ts` — concept→{es,en} slug map (home/services/gallery/terms) + `localizedPath`, `translatePath`, `conceptForSlug`, `staticPathsForConcept`.
- `src/styles/sections.css` — tokenized sections, package cards, add-ons, empty-state, closing, 404 styles.
- `src/components/EmptyState.astro` — coming-soon block (heading + body + optional outline link + `.dc-trigger` CTA).
- `src/components/PackageCard.astro` — full / condensed tier card; featured = highlight border + "Más popular" badge.
- `src/components/sections/About.astro`, `PackagesSummary.astro`, `Teaser.astro` — landing sections.
- `src/components/sections/ServicesPage.astro`, `GalleryPage.astro` — shell bodies for the resolver.
- `src/pages/[lang]/[page].astro` — localized resolver emitting per-locale slugs.
- `src/pages/en/servicios.astro`, `src/pages/en/galeria.astro` — legacy redirects to the new EN slugs.
- `src/pages/404.astro` — branded 404 (emitted as `dist/404.html`).

**Modified:**
- `src/i18n/ui.ts` — registered `packages` + `pages` dictionaries; `defaultLang` es→en.
- `src/i18n/home.json` — hero `brandWordmark` "NOCTURNA" → "Nocturna".
- `src/pages/[lang]/index.astro` — appended sections below the hero; hero secondary CTA uses `localizedPath`.
- `src/pages/index.astro` — root redirect English-first (default/fallback /en/, Spanish browsers → /es/, noscript → /en/).
- `astro.config.mjs` — `defaultLocale` es → en (locales still prefixed).
- `src/components/Nav.astro` — nav links derive localized slugs from the route map.
- `src/components/LanguageSwitcher.astro` — globe-icon button + accessible dropdown; concept-aware translation.
- `src/scripts/chrome.ts` — dropdown open/close (toggle, Escape, outside-click); language persistence retained.
- `src/styles/chrome.css` — tokenized globe-switcher styles + in-flow dropdown in the mobile drawer.

**Removed:** `src/pages/[lang]/servicios.astro`, `src/pages/[lang]/galeria.astro` (replaced by the resolver).

## Dictionary & API shapes (for Phase 3/4 alignment)

- **packages.json** (per lang): `sectionTag/Title/Subtitle`, `advanceNote`, `usd`, `popularBadge`, `ctaTicket`, `summaryCtaAll`, `tiers[] { id, tier, name, subtitle, price, oneLiner, featured, features[] { text, highlight } }`, `addonsTitle`, `addons[] { name, price }`, `addonsNote`. Phase 3's `services.json` should align tier/feature shape here.
- **pages.json** (per lang): `about { tag, title, subtitle, features[], workflowTitle, workflowSteps[] { icon, label, tooltip }, storyTitle, story[] }`, `teaser { featured, gallery }`, `emptyState { heading, galleryBody, serviciosBody, galleryCta, ticketCta }`, `galeria`/`servicios` (meta + headers), `notFound { code, heading, body, bodyEn, homeCta, ticketCta }`.
- **EmptyState** props: `{ heading, body, ticketLabel, linkLabel?, linkHref? }` (no `linkHref` ⇒ `.dc-trigger` only).
- **PackageCard** props: `{ tier, usd, advanceNote, popularBadge, ctaLabel, condensed? }`.
- **routes.ts**: `localizedPath(concept, lang)`, `translatePath(pathname, target)`, `conceptForSlug(lang, slug)`, `staticPathsForConcept(concept)` → `{ params: { lang, page } }`.

## 404 strategy on GitHub Pages

GH Pages serves a single `dist/404.html` for any unknown path regardless of locale, so the 404 is one locale-agnostic page: the branded ES heading ("Esta página se perdió en la noche") with an EN body line, a back-home link to `/en/` (the new default), and a `.dc-trigger` CTA. Astro emits it from `src/pages/404.astro`.

## Decisions Made

- **English is the primary/default language** (`defaultLocale: en`, `defaultLang: en`). This **supersedes** the earlier "Spanish is default" assumption (REQUIREMENTS I18N-03, ROADMAP Phase-1 success-criterion #2). Spanish remains fully supported and Spanish-locale browsers are still routed to `/es/`.
- **Per-locale English URL slugs** (`/en/services`, `/en/gallery`) distinct from Spanish (`/es/servicios`, `/es/galeria`), governed by the central route map; legacy old-EN slugs redirect to the new ones.
- **Concept-aware language switching** (not prefix swap) so the visitor lands on the correct localized counterpart page.
- **Hero wordmark "Nocturna"** (capital N only) — scoped to the hero `<h1>`; nav/footer brand marks unchanged.
- **Faithful package data** (D-12); copy through dictionaries (I18N-02); no `set:html` on dictionary content (T-01-08); external links keep `rel="noopener"`.

## Deviations from Plan

The two implementation tasks executed exactly as written (no auto-fixes needed). The cross-cutting changes below were **user-requested at the human-verify checkpoint** — not autonomous deviations — and were applied as a post-checkpoint revision round, then re-verified and approved:

1. **English-first default locale** — config + ui.ts + root redirect (`006e633`).
2. **Hero wordmark casing** NOCTURNA → Nocturna (`1b14f94`).
3. **Per-locale localized slugs** — `routes.ts` map + `[lang]/[page].astro` resolver + legacy redirects; replaced the two fixed-slug page files (`f1c37d2`).
4. **Globe-icon accessible language switcher** with concept-aware translation (`48c1483`).

**Total deviations:** 0 autonomous; 4 user-requested cross-cutting revisions (all re-verified & approved).
**Impact on plan:** The revisions are a deliberate product decision (English-first + localized slugs) plus UI/brand refinements. They re-shape routing but preserve every plan deliverable; package data and empty-state/conversion behavior are unchanged.

## Issues Encountered

- The resolver's `getStaticPaths` initially returned `params: { lang, slug }` while the route file is `[page].astro` (param key `page`), so the build failed with "Missing parameter: page". Fixed `staticPathsForConcept` to emit `page` as the param key; build then emitted all 10 routes.
- On Windows, `npm run build` prints a libuv `async.c` assertion line at process exit after a successful build — a known Node/Windows teardown warning, not a build failure (all routes emit; exit is clean for our purposes).

## Threat Surface

Plan `<threat_model>` dispositions honored:
- **T-01-08 (XSS via dictionary copy):** all package/about/empty-state/404 copy renders through Astro auto-escaping (`{...}`), no `set:html`. The legacy-redirect pages use `define:vars` to pass a static literal target only.
- **T-01-09 (external links):** in-page external links inherit the chrome's `rel="noopener"`; no new external `target="_blank"` surface added.
- **T-01-10 (broken-UX shells):** every shell (galeria/gallery, catalog) and the 404 render a branded EmptyState/branded page with a reachable `.dc-trigger` CTA.
- **T-01-SC (supply chain):** no new npm packages; pure Astro components + vanilla TS.
- **T-01-05 (lang persistence):** switcher still writes only the `es`/`en` literals to `nocturna-lang`.

No new threat surface beyond the register.

## Known Stubs

The Galería/Gallery page and the Servicios/Services catalog block are intentional **shells** this phase (branded coming-soon EmptyStates with a reachable CTA), per the UI-SPEC and CONTEXT (D-10). They are resolved by later phases:
- Gallery image grid → Phase 4 (`gallery.json`).
- Modular catalog → Phase 3 (`services.json`).
Both render a non-broken, conversion-ready state now, so they do not block the plan goal.

## User Setup Required

None new. **Carried from 01-01/01-02 (still pending the user):** set GitHub Pages → Source to "GitHub Actions", then push `revamp` to trigger deploy and confirm the custom domain stays bound. **Nothing was pushed in this plan** — `git push` + Pages cutover remain the user's action.

## Next Phase Readiness

- **Ready for 01-04 (Terms + cutover):** terms slugs (`/es/terminos`, `/en/terms`) are already in `routes.ts`; the Terms page should add a `terms` branch to the `[lang]/[page].astro` resolver (or its own file) and the nav/switcher will pick it up automatically. The legacy-redirect pattern is established for any further old→new URL aliases during cutover.
- **Ready for Phase 3/4:** the `/servicios`·/services and `/galeria`·/gallery shells are the mount points for the data-driven catalog and gallery; the dictionary/component shapes above let those phases align their JSON.
- **Carried blocker:** gallery image storage path (`assets/gallery/` vs `public/gallery/`) still to be finalized in Phase 4.
- **Traceability note:** the English-default decision supersedes I18N-03's wording and ROADMAP Phase-1 success-criterion #2 ("ES is default") — both updated to reflect English-first.

## Self-Check: PASSED

- All 15 created files verified present on disk; the 2 replaced page files verified removed.
- All 6 feat commits verified in git history (`c36e066`, `70e1478`, `006e633`, `1b14f94`, `f1c37d2`, `48c1483`).
- `npm run build` exits cleanly; `dist/` emits 10 routes incl. `/en/services`, `/es/servicios`, `/en/gallery`, `/es/galeria`, the old→new EN redirects, and `dist/404.html`.

---
*Phase: 01-foundation-bilingual-shell*
*Completed: 2026-06-28*
