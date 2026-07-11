---
phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse
plan: 07
subsystem: bot-store-sync
tags: [merge, transport, staff-owned, regraft, resurrect, TDD, gap-closure]
requires:
  - core/github_publish.py::_sync_store_sync.build_tree (09-04 object-aware transport)
  - core/store_sync.py::three_way_merge (09-03 pure merge core)
provides:
  - "build_tree re-grafts staff-owned fields (STAFF_OWNED + editor) from the freshly-fetched store.json, keyed by checkoutUrl, before writing — a concurrent /tienda medios attach is never reverted"
  - "three_way_merge resurrects a complete entry from live on current-is-None (never {}), covering both brand-new and staff-deleted-still-live products"
affects:
  - cogs/jinxxy.py (09-05/09-09 — the cog that invokes sync_store + reconcile_store)
tech-stack:
  added: []
  patterns:
    - "checkoutUrl-keyed re-graft of staff-owned keys from the fresh fetch inside build_tree (closes the concurrent-attach commit window)"
    - "single guard broadened to current is None reuses the exact new-product resurrection logic for the delete-while-live case"
key-files:
  created: []
  modified:
    - ../nocturna-bot/core/github_publish.py
    - ../nocturna-bot/core/store_sync.py
    - ../nocturna-bot/tests/test_store_publish.py
    - ../nocturna-bot/tests/test_store_sync.py
decisions:
  - "Imported core.store_sync into github_publish for a single source of truth on the STAFF_OWNED key set (store_sync is stdlib-only, no import cycle); graft key set = STAFF_OWNED + editor"
  - "Broadened the merge creation guard from 'snapshot is None and current is None' to 'current is None' rather than adding a parallel branch — one code path, zero duplication, unregressed new-product shape"
metrics:
  duration: ~14 min
  completed: 2026-07-11
---

# Phase 09 Plan 07: Store-Sync Merge/Transport Gap Closure Summary

Closes the two merge/transport BLOCKERS behind the phase's headline promise "staff hand-edits are never clobbered" (gap #1): `build_tree` now re-grafts staff-owned fields from the freshly-fetched `store.json` (WR-01) and `three_way_merge` resurrects a complete entry from live when `current is None` (WR-05) — both pinned by new TDD tests.

## What Was Built

**Task 1 — WR-01 re-graft (`core/github_publish.py`):** `_sync_store_sync.build_tree(cur)` receives the FRESHLY-fetched store on every commit/retry via `_commit_with_retry(fetch=...)`. It now builds a `fresh` lookup keyed by `checkoutUrl` and re-grafts the staff-owned key set (`store_sync.STAFF_OWNED` + `editor` = id/description/images/featured/license/details/updates/storefronts/editor) onto each pre-computed product before writing — grafting each key only when present in the fresh entry. Sync-owned fields still come from the merged list so Jinxxy changes propagate; a product absent from the fresh fetch (a genuinely new product) is written verbatim with no graft. This closes the race where a `/tienda medios` attach lands inside the commit window (JINXXY_DEPLOY.md tells staff to run one per product right after the first sync) and would otherwise be silently reverted.

**Task 2 — WR-05 resurrect-from-live (`core/store_sync.py`):** The merge creation-branch guard was broadened from `if snapshot is None and current is None:` to `if current is None:`. Now BOTH a brand-new product (snapshot None) AND a product staff deleted from `store.json` while it is still live on Jinxxy (snapshot present) resurrect from `live` as a complete entry (`dict(live)` + generated string `id` + `description={"es":"","en":""}`), returning `(merged, [f for f in SYNC_OWNED if f in merged])`. No empty/partial `{}` can ever be appended to `products`. `reconcile_store` bucketing was unchanged — a snapshot-present resurrection is correctly bucketed as `updated`, not `added`.

## Task-by-Task

| Task | Name | Commits | Result |
| ---- | ---- | ------- | ------ |
| 1 | Re-graft staff fields from fresh fetch (WR-01) | `4ebdadb` (test/RED), `103cf48` (fix/GREEN) | test_store_publish.py 18 passed |
| 2 | current-is-None resurrect-from-live (WR-05) | `f2fe471` (test/RED), `39f89e0` (fix/GREEN) | test_store_sync.py 27 passed |

## Verification

- `python -m pytest tests/test_store_publish.py -q` → 18 passed (added 2 WR-01 tests).
- `python -m pytest tests/test_store_sync.py -q` → 27 passed (added 3 WR-05 tests; all 24 pre-existing merge/reconcile tests green).
- Full suite `python -m pytest -q` → **318 passed** (was 313; +5 new tests, no regression).
- Source assertions: `build_tree` grafts from a `fresh = {p["checkoutUrl"]: p ...}` lookup (github_publish.py L612); `three_way_merge` has an explicit `if current is None:` branch (store_sync.py L120).

## Success Criteria

- [x] A sync commit preserves staff `images`/`description` present in the live store.json even when the merged products list omitted them (WR-01 closed).
- [x] A staff-deleted-still-live product resurrects as a complete entry, never `{}` (WR-05 closed).
- [x] No regression in the existing store transport or merge tests.

## TDD Gate Compliance

Both tasks followed RED → GREEN. Per task: a `test(...)` commit landed with a confirmed-failing test (Task 1: `KeyError: 'images'`; Task 2: 3 failures incl. empty `updated` bucket), then a `fix(...)` commit made it pass. No REFACTOR needed (both fixes were minimal and clean).

## Threat Model Coverage

| Threat ID | Disposition | Status |
| --------- | ----------- | ------ |
| T-09-07-01 (Tampering — build_tree overwriting fresh staff fields) | mitigate | Closed — re-graft of the staff-owned keys from `cur` |
| T-09-07-02 (Tampering — three_way_merge emitting `{}`/partial garbage) | mitigate | Closed — explicit `current is None` resurrection |
| T-09-07-SC (pip installs) | accept | No new dependencies added |

## Deviations from Plan

None — plan executed exactly as written. The plan offered "import `store_sync` or inline the literal 9-key tuple"; chose the import (single source of truth) since `store_sync` is stdlib-only with no import cycle back to `github_publish`.

## Known Stubs

None. Both changes are complete, tested behavior paths.

## Self-Check: PASSED

- Modified files exist: `../nocturna-bot/core/github_publish.py`, `../nocturna-bot/core/store_sync.py`, `../nocturna-bot/tests/test_store_publish.py`, `../nocturna-bot/tests/test_store_sync.py` — all present.
- Commits exist in nocturna-bot: `4ebdadb`, `103cf48`, `f2fe471`, `39f89e0` — all confirmed in git log.
