---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Phase 8 context gathered
last_updated: "2026-07-10T04:50:17.014Z"
last_activity: 2026-07-10
progress:
  total_phases: 12
  completed_phases: 9
  total_plans: 40
  completed_plans: 38
  percent: 75
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-28)

**Core value:** A visitor is visually impressed and reaches "Abrir Ticket" on Discord, while staff keep gallery/catalog current without touching code.
**Current focus:** Phase 8 — bot-reminders-command

## Current Position

Phase: 8 (bot-reminders-command) — EXECUTING
Plan: 3 of 4
Status: Ready to execute
Last activity: 2026-07-10

Progress: [██████████] 95%

## Performance Metrics

**Velocity:**

- Total plans completed: 12
- Average duration: — min
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 4 | - | - |
| 05 | 5 | - | - |
| 06 | 3 | - | - |

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
| Phase 04 P01 | 12min | 2 tasks | 7 files |
| Phase 04 P03 | 8min | 3 tasks | 5 files |
| Phase 05 P01 | 10min | 2 tasks tasks | 6 files files |
| Phase 05 P02 | 7min | 2 tasks | 2 files |
| Phase 05 P03 | 10min | 3 tasks | 4 files |
| Phase 05 P04 | 13min | 3 tasks | 3 files |
| Phase 07 P01 | 14min | 2 tasks | 4 files |
| Phase 07 P02 | 12min | 2 tasks tasks | 5 files files |
| Phase 07 P03 | ~18min | 2 tasks | 3 files |
| Phase 08 P01 | 12min | 2 tasks tasks | 4 files files |
| Phase 08 P02 | 5min | 1 tasks | 2 files |

## Accumulated Context

### Roadmap Evolution

