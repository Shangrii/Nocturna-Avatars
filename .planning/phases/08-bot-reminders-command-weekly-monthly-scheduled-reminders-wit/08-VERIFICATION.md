---
phase: 08-bot-reminders-command-weekly-monthly-scheduled-reminders-wit
verified: 2026-07-10T00:00:00Z
status: passed
score: 18/18 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 17/18
  gaps_closed:
    - "D-02: staff trust boundary is enforced across the whole /recordatorio command surface, including the borrar/editar autocomplete channel"
  gaps_remaining: []
  regressions: []
---

# Phase 8: Bot Reminders Command Verification Report

**Phase Goal:** Staff schedule weekly/monthly/one-off reminders from Discord with a fully custom message: a staff-gated `/recordatorio` command group (crear/listar/borrar/editar with autocomplete + multi-line modal) in `cogs/reminders.py`, the bot's first background scheduler (`tasks.loop`) firing mention-line + branded-embed reminders with seeded RSVP reactions and `@everyone` suppressed, persisted in SQLite across restarts with a grace-window "⏰ atrasado" catch-up — 100% bot-side in `nocturna-bot`, no website changes.
**Verified:** 2026-07-10
**Status:** passed
**Re-verification:** Yes — after gap closure (plan 08-05)

## Goal Achievement

This is a re-verification following the single-truth gap found in the prior report (2026-07-10, same file, score 17/18). Gap-closure plan `08-05` (`gap_closure: true`) was executed and independently re-checked in this session directly against the sibling repo `../nocturna-bot` (absolute: `C:\Users\Shangri\Pictures\Nocturna Avatars\Coding\nocturna-bot`) — not taken from SUMMARY.md claims.

