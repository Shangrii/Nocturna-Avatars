---
phase: 08-bot-reminders-command-weekly-monthly-scheduled-reminders-wit
verified: 2026-07-10T00:00:00Z
status: gaps_found
score: 17/18 must-haves verified
overrides_applied: 0
gaps:
  - truth: "D-02: staff trust boundary is enforced across the whole /recordatorio command surface, including the borrar/editar autocomplete channel (roadmap goal explicitly pairs 'staff-gated' with 'crear/listar/borrar/editar with autocomplete')"
    status: failed
    reason: "borrar_autocomplete and editar_autocomplete call RemindersCog._reminder_choices(current), which runs db.list_reminders() and returns every reminder's name + full schedule summary as Discord autocomplete suggestions, with NO _is_staff check. Any guild member who can see the /recordatorio command (no default_permissions restricts it) can type /recordatorio borrar or /recordatorio editar and enumerate every staff reminder's name and schedule — exactly the data listar's own code comment says must never reach a non-staff member ('no store read for a non-staff member'). Confirmed independently by reading cogs/reminders.py:505-508,633-636 and by the existing test (test_borrar_autocomplete_delegates_to_reminder_choices) which calls cog.borrar_autocomplete(None, \"jun\") successfully — proving the callback never inspects the interaction/user at all. Matches 08-REVIEW.md CR-01 (Critical/blocker)."
    artifacts:
      - path: "../nocturna-bot/cogs/reminders.py"
        issue: "Lines 505-508 (borrar_autocomplete) and 633-636 (editar_autocomplete) delegate straight to _reminder_choices(current) with no _is_staff(interaction.user) gate, unlike every other subcommand in the file which gates as its first statement."
      - path: "../nocturna-bot/tests/test_reminders_cog.py"
        issue: "No test asserts autocomplete is staff-gated; the two existing autocomplete tests pass interaction=None, which only works because the callback ignores the interaction entirely."
    missing:
      - "Add an _is_staff(interaction.user) check as the first statement of borrar_autocomplete and editar_autocomplete, returning [] for non-staff (mirrors CR-01's suggested fix)."
      - "A test asserting a non-staff interaction to borrar_autocomplete/editar_autocomplete returns an empty list and does not call db.list_reminders."
---

# Phase 8: Bot Reminders Command Verification Report

**Phase Goal:** Bot Reminders Command — staff can create weekly/monthly scheduled reminders with a custom message via a `/recordatorio` slash-command in the nocturna-bot Discord bot, and the bot delivers them on schedule (cog in the nocturna-bot repo).
**Verified:** 2026-07-10
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

