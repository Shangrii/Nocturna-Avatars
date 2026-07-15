---
phase: 10-editor-profile-pages-carrd-style-template-editor-for-nocturn
plan: 05
subsystem: api
tags: [github-data-api, cross-repo-commit, atomic-commit, upsert, concurrency, nocturna-bot, tdd]

# Dependency graph
requires:
  - phase: 10-02
    provides: core/editors_model.py pydantic EditorPage schema this plan's payloads conform to; config.WEBSITE_EDITORS_JSON + WEBSITE_EDITORS_IMAGE_DIR settings
provides:
  - core/github_publish.py sync_editors() in nocturna-bot — atomic upsert-by-discordId of one editors.json entry + image blobs in ONE commit (D-06/D-13/D-17), concurrency-safe (Pitfall 6)
  - core/github_publish.py unpublish_editor() in nocturna-bot — flips published=false via the same audited commit core, no-op guard on unknown/already-unpublished (D-10/D-16)
affects: [10-08 (FastAPI app imports sync_editors as the save write path), 10-09 (role-loss cog imports unpublish_editor), 10-10 (block editor UI save/self-unpublish)]

# Tech tracking
tech-stack:
  added: []
  patterns: ["upsert-by-discordId inside _commit_with_retry's re-fetch/rebuild (concurrent-clobber guard, mirrors sync_store's re-graft-by-checkoutUrl)", "mixed image-blob + JSON-blob single tree (mirrors gallery _publish_sync)", "fixed commit-message template — never interpolate raw editor text (T-10-05-02)", "defensive no-op guard before ref PATCH (mirrors store/reviews)"]

key-files:
  created:
    - ../nocturna-bot/tests/test_github_publish_editors.py
  modified:
    - ../nocturna-bot/core/github_publish.py

key-decisions:
  - "editors.json is a top-level ARRAY (like gallery/reviews, D-18) so both new functions reuse the generic _fetch_json array reader + _commit_with_retry core verbatim — NO new commit path invented; gallery/store/reviews transports byte-for-byte unchanged (full bot suite 418/418, was 400)"
  - "sync_editors image tuple is (filename, webp_bytes) per the plan's Sequence[tuple[str, bytes]] signature; each blob lands under public/editors/<slug>/<filename> (slug already normalized upstream in 10-02, traversal-safe)"
  - "discordId compared as a string on both sides of the upsert so a str/int mismatch can never spawn a duplicate entry"
  - "sync_editors has NO no-op guard (D-13: publishes immediately on save); unpublish_editor DOES (no-op on unknown/already-unpublished — never an empty commit/Pages rebuild)"

requirements-completed: []

# Metrics
duration: 18min
completed: 2026-07-14
---

# Phase 10 Plan 05: Bot Transport — sync_editors() + unpublish_editor() Summary

**Extended `nocturna-bot/core/github_publish.py` with `sync_editors()` (atomic upsert-by-`discordId` of one editor entry + image blobs in ONE commit, concurrency-safe) and `unpublish_editor()` (flips `published=false` with a no-op guard), both reusing the audited `_fetch_json` + `_commit_with_retry` core so the gallery/store/reviews transports stay byte-for-byte unchanged — 18 new TDD tests, full bot suite 418/418.**

## Performance

- **Duration:** ~18 min
- **Tasks:** 2 (both `auto`, both `tdd="true"`)
- **Files modified:** 2 (1 created, 1 modified) in `../nocturna-bot`
- **Tests:** +18 (12 sync_editors, 6 unpublish_editor); full bot suite 418 passed (was 400)

## Accomplishments
- `sync_editors(entry, images=(), *, message=None)` — upserts THIS editor by `discordId` into the FRESHLY fetched `editors.json` array each retry (Pitfall 6 concurrent-clobber guard: `others = [e for e in current if str(e.discordId) != target]` then `others + [entry]`), commits any uploaded images as blobs under `public/editors/<slug>/<filename>` in the SAME tree → ONE commit (D-17). Reuses `_commit_with_retry` with `fetch=lambda: _fetch_json(repo, branch, editors_path)`. Fixed `editors: publish <slug>` commit message (never editor text, T-10-05-02). Async wrapper thread-offloads the blocking `requests` under `_commit_lock`.
- `unpublish_editor(discord_id, *, message=None)` — flips the `discordId`-matched entry's `published` to `false` via the same commit core; the entry and its images are LEFT in place so a later re-publish restores the page. No-op guard: unknown `discordId` OR already-unpublished → `committed: False`, no ref PATCH. Fixed `editors: unpublish <slug>` message. This is the D-16 self-unpublish + D-10 role-loss write path.
- No-regression proven: the whole existing `test_github_publish.py` (gallery) suite + store/reviews suites stay green; full bot suite 418/418.

## Task Commits

Each task was committed atomically in `../nocturna-bot` (main branch, sequential execution — not this website repo):

1. **Task 1: sync_editors() (TDD)** — `9dd1dff` (test, RED: 1 failing, no `sync_editors`) → `027b6b8` (feat, GREEN: 12 tests pass)
2. **Task 2: unpublish_editor() + no-regression (TDD)** — `9fbfb22` (test: 6 unpublish tests) — see TDD-ordering deviation below

