---
phase: 05-photo-publishing-bot-cog
plan: 05
subsystem: infra
tags: [github-pages, gh-pages, deploy, pat, discord, systemd, cutover, self-healing, fine-grained-token]

# Dependency graph
requires:
  - phase: 05-01
    provides: "Phase-5 config surface (GITHUB_PAT, GALLERY_STAFF_ROLE_IDS, WEBSITE_REPO/BRANCH) + optimize_to_webp"
  - phase: 05-02
    provides: "github_publish atomic publish/remove transport"
  - phase: 05-03
    provides: "GalleryCog publish slice (✅ detect/approve/publish)"
  - phase: 05-04
    provides: "🌙 removal, delete auto-unpublish, D-19 errors, D-20 backfill"
provides:
  - "LIVE production deployment: Cachora Bot on host 'cinema' (systemd nocturna-bot) runs the gallery cog with real secrets"
  - "Fine-grained PAT (Contents:RW, only Shangrii/Nocturna-Avatars) in bot host .env; staff gate = role 1418724526308593834"
  - "PRODUCTION BETA CUTOVER: revamp serves nocturna-avatars.site (user decision 2026-07-04); old site archived on main (rollback = flip Pages source)"
  - "Self-healing deploy pipeline: deploy.yml builds Astro → force-pushes dist/ to gh-pages (with build.txt fingerprint) → verifies the LIVE site serves it, re-pushing up to 3× — plus pages-heal.yml cron on main (every 20 min) re-dispatching deploy on fingerprint mismatch"
  - "Bot resilience fixes (nocturna-bot 648a54f..8345beb): inverse orphan reconcile in backfill (Fix A), visible 🌙 control next to 🟢 (Fix B), defensive delete-event logging"
affects: [06-asset-store, future-reviews-system]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Convergent deploys: every gh-pages push carries FULL site state + a build.txt commit fingerprint, so any missed deploy is safely healed by re-pushing or re-dispatching — verification is against the live domain, not CI status"
    - "One Pages environment per repo: any Actions deployment replaces the production domain regardless of source branch — branch-scoped 'preview' deploys do not exist on GitHub Pages"
    - "Live-host deploys = push origin main (nocturna-bot) → ssh cinema git pull → systemctl restart"

key-files:
  created:
    - ".github/workflows/pages-heal.yml (on main — scheduled convergence healer)"
  modified:
    - ".github/workflows/deploy.yml (gh-pages topology + live-fingerprint self-heal)"
    - "src/data/gallery.json (reset to bot-published content at cutover)"
    - "package-lock.json (synced @emnapi bundled optionals)"

key-decisions:
  - "PAT type: fine-grained, single-repo (Shangrii/Nocturna-Avatars), Contents: Read and write — least privilege (user decision)"
  - "GALLERY_STAFF_ROLE_IDS reuses moderator role 1418724526308593834 (user decision)"
  - "PRODUCTION BETA CUTOVER 2026-07-04 (user decision): revamp live now; gallery reset to bot-only content; no BETA badge"
  - "Deploy topology: actions/deploy-pages@v5 retired (opaque finalizer rejections) → build + force-push dist to gh-pages, Pages legacy pipeline serves it"
  - "Deploy reliability: live build.txt fingerprint verification + 3× self-heal re-push in deploy.yml + 20-min healer cron on main (user-authorized)"

patterns-established:
  - "Acceptance evidence = the production domain (live build fingerprint + rendered content), never CI conclusions alone"
  - "Bot↔website divergence resolved permanently: local revamp == origin/revamp; future bot commits fast-forward"

requirements-completed: [BOT-01, BOT-02, BOT-03, BOT-04, BOT-05, BOT-06]

# Metrics
duration: ~3h active (multi-session, human-gated, spanning 2026-07-03 → 2026-07-04)
completed: 2026-07-04
---

# Phase 5 Plan 05: Live Setup + Acceptance Summary

**Gallery cog live in production with fine-grained PAT and staff role gate; all six BOT criteria verified against live Discord and the live domain — plus an unplanned production beta cutover: nocturna-avatars.site now serves the revamp with a self-healing gh-pages deploy pipeline**

