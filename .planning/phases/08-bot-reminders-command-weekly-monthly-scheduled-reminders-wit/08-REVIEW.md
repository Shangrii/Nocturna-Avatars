---
phase: 08-bot-reminders-command-weekly-monthly-scheduled-reminders-wit
reviewed: 2026-07-10T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - ../nocturna-bot/core/db.py
  - ../nocturna-bot/config.py
  - ../nocturna-bot/cogs/reminders.py
  - ../nocturna-bot/tests/test_reminders_cog.py
  - ../nocturna-bot/bot.py
  - ../nocturna-bot/requirements.txt
  - ../nocturna-bot/.env.example
findings:
  critical: 0
  warning: 5
  info: 5
  total: 10
status: issues_found
---

# Phase 8: Code Review Report (Re-review after gap closure)

**Reviewed:** 2026-07-10T00:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found (0 critical — all remaining findings previously classified non-blocking)

## Summary

Re-review of the Fase 8 reminders implementation after the CR-01 gap-closure commits (`2207a69` fix, `813cc89` tests). Scope: the `reminders` table + CRUD in `core/db.py`, the `REMINDERS_*` config block, the full `/recordatorio` cog (`crear`/`listar`/`borrar`/`editar`, `MensajeModal`, delivery, 1-minute scheduler), the fail-fast `REMINDERS_TZ` check in `bot.py`, the tzdata pin, and the test suite (now 234 passing).

**CR-01 is RESOLVED and verified correct.** Both `borrar_autocomplete` (lines 505-513) and `editar_autocomplete` (lines 638-646) now check `_is_staff(interaction.user)` as their first statement and return `[]` for non-staff callers before any `db.list_reminders()` read — the same D-02 trust boundary the sibling commands enforce. The fix commits also repaired the pre-existing test gap: the positive autocomplete tests now pass a staff-member fake interaction (previously `None`), and two new negative tests (`test_borrar_autocomplete_non_staff_returns_empty_no_db`, `test_editar_autocomplete_non_staff_returns_empty_no_db`) assert both the empty result AND that the store is never read (`list_reminders.assert_not_called()`). No new issues were introduced by the fix commits.

The rest of the core remains sound on re-trace: all SQL is parameterized with an explicit column whitelist in `update_reminder`; schedule math does wall-clock arithmetic on `zoneinfo`-aware datetimes and converts to UTC last (DST, month-end clamp, and leap years verified again); the ISO-8601 string comparison in `due_reminders` is safe because both sides are `+00:00`-suffixed UTC isoformats; `AllowedMentions(everyone=False)` suppresses `@everyone`/`@here` at the API level; advance-after-send crash semantics match the documented design.

The 5 WARNING and 5 INFO findings from the previous review are all still present in the code. Phase verification explicitly classified them as non-blocking and deferred them; they are carried forward below (with line numbers updated for the shifted file) so they remain tracked.

## Resolved

### CR-01: Autocomplete callbacks bypass the staff gate and leak all reminders to any guild member — RESOLVED ✅

**File:** `../nocturna-bot/cogs/reminders.py:505-513, 638-646`
**Original issue:** `borrar_autocomplete` and `editar_autocomplete` performed no staff check before calling `db.list_reminders()`, letting any guild member enumerate every reminder's name + schedule via the autocomplete channel — an authorization bypass of the phase's own D-02 trust boundary.
**Verification:** Fixed in nocturna-bot commit `2207a69` (tests in `813cc89`). Both callbacks now begin with:
```python
if not _is_staff(interaction.user):
    return []
return self._reminder_choices(current)
```
The gate is the first statement, so a non-staff caller never reaches the store. `_is_staff` uses `getattr(member, "roles", [])`, so a DM `User` (no `.roles`) also safely resolves to non-staff. Confirmed by tests: negative tests assert `choices == []` and `list_reminders.assert_not_called()` for a non-staff member; positive tests assert staff callers still receive the filtered choice list. Full suite passes (234 tests).

## Warnings

_All carried forward from the 2026-07-09 review — still present, previously classified non-blocking by phase verification._

### WR-01: `listar` embed description is unbounded and breaks past ~27 reminders

