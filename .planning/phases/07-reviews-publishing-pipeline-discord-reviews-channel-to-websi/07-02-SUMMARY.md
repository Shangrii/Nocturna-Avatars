---
phase: 07-reviews-publishing-pipeline-discord-reviews-channel-to-websi
plan: 02
subsystem: bot-transport
tags: [reviews, github-transport, cross-repo, tdd, config, sqlite-cursor]
requires:
  - nocturna-bot/core/github_publish.py existing gallery transport (reused verbatim)
  - config.GITHUB_PAT / WEBSITE_REPO / WEBSITE_BRANCH (shared with the gallery)
  - src/data/reviews.json write-target shipped [] by 07-01 (website repo)
provides:
  - github_publish.publish_review(entry) / remove_review(message_id) async transport
  - github_publish._fetch_json(repo, branch, path) generic reader
  - config REVIEWS_CHANNEL_ID / REVIEWS_STAFF_ROLE_IDS / WEBSITE_REVIEWS_JSON
  - db.init_reviews_state / get_reviews_cursor / set_reviews_cursor (reviews_state table)
affects:
  - nocturna-bot/core/github_publish.py (generalized backward-compatibly)
tech-stack:
  added: none
  patterns:
    - Parallel thin path over shared Git Data API machinery (lowest regression risk)
    - Optional fetch= callable to break the retry core's gallery coupling backward-compatibly
    - Id-keyed idempotent dedupe (entry['id']) instead of filename parsing
    - Separate 1-row cursor table per watched channel (reviews_state vs gallery_state)
key-files:
  created:
    - nocturna-bot/tests/test_reviews_publish.py
  modified:
    - nocturna-bot/config.py
    - nocturna-bot/.env.example
    - nocturna-bot/core/db.py
    - nocturna-bot/core/github_publish.py
decisions:
  - "Parallel thin path (planner option B intent, achieved via option A extraction): extracted generic _fetch_json + gave _commit_with_retry an optional fetch= callable — gallery byte-for-byte unchanged, full test_github_publish.py suite still green"
  - "reviews.json keyed+deduped by Discord message id (no filename regex — reviews have no images); author:null preserved verbatim by the transport, anonymity enforced upstream in the cog"
  - "Separate reviews_state cursor table so a reviews backfill restart never disturbs the gallery cursor"
metrics:
  duration: ~12min
  tasks: 2
  files: 5
  completed: 2026-07-09
---

# Phase 07 Plan 02: Reviews Transport Foundation Summary

Bot-side foundation for reviews publishing without any Discord code: a reviews config block, a separate SQLite backfill cursor, and a `publish_review` / `remove_review` transport pair that commits a single `reviews.json` blob per review — reusing the production-live gallery Git Data API machinery with the lowest possible regression risk (gallery untouched, its full suite still green).

## What Was Built

### Task 1 — config + .env.example + reviews cursor (commit `6fa2c3e`)

- **`config.py`** — new "Reseñas (Fase 7)" block: `REVIEWS_CHANNEL_ID` (default `1453534905706221600`), `REVIEWS_STAFF_ROLE_IDS` (same comma-split list-of-ints comprehension as the gallery, then `or GALLERY_STAFF_ROLE_IDS` so an unset var falls back to the gallery staff roles), `WEBSITE_REVIEWS_JSON` (default `src/data/reviews.json`). `GITHUB_PAT` / `WEBSITE_REPO` / `WEBSITE_BRANCH` reused as-is (same target repo, no new vars).
- **`.env.example`** — the three reviews vars documented under a `# Reseñas (Fase 7)` heading in the gallery idiom (channel-id inline comment, staff-role fallback comment, `WEBSITE_REVIEWS_JSON=src/data/reviews.json`); no re-documentation of the shared PAT/repo/branch.
- **`core/db.py`** — `init_reviews_state()` / `get_reviews_cursor()` / `set_reviews_cursor()` mirroring the gallery cursor helpers but on a **separate `reviews_state` table** (`id INTEGER PRIMARY KEY CHECK (id = 1)`, `last_processed_message_id INTEGER`). Independent of `gallery_state` so the two channels' backfills never interfere.

### Task 2 — reviews transport, TDD (RED `a3a74d7` → GREEN `2647abf`)

- **`core/github_publish.py`** generalized backward-compatibly:
  - Extracted a generic `_fetch_json(repo, branch, path)` holding the former `_fetch_gallery` body (incl. the WR-01 >1MB raw-media fallback); `_fetch_gallery(repo, branch)` now delegates to it with the gallery path — gallery behavior preserved byte-for-byte.
  - `_serialize_json = _serialize_gallery` alias (pure, same `ensure_ascii=False, indent=2` shape).
  - `_commit_with_retry(...)` gained an optional `fetch=None` keyword; it uses `fetch or (lambda: _fetch_gallery(repo, branch))`, so existing gallery callers pass nothing and keep identical behavior while the reviews path points the same retry/backoff core at `reviews.json`.
  - `_publish_review_sync(entry)` / `_remove_review_sync(message_id)` + public async `publish_review(entry)` / `remove_review(message_id)` mirroring `publish_message`/`remove_message` (`async with _commit_lock: await asyncio.to_thread(...)`). Each commits ONE `reviews.json` tree entry by inline content (no image blobs). Publish drops any existing entry with the same `str(id)` then appends (idempotent re-publish); remove keeps `id != str(message_id)` and no-ops (no empty commit) on no-match. Commit messages `reviews: publish review (discord msg {id})` / `reviews: remove review (discord msg {id})`.
