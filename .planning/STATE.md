---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Phase 4 UI-SPEC approved
last_updated: "2026-07-02T17:55:00.011Z"
last_activity: 2026-07-02 -- Phase 04 planning complete
progress:
  total_phases: 8
  completed_phases: 4
  total_plans: 24
  completed_plans: 20
  percent: 50
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-28)

**Core value:** A visitor is visually impressed and reaches "Abrir Ticket" on Discord, while staff keep gallery/catalog current without touching code.
**Current focus:** Phase 3.1 — Catalog Configurator (6 plans ready; execute next)

## Current Position

Phase: 03.1 (catalog-configurator) — IN PROGRESS
Plan: 5 of 6 — Plans 01, 02, 03, 04 complete
Status: Ready to execute
Last activity: 2026-07-02 -- Phase 04 planning complete

Progress: [██████████] 95%

## Performance Metrics

**Velocity:**

- Total plans completed: 4
- Average duration: — min
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 4 | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01 P01-01 | 16 | 2 tasks | 16 files |
| Phase 01 P01-02 | 21min | 2 tasks | 10 files |
| Phase 01 P01-03 | 78min | 2 tasks | 24 files |
| Phase 01 P04 | 6 | 2 tasks | 7 files |
| Phase 02 P01 | 25min | 4 tasks | 9 files |
| Phase 02 P02 | ~20min | 2 tasks tasks | 7 files files |
| Phase 02.1 P01 | 6min | 3 tasks | 9 files |
| Phase 02.1 P04 | — | 3 tasks | 3 files |
| Phase 03-service-catalog P01 | 5 | 2 tasks | 1 files |
| Phase 03-service-catalog P02 | 10 | 5 tasks | 4 files |
| Phase 03.1-catalog-configurator P01 | 8min | 2 tasks | 2 files |
| Phase 03.1 P05 | 10min | 1 tasks | 1 files |

## Accumulated Context

### Roadmap Evolution