**File:** `../nocturna-bot/cogs/reminders.py:471-477`
**Issue:** The embed description joins one line per reminder with no length cap. Each line can reach ~150 chars (name up to `_NAME_MAX`=80 + summary + channel link). Discord rejects embed descriptions over 4096 chars, so once roughly 27-50 reminders exist, `response.send_message` raises `HTTPException 400` and `listar` fails for staff with a generic interaction error — exactly when the overview is most needed. There is no cap on how many reminders can be created, so this is reachable through normal use.
**Fix:** Truncate defensively and tell the user, e.g.:
```python
desc = ""
shown = 0
for line in lines:
    if len(desc) + len(line) + 1 > 3900:
        desc += f"\n… y {len(lines) - shown} más"
        break
    desc += ("\n" if desc else "") + line
    shown += 1
```
(or paginate into multiple embeds).

### WR-02: Scheduler error handler restarts the loop with no backoff — hot crash-loop on persistent failure

**File:** `../nocturna-bot/cogs/reminders.py:731-736`
**Issue:** `_on_scheduler_error` calls `self._scheduler.restart()` immediately. Per-reminder failures are already isolated inside `_process_due`, so the only exceptions that reach this handler are ones that fail the whole tick — chiefly `sqlite3.OperationalError` from `db.due_reminders` (locked/corrupted DB, disk full). Those are typically persistent. `tasks.Loop` runs its first iteration immediately on start, so a persistent DB failure produces a tight raise → log → restart → raise cycle limited only by how fast sqlite errors out, flooding `bot.log` and burning CPU on the shared "cinema" host.
**Fix:** Sleep before restarting so the loop degrades to its normal cadence instead of spinning:
```python
@_scheduler.error
async def _on_scheduler_error(self, exc: Exception):
    log.exception("reminders: el scheduler se cayó, reiniciando en 60s", exc_info=exc)
    await asyncio.sleep(60)
    self._scheduler.restart()
```

### WR-03: `add_reminder`'s `next_fire_utc=""` default creates a permanently-due poison row