- **`tests/test_reviews_publish.py`** — 22 contract tests mirroring `test_github_publish.py`'s FakeGitHub + `asyncio.run` harness (HTTP fully mocked, no pytest-asyncio): single-blob tree shape / no blobs, append + id-dedupe, `author: null` preserved (asserted both in the array and in the serialized `"author": null` literal), unescaped+indented serialization, both commit-message strings, drop-by-id + atomic single commit, no-op removal, Bearer-PAT-on-every-call, PAT-never-in-logs (`caplog`), 422 re-fetch+retry, exhausted-retry typed error, explicit timeout on every call.

## Verification Evidence

- `python -m pytest tests/test_reviews_publish.py tests/test_github_publish.py -q` → **45 passed** (22 reviews + 23 gallery). The gallery suite passing after the edit is the backward-compatibility gate (T-07-REG).
- Full bot suite `python -m pytest -q` → **103 passed** (no regressions anywhere).
- `grep -n "def publish_review\|def remove_review\|def _fetch_json"` → all three defined; `_commit_with_retry` signature includes `fetch=None`.
- Task 1: `config.REVIEWS_CHANNEL_ID == 1453534905706221600`, `WEBSITE_REVIEWS_JSON == 'src/data/reviews.json'`, `REVIEWS_STAFF_ROLE_IDS is GALLERY_STAFF_ROLE_IDS` (fallback holds when unset), `.env.example` greps for all three vars, and `db.set_reviews_cursor(123)` round-trips to `get_reviews_cursor() == 123` on a throwaway DB.

## TDD Gate Compliance

- RED gate present: `test(07-02)` commit `a3a74d7` — tests written first, confirmed failing with `AttributeError: module 'core.github_publish' has no attribute 'publish_review'` before any implementation.
- GREEN gate present: `feat(07-02)` commit `2647abf` after RED — all tests pass.
- REFACTOR: none needed (implementation landed clean).

## Deviations from Plan

None — plan executed as written. The plan's action described option (A) minimal generalization (the extraction + `fetch=` callable), which achieves the option (B) "gallery untouched" regression guarantee; both intents were satisfied by the single cut taken.

## Threat Model Coverage

- **T-07-04 (spoofing/tampering, cross-repo auth)** — mitigated: PAT read from `config.GITHUB_PAT` at call time, placed only in the `Authorization` header via `_headers()`; a `caplog` test asserts the fake PAT never appears in any log record.
- **T-07-02 (info disclosure, author field)** — mitigated: the transport is dumb about identity — it writes the `author` it is handed; `author: null` is preserved verbatim (asserted in the serialized body); no name is derived or logged.
- **T-07-05 (DoS, unbounded retry / stuck lock)** — mitigated: reuses `_TIMEOUT` on every request and the bounded `_MAX_ATTEMPTS` backoff; a stall raises `GitHubPublishError` instead of holding `_commit_lock` (inherited from the reused core).
- **T-07-REG (regression)** — mitigated: extraction + default-arg are backward-compatible; the full `test_github_publish.py` suite is green.
- **T-07-SC (supply chain)** — accepted: no new pip packages (stdlib + `requests` + `config` only).

No new threat surface beyond the plan's `<threat_model>`.

## Human Verification Items (autonomous run — not blocking)

- None for this plan — it is entirely unit-testable (HTTP mocked). Live cross-repo commit behavior is exercised end-to-end by the cog plan (07-03) and the production bot on host "cinema" (manual `git pull` + systemd restart, same as Phase 5).

## Notes for 07-03 (ReviewsCog)

- The cog constructs the entry dict `{"id": str(message.id), "author": display_name | None, "text": ..., "date": ISO8601}` and calls `await github_publish.publish_review(entry)` / `await github_publish.remove_review(message.id)`. The transport stays dumb about author resolution — anonymity (`author=None`) is the cog's responsibility.
- Use `config.REVIEWS_CHANNEL_ID` / `config.REVIEWS_STAFF_ROLE_IDS` for the channel + staff gate, and `db.init_reviews_state()` / `get_reviews_cursor()` / `set_reviews_cursor()` for backfill (separate from the gallery cursor).
- Return shape: `{"committed": bool, "commit_sha": str|None, "count": int}`; `committed: False` on a no-match removal (the dismiss path).

## Self-Check: PASSED

- Files: config.py, .env.example, core/db.py, core/github_publish.py, tests/test_reviews_publish.py — all FOUND.
- Commits: `6fa2c3e` (Task 1), `a3a74d7` (RED), `2647abf` (GREEN) — all FOUND in git log.
