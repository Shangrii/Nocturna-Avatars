---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Phase 2 UI-SPEC approved
last_updated: "2026-06-29T05:50:33.922Z"
last_activity: 2026-06-29 -- Phase 02 planning complete
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 8
  completed_plans: 4
  percent: 20
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-28)

**Core value:** A visitor is visually impressed and reaches "Abrir Ticket" on Discord, while staff keep gallery/catalog current without touching code.
**Current focus:** Phase 2 — experimental motion layer

## Current Position

Phase: 2
Plan: Not started
Status: Ready to execute
Last activity: 2026-06-29 -- Phase 02 planning complete

Progress: [██████████] 100%

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

## Accumulated Context

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

Last session: 2026-06-28T23:15:52.089Z
Stopped at: Phase 2 UI-SPEC approved
Resume file: .planning/phases/02-experimental-motion-layer/02-UI-SPEC.md
