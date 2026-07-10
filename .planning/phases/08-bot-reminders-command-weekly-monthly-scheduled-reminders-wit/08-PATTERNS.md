# Phase 8: Bot Reminders Command - Pattern Map

**Mapped:** 2026-07-09
**Files analyzed:** 7 (2 new, 5 modified)
**Analogs found:** 6 / 7 (the scheduler loop, autocomplete, and schedule-math are net-new to the repo — see No Analog Found)

> **Target repo:** All analog paths below are in the **`nocturna-bot`** repo (local clone at `../nocturna-bot`, absolute `C:\Users\Shangri\Pictures\Nocturna Avatars\Coding\nocturna-bot`), NOT the website repo. No website-repo files are touched by this phase.

## File Classification

| New/Modified File (`nocturna-bot`) | Role | Data Flow | Closest Analog | Match Quality |
|------------------------------------|------|-----------|----------------|---------------|
| `cogs/reminders.py` (NEW) | cog (command router + UI modal + scheduler) | request-response (slash) + event-driven/batch (1-min poll) | `cogs/meeting.py` (GroupCog) + `cogs/reviews.py` (Modal/staff/delivery) + `cogs/encoding.py` (lifecycle) | role-match (composite; no scheduler cog exists) |
| `core/db.py` (EDIT) | model / persistence layer | CRUD | `core/db.py` itself (`init_gallery_state` / cursor helpers / `save_post`) | exact (same file, same idiom) |
| `config.py` (EDIT) | config | config-load | `config.py` reviews block L77-84 (`REVIEWS_STAFF_ROLE_IDS` fallback) | exact |
| `bot.py` (EDIT) | bootstrap / entrypoint | — | `bot.py` `setup_hook` L42-64 + `main()` fail-fast L77-104 | exact |
| `.env.example` (EDIT) | config (docs) | — | `.env.example` reviews block L52-56 | exact |
| `requirements.txt` (EDIT) | config (deps) | — | `requirements.txt` gallery block L16-18 | exact |
| `tests/test_reminders_cog.py` (NEW) | test | — | `tests/test_reviews_cog.py` + `tests/conftest.py` | role-match (pure schedule-math is new; scaffolding identical) |
| `cogs/help.py` | — | — | **NO CHANGE** — enumerates Groups dynamically (L24-32); `/recordatorio` appears automatically |

---

## Pattern Assignments

### `cogs/reminders.py` (NEW — cog: GroupCog + Modal + scheduler)

This file is a composite of three existing cog idioms plus one net-new piece (the scheduler loop). Copy from these analogs:

#### A. Module header + logger + GroupCog class shell

**Analog:** `cogs/meeting.py` (lines 14-31 imports, 74-85 GroupCog) and `cogs/encoding.py` (lines 1-24, 130-131 setup)

**Imports pattern** (`cogs/encoding.py` L1-11):
```python
import logging

import discord
from discord import app_commands
from discord.ext import commands

import config

log = logging.getLogger(__name__)
```
> For reminders add `from discord.ext import commands, tasks`, `from core import db`, and stdlib `from datetime import datetime, timezone, timedelta` / `from zoneinfo import ZoneInfo` / `import calendar` (net-new scheduler deps — see No Analog Found).

**GroupCog class header** (`cogs/meeting.py` L74-85 — the exact group idiom to mirror):
```python
class MeetingCog(
    commands.GroupCog,
    name="Meeting",
    group_name="reunion",
    group_description="Graba reuniones de voz y genera actas con IA local",
):
    """Graba reuniones de voz y genera actas con IA local."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.sessions: dict[int, MeetingSession] = {}
        config.RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)
```
> Reminders: `group_name="recordatorio"`, and `__init__` calls `db.init_reminders()` then `self._scheduler.start()` (per RESEARCH Pattern 1).