- Phase 02.1 inserted after Phase 2: Visual Redesign — Refined Street Editorial (re-skin on Phase 2 motion base, before catalog/gallery) (URGENT)
- Phase 6 added (2026-07-02): Asset Store — sell Nocturna's own VRChat assets via a REAL shopping cart + hosted checkout, reusing the Phase 3.1 cart engine (the /servicios flow was reframed as a non-purchase "cotización"; the real cart is reserved for this store). Depends on 3.1 + 2.1; independent of Phases 4/5.

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Astro (static) over framework/vanilla — keeps GitHub Pages + bot-commit flow
- [Roadmap]: Motion split into its own phase (Phase 2) — substantial enough (WebGL + Lenis + GSAP + View Transitions + cursor) to verify independently
- [Roadmap]: Bot cog (Phase 5) is cross-repo in `nocturna-bot`; hard-depends on Phase 4's finalized `gallery.json` schema
- [Roadmap]: i18n established in Phase 1 so all later content is bilingual from the start
- [Phase ?]: [01-01] Pinned Astro 7.0.3 (not 5.x) — only npm-audit-clean version; satisfies supply-chain mitigation T-01-SC (0 vulns)
- [Phase ?]: [01-03] English is the primary/default language (defaultLocale en) with per-locale English URL slugs (/en/services, /en/gallery) via central route map (src/i18n/routes.ts) + [lang]/[page].astro resolver; legacy old-EN-slug redirects. Supersedes the earlier ES-default assumption (I18N-03). Spanish browsers still routed to /es/.
- [Phase ?]: Terms ship via the [lang]/[page].astro resolver as a 'terms' concept (no standalone terminos.astro); URLs /es/terminos + /en/terms from routes.ts (01-04)
- [Phase ?]: EN Terms ship as a flagged DRAFT behind a prominent ReviewerBanner; ES is authoritative/verbatim (D-13, 01-04)
- [Phase ?]: Standalone index.html.astro omitted (Astro route collision with root index); legacy /index.html served by the root English-first redirect — D-02 met (01-04)
- [Phase ?]: [02-01] lenis@1.3.25 + gsap@3.15.0 exact pins, npm audit clean (T-02-SC, approved); ClientRouter + lifecycle motion controller (initMotion on astro:page-load / teardownMotion on astro:before-swap) is the scaffold all later Phase 2 slices mount on
- [Phase ?]: [02-01] chrome.ts document-level Escape/outside-click handlers re-query the live DOM at event time (not stale post-swap nodes); scroll-behavior:smooth re-scoped under @media reduced-motion to avoid Lenis double-handling
- [Phase ?]: [02-02] Hero WebGL2 glitch shader (FX-03): static AVIF fallback is the default-visible hero bg, canvas reveals only after first frame; gates on webglOK && !prefersReduced + failIfMajorPerformanceCaveat; ~22ms/1s frame-budget guard + contextlost swap; brand colors via tokens.css uniforms (no GLSL hex); mounted on the 02-01 controller
- [Phase ?]: [02.1-01] Tailwind v4 wired CSS-first via @tailwindcss/vite@4.3.2 (exact pin, T-02.1-SC approved); brand tokens live in src/styles/theme.css @theme block (bg-ink/bg-paper/text-red/font-display), tokens.css retired; var(--..) carried for incremental migration (D-01/D-02/D-03)
- [Phase ?]: [02.1-01] Tailwind v4 @theme inline comments must avoid '*'+'/' glob-like sequences — they break the v4 CSS parser; use plain prose inside @theme
- [Phase ?]: [02.1-01] Custom cursor removed (cursor.ts + cursor.css deleted, unwired from motion/index.ts); rest of motion layer intact (D-10)
- [Phase ?]: [02.1-04] Floating CTA keeps 999px pill radius — distinct persistent conversion anchor from squared editorial chrome
- [Phase ?]: [02.1-04] Nav backdrop at 0.95 opacity ensures off-white text AA over both ink and paper sections
- [Phase ?]: [02.1-04] Phase 02.1 complete — all 6 ROADMAP success criteria verified by human QA (2026-06-30)
- [Phase 03.1]: [03.1-01] services.json catalog[] restructured to 4 categories (unity, blender, textures, extras), 26 items, id+repeatable schema; packages.addons[] typo "Expressions" fixed to "Expresiones"; addons block removed from ServicesPage.astro; enableCart={true} prop wired on CatalogSection
- [Phase 03.1]: [03.1-04] cart.ts stub created in Plan 04 (empty initCart) so build succeeds during Wave 2b; full implementation deferred to Plan 05
- [Phase 03.1]: [03.1-04] data-item-id attribute set on both the li row and individual cart buttons to give cart.ts multiple query targets
- [Phase ?]: [03.1-05] transitionend drawer close filtered by e.propertyName === 'transform' to prevent early [hidden] from opacity firing first
- [Phase ?]: [03.1-05] openCartModal/closeCartModal stubs — full implementation in Plan 03.1-06
- [Phase ?]: [03.1-05] createElement + textContent for drawer list items — T-03.1-05 XSS guard

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

None yet.

### Blockers/Concerns

[Issues that affect future work]

- [Phase 1] Terms EN translation needs human/legal review before publishing (I18N-04).
- [Phase 1] Image storage path (`assets/gallery/` vs `public/gallery/`) must be decided this phase — feeds Phase 4 schema and Phase 5 bot.
- [Phase 3] Modular catalog prices not yet agreed by team → render as "Cotizar" until decided.
- [Phase 5] Requires GitHub PAT/deploy key in the bot's `.env` for cross-repo push.
- [Doc] REQUIREMENTS.md footer originally said "27 v1"; actual v1 count is 30 (PLAT 4 + I18N 4 + NAV 4 + FX 4 + CAT 4 + GAL 4 + BOT 6). Coverage corrected to 30/30.

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Cutover | Go-live: push `revamp` + set Pages Source → GitHub Actions + confirm `nocturna-avatars.site` survives (D-09/PLAT-02 domain-survival, verifiable only post-cutover) — user action, NOT a blocker | Pending user go-live | 2026-06-28 |
| Experimental | Real-time 3D avatar viewer (Three.js) — FX2-01 | Deferred to v2 | 2026-06-28 |
| Experimental | Ambient music player / audio toggle — FX2-02 | Deferred to v2 | 2026-06-28 |
| Gallery | Filter gallery by category/tag — GAL2-01 | Deferred to v2 | 2026-06-28 |

## Session Continuity

Last session: 2026-07-02T12:22:43.257Z
Stopped at: Phase 4 UI-SPEC approved
Resume file: .planning/phases/04-gallery-data-layer/04-UI-SPEC.md
