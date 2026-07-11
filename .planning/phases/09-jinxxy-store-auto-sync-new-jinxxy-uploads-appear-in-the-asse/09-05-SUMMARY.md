---
phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse
plan: 05
subsystem: infra
tags: [jinxxy, discord-cog, store-sync, tasks-loop, groupcog, tdd, python, bot]

# Dependency graph
requires:
  - phase: 09-01
    provides: "config Jinxxy block (JINXXY_API_KEY/POLL_HOURS/ANNOUNCE_CHANNEL_ID/STAFF_ROLE_IDS/WEBSITE_STORE_JSON) + store_snapshot table init/get/upsert/delete"
  - phase: 09-02
    provides: "core/jinxxy_api.py read client — get_me/list_all_products/get_product, typed JinxxyAPIError (raises, never returns [])"
  - phase: 09-03
    provides: "core/store_sync.py — map_product/is_https_url/three_way_merge/reconcile_store (pure D-12 field-ownership merge)"
  - phase: 09-04
    provides: "core/github_publish.py — async sync_store(products) + _fetch_store object reader + GitHubPublishError"
  - phase: 08
    provides: "cogs/reminders.py loop lifecycle (start/cancel/before_loop/error-restart) + _is_staff idiom; GroupCog staff-gate-FIRST"
provides:
  - "cogs/jinxxy.py — JinxxyCog: @tasks.loop poll, /tienda sync staff command, _run_sync orchestration, _announce embed, on_ready run-once reconcile"
  - "bot.py wiring: load_extension('cogs.jinxxy') + JINXXY_API_KEY fail-fast"
  - "tests/test_jinxxy_cog.py — 15 unit tests (staff gate, commit-on-change, no-op silence, removal-safety, announce, error-never-announced, startup run-once)"
