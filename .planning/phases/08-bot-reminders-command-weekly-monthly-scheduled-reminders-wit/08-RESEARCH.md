# Phase 8: Bot Reminders Command — Research

**Researched:** 2026-07-09
**Domain:** Discord bot (discord.py 2.7) — scheduled recurring reminders, first background scheduler in the repo, SQLite persistence, timezone/DST math
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Command surface & permissions**
- **D-01:** One slash-command group **`/recordatorio`** with subcommands `crear`, `listar`, `borrar`, `editar` — Spanish `app_commands` style matching existing cogs (`/estado`, `/grabar`, `/nota`).
- **D-02:** All subcommands gated by the **same staff-role pattern** as gallery/reviews: a `REMINDERS_STAFF_ROLE_IDS` env list in `config.py`, defaulting/falling back to the existing staff role list. One trust level across the bot.
- **D-03:** Creation is **slash params + modal**: `crear` takes the schedule (frequency choice, day, time), target channel, name, and optional reaction emojis as validated slash parameters, then opens a **Discord modal with a multi-line text field** for the message body.
- **D-04:** `borrar` and `editar` select the reminder via **Discord autocomplete** (suggesting by reminder name + schedule summary) — staff never memorize IDs.
- **D-05:** Every reminder has a **required short name** (e.g. "Junta semanal") given at creation — powers autocomplete, makes `listar` readable, serves as embed title.

**Schedule model & timezone**
- **D-06:** Supported frequencies: **weekly** (one weekday + time), **monthly** (day-of-month + time), **one-off** (specific date + time).
- **D-07:** All schedules anchored to **one fixed team timezone from `.env`** (`REMINDERS_TZ`, an IANA zone, e.g. `America/Mexico_City`) — DST-aware, independent of the cinema host clock.
- **D-08:** Monthly reminders on day 29/30/31 **clamp to the last day of shorter months** (a day-31 reminder fires Feb 28/29) — never silently skips a month.
- **D-09:** Weekly = **one weekday per reminder**; "lunes y jueves" means creating two reminders.

