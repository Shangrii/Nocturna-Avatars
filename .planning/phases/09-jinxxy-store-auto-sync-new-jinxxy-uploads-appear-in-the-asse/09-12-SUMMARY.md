---
phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse
plan: 12
subsystem: infra
tags: [jinxxy, store-sync, github-publish, discord-bot, tdd, editor, staff-owned]

# Dependency graph
requires:
  - phase: 09-04
    provides: "object-aware store.json transport (_fetch_store, _serialize_json, _commit_with_retry, _attach_store_media_sync analog)"
  - phase: 09-07
    provides: "sync_store _GRAFT_KEYS = STAFF_OWNED + ('editor',) — editor already re-grafted on every sync"
  - phase: 09-06
    provides: "cogs/jinxxy.py /tienda medios staff-gate + _producto_choices autocomplete pattern reused by /tienda editar"
provides:
  - "github_publish.set_store_editor / _set_store_editor_sync: object-aware editor-only commit matched by checkoutUrl (preserves _comment, no-op when unchanged, raises on no match)"
  - "cogs/jinxxy.py /tienda editar command: staff gate + product autocomplete + editor input validation + D-05 error handling"
  - "Regression test pinning three_way_merge keeps a staff-set editor across a Jinxxy sync-owned-field change"
affects: [jinxxy-store-auto-sync, store.json, StorePage.astro-editor-field]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Editor-only transport mirrors _attach_store_media_sync minus the image-blob tree — a single pure store.json read-modify-commit"
    - "Validate-before-defer: reject invalid staff input with an ephemeral message BEFORE any transport work (T-09-21)"
    - "Fixed commit template references the validated checkoutUrl key only; untrusted staff text never interpolated into the commit message (T-09-22)"

key-files:
  created: []
  modified:
    - ../nocturna-bot/core/github_publish.py
    - ../nocturna-bot/cogs/jinxxy.py
    - ../nocturna-bot/tests/test_store_publish.py
    - ../nocturna-bot/tests/test_jinxxy_cog.py
    - ../nocturna-bot/tests/test_store_sync.py

key-decisions:
  - "editor is written ONLY by set_store_editor (its authoritative write path); core/store_sync.py unchanged because editor is already staff-owned + grafted by sync_store (09-07)"
  - "Editor length cap = 100 (the schema's plain-text field cap); >100 rejects, exactly 100 accepted"
  - "Invalid-input rejection sends an ephemeral message via interaction.response (before defer), so a bad input never enters the deferred/thinking state"

patterns-established:
  - "Staff-owned metadata write path = staff gate FIRST → validate BEFORE defer → object-aware editor-only commit → D-05 log-only errors"

requirements-completed: [STORE-SYNC-01, STORE-SYNC-02]

# Metrics
duration: 14min
completed: 2026-07-12
---

# Phase 9 Plan 12: /tienda editar — Staff-Owned Editor Credit (GAP-1) Summary

**Staff can now set a product's `editor` (credited creator) from Discord via a staff-gated `/tienda editar` command that validates the input and commits an editor-only change through a new object-aware `set_store_editor` transport — closing the last store.json field that required a forbidden hand-edit, while a merge regression pins that a Jinxxy sync never clobbers the staff-set editor.**

## Performance

- **Duration:** ~14 min
- **Completed:** 2026-07-12
- **Tasks:** 2 (both TDD: RED test → GREEN implementation)
- **Files modified:** 5 (all in ../nocturna-bot)

## Accomplishments
- Closed GAP-1 (09-HUMAN-UAT 2026-07-11): `editor` was the one staff-owned field with no Discord surface (`/tienda medios` covers `images`/`description` only), so crediting a creator required a forbidden hand-edit of `store.json`.
- **Task 1** — added `set_store_editor` / `_set_store_editor_sync` to `core/github_publish.py`: an object-aware read-modify-commit that sets ONLY `editor` on the `checkoutUrl`-matched product, mirroring `_attach_store_media_sync` MINUS the image-blob tree. Preserves `_comment` + every other product/field byte-for-byte, raises `GitHubPublishError` on no match, and no-ops (no commit, no ref PATCH) when `editor` is unchanged (T-09-24). The commit message is a fixed `store: set editor for {checkout_url}` template — the raw editor string is NEVER interpolated (T-09-22).
- **Task 2** — added the `/tienda editar` command to `cogs/jinxxy.py`: staff gate FIRST (T-09-20), then editor validation BEFORE defer (strip → reject empty-after-strip / >100 chars / control-or-newline chars, T-09-21), then a single `set_store_editor` commit, with a `GitHubPublishError` routed to a log-only + single-ephemeral-reply path (D-05/T-09-23). `@editar.autocomplete("producto")` reuses the existing `_producto_choices` (`[]` for non-staff).
- Added a merge regression to `test_store_sync.py` pinning that `three_way_merge` keeps a staff-set `editor` across a Jinxxy price change (editor is not in `SYNC_OWNED`; carried through via `dict(current)`), with NO change to `core/store_sync.py`.
- Full bot suite green: **356 passed** (was 338 baseline; +18 new tests).