affects: [09-06-attach-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "One-sync-path controller: poll loop + /tienda sync + on_ready all delegate to a single _run_sync (no scheduled-vs-manual drift)"
    - "Removal-safety by ordering: full enumeration (raises on outage) precedes any commit/removal, so an API failure aborts before delete_store_snapshot/sync_store"
    - "D-05 errors-never-Discord: every failure path is log.exception only; the sole user-facing error is an ephemeral reply to the /tienda sync invoker"
    - "Snapshot shape reconstruction: _snapshot_from_row re-expands the DB row into the live map_product shape (name -> {es,en}, nsfw -> bool) so the three-way merge compares like-for-like"

key-files:
  created:
    - "../nocturna-bot/cogs/jinxxy.py"
    - "../nocturna-bot/tests/test_jinxxy_cog.py"
  modified:
    - "../nocturna-bot/bot.py"

key-decisions:
  - "_run_sync PROPAGATES JinxxyAPIError/GitHubPublishError (does not swallow) so the poll @error handler logs+restarts, on_ready catches+logs, and /tienda sync catches+replies ephemeral — one path, three call-site error policies (all D-05 logs-only)"
  - "snapshot upsert writes the plain name string (name['es']) + nsfw 0/1; _snapshot_from_row re-expands to {es,en}+bool so an unchanged Jinxxy value compares equal to the live map_product entry (no false 'updated')"
  - "jinxxy_id_by_key carries the real Jinxxy product id from enumeration into the snapshot upsert (informational column; not used by the merge)"
  - "removed products aren't in reconcile result['products'], so the announce embed falls back to the checkoutUrl key for their label"

patterns-established:
  - "Composite cog: reminders loop-lifecycle structure + reviews on_ready run-once reconcile + branded announce embed, funnelled through one _run_sync"
  - "GroupCog subcommand /tienda sync registers automatically via bot.tree copy_global_to (help.py auto-lists it — no edit needed)"

requirements-completed: [STORE-SYNC-01]

# Metrics
duration: 18min
completed: 2026-07-11
---

# Phase 09 Plan 05: Jinxxy Cog — Store Auto-Sync Controller Summary

**`JinxxyCog` wires the three Phase-9 cores into one Discord controller: a 6–12h `@tasks.loop` poll, a staff-gated `/tienda sync`, and a run-once `on_ready` reconcile all delegate to one `_run_sync` that enumerates Jinxxy → maps → three-way-merges against the durable snapshot + live `store.json` → commits only on change → updates the snapshot → announces added/updated/removed — with a hard removal-safety abort on API failure and D-05 errors-never-Discord.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-07-11T01:21:40-06:00 (RED)
- **Completed:** 2026-07-11T01:26:51-06:00 (last feat)
- **Tasks:** 3
- **Files modified:** 3 (all in ../nocturna-bot)

## Accomplishments
- `cogs/jinxxy.py` — `JinxxyCog(commands.GroupCog, group_name="tienda")` with the Phase-8 loop lifecycle (`__init__` `init_store_state`+`_poll.start`, `cog_unload` `_poll.cancel`, `before_loop` `wait_until_ready`, `@_poll.error` log+restart), a single `_run_sync` orchestration (`get_me` → `list_all_products`+`get_product` → `map_product` https-guarded → `reconcile_store` vs snapshot + live store.json → `sync_store` only when `changed` → snapshot upsert/delete), the staff-gated `/tienda sync` command, the branded `_announce` embed, and the run-once `on_ready` startup reconcile.
- `bot.py` — `load_extension("cogs.jinxxy")` in `setup_hook` + a `JINXXY_API_KEY` fail-fast in `main()` (mirrors the gallery PAT guard); `cogs/help.py` untouched (auto-lists `/tienda` from the tree).
- `tests/test_jinxxy_cog.py` — 15 unit tests (SimpleNamespace + AsyncMock + `asyncio.run`, real `store_sync`, mocked API/DB/transport) covering the staff gate, commit-on-change + snapshot upsert, the new-product `description`/string-`id` shape, no-op silence, removal-safety on outage, announce silence/embed, error-never-announced, and the startup run-once guard.
- Full bot suite green: **303 passed** (was 288 after 09-04; +15).

## Task Commits

Each task committed atomically in the **nocturna-bot** repo (`main`); Task 1 followed a TDD RED→GREEN cycle:

1. **Task 1 (RED): failing tests for _run_sync + _is_staff** — `347e1b7` (test)
2. **Task 1 (GREEN): JinxxyCog skeleton — poll lifecycle + _run_sync + bot.py wiring** — `1fab2fe` (feat)
3. **Task 2: /tienda sync command + branded announce embed (D-05/D-06)** — `0023f54` (feat)
4. **Task 3: startup reconcile (on_ready, run-once) reusing _run_sync** — `2c58bd4` (feat)

**Plan metadata (website repo):** committed with this SUMMARY + STATE.md + ROADMAP.md + REQUIREMENTS.md.

_Code commits live in ../nocturna-bot; planning artifacts live in the website repo._

## TDD Gate Compliance

Task 1 is `tdd="true"`: `347e1b7` (`test(09-05)`) precedes `1fab2fe` (`feat(09-05)`) — RED before GREEN. The RED run failed as an ImportError (`cannot import name 'jinxxy' from 'cogs'`), confirming no test passed unexpectedly. No REFACTOR commit needed. Tasks 2 and 3 are `type="auto"` (not TDD) and land their tests alongside the implementation per the plan.

## Files Created/Modified
- `../nocturna-bot/cogs/jinxxy.py` — the store-sync controller cog (poll loop + `/tienda sync` + `_run_sync` + `_announce` + `on_ready`).
- `../nocturna-bot/bot.py` — `cogs.jinxxy` load + `JINXXY_API_KEY` fail-fast.
- `../nocturna-bot/tests/test_jinxxy_cog.py` — 15 unit tests.

## Decisions Made
- **`_run_sync` propagates its typed errors** rather than swallowing them, so each of the three call sites applies its own D-05-compliant policy: the poll `@_poll.error` handler logs + restarts, `on_ready` catches + logs, and `/tienda sync` catches + sends the ephemeral "revisa los logs" reply to the invoker. One code path, three logs-only error policies — no error ever reaches the announce channel.
- **Snapshot round-trips through the sync-owned SHAPE.** `upsert_store_snapshot` stores the plain `name['es']` string and `nsfw` as 0/1; `_snapshot_from_row` re-expands to `{"es","en"}` + `bool` so an unchanged Jinxxy product compares equal to the freshly-mapped live entry (`live_v == snap_v`), avoiding a phantom "updated" on every poll.
- **The announce embed falls back to the `checkoutUrl` key** for removed products, since reconcile drops them from `result['products']` (no name is available post-removal).

## Deviations from Plan

None - plan executed exactly as written. No auto-fixes (Rules 1-3) or architectural changes (Rule 4) were required; the three cores exposed exactly the interfaces the plan's `<interfaces>` block promised, and `/me`'s `{username, display_name}` shape (verified in `tests/test_jinxxy_api.py`) mapped cleanly to `store_username`/`owner_name`.

## Issues Encountered
None functional. The plan's `python -c "open('cogs/jinxxy.py').read()"` parse check tripped Windows' cp1252 default codec on the embed emoji — re-run with explicit UTF-8 (`io.open(..., encoding='utf-8')`) parses clean, and pytest imports the module (UTF-8 source) without issue, so the cog is valid Python. Git emitted the usual cosmetic `LF will be replaced by CRLF` warnings.

## Known Stubs
None. `_announce` is fully implemented (the Task-1 placeholder was replaced in Task 2). Every method has a data source and test coverage.

## Threat Model Compliance
- **T-09-14 (non-staff triggers /tienda sync):** `_is_staff` gate is the FIRST statement in the `sync` callback — a non-staff caller gets "Sin permisos." before `defer` or any sync work (test: `test_sync_command_non_staff_rejected_before_any_work`). Mitigated.
- **T-09-15 (API failure mass-removes the storefront):** `_run_sync` runs the full enumeration first; `list_all_products`/`get_me` raise `JinxxyAPIError` on an outage, aborting before `sync_store`/`delete_store_snapshot` (test: `test_run_sync_api_failure_aborts_no_removal_no_commit` asserts zero commits + zero deletes with a pre-existing product that would otherwise be removed). Mitigated.
- **T-09-16 (error details leak to a public channel):** every failure path is `log.exception` only; `_announce` is reached only after a successful `_run_sync`; the sole user-facing error is the ephemeral `/tienda sync` reply (test: `test_sync_command_error_is_ephemeral_never_announced` asserts `channel.send` is never awaited on error). Mitigated.
- **T-09-17 (secrets in logs):** the cog logs only ids/labels/counts; `JINXXY_API_KEY`/`GITHUB_PAT` stay in their clients' headers (09-02/09-04), never touched here. Mitigated.
- **T-09-SC (pip installs):** no new packages. Accepted.

## User Setup Required
The live cinema host `.env` must have `JINXXY_API_KEY` set before the bot will start — the fail-fast guard added in `bot.py` (`main()`) now `sys.exit(1)`s if it is missing (same treatment as `GITHUB_PAT`). `JINXXY_ANNOUNCE_CHANNEL_ID`/`JINXXY_POLL_HOURS` have D-18/D-03 defaults; `JINXXY_STAFF_ROLE_IDS` falls back to `GALLERY_STAFF_ROLE_IDS`. Live verification (a real `/tienda sync` committing store.json + announcing) is deferred to the 09-06 deploy notes per the plan's `<verification>`.

## Next Phase Readiness
- The controller is complete and the whole store-sync chain (config/state → API client → merge → transport → cog) is wired: a new Jinxxy product now flows to `store.json` (and the web store) on the next poll or a staff `/tienda sync` — STORE-SYNC-01's core behavior.
- **Ready for 09-06** — the D-15 image/description staff-attach flow shares `cogs/jinxxy.py` and calls the already-shipped `github_publish.attach_store_media` (09-04); the sync merge never overwrites those staff-owned fields.
- No blockers.

## Self-Check: PASSED
- FOUND: ../nocturna-bot/cogs/jinxxy.py
- FOUND: ../nocturna-bot/tests/test_jinxxy_cog.py
- FOUND (bot.py modified): `cogs.jinxxy` + `JINXXY_API_KEY` present in bot.py
- FOUND commits: 347e1b7 (test), 1fab2fe (feat), 0023f54 (feat), 2c58bd4 (feat)
- Full bot suite: 303 passed (288 prior + 15 new), zero failures

---
*Phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse*
*Completed: 2026-07-11*
