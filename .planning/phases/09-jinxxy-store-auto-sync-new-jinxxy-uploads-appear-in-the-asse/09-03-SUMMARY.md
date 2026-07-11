---
phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse
plan: 03
subsystem: api
tags: [jinxxy, store-sync, three-way-merge, pure-functions, tdd, python, discord-bot]

# Dependency graph
requires:
  - phase: 09-01
    provides: store_snapshot table (checkout_url PK, D-13) + Jinxxy config block in nocturna-bot
  - phase: 09-02
    provides: core/jinxxy_api.py Creator API read client (get_me/list_all_products/get_product)
  - phase: 06-asset-store
    provides: locked store.json schema (id, name{es,en}, description{es,en}, price, images[], checkoutUrl, editor, category, nsfw, featured, date) + StorePage.astro structural filter (L71-78)
provides:
  - "core/store_sync.py — map_product, three_way_merge, reconcile_store, is_https_url (all pure, stdlib-only)"
  - "D-12 field-ownership three-way merge that provably never clobbers staff edits"
  - "whole-store reconcile computing adds/updates/removals + a changed flag, with removal-safety (T-09-09)"
affects: [09-05, jinxxy-cog, store-transport, github_publish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure sync core mirroring the reminders.py pure-helper idiom (import-safe, no discord/requests/db)"
    - "Three-way (snapshot/live/current) field-ownership merge classifier returning (merged_entry, changed_fields)"

key-files:
  created:
    - ../nocturna-bot/core/store_sync.py
    - ../nocturna-bot/tests/test_store_sync.py
  modified: []

key-decisions:
  - "editor is carried from current (never re-sourced from live) after creation — D-09 staff-editable; it is neither in the sync-owned merge set nor an explicit staff-owned key, so the merge preserves it by starting merged=dict(current)"
  - "changed_fields = sync-owned fields whose merged value differs from current — drives reconcile's updated bucket and the no-op guard"
  - "new-product id = final path segment (slug) of checkoutUrl — stable/deterministic, no random UUID churn"

patterns-established:
  - "three_way_merge starts merged=dict(current) then overwrites only sync-owned fields — staff-owned keys (and any forward-compat extras) survive by never being touched, guaranteeing 'never sourced from live'"
  - "reconcile_store removes a product only when it had a snapshot (was synced before); a current-only staff-added entry is always preserved"

requirements-completed: [STORE-SYNC-01]

# Metrics
duration: 4min
completed: 2026-07-11
---

# Phase 9 Plan 03: Pure Store-Sync Core Summary

**Pure Jinxxy-detail → store.json mapper + D-12 three-way field-ownership merge + whole-store reconcile (add/update/remove) in core/store_sync.py — 24 unit tests, zero Discord/network/DB.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-11T02:59:50Z
- **Completed:** 2026-07-11T03:04:32Z
- **Tasks:** 2 (both TDD RED+GREEN)
- **Files modified:** 2 (both created, in ../nocturna-bot)

## Accomplishments
- `map_product` builds only the sync-owned field set from probe-confirmed Jinxxy fields (D-09/10/16/17): `checkoutUrl` constructed from the slug, `name` verbatim into both locales, `nsfw` from the `CONTENT_MATURE` restriction, `category` D-09 default, stringified `price`, `YYYY-MM-DD` date — never emitting staff-owned keys.
- `three_way_merge` implements all three D-12 branches (Jinxxy-unchanged→keep current, Jinxxy-changed-staff-untouched→take live, both-changed→staff wins for `name` else Jinxxy wins), carries every staff-owned key from `current` and never from `live`, and seeds a brand-new entry with a slug `id` + a present-but-empty `description` object so it passes StorePage.astro's L71-78 filter.
- `reconcile_store` computes adds/updates/removals + a `changed` flag keyed by `checkoutUrl`, removes a product only when a snapshot existed (T-09-09 mass-remove guard), and preserves any current-only staff-added entry.
- `is_https_url` guards the constructed checkout URL to `https://`-only (V5 / T-09-07).

## Task Commits

Each task followed a TDD RED→GREEN cycle, committed atomically in the **nocturna-bot** repo:

1. **Task 1: map_product + is_https_url** — `d70d56f` (test) → `fcbbc48` (feat)
2. **Task 2: three_way_merge + reconcile_store** — `1528306` (test) → `c9aa0a8` (feat)

**Plan metadata (website repo):** committed with this SUMMARY + STATE.md + ROADMAP.md + REQUIREMENTS.md.

_Code commits live in ../nocturna-bot; planning artifacts live in the website repo._

## TDD Gate Compliance

Gate sequence verified in git log for both tasks: a `test(09-03)` commit precedes its `feat(09-03)` commit (RED before GREEN). No REFACTOR commit was needed — the GREEN implementations were already clean. No test passed unexpectedly during RED (Task 1 RED was an ImportError; Task 2 RED was 12 AttributeErrors).

## Files Created/Modified
- `../nocturna-bot/core/store_sync.py` — pure sync core: `map_product`, `is_https_url`, `three_way_merge`, `reconcile_store` (stdlib-only, import-safe, no discord/requests/db).
- `../nocturna-bot/tests/test_store_sync.py` — 24 unit tests: mapping exactness, nsfw/category defaults, key-set purity, https guard, all D-12 merge branches, staff-owned carry-through, new-product shape, reconcile add/update/remove/no-op + current-only preservation.

## Decisions Made
- **`editor` is carried from `current` after creation** (never re-sourced from live). D-09 makes it staff-editable, and it is listed neither in the sync-owned merge set nor the explicit staff-owned key list. The merge preserves it (and any future forward-compat keys) by starting `merged = dict(current)` and overwriting only the six sync-owned fields. On creation it flows in from the mapped live entry.
- **`changed_fields` = sync-owned fields whose merged value differs from `current`.** This is the natural "what did the sync write" semantics; it drives reconcile's `updated` bucket and the no-op guard, and matches every branch test (unchanged→empty, take-live→field present, staff-wins-name→empty because output == current).
- **New-product `id` = final path segment (slug) of `checkoutUrl`.** Stable and deterministic (no random UUID that would churn the entry on every sync).

## Deviations from Plan

None - plan executed exactly as written. The plan left `editor`'s merge disposition implicit (it appears in `map_product` output but in neither the sync-owned nor staff-owned iteration lists); the `merged = dict(current)` implementation preserves it cleanly, consistent with D-09, without any extra code path. No auto-fixes (Rules 1-3) or architectural changes (Rule 4) were required.

## Issues Encountered
None. Both TDD cycles went RED→GREEN on the first implementation pass. The `gsd-sdk state.record-metric` / `add-decision` handlers required `--named` args (not positional) — resolved by inspecting the handler source.

## Known Stubs
None. Every function is fully implemented and test-covered.

## Threat Flags
None. No new security surface beyond the plan's threat model; the mitigations for T-09-07 (`is_https_url` + type normalization in `map_product`), T-09-08 (D-12 merge preserving staff edits), and T-09-09 (removal only when a snapshot existed) are all implemented and branch-tested.

## User Setup Required
None - no external service configuration required for this plan (pure functions; the cog + API wiring in 09-05 will consume them).

## Next Phase Readiness
- `core/store_sync.py` is ready for 09-05: the cog orchestrates snapshot (DB, from 09-01) / live (API, from 09-02) / current (store.json) into `reconcile_store`, then the object-aware `github_publish` store transport commits the result cross-repo.
- Full bot suite green: 272 passed (was 248). No blockers.

## Self-Check: PASSED
- FOUND: ../nocturna-bot/core/store_sync.py
- FOUND: ../nocturna-bot/tests/test_store_sync.py
- FOUND commit: d70d56f (test), fcbbc48 (feat), 1528306 (test), c9aa0a8 (feat)

---
*Phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse*
*Completed: 2026-07-11*