**Module-level `setup`** (`cogs/encoding.py` L130-131 — every cog ends with this):
```python
async def setup(bot: commands.Bot):
    await bot.add_cog(EncodingCog(bot))
```

#### B. Background-resource lifecycle (start in `__init__`/`cog_load`, cancel in `cog_unload`)

**Analog:** `cogs/encoding.py` L27-39 — the repo's only precedent for a long-lived background resource owned by a cog (an aiohttp listener). The reminders scheduler `tasks.loop` mirrors this start/stop discipline for reload safety.
```python
async def cog_load(self):
    app = web.Application()
    app.router.add_post("/notify", self._handle_notify)
    self._runner = web.AppRunner(app)
    await self._runner.setup()
    site = web.TCPSite(self._runner, config.NOTIFY_HOST, config.NOTIFY_PORT)
    await site.start()
    log.info(f"HTTP listener activo en {config.NOTIFY_HOST}:{config.NOTIFY_PORT}")

async def cog_unload(self):
    if self._runner:
        await self._runner.cleanup()
```
> Reminders `cog_unload` must call `self._scheduler.cancel()` (the tasks.loop equivalent of `_runner.cleanup()`).

#### C. Slash subcommand with describe + choices (the `crear` params)

**Analog:** `cogs/encoding.py` L99-105 (choices) and `cogs/meeting.py` L88-90 (describe). This is exactly how to render the D-06 frequency choice and D-03 validated params.
```python
@app_commands.command(name="detener", description="Detiene el encoder para poder reiniciar la PC")
@app_commands.describe(modo="¿Cuándo debe parar?")
@app_commands.choices(modo=[
    app_commands.Choice(name="Ahora mismo (corta el encode actual)", value="stop_now"),
    app_commands.Choice(name="Al terminar el actual", value="stop_after"),
])
async def detener(self, interaction: discord.Interaction, modo: app_commands.Choice[str]):
    ...
```
> Reminders `crear`: `@app_commands.choices(frecuencia=[Choice("Semanal","weekly"), Choice("Mensual","monthly"), Choice("Una vez","oneoff")])`; channel picker is a typed `canal: discord.TextChannel` param; optional `mencion: discord.Role` (RESEARCH Open Q2).

#### D. Multi-line Modal (D-03) + pre-filled edit Modal (D-15)

**Analog:** `cogs/reviews.py` `ReviewModal` L145-198 — the exact `discord.ui.Modal` + paragraph `TextInput` idiom, plus the tolerant ephemeral confirmation helper.

**Modal construction** (`cogs/reviews.py` L156-166):
```python
def __init__(self, anonymous: bool, title: str = "Escribe tu reseña"):
    super().__init__(title=title)
    self.anonymous = anonymous
    self.review_text = discord.ui.TextInput(
        label="Tu reseña",
        style=discord.TextStyle.paragraph,       # multi-line
        max_length=500,
        required=True,
        placeholder="Cuéntanos tu experiencia con Nocturna Avatars…",
    )
    self.add_item(self.review_text)
```
> Reminders `MensajeModal`: carry the already-collected slash params via `__init__(self, *, params, default_body="")`; set `default=default_body` on the `TextInput` to pre-fill for `editar` (D-15); bump `max_length` toward 4000 (Discord cap) for long bodies with line breaks.

**on_submit body** (`cogs/reviews.py` L168-180) — read the value, strip, act, then confirm:
```python
async def on_submit(self, interaction: discord.Interaction):
    text = str(self.review_text.value).strip()
    ...
    sent = await channel.send(embed=embed)
    await sent.add_reaction("✅")            # the approve control (on_message skips bots)
```

**Tolerant ephemeral confirmation** (`cogs/reviews.py` L189-198) — reuse verbatim for "✅ Recordatorio creado.":
```python
@staticmethod
async def _reply(interaction: discord.Interaction, content: str):
    try:
        if interaction.response.is_done():
            await interaction.followup.send(content, ephemeral=True)
        else:
            await interaction.response.send_message(content, ephemeral=True)
    except Exception:
        log.exception("reviews: could not send modal confirmation")
```
> **Caveat (RESEARCH Pattern 2):** `interaction.response.send_modal(...)` must be the *first* response — do NOT `defer()` before opening the modal.

