---
phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse
plan: 04
subsystem: infra
tags: [github-git-data-api, store-sync, cross-repo, transport, requests, tdd, bot]

# Dependency graph
requires:
  - phase: 09-01
    provides: "config.WEBSITE_STORE_JSON + WEBSITE_STORE_IMAGE_DIR constants"
  - phase: 07-02
    provides: "_commit_with_retry(fetch=...) generalization + _fetch_json + _commit_lock reused unchanged"
  - phase: 05-02
    provides: "atomic blobs->tree->commit->ref transport + _create_blob mixed blob+JSON shape (from _publish_sync)"
provides:
  - "core/github_publish.py: _fetch_json_object/_fetch_store — object-aware store.json reader that preserves _comment + staff top-level keys"
  - "sync_store(products) — commits the whole products list, mutating ONLY products, with a defensive no-op guard"
  - "attach_store_media(checkout_url, media, description) — staff images (public/store blobs) + description written into the matched product in ONE commit (D-15 write-path)"
affects: [09-05-jinxxy-cog, 09-06-attach-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Object-aware cross-repo JSON transport: a dict-expecting sibling of the array _fetch_json that copies the whole current object and mutates only one key, so a schema-doc/staff keys survive every commit"
    - "Defensive no-op guard on an object sync (fetch + equality compare) preventing empty commits / Pages rebuilds (T-09-12)"

key-files:
  created:
    - "../nocturna-bot/tests/test_store_publish.py"
  modified:
    - "../nocturna-bot/core/github_publish.py"

key-decisions:
  - "store.json is read/written as an OBJECT via _fetch_json_object (raises on array / missing-products body); _fetch_json/gallery/reviews array contract left byte-for-byte untouched"
  - "build_tree copies the whole current dict and replaces only products (sync) or one product's staff fields (attach) — _comment and unknown top-level keys provably survive (T-09-10)"
  - "attach_store_media matches by checkoutUrl (D-13 link key) and RAISES on no-match — never a silent no-op that discards staff-uploaded work; images stored as site-relative /store/<file>, blobs under WEBSITE_STORE_IMAGE_DIR (public/store)"
  - "images/description are 100% staff-owned (D-15): attach sets images only when media supplied and description only when supplied, each independent"

patterns-established:
  - "Object-preserving commit: dict(current) + single-key mutation keeps every staff-owned top-level field through a cross-repo write"

requirements-completed: [STORE-SYNC-01]

# Metrics
duration: 5min
completed: 2026-07-11
---

# Phase 09 Plan 04: Object-Aware Store Transport Summary

**An OBJECT-aware `store.json` cross-repo transport — `_fetch_store` reads the `{_comment, products}` dict, `sync_store` rewrites only `products` (preserving `_comment` + staff keys) with a defensive no-op guard, and `attach_store_media` commits staff images (`public/store` blobs → `/store/<file>` paths) + description into the matched product in one atomic commit — reusing the Phase-5/7 retry core, lock, and typed errors unchanged.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-07-11T03:10:41Z
- **Completed:** 2026-07-11T03:16:09Z
- **Tasks:** 2 (both TDD)
- **Files modified:** 2 (all in ../nocturna-bot)

## Accomplishments
- Added `_fetch_json_object`/`_fetch_store` — a dict-expecting variant of `_fetch_json` (same content/raw-media fallback, same typed-error normalization) that returns the WHOLE store object and rejects an array body or a dict missing `products`. `_fetch_json` itself is untouched, so gallery/reviews keep their array contract.
- Added `sync_store(products, *, message=None)`: copies the current dict, replaces only `products`, and commits via `_commit_with_retry(fetch=_fetch_store)` — `_comment` and any staff-added top-level key survive. A defensive no-op short-circuit (`committed: False`, no ref PATCH) when the new list equals the current one prevents empty commits / Pages rebuilds.
- Added `attach_store_media(checkout_url, media=(), description=None)`: writes one image blob per `(webp_bytes, filename)` under `WEBSITE_STORE_IMAGE_DIR` and sets the matched product's `images` to site-relative `/store/<file>` paths + its `description`, all in ONE commit (mirrors the gallery mixed blob+JSON shape). Matches by `checkoutUrl`; raises `GitHubPublishError` on no-match; images-only and description-only are independent.
- Added `tests/test_store_publish.py` (16 HTTP-mocked tests) pinning the load-bearing `_comment`-survives assertion, object-shape rejection, the no-op guard, and the atomic media commit.

## Task Commits

Each task was committed atomically in the `nocturna-bot` repo (TDD RED → GREEN):

1. **RED — failing tests for both mechanics** - `d008398` (test)
2. **GREEN — object-aware store transport (sync_store + attach_store_media)** - `79fa689` (feat)

_Note: both TDD tasks (Task 1 `_fetch_store`/`sync_store`, Task 2 `attach_store_media`) share the `_fetch_store` object-aware foundation and live in one module; the RED gate covered both, and GREEN landed them in one cohesive `github_publish.py` edit._

**Plan metadata:** committed in the website repo with this SUMMARY + STATE/ROADMAP/REQUIREMENTS.

## Files Created/Modified
- `../nocturna-bot/core/github_publish.py` - `_fetch_json_object`/`_fetch_store` (object reader) + `_sync_store_sync`/`sync_store` + `_attach_store_media_sync`/`attach_store_media`
- `../nocturna-bot/tests/test_store_publish.py` - 16 HTTP-mocked store transport tests (FakeGitHub serving an object body + image blobs)

## Decisions Made
None beyond the plan-specified decisions (D-12/D-13/D-15, T-09-10/T-09-12). Followed plan as written.

## Deviations from Plan

None - plan executed exactly as written.

The two TDD tasks were implemented in a single `github_publish.py` edit rather than two separate feat commits, because Task 2's `attach_store_media` builds directly on Task 1's `_fetch_store` object-aware foundation and both live in the same module. The TDD gate order (test RED commit before feat GREEN commit) is preserved, and the full 16-test suite is green.

## Issues Encountered
None. RED confirmed all 16 tests failing (functions absent); GREEN passed all 16 plus the 26-test gallery/reviews regression suite. Full bot suite: 288 passed (was 272 after 09-03) — no regressions.

## Threat Model Compliance
- **T-09-10 (staff keys / `_comment` dropped on write):** `build_tree` copies the whole current dict and mutates only `products` (sync) or one product's `images`/`description` (attach). Tests assert `_comment` and an extra top-level key survive `sync_store`, and that non-matched products are byte-identical after `attach_store_media`. Mitigated.
- **T-09-11 (GITHUB_PAT in logs):** reuses `_headers`/`_http` unchanged — PAT header-only, never logged; the `test_attach_media_authorization_header_is_bearer_pat_on_every_call` test asserts the Bearer header on every call. Mitigated.
- **T-09-12 (commit on every poll → Pages rebuilds):** `sync_store` no-op guard returns `committed: False` with no ref PATCH when the list is unchanged; the `test_sync_store_no_change_is_a_noop_no_commit` test verifies zero commits/patches. Mitigated.
- **T-09-13 (store commit racing gallery/reviews):** reuses the module-level `_commit_lock` + stale-ref retry (`test_sync_store_stale_ref_422_refetches_and_retries`). Mitigated.
- **T-09-SC (install surface):** no new packages added. Accepted.

## User Setup Required
None - no external service configuration required for this plan. The transport is called by the 09-05 cog; the live `.env` `JINXXY_API_KEY`/`GITHUB_PAT` requirement is already tracked from 09-01/09-02.

## Next Phase Readiness
- `sync_store` and `attach_store_media` are the write-path the 09-05 Jinxxy cog will call after `reconcile_store` (09-03) reports changes, and the D-15 attach flow (09-06) will call for staff images/description.
- Gallery + reviews transports remain byte-for-byte unchanged; the object-aware path is fully isolated.

## Self-Check: PASSED
- `_fetch_json_object`/`_fetch_store`/`_sync_store_sync`/`_attach_store_media_sync`/`sync_store`/`attach_store_media` — all found in `../nocturna-bot/core/github_publish.py`
- Commit `d008398` (RED) — found in nocturna-bot git log
- Commit `79fa689` (GREEN) — found in nocturna-bot git log
- `../nocturna-bot/tests/test_store_publish.py` — exists (16 tests, all passing)
- Full bot suite 288 passed (26-test gallery/reviews regression unregressed)

---
*Phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse*
*Completed: 2026-07-11*
