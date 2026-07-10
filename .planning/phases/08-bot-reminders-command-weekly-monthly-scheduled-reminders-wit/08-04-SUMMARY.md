---
phase: 08-bot-reminders-command-weekly-monthly-scheduled-reminders-wit
plan: 04
subsystem: nocturna-bot / reminders cog
tags: [discord, app_commands, autocomplete, reminders, crud, tdd]
requires:
  - "db.list_reminders / get_reminder / update_reminder / delete_reminder (08-01)"
  - "RemindersCog + MensajeModal(default_body, edit_id) + schedule_summary + validators (08-02/08-03)"
provides:
  - "/recordatorio listar (staff, brand-red embed overview)"
  - "/recordatorio borrar (staff, autocomplete-picked, id-parse-safe delete)"
  - "/recordatorio editar (staff, autocomplete pick + partial params + pre-filled modal + next_fire recompute)"
  - "RemindersCog._reminder_choices shared autocomplete backing (repo's first @app_commands.autocomplete)"
affects:
  - "../nocturna-bot/cogs/reminders.py"
  - "../nocturna-bot/tests/test_reminders_cog.py"
tech-stack:
  added: []
  patterns:
    - "RESEARCH Pattern 3: @command.autocomplete → live db query → labelled Choices, case-insensitive name filter, ≤25 cap, ≤100-char label"
    - "Partial-edit merge: None param = keep stored value; re-validate the MERGED schedule (never the delta) before persisting"
    - "MensajeModal edit_id branch finalized to update_reminder with all merged fields + recomputed next_fire_utc"
key-files:
  created: []
  modified:
    - "../nocturna-bot/cogs/reminders.py"
    - "../nocturna-bot/tests/test_reminders_cog.py"
decisions:
  - "editar always re-anchors next_fire_utc from the merged schedule — a pure name/channel/emoji edit recomputing too is harmless and simpler (documented one-line choice)"
  - "borrar/editar id parse: int() in try/except + get_reminder existence check; malformed and unknown both → the same Spanish ❌ ephemeral (T-08-10)"
  - "_reminder_choices is a @staticmethod so both borrar/editar autocomplete callbacks delegate to one place and it is unit-testable without an interaction"
metrics:
  duration: ~18 min
  tasks: 2
  files: 2
  completed: 2026-07-10
---

# Phase 8 Plan 04: Reminders Management Subcommands (listar/borrar/editar) Summary

Completed the `/recordatorio` command surface with the three management subcommands backed by the repo's first Discord autocomplete: `listar` (brand-red Spanish overview), `borrar` (autocomplete-picked, id-parse-safe deletion), and full `editar` (autocomplete pick → optional merged params → merged-schedule re-validation → pre-filled message modal → next_fire recompute), all staff-gated and unit-tested. Phase 8 is feature-complete.

## What Was Built

### Task 1 — listar + borrar with shared autocomplete backing
- `RemindersCog._reminder_choices(current)` (staticmethod): live `db.list_reminders()` → case-insensitive substring filter on `name` → `Choice(name=f"{name} — {schedule_summary}"[:100], value=str(id))`, capped at 25 (RESEARCH Pattern 3, D-04/D-05).
- `listar`: staff-gated; empty store → ephemeral "No hay recordatorios programados."; otherwise a brand-red (`0xC0192C`) embed titled "Recordatorios programados", one line per reminder `**{name}** — {summary} → <#{channel_id}>`.
- `borrar`: staff-gated; `int(recordatorio)` in try/except + `db.get_reminder` existence check (T-08-10) → `db.delete_reminder` + ephemeral "🗑️ Recordatorio **{name}** borrado."; malformed/unknown → shared "❌ No encontré ese recordatorio."
- `@borrar.autocomplete("recordatorio")` delegates to `_reminder_choices`.

### Task 2 — full editar + finalized modal edit branch
- `editar`: staff-gated; `recordatorio` (autocomplete) + the same optional param set as `crear`, all defaulting to `None`. Flow: resolve stored row → merge every non-None param over it (None = keep) → re-run `crear`'s cross-field validation on the **merged** schedule (weekly needs weekday, monthly needs day_of_month, oneoff needs a future date) → recompute `next_fire_utc` from the merged schedule via `_next_fire_for` → open `MensajeModal(default_body=row['message'], edit_id, next_fire_utc, …)` as the first response (D-15 pre-fill).
- `MensajeModal.on_submit` edit branch finalized: now persists **all** merged fields (name, frequency, schedule fields, channel, mentions, reactions) + stripped body + recomputed `next_fire_utc` via `db.update_reminder` (allow-list filtered), then confirms "✏️ Recordatorio **{name}** actualizado — {summary}". `next_fire_utc` is only included when present, so the 08-03 message-only edit test stays green.
- `@editar.autocomplete("recordatorio")` delegates to `_reminder_choices`.

## Deviations from Plan

None — plan executed exactly as written. The `editar` edit-branch adjustment was explicitly authorized by the plan ("it is this plan's contract to finalize") and implemented conservatively (conditional `next_fire_utc` inclusion) so the existing 08-03 edit test remained valid.

## TDD Gate Compliance

Both tasks followed RED → GREEN with per-gate commits:
- Task 1: `58756e6` test(08-04) RED → `0e46350` feat(08-04) GREEN
- Task 2: `d86e1a6` test(08-04) RED → `f849187` feat(08-04) GREEN

RED runs confirmed new tests failing before implementation (11 then 9). No REFACTOR commit needed.

## Verification

- `python -m pytest tests/test_reminders_cog.py -q` → 68 passed (was 48; +20).
- `python -m pytest -q` (full bot suite) → 232 passed (was 212 baseline).
- `python -c "import cogs.reminders, bot"` → clean.
- `grep -c 'app_commands.command(name="' cogs/reminders.py` → 4 (crear/listar/borrar/editar).

## Threat Model Coverage

- T-08-01 (EoP): `_is_staff` is the first statement of listar/borrar/editar — proven by non-staff → "Sin permisos." tests with no db call.
- T-08-10 (Tampering, id param): `int()` in try/except + `get_reminder` existence check on the attacker-choosable autocomplete value; parameterized `?` lookups upstream.
- T-08-04 (Tampering, merged schedule): `crear`'s validators re-run on the merged row (weekly→monthly-without-day test proves a partial edit cannot persist an inconsistent schedule).
- T-08-11 (Info disclosure, autocomplete): accepted — names/schedules are staff-facing team data; every mutating path is staff-gated.

## Known Stubs

None — listar/borrar/editar are fully wired to `core/db.py`; no placeholder data paths.

## Commits (all in ../nocturna-bot, branch main, unpushed)

- `58756e6` test(08-04): add failing tests for listar + borrar + autocomplete backing
- `0e46350` feat(08-04): add listar + borrar with shared autocomplete backing
- `d86e1a6` test(08-04): add failing tests for full editar
- `f849187` feat(08-04): add full editar + finalize modal edit branch

## Cross-Repo Note

Code lives in `nocturna-bot` (sibling repo) and is committed there, unpushed. The live cinema host must `git pull` + restart the `nocturna-bot` systemd unit to pick up the new subcommands; Discord will re-sync the `/recordatorio` group (crear/listar/borrar/editar) on next command tree sync.

## Self-Check: PASSED
- `../nocturna-bot/cogs/reminders.py` — FOUND, contains listar/borrar/editar + `_reminder_choices`
- `../nocturna-bot/tests/test_reminders_cog.py` — FOUND, 68 tests pass
- Commits 58756e6 / 0e46350 / d86e1a6 / f849187 — all present in nocturna-bot git log
