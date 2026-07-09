# Phase 8: Bot Reminders Command - Context

**Gathered:** 2026-07-09
**Status:** Ready for planning

<domain>
## Phase Boundary

A new **reminders cog** in the `nocturna-bot` repo (cachorabot, Python discord.py 2.7): staff create scheduled reminders — weekly, monthly, or one-off — with a fully customizable message, sent by the bot to a chosen Discord channel at the scheduled time. Reminders persist across bot restarts (production bot runs on Linux host "cinema" via systemd) and the cog introduces the bot's **first scheduler loop** (none exists today — no `tasks.loop` or APScheduler anywhere in the repo).

**In scope:** the `/recordatorio` command group (crear/listar/borrar/editar), the scheduler loop, persistence, the reminder message format (mention line + embed + seeded reactions), catch-up for fires missed during downtime, and staff-facing UX (Spanish-first).

**Out of scope:** any website-repo changes (this phase is 100% bot-side, no cross-repo publishing), reaction tally/attendance reporting (deferred), reworking existing cogs. Deployment to cinema (git pull + systemd restart) is a human step, not phase scope.

</domain>

<decisions>
## Implementation Decisions

### Command surface & permissions
- **D-01:** One slash-command group **`/recordatorio`** with subcommands `crear`, `listar`, `borrar`, `editar` — Spanish `app_commands` style matching the repo's existing cogs (`/estado`, `/grabar`, `/nota`).
- **D-02:** All subcommands are gated by the **same staff-role pattern** as gallery/reviews: a `REMINDERS_STAFF_ROLE_IDS` env list in `config.py`, defaulting/falling back to the existing staff role list. One trust level across the bot.
- **D-03:** Creation is **slash params + modal**: `crear` takes the schedule (frequency choice, day, time), target channel, name, and optional reaction emojis as validated slash parameters, then opens a **Discord modal with a multi-line text field** for the message body (long messages with line breaks are first-class).
- **D-04:** `borrar` and `editar` select the reminder via **Discord autocomplete** (suggesting by reminder name + schedule summary as the user types) — staff never memorize IDs.
- **D-05:** Every reminder has a **required short name** (e.g. "Junta semanal") given at creation — it powers autocomplete matching, makes `listar` readable, and serves as the embed title.

### Schedule model & timezone
- **D-06:** Supported frequencies: **weekly** (one weekday + time), **monthly** (day-of-month + time), and **one-off** (specific date + time).
- **D-07:** All schedules are anchored to **one fixed team timezone from `.env`** (`REMINDERS_TZ`, an IANA zone, e.g. `America/Mexico_City`) — DST-aware, independent of the cinema host clock configuration.
- **D-08:** Monthly reminders on day 29/30/31 **clamp to the last day of shorter months** (a day-31 reminder fires Feb 28/29) — never silently skips a month.
- **D-09:** Weekly = **one weekday per reminder**; "lunes y jueves" means creating two reminders. Keeps the creation UI a single dropdown and the schema/summary simple.

