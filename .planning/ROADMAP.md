# Roadmap: Nocturna Avatars — Website Revamp

## Milestones

- ✅ **v1.0 Website Revamp** — Phases 1–10.1 (shipped 2026-07-19) — full detail: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

## Phases

<details>
<summary>✅ v1.0 Website Revamp (Phases 1–10.1) — SHIPPED 2026-07-19</summary>

- [x] Phase 1: Foundation & Bilingual Shell (4/4) — 2026-06-28
- [x] Phase 2: Experimental Motion Layer (4/4) — 2026-06-30
- [x] Phase 2.1: Visual Redesign — Refined Street Editorial (4/4) — 2026-06-30
- [x] Phase 3: Service Catalog (3/3) — 2026-07-01
- [x] Phase 3.1: Catalog Configurator (5/5) — 2026-07-08
- [x] Phase 4: Gallery & Data Layer (3/3) — 2026-07-03
- [x] Phase 5: Photo-Publishing Bot Cog (5/5) — 2026-07-04
- [x] Phase 6: Asset Store (3/3) — 2026-07-08
- [x] Phase 7: Reviews Publishing Pipeline (4/4) — 2026-07-09
- [x] Phase 8: Bot Reminders Command (5/5) — 2026-07-10
- [x] Phase 9: Jinxxy Store Auto-Sync (13/13) — 2026-07-12
- [x] Phase 10: Editor Profile Pages (11/11) — 2026-07-15
- [x] Phase 10.1: Editor Pages Redesign — guns.lol/carrd replica (12/12) — 2026-07-16

Full phase goals, success criteria, and plan breakdowns are archived in
[milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md). Requirements archive:
[milestones/v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md).

**Deferred at close** (see STATE.md → Deferred Items): live E2E human sign-off for
Phases 9/10 (the editor admin app was in fact deployed live on cinema 2026-07-19 —
service running, editable-slug feature + auto-deploy landed), the Terms & Conditions
structure decision, and the v2 backlog (Three.js 3D viewer, ambient audio, gallery
category filter).

</details>

### 🚧 Next Milestone — planned in the `nocturna-bot` repo

**Bot admin panel + config consolidation** — a single-guild web admin for the Nocturna
Discord bot, built on the existing FastAPI + Discord-OAuth admin surface (the same one
that powers the editor pages). First sub-goal: consolidate the bot's scattered config
(`.env` / code / JSON) into one source of truth; then the settings dashboard on top.
This is bot-side work — its `.planning/` lives in `nocturna-bot`, not this website repo.
