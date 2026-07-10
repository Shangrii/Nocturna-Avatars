---
phase: 08-bot-reminders-command-weekly-monthly-scheduled-reminders-wit
plan: 01
subsystem: database
tags: [sqlite, discord-bot, reminders, zoneinfo, tzdata, config]

# Dependency graph
requires:
  - phase: 05-bot-gallery
    provides: "core/db.py _get_conn/init_* idiom, config.py GALLERY_STAFF_ROLE_IDS staff-gate fallback"
  - phase: 07-reviews
    provides: "config.py REVIEWS_STAFF_ROLE_IDS `or GALLERY_STAFF_ROLE_IDS` fallback idiom to mirror"
provides:
  - "reminders SQLite table + 8 CRUD helpers (init_reminders/add/list/get/update/delete/due/set_next_fire)"
  - "REMINDERS_TZ / REMINDERS_STAFF_ROLE_IDS / REMINDERS_CATCHUP_GRACE_HOURS config constants"
  - "tzdata>=2025.2 pin so zoneinfo resolves REMINDERS_TZ on Windows/CI"
  - "documented REMINDERS_* block in .env.example"
affects: [08-02-modal-validation, 08-03-scheduler-delivery, 08-04-management-commands]

# Tech tracking
tech-stack:
  added: [tzdata>=2025.2]
  patterns:
    - "Reminders CRUD mirrors gallery_state idiom: parameterized ? placeholders only, with _get_conn() as conn auto-commit, created_at via datetime.now(timezone.utc).isoformat()"
    - "update_reminder dynamic SET clause is guarded by a _REMINDER_UPDATABLE column allow-list (never f-string SQL) so an unexpected **fields key cannot inject a column name"
    - "REMINDERS_STAFF_ROLE_IDS uses the reviews `or GALLERY_STAFF_ROLE_IDS` comma-split fallback"

key-files:
  created: []
  modified:
    - ../nocturna-bot/core/db.py
    - ../nocturna-bot/config.py
    - ../nocturna-bot/requirements.txt
    - ../nocturna-bot/.env.example

key-decisions:
  - "reminders table is NOT wired into init_db(); the cog's __init__ calls db.init_reminders() itself (same pattern as init_gallery_state)"
  - "update_reminder builds its SET clause via plain string concatenation over an explicit _REMINDER_UPDATABLE allow-list — not an f-string — to satisfy both the T-08-03 no-injection rule and the no-f-string-SQL acceptance grep"
  - "REMINDERS_CATCHUP_GRACE_HOURS defaults to 6 (bottom of the 6–12h D-13 band)"

patterns-established:
  - "Pattern: frequency-agnostic reminders row — nullable weekday/day_of_month/run_date, only the frequency-specific field populated; next_fire_utc is the single scheduler cursor"
  - "Pattern: column allow-list gate on any dynamic-SET update helper in core/db.py"

requirements-completed: [D-02, D-06, D-07, D-08, D-09, D-12, D-13, D-14, D-16]

# Metrics
duration: ~12min
completed: 2026-07-09
---

# Phase 8 Plan 01: Reminders Persistence + Config Foundation Summary

**SQLite `reminders` table with 8 parameterized CRUD helpers plus the REMINDERS_TZ / staff-role / catch-up-grace config surface and a tzdata pin — the contract layer for the reminders cog.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-07-09
- **Tasks:** 2
- **Files modified:** 4 (all in the sibling `nocturna-bot` repo)

## Accomplishments
- `reminders` table + 8 CRUD helpers appended to `core/db.py`, round-tripping cleanly (init → add → list/get → update → due → set_next_fire → delete)
- `REMINDERS_TZ` / `REMINDERS_STAFF_ROLE_IDS` (gallery-staff fallback) / `REMINDERS_CATCHUP_GRACE_HOURS` constants in `config.py`, all resolving; `ZoneInfo(REMINDERS_TZ)` valid
- `tzdata>=2025.2` pinned so `zoneinfo` resolves the IANA zone on Windows/CI
- Three `REMINDERS_*` vars documented in `.env.example` with Spanish inline comments
- Existing bot suite still green: **164 passed** (no regression)

## Task Commits

Committed atomically in the `nocturna-bot` repo (code) — not the website repo:

1. **Task 1: reminders table + CRUD in core/db.py** — `d56fd92` (feat)
2. **Task 2: REMINDERS_* config + tzdata pin + .env.example docs** — `be58ba0` (feat)

**Plan metadata (website repo):** committed with SUMMARY.md / STATE.md / ROADMAP.md

## Files Created/Modified
- `../nocturna-bot/core/db.py` — appended "Recordatorios (Fase 8)" section: `init_reminders`, `add_reminder`, `list_reminders`, `get_reminder`, `update_reminder` (allow-list guarded), `delete_reminder`, `due_reminders`, `set_next_fire`
- `../nocturna-bot/config.py` — `REMINDERS_TZ`, `REMINDERS_STAFF_ROLE_IDS` (`or GALLERY_STAFF_ROLE_IDS`), `REMINDERS_CATCHUP_GRACE_HOURS`
- `../nocturna-bot/requirements.txt` — `tzdata>=2025.2` pin under a Fase 8 section comment
- `../nocturna-bot/.env.example` — documented `REMINDERS_TZ` / `REMINDERS_STAFF_ROLE_IDS` / `REMINDERS_CATCHUP_GRACE_HOURS`

## Decisions Made
- `init_reminders()` deliberately left out of `init_db()`; the cog owns the call (mirrors `init_gallery_state`, per PATTERNS.md).
- `update_reminder`'s dynamic SET clause is assembled with plain string concatenation over the `_REMINDER_UPDATABLE` allow-list rather than an f-string. The dynamic clause is unavoidable (only-passed-columns update), but avoiding `f"..."` keeps the acceptance-criterion grep (`no f-string SQL in the reminders block`) clean while the allow-list closes the injection surface (T-08-03).
- Catch-up grace defaults to 6h (D-13 band 6–12h).

## Deviations from Plan

None — plan executed exactly as written. (The concatenation-over-f-string choice in `update_reminder` is an implementation detail of the plan's stated "dynamic SET with allow-list" instruction, not a deviation.)

## Issues Encountered
None. Both task automated checks printed `OK` (+ `DOCS_OK` for Task 2), and the full existing suite passed (164 tests).

## User Setup Required
None for this plan. Deployment to the `cinema` systemd host (`git pull` + `pip install -r requirements.txt` for tzdata + restart) is a manual user step, out of phase scope and only needed once a later plan ships the live cog.

## Next Phase Readiness
- Downstream plans (08-03 scheduler/delivery, 08-04 management commands) can consume the 8 CRUD functions and the 3 config constants verbatim — no exploration needed.
- `next_fire_utc` cursor + `due_reminders(now)` contract is in place for the `@tasks.loop` scheduler.
- No blockers.

## Self-Check: PASSED

- Files verified present: `08-01-SUMMARY.md`, `core/db.py`, `config.py`, `requirements.txt`, `.env.example`
- Code commits verified in `nocturna-bot`: `d56fd92`, `be58ba0`

---
*Phase: 08-bot-reminders-command-weekly-monthly-scheduled-reminders-wit*
*Completed: 2026-07-09*