### Message & delivery behavior
- **D-10:** The sent reminder is a **mention line + branded embed**: any role/user mentions go on a plain content line above (so they actually ping — mentions inside embeds don't), and the custom message renders inside a styled embed below (reminder name as title, Nocturna branding).
- **D-11:** Mention policy: **roles and users can ping; `@everyone`/`@here` are suppressed** via `allowed_mentions` — a staff typo can never mass-ping the public server from the bot.
- **D-12:** **Target channel is per-reminder**, chosen with the Discord channel picker parameter on `crear`.
- **D-13:** Missed fires (bot down at fire time): on startup, **catch up within a grace window (~6–12h)** — the late reminder is sent marked "⏰ atrasado", then the normal schedule resumes. Misses older than the window stay silent. Mirrors the Phase-5 backfill philosophy: downtime never silently loses recent events, and a long outage never dumps stale reminders.
- **D-14:** **Seeded reactions** (user addition): `crear` accepts an **optional, customizable list of emojis** (e.g. ✅ ❌ for juntas) that the bot adds to its own reminder message right after sending — the team RSVPs with one tap. The bot **only seeds** the reactions; it does not track or report who reacted.

### Lifecycle & editing
- **D-15:** **Full `/recordatorio editar`**: pick via autocomplete, re-open the message modal pre-filled, and allow schedule/channel/name/reactions changes. (User explicitly chose this over delete+recreate.)
- **D-16:** Recurring reminders **run until deleted** — no end dates, no pause state. **One-off reminders auto-delete** from the store after firing.

### Claude's Discretion
- **Persistence store** — user chose "you decide". Repo idiom strongly favors a `reminders` table in SQLite via `core/db.py` (same `CREATE TABLE IF NOT EXISTS` pattern as `forum_posts`/`gallery_state`/`reviews_state`); JSON is acceptable only if there's a compelling reason.
- **Scheduler mechanism** — `discord.py tasks.loop` vs APScheduler vs a sleep-until-next-fire loop; whatever is most robust for a 24/7 systemd bot with minute-level precision. No scheduler exists in the repo yet — this sets the precedent.
- Exact catch-up grace window length within ~6–12h (D-13).
- Exact embed styling (color, footer, timestamp), Spanish copy for confirmations/errors, and `listar` presentation details.
- Emoji input format + validation for D-14 (custom/unicode emoji handling, cap on count).
- Time/date input formats and validation UX for `crear` (e.g. `HH:MM` 24h, `YYYY-MM-DD` for one-offs).
- How `editar` handles partial changes (which params optional, modal pre-fill mechanics).

### Folded Todos
- **`2026-07-07-bot-reminders-command-weekly-monthly-custom-message.md`** — the phase's origin. Problem: the team wants cachorabot to send scheduled reminders for juntas or anything else — weekly/monthly minimum, fully customizable message text, persisted across restarts. Fully absorbed into this phase's scope; the todo can be closed when the phase ships.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase definition & origin
- `.planning/ROADMAP.md` — Phase 8 section (goal TBD at roadmap level; this CONTEXT.md is the authoritative scope)
- `.planning/todos/pending/2026-07-07-bot-reminders-command-weekly-monthly-custom-message.md` — the originating team request (weekly/monthly, custom message, persistence, scheduler-loop sketch)

### Target repo (external — the cog lives HERE, not in the website repo)
- `../nocturna-bot` — local clone of https://github.com/Shangrii/nocturna-bot (discord.py 2.7.1, self-hosted 24/7 on "cinema" via systemd). Key files:
  - `../nocturna-bot/cogs/` — cog conventions to follow (`commands.Cog` subclass, `@app_commands.command` Spanish names, `import config`, module `log`, `async def setup(bot)`; see `gallery.py` header + `help.py` for the command-listing pattern)
  - `../nocturna-bot/core/db.py` — SQLite persistence idiom (`CREATE TABLE IF NOT EXISTS`, `_get_conn`, per-feature `init_*` + cursor tables) — the recommended home for the reminders table
  - `../nocturna-bot/config.py` — env-driven constants pattern to extend (`REMINDERS_STAFF_ROLE_IDS`, `REMINDERS_TZ`)
  - `../nocturna-bot/bot.py` — cog loading list + fail-fast env validation pattern
  - `../nocturna-bot/cogs/reviews.py` — existing Discord **modal** usage (D-03's modal follows it) and staff reaction-gating helpers
  - `../nocturna-bot/requirements.txt` — pinned deps; adding APScheduler (if chosen) must be justified against `discord.ext.tasks` which ships free with discord.py

No website-repo files are written by this phase.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Staff role gate: `_reaction_by_staff` / role-intersection helpers in `cogs/gallery.py` + `cogs/reviews.py` — same gating concept applies to slash-command interactions (check `interaction.user.roles` ∩ configured role IDs).
- `core/db.py` — established SQLite layer; add `init_reminders()` + CRUD following the `gallery_state`/`forum_posts` idiom.
- `config.py` env pattern (comma-split role ID lists, defaults, fail-fast in `bot.py`).
- `cogs/help.py` (`/ayuda`) — must be updated to list the new `/recordatorio` commands if it enumerates commands manually (check during planning).
- Modal + button patterns from the Phase-7 reviews cog (collection embed/modal) — template for D-03's message modal.

### Established Patterns
- One cog per file; Spanish command names/descriptions; Spanish-first staff-facing replies.
- **No scheduler exists in the repo** — this cog introduces the first background scheduling loop; keep it self-contained in the cog (`cog_unload` must cancel the loop cleanly for reload safety).
- Testing pattern: module-level pure helper functions unit-tested with `SimpleNamespace` + `asyncio.run` (no pytest-asyncio) — bot suite currently 164 tests green; schedule math (next-fire computation, month clamp, TZ/DST) is ideal pure-function territory.
- Resilience philosophy from Phase 5/7: startup reconvergence (backfill/reconcile) — D-13's catch-up window is this phase's version.

### Integration Points
- New `cogs/reminders.py` added to `bot.py`'s cog list; new `config.py` entries; new table in `core/db.py`; `.env` additions on the cinema host (`REMINDERS_TZ`, `REMINDERS_STAFF_ROLE_IDS`) documented for the user's manual deploy.
- Slash commands need a command tree sync after deploy (existing bot already syncs app commands — follow whatever `bot.py` does today).
- No cross-repo/GitHub-publish involvement — this cog never touches `core/github_publish.py`.

</code_context>

<specifics>
## Specific Ideas

- The seeded-reactions idea came directly from the user (in Spanish): for a junta reminder, the bot should offer the option to pre-add ✅ / ❌ (or any emoji) so the team can confirm attendance — customizable per reminder, seed-only, no tally.
- "Atrasado" marking on catch-up fires: a late reminder should be visibly late, not pretend it fired on time.
- The user consistently picked the autocomplete-driven UX (borrar/editar) over ID-based management — staff should never need to remember reminder IDs.

</specifics>

<deferred>
## Deferred Ideas

- **Reaction tally / attendance report** — who reacted ✅/❌ to a junta reminder, summarized by the bot afterwards. This phase only seeds reactions (D-14); tracking/reporting is its own future capability.

### Reviewed Todos (not folded)
- `2026-07-07-carrd-style-template-editor-for-nocturna-editors.md` — matched on generic keywords only; it is Phase 10's scope.
- `2026-07-07-jinxxy-auto-sync-to-asset-store.md` — low-score match; it is Phase 9's scope.

</deferred>

---

*Phase: 08-bot-reminders-command-weekly-monthly-scheduled-reminders-wit*
*Context gathered: 2026-07-09*