All work was independently re-verified directly against the sibling repo `../nocturna-bot` (absolute: `C:\Users\Shangri\Pictures\Nocturna Avatars\Coding\nocturna-bot`) — commits, file contents, and test runs were re-executed in this session, not taken from SUMMARY.md claims. All 12 documented commits (`d56fd92`, `be58ba0`, `1c1b860`, `77471c4`, `72bba89`, `4e8fe56`, `dc0687e`, `f5f937c`, `58756e6`, `0e46350`, `d86e1a6`, `f849187`) are present in `git log`, working tree is clean, and `python -m pytest -q` independently reproduces **232 passed** (no local failures, no skips).

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | (D-06/D-09/D-16) Reminder row create/list/get/update/delete/due-query works via `core/db.py` | ✓ VERIFIED | Re-ran the plan's exact smoke script independently in this session; printed `OK`. All 8 functions (`init_reminders`, `add_reminder`, `list_reminders`, `get_reminder`, `update_reminder`, `delete_reminder`, `due_reminders`, `set_next_fire`) present at `core/db.py:228-337`. |
| 2 | (D-08/D-12/D-14) Schema persists `day_of_month`, per-reminder `channel_id`, seeded `reactions` | ✓ VERIFIED | `CREATE TABLE IF NOT EXISTS reminders` (core/db.py:238-255) contains `day_of_month INTEGER`, `channel_id INTEGER NOT NULL`, `reactions TEXT DEFAULT ''`. |
| 3 | (D-02/D-07/D-13) config exposes `REMINDERS_TZ`, `REMINDERS_STAFF_ROLE_IDS` (gallery fallback), `REMINDERS_CATCHUP_GRACE_HOURS` | ✓ VERIFIED | `config.py:90,93-96,98` — `REMINDERS_STAFF_ROLE_IDS` falls back via `or GALLERY_STAFF_ROLE_IDS`. |
| 4 | (D-07) `tzdata` pinned so `zoneinfo` resolves `REMINDERS_TZ` on any OS | ✓ VERIFIED | `requirements.txt:24` — `tzdata>=2025.2`. |
| 5 | (D-06/D-07/D-09) `next_weekly_fire`/`next_monthly_fire`/`next_oneoff_fire` return correct next UTC instant, one weekday per reminder | ✓ VERIFIED | `cogs/reminders.py:49-90`; independently re-ran `pytest tests/test_reminders_cog.py -q` → 68 passed, including weekly/monthly/oneoff/DST cases. |
| 6 | (D-08) `_clamp_day` clamps day-31 to last day of shorter months incl. leap Feb | ✓ VERIFIED | `cogs/reminders.py:40-46` uses `calendar.monthrange`; `test_clamp_day_short_month_and_leap` passes. |
| 7 | (D-13) `classify_fire` returns ontime/late/skip against a grace window | ✓ VERIFIED | `cogs/reminders.py:110-122`; `test_classify_fire_ontime_late_skip` passes. |
| 8 | (D-14) validators reject malformed input; `parse_emojis` caps the list | ✓ VERIFIED | `cogs/reminders.py:126-171`; corresponding tests pass. |
| 9 | (D-02) `_is_staff` true only for a `REMINDERS_STAFF_ROLE_IDS` role holder | ✓ VERIFIED | `cogs/reminders.py:189-197`; `test_is_staff_*` tests pass. |
| 10 | (D-01/D-03/D-05/D-06/D-09/D-12) staff can run `crear` with schedule+channel+name+emoji params and complete the message in a modal; reminder persists with computed `next_fire_utc` | ✓ VERIFIED | `cogs/reminders.py:337-433` (crear) + `MensajeModal.on_submit` (221-299); `test_crear_valid_weekly_opens_modal_with_params`, `test_modal_submit_persists_reminder` pass. |
| 11 | (D-02) non-staff invoking `crear` gets ephemeral "Sin permisos." and nothing persisted | ✓ VERIFIED | `cogs/reminders.py:361-364` — staff gate is the first statement; `test_crear_non_staff_rejected_no_persist` passes. |
| 12 | (D-10/D-11/D-14) scheduler fires due reminders: mention line + branded embed, `@everyone`/`@here` suppressed, seeded reactions added | ✓ VERIFIED | `_deliver` (cogs/reminders.py:639-680) builds `content = r["mentions"] or None`, `discord.AllowedMentions(everyone=False, roles=True, users=True)` (line 670), seeds each `parse_emojis` reaction; `test_deliver_*` tests pass. `grep "AllowedMentions(everyone=False"` matches. |
| 13 | (D-13/D-16) a fire missed within grace sends "⏰ atrasado"; older misses advance silently; one-off auto-deletes after firing | ✓ VERIFIED | `_process_due` (cogs/reminders.py:683-708); `test_due_late_within_grace_marks_atrasado`, `test_due_skip_beyond_grace_sends_nothing_but_advances`, `test_due_oneoff_delivers_once_then_deletes`, `test_due_skip_oneoff_beyond_grace_is_deleted` all pass. |
| 14 | `bot.py` loads `cogs.reminders` and fail-fasts on invalid `REMINDERS_TZ` | ✓ VERIFIED | `bot.py:47` (`load_extension("cogs.reminders")`); `bot.py:106-116` — `ZoneInfo(config.REMINDERS_TZ)` validated in `main()`, `sys.exit(1)` on `ZoneInfoNotFoundError`/`KeyError`/`ValueError`. |
| 15 | (D-01/D-05) staff can run `listar` and see every reminder as name + Spanish schedule summary + target channel | ✓ VERIFIED | `cogs/reminders.py:456-477`; `test_listar_builds_embed_with_names_and_summaries` passes. (Note: WR-01 below — unbounded at scale, non-blocking edge case.) |
| 16 | (D-01/D-04) staff can run `borrar`, pick via autocomplete (name + schedule summary), and delete | ⚠️ PARTIAL | Execution path IS staff-gated and works (`cogs/reminders.py:480-503`; `test_borrar_valid_id_deletes_and_confirms` passes). BUT the autocomplete channel that backs the picker is NOT staff-gated — see Truth 18/CR-01 below. The command executes correctly for staff; the picker leaks data to non-staff. |
| 17 | (D-04/D-15) staff can run `editar`, pick via autocomplete, change schedule/channel/name/reactions/mention via optional params, finish in a modal PRE-FILLED with the stored body | ⚠️ PARTIAL | Execution path staff-gated, merge/re-validation/pre-fill all verified (`cogs/reminders.py:530-631`; `test_editar_partial_hora_prefills_modal_and_merges`, `test_editar_weekly_to_monthly_without_day_rejected`, `test_editar_on_submit_updates_not_adds_with_recompute` all pass). Same autocomplete leak as Truth 16. |
| 18 | (D-02) the staff trust boundary is enforced across the whole `/recordatorio` command surface — "One trust level across the bot" (CONTEXT.md D-02), matching ROADMAP's phrase "staff-gated `/recordatorio` command group (crear/listar/borrar/editar **with autocomplete** + multi-line modal)" | ✗ FAILED | `borrar_autocomplete` (cogs/reminders.py:505-508) and `editar_autocomplete` (633-636) call `_is_staff`-free `_reminder_choices(current)`, which runs `db.list_reminders()` and returns every reminder's name + schedule to ANY guild member who can see the command (no `default_permissions` restricts `/recordatorio`). Independently confirmed by reading the code and by the existing test `test_borrar_autocomplete_delegates_to_reminder_choices`, which calls `cog.borrar_autocomplete(None, "jun")` and succeeds — proving the callback never touches `interaction`/`_is_staff` at all. This directly contradicts `listar`'s own in-code comment ("no store read for a non-staff member") and the phase's own D-02 decision. Matches 08-REVIEW.md **CR-01 (Critical/blocker)**. |

