---
phase: 08-bot-reminders-command-weekly-monthly-scheduled-reminders-wit
plan: 03
subsystem: bot
tags: [discord.py, GroupCog, tasks.loop, scheduler, AllowedMentions, modal, sqlite, tdd]

# Dependency graph
requires:
  - phase: 08-01
    provides: "core/db.py reminders table + CRUD (init/add/list/get/update/delete/due/set_next_fire); config REMINDERS_TZ / REMINDERS_STAFF_ROLE_IDS / REMINDERS_CATCHUP_GRACE_HOURS; tzdata pin"
  - phase: 08-02
    provides: "cogs/reminders.py pure helpers — next_weekly/monthly/oneoff_fire, compute_next, classify_fire, validators, schedule_summary, _is_staff"
provides:
  - "RemindersCog (/recordatorio GroupCog) with staff-gated crear subcommand (validated slash params + channel picker + mention/emoji params)"
  - "MensajeModal multi-line message capture with add + edit(edit_id) branches and computed next_fire_utc"
  - "_deliver: mention line + brand embed + AllowedMentions @everyone suppression + seeded reactions"
  - "The repo's FIRST background scheduler — @tasks.loop(minutes=1) with advance-after-send lifecycle, D-13 catch-up classification, D-16 one-off auto-delete, per-reminder isolation"
  - "bot.py extension load + REMINDERS_TZ ZoneInfo fail-fast"
affects: [08-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "First discord.ext.tasks scheduler in the repo: @tasks.loop + before_loop wait_until_ready + @loop.error restart guard"
    - "Advance-after-send crash semantics (rare miss beats a double ping; D-13 grace covers it)"
    - "Testable tick: loop body delegates to _process_due(now) so the scheduler is unit-driven with asyncio.run, no live loop"

key-files:
  created: []
  modified:
    - "../nocturna-bot/cogs/reminders.py"
    - "../nocturna-bot/bot.py"
    - "../nocturna-bot/tests/test_reminders_cog.py"

key-decisions:
  - "Scheduler loop body delegates to a plain async _process_due(now) method so the tick is unit-testable without a running tasks.loop (fixture neutralizes db.init_reminders + Loop.start)"
  - "Advance-after-send is the locked crash-semantics choice (RESEARCH Open Q1/A3), commented in _process_due"
  - "A one-off is deleted even when classified 'skip' — a past-due one-off is expired (D-16)"
  - "crear opens MensajeModal as the FIRST interaction response (no defer); all validation happens before send_modal"

patterns-established:
  - "GroupCog + staff-first-statement gate + validate-then-send_modal is the reminders command idiom (08-04 listar/borrar/editar extend it)"
  - "MensajeModal edit_id branch already implemented (3-line update path) so 08-04 editar reuses the same modal"

requirements-completed: [D-01, D-02, D-03, D-05, D-06, D-09, D-10, D-11, D-12, D-13, D-14, D-16]

# Metrics
duration: 10min
completed: 2026-07-10
---

# Phase 8 Plan 03: Reminders Cog — Create-and-Fire Pipeline Summary

**`/recordatorio crear` (staff-gated slash params + multi-line modal) plus the repo's first `@tasks.loop(minutes=1)` scheduler that fires due reminders with a brand embed, @everyone suppression, seeded reactions, D-13 catch-up marking, and D-16 one-off auto-delete.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-10T04:53:47Z
- **Completed:** 2026-07-10T05:04:04Z
- **Tasks:** 2 (both TDD)
- **Files modified:** 3 (all in `../nocturna-bot`)

## Accomplishments
- `RemindersCog` GroupCog (`/recordatorio`) with a staff-gated `crear` that validates every schedule param (name, time, weekday/day-of-month/date, past-date rejection) before opening `MensajeModal`.
- `MensajeModal` persists a reminder via `db.add_reminder` with a helper-computed `next_fire_utc`, and carries an `edit_id` branch ready for 08-04's `editar`.
- The repo's first background scheduler: a 1-minute `@tasks.loop` polling `db.due_reminders`, classifying each fire (ontime/late/skip), delivering with the D-10/D-11/D-14 contract, and applying the advance-after-send / one-off-auto-delete lifecycle — with per-reminder try/except isolation and an `@loop.error` restart guard.
- `bot.py` loads `cogs.reminders` and fail-fasts on an invalid `REMINDERS_TZ`.
- Bot test suite grew 186 → 212 (+26 new cog tests); full suite green.

## Task Commits

Each task was committed atomically (TDD: test → feat), in the `nocturna-bot` repo:

1. **Task 1: RemindersCog shell + staff-gated crear + modal + bot wiring**
   - `72bba89` (test — RED)
   - `4e8fe56` (feat — GREEN)
2. **Task 2: Scheduler loop + delivery + catch-up + D-16 lifecycle**
   - `dc0687e` (test — RED)
   - `f5f937c` (feat — GREEN)

**Plan metadata:** committed in the website repo (SUMMARY + STATE + ROADMAP + REQUIREMENTS).

## Files Created/Modified
- `../nocturna-bot/cogs/reminders.py` — appended the Discord layer below the 08-02 pure helpers: `MensajeModal`, `RemindersCog` (`crear` + `_deliver` + `_process_due` + `@tasks.loop` scheduler + `before_loop`/`error` hooks + `cog_unload`), and `setup`.
- `../nocturna-bot/bot.py` — `load_extension("cogs.reminders")` in `setup_hook`; a `ZoneInfo(config.REMINDERS_TZ)` fail-fast (`sys.exit(1)`) in `main()`.
- `../nocturna-bot/tests/test_reminders_cog.py` — +26 tests covering crear validation/gate, modal persist/edit, scheduler classification/lifecycle, and the `_deliver` contract.

## Decisions Made
- Loop body delegates to `_process_due(now)` so the scheduler is unit-testable without a live `tasks.loop` (the test fixture neutralizes `db.init_reminders` + `tasks.Loop.start`).
- Advance-after-send is the locked crash-semantics choice (documented inline in `_process_due`).
- A one-off is deleted even on a 'skip' classification — a past-due one-off is expired (D-16).
- `crear` runs the `_is_staff` gate as its first statement and validates all params before `send_modal` (never defers first).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. The `bot.py` fail-fast needed `ZoneInfoNotFoundError` imported alongside `ZoneInfo` (caught before first test run). Git reports the expected LF→CRLF warning on Windows; no functional impact.

## User Setup Required
None - no external service configuration required for this plan. Deployment to the `cinema` host (git pull + systemd restart with the real `.env`) is a manual user step, out of phase scope. Live `REMINDERS_*` env values (especially `REMINDERS_TZ` and, if overriding the gallery-staff fallback, `REMINDERS_STAFF_ROLE_IDS`) are captured at deploy time.

## Next Phase Readiness
- The create-and-fire pipeline is functioning and unit-tested; 08-04 adds `listar`/`borrar`/`editar` (autocomplete selection + the pre-filled edit modal, whose `edit_id` branch is already wired here).
- No blockers. The scheduler is the repo's first background loop — the cinema deploy should confirm the loop starts (a first-tick log) after the systemd restart.

## Self-Check: PASSED

- Files verified present: `cogs/reminders.py`, `bot.py`, `tests/test_reminders_cog.py` (all in `../nocturna-bot`), `08-03-SUMMARY.md`.
- Commits verified in git log: `72bba89`, `4e8fe56`, `dc0687e`, `f5f937c`.
- Full bot suite green: 212 passed (was 186 baseline).

---
*Phase: 08-bot-reminders-command-weekly-monthly-scheduled-reminders-wit*
*Completed: 2026-07-10*
