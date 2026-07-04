---
phase: 05-photo-publishing-bot-cog
verified: 2026-07-04T15:58:03Z
status: passed
score: 6/6 must-haves verified (roadmap success criteria); 2 decision-level truths (D-19, D-20) verified with documented robustness caveats
overrides_applied: 0
re_verification: null
---

# Phase 5: Photo-Publishing Bot Cog Verification Report

**Phase Goal:** Staff publish gallery photos straight from Discord — a ✅ approves a message's attachments, the bot optimizes and commits them cross-repo to the website, and a 🌙 removes them — with zero code changes to keep the gallery current.
**Verified:** 2026-07-04T15:58:03Z
**Status:** passed
**Re-verification:** No — initial verification

## Verification Method

This is a cross-repo phase: product code lives in `../nocturna-bot` (checked out locally), the write-target lives in this website repo. Rather than trusting SUMMARY.md narrative, I independently re-derived evidence:
- Ran the bot's full test suite fresh (`cd ../nocturna-bot && python -m pytest -q`)
- Grepped the actual source of `cogs/gallery.py`, `core/github_publish.py`, `core/image_optimize.py`, `core/db.py`, `bot.py`, `config.py` for every claimed function/pattern
- Inspected the real git history of both repos (bot-repo task commits; website-repo bot-authored `gallery: publish/remove` commits) rather than trusting commit-hash lists in SUMMARY.md
- Hit the live production domain (`nocturna-avatars.site`) directly with `curl` and cross-checked the live build fingerprint against `git rev-parse HEAD`
- Queried real GitHub Actions run history via `gh run list` to confirm the deploy pipeline actually executed (not just that the workflow file exists)
- Cross-referenced `.planning/phases/05-photo-publishing-bot-cog/05-REVIEW.md` (an independent code review) against the current source to confirm which findings are still live

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria — the contract)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The cog detects staff photo posts in channel `1416329356426481717` and reacts ✅ as an approve control (BOT-01) | ✓ VERIFIED | `cogs/gallery.py:114` `on_message` + `_image_attachments`/`_is_staff` helpers (lines 37-49); `config.PHOTO_CHANNEL_ID` default = `1416329356426481717`; 65/65 unit tests pass incl. staff/community/text-only detection cases; live acceptance evidence in 05-05-SUMMARY.md ("live (multiple posts)") |
| 2 | A staff ✅ publishes all attachments of that message, 1 or many (BOT-02) | ✓ VERIFIED | `on_raw_reaction_add` (`:125`) role-gates then dispatches to `_publish` (`:147`), which loops every image attachment; **independently confirmed live**: bot-authored commits `7378d53`, `3c9a91e`, `1a579d2`, `8108861` exist in website repo history, each containing exactly one `public/gallery/*.webp` + one `gallery.json` update |
| 3 | The bot optimizes images (resize/compress via Pillow) before publishing, with unique filenames (BOT-03) | ✓ VERIFIED | `core/image_optimize.py` `optimize_to_webp` (downscale-only to 1920px, WEBP q82, EXIF stripped) — 5 passing behaviour tests; `_build_filename` produces `{YYYYMMDD}-{msgID}-{index}.webp`; live files confirmed in commit diffs, e.g. `public/gallery/20260704-1522927890352574504-1.webp` |
| 4 | The bot commits images + a `gallery.json` entry to the website repo cross-repo (via PAT), triggering a GitHub Pages rebuild so photos go live (BOT-04) | ✓ VERIFIED | `core/github_publish.py` implements the full Git Data API sequence (blobs→trees→commits→refs), single atomic commit per message (confirmed via git diffs — image + gallery.json land in the SAME commit); `gh run list --workflow=deploy.yml` shows real successful runs triggered directly by these bot commits (e.g. run `28704844991` for `gallery: publish 1 photos (discord msg 1522927890352574504)`, completed/success); live site `https://nocturna-avatars.site/build.txt` returns `f07cf81...`, matching the second-to-latest real commit on `revamp` (the one commit ahead, `0b566a9`, is docs-only) |
| 5 | A 🌙 reaction removes the published photos + `gallery.json` entries from the site (supersedes 🗑️ per D-06 — behavior unchanged) (BOT-05) | ✓ VERIFIED | `_unpublish` (`:195`) + `on_raw_message_delete` (`:270`) call `github_publish.remove_message`; **independently confirmed live**: commits `4fa9775`, `187132b`, `3da74ed` each delete exactly the targeted `.webp` (`sha:null`) and remove only the matching `gallery.json` entry (verified via `git show <sha> -- src/data/gallery.json`); current `gallery.json` = `[]` after these live removal tests — this is the CORRECT post-test state, not a gap |
| 6 | The message text is captured as the optional caption on published entries (BOT-06) | ✓ VERIFIED (code+test), ⚠ live-evidence caveat | `_caption` helper + `github_publish` both proven by unit tests to include a `caption` key when present and OMIT it when empty (never `"caption": ""`). **Fact-check on the SUMMARY's live-evidence claim:** 05-05-SUMMARY.md states "BOT-06 caption from message text \| verified in gallery.json entries" — but all 7 live `gallery: publish/remove` commits I inspected used captionless test posts; no live commit actually shows a non-empty `caption` key. The mechanism is solid (code + tests), but the specific "caption text visibly round-tripped on a live post" claim in the SUMMARY is not directly substantiated by the commit history. Recommend one quick live spot-check with a captioned photo. |