**Score:** 17/18 truths verified (Truth 18 FAILED; Truths 16-17 partially degraded by the same root cause).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `../nocturna-bot/core/db.py` | reminders table + 8 CRUD helpers | ✓ VERIFIED | All present, parameterized `?` only, `_REMINDER_UPDATABLE` allow-list guards `update_reminder`; `init_db()` NOT modified to call `init_reminders()` (per plan). |
| `../nocturna-bot/config.py` | `REMINDERS_*` env constants | ✓ VERIFIED | `REMINDERS_TZ`, `REMINDERS_STAFF_ROLE_IDS`, `REMINDERS_CATCHUP_GRACE_HOURS` present and resolve. |
| `../nocturna-bot/requirements.txt` | `tzdata` pin | ✓ VERIFIED | `tzdata>=2025.2`. |
| `../nocturna-bot/.env.example` | documented `REMINDERS_*` vars | ✓ VERIFIED | All three vars documented with Spanish inline comments. |
| `../nocturna-bot/cogs/reminders.py` | pure helpers + `RemindersCog` + `MensajeModal` + `_deliver` + scheduler + management subcommands | ✓ VERIFIED (substantively) / ⚠️ WIRED-WITH-GAP | 730 lines; all 13 pure helpers, `MensajeModal`, `RemindersCog` (4 subcommands + `_reminder_choices` + `_deliver` + `_process_due` + `@tasks.loop`), `setup()` all present and exercised by tests. Wiring gap: autocomplete callbacks bypass the staff gate (see Truth 18). |
| `../nocturna-bot/bot.py` | `cogs.reminders` extension load + `REMINDERS_TZ` fail-fast | ✓ VERIFIED | `setup_hook` loads the extension; `main()` fail-fasts. |
| `../nocturna-bot/tests/test_reminders_cog.py` | unit tests for all pure helpers + cog behavior | ✓ VERIFIED | 837 lines, 68 `test_` functions; independently re-ran, 68 passed. No test covers autocomplete staff-gating (confirms the gap is untested, not just unimplemented). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `config.REMINDERS_STAFF_ROLE_IDS` | `config.GALLERY_STAFF_ROLE_IDS` | or-fallback | ✓ WIRED | `config.py:93-96` contains `or GALLERY_STAFF_ROLE_IDS`. |
| `db.due_reminders` | `reminders.next_fire_utc` | `WHERE next_fire_utc <= ?` | ✓ WIRED | `core/db.py:322-328`. |
| `RemindersCog.__init__` | `core/db.py init_reminders + scheduler start` | `db.init_reminders()` then `self._scheduler.start()` | ✓ WIRED | `cogs/reminders.py:326-329`. |
| `_deliver` | `discord.AllowedMentions` | `everyone=False, roles=True, users=True` | ✓ WIRED | `cogs/reminders.py:670`. |
| scheduler tick | `db.due_reminders`/`set_next_fire`/`delete_reminder` | due query then advance-after-send or one-off delete | ✓ WIRED | `_process_due` (cogs/reminders.py:693-708). |
| `borrar`/`editar` autocomplete | `_is_staff` gate | staff check before `db.list_reminders()` | ✗ NOT WIRED | **CR-01** — no staff check exists in either autocomplete callback; both call `_reminder_choices` unconditionally. |
| `editar` | `MensajeModal(default_body=...)` | pre-filled `TextInput` default | ✓ WIRED | `cogs/reminders.py:630-631`; `default_body=row["message"]`. |
| `editar` schedule changes | `compute_next`/`next_*_fire` | recomputed `next_fire_utc` persisted via `db.update_reminder` | ✓ WIRED | `cogs/reminders.py:616-627`. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Reminders CRUD round-trip (init→add→list/get→update→due→set_next_fire→delete) | Independently re-ran the 08-01 plan's exact smoke script in this session | printed `OK` | ✓ PASS |
| Full bot test suite | `cd ../nocturna-bot && python -m pytest -q` | `232 passed, 2 warnings` | ✓ PASS |
| Reminders test file alone | `cd ../nocturna-bot && python -m pytest tests/test_reminders_cog.py -q` | `68 passed, 1 warning` | ✓ PASS |
| Cog + bot import cleanly | `python -c "import cogs.reminders, bot"` | no error (implied by suite collecting/running; both modules imported by conftest/tests) | ✓ PASS |
| No debt markers in phase files | `grep -n -E "TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER" cogs/reminders.py core/db.py config.py bot.py requirements.txt .env.example` | no matches | ✓ PASS |