- Phase 02.1 inserted after Phase 2: Visual Redesign — Refined Street Editorial (re-skin on Phase 2 motion base, before catalog/gallery) (URGENT)
- Phase 6 added (2026-07-02): Asset Store — sell Nocturna's own VRChat assets via a REAL shopping cart + hosted checkout, reusing the Phase 3.1 cart engine (the /servicios flow was reframed as a non-purchase "cotización"; the real cart is reserved for this store). Depends on 3.1 + 2.1; independent of Phases 4/5.
- Phase 7 added (2026-07-08): Reviews Publishing Pipeline — Discord reviews channel → reviews.json → website testimonials, mirroring the Phase 5 gallery cog (from 2026-07-03 todo)
- Phase 8 added (2026-07-08): Bot Reminders Command — weekly/monthly scheduled reminders with custom message, cog in nocturna-bot (from 2026-07-07 todo)
- Phase 9 added (2026-07-08): Jinxxy Store Auto-Sync — new Jinxxy uploads appear in the asset store automatically (from 2026-07-07 todo)
- Phase 10 added (2026-07-08): Editor Profile Pages — carrd-style template editor for Nocturna editors, bot-driven (from 2026-07-07 todo)

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
- [Phase 04]: [04-02] DESIGN PIVOT (user, 5 feedback rounds): /galeria is a "night evidence board" pin-wall — supersedes the 04-UI-SPEC masonry contract. Masonry.js uninstalled; custom seeded scatter engine in gallery.ts (varied sizes, continuous random positions, deterministic, 0 overlaps)
- [Phase 04]: [04-02] Lightbox mount contract for 04-03: render [data-lightbox-overlay] + data-gallery-tile hooks anywhere; gallery.ts derives entries from live DOM per page-load
- [Phase 04]: [04-02] Sky lives on a dedicated compositor-layer child (.gallery-sky, translateZ(0)) — Chromium raster cache dropped section-background paint on hard reload
- [Phase 04]: [04-02] Sample gallery content (29 user photos) committed in isolated chore commit d49fdec — user deletes + resets gallery.json to [] at production cutover (supersedes 04-01 ship-empty until then)
- [Phase ?]: [04-01] gallery.json schema { file, caption?, width, height, date } locked as an empty top-level array [] — the exact Phase 5 bot write-target; images live in public/gallery/<file> served as-is by GitHub Pages (D-01/D-06/D-07)
- [Phase ?]: [04-01] masonry-layout@4.2.2 + imagesloaded@5.0.0 exact-pinned (+ @types), npm audit clean (T-04-SC); GalleryPage renders data-gallery-wall/data-gallery-tile CLS-free aspect boxes, caption-or-fallback alt, eager-first-row/lazy-rest, EmptyState fallback when empty (D-04/D-09/D-12)
- [Phase ?]: [04-03] Landing featured subset (GAL-04): newest-6 auto-curated pin-wall polaroid grid (sort by date + slice 0..6, no featured flag) replaces the featured Teaser; opens the Plan 02 lightbox in place via a shared LightboxOverlay.astro rendered on both pages
- [Phase ?]: [04-03] gallery.ts unchanged — Plan 02 already wires the lightbox on all [data-gallery-tile] document-wide and no-ops scatter/sky/torch without a [data-gallery-wall]; landing reuses the pin-wall polaroid language as a static square grid (no scatter engine) for conversion-path performance
- [Phase 05]: [05-01] optimize_to_webp: downscale-only 1920px WebP (q82, method=6); EXIF/GPS stripped by omitting exif= on save — verified Pillow 12.3 does NOT auto-carry im.info['exif'] (T-05-02). Pure module (io+PIL only); cog owns to_thread.
- [Phase 05]: [05-01] Phase-5 bot config defaults locked: WEBSITE_REPO=Shangrii/Nocturna-Avatars, WEBSITE_BRANCH=revamp (D-15 — branch flips at cutover with zero code changes); GALLERY_STAFF_ROLE_IDS is a comma-split list[int].
- [Phase 05]: [05-02] core/github_publish.py — atomic cross-repo transport via GitHub Git Data API (blobs->tree->commit->ref): publish commits image blobs (by sha) + gallery.json (by content) in ONE commit (D-16); removal is stateless, deriving files from the exact split('-')[1] {msgID} filename segment and deleting them with sha:null tree entries (D-14). gallery.json kept in Phase-4 shape (caption-key omission, ensure_ascii=False, 2-space indent).
- [Phase 05]: [05-02] Publish resilience: module-level asyncio.Lock serializes read-modify-commit; ref-PATCH 409/422 retried 4x with exponential backoff (0.5/1.0/2.0s), then raises typed GitHubPublishError (the cog catches it for the D-19 persistent-error UX, D-18). PAT lives only in the Authorization header, never logged (T-05-04); async API dispatches blocking requests via asyncio.to_thread; module imports only stdlib+requests+config (no discord).
- [Phase 05]: [05-03] cogs/gallery.py GalleryCog wires the two cores to Discord: on_message adds ✅ only to staff image posts in PHOTO_CHANNEL (BOT-01/D-03); on_raw_reaction_add is role-gated (payload.member.roles ∩ GALLERY_STAFF_ROLE_IDS, skip bots, self-approval OK) and idempotent via the bot's own 🟢 marker (r.me, D-05). Pure helpers (_image_attachments/_is_staff/_build_filename/_caption) extracted as module-level fns → unit-tested with SimpleNamespace + asyncio.run (14 tests, no pytest-asyncio).
- [Phase 05]: [05-03] Entry date emitted as ISO 8601 .000Z shape (created_at.astimezone(utc).isoformat(timespec='milliseconds').replace('+00:00','Z') → 2026-07-03T14:05:09.000Z) to byte-match Phase-4 shipped gallery.json. Filenames are D-14 numerics-only {YYYYMMDD}-{msgID}-{index}.webp (UTC day). Success reply (Spanish, delete_after=60): "📸 Publiqué N foto(s) en la galería — la web tarda un par de minutos en actualizarse."
- [Phase 05]: [05-03] bot.py fail-fast: sys.exit(1) on missing GITHUB_PAT/WEBSITE_REPO/GALLERY_STAFF_ROLE_IDS (T-05-SC) — the live bot won't start until 05-05 captures these in .env. gallery_state 1-row cursor table scaffolded in core/db.py (backfill read/write lands in 05-04).
- [Phase 05]: [05-04] Removal completes the cog (BOT-05): a staff 🌙 on a published message calls github_publish.remove_message + clears 🟢 + posts a mirrored delete_after=60 reply (returns it to pending so a later ✅ republishes, D-09); a 🌙 on a pending message dismisses it (clears the ✅ prompt, commits nothing, D-07). on_raw_message_delete auto-unpublishes any delete in PHOTO_CHANNEL_ID (D-10, accepted risk T-05-11 — an accidental delete removes live photos; channel is source of truth). 🌙 uses the SAME staff gate as ✅ (D-08).
- [Phase 05]: [05-04] Published-state stays DB-free (D-14): _is_published derives it from the bot's 🟢 marker OR (during reconcile) an exact split('-')[1] {msgID} match against a live gallery.json entry — never a substring, so a prefix-sharing snowflake can't collide. The entry-match guards against a duplicate publish if the bot crashed after committing but before adding 🟢.
- [Phase 05]: [05-04] D-19 persistent-error UX: _publish/_unpublish catch github_publish.GitHubPublishError (retries already exhausted, D-18) and leave a NON-auto-deleting Spanish reply + a ⚠️ retry-to-do reaction; the 🟢 marker is never added on failure (unpublish failure keeps 🟢 — photos still live); _clear_warning drops a stale ⚠️ on a later success. PAT never logged (T-05-04).
- [Phase 05]: [05-04] D-20 backfill: core/db.get_cursor/set_cursor on the 1-row gallery_state; on_ready (run-once guard) scans channel.history(after=cursor, oldest_first=True), advancing the cursor per message (T-05-17 — never re-scans the whole channel). _reconcile dispatch: staff 🌙 → unpublish; staff ✅ on an unpublished msg → publish; missing ✅ prompt → add it; already-published → left alone. _reaction_by_staff role-gates history reactors via reaction.users() + guild.get_member so a non-staff ✅/🌙 during downtime can't trigger anything (D-08). Bot suite: 54 passed (was 36).
- [Phase 05]: [05-05] Task 1 decision gate resolved (user, 2026-07-03): PAT type = fine-grained-single-repo — fine-grained PAT scoped ONLY to Shangrii/Nocturna-Avatars, Repository permissions Contents: Read and write, with expiry + rotation reminder (T-05-13 least privilege). GALLERY_STAFF_ROLE_IDS reuses the existing moderator role 1418724526308593834 (D-01/D-08 staff gate confirmed, T-05-14).
- [Phase 05]: [05-05] Cog deployed LIVE and publishing: two real staff ✅ publishes landed on origin/revamp as atomic commits — 7378d53 (msg 1522759542839181474) + 3c9a91e (msg 1522761603005550683), each = image .webp + gallery.json entry in ONE commit, exact contract shape. Live evidence for BOT-01/BOT-02/BOT-06.
- [Phase 05]: [05-05] PRODUCTION INCIDENT (resolved, user-approved): the first bot push to origin/revamp fired .github/workflows/deploy.yml (on:push branches:[revamp]), deploying the STALE origin/revamp build to the single Pages environment and replacing the live main site (nocturna-avatars.site) at 00:23. Root cause: a repo has only ONE Pages environment — the workflow's "production stays untouched until cutover" assumption was wrong. Resolution (all verified): (1) production restored via POST /pages/builds legacy rebuild from main at 00:45, old site confirmed serving by content markers; (2) deploy.yml switched to workflow_dispatch-ONLY until cutover (local 7c88b74, pushed to origin/revamp as 333b17e via contents API); (3) local revamp (115 unpushed commits, phases 2.1→5) merged with origin/revamp — gallery.json add/add conflict resolved as UNION (29 samples + 2 bot photos = 31 entries); (4) branches exactly in sync (0/0) at tip e4b6b8e; (5) npm run build green, both bot photos render in dist/es/galeria + dist/gallery/*.webp.
- [Phase 05]: [05-05] ADAPTED ACCEPTANCE MODEL (plan deviation, user-approved): "photo appears on the live gallery" is NOT verifiable on the production domain until cutover — deploy.yml is workflow_dispatch-only by design now. Accepted evidence per publish/removal: (1) an atomic commit on origin/revamp in the exact contract shape, and (2) a local `npm run build` that renders (or no longer renders) the photo in dist. Same model applies to 🌙/delete removals. [SUPERSEDED same-day by the beta cutover — live-domain evidence is back as the standard; see below.]
- [Phase 05]: [05-05] Deviation fixes (TDD, nocturna-bot a7c0078..8345beb, pushed to origin/main): Fix A — backfill inverse reconcile (_entry_message_id strict D-14 filename parse + _reconcile_orphans: one fetch_message probe per entry-derived id after the history scan; NotFound → remove_message; ANY other error = unknown, entry untouched — a transient outage can never mass-remove the gallery; sample/manual entries never probed) heals orphaned entries whose message was deleted while the bot was down or whose delete event failed. Fix B — visible 🌙 unpublish control: bot adds its own 🌙 next to 🟢 on publish and clears it on unpublish/dismiss via tolerant _remove_own_reaction (legacy messages OK); staff gate unchanged (bot reactions gated out everywhere). Plus defensive logging + containment in on_raw_message_delete (clear journalctl signal for the delete re-test). Bot suite: 65 passed (was 54).
- [Phase 05]: [05-05] PRODUCTION CUTOVER (user decision, 2026-07-04 — shipped as BETA, live during this plan): revamp is production NOW. Gallery reset to bot-published content ONLY (29 sample entries + the 1522761603005550683 orphan entry removed in a cleanup commit on revamp); no BETA badge.
- [Phase 05]: [05-05] Deploy topology REPLACED (2nd deploy incident): actions/deploy-pages@v5 failed 3/4 deployments with an opaque backend "Deployment failed, try again later" (GitHub status green, domain/cert clean, environment branch policy allowed revamp). New topology: deploy.yml builds Astro → force-pushes dist/ to the `gh-pages` branch → Pages serves gh-pages via the legacy pipeline. Pages config now: build_type=legacy, source=gh-pages, cname nocturna-avatars.site, HTTPS enforced. Also fixed package-lock desync (@emnapi bundled optionals of @tailwindcss/oxide-wasm32-wasi): npm ci → npm install in CI. Website commits a129a0a / 9a71978 / 22db985 / 7d4923b (pushed). Rollback path: old site archived intact on main — flip Pages source back to main.
- [Phase 05]: [05-05] LIVE VERIFICATION on the production domain: nocturna-avatars.site serves the revamp; /es/galeria returns 200 WITH bot photo 20260704-1522919244088741989-1.webp rendered — the full BOT-02 chain (Discord ✅ → atomic commit → auto build+deploy → live production site) verified end-to-end. Exceeds the original plan, which deferred live-domain verification to a later cutover.
- [Phase 07]: [07-01] Reviews testimonials section (Reviews.astro) renders reviews.json at build time as figure/blockquote/figcaption cards; placed as .section--surface (paper) after the gallery Teaser, renders NOTHING when empty (deliberate divergence from the EmptyState pattern — an empty social-proof block weakens the conversion path). Review body via Astro auto-escaping ONLY (no set:html, T-07-01 XSS mitigation verified via escaped &lt;b&gt; build proof); author:null → localized Anonymous (T-07-02). reviews.json ships committed as [] (the 07-02 bot write-target) so builds never break. reviews i18n key added under es/en (no ui.ts change). Slice newest-9, localized month+year date via Intl.DateTimeFormat.
- [Phase 07-02]: Reviews transport reuses the gallery Git Data API machinery via a parallel thin path (lowest regression risk): extracted generic _fetch_json(repo,branch,path) + _commit_with_retry gained an optional fetch= callable defaulting to gallery — gallery byte-for-byte unchanged, full test_github_publish.py suite still green (103 bot tests pass).
- [Phase 07-02]: reviews.json keyed+deduped by Discord message id (entry['id']) — no filename parsing (reviews have no images); author:null preserved verbatim by the transport (anonymity enforced upstream in the cog); separate reviews_state cursor table in core/db.py, independent of gallery_state.
- [Phase 07-03]: cogs/reviews.py ReviewsCog mirrors the gallery cog minus images (nocturna-bot 76fe5de + 34d9598). Divergence: reviews do NOT gate on staff AUTHOR (a review comes from a client) — only the ✅/🌙 REACTOR is staff-gated (REVIEWS_STAFF_ROLE_IDS). Author/text routed through ONE seam (_review_author_and_text → (display_name, text) | (None, "")) so 07-04 adds the anonymous 2-button embed without touching _publish. _is_published keys by exact message-id string (prefix non-collision). Orphan reconcile removes ONLY on discord.NotFound (T-07-06 mass-remove guard). bot.py loads cogs.reviews + fail-fasts on missing REVIEWS_CHANNEL_ID. Bot suite 143 passed (was 103; +40 cog tests). REV-03 complete; REV-02 still needs 07-04 (2-button embed).
- [Phase 08]: [08-02] cogs/reminders.py ships the pure scheduler core (nocturna-bot 1c1b860 test -> 77471c4 feat, TDD): next_weekly/monthly/oneoff_fire build local wall times via zoneinfo.ZoneInfo then astimezone(UTC), never fixed offsets; next_monthly recomputes from (year,month)+calendar.monthrange clamp (Feb 28/29, Apr 30), never +30-day drift. classify_fire -> ontime/late/skip (D-13, grace 6h). compute_next('oneoff') returns stored next_fire UNCHANGED (scheduler deletes one-off after firing, D-16). No cog class/modal/tasks.loop/setup yet (deferred 08-03). 22 unit tests; full bot suite 186 passed (was 164).

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

