# Phase 8: Bot Reminders Command - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-09
**Phase:** 08-bot-reminders-command-weekly-monthly-scheduled-reminders-wit
**Areas discussed:** Command surface & permissions, Schedule model & timezone, Message & delivery behavior, Lifecycle & editing

---

## Command surface & permissions

| Option | Description | Selected |
|--------|-------------|----------|
| /recordatorio group (Recommended) | One slash group with crear/listar/borrar subcommands, matching the bot's Spanish app_commands style | ✓ |
| Separate flat commands | Independent top-level commands (/recordar, /recordatorios, …) | |
| You decide | Claude picks following repo conventions | |

**User's choice:** /recordatorio group

| Option | Description | Selected |
|--------|-------------|----------|
| Same staff role gate (Recommended) | Reuse the gallery/reviews staff-role-list pattern (REMINDERS_STAFF_ROLE_IDS with fallback) | ✓ |
| Admins only | Server administrators only | |
| Anyone in the server | No gate | |

**User's choice:** Same staff role gate

| Option | Description | Selected |
|--------|-------------|----------|
| Slash params + modal (Recommended) | Schedule/channel as validated slash params, message body in a multi-line Discord modal | ✓ |
| All slash parameters | Message as a single-line slash param | |
| You decide | Claude picks the cleanest flow | |

**User's choice:** Slash params + modal

| Option | Description | Selected |
|--------|-------------|----------|
| Embed list + short IDs (Recommended) | listar embed with numeric IDs; borrar takes the ID | |
| Autocomplete picker | borrar suggests reminders by name/preview via Discord autocomplete | ✓ |
| Both | Embed list + autocomplete | |

**User's choice:** Autocomplete picker
**Notes:** Autocomplete became the selection mechanism for both borrar and (later) editar; motivated the required-name decision in Lifecycle.

---

## Schedule model & timezone

| Option | Description | Selected |
|--------|-------------|----------|
| Weekly + monthly + one-off (Recommended) | Todo minimum plus one-off for single events | ✓ |
| Weekly + monthly only | Strictly the minimum | |
| Weekly + monthly + daily + one-off | Also daily recurrence | |

**User's choice:** Weekly + monthly + one-off

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed team TZ in .env (Recommended) | One REMINDERS_TZ IANA zone anchors all schedules, DST-aware | ✓ |
| Cinema host local time | Server clock as-is | |
| Per-reminder timezone | Each reminder stores its own TZ | |

**User's choice:** Fixed team TZ in .env

| Option | Description | Selected |
|--------|-------------|----------|
| Day-of-month, clamp (Recommended) | Shorter months fire on their last day — never skips | ✓ |
| Day-of-month, skip | Months without that day are skipped | |
| Nth weekday of month | "First Monday" style rules | |

**User's choice:** Day-of-month, clamp

| Option | Description | Selected |
|--------|-------------|----------|
| One day per reminder (Recommended) | Weekly = one weekday; multiple days = multiple reminders | ✓ |
| Multiple days per reminder | Multi-select weekday input | |

**User's choice:** One day per reminder

---

## Message & delivery behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Plain message (Recommended) | Custom text verbatim as a normal message | |
| Branded embed | Text inside a styled embed (mentions wouldn't ping) | |
| Embed + mention line | Mentions on a plain line above (ping), custom text in a branded embed below | ✓ |

**User's choice:** Embed + mention line

| Option | Description | Selected |
|--------|-------------|----------|
| Roles + users (Recommended) | Role/user pings allowed; @everyone/@here suppressed via allowed_mentions | ✓ |
| Everything incl. @everyone | No restrictions | |
| No pings at all | Mentions render as plain text | |

**User's choice:** Roles + users

| Option | Description | Selected |
|--------|-------------|----------|
| Per-reminder channel (Recommended) | Channel picker param on crear | ✓ |
| One fixed channel in .env | Single REMINDERS_CHANNEL_ID | |
| Default + override | .env default with optional per-reminder override | |

**User's choice:** Per-reminder channel

| Option | Description | Selected |
|--------|-------------|----------|
| Catch-up within window (Recommended) | Fire misses within ~6–12h marked "atrasado", then resume; older misses silent | ✓ |
| Skip missed, resume schedule | Missed occurrences are lost | |
| Always fire all missed | Every miss fires on startup regardless of age | |

**User's choice:** Catch-up within window

---

## Lifecycle & editing

| Option | Description | Selected |
|--------|-------------|----------|
| Required name (Recommended) | Short name at creation powers autocomplete, listar, embed title | ✓ |
| Optional name | Fallback to message preview | |
| No name, preview only | Identify by preview + schedule | |

**User's choice:** Required name

| Option | Description | Selected |
|--------|-------------|----------|
| Delete + recreate (Recommended) | No edit command in v1 | |
| /recordatorio editar | Full edit: autocomplete pick, pre-filled modal, schedule changes | ✓ |
| Edit message text only | editar re-opens only the message modal | |

**User's choice:** /recordatorio editar

| Option | Description | Selected |
|--------|-------------|----------|
| Run until deleted (Recommended) | Recurring forever until borrar; one-offs auto-delete after firing | ✓ |
| Optional end date | "hasta" date deactivates | |
| Pause/resume + run forever | pausar toggle | |

**User's choice:** Run until deleted

| Option | Description | Selected |
|--------|-------------|----------|
| SQLite via core/db.py (Recommended) | reminders table following the repo's DB idiom | |
| JSON file on the host | reminders.json | |
| You decide | Claude picks during planning | ✓ |

**User's choice:** You decide
**Notes:** Repo idiom favors SQLite; captured as Claude's discretion in CONTEXT.md.

**User addition (freeform, in Spanish):** seeded reactions — when creating a reminder (e.g. juntas), option to have the bot pre-add reactions like ✅ / ❌ to its own reminder message. Follow-up clarified: reactions are **customizable per reminder** and the bot **only seeds them** (no tally/tracking).

---

## Claude's Discretion

- Persistence store (SQLite via core/db.py recommended)
- Scheduler mechanism (tasks.loop vs APScheduler vs sleep-until-next-fire)
- Exact catch-up grace window length (~6–12h)
- Embed styling, Spanish copy, listar presentation
- Emoji input format/validation for seeded reactions
- Time/date input formats and validation UX
- editar partial-change mechanics

## Deferred Ideas

- Reaction tally / attendance report (who reacted ✅/❌) — seed-only ships in this phase