### Requirements Coverage

No formal `REQ-ID`s are mapped to Phase 8 in `.planning/REQUIREMENTS.md` (confirmed — grep for "Phase 8"/"recordatorio" returns nothing beyond unrelated `BOT-01..06` from Phase 5). This matches the task instructions: Phase 8 is governed by the CONTEXT.md locked-decision set `D-01…D-16`, not formal REQ-IDs. All D-01 through D-16 decisions were traced against the codebase:

| Decision | Description | Status | Evidence |
|----------|-------------|--------|----------|
| D-01 | `/recordatorio` group with crear/listar/borrar/editar | ✓ SATISFIED | `grep -c 'app_commands.command(name="'` = 4. |
| D-02 | Same staff-role pattern, "one trust level across the bot" | ✗ BLOCKED (partial) | Subcommand execution IS gated everywhere; the autocomplete channel is NOT — CR-01. |
| D-03 | Slash params + modal for message body | ✓ SATISFIED | `crear` validates params then `send_modal`. |
| D-04 | `borrar`/`editar` select via autocomplete | ✓ SATISFIED (mechanism) / see D-02 for the gating gap | `_reminder_choices` backs both. |
| D-05 | Required short name powering autocomplete/listar/embed title | ✓ SATISFIED | `_NAME_MAX` enforced; used as embed title and Choice label. |
| D-06 | weekly/monthly/one-off frequencies | ✓ SATISFIED | Schema + dispatch confirmed. |
| D-07 | Fixed team timezone from `.env`, DST-aware | ✓ SATISFIED | `ZoneInfo`-based, tested across spring-forward. |
| D-08 | Monthly day 29/30/31 clamps to last day | ✓ SATISFIED | `_clamp_day` + leap-year test. |
| D-09 | Weekly = one weekday per reminder | ✓ SATISFIED | Single `weekday` column/param. |
| D-10 | Mention line + branded embed | ✓ SATISFIED | `_deliver` content line separate from embed. |
| D-11 | `@everyone`/`@here` suppressed | ✓ SATISFIED | `AllowedMentions(everyone=False, ...)`. |
| D-12 | Per-reminder target channel | ✓ SATISFIED | `channel_id` column + picker param. |
| D-13 | Catch-up grace window, "⏰ atrasado" marking | ✓ SATISFIED | `classify_fire` + grace-hours config. |
| D-14 | Seeded reactions, seed-only (no tally) | ✓ SATISFIED | `parse_emojis` + `add_reaction` loop; no tally code exists. |
| D-15 | Full `editar` (pick, pre-fill, change) over delete+recreate | ✓ SATISFIED | Merge + pre-filled modal confirmed. |
| D-16 | Recurring run until deleted; one-off auto-deletes | ✓ SATISFIED | `_process_due` lifecycle branch. |