- `2026-07-03-reviews-channel-to-website-publishing-system.md` — Reviews channel → website publishing (staff-reaction model mirroring Phase-5 gallery cog; UPDATED 2026-07-07: collection via staff command posting embed with 2 buttons — anonymous / named review)
- `2026-07-07-bot-reminders-command-weekly-monthly-custom-message.md` — cachorabot reminders command (weekly/monthly, custom message) — nocturna-bot repo
- `2026-07-07-carrd-style-template-editor-for-nocturna-editors.md` — carrd/guns.lol-style template per editor, restricted to Nocturna editors (needs brainstorm)

### Blockers/Concerns

[Issues that affect future work]

- [Phase 1] Terms EN translation needs human/legal review before publishing (I18N-04).
- [Phase 1] Image storage path (`assets/gallery/` vs `public/gallery/`) must be decided this phase — feeds Phase 4 schema and Phase 5 bot.
- [Phase 3] Modular catalog prices not yet agreed by team → render as "Cotizar" until decided.
- [Phase 5] ~~Requires GitHub PAT/deploy key in the bot's `.env` for cross-repo push.~~ RESOLVED in 05-05: fine-grained PAT live in the bot host `.env`; two real publishes landed on origin/revamp.
- [Cutover] ~~deploy.yml is now workflow_dispatch-ONLY (05-05 incident fix) — must revert at cutover.~~ RESOLVED by the 2026-07-04 beta cutover: deploy.yml auto-deploys again via the gh-pages force-push topology; bot publishes rebuild the live site.
- [Phase 5] Cinema host still runs pre-Fix-A/B code — user must `git pull` + restart the `nocturna-bot` systemd unit; then remaining UAT: (b) dismiss, (c) delete re-test with journal logs, (d) backfill + multi-image/idempotency, (e) non-staff gate. Note: the 683 orphan was already removed in the cutover cleanup, so the restart orphan-reconcile should log NOTHING to remove — that is the expected observation.
- [Doc] REQUIREMENTS.md footer originally said "27 v1"; actual v1 count is 30 (PLAT 4 + I18N 4 + NAV 4 + FX 4 + CAT 4 + GAL 4 + BOT 6). Coverage corrected to 30/30.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260707-0q0 | 5 pre-phase-6 website todos: night background on Services+Terms, stronger hero searchlights/static, catalog items (Quest $15 / VTuber VRM $30 / Unitypackage $35), Terms ban disclaimer + block-04 reconcile, Discord popup store copy | 2026-07-07 | 9884c1a | [260707-0q0-ejecutar-5-todos-pendientes-del-sitio-we](./quick/260707-0q0-ejecutar-5-todos-pendientes-del-sitio-we/) |
| 260707-1yi | Post-deploy fixes for 260707-0q0: footer buried by fixed night backdrop (stacking-context bug, footer z-index fix) + card-style readability panels behind Services catalog and Terms text | 2026-07-07 | 204bcc6 | [260707-1yi-fix-footer-invisible-panel-de-fondo-para](./quick/260707-1yi-fix-footer-invisible-panel-de-fondo-para/) |
| 260709-hm5 | Removed dead duplicate gallery Teaser from landing (superseded by FeaturedGallery since Phase 4, never cleaned up) + emptied store.json to trigger the existing Coming Soon empty state; code review also found and fixed dead D-14/D-16 scroll-choreography code (marquee/parallax) targeting the removed Teaser's DOM hooks | 2026-07-09 | be8ef22 | [260709-hm5-limpiar-landing-galeria-duplicada-y-tien](./quick/260709-hm5-limpiar-landing-galeria-duplicada-y-tien/) |

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Cutover | Go-live: push `revamp` + confirm `nocturna-avatars.site` survives (D-09/PLAT-02 domain-survival) — DONE 2026-07-04 as BETA cutover during 05-05 (topology: gh-pages legacy pipeline, not Actions deploy-pages; domain + HTTPS confirmed serving revamp) | ✅ Done 2026-07-04 | 2026-06-28 |
| Experimental | Real-time 3D avatar viewer (Three.js) — FX2-01 | Deferred to v2 | 2026-06-28 |
| Experimental | Ambient music player / audio toggle — FX2-02 | Deferred to v2 | 2026-06-28 |
| Gallery | Filter gallery by category/tag — GAL2-01 | Deferred to v2 | 2026-06-28 |

## Session Continuity

Last session: 2026-07-10T04:45:10.358Z
Stopped at: Phase 8 context gathered
Resume file: None
