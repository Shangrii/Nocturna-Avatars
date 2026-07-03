---
phase: 05-photo-publishing-bot-cog
plan: 04
subsystem: infra
tags: [discord.py, cog, github-git-data-api, sqlite, asyncio, backfill, cross-repo]

# Dependency graph
requires:
  - phase: 05-02
    provides: "core/github_publish.remove_message (stateless, filename-derived removal) + GitHubPublishError (post-retry typed error)"
  - phase: 05-03
    provides: "cogs/gallery.py GalleryCog (on_message ✅ detect, on_raw_reaction_add publish, _publish, _is_staff, _image_attachments) + gallery_state cursor table"
provides:
  - "cogs/gallery.py — 🌙 unpublish/dismiss (_unpublish) + on_raw_message_delete auto-unpublish + _is_published derivation"
  - "cogs/gallery.py — D-19 persistent-error UX (_surface_failure + _clear_warning) on both publish and removal"
  - "cogs/gallery.py — D-20 startup backfill: on_ready -> _backfill (channel.history scan) + _reconcile dispatch + _reaction_by_staff role gate"
  - "core/db.py — get_cursor/set_cursor on the 1-row gallery_state backfill cursor"
affects: [05-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Discord-native derived state: _is_published reads the bot's 🟢 marker OR an exact split('-')[1] {msgID} gallery.json entry match — no per-message DB (D-14)"
    - "Persistent error-as-to-do: a failed commit leaves a NON-auto-deleting reply + ⚠️ reaction; staff retry by re-adding ✅ (D-19)"
    - "Startup reconcile state machine driven off a single advancing SQLite cursor (channel.history after=cursor, oldest_first) — pending→published→unpublished replayable, no bespoke datastore (D-20)"
    - "Role-gated history reactor check: _reaction_by_staff fetches reaction.users() + guild.get_member so the D-08 staff gate holds during backfill too"

key-files:
  created: []
  modified:
    - "nocturna-bot/cogs/gallery.py"
    - "nocturna-bot/core/db.py"
    - "nocturna-bot/tests/test_gallery_cog.py"

key-decisions:
  - "Published-state during reconcile is derived from the 🟢 marker OR a matching gallery.json entry (D-14) — the entry-match specifically guards against a duplicate publish if the bot crashed after committing but before adding 🟢"
  - "on_raw_message_delete unpublishes ANY delete in PHOTO_CHANNEL_ID (D-10); remove_message is a safe no-op when nothing matched, so text/non-photo deletes never create an empty commit. Accepted risk T-05-11: an accidental delete removes the live photos — the channel is the source of truth"
  - "Unpublish FAILURE keeps the 🟢 marker (the photos are still live, so the message must stay 'published'); publish failure never adds 🟢 — both leave the ⚠️ retry to-do"
  - "The cog reads the live gallery.json via github_publish._fetch_gallery (off-loop) rather than adding a new public accessor, since Task 3's file set excludes the 05-02 transport; failure degrades to [] so a GitHub-unreachable startup still adds prompts / falls back to the 🟢 marker"

patterns-established:
  - "Pattern: run-once on_ready guard (self._backfilled) so the startup scan survives reconnects without re-running"
  - "Pattern: _clear_warning drops a stale ⚠️ on a later success so a prior failure never blocks the eventual republish"

requirements-completed: [BOT-05]

# Metrics
duration: 13min
completed: 2026-07-03
---

# Phase 5 Plan 04: Removal, Resilience & Backfill Summary

**Completes GalleryCog with the removal half of the promise and the resilience a self-hosted bot needs: a staff 🌙 unpublishes a live message's photos (or dismisses a pending one), deleting a Discord message auto-unpublishes it, failed commits stay visible as a persistent reply + ⚠️ retry to-do, and on startup the cog backfills every prompt/approval/removal it missed while down — all with zero per-message database, published-state derived from the 🟢 marker and the filename.**

## Performance

- **Duration:** ~13 min (RED→GREEN across 5 task commits)
- **Started/Completed:** 2026-07-03 (bot repo, after 05-03)
- **Tasks:** 3 — Task 1 (TDD) + Task 2 + Task 3 (TDD)
- **Files modified:** 3 (all in the `nocturna-bot` repo)

## Accomplishments

- **🌙 removal / dismiss (BOT-05 / D-06/D-07/D-08/D-09):** `on_raw_reaction_add` now dispatches a `"🌙"` branch behind the SAME staff role gate as `"✅"`. `_unpublish` removes a published message's photos + `gallery.json` entries in one `github_publish.remove_message` commit, clears the 🟢 marker (returning it to pending so a later ✅ republishes), and posts a mirrored `delete_after=60` Spanish reply; a 🌙 on a pending (never-published) message dismisses it by clearing the bot's ✅ prompt and committing nothing.
- **Auto-unpublish on delete (D-10):** `on_raw_message_delete` calls `remove_message(payload.message_id)` for any delete in `PHOTO_CHANNEL_ID` — the channel is the source of truth; a no-op when nothing was published.
- **Derived published-state (D-05/D-14):** `_is_published(message, entries=None)` reports True from the bot's 🟢 marker, or (during reconcile) from an EXACT `split('-')[1]` `{msgID}` match against a live `gallery.json` entry — never a substring, so a prefix-sharing snowflake can't collide.
- **Persistent error surfacing (D-18/D-19):** `_publish` and `_unpublish` catch `github_publish.GitHubPublishError` (retries already exhausted in the transport) and leave a NON-auto-deleting Spanish reply + a `"⚠️"` reaction as a retry to-do. The failure path never adds 🟢; `_clear_warning` drops a stale ⚠️ on a later success. The PAT is never logged (T-05-04).
- **Startup backfill (D-20 / T-05-17):** `core/db.get_cursor`/`set_cursor` persist the last-processed message id on the 1-row `gallery_state`. `on_ready` (run-once guard) scans `channel.history(after=cursor, oldest_first=True)`, calls `_reconcile` per message, and advances the cursor as it goes so a restart never re-scans the whole channel.
- **Reconcile dispatch (D-20 / D-08):** `_reconcile` handles only staff photo posts — staff 🌙 → unpublish; staff ✅ on an unpublished message → publish; a staff image post with no ✅ prompt → add the prompt; already-published → left alone. `_reaction_by_staff` fetches `reaction.users()` and role-checks each via `guild.get_member`, so a non-staff ✅/🌙 during downtime can never trigger a publish/unpublish.

## Task Commits

Each task committed atomically in the **`nocturna-bot`** repo:

1. **Task 1 (TDD): 🌙 unpublish/dismiss + auto-unpublish-on-delete (BOT-05)**
   - `9f277bc` (test — RED: `_is_published`/`_unpublish`/`on_raw_message_delete` + 🌙 dispatch contract)
   - `95e6e95` (feat — GREEN)
2. **Task 2: Persistent error surfacing on exhausted retries (D-19)** — `6ec3950` (feat)
3. **Task 3 (TDD): Startup backfill cursor + reconcile scan (D-20)**
   - `8cfbdbe` (test — RED: cursor round-trip + `_reconcile` dispatch + backfill tolerance)
   - `a7c0078` (feat — GREEN)

_Plan metadata commit (SUMMARY/STATE/ROADMAP/REQUIREMENTS) is in the **website** repo._

## Files Created/Modified

- `nocturna-bot/cogs/gallery.py` (modified) — `_is_published`, `_unpublish`, `on_raw_message_delete`, `_surface_failure`, `_clear_warning`, `on_ready`, `_backfill`, `_fetch_entries`, `_reconcile`, `_reaction_by_staff`; extended `on_raw_reaction_add` (✅/🌙 dispatch) and `_publish`/`_unpublish` error paths.
- `nocturna-bot/core/db.py` (modified) — `get_cursor()` / `set_cursor(message_id)` on the `gallery_state` row.
- `nocturna-bot/tests/test_gallery_cog.py` (modified) — +18 tests (10 Task-1: `_is_published`/unpublish/delete/moon-gate; 8 Task-3: cursor round-trip, `_reconcile` dispatch table incl. non-staff gate, empty-channel backfill).

## Verification

- `python -m pytest tests/test_gallery_cog.py -q` → **32 passed** (14 from 05-03 + 18 new).
- Full bot suite → **54 passed** (was 36 after 05-03); no regression.
- `ast.parse` clean on `cogs/gallery.py` + `core/db.py`.
- Greps present: `on_raw_message_delete`, `remove_message`, `🌙`, `def get_cursor`, `def set_cursor`, `channel.history`.
- Task 2 AST assertion: `⚠️` + `try` present in `cogs/gallery.py`.

## Decisions Made

- **Duplicate-publish guard via entries (D-14):** during reconcile, `_is_published` also matches a live `gallery.json` entry — so a crash *after* the commit but *before* the 🟢 marker does not cause a second publish on restart. This is why `_backfill` fetches `gallery.json` once and passes it to every `_reconcile`.
- **Unpublish-failure keeps 🟢:** on a removal that exhausts retries, the photos are still live, so the message must remain "published" — the 🟢 stays and only the ⚠️ + persistent reply are added. Publish-failure never adds 🟢.
- **Private read-path reuse:** the cog calls `github_publish._fetch_gallery` (off-loop) instead of adding a public accessor, because Task 3's declared files exclude the 05-02 transport; any fetch failure degrades to `[]`.

## Deviations from Plan

### Recovery / Adopted Work

**1. [Recovery] Adopted the interrupted executor's Task-1 RED test contract**
- **Found during:** Task 1 (start).
- **Issue:** A prior attempt left +111 uncommitted lines in `tests/test_gallery_cog.py` (the Task-1 failing-test contract) with no commits/SUMMARY.
- **Action:** Diffed it against the plan's Task-1 `<behavior>`; it matched exactly and ended at a complete test function. Ran pytest to confirm the 9 new tests fail for the right reason (missing `_is_published`/`_unpublish`/`on_raw_message_delete` + 🌙 dispatch), then committed it as the RED step (`9f277bc`). Not treated as verified — re-verified before adopting.

### Auto-fixed Issues

**2. [Rule 3 - Blocking] Backfill test built the cog directly instead of via the shared fixture**
- **Found during:** Task 3 (GREEN).
- **Issue:** The `cog_with_user` fixture monkeypatches `db.init_gallery_state` to a no-op, so the temp `gallery_state` table was never created and `_backfill` raised `sqlite3.OperationalError: no such table`.
- **Fix:** Rewrote `test_backfill_empty_channel_is_tolerated` to construct `GalleryCog` directly (real `init_gallery_state` runs against the monkeypatched temp `DB_PATH`) — matching the passing cursor round-trip test's approach. Test-harness correction, not a contract change.
- **Files modified:** `nocturna-bot/tests/test_gallery_cog.py`
- **Committed in:** `a7c0078` (Task 3 GREEN).

---

**Total deviations:** 1 recovery-adoption + 1 auto-fixed (test-harness). No scope creep; all cog behavior executed as the plan specified.

## Known Stubs

None. Every helper is wired and unit-proven; no placeholder data paths.

## Accepted Risk (for the 05-05 human-verification plan)

**D-10 / T-05-11 — accidental delete removes live photos.** `on_raw_message_delete` treats *any* delete of a photo-channel message as an unpublish signal (the channel is the source of truth). A staff member deleting a published message — intentionally or by accident, including a bulk purge — will remove those photos + `gallery.json` entries from the live site. This is the user-accepted design (D-10); recovery is to re-post + re-approve. **Flagging it here so 05-05's live end-to-end verification exercises the delete path deliberately and confirms the behavior is understood.**

## Next Phase Readiness

- **Ready for 05-05 (live setup + human verification):** the cog is feature-complete for all 6 BOT criteria. 05-05 must capture `GITHUB_PAT` (fine-grained) + `GALLERY_STAFF_ROLE_IDS` + `PHOTO_CHANNEL_ID` in the live bot `.env`, deploy to the running host, and verify end-to-end: ✅ publish, 🌙 unpublish, 🌙 dismiss, message-delete auto-unpublish, a forced-failure ⚠️ surface, and a restart backfill. The PAT remains the standing Phase-5 blocker.
- No new blockers introduced.

## Self-Check: PASSED

- Files present (bot repo): `cogs/gallery.py`, `core/db.py`, `tests/test_gallery_cog.py` (all modified).
- Commits verified in bot repo history: `9f277bc`, `95e6e95`, `6ec3950`, `8cfbdbe`, `a7c0078`.
- `05-04-SUMMARY.md` present (website repo).

---
*Phase: 05-photo-publishing-bot-cog*
*Completed: 2026-07-03*