**Orphaned requirements:** None found — `.planning/REQUIREMENTS.md` maps no additional Phase-8 IDs beyond the CONTEXT.md D-01…D-16 set already covered above.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `../nocturna-bot/cogs/reminders.py` | 505-508, 633-636 | Ungated autocomplete callback reading staff-only data (`_reminder_choices` → `db.list_reminders()`) | 🛑 BLOCKER | Confirmed CR-01: authorization bypass of the phase's own D-02 trust boundary; non-staff can enumerate every reminder name + schedule. |
| `../nocturna-bot/cogs/reminders.py` | 471-477 | `listar` embed description has no length cap | ⚠️ WARNING | 08-REVIEW.md WR-01 — breaks past ~27 reminders (`HTTPException 400`). Non-blocking today (team-scale reminder counts), but reachable through normal use with no created-count limit. |
| `../nocturna-bot/cogs/reminders.py` | 721-726 | `_on_scheduler_error` restarts the loop with no backoff | ⚠️ WARNING | 08-REVIEW.md WR-02 — a persistent DB failure could hot-crash-loop the scheduler on the shared cinema host. |
| `../nocturna-bot/core/db.py` | 258-262 | `add_reminder`'s `next_fire_utc=""` default | ⚠️ WARNING | 08-REVIEW.md WR-03 — API invites a poison-row bug if a future caller omits the arg; the cog itself always passes it correctly today. |
| `../nocturna-bot/cogs/reminders.py` | 671 | `_deliver` doesn't catch a failing `channel.send` (e.g. `discord.Forbidden`) | ⚠️ WARNING | 08-REVIEW.md WR-04 — per-minute retry/log spam for the whole grace window on a permissions failure. |
| `../nocturna-bot/cogs/reminders.py` | 243-299 | `MensajeModal.on_submit` never re-validates its snapshot against a deleted/expired target | ⚠️ WARNING | 08-REVIEW.md WR-05 — stale edits report success silently; expired one-offs vanish without trace. |
| `../nocturna-bot/cogs/reminders.py` | multiple | 5 info-level findings (IN-01..IN-05: no way to clear mention/emojis, whitespace-only body, `editar` re-anchoring drops a pending atrasado fire, stale schedule fields across frequency switches, duplicate `int()` parse) | ℹ️ INFO | Non-blocking UX/robustness polish items from 08-REVIEW.md. |

No `TBD`/`FIXME`/`XXX` debt markers found in any phase-8 file.

### Human Verification Required

None required to determine phase status — the CR-01 gap is a confirmed, grep/read-verifiable code defect (missing staff check), not something needing human judgment. All other truths are either mechanically verified (tests, code inspection) or match the roadmap/CONTEXT.md contract directly. Live deployment to the `cinema` systemd host (git pull + restart + real `.env`) remains a manual, out-of-phase-scope user step per every plan — not a verification blocker, since acceptance for this phase was explicitly defined as "unit tests + import checks," which pass.

### Gaps Summary

17 of 18 derived observable truths verified cleanly against the codebase, all four `/recordatorio` subcommands exist and work for staff, the scheduler correctly fires/classifies/delivers/lifecycles reminders, and the full 232-test suite (68 reminders-specific) passes with zero regressions — independently re-run in this session, not merely trusted from SUMMARY.md.

One genuine, confirmed gap blocks a clean pass: **the `borrar` and `editar` autocomplete callbacks never check `_is_staff`**, so any guild member who can see the `/recordatorio` command can enumerate every reminder's name and full schedule by typing into `borrar`/`editar`'s autocomplete field — the exact data `listar` explicitly refuses to show non-staff. This directly contradicts CONTEXT.md's D-02 ("All subcommands are gated by the same staff-role pattern... One trust level across the bot") and the ROADMAP goal's own phrasing ("a staff-gated `/recordatorio` command group (crear/listar/borrar/editar with autocomplete...)"). It was independently confirmed by reading `cogs/reminders.py:505-508,633-636` and by the fact that the existing test `test_borrar_autocomplete_delegates_to_reminder_choices` passes `interaction=None` and still succeeds — proving the code path never inspects who is asking. This matches 08-REVIEW.md's CR-01 (Critical/blocker) finding exactly; the review was not merely advisory, it identified a real authorization bypass that is now confirmed present in the shipped code.

**This looks like an oversight, not an intentional deviation** — the fix is small (one `_is_staff` check per autocomplete callback, same one-liner already used everywhere else in the file) and is fully specified in 08-REVIEW.md's CR-01 fix block. No override is suggested; this should be closed via `/gsd:plan-phase --gaps` before the phase is considered done, since D-02 is a locked, phase-defining decision and the leak is trivially exploitable by any guild member.

The 5 WARNING and 5 INFO findings from 08-REVIEW.md (unbounded `listar` embed, scheduler restart backoff, `add_reminder` default poison-row, unhandled send-Forbidden retry spam, and the modal stale-snapshot race, plus minor UX gaps) do not block any stated must-have truth and are recorded here for visibility but are not classified as gaps requiring phase-close action.

---

_Verified: 2026-07-10_
_Verifier: Claude (gsd-verifier)_