**Independent re-verification performed this session:**
- Read `cogs/reminders.py:480-513` (borrar + borrar_autocomplete) and `:515-646` (editar + editar_autocomplete) directly.
- Confirmed both autocomplete callbacks now open with `if not _is_staff(interaction.user): return []` as their literal first statement, before any reference to `_reminder_choices`/`db.list_reminders()`.
- Confirmed `_reminder_choices` (`cogs/reminders.py:436-453`) is unchanged — staff callers still get the full, live, filtered list.
- `git log --oneline -5` in `../nocturna-bot` shows `813cc89` (test) and `2207a69` (fix) at HEAD, on top of the prior `f849187` (08-04 close). Working tree is clean.
- `git diff f849187 HEAD -- cogs/reminders.py` shows an exact 10-line surgical diff: only the two staff-gate blocks were added to `borrar_autocomplete` and `editar_autocomplete`. No other line in the 730-line file changed — rules out regression to the other 17 truths by construction.
- `git diff f849187 HEAD -- tests/test_reminders_cog.py` shows the two pre-existing delegate tests updated to use a staff interaction stub (previously `None`), plus two new tests appended (`test_borrar_autocomplete_non_staff_returns_empty_no_db`, `test_editar_autocomplete_non_staff_returns_empty_no_db`). Read both new test bodies directly — each builds a non-staff `_member([OTHER_ROLE_ID])` interaction, asserts the return value is `[]`, and asserts `list_reminders.assert_not_called()` (a `MagicMock`, not a lambda, so the assertion is meaningful).
- `grep -c "if not _is_staff(interaction.user)" cogs/reminders.py` → `6` (4 subcommands + 2 autocompletes).
- `grep -n "autocomplete(None," tests/test_reminders_cog.py` → no matches (no test still passes an unauthenticated `None` interaction).
- `grep -n -E "TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER"` on both modified files → no matches.
- Independently re-ran `python -m pytest -q` from `../nocturna-bot` root → **234 passed, 2 warnings** (matches the plan's target exactly; +2 from the prior session's 232, zero failures/skips).
- Cross-checked the updated `08-REVIEW.md`: "CR-01 is RESOLVED and verified correct" (line 33), confirming the same fix by an independent reviewer pass; 0 critical findings remain, the 5 WARNING/5 INFO findings are unchanged and still classified non-blocking.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | (D-06/D-09/D-16) Reminder row create/list/get/update/delete/due-query works via `core/db.py` | ✓ VERIFIED (regression check, unchanged) | `core/db.py` not touched by the gap-closure diff; full suite pass confirms no regression. |
| 2 | (D-08/D-12/D-14) Schema persists `day_of_month`, per-reminder `channel_id`, seeded `reactions` | ✓ VERIFIED (regression check, unchanged) | `core/db.py` not touched. |
| 3 | (D-02/D-07/D-13) config exposes `REMINDERS_TZ`, `REMINDERS_STAFF_ROLE_IDS` (gallery fallback), `REMINDERS_CATCHUP_GRACE_HOURS` | ✓ VERIFIED (regression check, unchanged) | `config.py` not touched by gap closure. |
| 4 | (D-07) `tzdata` pinned so `zoneinfo` resolves `REMINDERS_TZ` on any OS | ✓ VERIFIED (regression check, unchanged) | `requirements.txt` not touched. |
| 5 | (D-06/D-07/D-09) `next_weekly_fire`/`next_monthly_fire`/`next_oneoff_fire` return correct next UTC instant | ✓ VERIFIED (regression check, unchanged) | Not in the diff; reminders test file at 70 tests for this file alone, all passing. |
| 6 | (D-08) `_clamp_day` clamps day-31 to last day of shorter months incl. leap Feb | ✓ VERIFIED (regression check, unchanged) | Not in the diff. |
| 7 | (D-13) `classify_fire` returns ontime/late/skip against a grace window | ✓ VERIFIED (regression check, unchanged) | Not in the diff. |
| 8 | (D-14) validators reject malformed input; `parse_emojis` caps the list | ✓ VERIFIED (regression check, unchanged) | Not in the diff. |
| 9 | (D-02) `_is_staff` true only for a `REMINDERS_STAFF_ROLE_IDS` role holder | ✓ VERIFIED (regression check, unchanged) | `_is_staff` itself (`cogs/reminders.py:189-197`) is outside the diff range; re-read this session, logic unchanged — `bool(role_ids & set(config.REMINDERS_STAFF_ROLE_IDS))`. |
| 10 | (D-01/D-03/D-05/D-06/D-09/D-12) staff can run `crear` with schedule+channel+name+emoji params and complete the message in a modal; reminder persists with computed `next_fire_utc` | ✓ VERIFIED (regression check, unchanged) | `crear`/`MensajeModal` not in the diff. |
| 11 | (D-02) non-staff invoking `crear` gets ephemeral "Sin permisos." and nothing persisted | ✓ VERIFIED (regression check, unchanged) | Not in the diff. |
| 12 | (D-10/D-11/D-14) scheduler fires due reminders: mention line + branded embed, `@everyone`/`@here` suppressed, seeded reactions added | ✓ VERIFIED (regression check, unchanged) | `_deliver` not in the diff. |
| 13 | (D-13/D-16) a fire missed within grace sends "⏰ atrasado"; older misses advance silently; one-off auto-deletes after firing | ✓ VERIFIED (regression check, unchanged) | `_process_due` not in the diff. |
| 14 | `bot.py` loads `cogs.reminders` and fail-fasts on invalid `REMINDERS_TZ` | ✓ VERIFIED (regression check, unchanged) | `bot.py` not touched by gap closure. |
| 15 | (D-01/D-05) staff can run `listar` and see every reminder as name + Spanish schedule summary + target channel | ✓ VERIFIED (regression check, unchanged) | `listar` not in the diff. |
| 16 | (D-01/D-04) staff can run `borrar`, pick via autocomplete, and delete | ✓ VERIFIED (upgraded from ⚠️ PARTIAL) | Execution path unchanged and still gated (`cogs/reminders.py:483-503`, re-read this session). The autocomplete picker that backs it is now ALSO staff-gated (`:505-513`) — the root cause of the prior PARTIAL degradation is closed. |
| 17 | (D-04/D-15) staff can run `editar`, pick via autocomplete, change fields, finish in a pre-filled modal | ✓ VERIFIED (upgraded from ⚠️ PARTIAL) | Execution path unchanged and still gated (`:535-636`, re-read this session). Autocomplete picker now gated (`:638-646`) — same fix, same closure. |
| 18 | (D-02) the staff trust boundary is enforced across the whole `/recordatorio` command surface — "One trust level across the bot" (CONTEXT.md D-02), matching ROADMAP's phrase "staff-gated `/recordatorio` command group (crear/listar/borrar/editar **with autocomplete** + multi-line modal)" | ✓ VERIFIED (upgraded from ✗ FAILED) | Both `borrar_autocomplete` (`cogs/reminders.py:505-513`) and `editar_autocomplete` (`:638-646`) now open with `if not _is_staff(interaction.user): return []` as their literal first statement, read directly this session. `_reminder_choices` itself is unchanged (staff still get the full list). Two new tests (`test_borrar_autocomplete_non_staff_returns_empty_no_db`, `test_editar_autocomplete_non_staff_returns_empty_no_db`) assert `[] ` + `list_reminders.assert_not_called()` for a non-staff caller, and both pass. All 6 gate occurrences (`grep -c "if not _is_staff(interaction.user)"` → 6) now cover every db-reading surface on the command group: crear/listar/borrar/editar + both autocompletes. `08-REVIEW.md` independently confirms: "CR-01 is RESOLVED and verified correct." |