## Performance

- **Duration:** ~3h active across two sessions (human gates: PAT creation, bot restarts, live Discord tests)
- **Started:** 2026-07-03 (evening)
- **Completed:** 2026-07-04
- **Tasks:** 3/3 (decision gate, secrets + deploy, live acceptance)
- **Files modified:** 5 website (deploy.yml, pages-heal.yml, gallery.json, package-lock.json, tracking) + 3 bot (cogs/gallery.py, tests, via Fix A/B)

## Accomplishments

- **Live end-to-end pipeline proven on the production domain:** staff photo in Discord → ✅ → atomic commit → auto build → visible on nocturna-avatars.site in ~2 min; 🌙 and message-deletion both remove photos from the live site.
- **Production beta cutover (user decision):** revamp now IS the site; old site archived intact on main (rollback = flip Pages source to main). Gallery reset to bot-published content only.
- **Two deploy-infrastructure incidents root-caused and permanently fixed** (see Deviations).
- **Secrets provisioned least-privilege:** fine-grained PAT scoped to one repo, Contents:RW only, stored solely in the bot host's git-ignored .env.

## Task Commits

Human-gated plan — commits are tracking + infrastructure (no bot-cog source in this plan except deviation fixes):

1. **Task 1: PAT type + staff role decision** — `c9a74c3` (docs, decision record)
2. **Task 2: Secrets + deploy prep** — `ff3c439` (docs, deferred-items), bot pushed `a7c0078` → cinema
3. **Task 3: Live acceptance + incidents + cutover** — `65a423f` (deploy evidence), `7c88b74`/`333b17e` (manual-only deploys, incident 1), `a129a0a` (cutover), `9a71978` (gh-pages topology), `22db985` (lockfile sync), `7d4923b` (npm install), `fe08d69` (cutover record), `33d59d5` (live-fingerprint self-heal), `834b932` (pages-heal.yml on main)

**Deviation fixes in nocturna-bot** (pushed, deployed to cinema): `648a54f`/`ff5b5f1` (Fix A RED/GREEN), `179f873`/`b9054bc` (Fix B RED/GREEN), `8345beb` (delete-event logging). Suite: 65 passed.

## Files Created/Modified

- `.github/workflows/deploy.yml` — gh-pages build+push topology with live build.txt fingerprint verification and 3× self-heal
- `.github/workflows/pages-heal.yml` (on main) — 20-min cron re-dispatching deploy on live-vs-expected fingerprint mismatch
- `src/data/gallery.json` + `public/gallery/` — reset to bot-published content at cutover (29 samples + orphan removed)
- `package-lock.json` — synced missing @emnapi bundled optionals of @tailwindcss/oxide-wasm32-wasi
- `nocturna-bot/cogs/gallery.py` — inverse orphan reconcile, visible 🌙 control, delete-event logging

## Decisions Made

- Fine-grained single-repo PAT over classic (least privilege; user choice)
- Staff gate reuses moderator role `1418724526308593834` (user choice)
- **Production beta cutover now** rather than at milestone end (user choice) — gallery bot-only, no BETA badge
- deploy-pages@v5 → gh-pages branch topology (evidence: 3/4 opaque finalizer failures vs months of green legacy builds)
- Convergence-based reliability (fingerprint + re-push + cron) instead of fighting the Pages backend

## Deviations from Plan

### 1. Production incident: first bot publish replaced the live site (resolved)

- **Found during:** Task 3 first live publish (2026-07-04 00:23)
- **Issue:** deploy.yml `on:push branches:[revamp]` deployed the stale origin/revamp build to the production domain — a repo has only ONE Pages environment; the workflow comment "production stays untouched until cutover" was wrong. Compounded by 115 local commits (phases 2.1→5) never having been pushed to origin/revamp.
- **Fix:** production restored via legacy rebuild from main (00:45, verified by content markers); deploys made workflow_dispatch-only (`7c88b74`+`333b17e`); local/origin revamp merged and synced (gallery.json union), eliminating the divergence permanently.

### 2. Fix A/B: backfill orphan gap + undiscoverable 🌙 (bot repo)