## Task Commits

Each task was committed atomically in the `nocturna-bot` repo (TDD: RED test → GREEN implementation):

1. **Task 1 RED — failing set_store_editor tests** — `a9d1a7b` (test) — `nocturna-bot`
2. **Task 1 GREEN — set_store_editor transport** — `82ac6a4` (feat) — `nocturna-bot`
3. **Task 2 RED — failing /tienda editar + merge regression tests** — `99a2f19` (test) — `nocturna-bot`
4. **Task 2 GREEN — /tienda editar command** — `1530706` (feat) — `nocturna-bot`

**Plan metadata:** committed in the website repo (this SUMMARY + STATE.md + ROADMAP.md).

## Files Created/Modified
- `../nocturna-bot/core/github_publish.py` — added `_set_store_editor_sync` (object-aware editor-only commit, no-op guard, raise-on-no-match, fixed commit template) + the async `set_store_editor` wrapper under `_commit_lock`.
- `../nocturna-bot/cogs/jinxxy.py` — added the `/tienda editar` app command (staff gate → validate-before-defer → `set_store_editor` → D-05 error handling) + `@editar.autocomplete("producto")` delegating to `_producto_choices`; module-level `_EDITOR_MAX_LEN=100` + `_EDITOR_BAD_CHARS` regex.
- `../nocturna-bot/tests/test_store_publish.py` — 7 tests: editor set + `_comment`/other products preserved, one atomic commit no blobs, no-match raises, unchanged no-op, unescaped+indented serialization, stale-ref 422 retry, commit message references URL not editor.
- `../nocturna-bot/tests/test_jinxxy_cog.py` — 10 tests: staff gate before defer, valid stripped call, four invalid-input rejections + the at-cap accept, GitHubPublishError ephemeral-only, autocomplete `[]`/Choices.
- `../nocturna-bot/tests/test_store_sync.py` — 1 regression test: staff-set `editor` survives a Jinxxy sync-owned-field change.

## Decisions Made
- `core/store_sync.py` left untouched: `editor` is already staff-owned (absent from `SYNC_OWNED`) and re-grafted by `sync_store`'s `_GRAFT_KEYS` (09-07), so the merge guarantee needed only a pinning regression test, not a code change (per the plan's interface contract).
- Editor length cap fixed at 100 (the schema's plain-text field cap): `>100` rejects, exactly 100 accepted (a dedicated test pins the boundary).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- The `@editar.autocomplete("producto")` decorator returns the coroutine unchanged (verified via `inspect.getsource`), so the autocomplete tests invoke the bound method `cog._editar_producto_autocomplete(inter, "")` directly rather than a `.callback` attribute. No production impact — test-harness detail only.

## Threat Surface
- All threat-register dispositions implemented and pinned by tests: T-09-20 (staff gate FIRST + autocomplete `[]` for non-staff), T-09-21 (validate before write: strip/empty/over-100/control-or-newline), T-09-22 (commit message references the checkoutUrl key only, editor text never interpolated — dedicated test asserts a secret string never reaches the message), T-09-23 (D-05 log-only + single ephemeral reply), T-09-24 (no-op guard on unchanged editor). No new packages (T-09-SC accept). No new threat surface beyond the register.

## User Setup Required
- The `cinema` production bot host still runs pre-fix code — a `git pull` + `nocturna-bot` systemd restart is needed to pick up `a9d1a7b`..`1530706` and re-sync the app command tree so `/tienda editar` appears in Discord (standing bot-deploy note, not a new blocker).

## Next Phase Readiness
- GAP-1 closed. STORE-SYNC-02 ("staff never edit JSON for a field the site expects") now complete for `editor`; STORE-SYNC-01 merge guarantee re-pinned. GAP-2 (English visual announce override) remains for plan 09-13.

## Self-Check: PASSED
- `../nocturna-bot/core/github_publish.py` — FOUND (`def set_store_editor` L804, `def _set_store_editor_sync` L703)
- `../nocturna-bot/cogs/jinxxy.py` — FOUND (`name="editar"` L399, `async def editar` L404)
- `../nocturna-bot/tests/test_store_publish.py` / `test_jinxxy_cog.py` / `test_store_sync.py` — FOUND (356 passed)
- Commit `a9d1a7b` (nocturna-bot) — FOUND
- Commit `82ac6a4` (nocturna-bot) — FOUND
- Commit `99a2f19` (nocturna-bot) — FOUND
- Commit `1530706` (nocturna-bot) — FOUND
- `git diff --name-only core/store_sync.py` (nocturna-bot) — EMPTY (verification: editor already staff-owned, no merge change)

---
*Phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse*
*Completed: 2026-07-12*
