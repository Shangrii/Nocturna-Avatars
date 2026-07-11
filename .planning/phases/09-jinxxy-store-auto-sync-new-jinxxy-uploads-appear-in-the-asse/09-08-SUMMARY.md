---
phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse
plan: 08
subsystem: bot / jinxxy-store-sync
gap_closure: true
tags: [security, dos-hardening, rate-limit, tdd]
requires:
  - "core/jinxxy_api.py::_retry_delay (existing 429 backoff path)"
provides:
  - "_MAX_BACKOFF-clamped _retry_delay: every 429 backoff branch is bounded"
  - "epoch-aware X-RateLimit-Reset handling (delta via - time.time())"
affects:
  - "cogs/jinxxy.py poll + /tienda sync (via asyncio.to_thread → jinxxy_api._get)"
tech-stack:
  added: []
  patterns:
    - "Untrusted server header values are converted + clamped before driving time.sleep"
key-files:
  created: []
  modified:
    - "../nocturna-bot/core/jinxxy_api.py"
    - "../nocturna-bot/tests/test_jinxxy_api.py"
decisions:
  - "_MAX_BACKOFF = 60.0s hard cap on all three _retry_delay branches"
  - "Retry-After and X-RateLimit-Reset handled in SEPARATE branches (epoch vs delta)"
metrics:
  duration: ~12min
  completed: 2026-07-11
  tasks: 1
  files: 2
  tests: "324 passed (was 322); +6 tests on _retry_delay"
requirements: [STORE-SYNC-01]
---

# Phase 09 Plan 08: Clamp 429 Backoff (CR-02) Summary

Closed the second BLOCKER (gap #2 / CR-02): a server-controlled 429 `Retry-After` or `X-RateLimit-Reset` header can no longer drive an unbounded `time.sleep()` that freezes the store-sync thread for decades — every backoff branch is now clamped to a 60s cap, and the epoch-valued reset header is converted to a delta before clamping.

## What Was Built

`core/jinxxy_api.py::_retry_delay` was rewritten from a single OR'd-hint branch (`max(0.0, float(Retry-After OR X-RateLimit-Reset))`, no cap) into three clamped branches:

1. `Retry-After` (a delta in seconds) → `min(_MAX_BACKOFF, max(0.0, float(value)))`
2. `X-RateLimit-Reset` (a unix epoch timestamp) → `min(_MAX_BACKOFF, max(0.0, float(value) - time.time()))`
3. malformed / absent hint → clamped exponential fallback `min(_MAX_BACKOFF, _BACKOFF_BASE * (2 ** attempt))`

A new module constant `_MAX_BACKOFF = 60.0` sits with the other backoff constants. The key semantic fix: the old code OR'd the two headers, mis-reading the epoch `X-RateLimit-Reset` as a raw delta (`float("1786000000")` → a ~56-year sleep). They are now separate branches with epoch→delta conversion. The module + function docstrings were updated to state the cap and the epoch-vs-delta distinction.

## Why It Matters

`_get` passes `_retry_delay`'s result straight into `time.sleep()` on a 429, and that call runs inside `asyncio.to_thread` for the scheduled 6-12h poll and `/tienda sync`. An unbounded sleep never returns, never raises, so the poll's `@_poll.error` restart path never fires — permanently disabling the automatic-sync half of the phase goal (STORE-SYNC-01) until a process restart. The clamp guarantees the scheduled poll always makes progress.

## TDD Flow

- **RED** (`ef7a89f`): 6 tests pinning the clamp — huge `Retry-After` → `_MAX_BACKOFF`; far-future epoch `X-RateLimit-Reset` → `_MAX_BACKOFF`; past-epoch reset ≥ 0.0; small `Retry-After` (`"2"`) unchanged; malformed header + high-attempt fallback both clamped. 5 failed on the missing `_MAX_BACKOFF` reference / epoch handling (one passed as unchanged-behavior).
- **GREEN** (`a96224a`): added `_MAX_BACKOFF`, rewrote `_retry_delay` into the three clamped branches. All 20 `test_jinxxy_api.py` tests pass; full bot suite 324 passed.
- **REFACTOR**: none needed — the fix is small and self-contained.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Missing `import time` in the test module**
- **Found during:** Task 1 GREEN (first full run failed 2 epoch tests with `NameError: name 'time' is not defined`)
- **Issue:** The new epoch tests compute `time.time()` but `tests/test_jinxxy_api.py` never imported `time` (the production module owns the only `time` reference in the existing tests).
- **Fix:** Added `import time` to the test module.
- **Files modified:** `../nocturna-bot/tests/test_jinxxy_api.py`
- **Commit:** `a96224a` (folded into the GREEN commit alongside the implementation)

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|------------|
| T-09-08-01 (DoS via unbounded sleep) | `_MAX_BACKOFF` (60s) clamps every branch |
| T-09-08-02 (epoch header mis-read as delta) | `X-RateLimit-Reset` converted via `- time.time()` before clamping |
| T-09-08-SC (pip supply chain) | No new dependencies — edits an existing module + its test only |

## Verification

- `python -m pytest tests/test_jinxxy_api.py -q` → 20 passed (was 14; +6)
- `python -m pytest -q` (full suite) → 324 passed, 2 warnings (was 322; unregressed)
- Source assertion: `grep -n "_MAX_BACKOFF" core/jinxxy_api.py` → constant defined (L52) + referenced in all three return branches (L114, L121, L124)

## Commits (nocturna-bot repo)

- `ef7a89f` test(09-08): pin _retry_delay clamp + epoch reset handling (CR-02)
- `a96224a` fix(09-08): clamp _retry_delay to _MAX_BACKOFF, epoch-aware reset (CR-02)

## Self-Check: PASSED
- `../nocturna-bot/core/jinxxy_api.py` — FOUND (modified, `_MAX_BACKOFF` present)
- `../nocturna-bot/tests/test_jinxxy_api.py` — FOUND (modified, +6 tests, `import time`)
- Commit `ef7a89f` — FOUND
- Commit `a96224a` — FOUND
