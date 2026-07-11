---
phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse
plan: 09
subsystem: infra
tags: [discord.py, tasks-loop, jinxxy, store-sync, snapshot, poll]

# Dependency graph
requires:
  - phase: 09-05
    provides: JinxxyCog controller (_run_sync / on_ready / _poll / _on_poll_error)
  - phase: 09-07
    provides: corrected merge/transport core (build_tree re-graft, current-is-None resurrect)
provides:
  - "Durable snapshot advances on EVERY successful sync (no-change cycle included) — WR-03 closed"
  - "Single startup reconcile via the poll's first tick; on_ready listener removed — CR-01 closed"
  - "Bounded _POLL_RETRY_COOLDOWN_S=900 before a poll restart — WR-02 closed"
  - "Hard-fail JinxxyAPIError when /me lacks a username, before any write — WR-04 closed"
  - "Unkeyable/duplicate staff store.json entries carried through verbatim — WR-06 closed"
affects: [jinxxy-store-sync, nocturna-bot, phase-09-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "tasks.loop first-tick-as-startup-reconcile (no separate on_ready) to avoid double-run on boot"
    - "unconditional snapshot upsert (advance-to-live-truth) decoupled from the commit-on-change gate"
    - "unkeyed carry-through list for entries that cannot participate in a checkoutUrl reconcile"

key-files:
  created: []
  modified:
    - ../nocturna-bot/cogs/jinxxy.py
    - ../nocturna-bot/tests/test_jinxxy_cog.py

key-decisions:
  - "Snapshot upsert moved OUT of the changed branch so a no-change cycle still advances the durable snapshot to live truth (WR-03); sync_store + delete_store_snapshot stay inside the changed branch (D-06)"
  - "on_ready listener + _synced_once flag deleted — the poll loop's own immediate first tick is the sole startup reconcile (CR-01)"
  - "_POLL_RETRY_COOLDOWN_S = 900 (15 min) awaited before _poll.restart() so a persistent outage cannot tight-loop both APIs (WR-02)"
  - "A /me with a falsy username raises JinxxyAPIError before enumeration, preventing a jinxxy.com//slug mass-rewrite; routes through the T-09-15 removal-safety abort (WR-04)"
  - "Unkeyable entries (non-dict / missing/falsy checkoutUrl / duplicate key) collected into `unkeyed` and re-appended to the written products verbatim (WR-06)"

patterns-established:
  - "Pattern: advance-snapshot-always, commit-on-change — durable state converges to observed truth even when nothing is written to the repo"
  - "Pattern: carry-through list for reconcile-ineligible staff entries so a hand-added product is never lost"

requirements-completed: [STORE-SYNC-01]

# Metrics
duration: 14min
completed: 2026-07-11
---

# Phase 09 Plan 09-09: Cog sync/poll orchestration gap closure Summary

**Hardened `_run_sync` / poll lifecycle in `cogs/jinxxy.py`: snapshot advances on every successful sync (WR-03), a single startup reconcile with a bounded restart cool-down (CR-01/WR-02), a username-less `/me` hard-fails before any write (WR-04), and unkeyable staff products survive verbatim (WR-06).**

## Performance

- **Duration:** ~14 min
- **Completed:** 2026-07-11
- **Tasks:** 3 (all TDD: RED → GREEN)
- **Files modified:** 2 (`cogs/jinxxy.py`, `tests/test_jinxxy_cog.py`)

## Accomplishments
- **WR-03 (BLOCKER) closed:** the `db.upsert_store_snapshot` loop is no longer nested inside `if result["changed"]:`. A no-change cycle where Jinxxy already matches a staff value now still advances the durable snapshot, so a LATER staff edit on that field can never be misread as a both-changed conflict and reverted (defends the D-12 staff-protection contract).
- **WR-06 closed:** store.json entries that are non-dict, lack a usable `checkoutUrl`, or duplicate an already-seen key are collected into an `unkeyed` list and re-grafted onto the written products verbatim — a hand-added/malformed staff product is never silently dropped on the next changed sync.
- **CR-01 closed:** the `on_ready` listener and the `_synced_once` flag were removed; the poll loop's immediate first tick (run by `tasks.loop` after `_before_poll`'s `wait_until_ready`) is now the sole startup reconcile, eliminating the double sync + double announce on boot.
- **WR-02 closed:** `_on_poll_error` now `await asyncio.sleep(_POLL_RETRY_COOLDOWN_S)` (900s) before `self._poll.restart()`, so a persistent Jinxxy/GitHub outage no longer tight-loops the restart and hammers both APIs.
- **WR-04 closed:** `_run_sync` raises `jinxxy_api.JinxxyAPIError` when `me.get("username")` is falsy — before enumeration/reconcile/commit — preventing a malformed-but-2xx `/me` from building `jinxxy.com//slug` keys and mass-rewriting every checkoutUrl. Routes through the existing T-09-15 removal-safety abort (no `sync_store`, no `delete_store_snapshot`).
- Full bot suite green: **331 passed** (was 324), +7 net cog tests.