**Message & delivery behavior**
- **D-10:** Sent reminder is a **mention line + branded embed**: role/user mentions on a plain content line above (so they ping — mentions inside embeds don't), custom message inside a styled embed below (name as title, Nocturna branding).
- **D-11:** Mention policy: **roles and users can ping; `@everyone`/`@here` are suppressed** via `allowed_mentions` — a staff typo can never mass-ping.
- **D-12:** **Target channel is per-reminder**, chosen with the Discord channel picker on `crear`.
- **D-13:** Missed fires (bot down): on startup, **catch up within a grace window (~6–12h)** — late reminder sent marked "⏰ atrasado", normal schedule resumes. Misses older than the window stay silent.
- **D-14:** **Seeded reactions** (optional, customizable emoji list): the bot adds them to its own reminder message right after sending. Bot **only seeds**; it does not track or report who reacted.

**Lifecycle & editing**
- **D-15:** **Full `/recordatorio editar`**: pick via autocomplete, re-open the message modal pre-filled, allow schedule/channel/name/reactions changes (chosen over delete+recreate).
- **D-16:** Recurring reminders **run until deleted** — no end dates, no pause state. **One-off reminders auto-delete** from the store after firing.

### Claude's Discretion
- **Persistence store** — user chose "you decide". Repo idiom strongly favors a `reminders` table in SQLite via `core/db.py`; JSON only if compelling. **→ Recommendation: SQLite table (see Standard Stack).**
- **Scheduler mechanism** — `tasks.loop` vs APScheduler vs sleep-until-next-fire. **→ Recommendation: `discord.ext.tasks` 1-minute polling loop (see Standard Stack + Pitfalls).**
- Exact catch-up grace window length within ~6–12h (D-13). **→ Recommendation: 6h, env-configurable.**
- Exact embed styling (color, footer, timestamp), Spanish copy, `listar` presentation.
- Emoji input format + validation for D-14 (custom/unicode handling, cap on count).
- Time/date input formats and validation UX for `crear` (`HH:MM` 24h, `YYYY-MM-DD` one-offs).
- How `editar` handles partial changes (which params optional, modal pre-fill mechanics).

### Deferred Ideas (OUT OF SCOPE)
- **Reaction tally / attendance report** — who reacted ✅/❌ to a junta reminder, summarized afterward. This phase only *seeds* reactions (D-14); tracking/reporting is a future capability.
- Any website-repo changes — this phase is **100% bot-side**, no cross-repo publishing, never touches `core/github_publish.py`.
- Reworking existing cogs.
- Deployment to cinema (git pull + systemd restart) is a **human step**, not phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

**No formal `REQ-ID`s are mapped to Phase 8** (the roadmap goal is TBD at roadmap level; CONTEXT.md is the authoritative scope). The acceptance surface is the locked-decision set **D-01…D-16** above, which the planner should treat as the requirement checklist. Origin: the folded todo `2026-07-07-bot-reminders-command-weekly-monthly-custom-message.md` (weekly/monthly + custom message + persistence across restarts + scheduler loop).

| Pseudo-ID | Description | Research Support |
|-----------|-------------|------------------|
| D-01/D-04/D-05 | `/recordatorio` group; crear/listar/borrar/editar; autocomplete selection; required name | `commands.GroupCog` (encoding.py, meeting.py); `@cmd.autocomplete` pattern (Code Examples) |
| D-02 | Staff-role gate reusing existing pattern | `_is_staff` role-intersection helper (reviews.py L85, gallery.py L41); `REMINDERS_STAFF_ROLE_IDS` config fallback |
| D-03/D-15 | Slash params + multi-line modal; edit re-opens pre-filled modal | `discord.ui.Modal` + `TextInput(style=paragraph, default=...)` (reviews.py ReviewModal) |
| D-06/D-07/D-08/D-09 | weekly/monthly/one-off; fixed IANA tz; month-end clamp | `zoneinfo.ZoneInfo` + `calendar.monthrange`; pure schedule-math helpers |
| D-10/D-11/D-12 | mention line + embed; suppress @everyone/@here; per-reminder channel | `discord.AllowedMentions(everyone=False)`; content+embed send |
| D-13 | catch-up within grace window, "atrasado" marking | `next_fire_utc` cursor + `before_loop`/first-tick reconcile |
| D-14 | seeded reactions, seed-only | `message.add_reaction()` loop with validation/cap |
| D-16 | recurring run-until-deleted; one-off auto-delete | recompute-and-UPDATE `next_fire_utc` vs `DELETE` after fire |
</phase_requirements>

## Summary

This phase adds a self-contained **`cogs/reminders.py`** to the `nocturna-bot` repo. Every decision maps cleanly onto patterns that already exist in the repo, with **one genuinely new capability**: a background scheduler loop (none exists today). The recommended architecture avoids all new heavyweight dependencies — it uses `discord.ext.tasks` (ships with discord.py), stdlib `zoneinfo` + `calendar`, and the repo's existing `core/db.py` SQLite layer.

The scheduler should be a **`@tasks.loop(minutes=1)` polling tick**, not `tasks.loop(time=...)` and not APScheduler. Polling is the most robust fit for arbitrary weekly/monthly/one-off schedules with per-reminder times, a configurable timezone, month-end clamping, and D-13's catch-up window — because all of those become simple pure functions over a persisted `next_fire_utc` cursor, and catch-up-on-restart falls out naturally on the first tick. This also matches the repo's proven testing philosophy: schedule math is pure-function territory (the existing suite is 164 tests, `SimpleNamespace` + `asyncio.run`, no pytest-asyncio).

The command surface (`/recordatorio` group), the staff-role gate, the multi-line modal, the channel picker, and `@everyone` suppression are all direct reuses of established repo idioms — `commands.GroupCog` (used by `/encoder` and `/reunion`), `_is_staff` role-intersection, `discord.ui.Modal` (reviews cog), and `discord.AllowedMentions`. The only NEW Discord API surface is **autocomplete** (D-04) — nothing in the repo uses it yet, but it is a stable, standard `@command.autocomplete` decorator returning ≤25 `Choice`s.

**Primary recommendation:** Build `cogs/reminders.py` as a `commands.GroupCog` (`group_name="recordatorio"`) with a `@tasks.loop(minutes=1)` scheduler; persist to a `reminders` table in `core/db.py` keyed by an internal `id` with a `next_fire_utc` cursor; do all schedule math (next-fire, month-clamp, DST via `zoneinfo`, catch-up classification) in pure module-level functions unit-tested exactly like the existing cogs. Add zero heavyweight dependencies; pin `tzdata` for cross-platform test reproducibility.

## Architectural Responsibility Map

This is a single-process Discord bot (one tier: the bot on cinema). The "tiers" below are the cog's internal conceptual components — the planner should keep these responsibilities separated for testability.

| Capability | Primary Component | Secondary | Rationale |
|------------|-------------------|-----------|-----------|
| Slash command routing (`/recordatorio *`) | Discord command layer (`GroupCog`) | — | discord.py owns tree registration + guild sync |
| Reminder selection UX (autocomplete) | Discord command layer (`@cmd.autocomplete`) | Persistence (reads names) | Discord renders suggestions from the cog's DB query |
| Multi-line message capture / edit | Discord UI layer (`Modal` + `TextInput`) | — | Modal is the only way to get multi-line + pre-fill |
| Schedule math (next-fire, clamp, DST, catch-up class) | **Pure helper functions** (module-level) | stdlib `zoneinfo`/`calendar` | Deterministic, no I/O → unit-test target |
| Firing on time / catching up | Scheduler (`tasks.loop`) | Pure helpers (decide), Delivery (send) | tasks.loop owns cadence + reconnect backoff |
| Persistence (CRUD + `next_fire_utc` cursor) | `core/db.py` (SQLite) | — | Repo idiom; restart-safe cursor |
| Message delivery (content line + embed + reactions) | Delivery helper (Discord send) | `AllowedMentions` | Owns ping policy + seeded reactions |
| Input validation (time, date, weekday, emoji, tz) | Pure validators (module-level) | Command layer (surfaces errors) | Fail early, unit-testable |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `discord.py` | `==2.7.1` (already pinned in `requirements.txt`) | Bot framework; `commands.GroupCog`, `app_commands`, `discord.ui.Modal`, `discord.ext.tasks` scheduler | Already the repo's bot framework `[VERIFIED: requirements.txt]` |
| `discord.ext.tasks` | ships with discord.py (no separate install) | The scheduler loop (`@tasks.loop`, `before_loop`, `.start()`/`.cancel()`, `@loop.error`) | Free with discord.py; handles reconnect backoff + ready-gating `[CITED: discordpy.readthedocs.io/en/stable/ext/tasks]` |
| `sqlite3` | stdlib (Python 3.12) | `reminders` table persistence via `core/db.py` | Repo's established persistence layer (`forum_posts`, `gallery_state`, `reviews_state`) `[VERIFIED: core/db.py]` |
| `zoneinfo` | stdlib (Python 3.9+) | DST-aware IANA timezone math for D-07 | Stdlib; verified resolving `America/Mexico_City` → -06:00 on the dev machine `[VERIFIED: python -c on dev machine]` |
| `calendar` | stdlib | `monthrange(y, m)[1]` for the D-08 month-end clamp | Stdlib; correct leap-year day counts `[ASSUMED — stdlib]` |
| `datetime` | stdlib | timestamps, `time`/`date` parsing, UTC conversion | Repo already stores ISO 8601 UTC via `datetime.now(timezone.utc).isoformat()` `[VERIFIED: core/db.py]` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tzdata` | `2026.2` latest (dev has `2025.2`) | Provides the IANA tz database on platforms without a system copy (Windows dev/CI) | Pin in `requirements.txt` so tests resolve `REMINDERS_TZ` on any OS. Cinema (Linux) has a system tz db; this is belt-and-suspenders for reproducibility `[VERIFIED: pip index versions tzdata; slopcheck OK]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@tasks.loop(minutes=1)` polling | `@tasks.loop(time=[...])` (fixed daily times) | `time=` accepts tz-aware `datetime.time` (since discord.py 2.0) but wants a *static* list of times; weekly/monthly/one-off with per-reminder times is dynamic. You'd re-register on every CRUD, and catch-up is not native. Rejected. `[CITED: ext/tasks docs]` |
| `@tasks.loop(minutes=1)` polling | **APScheduler 3.11.3** | Adds a dependency + its own job store (duplicates the SQLite persistence), and cron/interval triggers don't natively express D-08 month-clamp or D-13 grace-window catch-up. Would push schedule logic out of pure functions. Rejected — `discord.ext.tasks` ships free. `[VERIFIED: pip index; slopcheck OK]` |
| SQLite `reminders` table | JSON file on cinema | CONTEXT explicitly favors SQLite ("JSON acceptable only if compelling"). SQLite gives atomic concurrent writes between the loop and CRUD, and matches `forum_posts`/`gallery_state`/`reviews_state`. No compelling reason for JSON. |
| Polling scheduler | `asyncio.sleep(until_next_fire)` loop | Sleeping until the *single* next fire means every CRUD must wake/reschedule the sleeper, and a long sleep is fragile across suspends/clock changes. A 1-min poll is simpler and self-correcting. |

**Installation:**
```bash
# In the nocturna-bot repo — add to requirements.txt, no new heavyweight deps:
# tzdata>=2025.2   (cross-platform IANA tz db; Linux host already has system tzdata)
# discord.ext.tasks + sqlite3 + zoneinfo + calendar are already available (discord.py / stdlib)
pip install -r requirements.txt
```

**Version verification (this session):**
- `tzdata` — latest `2026.2`, dev machine has `2025.2` `[VERIFIED: pip index versions tzdata, 2026-07-09]`
- `APScheduler` — latest `3.11.3` (considered, not recommended) `[VERIFIED: pip index versions APScheduler]`
- `discord.py` — **prod/requirements pin `2.7.1`; the dev machine currently has `2.5.2`** (see Environment Availability — a mismatch to flag, but every API used here exists in 2.5+) `[VERIFIED: python -c import discord]`

## Package Legitimacy Audit

Only one *new* dependency is proposed (`tzdata`, and only to pin it). No npm involved (Python phase).

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `tzdata` | PyPI | est. 2020, 20+ releases | very high (PyPA project) | github.com/python/tzdata | `[OK]` | **Approved** (pin `>=2025.2`) |
| `APScheduler` | PyPI | est., 40+ releases to 3.11.3 | very high | github.com/agronholm/apscheduler | `[OK]` | **Considered, NOT adopted** (unnecessary dependency) |
| `discord.py` | PyPI | already a dep | very high | github.com/Rapptz/discord.py | n/a (pre-existing) | **Already pinned** `==2.7.1` |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none — `slopcheck install tzdata APScheduler` returned `2 OK` `[VERIFIED: slopcheck 2026-07-09]`

## Architecture Patterns

### System Architecture Diagram

```
                    ┌──────────────────────── cogs/reminders.py (RemindersCog: GroupCog "recordatorio") ────────────────────────┐
 Staff in Discord   │                                                                                                            │
  /recordatorio ───▶│  Command layer                                                                                            │
   crear/editar ───▶│   ├─ crear:  slash params (freq Choice, weekday/day, HH:MM, channel picker, name, emojis, role mention)   │
                    │   │            └─▶ interaction.response.send_modal(MensajeModal)  ──▶ on_submit ──┐                        │
   borrar/editar ──▶│   ├─ borrar/editar: @cmd.autocomplete("nombre") ──queries──▶ db.list_reminders() │                        │
   listar ────────▶ │   └─ listar:  db.list_reminders() ──▶ embed summary                              │                        │
                    │                                                                                    ▼                        │
                    │  Validation (pure fns): parse_time / parse_date / valid_weekday / valid_emoji / ZoneInfo(tz)               │
                    │                                                                                    │ writes                 │
                    │                                                                                    ▼                        │
                    │  Persistence  core/db.py ──▶  SQLite  reminders(id, name, freq, weekday, dom,     │                        │
                    │                                        run_date, hour, minute, channel_id,        │                        │
                    │                                        message, mentions, reactions,              │                        │
                    │                                        next_fire_utc, created_by, created_at)     │                        │
                    │                                                    ▲            │                                           │
                    │  Scheduler  @tasks.loop(minutes=1)                 │ recompute  │ read due rows                             │
                    │   before_loop: wait_until_ready() + catch-up ──────┘ next_fire  ▼                                          │
                    │   each tick:  now_utc = datetime.now(utc)                                                                   │
                    │     for r in db.due_reminders(now_utc):                                                                     │
                    │        cls = classify_fire(now, r.next_fire, grace)  # pure: "ontime"|"late(atrasado)"|"skip"              │
                    │        if cls != "skip": Delivery.send(r, atrasado = cls=="late")                                          │
                    │        if r.freq == one-off: db.delete(r)     else: db.set_next_fire(r, next_fire(...))                     │
                    │                                                          │                                                  │
                    │  Delivery (pure-ish): content line = mentions  │ embed = message body (title=name, brand)                  │
                    │     channel.send(content, embed, allowed_mentions=AllowedMentions(everyone=False, roles=True, users=True)) │
                    │     then: for e in reactions: await sent.add_reaction(e)   # D-14 seed-only                                 │
                    └────────────────────────────────────────────────────────────────────────────────┬───────────────────────────┘
                                                                                                       ▼
                                                                                        Target Discord channel (per-reminder)
```

### Recommended Project Structure (files touched in `nocturna-bot`)
```
nocturna-bot/
├── cogs/
│   └── reminders.py        # NEW: RemindersCog(GroupCog) + Modal + scheduler + pure helpers
├── core/
│   └── db.py               # EDIT: add init_reminders() + CRUD (add/list/get/update/delete/due/set_next_fire)
├── config.py               # EDIT: REMINDERS_TZ, REMINDERS_STAFF_ROLE_IDS (fallback), REMINDERS_CATCHUP_GRACE_HOURS
├── bot.py                  # EDIT: load_extension("cogs.reminders"); optional REMINDERS_TZ validity fail-fast
├── .env.example            # EDIT: document the new REMINDERS_* vars
├── requirements.txt        # EDIT: pin tzdata
└── tests/
    └── test_reminders_cog.py   # NEW: pure schedule-math + validators + fire-classification tests
# cogs/help.py — NO CHANGE (see Pattern 5)
```

### Pattern 1: `commands.GroupCog` for the `/recordatorio` group (D-01)
**What:** A subclass of `commands.GroupCog` with `group_name`; each `@app_commands.command` inside becomes a subcommand (`/recordatorio crear`, `/recordatorio listar`, …).
**When to use:** Any multi-subcommand slash group — this is the repo's established idiom.
**Example (from the repo, `cogs/encoding.py` / `cogs/meeting.py`):**
```python
# Source: nocturna-bot/cogs/encoding.py L14, cogs/meeting.py L74
class RemindersCog(
    commands.GroupCog,
    name="Reminders",
    group_name="recordatorio",
    group_description="Recordatorios programados (juntas y más)",
):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        db.init_reminders()                 # repo idiom: cog __init__ ensures its table (see core/db.py L38 note)
        self._scheduler.start()             # start the tasks.loop

    @app_commands.command(name="crear", description="Crea un recordatorio (staff)")
    async def crear(self, interaction, ...): ...

    async def cog_unload(self):
        self._scheduler.cancel()            # reload safety — mirrors encoding.py cog_unload cleanup

async def setup(bot: commands.Bot):
    await bot.add_cog(RemindersCog(bot))
```

### Pattern 2: Slash params → multi-line Modal (D-03) and pre-filled edit (D-15)
**What:** The slash command validates schedule/channel/name/emoji params, then its *first* interaction response opens a `Modal` whose single paragraph `TextInput` collects the long message body. The Modal carries the already-collected params into `on_submit`. For `editar`, set the `TextInput` `default=` to the stored body.
**When to use:** Any time you need multi-line free text + structured params in one command.
**Caveat:** `send_modal` must be the initial response — you cannot `defer()` first.
**Example (adapts `cogs/reviews.py` ReviewModal L145):**
```python
# Source: nocturna-bot/cogs/reviews.py ReviewModal (L145-198)
class MensajeModal(discord.ui.Modal):
    def __init__(self, *, params: dict, default_body: str = ""):
        super().__init__(title="Mensaje del recordatorio")
        self.params = params
        self.body = discord.ui.TextInput(
            label="Mensaje",
            style=discord.TextStyle.paragraph,   # multi-line
            max_length=4000,                      # Discord TextInput hard cap [CITED]
            default=default_body,                 # pre-fill for editar (D-15) [CITED: docs — alias of value]
            required=True,
        )
        self.add_item(self.body)

    async def on_submit(self, interaction: discord.Interaction):
        db.add_reminder(**self.params, message=str(self.body.value).strip(),
                        next_fire_utc=next_fire(**self.params))
        await interaction.response.send_message("✅ Recordatorio creado.", ephemeral=True)

# in crear():  await interaction.response.send_modal(MensajeModal(params={...}))
```

### Pattern 3: Autocomplete reminder selection (D-04) — NEW API for this repo
**What:** Attach `@<command>.autocomplete("<param>")` returning ≤25 `app_commands.Choice`s built from a live DB query. `Choice.name` is the human label (`"{name} — {schedule summary}"`), `Choice.value` is the internal id.
**When to use:** `borrar` and `editar` selection.
**Example:**
```python
@app_commands.command(name="borrar", description="Borra un recordatorio (staff)")
@app_commands.describe(recordatorio="Elige el recordatorio")
async def borrar(self, interaction, recordatorio: str):   # value = str(id)
    ...

@borrar.autocomplete("recordatorio")
async def _borrar_ac(self, interaction, current: str) -> list[app_commands.Choice[str]]:
    rows = db.list_reminders()
    current_l = current.lower()
    out = [
        app_commands.Choice(name=f"{r['name']} — {schedule_summary(r)}"[:100], value=str(r["id"]))
        for r in rows if current_l in r["name"].lower()
    ]
    return out[:25]          # Discord hard cap: max 25 choices [CITED: Discord API]
```

### Pattern 4: Delivery — mention line + embed + suppressed @everyone (D-10/D-11)
**What:** Send the ping tokens as plain `content` (mentions in embeds don't ping), the message as the embed body, and pass `allowed_mentions` that disallows `@everyone`/`@here` regardless of what the content string contains.
```python
allowed = discord.AllowedMentions(everyone=False, roles=True, users=True)
embed = discord.Embed(title=r["name"], description=r["message"], color=0xC0192C)  # brand red
if atrasado:
    embed.description = "⏰ **atrasado**\n\n" + embed.description
content = r["mentions"] or None        # e.g. "<@&ROLE_ID>"  (empty -> no content line)
sent = await channel.send(content=content, embed=embed, allowed_mentions=allowed)
for e in parse_emojis(r["reactions"]):     # D-14 seed-only, capped/validated
    try:
        await sent.add_reaction(e)
    except discord.HTTPException:
        log.warning("reminders: bad seed emoji %r skipped", e)
```

### Pattern 5: `/ayuda` requires NO change (resolves CONTEXT open item)
**Finding:** `cogs/help.py` (`/ayuda`) enumerates commands **dynamically** — it iterates `self.bot.tree.get_commands(...)` and already special-cases `app_commands.Group` (a `GroupCog` registers as a Group in the tree), printing each subcommand. `/recordatorio` and its subcommands will appear automatically. **No edit to `help.py` is needed.** `[VERIFIED: cogs/help.py L19-32]`

### Anti-Patterns to Avoid
- **Fixed UTC offsets** (e.g. `timedelta(hours=-6)`) instead of `ZoneInfo` — breaks the moment `REMINDERS_TZ` is a DST zone. Always build local time with `ZoneInfo(config.REMINDERS_TZ)` then convert to UTC.
- **Advancing `next_fire` by 30/31 days** for monthly — drifts and breaks month-end. Always recompute from the (year, month) + clamped day.
- **Bare loop body** — an unhandled exception in a `tasks.loop` body stops the loop for non-reconnect exceptions (see Pitfall 1). Wrap per-reminder work in try/except.
- **f-string SQL** — always use `?` placeholders (the repo does this everywhere; reminder name/message are user text).
- **Mentions inside the embed** expecting a ping — they render but never notify (this is exactly why D-10 puts them on the content line).
- **Editing `help.py`** — unnecessary and risks divergence; it is already dynamic.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Periodic scheduling + reconnect | A hand-rolled `while True: sleep()` task | `discord.ext.tasks.loop` | Handles reconnect backoff, `before_loop` ready-gate, clean `.cancel()` |
| Timezone / DST conversion | Fixed offsets, manual DST tables | stdlib `zoneinfo.ZoneInfo` (+ `tzdata` on Windows) | Correct DST + historical rule changes (e.g. Mexico dropped DST 2022) |
| "Last day of month" | `if month in (jan,mar,...)` tables | `calendar.monthrange(y, m)[1]` | Correct leap years, zero edge-case bugs (D-08) |
| Command group + subcommand routing | Manual prefix parsing / a dispatcher | `commands.GroupCog` + `@app_commands.command` | Discord-native group; guild sync already handled in `bot.py` |
| Reminder-selection UI | ID typing, a numbered menu | `@command.autocomplete` (D-04) | Native, ≤25 live suggestions, no memorized IDs |
| Mass-ping prevention | Regex-stripping `@everyone` from text | `discord.AllowedMentions(everyone=False)` | Hard API-level guarantee independent of message text (D-11) |
| Command listing in `/ayuda` | Manually append `/recordatorio` | (nothing) `help.py` is already dynamic | Auto-enumerates Groups (Pattern 5) |
| A job store / persistence engine | APScheduler + its jobstore | A `reminders` table in `core/db.py` + `next_fire_utc` cursor | Matches repo idiom; keeps schedule math pure/testable; zero deps |

**Key insight:** Every "hard" part of a scheduler (recurrence math, DST, month-ends, catch-up) reduces to **pure functions over a persisted `next_fire_utc`**. Keep those functions free of Discord/DB imports so they unit-test the way the whole repo already tests (`SimpleNamespace` + `asyncio.run`, no pytest-asyncio). Everything else is a thin call into an existing repo idiom.

## Common Pitfalls

### Pitfall 1: An unhandled exception silently kills the `tasks.loop`
**What goes wrong:** One malformed reminder (bad channel, deleted role, invalid emoji) raises inside the tick; the loop stops and *no* reminders fire afterward — silently.
**Why it happens:** `discord.ext.tasks` only auto-recovers a curated set of reconnect/network exceptions (when `reconnect=True`, the default). A generic `ValueError`/`Forbidden` propagating out of the loop body cancels the task. `[CITED: ext/tasks docs — reconnect covers connection-style errors; @loop.error registers the handler]`
**How to avoid:** (1) Wrap each reminder's fire in its own `try/except` inside the tick so one bad row can't sink the batch; (2) register `@self._scheduler.error` to log and restart the loop; (3) keep the tick body defensive (resolve channel with `get_channel or fetch_channel`, catch `discord.Forbidden`/`NotFound`).
**Warning signs:** Reminders stop firing after a specific reminder; `journalctl` shows a traceback then silence.

### Pitfall 2: Duplicate or lost fire across a restart / crash
**What goes wrong:** If the bot crashes between "send the reminder" and "advance `next_fire_utc`", a restart re-fires it (double ping); if you advance before sending and crash between, the fire is lost.
**Why it happens:** The send and the DB update aren't atomic.
**How to avoid:** Choose **advance-after-send** and accept a *rare* lost fire over a duplicate ping (a double junta ping is worse than one covered-by-catch-up miss). D-13's grace window (Pitfall 4) covers the miss. Document this as an accepted trade-off. Alternatively store a `last_fired_utc` and dedupe by occurrence key. Either way, make the choice explicit for the planner.
**Warning signs:** Same reminder posts twice within a minute after a restart, or a reminder that was due during a crash never posts.

### Pitfall 3: DST spring-forward gap / fall-back overlap
**What goes wrong:** A local time that doesn't exist (spring-forward gap) or occurs twice (fall-back overlap) produces a wrong UTC instant.
**Why it happens:** Naive local→UTC without handling `fold`/nonexistent times.
**How to avoid:** Build local time as `datetime(y, m, d, h, mi, tzinfo=ZoneInfo(tz))`, then `.astimezone(timezone.utc)`; for robustness normalize via `datetime.fromtimestamp(local.timestamp(), tz)` or handle `fold`. **Note:** the default `America/Mexico_City` has had **no DST since 2022** (permanent -06:00), so this never triggers for the default zone — but `REMINDERS_TZ` is configurable, so write the math generally and add a DST-boundary unit test. `[ASSUMED — stdlib zoneinfo behavior; Mexico DST-abolition is well documented]`
**Warning signs:** A reminder fires an hour early/late twice a year in a DST zone.

### Pitfall 4: Catch-up dumps stale reminders (or loses recent ones)
**What goes wrong:** After a long outage, every missed occurrence fires at once (spam); or the design skips a fire that was only minutes late.
**Why it happens:** No grace-window classification.
**How to avoid:** A pure `classify_fire(now, next_fire, grace) -> {"ontime","late","skip"}`: within a small jitter → on-time; overdue but within `grace` (recommend **6h**, env `REMINDERS_CATCHUP_GRACE_HOURS`, inside D-13's 6–12h) → send marked "⏰ atrasado"; overdue beyond grace → advance `next_fire` past `now` and send nothing. This runs in `before_loop` and/or naturally on the first tick. Mirrors Phase-5/7 startup reconvergence.
**Warning signs:** A flood of reminders on boot, or a legitimately-late junta reminder never arrives.

### Pitfall 5: `zoneinfo` fails on a host without the IANA db
**What goes wrong:** `ZoneInfo("America/Mexico_City")` raises `ZoneInfoNotFoundError` — typically on Windows/CI with no system tz database.
**Why it happens:** `zoneinfo` reads the OS tz db; Windows has none.
**How to avoid:** Pin **`tzdata`** in `requirements.txt` (pure-python fallback db that `zoneinfo` auto-uses). The cinema Linux host has a system db; this is for dev/CI. Already installed on the dev machine (`2025.2`). `[VERIFIED]`
**Warning signs:** Tests pass on Linux, fail on Windows with `ZoneInfoNotFoundError`.

### Pitfall 6: SQLite writes are blocking + can contend
**What goes wrong:** The 1-minute loop and a concurrent CRUD both write → `database is locked`, or a slow write briefly blocks the event loop.
**Why it happens:** `sqlite3` calls are synchronous; the repo does them inline in async handlers.
**How to avoid:** For this low volume (a handful of reminders, one write/minute) the existing inline pattern is fine and matches gallery/reviews. Keep writes short (single `INSERT OR REPLACE`/`UPDATE`), reuse the `with _get_conn() as conn` auto-commit idiom. If it ever grows, wrap in `asyncio.to_thread` — not needed now.
**Warning signs:** Occasional `sqlite3.OperationalError: database is locked` under rapid CRUD.

### Pitfall 7: discord.py version skew (dev 2.5.2 vs prod 2.7.1)
**What goes wrong:** Code tested against 2.5.2 could rely on differing behavior than the 2.7.1 production runtime (or vice versa).
**Why it happens:** The dev machine's `discord` is `2.5.2`; `requirements.txt` pins `2.7.1`.
**How to avoid:** Every API used here (`GroupCog`, `app_commands.autocomplete`, `Modal`/`TextInput` incl. `default`, `tasks.loop` incl. tz-aware `time=`, `AllowedMentions`) exists since **2.0**, so both versions are safe. Recommend running the test suite against the pinned `2.7.1` (create/refresh the venv from `requirements.txt`) before the human deploy to cinema. `[VERIFIED: dev import discord → 2.5.2; requirements pin 2.7.1]`
**Warning signs:** A test green locally but a runtime `AttributeError` on cinema (or the reverse).

## Code Examples

### Pure schedule math (unit-test targets — no Discord/DB imports)
```python
# Source: composed from stdlib zoneinfo + calendar (repo has no scheduler yet)
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
import calendar

def _clamp_day(year: int, month: int, day: int) -> int:
    """D-08: a day-31 monthly reminder fires on the last day of shorter months."""
    return min(day, calendar.monthrange(year, month)[1])

def next_weekly_fire(now_utc: datetime, weekday: int, hour: int, minute: int, tz: str) -> datetime:
    """Next occurrence of `weekday` (0=Mon..6=Sun) at HH:MM in `tz`, as UTC."""
    zone = ZoneInfo(tz)
    local_now = now_utc.astimezone(zone)
    days_ahead = (weekday - local_now.weekday()) % 7
    candidate = local_now.replace(hour=hour, minute=minute, second=0, microsecond=0) \
                + timedelta(days=days_ahead)
    if candidate <= local_now:
        candidate += timedelta(days=7)
    return candidate.astimezone(timezone.utc)

def next_monthly_fire(now_utc: datetime, day: int, hour: int, minute: int, tz: str) -> datetime:
    zone = ZoneInfo(tz)
    local_now = now_utc.astimezone(zone)
    y, m = local_now.year, local_now.month
    candidate = local_now.replace(day=_clamp_day(y, m, day), hour=hour,
                                  minute=minute, second=0, microsecond=0)
    if candidate <= local_now:                      # roll to next month
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)
        candidate = candidate.replace(year=y, month=m, day=_clamp_day(y, m, day))
    return candidate.astimezone(timezone.utc)