**Score:** 18/18 truths verified.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `../nocturna-bot/core/db.py` | reminders table + 8 CRUD helpers | ✓ VERIFIED (unchanged) | Not touched by gap closure; no regression possible. |
| `../nocturna-bot/config.py` | `REMINDERS_*` env constants | ✓ VERIFIED (unchanged) | Not touched. |
| `../nocturna-bot/requirements.txt` | `tzdata` pin | ✓ VERIFIED (unchanged) | Not touched. |
| `../nocturna-bot/.env.example` | documented `REMINDERS_*` vars | ✓ VERIFIED (unchanged) | Not touched. |
| `../nocturna-bot/cogs/reminders.py` | pure helpers + `RemindersCog` + `MensajeModal` + `_deliver` + scheduler + management subcommands, ALL db-reading surfaces staff-gated | ✓ VERIFIED | 740 lines (was 730; +10 from the surgical fix). All prior artifacts present unchanged; the wiring gap (autocomplete bypassing the staff gate) from the prior report is now closed — verified by direct read of lines 505-513 and 638-646. |
| `../nocturna-bot/bot.py` | `cogs.reminders` extension load + `REMINDERS_TZ` fail-fast | ✓ VERIFIED (unchanged) | Not touched. |
| `../nocturna-bot/tests/test_reminders_cog.py` | unit tests for all pure helpers + cog behavior, including autocomplete staff-gating | ✓ VERIFIED | 859 lines (was 837; +22, matches the 2-updated/2-added test change). 70 `test_` functions in this file (was 68); independently re-ran, 70 passed within the full-suite 234. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `borrar`/`editar` autocomplete | `_is_staff` gate | staff check before `db.list_reminders()` | ✓ WIRED (was ✗ NOT WIRED) | `cogs/reminders.py:511-513` and `:644-646` — both callbacks now check `_is_staff(interaction.user)` and return `[]` before any reference to `_reminder_choices`/`db.list_reminders()`. Confirmed by direct read this session, not by SUMMARY claim. |
| All other key links from the prior report (`config.REMINDERS_STAFF_ROLE_IDS`→fallback, `db.due_reminders`→`next_fire_utc`, `RemindersCog.__init__`→scheduler start, `_deliver`→`AllowedMentions`, scheduler tick→due/advance/delete, `editar`→pre-filled modal, `editar` schedule changes→recompute) | — | — | ✓ WIRED (unchanged) | None of these files/lines were touched by the gap-closure diff (`git diff f849187 HEAD` scoped to exactly `cogs/reminders.py` lines 505-513/638-646 and the two test-file edits); no regression is possible without a code change, and the diff confirms none occurred. |

### Data-Flow Trace (Level 4)

