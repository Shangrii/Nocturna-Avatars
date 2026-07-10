---
phase: 08-bot-reminders-command-weekly-monthly-scheduled-reminders-wit
plan: 05
subsystem: bot
tags: [discord, app_commands, autocomplete, authorization, security, reminders, pytest]

# Dependency graph
requires:
  - phase: 08-bot-reminders-command-weekly-monthly-scheduled-reminders-wit (08-04)
    provides: "_reminder_choices autocomplete backing + borrar/editar subcommands with the _is_staff gate idiom"
provides:
  - "D-02 staff trust boundary now enforced on the borrar/editar autocomplete channel (not just the execution subcommands)"
  - "Non-staff callers of borrar/editar autocomplete receive [] and never trigger db.list_reminders()"
affects: [reminders, bot-security, phase-08-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Autocomplete callbacks enforce the same _is_staff gate as their subcommand, but return [] (no ephemeral reply possible in an autocomplete) instead of a 'Sin permisos.' message"

key-files:
  created: []
  modified:
    - ../nocturna-bot/cogs/reminders.py
    - ../nocturna-bot/tests/test_reminders_cog.py

key-decisions:
  - "Non-staff autocomplete response is an empty Choice list ([]) per CR-01 — an autocomplete callback cannot send an ephemeral reply, unlike the execution subcommands which return 'Sin permisos.'"
  - "Fix enforced at the data-read boundary (staff gate before db.list_reminders), not via default_permissions command visibility (T-08-07 accepted, out of scope)"

patterns-established:
  - "Every db-reading surface on /recordatorio (crear/listar/borrar/editar subcommands AND both autocomplete callbacks) gates on _is_staff as its first statement"

requirements-completed: [D-02, D-04]

# Metrics
duration: ~8min
completed: 2026-07-10
---

# Phase 08 Plan 05: Autocomplete Staff-Gate Gap Closure Summary

**Closed the D-02 authorization-bypass gap: borrar/editar autocomplete now gate on `_is_staff` and return `[]` for non-staff, so no guild member can enumerate reminder names + schedules through the picker.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-10
- **Completed:** 2026-07-10
- **Tasks:** 2
- **Files modified:** 2 (both in ../nocturna-bot)

## Accomplishments
- `borrar_autocomplete` and `editar_autocomplete` now return `[]` as their first action for a non-staff caller, before any `db.list_reminders()` read — closing CR-01 (Critical) and the failed D-02 truth (08-VERIFICATION.md Truth 18).
- Staff behavior unchanged: a `REMINDERS_STAFF_ROLE_IDS` holder still gets the full filtered `Choice` list from both callbacks.
- Test coverage added: 2 existing delegate tests updated to pass a staff interaction stub, 2 new non-staff tests assert `[] + list_reminders.assert_not_called()`.
- Full bot suite: 234 passed (was 232), zero regressions.

## Task Commits

Each task was committed atomically in the **../nocturna-bot** repo:

1. **Task 1: Gate borrar_autocomplete and editar_autocomplete on _is_staff** - `2207a69` (fix)
2. **Task 2: Test autocomplete staff-gating (non-staff → [] + no db read; staff still delegates)** - `813cc89` (test)

**Plan metadata:** committed in the website repo (SUMMARY.md + STATE.md + ROADMAP.md).

_Note: This gap-closure plan applied the fix-first ordering from the plan (Task 1 code, Task 2 tests); both tasks marked tdd="true". The existing delegate tests were updated in Task 2 to accommodate the new gate._

## Files Created/Modified
- `../nocturna-bot/cogs/reminders.py` - Added the `if not _is_staff(interaction.user): return []` guard as the first statement of both `borrar_autocomplete` and `editar_autocomplete` (gate count 4 → 6). `_reminder_choices` left byte-for-byte unchanged.
- `../nocturna-bot/tests/test_reminders_cog.py` - Updated the 2 delegate tests to pass a staff interaction stub (was `None`, which now short-circuits to `[]`); added `test_borrar_autocomplete_non_staff_returns_empty_no_db` and `test_editar_autocomplete_non_staff_returns_empty_no_db`.

## Decisions Made
- Non-staff autocomplete response is `[]` (not an ephemeral "Sin permisos.") — an autocomplete callback cannot send a message, per CR-01's specified fix.
- Defense enforced at the data-read boundary (gate before `db.list_reminders()`), not via `default_permissions` — `default_permissions` was classified out of scope (T-08-07 accepted).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. All acceptance criteria met on first run: gate count 6, `autocomplete(None,` count 0, 2 new test names present, cog file 70 passed, full suite 234 passed, module imports clean.

## Verification Evidence
- `grep -c "if not _is_staff(interaction.user)" cogs/reminders.py` → 6
- `grep -c "autocomplete(None," tests/test_reminders_cog.py` → 0
- `grep -c "def test_borrar_autocomplete_non_staff_returns_empty_no_db\|def test_editar_autocomplete_non_staff_returns_empty_no_db" tests/test_reminders_cog.py` → 2
- `python -m pytest tests/test_reminders_cog.py -q` → 70 passed
- `python -m pytest -q` → 234 passed
- `python -c "import cogs.reminders, bot"` → exit 0

## Next Phase Readiness
- Phase 8's single failed verification truth (D-02 autocomplete boundary) is closed; the /recordatorio surface honors one uniform trust level across every db-reading path.
- No blockers introduced. Scope held strictly to the one gap — none of the 5 WARNING / 5 INFO 08-REVIEW findings were touched.

## Self-Check: PASSED

- FOUND: `.planning/phases/08-.../08-05-SUMMARY.md`
- FOUND: bot commit `2207a69` (fix — Task 1)
- FOUND: bot commit `813cc89` (test — Task 2)

---
*Phase: 08-bot-reminders-command-weekly-monthly-scheduled-reminders-wit*
*Completed: 2026-07-10*