def classify_fire(now_utc: datetime, next_fire_utc: datetime, grace_hours: int,
                  jitter_min: int = 5) -> str:
    """'ontime' | 'late' (⏰ atrasado) | 'skip' (too old). Pure → unit-tested (D-13)."""
    lateness = now_utc - next_fire_utc
    if lateness < timedelta(minutes=jitter_min):
        return "ontime"
    if lateness <= timedelta(hours=grace_hours):
        return "late"
    return "skip"
```

### `core/db.py` additions (follow the existing idiom)
```python
# Source: pattern from nocturna-bot/core/db.py (init_gallery_state / get_cursor / set_cursor)
def init_reminders():
    with _get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS reminders (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                name          TEXT    NOT NULL,
                frequency     TEXT    NOT NULL,        -- 'weekly' | 'monthly' | 'oneoff'
                weekday       INTEGER,                 -- 0-6 (weekly)
                day_of_month  INTEGER,                 -- 1-31 (monthly)
                run_date      TEXT,                    -- 'YYYY-MM-DD' (oneoff)
                hour          INTEGER NOT NULL,
                minute        INTEGER NOT NULL,
                channel_id    INTEGER NOT NULL,
                message       TEXT    NOT NULL,
                mentions      TEXT    DEFAULT '',       -- e.g. '<@&123>'
                reactions     TEXT    DEFAULT '',       -- e.g. '✅ ❌'
                next_fire_utc TEXT    NOT NULL,         -- ISO 8601 UTC (the scheduler cursor)
                created_by    INTEGER NOT NULL,
                created_at    TEXT    NOT NULL
            )
        """)

def due_reminders(now_utc_iso: str) -> list:
    with _get_conn() as conn:
        return conn.execute(
            "SELECT * FROM reminders WHERE next_fire_utc <= ? ORDER BY next_fire_utc",
            (now_utc_iso,)).fetchall()

def set_next_fire(reminder_id: int, next_fire_utc_iso: str):
    with _get_conn() as conn:
        conn.execute("UPDATE reminders SET next_fire_utc = ? WHERE id = ?",
                     (next_fire_utc_iso, reminder_id))
```

### `config.py` additions (follow the reviews fallback idiom)
```python
# Source: pattern from nocturna-bot/config.py (REVIEWS_STAFF_ROLE_IDS ... or GALLERY_STAFF_ROLE_IDS)
REMINDERS_TZ = os.getenv("REMINDERS_TZ", "America/Mexico_City")   # IANA zone (D-07)
REMINDERS_STAFF_ROLE_IDS = [
    int(x) for x in os.getenv("REMINDERS_STAFF_ROLE_IDS", "").split(",") if x.strip()
] or GALLERY_STAFF_ROLE_IDS                                        # fallback to existing staff (D-02)
REMINDERS_CATCHUP_GRACE_HOURS = int(os.getenv("REMINDERS_CATCHUP_GRACE_HOURS", "6"))  # D-13
```

### Scheduler loop skeleton (defensive per Pitfall 1 & 4)
```python
# Source: discord.ext.tasks pattern (before_loop/wait_until_ready) + repo cog_unload cleanup
from discord.ext import tasks

@tasks.loop(minutes=1)
async def _scheduler(self):
    now = datetime.now(timezone.utc)
    for r in db.due_reminders(now.isoformat()):
        try:
            cls = classify_fire(now, datetime.fromisoformat(r["next_fire_utc"]),
                                config.REMINDERS_CATCHUP_GRACE_HOURS)
            if cls != "skip":
                await self._deliver(r, atrasado=(cls == "late"))
            if r["frequency"] == "oneoff":
                db.delete_reminder(r["id"])                 # D-16 auto-delete
            else:
                db.set_next_fire(r["id"], compute_next(r, now).isoformat())
        except Exception:
            log.exception("reminders: fire failed for id=%s (others continue)", r["id"])

@_scheduler.before_loop
async def _before(self):
    await self.bot.wait_until_ready()                       # channels resolve

@_scheduler.error
async def _on_error(self, exc):
    log.exception("reminders: scheduler crashed, restarting", exc_info=exc)
    self._scheduler.restart()
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `pytz` for timezones | stdlib `zoneinfo` (+ `tzdata` fallback) | Python 3.9 (2020) | No third-party tz lib needed; `zoneinfo` is the standard |
| `commands.command` prefix commands | `app_commands` slash + `GroupCog` | discord.py 2.0 (2022) | Repo already all-slash; `GroupCog` is the group idiom |
| External schedulers for simple bot loops | `discord.ext.tasks` (with tz-aware `time=`) | discord.py 2.0 | No APScheduler needed for this scale |

**Deprecated/outdated:**
- `pytz` — superseded by stdlib `zoneinfo`; do not add it.
- Prefix (`!`) commands — the bot is slash-only (`bot.py` sets `command_prefix="!"` but no user-facing prefix commands; everything is `app_commands`).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `calendar.monthrange` gives correct leap-year last-day for D-08 clamp | Standard Stack / Code Examples | Low — stdlib, trivially unit-tested |
| A2 | `zoneinfo` DST gap/overlap handling as described; default `America/Mexico_City` has no DST since 2022 | Pitfall 3 | Low for default zone; add a DST unit test if a DST zone is ever configured |
| A3 | Advance-`next_fire`-after-send is the preferred crash trade-off | Pitfall 2 | Medium — this is a design choice; planner/user may prefer occurrence-dedupe. Flag in plan. |
| A4 | 6h catch-up grace is the right default within D-13's 6–12h | Pitfall 4 / config | Low — env-configurable; user discretion per CONTEXT |
| A5 | Autocomplete responses share Discord's 25-choice cap (docs confirm static choices max 25; autocomplete is the same cap) | Pattern 3 | Low — well-established Discord API limit |
| A6 | Every API used exists in both discord.py 2.5.2 (dev) and 2.7.1 (prod) | Pitfall 7 / Env | Low — all are ≥2.0 APIs; recommend testing on the pinned 2.7.1 |
| A7 | Blocking inline `sqlite3` is acceptable at this volume (matches gallery/reviews) | Pitfall 6 | Low — repo already does this |

## Open Questions (RESOLVED)

1. **Crash-time fire semantics (double-ping vs missed fire)**
   - **RESOLVED:** locked in the 08-03-PLAN.md objective as the documented design choice (A3): advance-after-send — a rare missed advance beats a double ping; the D-13 grace window covers the miss. Scheduler ordering is test-asserted in 08-03 Task 2.
   - What we know: send + `next_fire` update aren't atomic; catch-up covers recent misses.
   - What's unclear: whether the user prefers "never double-ping" (advance-after-send + grace catch-up) or "never miss" (occurrence dedupe via `last_fired`).
   - Recommendation: default to advance-after-send (rare miss, covered by D-13); surface the trade-off in the plan as a one-line decision.

2. **Mention input mechanism for D-10**
   - **RESOLVED:** implemented per the recommendation in 08-03-PLAN.md Task 1 — `crear` takes an optional typed `mencion: discord.Role` slash param whose `.mention` is stored and rendered on the content line; freeform text in the modal body never pings.
   - What we know: mentions must be on the content line to ping; `AllowedMentions(everyone=False)` enforces D-11.
   - What's unclear: whether `crear` takes a typed `discord.Role`/`discord.Member` slash param (cleanest, type-safe) vs freeform mention text.
   - Recommendation: an optional `mencion: discord.Role` (and/or `discord.Member`) slash param rendered into the content line — type-safe and picker-driven; freeform mentions in the modal body render but never ping (which is exactly D-10's point).

3. **Emoji validation + cap for D-14 (discretion)**
   - **RESOLVED:** implemented per the recommendation in 08-02-PLAN.md — `parse_emojis` splits on space/comma, dedupes, caps at 6 (unit-tested); 08-03 Task 2 delivery seeds each emoji inside try/except `HTTPException` (skip + log).
   - What we know: unicode emoji strings work directly; custom emoji need `<:name:id>`; Discord allows ≤20 reactions/message.
   - Recommendation: accept a space/comma-separated list, validate each by attempting `add_reaction` (catch `HTTPException`, skip+log), cap at ~5–6 for a clean RSVP row.

4. **discord.py runtime parity**
   - **RESOLVED:** accepted risk per Assumptions Log A6 — every API used exists in both 2.5.2 (dev) and 2.7.1 (prod pin), so no task is needed; refreshing the dev/CI venv from `requirements.txt` before the human cinema deploy remains the recommendation.
   - What we know: dev is `2.5.2`, `requirements.txt` pins `2.7.1` (cinema).
   - Recommendation: refresh the dev/CI venv from `requirements.txt` so tests exercise `2.7.1` before the human deploy.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python | whole bot | ✓ | 3.12.8 (dev; cinema similar) | — |
| `discord.py` | cog framework + `tasks` scheduler | ✓ | **prod pin 2.7.1**; dev has **2.5.2** | Refresh venv from requirements.txt |
| `discord.ext.tasks` | scheduler loop | ✓ (ships w/ discord.py) | — | — |
| `sqlite3` | persistence (`bot.db`) | ✓ (stdlib) | — | — |
| `zoneinfo` | DST tz math | ✓ (stdlib 3.9+) | — | — |
| `tzdata` | IANA tz db on non-Linux (tests/CI) | ✓ | 2025.2 (dev) → pin `>=2025.2` | Linux system tz db on cinema |
| `calendar` | month-end clamp | ✓ (stdlib) | — | — |
| Cinema host (Linux, systemd) | 24/7 runtime + restart persistence | ✓ (per CONTEXT/STATE) | — | — (human deploy) |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** `discord.py` version parity — dev `2.5.2` vs pinned `2.7.1`; refresh venv from `requirements.txt` before deploy (all used APIs exist in both).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Discord authenticates users; bot has no auth surface |
| V3 Session Management | no | N/A (Discord interactions) |
| V4 Access Control | **yes** | Staff-role gate on **every** subcommand via `_is_staff` role-intersection against `REMINDERS_STAFF_ROLE_IDS` (D-02) — the primary control |
| V5 Input Validation | **yes** | Validate weekday (0–6), day-of-month (1–31), `HH:MM`, `YYYY-MM-DD`, `REMINDERS_TZ` (ZoneInfo), emoji tokens, name/message length; reject before persisting |
| V6 Cryptography | no | No secrets/crypto introduced (no PAT — this cog never publishes cross-repo) |

### Known Threat Patterns for a Discord scheduler cog

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Mass-ping via `@everyone`/`@here` (staff typo or misuse) | Denial of Service / Tampering | `discord.AllowedMentions(everyone=False, roles=True, users=True)` — hard suppression regardless of message text (D-11) |
| SQL injection via reminder name/message | Tampering | Parameterized `?` placeholders only (repo idiom) — never f-string SQL |
| Unauthorized command use | Elevation of Privilege | `_is_staff(member)` gate on crear/listar/borrar/editar (D-02); bots/role-less members never staff |
| Sending to an unauthorized/unintended channel | Tampering | Staff trust boundary (accepted); handle `discord.Forbidden`/`NotFound` gracefully — bot needs Send Messages perms in the target channel |
| Resource exhaustion (unbounded reminders/reactions) | Denial of Service | Cap seeded reactions (~5–6; Discord max 20/msg); consider a sane cap on total reminders |
| Markdown/link injection in the message body | Tampering (low) | Body renders as embed text/markdown (not code); staff-authored; low risk. Mentions inside embed never ping (defense in depth) |
| Loop-kill via one bad reminder | Denial of Service | Per-reminder try/except + `@loop.error` restart (Pitfall 1) |

## Sources

### Primary (HIGH confidence)
- `nocturna-bot` repo (local clone `../nocturna-bot`, git HEAD 2026-07-09) — read directly this session:
  - `cogs/encoding.py`, `cogs/meeting.py` — `commands.GroupCog` group pattern (`/encoder`, `/reunion`)
  - `cogs/reviews.py` — `discord.ui.Modal` + `TextInput(paragraph)`, `_is_staff` role gate, on_ready run-once
  - `cogs/gallery.py` — staff gate, backfill/reconcile philosophy, `from core import db`
  - `cogs/help.py` — dynamic Group enumeration (no change needed)
  - `core/db.py` — SQLite idiom (`_get_conn`, `CREATE TABLE IF NOT EXISTS`, `init_*`, cursor helpers)
  - `config.py`, `bot.py`, `.env.example`, `requirements.txt` — env pattern, cog loading, fail-fast, pinned deps
- `discordpy.readthedocs.io/en/stable/ext/tasks/index.html` — `tasks.loop` params, tz-aware `time=`, `before_loop`/`after_loop`, `.start()`/`.stop()`/`.cancel()`, `@loop.error`, reconnect behavior
- `docs.discord.com/developers/interactions/application-commands` — option choices "max 25"
- `python -c` on dev machine — `zoneinfo` resolves `America/Mexico_City` (-06:00); `tzdata 2025.2`; `discord 2.5.2`
- `slopcheck install tzdata APScheduler` → `2 OK`; `pip index versions tzdata|APScheduler`

### Secondary (MEDIUM confidence)
- pythondiscord.com + discordjs.guide (cross-lib, same Discord API) — Modal max 5 text inputs; TextInput `max_length` up to 4000; embed description 4096

### Tertiary (LOW confidence)
- Training knowledge for `calendar.monthrange` leap-year behavior and `zoneinfo` DST fold semantics (flagged as assumptions A1/A2; trivially unit-testable)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every element is stdlib or already in the repo; new dep (`tzdata`) slopcheck-OK and already installed
- Architecture: HIGH — patterns read verbatim from the repo's own cogs (GroupCog, Modal, db idiom, AllowedMentions); only autocomplete is new but standard
- Pitfalls: MEDIUM-HIGH — `tasks.loop` error/reconnect behavior verified via official docs; DST/crash-semantics are design-level and flagged as assumptions

**Research date:** 2026-07-09
**Valid until:** ~2026-08-09 (stable stack; re-verify if discord.py major bumps or the cinema Python changes)
