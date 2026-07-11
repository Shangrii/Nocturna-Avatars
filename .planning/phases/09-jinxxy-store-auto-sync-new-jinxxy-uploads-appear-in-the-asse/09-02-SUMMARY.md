---
phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse
plan: 02
subsystem: api
tags: [jinxxy, requests, http-client, rate-limit, pagination, python, bot]

# Dependency graph
requires:
  - phase: 09-01
    provides: "config.JINXXY_API_KEY block + store_snapshot table in the bot repo"
  - phase: 05
    provides: "core/github_publish.py HTTP idiom (header-only secret, typed error, explicit timeout)"
provides:
  - "core/jinxxy_api.py — the Creator API read client: list_all_products, get_product, get_me"
  - "HTTP-mocked unit tests (pagination, x-api-key header, key-not-logged, timeout, 429 backoff)"
  - "Typed JinxxyAPIError contract the store-sync cog/transport will depend on"
affects: [09-03, 09-04, 09-05, store_sync, cogs/jinxxy]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Creator API read client mirrors github_publish.py: header-only secret read at call time, explicit (10,60)s timeout, one typed error interpolating only exc.__class__.__name__"
    - "Bounded 429 backoff honoring Retry-After / X-RateLimit-Reset with exponential fallback"
    - "Never-mask-failure-as-empty: any unrecoverable read raises, never returns [] (removal-safety)"

key-files:
  created:
    - "../nocturna-bot/core/jinxxy_api.py"
    - "../nocturna-bot/tests/test_jinxxy_api.py"
  modified: []

key-decisions:
  - "429 backoff prefers Retry-After then X-RateLimit-Reset (as delta seconds), falling back to bounded exponential backoff (0.5*2^n), capped at 4 retries then raises"
  - "list_all_products loops page 1..page_count with limit=100 + sort created_at desc, concatenating results; raises on any failure so an outage is never mistaken for an empty storefront (T-09-05)"
  - "The full list/detail/429 implementation shipped in Task 1's GREEN feat commit (single cohesive module); Task 2 added its behavioral tests, which pass against it"

patterns-established:
  - "HTTP read-client idiom: _headers/_ok/_require/_http/_get with header-only auth + typed errors, reusable by future Creator API reads"
  - "FakeJinxxy programmable HTTP fake with per-endpoint status queues (mirrors FakeGitHub in test_reviews_publish.py)"

requirements-completed: [STORE-SYNC-01]

# Metrics
duration: 15min
completed: 2026-07-11
---

# Phase 09 Plan 02: Jinxxy Creator API Read Client Summary

**A thin, pure, `requests`-based Jinxxy Creator API read client — paginated `list_all_products`, per-product `get_product`, and `/me` — with header-only `x-api-key` auth, explicit timeouts, one typed `JinxxyAPIError`, and bounded 429 backoff, unit-tested with HTTP mocked.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-11T02:45:00Z
- **Completed:** 2026-07-11T03:00:00Z
- **Tasks:** 2
- **Files modified:** 2 (both new, in the `nocturna-bot` repo)

## Accomplishments
- `core/jinxxy_api.py`: `get_me()`, `list_all_products()`, `get_product()` on `https://api.creators.jinxxy.com/v1`, importing only `logging`/`time`/`requests`/`config` (no `discord`).
- Header-only `x-api-key` secret read at call time and placed only in a request header — provably never logged and never present in any error message (test-verified).
- Every call carries an explicit `(10, 60)`s timeout; all `requests` failures collapse into one `JinxxyAPIError` naming only `exc.__class__.__name__` (never `str(exc)`, the url, or the key).
- Bounded 429 backoff (Retry-After / X-RateLimit-Reset hint, else exponential) recovers on transient rate-limits and raises after a small retry cap.
- Pagination follows `page_count` with `limit=100 & sort_field=created_at & sort_order=desc`; any mid-pagination failure raises rather than returning a partial or empty list (T-09-05 removal-safety).
- 14 new HTTP-mocked tests; full bot suite green at **248 passed** (was 234).

## Task Commits

Each task was committed atomically in the `nocturna-bot` repo (branch `main`):

1. **Task 1 (RED): failing tests for client core** - `035f8c8` (test)
2. **Task 1 (GREEN): HTTP core, headers, typed errors, /me** - `2c38d36` (feat)
3. **Task 2: pin pagination, get_product, 429 backoff** - `2aaff79` (test)

**Plan metadata:** committed in the website repo (docs: complete plan).

_Note: the list/detail/429 code shipped in the Task 1 `feat` (`2c38d36`) because `jinxxy_api.py` is one cohesive module; Task 2's `test` commit pins that behavior. RED→GREEN gate for the plan is satisfied by `035f8c8` (test) → `2c38d36` (feat)._

## Files Created/Modified
- `../nocturna-bot/core/jinxxy_api.py` - Creator API read client (list/detail/`/me`, header auth, typed errors, 429 backoff)
- `../nocturna-bot/tests/test_jinxxy_api.py` - 14 HTTP-mocked unit tests (FakeJinxxy fake + `wire` fixture)

## Decisions Made
- **429 hint precedence:** `Retry-After` → `X-RateLimit-Reset` → exponential backoff (`0.5 * 2^n`), max 4 retries, then raise. Malformed header values fall back to backoff.
- **Failure never means empty:** `list_all_products` raises on any transport/non-2xx failure; it never returns `[]` or a partial page on error, so the downstream sync cannot mass-remove the storefront on an outage (T-09-05).
- **Single-module cohesion over strict per-task file split:** the whole client was implemented in the Task 1 GREEN commit; Task 2 contributed only tests.

## Deviations from Plan

None - plan executed exactly as written. (Both tasks are RED+GREEN; the module's list/detail/429 functions were written during Task 1's GREEN because they live in the same file, and Task 2 added the behavioral tests that pin them — no behavior or scope changed.)

## Issues Encountered
None. Git emitted the usual `LF will be replaced by CRLF` warnings on Windows (cosmetic, not an error).

## TDD Gate Compliance
- RED gate: `035f8c8` (`test(...)`) — committed with the module absent, so collection failed (all tests red).
- GREEN gate: `2c38d36` (`feat(...)`) — module implemented, Task 1 filtered suite green (7 passed).
- Task 2 verification: `2aaff79` (`test(...)`) — pagination/detail/429 tests green (14 passed total).
- No REFACTOR commit needed.

## User Setup Required
None for this plan. (`JINXXY_API_KEY` must exist in the bot host `.env` before the sync cog runs live — that is a later plan's concern; this client reads it at call time and the tests inject a fake key.)

## Next Phase Readiness
- The read client is ready to be consumed by `core/store_sync.py` (mapping/merge) and `core/github_publish.py` (object-aware store transport) in later Phase 9 plans.
- `get_me()` returns the store username + owner display name that `map_product` needs for checkoutUrl construction (D-17) and the `editor` default (D-09).
- No blockers.

## Self-Check: PASSED
- `../nocturna-bot/core/jinxxy_api.py` — FOUND
- `../nocturna-bot/tests/test_jinxxy_api.py` — FOUND
- Commit `035f8c8` — FOUND
- Commit `2c38d36` — FOUND
- Commit `2aaff79` — FOUND

---
*Phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse*
*Completed: 2026-07-11*
