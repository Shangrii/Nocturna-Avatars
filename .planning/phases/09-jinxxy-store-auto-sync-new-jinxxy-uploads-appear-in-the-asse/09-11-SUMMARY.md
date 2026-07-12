---
phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse
plan: 11
subsystem: infra
tags: [jinxxy, store-sync, github-publish, discord-bot, tdd, three-way-merge]

# Dependency graph
requires:
  - phase: 09-09
    provides: "WR-03 unconditional snapshot advance + WR-06 unkeyable-carry in _run_sync"
  - phase: 09-04
    provides: "github_publish.sync_store cross-repo store.json transport (raises GitHubPublishError)"
provides:
  - "_run_sync reordered: gated cross-repo commit runs BEFORE the unconditional snapshot upsert loop"
  - "A failed commit (GitHubPublishError) leaves the durable snapshot behind → change retried next cycle, never silently dropped"
  - "Regression test test_run_sync_commit_failure_does_not_advance_snapshot pinning the invariant"
affects: [jinxxy-store-auto-sync, store_snapshot, three_way_merge]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Commit-before-advance ordering: durable state only advances after the side effect it describes has landed"

key-files:
  created: []
  modified:
    - ../nocturna-bot/cogs/jinxxy.py
    - ../nocturna-bot/tests/test_jinxxy_cog.py

key-decisions:
  - "Snapshot advance moved AFTER the gated sync_store commit so a GitHubPublishError skips the advance and the change is retried next cycle (fixes 09-VERIFICATION truth #5)"
  - "Removal loop kept gated on result['changed'] and after the commit — removal-safety (T-09-11-03) unchanged"

patterns-established:
  - "Commit-before-advance: a raise from the transport must skip the durable-state advance so a transient failure becomes a clean retry, not a silent loss"

requirements-completed: [STORE-SYNC-01]

# Metrics
duration: 8min
completed: 2026-07-11
---

# Phase 9 Plan 11: Snapshot-Before-Commit Reorder Summary

**`_run_sync` now runs the gated cross-repo commit BEFORE the unconditional store-snapshot upsert, so a transient GitHubPublishError leaves the snapshot behind for a clean next-cycle retry instead of silently dropping a legitimate Jinxxy price/name/category/nsfw/date update.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-11
- **Completed:** 2026-07-11
- **Tasks:** 2 (TDD: RED test → GREEN fix)
- **Files modified:** 2 (both in ../nocturna-bot)

## Accomplishments
- Closed the sole remaining Phase-9 blocker (09-VERIFICATION.md truth #5, was `failed`): a commit failure after a genuine Jinxxy change no longer advances the durable snapshot past an un-written `store.json`.
- Reordered `_run_sync` tail into three sequential blocks: (5) gated `sync_store` commit, (6) unconditional `upsert_store_snapshot` loop, (7) gated `delete_store_snapshot` removal loop.
- Added a regression test proving the snapshot does not advance across a failed commit; full bot suite green at 338 passed (was 337).

## Task Commits

Each task was committed atomically in the `nocturna-bot` repo:

1. **Task 1: Failing regression test (RED)** - `901d902` (test) — `nocturna-bot`
2. **Task 2: Reorder _run_sync — commit before snapshot advance (GREEN)** - `cf91348` (fix) — `nocturna-bot`

**Plan metadata:** committed in the website repo (this SUMMARY + STATE.md).

_TDD: RED (test) then GREEN (fix), as the plan specified._

## Files Created/Modified
- `../nocturna-bot/tests/test_jinxxy_cog.py` - Added `test_run_sync_commit_failure_does_not_advance_snapshot`: wires a changed=True field update, makes `github_publish.sync_store` raise `GitHubPublishError`, asserts no snapshot upsert for KEY and no removals.
- `../nocturna-bot/cogs/jinxxy.py` - Reordered `_run_sync` tail: gated `sync_store` commit (step 5) now precedes the unconditional snapshot upsert loop (step 6); removal loop (step 7) stays gated and after the commit. Step-numbering comments updated to state the raise intentionally skips the snapshot advance.

## Decisions Made
- None beyond the plan — executed exactly as specified (CR-01 second-pass fix sketch).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. RED failed on the predicted assertion (`not any(... == KEY)` — the pre-commit upsert had already recorded KEY), not a collection/import error; GREEN turned it and the full suite green on the first reorder.

## Threat Surface
- Reorder only; no new external inputs, secrets, endpoints, or dependencies introduced. T-09-11-01 (Tampering: snapshot vs store.json) mitigated and pinned by the new test; T-09-11-03 (removal-safety) preserved (removal stays gated + post-commit). No threat flags.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- STORE-SYNC-01 unblocked; 09-VERIFICATION truth #5 satisfied. WR-03 unconditional advance and removal-safety both preserved.
- The `cinema` production bot host still runs pre-fix code — a `git pull` + `nocturna-bot` systemd restart is needed to pick up `901d902`/`cf91348` (standing bot-deploy note, not a new blocker).

## Self-Check: PASSED
- `../nocturna-bot/tests/test_jinxxy_cog.py` — FOUND (test defined, suite 338 passed)
- `../nocturna-bot/cogs/jinxxy.py` — FOUND (sync_store L202 precedes upsert loop L212; removal loop L226 gated)
- Commit `901d902` (nocturna-bot) — FOUND
- Commit `cf91348` (nocturna-bot) — FOUND

---
*Phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse*
*Completed: 2026-07-11*
