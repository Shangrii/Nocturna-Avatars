# Nocturna Avatars — Website Revamp

## What This Is

A revamp of the public website for **Nocturna Avatars**, a team that does professional VRChat avatar editing (outfits, accessories, dances, textures, 3D/Blender work). The new site is a highly aesthetic, "máximo experimental" street/graffiti portfolio that showcases work, sells service packages, and drives visitors to open a Discord ticket — and it **auto-updates its gallery** from photos staff post in Discord, with no code changes needed.

## Core Value

A visitor lands, is visually impressed by the work, and reaches "Abrir Ticket" on Discord — while staff keep the gallery and catalog current without touching code.

## Requirements

### Validated

<!-- Inferred from the existing static site (brownfield), already live and relied upon. -->

- ✓ Single-page site with Hero, About/process, Services (3 packages), Gallery, Terms, Footer — existing
- ✓ Discord conversion modal + persistent CTA to open a ticket — existing
- ✓ Brand identity: red/navy/off-white palette, graffiti font, film-grain overlay — existing
- ✓ Full Terms & Conditions content (10 blocks) — existing
- ✓ Responsive nav + gallery "show more" toggle — existing
- ✓ **Photo-publishing bot cog** (`nocturna-bot` repo): ✅ approve-to-publish, 🌙 remove (supersedes 🗑️ per D-06), delete auto-unpublish, Pillow WebP optimization, atomic cross-repo commits, startup backfill — LIVE, all six BOT criteria verified on the production domain. Validated in Phase 5: photo-publishing-bot-cog (2026-07-04)
- ✓ **Production beta cutover** (2026-07-04, user decision): the revamp now serves nocturna-avatars.site via a self-healing gh-pages deploy pipeline; old site archived on `main` (rollback = flip Pages source)

### Active

<!-- This revamp's scope. Hypotheses until shipped and validated. -->

- [ ] Rebuild the site on **Astro** (static output, stays on GitHub Pages, keeps CNAME/domain)
- [ ] **Bilingual ES + EN** via Astro i18n (language switcher; content dictionaries; ES default for now)
- [ ] **Experimental motion layer**: Lenis smooth scroll, GSAP/ScrollTrigger, Astro View Transitions, one WebGL hero shader, cursor effects
- [ ] **Hybrid structure**: landing + dedicated pages (`/servicios`, `/galeria`, `/terminos`)
- [ ] Persistent, stylized **"Abrir Ticket" / Discord CTA** on every page
- [ ] **Data-driven service catalog** (`services.json`): 3 packages (Penumbra/Umbra/Eclipse) + modular catalog by category (Unity, Blender/mesh, Textures, Accessories, Extras/NSFW); undecided prices show "Cotizar"
- [ ] **Data-driven gallery** (`gallery.json`): masonry wall + lightbox, optional caption; featured subset on landing
- [ ] Formalize the design system into reusable Astro components/tokens; bump the "A Another Tag" type scale (it renders small) and reserve it for display/accents

### Out of Scope

- Real 3D (Three.js) viewer — high weight/time; deferred to a possible later phase
- A backend/database or CMS — keeping the site fully static keeps hosting free and the bot-commit flow simple
- Auto-translating gallery captions — captions come from staff in one language, shown as written
- Re-architecting the bot's existing cogs (encoding/forum) — only adding a new photo cog
- E-commerce/checkout — sales happen via Discord tickets, not on-site

## Context

- **Current site:** static HTML/CSS/JS (`index.html`, `styles.css`, `functions.js`) on GitHub Pages with a custom domain (`CNAME`). Spanish only. Tokens already defined in `:root`.
- **Design inspiration:** akryst.moe, nichind.dev, schuh.wtf (experiential animated portfolio sites).
- **Bot:** `nocturna-bot` (https://github.com/Shangrii/nocturna-bot) — Python discord.py 2.7, self-hosted 24/7, cogs structure (encoding.py, forum.py). It can run a new background cog and push to GitHub.
- **Discord photos channel ID:** `1416329356426481717` (public channel; staff post avatar photos; up to 10 attachments per message).
- **Approved design spec:** `docs/superpowers/specs/2026-06-28-nocturna-revamp-design.md`.
- **Audience shift:** as of 2026-06-28, a planned transition from a Latino to a US/American audience makes English strategically important (may become primary later).
- **Open content item:** modular catalog prices are not yet agreed by the team → render as "Cotizar" until decided.

## Constraints

- **Tech stack**: Astro (static output) — must stay deployable to GitHub Pages and preserve the CNAME/domain.
- **Hosting/Cost**: free static hosting; no backend/DB. The bot publishes by committing to the repo.
- **Repo separation**: the photo cog must live in the `nocturna-bot` repo, not the website repo — pushes cross-repo via a GitHub PAT/deploy key.
- **i18n**: ES + EN required from launch; Terms EN translation needs human/legal review.
- **Brand**: keep red `#c0192c` / navy `#0a0c14` / off-white `#f0eae4`, graffiti font "A Another Tag" + Permanent Marker + Inter + Space Mono, film-grain texture.
- **Performance**: experimental but must load fast and not bury the conversion path.
- **Workflow**: driven via the installed skill suite (GSD, superpowers, claude-mem, context-mode) per user request.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Astro (static) over framework/vanilla | Keeps GitHub Pages + bot-commit flow, but adds components & motion | — Pending |
| Bot commits to repo (vs external CDN) | Bot already self-hosts; free, versioned, no extra service | — Pending |
| ✅ approve-to-publish + 🗑️ remove | Public site needs a safety gate; one ✅ approves a whole message (1+ photos) | — Pending |
| Keep 3 packages + add modular catalog | Tiers are a strong brand hook; modular reflects variable real work | — Pending |
| 2D-rich + punctual WebGL (no 3D yet) | Max "wow" without the weight/time of Three.js | — Pending |
| Bilingual ES/EN from launch | Planned shift to US audience | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-04 after Phase 5 completion (bot cog live + production beta cutover)*