Not applicable in this re-verification — no new data-rendering artifact was introduced. The gap-closure change is a pure authorization gate (early-return `[]`) inserted before the existing, already-verified `_reminder_choices` → `db.list_reminders()` data flow. The gate does not alter what data flows to a *staff* caller (confirmed unchanged `_reminder_choices` body) and correctly severs the flow for a non-staff caller (confirmed by `list_reminders.assert_not_called()` in both new tests).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full bot test suite (independently re-run this session) | `cd ../nocturna-bot && python -m pytest -q` | `234 passed, 2 warnings` | ✓ PASS |
| Gate count covers all 6 db-reading surfaces | `grep -c "if not _is_staff(interaction.user)" cogs/reminders.py` | `6` | ✓ PASS |
| No test still uses an unauthenticated `None` interaction for autocomplete | `grep -n "autocomplete(None," tests/test_reminders_cog.py` | no matches | ✓ PASS |
| Diff scope is surgical (no regression surface) | `git diff f849187 HEAD -- cogs/reminders.py` | 10-line insertion, both autocomplete callbacks only | ✓ PASS |
| No debt markers in modified files | `grep -n -E "TBD\|FIXME\|XXX\|TODO\|HACK\|PLACEHOLDER" cogs/reminders.py tests/test_reminders_cog.py` | no matches | ✓ PASS |
| Module imports cleanly | implied by full suite collecting/running with 0 collection errors | 234 passed | ✓ PASS |

### Probe Execution

No formal `scripts/*/tests/probe-*.sh` convention exists in this repo pairing; the phase's own verification contract (PLAN 08-05 `<verification>` block) specifies grep + pytest commands, all executed above as behavioral spot-checks. No separate probe script found via `find scripts -path '*/tests/probe-*.sh'` in either repo.

### Requirements Coverage

No formal `REQ-ID`s are mapped to Phase 8 in `.planning/REQUIREMENTS.md` (confirmed unchanged from the prior verification). Phase 8 is governed by the CONTEXT.md locked-decision set `D-01…D-16`.

| Decision | Description | Status | Evidence |
|----------|-------------|--------|----------|
| D-01 | `/recordatorio` group with crear/listar/borrar/editar | ✓ SATISFIED (unchanged) | — |
| D-02 | Same staff-role pattern, "one trust level across the bot" | ✓ SATISFIED (upgraded from ✗ BLOCKED) | Autocomplete channel now gated identically to every execution subcommand — no more partial coverage. |
| D-03 | Slash params + modal for message body | ✓ SATISFIED (unchanged) | — |
| D-04 | `borrar`/`editar` select via autocomplete | ✓ SATISFIED (mechanism + gating now both closed) | `_reminder_choices` backs both, and both callbacks are staff-gated. |
| D-05 | Required short name powering autocomplete/listar/embed title | ✓ SATISFIED (unchanged) | — |
| D-06 | weekly/monthly/one-off frequencies | ✓ SATISFIED (unchanged) | — |
| D-07 | Fixed team timezone from `.env`, DST-aware | ✓ SATISFIED (unchanged) | — |
| D-08 | Monthly day 29/30/31 clamps to last day | ✓ SATISFIED (unchanged) | — |
| D-09 | Weekly = one weekday per reminder | ✓ SATISFIED (unchanged) | — |
| D-10 | Mention line + branded embed | ✓ SATISFIED (unchanged) | — |
| D-11 | `@everyone`/`@here` suppressed | ✓ SATISFIED (unchanged) | — |
| D-12 | Per-reminder target channel | ✓ SATISFIED (unchanged) | — |
| D-13 | Catch-up grace window, "⏰ atrasado" marking | ✓ SATISFIED (unchanged) | — |
| D-14 | Seeded reactions, seed-only (no tally) | ✓ SATISFIED (unchanged) | — |
| D-15 | Full `editar` (pick, pre-fill, change) over delete+recreate | ✓ SATISFIED (unchanged) | — |
| D-16 | Recurring run until deleted; one-off auto-deletes | ✓ SATISFIED (unchanged) | — |