**Plan metadata:** this SUMMARY.md + STATE.md/ROADMAP.md updates committed in the website repo (this repo), separate from the nocturna-bot commits above.

## Files Created/Modified
- `../nocturna-bot/core/github_publish.py` — added the "editors transport (Fase 10)" section: `_sync_editors_sync`, `_unpublish_editor_sync`, `async sync_editors`, `async unpublish_editor`. No change to any gallery/store/reviews function.
- `../nocturna-bot/tests/test_github_publish_editors.py` — new module: 18 HTTP-mocked tests (array-body FakeGitHub mirroring `test_github_publish.py`/`test_store_publish.py`), covering upsert append/replace, Pitfall-6 concurrent stale-ref retry, image-blob+JSON one-commit, serialization, fixed commit message, PAT hygiene, timeout, and the unpublish flip + no-op guards.

## Decisions Made
- `editors.json` treated as a top-level ARRAY (D-18) → both functions reuse `_fetch_json` (the generic array reader) + `_commit_with_retry` verbatim; no new commit path, and the gallery/store/reviews transports are untouched.
- Image tuple ordering is `(filename, webp_bytes)` per the plan's documented `Sequence[tuple[str, bytes]]` signature; blobs land under `public/editors/<slug>/<filename>`.
- `discordId` compared as `str()` on both sides of the upsert (robust against str/int mismatch — no duplicate entries).
- `sync_editors` intentionally has no no-op guard (D-13 publishes immediately on save); `unpublish_editor` keeps one (mirrors the store/reviews defensive no-op — every commit is one Pages rebuild).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test harness read the first tree payload, not the committed (last) one**
- **Found during:** Task 1 GREEN (the Pitfall-6 concurrent stale-ref test failed)
- **Issue:** `FakeGitHub.tree_entries()` returned `tree_payloads[0]` — but on a stale-ref retry an earlier attempt builds a tree against a now-superseded fetch, so the FINAL committed tree is `tree_payloads[-1]`. The concurrent-merge assertion read the wrong (first-attempt) tree and saw only my entry, not the merged pair.
- **Fix:** Changed the helper to read `tree_payloads[-1]` (the winning tree). The `sync_editors` implementation was already correct — this was purely a harness bug.
- **Files modified:** `../nocturna-bot/tests/test_github_publish_editors.py`
- **Verification:** `test_sync_editors_stale_ref_retry_upsert_targets_fresh_array` (and all 12) pass
- **Committed in:** `027b6b8` (folded into the Task 1 GREEN commit, since it is a test-harness correction reached while turning the suite green)

### TDD gate ordering (Task 2)

`unpublish_editor` + `_unpublish_editor_sync` were implemented in the **Task 1 GREEN commit** (`027b6b8`) alongside `sync_editors`, because both functions live in the same "editors transport" section of `github_publish.py` and share the `_fetch_json`/`_commit_with_retry` core. As a result the Task 2 test commit (`9fbfb22`) landed AFTER the implementation rather than before it (a genuine RED for the unpublish tests was demonstrated locally — removing the function reproduced 6 failures — but that removal was never itself committed, so re-adding produced a net-zero diff against HEAD and no separate Task 2 feat commit was created). Net effect: both functions are committed, all 18 tests pass, and the full bot suite is green (418/418). The only imperfection is the test-before-implementation ordering for Task 2 in git history.

### Requirements

`requirements-completed` is empty for this plan even though the frontmatter lists `[EDIT-06, EDIT-07]`: per REQUIREMENTS.md traceability both requirements span multiple plans (EDIT-06 = 10-02/10-05/10-10; EDIT-07 = 10-05/10-09/10-10). This plan delivers only the transport slice, so neither requirement is fully satisfied yet — the checkboxes are left for the plan that completes each chain (EDIT-06 was already checked off during 10-02's foundation work). Marking EDIT-07 complete here would be premature (10-09 role-loss cog + 10-10 self-unpublish UI are still pending).

**Total deviations:** 1 auto-fixed (Rule 1, test-harness bug) + 1 documented TDD-ordering nuance. No scope creep; no change to the plan's locked design.

## Issues Encountered
The pre-existing unrelated `.env.example` modification in `../nocturna-bot` was left completely untouched (never staged) per the execution instructions — it remains unstaged in that repo's working tree exactly as found.

## Next Phase Readiness
- `sync_editors` is ready to be imported by the FastAPI save endpoint (10-08/10-10) as the cross-repo publish write path; `unpublish_editor` is ready for the role-loss cog (10-09) and the self-unpublish UI (10-10).
- No blockers introduced. The transport stays dumb (writes what it is handed) — callers MUST validate the entry against `core.editors_model` (10-02) before calling `sync_editors`.

## Self-Check: PASSED

- FOUND: `../nocturna-bot/core/github_publish.py` (contains `_sync_editors_sync`, `_unpublish_editor_sync`, `sync_editors`, `unpublish_editor`)
- FOUND: `../nocturna-bot/tests/test_github_publish_editors.py`
- FOUND: commit `9dd1dff` (test, RED sync_editors)
- FOUND: commit `027b6b8` (feat, GREEN sync_editors + unpublish_editor)
- FOUND: commit `9fbfb22` (test, unpublish_editor)

---
*Phase: 10-editor-profile-pages-carrd-style-template-editor-for-nocturn*
*Completed: 2026-07-14*
