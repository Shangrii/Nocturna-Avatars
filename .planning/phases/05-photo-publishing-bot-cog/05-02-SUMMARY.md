---
phase: 05-photo-publishing-bot-cog
plan: 02
subsystem: infra
tags: [discord-bot, github-git-data-api, requests, asyncio, cross-repo-commit, pillow-webp, gallery-json, tdd, pytest]

# Dependency graph
requires:
  - phase: 05-photo-publishing-bot-cog (plan 05-01)
    provides: "Phase-5 bot config surface (WEBSITE_REPO/WEBSITE_BRANCH/WEBSITE_GALLERY_JSON/WEBSITE_IMAGE_DIR/GITHUB_PAT), pytest harness + conftest sys.path bootstrap, core/image_optimize.py"
  - phase: 04-gallery-data-layer
    provides: "locked gallery.json entry shape { file, caption?, width, height, date } + public/gallery/<file> storage path"
provides:
  - "core/github_publish.py — async publish_message(message_id, entries, date=None) and remove_message(message_id) via the GitHub Git Data API (blobs -> tree -> commit -> ref)"
  - "atomic one-commit-per-message publish (image blobs by sha + gallery.json by content) — D-16"
  - "stateless removal derived from the exact {msgID} filename segment, sha:null tree delete + gallery.json rewrite — D-14"
  - "GitHubPublishError typed exception the cog catches to drive the D-19 failure UX"
  - "asyncio.Lock serialization + 409/422 stale-ref retry-with-backoff — D-18"
  - "17-test behaviour suite (tests/test_github_publish.py) proving the whole transport with HTTP mocked"