**Orphaned requirements:** None found (unchanged from prior verification).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `../nocturna-bot/cogs/reminders.py` | 505-508, 633-636 (prior report) | Ungated autocomplete callback reading staff-only data | ~~🛑 BLOCKER~~ **RESOLVED** | Closed by commit `2207a69`; independently re-verified this session by direct code read. No longer present. |
| `../nocturna-bot/cogs/reminders.py` | ~471-477 | `listar` embed description has no length cap | ⚠️ WARNING (unchanged, non-blocking) | 08-REVIEW.md WR-01 — out of scope for this gap-closure plan per its own scope guard. |
| `../nocturna-bot/cogs/reminders.py` | ~721-726 | `_on_scheduler_error` restarts the loop with no backoff | ⚠️ WARNING (unchanged, non-blocking) | 08-REVIEW.md WR-02 — out of scope. |
| `../nocturna-bot/core/db.py` | ~258-262 | `add_reminder`'s `next_fire_utc=""` default | ⚠️ WARNING (unchanged, non-blocking) | 08-REVIEW.md WR-03 — out of scope. |
| `../nocturna-bot/cogs/reminders.py` | ~671 | `_deliver` doesn't catch a failing `channel.send` | ⚠️ WARNING (unchanged, non-blocking) | 08-REVIEW.md WR-04 — out of scope. |
| `../nocturna-bot/cogs/reminders.py` | ~243-299 | `MensajeModal.on_submit` never re-validates stale snapshot | ⚠️ WARNING (unchanged, non-blocking) | 08-REVIEW.md WR-05 — out of scope. |
| `../nocturna-bot/cogs/reminders.py` | multiple | 5 info-level findings (IN-01..IN-05) | ℹ️ INFO (unchanged, non-blocking) | Confirmed explicitly not touched by the gap-closure diff, matching the plan's scope guard. |

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` debt markers found in either modified file (`cogs/reminders.py`, `tests/test_reminders_cog.py`), re-checked this session.

### Human Verification Required

None. The one item that previously required no human judgment (a confirmed, grep/read-verifiable code defect) has been fixed and re-confirmed by direct code read + independent test run in this session. All other truths were either already mechanically verified or are unaffected by a diff that touches exactly 10 lines of production code (both scoped to the two autocomplete callbacks) and 22 lines of test code. Live deployment to the `cinema` systemd host remains a manual, out-of-phase-scope user step, consistent with every prior plan's acceptance criteria of "unit tests + import checks," which pass (234/234).

### Gaps Summary

None. The single gap from the prior verification — the D-02 staff trust boundary not being enforced on the `borrar`/`editar` autocomplete channel (CR-01, a confirmed authorization bypass allowing any guild member to enumerate reminder names + schedules) — is closed.

Independent re-verification in this session confirmed:
1. Both `borrar_autocomplete` and `editar_autocomplete` now gate on `_is_staff(interaction.user)` as their literal first statement, returning `[]` for non-staff before any database read (direct code read, `cogs/reminders.py:505-513`, `:638-646`).
2. `_reminder_choices` itself — the shared staff-facing data path — is byte-for-byte unchanged, so no regression to the staff experience.
3. Two new tests assert the negative case with `assert_not_called()` on a `MagicMock`, and the two pre-existing positive tests were updated to use a real staff interaction stub instead of `None` (which had been masking the bug).
4. The `git diff` between the pre-fix commit (`f849187`) and HEAD is exactly the two 5-line gate insertions in production code — this makes regression to any of the other 17 truths structurally impossible, and the independently re-run 234-test full suite confirms zero failures.
5. `08-REVIEW.md` was independently re-reviewed after the fix and states "CR-01 is RESOLVED and verified correct," with 0 critical findings remaining; the 5 WARNING/5 INFO findings are pre-existing, explicitly out of this plan's scope guard, and remain non-blocking.

Phase 8 goal is fully achieved: a staff-gated `/recordatorio` command group (crear/listar/borrar/editar, now including both autocomplete channels) with a multi-line modal, a working background scheduler with mention-line + branded-embed delivery, seeded RSVP reactions, `@everyone` suppression, SQLite persistence across restarts, and a grace-window "⏰ atrasado" catch-up — 100% bot-side in `nocturna-bot`, with zero website changes (confirmed: this session's re-verification touched only the sibling repo).

---

_Verified: 2026-07-10_
_Verifier: Claude (gsd-verifier)_