#### E. Delivery: channel resolve + send + seeded reactions (D-10/D-11/D-14)

**Analog for channel resolution** (`cogs/encoding.py` L48-54, echoed in `cogs/reviews.py` L177-178):
```python
channel = self.bot.get_channel(config.ENCODING_CHANNEL_ID)
if channel is None:
    try:
        channel = await self.bot.fetch_channel(config.ENCODING_CHANNEL_ID)
    except discord.HTTPException:
        channel = None
if channel:
    await channel.send(message)
else:
    log.warning("ENCODING_CHANNEL_ID (%s) no encontrado — ...", config.ENCODING_CHANNEL_ID)
```

**Analog for seeded reactions** (`cogs/reviews.py` L180, L341-342) — `add_reaction` on the bot's own just-sent message is exactly the D-14 seed:
```python
await sent.add_reaction("✅")
await message.add_reaction("🟢")
await message.add_reaction("🌙")
```
> Reminders delivery adds the net-new bits from RESEARCH Pattern 4: `allowed_mentions=discord.AllowedMentions(everyone=False, roles=True, users=True)` (D-11), mention tokens on the `content` line, message body in a `discord.Embed`, then a capped loop of `await sent.add_reaction(e)` wrapped in `try/except discord.HTTPException` (skip+log bad emoji).

#### F. Embed styling (brand)

**Analog:** `cogs/reviews.py` L42 + L76-82 — brand red constant and embed build.
```python
REVIEW_EMBED_COLOR = 0xC0192C                  # brand red (fixed; identity-free)
...
embed = discord.Embed(description=text, color=REVIEW_EMBED_COLOR)
embed.set_author(name=author_name)
embed.set_footer(text=REVIEW_EMBED_FOOTER)
```
> Reminders embed: `title=r["name"]`, `description=r["message"]`, `color=0xC0192C`; prepend "⏰ **atrasado**" to the description on catch-up fires (D-13). (Note `cogs/help.py`/`meeting.py` use a different `0x7B2FBE`; prefer brand red `0xC0192C` per RESEARCH Pattern 4.)

---

### `core/db.py` (EDIT — add `init_reminders()` + CRUD)

**Analog:** `core/db.py` itself — this is the exact idiom, same file. Add a new `init_reminders()` + CRUD block following `init_gallery_state` / `get_cursor` / `set_cursor` / `save_post`.

**Connection + `CREATE TABLE IF NOT EXISTS` idiom** (`core/db.py` L7-10, L38-52):
```python
def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_gallery_state():
    with _get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS gallery_state (
                id                        INTEGER PRIMARY KEY CHECK (id = 1),
                last_processed_message_id INTEGER
            )
        """)
```
> `init_reminders()` copies this shell with the `reminders` table schema from RESEARCH Code Examples (id AUTOINCREMENT, name, frequency, weekday, day_of_month, run_date, hour, minute, channel_id, message, mentions, reactions, next_fire_utc, created_by, created_at). The cog's `__init__` calls `db.init_reminders()` — same as gallery.

**Cursor read/write idiom** (`core/db.py` L55-78) — the model for `due_reminders` / `set_next_fire`:
```python
def get_cursor() -> int | None:
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT last_processed_message_id FROM gallery_state WHERE id = 1"
        ).fetchone()
    return row["last_processed_message_id"] if row else None

def set_cursor(message_id: int):
    with _get_conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO gallery_state (id, last_processed_message_id) VALUES (1, ?)",
            (message_id,),
        )
```