## Task Commits

Each task was TDD (test → fix), committed atomically in the **nocturna-bot** repo:

1. **Task 1: snapshot advance every sync + unkeyable carry-through (WR-03, WR-06)** — `1f48cc4` (test) → `e1dee82` (fix)
2. **Task 2: single startup reconcile + bounded poll cool-down (CR-01, WR-02)** — `0f53d2c` (test) → `ef871a4` (fix)
3. **Task 3: hard-fail on a /me missing a username (WR-04)** — `1a1728a` (test) → `eaad5ef` (fix)

**Plan metadata:** committed in the website repo (this SUMMARY + STATE + ROADMAP).

## Files Created/Modified
- `../nocturna-bot/cogs/jinxxy.py` — `_run_sync` (snapshot upsert unconditional; `unkeyed` carry-through; username hard-guard), `__init__`/module docstring (on_ready + `_synced_once` removed), `_POLL_RETRY_COOLDOWN_S` constant, `_on_poll_error` cool-down.
- `../nocturna-bot/tests/test_jinxxy_cog.py` — +7 net tests: no-change snapshot advance, unkeyable survival, removals-only-on-change, no-on_ready/no-`_synced_once`, poll-tick single reconcile + announce, poll-error cool-down-before-restart, missing/blank username hard-fail. Removed 3 obsolete `on_ready`-based tests.

## Decisions Made
- Kept `sync_store` and `delete_store_snapshot` inside the `if result["changed"]:` branch while moving the snapshot upsert out — `removed` is empty on a no-change cycle and a repo commit only makes sense on change (D-06 preserved).
- Duplicate-`checkoutUrl` entries are treated as unkeyable and carried through (only the first occurrence keys the reconcile) so two products sharing a URL no longer collapse to one lost entry.

## Deviations from Plan

None - plan executed exactly as written. (Note on the WR-04 acceptance grep: `grep -n "on_ready"` returns 2 matches, but both are docstring text documenting the CR-01 removal — the actual listener and `_synced_once` flag are gone; `_synced_once` greps to zero.)

## Issues Encountered
None.

## Threat Flags
None — no new security surface introduced; changes tighten existing trust boundaries (T-09-09-01..05 all mitigated as planned).

## User Setup Required
None - no external service configuration required. The live `nocturna-bot` on the cinema host must `git pull` + restart the systemd unit to pick up these cog changes (standard for any cog update).

## Next Phase Readiness
- Cog-side sync/poll orchestration defects from 09-REVIEW (WR-03, CR-01, WR-02, WR-04, WR-06) are all closed. Remaining phase-09 gap-closure plan 09-10 (if any) can build on this hardened cog.

## Self-Check: PASSED
- FOUND: `../nocturna-bot/cogs/jinxxy.py` (modified, committed `e1dee82`/`ef871a4`/`eaad5ef`)
- FOUND: `../nocturna-bot/tests/test_jinxxy_cog.py` (modified, committed `1f48cc4`/`0f53d2c`/`1a1728a`)
- FOUND commits: 1f48cc4, e1dee82, 0f53d2c, ef871a4, 1a1728a, eaad5ef
- Full suite: 331 passed, 0 failed.

---
*Phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse*
*Completed: 2026-07-11*