**File:** `../nocturna-bot/core/db.py:258-262` (interacts with `../nocturna-bot/cogs/reminders.py:703-718`)
**Issue:** `next_fire_utc` is semantically required (NOT NULL, the scheduler's cursor) but the function signature defaults it to `""`. If any future caller omits it, the row is inserted with an empty cursor: `"" <= now` is true for every string comparison, so `due_reminders` returns it on every tick, `datetime.fromisoformat("")` raises `ValueError` inside `_process_due`, the per-row `except` logs it, and the lifecycle never advances — a row that errors and spams the log every single minute, forever, with no self-healing. The cog currently always passes the value, but the API invites the bug.
**Fix:** Make the parameter required (drop the default) so an omission fails loudly at the call site:
```python
def add_reminder(name: str, frequency: str, hour: int, minute: int, channel_id: int,
                 message: str, created_by: int, next_fire_utc: str, *,
                 weekday: int | None = None, ...) -> int:
```
Optionally also `raise ValueError` if `next_fire_utc` is falsy.

### WR-04: `_deliver` handles an unresolvable channel but not a failing `channel.send` — per-minute retry spam for the whole grace window

**File:** `../nocturna-bot/cogs/reminders.py:681`
**Issue:** A channel that resolves but rejects the send (`discord.Forbidden` — bot lost Send Messages/Embed Links in the target channel — or any other `HTTPException`) raises out of `_deliver`, is caught by `_process_due`'s per-row handler, and the cursor is **not** advanced. The reminder stays due, so the bot retries and logs a full traceback every minute until the grace window expires (~360 attempts + tracebacks at the default 6h), after which `classify_fire` returns `skip` and it finally advances. The sibling failure mode (channel not found) is deliberately absorbed inside `_deliver` so the lifecycle advances; a permissions failure is equally non-transient and deserves the same treatment.
**Fix:** Wrap the send like the resolution fallback:
```python
try:
    sent = await channel.send(content=content, embed=embed, allowed_mentions=allowed)
except discord.Forbidden:
    log.warning("reminders: sin permisos para enviar en %s (recordatorio '%s', id=%s)",
                r["channel_id"], r["name"], r["id"])
    return
```
(Transient `HTTPException`s can still propagate so the existing retry-within-grace covers genuine blips.)

### WR-05: `MensajeModal.on_submit` never re-validates its snapshot — stale edits report success and expired one-offs vanish silently

**File:** `../nocturna-bot/cogs/reminders.py:243-299`
**Issue:** The modal carries a snapshot of params validated when the command ran, but a modal can sit open indefinitely. Two concrete failure paths:
1. **Deleted edit target:** if the reminder is deleted (by another staff member or by the D-16 one-off auto-delete) between `/recordatorio editar` and modal submit, `db.update_reminder(edit_id, ...)` executes an UPDATE matching zero rows, silently does nothing, and the user still receives "✏️ Recordatorio **X** actualizado".
2. **Expired one-off:** `crear` rejects a past date at command time, but `on_submit` recomputes `next_fire_utc` via `next_oneoff_fire`, which returns the past instant unchanged. If the modal sat open past the scheduled time, the reminder is inserted already-due; if it sat open longer than the grace window, the first tick classifies it `skip` and deletes it — created, never fired, deleted, with a "✅ Recordatorio creado" confirmation and no trace.
**Fix:** In `on_submit`: for the edit path, `db.get_reminder(edit_id)` first and reply "❌ Ese recordatorio ya no existe." when `None`; for the oneoff create path, re-check `next_fire > datetime.now(timezone.utc)` and reply "❌ Esa fecha y hora ya pasaron." instead of inserting.

## Info

_All carried forward from the 2026-07-09 review — still present, previously classified non-blocking._

### IN-01: `editar` provides no way to clear `mencion` or `emojis`

**File:** `../nocturna-bot/cogs/reminders.py:584-585`
**Issue:** The merge treats `None` as "keep stored value", and Discord slash options cannot be submitted as empty strings, so once a reminder has a mention or seeded reactions there is no way to remove them short of deleting and recreating the reminder.
**Fix:** Accept a sentinel (e.g. `emojis="-"` / a `quitar_mencion: bool` flag) that maps to `""`.

### IN-02: Whitespace-only modal body yields an empty stored message

**File:** `../nocturna-bot/cogs/reminders.py:234-244`
**Issue:** Discord's `required=True` accepts a body of spaces; `on_submit` strips it to `""` and persists it, so the reminder fires as a title-only embed with an empty description. Not a crash, but likely not what staff intended.
**Fix:** After stripping, reject empty bodies with an ephemeral "❌ El mensaje no puede estar vacío." (or set `min_length=1` plus the strip check).

### IN-03: Every `editar` re-anchors `next_fire_utc`, silently dropping a pending in-grace late fire

**File:** `../nocturna-bot/cogs/reminders.py:621-625`
**Issue:** The comment calls a pure name/channel/emoji edit's recompute "harmless", but if the reminder is currently overdue-within-grace (bot just recovered; the next tick would send it marked ⏰ atrasado), an unrelated edit pushes `next_fire_utc` into the future and the pending catch-up delivery is silently lost.
**Fix:** Only recompute when a schedule field (`frecuencia`/`hora`/`dia_semana`/`dia_mes`/`fecha`) actually changed; otherwise keep the stored cursor.

### IN-04: Stale schedule fields persist across frequency changes

**File:** `../nocturna-bot/cogs/reminders.py:586-588` (persisted at 251-264)
**Issue:** Switching a weekly reminder to monthly keeps the old `weekday` in the row (and vice versa). Harmless at fire time (dispatch reads only the active field), but a later switch *back* to monthly without `dia_mes` silently passes validation using the stale stored day — the staff member is never prompted even though they may expect to choose again.
**Fix:** Null out the non-applicable fields for the merged frequency before building `params` (e.g. `if frequency != "weekly": weekday = None`, etc.).

### IN-05: `borrar` parses `int(recordatorio)` twice

**File:** `../nocturna-bot/cogs/reminders.py:493, 501`
**Issue:** The id is parsed inside the try at line 493 and re-parsed at line 501 for the delete. Correct today (the second parse can only succeed if the first did), but the duplication invites drift if the parsing rule ever changes.
**Fix:** Bind once (`rid = int(recordatorio)` inside the try) and reuse `rid` for both `get_reminder` and `delete_reminder`.

---

_Reviewed: 2026-07-10T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard (re-review after CR-01 gap closure)_