affects: [05-03 (publish cog wires publish_message), 05-04 (removal/auto-unpublish wires remove_message + catches GitHubPublishError), 05-05 (live PAT + end-to-end verification)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure transport module: stdlib + requests + config only, no discord — HTTP mocked in unit tests"
    - "async def public API wrapping blocking requests via asyncio.to_thread, serialized by a module-level asyncio.Lock"
    - "Optimistic-concurrency read-modify-commit-ref with rebuild-on-conflict (re-fetch ref, retry with exponential backoff)"

key-files:
  created:
    - "nocturna-bot/core/github_publish.py — atomic cross-repo commit + stateless removal transport"
    - "nocturna-bot/tests/test_github_publish.py — 17 behaviour tests (mocked GitHub Git Data API)"
  modified: []

key-decisions:
  - "Retry budget: _MAX_ATTEMPTS = 4 with exponential backoff _BACKOFF_BASE = 0.5s (0.5/1.0/2.0s), retry only on ref-PATCH 409/422 (D-18)"
  - "Typed error: GitHubPublishError(RuntimeError) — raised on retry exhaustion or any non-2xx; the cog (05-04) catches this for the D-19 persistent-error UX"
  - "Image blobs are created ONCE outside the retry loop (content-addressed, ref-independent); only the tree/commit/ref rebuild on conflict — no duplicate blob POSTs"
  - "publish_message(message_id, entries, date=None) — date defaults to now(UTC).isoformat(); the cog passes message.created_at; caption is per-entry and omitted when empty"
  - "return shape {committed, commit_sha, count, files}; a no-match removal returns committed=False with no HTTP commit (no empty commit, T-05-15)"

patterns-established:
  - "GitHub Git Data API 7-step atomic commit (git/ref -> git/commits -> contents -> git/blobs -> git/trees -> git/commits -> git/refs) as the cross-repo write primitive"
  - "Stateless message->files derivation via exact split('-')[1] middle segment (prefix-collision safe)"
  - "Secrets discipline: PAT only in the Authorization header, read from config at call time, never in any log/print"

requirements-completed: [BOT-04]

# Metrics
duration: 7min
completed: 2026-07-03
---

# Phase 5 Plan 02: Atomic Cross-Repo Commit Transport Summary

**`core/github_publish.py` — async publish/removal that commits image blobs + `gallery.json` (or `sha:null`-deletes a message's photos) as ONE atomic commit against the website repo via the GitHub Git Data API, with an `asyncio.Lock` + 409/422 retry-with-backoff and a PAT that never touches the logs.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-03T17:23:39Z
- **Completed:** 2026-07-03T17:29:40Z
- **Tasks:** 2 (TDD: RED + GREEN)
- **Files modified:** 2 created (bot repo)

## Accomplishments

- **Atomic publish (D-16):** `publish_message` base64-encodes each optimized WebP into a `/git/blobs` blob, then builds one tree = image blobs (by `sha`) + `gallery.json` (by inline `content`), one `/git/commits`, one ref PATCH — exactly one commit and one Pages build per approved message, proven by test.
- **Stateless removal (D-14):** `remove_message` derives a message's files purely from `gallery.json` entries whose `file` middle segment (`split('-')[1]`) equals the message id — an exact match that is prefix-collision safe (`9876543210` never matches `987654321`) — deleting them with `sha:null` tree entries and rewriting `gallery.json`, all in one commit. A no-match removal is a no-op (no empty commit).
- **Phase-4 shape preserved:** `gallery.json` is appended (publish) or filtered (remove) and serialized with `json.dumps(..., ensure_ascii=False, indent=2)`; captions are written per-entry and the `caption` key is omitted entirely when empty (never `"caption": ""`).
- **Resilience + secrets (D-18/D-17/T-05-04):** the whole read-modify-commit-ref runs under a module-level `asyncio.Lock`; a 409/422 stale-ref PATCH re-fetches the ref and retries with exponential backoff (4 attempts) before raising the typed `GitHubPublishError`; the PAT lives only in the `Authorization: Bearer` header and never appears in any log line.
- **Testable in isolation:** the module imports only stdlib + `requests` + `config` (no `discord`); a 17-test suite drives it with `requests.get/post/patch` fully mocked and the async API run via `asyncio.run` (no pytest-asyncio dependency).

## Task Commits

Each task was committed atomically inside the **`nocturna-bot`** repo (cross-repo — not this website repo):

1. **Task 1: Failing publish + removal contract (RED)** - `7c77b6c` (test)
2. **Task 2: Implement github_publish atomic commit + stateless removal (GREEN)** - `33845c5` (feat)

**Plan metadata (this website repo):** committed separately with SUMMARY + STATE + ROADMAP.

_TDD gate sequence verified: `test(05-02)` (RED) precedes `feat(05-02)` (GREEN). No REFACTOR commit was needed — the GREEN implementation required no cleanup._

## Files Created/Modified

- `nocturna-bot/core/github_publish.py` (created) - async `publish_message` / `remove_message`; the 7-step Git Data API sequence, `asyncio.Lock` serialization, retry-with-backoff, `GitHubPublishError`, PAT-safe headers
- `nocturna-bot/tests/test_github_publish.py` (created) - 17 behaviour tests: atomicity, tree shape, gallery.json append/filter, caption omission, `ensure_ascii=False`+indent, D-17 messages, exact-segment `sha:null` removal, no-op removal, PAT-not-logged, 422 retry + typed-error exhaustion

## Decisions Made

- **Retry budget (D-18 discretion):** `_MAX_ATTEMPTS = 4`, exponential backoff `_BACKOFF_BASE = 0.5s` → waits 0.5/1.0/2.0s; retries only on ref-PATCH `409`/`422` ("ref moved / not a fast forward"), raises immediately on any other non-2xx.
- **Typed error the cog will catch (05-04):** `GitHubPublishError(RuntimeError)` — raised on retry exhaustion or a hard HTTP failure. This is the exception 05-04 wraps in the D-19 persistent-error + ⚠️ UX.
- **Blobs created once, outside the retry loop:** blobs are content-addressed and ref-independent, so only the tree/commit/ref rebuild on a stale-ref conflict — avoids duplicate blob POSTs on retry.
- **`date` handling:** `publish_message(message_id, entries, date=None)` — `date` is a single per-message value (all of a message's images share `message.created_at`); defaults to `datetime.now(timezone.utc).isoformat()` when the caller omits it. `caption` is carried per-entry in the `(bytes, w, h, filename, caption)` tuple.
- **Return contract:** `{committed: bool, commit_sha: str|None, count: int, files: [str]}`; a no-match removal returns `committed=False` with zero HTTP writes.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The `asyncio.Lock` created at module import is safe across the test suite's repeated `asyncio.run()` calls because uncontended acquires take the fast path and never bind an event loop; at runtime the bot uses a single persistent loop. (A `urllib3[secure]` DeprecationWarning surfaces during the run — pre-existing in the environment's `requests` install, unrelated to this plan, out of scope.)

## User Setup Required

None in this plan. A fine-grained GitHub PAT (Contents: Read and write on `Shangrii/Nocturna-Avatars`) is still required at runtime — captured and configured in plan **05-05** (live setup + end-to-end verification), already tracked as a Phase 5 blocker in STATE.md.

## Next Phase Readiness

- The cross-repo **write side is proven**: 05-03 can `await core.github_publish.publish_message(...)` from the publish orchestration, and 05-04 can `await remove_message(...)` for 🌙 / message-delete unpublish and catch `GitHubPublishError` for D-19.
- Both cores for the cog now exist: `core/image_optimize.optimize_to_webp` (05-01) + `core/github_publish` (this plan). Wave 3 (05-03) wires them into `cogs/gallery.py`.
- No blockers introduced. Runtime PAT + staff role IDs remain deferred to 05-05 by design.

## Self-Check: PASSED

- FOUND: `.planning/phases/05-photo-publishing-bot-cog/05-02-SUMMARY.md`
- FOUND: `../nocturna-bot/core/github_publish.py`
- FOUND: `../nocturna-bot/tests/test_github_publish.py`
- FOUND commit `7c77b6c` (test/RED) in nocturna-bot
- FOUND commit `33845c5` (feat/GREEN) in nocturna-bot
- 22/22 bot tests pass (5 image_optimize + 17 github_publish)

---
*Phase: 05-photo-publishing-bot-cog*
*Completed: 2026-07-03*