**Parameterized CRUD + ISO-UTC timestamp idiom** (`core/db.py` L88-102) — the model for `add_reminder` / `delete_reminder`:
```python
def save_post(thread_id, title, author_id, avatars, image_url="", source_url=""):
    avatars_str = ",".join(a.lower() for a in avatars)
    with _get_conn() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO forum_posts
                (thread_id, title, author_id, avatars, image_url, source_url, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (thread_id, title, author_id, avatars_str, image_url, source_url,
              datetime.now(timezone.utc).isoformat()))

def delete_post(thread_id: int):
    with _get_conn() as conn:
        conn.execute("DELETE FROM forum_posts WHERE thread_id = ?", (thread_id,))
```
> **Hard rules from this file:** always `?` placeholders (never f-string SQL — reminder name/message are user text); timestamps via `datetime.now(timezone.utc).isoformat()`; `with _get_conn() as conn` auto-commit. `sqlite3.Row` rows are accessed by column name (`row["next_fire_utc"]`).

---

### `config.py` (EDIT — add `REMINDERS_*`)

**Analog:** `config.py` L77-84 (reviews block) — the exact comma-split-with-fallback idiom for `REMINDERS_STAFF_ROLE_IDS` (D-02).
```python
REVIEWS_CHANNEL_ID = int(os.getenv("REVIEWS_CHANNEL_ID", "1453534905706221600"))
REVIEWS_STAFF_ROLE_IDS = [
    int(x) for x in os.getenv("REVIEWS_STAFF_ROLE_IDS", "").split(",") if x.strip()
] or GALLERY_STAFF_ROLE_IDS      # fallback to existing staff roles
```
> Add (per RESEARCH config example): `REMINDERS_TZ = os.getenv("REMINDERS_TZ", "America/Mexico_City")`, `REMINDERS_STAFF_ROLE_IDS = [... ] or GALLERY_STAFF_ROLE_IDS`, `REMINDERS_CATCHUP_GRACE_HOURS = int(os.getenv("REMINDERS_CATCHUP_GRACE_HOURS", "6"))`. Append after the reviews block, keeping the `# ── section ──` comment-header style (see L51-52, L72-73).

---

### `bot.py` (EDIT — load extension + optional fail-fast)

**Analog:** `bot.py` L42-64 (cog load list) and L77-104 (`main()` fail-fast).

**Cog loading** (`bot.py` L42-47) — add one line:
```python
async def setup_hook(self):
    await self.load_extension("cogs.encoding")
    await self.load_extension("cogs.forum")
    await self.load_extension("cogs.gallery")
    await self.load_extension("cogs.reviews")
    await self.load_extension("cogs.help")
```
> Add `await self.load_extension("cogs.reminders")`. The existing guild-only tree sync (L57-64) then registers `/recordatorio` automatically — no extra sync code needed.

**Fail-fast env validation** (`bot.py` L77-104) — the pattern if a `REMINDERS_TZ` validity check is added:
```python
def main():
    if not config.BOT_TOKEN:
        log.error("BOT_TOKEN no configurado en el .env")
        sys.exit(1)
    ...
    if not config.REVIEWS_CHANNEL_ID:
        log.error("REVIEWS_CHANNEL_ID no configurado en el .env (canal de reseñas)")
        sys.exit(1)
```
> Optional: validate `ZoneInfo(config.REMINDERS_TZ)` resolves and `sys.exit(1)` with a Spanish error if not. `REMINDERS_STAFF_ROLE_IDS` needs no check (falls back to `GALLERY_STAFF_ROLE_IDS`), same reasoning as the reviews comment at L99-101.

---

### `.env.example` (EDIT — document `REMINDERS_*`)