- **Found during:** Task 3 delete-unpublish test — no removal commit; restart backfill couldn't heal it (deleted messages never appear in `channel.history`), leaving a permanently orphaned live photo. User also flagged the hidden 🌙 gesture as unintuitive.
- **Fix:** TDD — inverse reconcile pass in `_backfill` (entry-derived ids probed via fetch_message; NotFound → remove; transient errors ≠ deleted; sample entries skipped) + bot adds visible 🌙 next to 🟢 after publish, cleared on unpublish/dismiss. Suite 54 → 65 green.

### 3. Production incident 2: Pages finalizer drops rapid deploys (resolved with convergence)

- **Found during:** user live testing — "removal deploys usually fail, publish deploys usually work"
- **Issue:** GitHub Pages' internal deployment finalizer rejects deployments arriving while the previous one propagates (~2 min window) — removals follow publishes closely in staff flows, so they disproportionately failed. Same opaque error had already killed 3/4 actions/deploy-pages attempts during cutover.
- **Fix:** deploy topology switched to gh-pages branch + legacy pipeline; dist ships a `build.txt` fingerprint; deploy verifies the LIVE domain serves it and re-pushes up to 3× (`33d59d5`); user-authorized `pages-heal.yml` cron on main converges any residual miss within ~20 min (`834b932`). Verified: live build == origin/revamp HEAD, zero removed-photo references live.

### 4. Production beta cutover (user-directed scope addition)

- **Found during:** Task 3 — user decided the site was solid enough to ship as beta now
- **Fix:** gallery reset to bot-only content, Pages flipped (ultimately to gh-pages legacy source), lockfile synced, live-verified. Old site archived on main.

---

**Total deviations:** 4 (2 production incidents resolved, 1 TDD fix pair in the bot, 1 user-directed cutover)
**Impact on plan:** Acceptance ended up STRONGER than planned — all six criteria verified on the real production domain instead of a pre-cutover branch build.

## Issues Encountered

- Two executor sessions killed by provider quota limits (waves 4 and 5 closeout) — recovered via spot-check + fresh dispatch, no work lost.
- `gsd-sdk query state.record-metric` / `state.add-decision` reject positional args on Windows Git Bash — STATE.md entries written via direct edit (reported for GSD upstream).

## User Setup Required

Completed during this plan (nothing pending): fine-grained PAT created and stored in cinema's git-ignored `.env`; `GALLERY_STAFF_ROLE_IDS=1418724526308593834`; bot deployed via git pull + systemctl restart on cinema.

## Acceptance Evidence (live, 2026-07-04)

| Criterion | Evidence |
|-----------|----------|
| BOT-01 ✅ prompt on staff photos | live (multiple posts) |
| BOT-02 ✅ → live gallery | publish commits 7378d53/3c9a91e/1a579d2/8108861; photo rendered on live /es/galeria |
| BOT-03 WebP optimization | live files `20260704-{msgID}-N.webp`, dims per contract |
| BOT-04 atomic cross-repo commit | one commit per message (Git Data API), verified in origin/revamp log |
| BOT-05 🌙 + delete removal | removal commits 4fa9775/187132b/3da74ed; live site shows zero removed refs |
| BOT-06 caption from message text | verified in gallery.json entries |
| Backfill (D-20) | restart reconciled missed posts; multi-image publish = ONE commit; second ✅ idempotent |
| Non-staff gate | no ✅ prompt / no publish for non-staff (user-verified) |
| Optional error-surfacing test (f) | SKIPPED (optional; D-19 path is unit-tested) |

## Next Phase Readiness

- **The site is live in production (beta)** — Phase 6 (asset store) and remaining milestone work now ship to a real audience; treat revamp pushes as production deploys.
- Reviews-system idea captured in `.planning/todos/pending/2026-07-03-reviews-channel-to-website-publishing-system.md` — natural post-milestone phase reusing this plan's transport.
- Rollback safety: old site intact on main; flip Pages source to main to revert.

---
*Phase: 05-photo-publishing-bot-cog*
*Completed: 2026-07-04*
