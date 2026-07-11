---
phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse
plan: 01
subsystem: infra
tags: [jinxxy, config, sqlite, bot, store-sync, env]

# Dependency graph
requires:
  - phase: 05-photo-publishing-bot-cog
    provides: "config.py env-block idiom + GALLERY_STAFF_ROLE_IDS/GITHUB_PAT/WEBSITE_REPO/WEBSITE_BRANCH reused constants; core/db.py per-feature init_*() SQLite idiom"
  - phase: 08-bot-reminders
    provides: "T-08-03 ?-placeholder + whitelist SQL-injection discipline mirrored by store_snapshot writes"
provides:
  - "config.py Jinxxy env block: JINXXY_API_KEY, JINXXY_ANNOUNCE_CHANNEL_ID, JINXXY_POLL_HOURS, WEBSITE_STORE_JSON, WEBSITE_STORE_IMAGE_DIR, JINXXY_STAFF_ROLE_IDS"
  - "core/db.py store_snapshot table + init_store_state/get_store_snapshot/upsert_store_snapshot/delete_store_snapshot (durable three-way-merge state, D-12)"
  - ".env.example documentation for the cinema-host manual deploy"
affects: [09-02-jinxxy-api-client, 09-03-store-merge, 09-04-store-transport, 09-05-jinxxy-cog, 09-06-attach-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-feature SQLite init_*() called from cog __init__ (not init_db) — repo idiom extended to store_snapshot"
    - "Env-driven config block with comma-split staff-role list falling back to GALLERY_STAFF_ROLE_IDS"

key-files:
  created: []
  modified:
    - "../nocturna-bot/config.py"
    - "../nocturna-bot/core/db.py"
    - "../nocturna-bot/.env.example"

key-decisions:
  - "store_snapshot keyed by checkout_url (D-13 link key), one row per synced product holding last-synced value of every sync-owned field — makes the three-way ownership merge (D-12) durable across restarts"
  - "JINXXY_STAFF_ROLE_IDS falls back to GALLERY_STAFF_ROLE_IDS when unset (identical idiom to REVIEWS_/REMINDERS_STAFF_ROLE_IDS)"
  - "JINXXY_API_KEY handled with the same discipline as GITHUB_PAT — default empty, .env-only, ships blank in .env.example"

patterns-established:
  - "Object-owned-field snapshot store: durable per-product last-synced values keyed by the cross-repo link key, all ?-placeholder writes (T-09-02)"

requirements-completed: [STORE-SYNC-01]

# Metrics
duration: 9min
completed: 2026-07-11
---

# Phase 09 Plan 01: Config + Durable State Surface Summary

**Jinxxy env config block (six constants, staff-role fallback) plus a durable checkout_url-keyed store_snapshot SQLite table with idempotent init/get/upsert/delete for the D-12 three-way ownership merge — the interface-first foundation for the Phase-9 sync.**

## Performance

- **Duration:** ~9 min
- **Completed:** 2026-07-11
- **Tasks:** 2
- **Files modified:** 3 (all in ../nocturna-bot)

## Accomplishments
- Added the "Jinxxy (Fase 9: sync de la tienda)" block to `config.py` exposing `JINXXY_API_KEY`, `JINXXY_ANNOUNCE_CHANNEL_ID` (D-18 default), `JINXXY_POLL_HOURS` (D-03 band), `WEBSITE_STORE_JSON`, `WEBSITE_STORE_IMAGE_DIR` (D-15 attach dir), and `JINXXY_STAFF_ROLE_IDS` (fallback to `GALLERY_STAFF_ROLE_IDS`); reused `GITHUB_PAT`/`WEBSITE_REPO`/`WEBSITE_BRANCH` unchanged.
- Added `store_snapshot` table + `init_store_state`/`get_store_snapshot`/`upsert_store_snapshot`/`delete_store_snapshot` to `core/db.py` — a restart-surviving per-product snapshot keyed by `checkout_url`, using `?` placeholders only.
- Documented every new var in `.env.example` for the manual cinema-host deploy; `JINXXY_API_KEY` ships blank with a "never commit a real key" note.

## Task Commits

Each task was committed atomically in the `nocturna-bot` repo:

1. **Task 1: Jinxxy config block + .env.example docs** - `d48847f` (feat)
2. **Task 2: init_store_state() + snapshot getters/setters** - `6a61431` (feat)

## Files Created/Modified
- `../nocturna-bot/config.py` - Jinxxy env block (key, announce channel, poll hours, store json/image paths, staff roles)
- `../nocturna-bot/core/db.py` - `store_snapshot` table + init/get/upsert/delete helpers
- `../nocturna-bot/.env.example` - documented Jinxxy env vars

## Decisions Made
None beyond the plan-specified decisions (D-01/D-03/D-12/D-13/D-15/D-18). Followed plan as written.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. Both automated verifications passed on first run; the full bot suite stayed at 234 passed (no regressions — this plan only adds new symbols).

## Threat Model Compliance
- **T-09-01 (API key disclosure):** `JINXXY_API_KEY` defaults to `""`; `.env.example` ships blank with a "NUNCA subas una real" comment; never logged here (only read downstream into a request header in 09-02). Mitigated.
- **T-09-02 (SQL injection):** all `store_snapshot` writes use `?` placeholders; no column name interpolated from a variable. Verified `grep` shows no f-string/format SQL in the new store functions. Mitigated.
- **T-09-SC (install surface):** no new packages added. Accepted (nothing to verify).

## User Setup Required
The live cinema host `.env` will need `JINXXY_API_KEY` set before the sync cog (lands 09-05) can run — the fail-fast guard is added in a later plan. No action needed for this plan; `.env.example` documents the var.

## Next Phase Readiness
- Config constants and the durable snapshot table are in place for every downstream Phase-9 plan (API client 09-02, merge 09-03, transport 09-04, cog 09-05, attach flow 09-06).
- No cog wiring yet (deliberately deferred to 09-05 to keep `bot.py` single-owner).

## Self-Check: PASSED
- Commit `d48847f` (Task 1) — found in nocturna-bot git log
- Commit `6a61431` (Task 2) — found in nocturna-bot git log
- `09-01-SUMMARY.md` — exists at plan directory

---
*Phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse*
*Completed: 2026-07-11*