**Analog:** `.env.example` L52-56 (reviews block) — the section-comment + inline-comment style.
```
# ── Reseñas (Fase 7: cog de publicación de reseñas) ─────────────────────────────
# Reutiliza GITHUB_PAT / WEBSITE_REPO / WEBSITE_BRANCH de la galería (mismo repo destino).
REVIEWS_CHANNEL_ID=1453534905706221600 # canal donde los clientes dejan reseñas (default de fábrica)
REVIEWS_STAFF_ROLE_IDS=                # IDs de rol separados por comas; vacío → usa GALLERY_STAFF_ROLE_IDS
```
> Add a `# ── Recordatorios (Fase 8) ──` block: `REMINDERS_TZ=America/Mexico_City`, `REMINDERS_STAFF_ROLE_IDS=` (empty → GALLERY fallback), `REMINDERS_CATCHUP_GRACE_HOURS=6`.

---

### `requirements.txt` (EDIT — pin `tzdata`)

**Analog:** `requirements.txt` L16-18 (gallery block) — commented, section-grouped pins.
```
# ── Galería (Fase 5: cog de publicación de fotos) ────────────────────────────────
Pillow>=12.0.0                   # optimiza los adjuntos de staff → WebP (BOT-03)
pytest>=8.0.0                    # pruebas del pipeline de imágenes (core/image_optimize)
```
> Add a `# ── Recordatorios (Fase 8) ──` line: `tzdata>=2025.2   # base de datos IANA de zonas horarias (Windows/CI; Linux ya la trae)`. Note discord.py is already pinned `==2.7.1` at L3; `discord.ext.tasks`, `sqlite3`, `zoneinfo`, `calendar` need no new lines (ship with discord.py / stdlib).

---

### `tests/test_reminders_cog.py` (NEW — pure schedule-math + validators + fire-classification)

**Analog:** `tests/test_reviews_cog.py` (fakes + fixture idiom) and `tests/conftest.py` (path bootstrap).

**Test-suite conventions** (`tests/test_reviews_cog.py` L13-48) — `SimpleNamespace` fakes, `asyncio.run` + `AsyncMock`, **no pytest-asyncio**:
```python
import asyncio
import types
from datetime import datetime, timezone
from unittest.mock import AsyncMock

import config
from cogs import reviews
from cogs.reviews import ReviewsCog

def _member(role_ids, is_bot=False):
    return types.SimpleNamespace(
        roles=[types.SimpleNamespace(id=r) for r in role_ids],
        bot=is_bot,
    )
```

**Config fixture idiom** (`tests/test_reviews_cog.py` L69-70) — `monkeypatch` config for isolation:
```python
@pytest.fixture(autouse=True)
def _reviews_config(monkeypatch):
    ...
```

**Pure-helper test shape** (`tests/test_reviews_cog.py` L88-98) — the exact template for testing schedule-math/validators:
```python
def test_is_staff_true_when_role_intersects():
    assert reviews._is_staff(_member([OTHER_ROLE_ID, STAFF_ROLE_ID])) is True

def test_is_staff_false_without_matching_role():
    assert reviews._is_staff(_member([OTHER_ROLE_ID])) is False
    assert reviews._is_staff(_member([])) is False
```

**Async-listener test shape** (`tests/test_reviews_cog.py` L139-141) — `asyncio.run` drives async paths:
```python
def test_on_message_adds_check_for_client_text_review(cog):
    ...
    asyncio.run(cog.on_message(msg))
    ...
```
> Reminders tests target the net-new **pure** functions (no Discord/DB imports): `next_weekly_fire`, `next_monthly_fire`, `_clamp_day` (month-end + leap year), `classify_fire` (ontime/late/skip), and the input validators (`parse_time`, `parse_date`, `valid_weekday`, `valid_emoji`). Add a DST-boundary case per RESEARCH Pitfall 3. Because these are pure, most tests are plain `assert fn(...) == expected` — no fakes needed. `conftest.py` already puts the repo root on `sys.path`; no change there.

---

## Shared Patterns