**Score:** 6/6 ROADMAP success criteria verified (one live-evidence caveat noted on #6, not a functional failure)

### Decision-Level Truths (PLAN frontmatter — additive detail beyond the ROADMAP contract)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| D-11/D-12 | WebP downscale-only 1920px, no upscale, EXIF stripped | ✓ VERIFIED | 5 passing tests in `test_image_optimize.py`; asserted dims 3000x2000→1920x1280, 800x600 unchanged |
| D-13 | Only image/png,jpeg,webp accepted; gif/video skipped | ✓ VERIFIED | `_image_attachments` allow-list; tested |
| D-14 | Removal derived statelessly from exact `{msgID}` filename segment | ✓ VERIFIED (with a WARNING) | `gallery.py:_entry_message_id`-equivalent logic in cog uses a strict regex; **but** `github_publish.py:_entry_message_id` (the function that actually performs the delete) uses a looser `split("-")[1]` comparison — flagged as WR-06 in 05-REVIEW.md. Deletion-path parser is looser than the identification-path parser, which is backwards from a safety standpoint, though no live collision has occurred. |
| D-15 | `.env`-driven WEBSITE_REPO/WEBSITE_BRANCH — branch flips at cutover need zero code changes | ✓ VERIFIED | `config.py` constants confirmed; in practice the whole site cut over onto `revamp` instead of flipping the bot's target branch, so the "flip" scenario didn't materialize, but the mechanism (env-driven target) is real and unchanged |
| D-16/D-17 | One atomic commit per publish/remove; descriptive commit message, no Discord usernames | ✓ VERIFIED | Confirmed directly in live commit messages: `gallery: publish 1 photos (discord msg 1522927890352574504)` — exact format, no usernames |
| D-18 | Concurrent publishes serialized; stale-ref auto-retried with backoff | ✓ VERIFIED (code+test only) | `asyncio.Lock` + retry loop present and unit-tested (mocked 422); no live concurrent-conflict was exercised (none needed at current low volume) |
| D-19 | Exhausted-retry failures leave a persistent reply + ⚠️ | ⚠ WARNING (partial) | Code present (`_surface_failure`, `try/except github_publish.GitHubPublishError`) and unit-tested; **but confirmed via direct source inspection** that `core/github_publish.py`'s HTTP calls (`_fetch_parent_sha`, `_create_blob`, `_create_tree`, `_create_commit`, etc.) have no `try/except` around `requests.get/post/patch` and no `timeout=`, so a real network exception (`ConnectionError`, `Timeout`) propagates untyped and bypasses the D-19 UX entirely (05-REVIEW.md CR-01/CR-02, independently reproduced by grep — no `timeout=` anywhere in the file, no `except requests`). The 05-05 acceptance checklist marked its own error-surfacing test "SKIPPED (optional)", so this gap was never exercised live either. |
| D-20 | Startup backfill reconciles missed prompts/approvals/removals from a persisted cursor | ⚠ WARNING (partial) | `get_cursor`/`set_cursor` + `_backfill`/`_reconcile` exist, are unit-tested, and the orphan-removal pass (added via a 05-05 hardening fix) was live-verified. **But confirmed via direct source inspection** that `bot.py`'s intents (`discord.Intents.default()` + `message_content`, no `intents.members`) mean `_reaction_by_staff`'s `guild.get_member(user.id)` call (no `fetch_member` fallback) will return `None` for any reactor not already in the cold-start member cache — so a missed ✅/🌙 approval during downtime is unlikely to actually replay on restart, despite `_reconcile` logging success (05-REVIEW.md CR-03). The "add a missed ✅ prompt" reconcile path is less certainly affected (Discord message payloads can carry embedded partial-member data independent of the intent), but the "replay a missed approval/removal" path is the one most exposed. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `nocturna-bot/core/image_optimize.py` | `optimize_to_webp(raw) -> (bytes, w, h)` | ✓ VERIFIED | 57 lines; imports only `io`+`PIL`; 5/5 tests pass |
| `nocturna-bot/config.py` | 7 Phase-5 `.env` constants | ✓ VERIFIED | All 7 present with correct defaults (`WEBSITE_REPO=Shangrii/Nocturna-Avatars`, `WEBSITE_BRANCH=revamp`) |
| `nocturna-bot/requirements.txt` | Pillow + pytest | ✓ VERIFIED | `Pillow>=12.0.0`, `pytest>=8.0.0` present |
| `nocturna-bot/core/github_publish.py` | `publish_message`/`remove_message` via Git Data API | ✓ VERIFIED | 322 lines; full 7-step sequence present; `asyncio.Lock` + retry present |
| `nocturna-bot/cogs/gallery.py` | `GalleryCog` — detect/publish/unpublish/backfill | ✓ VERIFIED | 446 lines; all documented functions present (`_image_attachments`, `_is_staff`, `_build_filename`, `_caption`, `_is_published`, `_publish`, `_unpublish`, `on_raw_message_delete`, `on_ready`, `_backfill`, `_reconcile`, `_reaction_by_staff`) |
| `nocturna-bot/bot.py` | loads `cogs.gallery` + fail-fast config guard | ✓ VERIFIED | `load_extension("cogs.gallery")` + 3 `sys.exit(1)` guards on GITHUB_PAT/WEBSITE_REPO/GALLERY_STAFF_ROLE_IDS |
| `nocturna-bot/core/db.py` | `gallery_state` table + `get_cursor`/`set_cursor` | ✓ VERIFIED | Both present, round-trip tested |
| `nocturna-bot/tests/*` | Behaviour test suites | ✓ VERIFIED | 65/65 tests pass fresh (re-run by verifier, not taken from SUMMARY) |
| `.github/workflows/deploy.yml` (website repo) | gh-pages self-heal deploy | ✓ VERIFIED | Present; matches described topology; `gh run list` shows real successful runs |
| `.github/workflows/pages-heal.yml` (on `main`, not `revamp`) | 20-min convergence cron | ✓ VERIFIED | Not on the checked-out `revamp` branch (by design — cron only runs from the default branch); confirmed present on `origin/main` via `git ls-tree` + content dump, matches SUMMARY exactly |
| `src/data/gallery.json` (website repo) | bot write-target | ✓ VERIFIED (empty is correct) | Currently `[]` — correct post-live-removal-test state, not a stub or regression |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `cogs/gallery.py` | `core.image_optimize.optimize_to_webp` | `asyncio.to_thread` | ✓ WIRED | Confirmed in `_publish`; grep + test |
| `cogs/gallery.py` | `core.github_publish.publish_message` | one call per approved message | ✓ WIRED | Confirmed in `_publish`; live commits prove end-to-end execution |
| `cogs/gallery.py` | `core.github_publish.remove_message` | 🌙 + message-delete | ✓ WIRED | Confirmed in `_unpublish` + `on_raw_message_delete`; live removal commits prove execution |
| `bot.py` | `cogs.gallery` | `load_extension` in `setup_hook` | ✓ WIRED | Present; live bot host log claimed loaded (05-05 human checkpoint) |
| `core/github_publish.py` | `api.github.com Git Data API` | `requests` to `git/blobs\|trees\|commits\|refs` | ✓ WIRED | Confirmed by source + live commit history + successful deploy runs |
| bot `.env` (live host) | `Shangrii/Nocturna-Avatars@revamp` | `GITHUB_PAT` → Git Data API → `deploy.yml` | ✓ WIRED (live) | Directly confirmed: `gh run list` shows deploy runs triggered by bot commits, live site serves the resulting content |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| BOT-01 | 05-03 | Detect staff photo posts, mark ✅ | ✓ SATISFIED | See Truth #1 |
| BOT-02 | 05-03 | Staff ✅ publishes all attachments | ✓ SATISFIED | See Truth #2 |
| BOT-03 | 05-01 | Optimize images before publishing | ✓ SATISFIED | See Truth #3 |
| BOT-04 | 05-02 | Cross-repo commit to website repo | ✓ SATISFIED | See Truth #4 |
| BOT-05 | 05-04 | Removal reaction removes published photos (🗑️→🌙 per D-06) | ✓ SATISFIED | See Truth #5 |
| BOT-06 | 05-03 | Message text captured as caption | ✓ SATISFIED (with live-evidence caveat) | See Truth #6 |

No orphaned requirements: `.planning/REQUIREMENTS.md` maps exactly BOT-01..BOT-06 to Phase 5, and all six appear in a plan's `requirements:` frontmatter (05-01: BOT-03; 05-02: BOT-04; 05-03: BOT-01/02/06; 05-04: BOT-05; 05-05: all six as the acceptance plan). Coverage table in REQUIREMENTS.md itself independently marks all six "Complete."

### Anti-Patterns Found

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers in any Phase-5 file (`cogs/gallery.py`, `core/github_publish.py`, `core/image_optimize.py`, `core/db.py`, `bot.py`, `config.py`) — confirmed via direct grep, not SUMMARY claims.

The independent code review (`05-REVIEW.md`, dated after all execution plans completed) found 3 Critical + 6 Warning + 8 Info issues. I independently re-verified the 3 Critical findings against current source (not just trusting the review doc):

| File | Finding | Severity | Independently Confirmed? | Impact |
|------|---------|----------|---------------------------|--------|
| `core/github_publish.py` (all `requests.*` call sites) | CR-01: network exceptions (`ConnectionError`/`Timeout`) escape the `GitHubPublishError` contract, bypassing the D-19 ⚠️ UX | ⚠️ Warning (not Blocker) | Yes — grepped for `timeout=` and `except requests` in the file: none found | Real-world network blips fail silently instead of surfacing to staff |
| `core/github_publish.py` (same call sites) | CR-02: no `timeout=` on any HTTP call while `_commit_lock` is held — a hung connection can permanently wedge the whole publish/removal pipeline | ⚠️ Warning (not Blocker) | Yes — same grep | Single point of total, silent feature outage until process restart |
| `bot.py` intents + `cogs/gallery.py:_reaction_by_staff` | CR-03: `discord.Intents.members` is not enabled, and `_reaction_by_staff` calls `guild.get_member()` with no `fetch_member` fallback — cold-restart backfill of missed ✅/🌙 approvals likely silently no-ops | ⚠️ Warning (not Blocker) | Yes — confirmed `intents = discord.Intents.default()` + `message_content = True` only, no `.members` | The one code path whose job is downtime recovery is the one most likely to quietly fail; live orphan-removal reconcile (added later) is unaffected |

**Why these are classified WARNING and not BLOCKER:** they affect resilience under adverse/edge conditions (network failures, concurrent-approval races, cold-restart backfill of *missed approvals specifically*), not the demonstrated, live-verified happy path that IS the phase's stated goal (a staff ✅ publishes; a 🌙 or delete unpublishes; the live site reflects it — all independently reproduced above via real commits, real deploy runs, and the live domain). They are already tracked in `05-REVIEW.md` with concrete, actionable fixes and are recommended as a fast-follow hardening plan rather than a reason to reopen Phase 5.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full bot test suite is green | `cd ../nocturna-bot && python -m pytest -q` | `65 passed, 2 warnings in 3.29s` | ✓ PASS |
| Live site is up and serving | `curl -fsSL https://nocturna-avatars.site/ -o /dev/null -w "%{http_code}"` | `200` | ✓ PASS |
| Live gallery page renders | `curl -fsSL https://nocturna-avatars.site/es/galeria -o /dev/null -w "%{http_code}"` | `200` | ✓ PASS |
| Live build fingerprint matches deployed commit | `curl -fsSL https://nocturna-avatars.site/build.txt` vs `git log` | `f07cf81...` = second-to-latest real commit (latest is docs-only) | ✓ PASS |
| Deploy pipeline actually executes on bot commits | `gh run list --workflow=deploy.yml` | 5 most recent runs all `completed/success`, including runs directly triggered by `gallery: publish/remove` commits | ✓ PASS |

### Probe Execution

No dedicated `scripts/*/tests/probe-*.sh` convention exists in either repo for this phase; the pytest suite (`cd ../nocturna-bot && python -m pytest -q`) is the phase's de facto probe and was run fresh above with 65/65 passing — not taken from SUMMARY.md's reported count.

### Human Verification Required

None required to close out this verification — Plan 05-05 was already a human-gated checkpoint with documented acceptance evidence, and I independently corroborated its central claims (live commits, live deploy runs, live site content) against the actual repos rather than trusting the SUMMARY narrative alone.

**Recommended (non-blocking) follow-up spot-check for the developer:**
1. Post a staff photo WITH message text, ✅ it, and confirm the caption appears on `/galeria` — closes the live-evidence gap noted on Truth #6 (all live-tested publishes so far were captionless).
2. Stop the bot, have a staff member ✅ a pending post while it's down, restart, and confirm the approval actually replays (not just that a missed ✅-prompt gets added) — this exercises the exact CR-03 backfill path that static analysis flags as at-risk.

### Gaps Summary

No gaps block the phase goal. All six ROADMAP success criteria (BOT-01 through BOT-06) are independently verified as functionally true and live in production — confirmed via fresh test runs, direct source inspection, real git commit history in both repos, and direct HTTP/`gh` checks against the live domain and GitHub Actions, not by trusting SUMMARY.md claims.

Three genuine robustness gaps exist (CR-01/CR-02/CR-03, already documented in `05-REVIEW.md` with concrete fixes) affecting network-failure surfacing, hung-connection resilience, and cold-restart backfill-of-missed-approvals. These do not prevent the demonstrated live happy path but should be prioritized as a near-term hardening follow-up given the bot runs unattended in production. One live-evidence gap was found by fact-checking the SUMMARY against actual commit history: the claim that BOT-06 caption round-trip was "verified in gallery.json entries" is not supported by any of the 7 real `gallery: publish/remove` commits inspected (all were captionless) — the underlying mechanism is nonetheless solid (unit-tested both for presence and omission).

---

_Verified: 2026-07-04T15:58:03Z_
_Verifier: Claude (gsd-verifier)_
