---
phase: 08-bot-reminders-command-weekly-monthly-scheduled-reminders-wit
plan: 02
subsystem: testing
tags: [discord-bot, python, zoneinfo, calendar, scheduler, tdd, pytest, timezone, dst]

# Dependency graph
requires:
  - phase: 08-01
    provides: "reminders table + CRUD in core/db.py (add/list/get/update/delete/due/set_next_fire); REMINDERS_TZ / REMINDERS_STAFF_ROLE_IDS / REMINDERS_CATCHUP_GRACE_HOURS in config.py; tzdata pin"
provides:
  - "cogs/reminders.py pure schedule-math helpers: next_weekly_fire, next_monthly_fire, next_oneoff_fire, _clamp_day, compute_next"
  - "classify_fire catch-up window classifier (ontime/late/skip)"
  - "input validators: parse_time, parse_date, valid_weekday, valid_day_of_month, parse_emojis"
  - "schedule_summary Spanish one-line formatter (autocomplete label / listar line)"
  - "_is_staff role-intersection gate against config.REMINDERS_STAFF_ROLE_IDS"
  - "tests/test_reminders_cog.py — 22 unit tests over all pure helpers incl. DST/leap/clamp/catch-up"
affects: [08-03, 08-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure schedule-math module (no Discord/DB imports) unit-tested with plain asserts — interface-first contract for the scheduler wiring in 08-03"
    - "DST-correct local->UTC via zoneinfo.ZoneInfo + astimezone (never fixed offsets); month-end clamp via calendar.monthrange (never +30-day drift)"

key-files:
  created:
    - "../nocturna-bot/cogs/reminders.py"
    - "../nocturna-bot/tests/test_reminders_cog.py"
  modified: []

key-decisions:
  - "compute_next('oneoff') returns the stored next_fire_utc UNCHANGED (never recomputed) — the scheduler deletes one-off rows after firing (D-16), so a defensive call is a harmless no-op rather than a re-fire loop"
  - "parse_time documented rule: exactly two ':'-separated integer fields (1- or 2-digit each), 0<=h<=23 / 0<=m<=59 — so '9:5' is accepted as (9,5) while '24:00'/'09:60'/'9'/'ab:cd'/'09:05:00' all raise ValueError"
  - "next_*_fire tz params default to config.REMINDERS_TZ (tz=None) so callers can omit the zone; compute_next passes it explicitly"

patterns-established:
  - "Pattern: high-risk scheduler math (DST, leap years, month-ends, catch-up) isolated as pure module-level functions and unit-proven before any Discord cog class exists"

requirements-completed: [D-02, D-06, D-07, D-08, D-09, D-13, D-14]

# Metrics
duration: 5min
completed: 2026-07-10
---

# Phase 8 Plan 02: Reminders Pure Schedule-Math, Validators, and Staff Gate Summary

**DST-correct weekly/monthly/one-off next-fire math (zoneinfo + calendar month-clamp), catch-up classification, input validators, and the staff-role gate for `cogs/reminders.py` — 13 pure helpers proven by 22 unit tests, no cog class yet.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-10T04:38:54Z
- **Completed:** 2026-07-10T04:43:55Z
- **Tasks:** 1 feature (TDD: RED → GREEN, no refactor needed)
- **Files modified:** 2 (both in `../nocturna-bot`)

## Accomplishments
- Isolated every "hard" scheduler concern (DST via `ZoneInfo`, leap/month-end via `calendar.monthrange`, catch-up grace window) into pure, import-safe functions with zero Discord/DB dependency
- 22 unit tests cover weekly/monthly/one-off next-fire, `_clamp_day` (non-leap + leap Feb + 30-day month), a US spring-forward DST-boundary case (09:00 wall time preserved, offset flips EST→EDT), `classify_fire` ontime/late/skip, all validators, the emoji cap, `schedule_summary`, and the `_is_staff` gate
- Full bot suite green at 186 passed (was 164 baseline; +22 new), zero regression
- Confirmed anti-patterns absent: no `timedelta(hours=-…)` fixed offsets, no `timedelta(days=30)` drift, and no cog class / modal / `@tasks.loop` / `setup()` (all deferred to 08-03)

## Task Commits

TDD cadence (test → feat), committed in the `../nocturna-bot` repo:

1. **RED — failing tests** - `1c1b860` (test)
2. **GREEN — pure helpers implementation** - `77471c4` (feat)

_No refactor commit — the GREEN implementation followed the RESEARCH reference implementations directly and needed no cleanup._

**Plan metadata (website repo):** see final docs commit.

## Files Created/Modified
- `../nocturna-bot/cogs/reminders.py` - Pure schedule-math (`next_weekly_fire`, `next_monthly_fire`, `next_oneoff_fire`, `_clamp_day`, `compute_next`), `classify_fire`, validators (`parse_time`, `parse_date`, `valid_weekday`, `valid_day_of_month`, `parse_emojis`), `schedule_summary`, `_is_staff` — no cog class/scheduler/modal
- `../nocturna-bot/tests/test_reminders_cog.py` - 22 unit tests over the pure helpers (SimpleNamespace fakes, plain asserts, no pytest-asyncio — repo idiom)

## Decisions Made
- **compute_next('oneoff') returns the stored instant unchanged** — one-off reminders are fired once then deleted by the 08-03 scheduler (D-16); returning the stored `next_fire_utc` makes a defensive call a harmless no-op instead of a re-fire loop or a crash.
- **parse_time rule documented and tested** — two integer `:`-fields, in range; `'9:5'` accepted as `(9,5)`, `'24:00'/'09:60'/'9'/'ab:cd'/'09:05:00'` rejected.
- **tz params default to `config.REMINDERS_TZ`** on all three `next_*_fire` functions so `next_oneoff_fire('2026-12-25','18','30')` works with the zone omitted (matches the behavior example); `compute_next` passes the zone explicitly.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. The git "LF will be replaced by CRLF" warnings on commit are benign line-ending normalization on Windows, not errors.

## User Setup Required
None - no external service configuration required. (This plan adds pure functions + tests only; the cog is not yet loaded by `bot.py` — that happens in 08-03.)

## Next Phase Readiness
- 08-03 can import `cogs.reminders` and call the pure helpers to build the `RemindersCog` (GroupCog), the `@tasks.loop(minutes=1)` scheduler (using `compute_next` + `classify_fire` + `db.due_reminders`/`set_next_fire`), the `MensajeModal`, and delivery (mention line + embed + `parse_emojis` seeded reactions).
- No blockers. The pure-function contract in the `<interfaces>` block is fully satisfied and test-proven.

## TDD Gate Compliance
- RED gate present: `1c1b860` `test(08-02): …` — committed with the module absent (collection ImportError = failing as expected).
- GREEN gate present: `77471c4` `feat(08-02): …` — implementation makes all 22 tests pass.
- REFACTOR gate: intentionally omitted (no cleanup required).

## Self-Check: PASSED
- `../nocturna-bot/cogs/reminders.py` — FOUND
- `../nocturna-bot/tests/test_reminders_cog.py` — FOUND
- Commit `1c1b860` (test) — FOUND
- Commit `77471c4` (feat) — FOUND
- `python -m pytest tests/test_reminders_cog.py -q` — 22 passed
- `python -m pytest -q` (full suite) — 186 passed

---
*Phase: 08-bot-reminders-command-weekly-monthly-scheduled-reminders-wit*
*Completed: 2026-07-10*