### Staff-role gate (D-02) — apply to ALL `/recordatorio` subcommands
**Source:** `cogs/reviews.py` L85-92 (module-level pure `_is_staff`)
```python
def _is_staff(member) -> bool:
    role_ids = {r.id for r in getattr(member, "roles", [])}
    return bool(role_ids & set(config.REVIEWS_STAFF_ROLE_IDS))
```
> Copy verbatim into `reminders.py` as a module-level `_is_staff` against `config.REMINDERS_STAFF_ROLE_IDS`; guard every subcommand's first line. Gate-fail replies ephemeral, e.g. `cogs/encoding.py` L88-90: `await interaction.response.send_message("Sin permisos.", ephemeral=True); return`.

### SQLite persistence idiom — apply to every `core/db.py` addition
**Source:** `core/db.py` L7-10, L88-102
```python
with _get_conn() as conn:
    conn.execute("... ? ...", (param,))     # always ? placeholders, never f-strings
```
> Timestamps: `datetime.now(timezone.utc).isoformat()` (L2 import, L97 usage). Rows are `sqlite3.Row` → access by column name.

### Spanish app-command surface — apply to every subcommand
**Source:** `cogs/meeting.py` L88-89, `cogs/encoding.py` L86, L99-105
```python
@app_commands.command(name="grabar", description="Entra al canal de voz y empieza a grabar la reunión")
@app_commands.describe(tema="Tema de la reunión (opcional; se usa como título del acta)")
```
> Spanish `name=`/`description=`/`describe`, Spanish-first ephemeral replies (`✅`/`❌`/`⚠️` prefixes as in `cogs/encoding.py` L94-127).

### Module logger + channel resolution — apply throughout the cog
**Source:** `cogs/encoding.py` L11 (`log = logging.getLogger(__name__)`) and L48-54 (`get_channel` → `fetch_channel` fallback → warn). Use for scheduler delivery and every `log.exception(...)`/`log.warning(...)` call.

---

## No Analog Found

These have no close match in the repo — the planner should use **RESEARCH.md** (Standard Stack, Patterns, Code Examples) instead:

| Concern (within `cogs/reminders.py` / tests) | Role | Data Flow | Reason | Use Instead |
|----------------------------------------------|------|-----------|--------|-------------|
| Scheduler loop (`@tasks.loop(minutes=1)`, `before_loop` + `wait_until_ready`, `@loop.error` restart) | scheduler | batch/poll | **No `tasks.loop`/APScheduler anywhere in the repo** — this cog sets the precedent | RESEARCH "Scheduler loop skeleton" + `discord.ext.tasks` docs; defensive per-reminder try/except (Pitfall 1) |
| Autocomplete selection (`@<cmd>.autocomplete`, ≤25 `Choice`s from a live DB query) for `borrar`/`editar` (D-04) | command UI | request-response | No cog uses `app_commands` autocomplete yet | RESEARCH Pattern 3 |
| Pure schedule math: `next_weekly_fire` / `next_monthly_fire` / `_clamp_day` / `classify_fire` (zoneinfo + calendar, DST, month-clamp, catch-up) | pure helper | transform | No timezone/recurrence math exists in the repo | RESEARCH "Pure schedule math" Code Examples; `zoneinfo.ZoneInfo` + `calendar.monthrange` (Don't Hand-Roll) |
| `allowed_mentions` @everyone suppression (D-11) | delivery policy | — | No cog sends role/user mentions with an `AllowedMentions` policy today | RESEARCH Pattern 4: `discord.AllowedMentions(everyone=False, roles=True, users=True)` |

> These are the only net-new surfaces. Everything else in the phase is a direct reuse of an existing repo idiom documented above.

## Metadata

**Analog search scope (`../nocturna-bot`):** `cogs/` (encoding, meeting, reviews, gallery, help), `core/db.py`, `config.py`, `bot.py`, `.env.example`, `requirements.txt`, `tests/` (conftest, test_reviews_cog)
**Files scanned:** 12
**Pattern extraction date:** 2026-07-09
