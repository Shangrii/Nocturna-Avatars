# Phase 9: Jinxxy Store Auto-Sync - Pattern Map

**Mapped:** 2026-07-10
**Files analyzed:** 11 (8 bot-repo + 1 website data + 2 test)
**Analogs found:** 11 / 11 (every new/modified file has a strong in-repo analog)

> **Two codebases.** Almost all new code lives in the **bot repo** (`../nocturna-bot`,
> i.e. `C:\Users\Shangri\Pictures\Nocturna Avatars\Coding\nocturna-bot`). The website
> repo (cwd) contributes only `src/data/store.json`, which the bot **writes cross-repo** —
> no component/Astro work this phase. All paths below are relative to the **bot repo**
> unless prefixed `Website/`.

> **Key insight (from RESEARCH):** ~90% of this phase is *reuse*. Only three mechanics are
> genuinely new: (1) the Jinxxy API client, (2) the object-aware `store.json` transport
> variant, (3) the three-way ownership merge. Everything else is copy-with-cadence-change
> of Phases 5/7/8.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `core/jinxxy_api.py` (NEW) | service / HTTP client | request-response (poll) | `core/github_publish.py` `_headers`/`_http`/`_require` (L80-119) | role-match |
| `core/store_sync.py` (NEW) | service (pure helpers) | transform | `cogs/reminders.py` pure-helper block (L39-197) | role-match |
| `core/github_publish.py` (EXTEND) | service / commit transport | CRUD (read-modify-commit) | itself — reviews transport (L411-513) | exact |
| `core/db.py` (EXTEND) | model / state store | CRUD | `init_reminders` + `init_gallery_state` (L38-78, L228-338) | exact |
| `config.py` (EXTEND) | config | — | reviews/reminders env blocks (L72-98) | exact |
| `bot.py` (EXTEND) | bootstrap | — | `setup_hook` + `main()` fail-fast (L42-117) | exact |
| `cogs/jinxxy.py` (NEW) | controller (cog) | event-driven (scheduled) + request-response | `cogs/reminders.py` (loop+GroupCog+gate) + `cogs/reviews.py` (embed+reconcile+transport calls) | role-match (composite) |
| `tests/test_store_sync.py` (NEW) | test | — | `tests/test_reminders_cog.py` (L1-90) | exact |
| `tests/test_jinxxy_api.py` (NEW) | test | — | `tests/test_reviews_publish.py` (HTTP-mock) | role-match |
| `tests/test_store_publish.py` (NEW) | test | — | `tests/test_reviews_publish.py` (full file) | exact |
| `Website/src/data/store.json` (MODIFIED by bot) | data / schema | — | existing `store.json` (`_comment` preservation) | data contract (no code analog) |
| `cogs/help.py` | controller | — | auto-lists via `bot.tree` — **likely no edit needed** (verify) | exact |

---

## Pattern Assignments

### `core/store_sync.py` (service, pure transform) — NEW

**Analog:** `cogs/reminders.py` pure-helper block (L39-197) — the repo's established
"module-level, import-safe, unit-testable pure functions with **no** Discord/DB side
effects" idiom. `store_sync.py` is the reminders analog: schedule-math → mapping+merge.

**Module docstring + imports pattern** (reminders.py L1-29): the module states loudly
that importing it has **no side effects**, then imports `config` + `from core import db`
only where needed. Follow this so `map_product`/`three_way_merge` stay pure.

**Pure-mapping pattern** — mirror RESEARCH Code Examples `map_product` (RESEARCH L374-392),
built from live-probe-confirmed fields (D-14..D-17). Only API-available fields; `images`/
`description` are **omitted** (staff-owned, D-15):
```python
# checkoutUrl is CONSTRUCTED (D-17): url field is a slug, not a URL
def map_product(detail: dict, store_username: str, owner_name: str) -> dict:
    name = detail["name"]
    slug = detail["url"]                                  # live: a slug e.g. "cahuama"
    restrictions = detail.get("restrictions") or []
    return {
        "checkoutUrl": f"https://jinxxy.com/{store_username}/{slug}",   # D-17 link key
        "name": {"es": name, "en": name},                # verbatim into both (D-10, name only)
        "price": str(detail["base_price"]),              # site adds "$ … USD"
        "category": detail.get("category") or "assets",  # discretion (D-09)
        "editor": owner_name,                            # from /me (D-09)
        "nsfw": "CONTENT_MATURE" in restrictions,        # D-16 (live-confirmed)
        "date": detail["created_at"][:10],               # YYYY-MM-DD
        # images{}, description{} NOT set by sync — staff-owned (D-15)
        # featured/license/details/updates/storefronts NEVER set by sync (D-12)
    }
```

**Three-way merge pattern** (RESEARCH Pattern 3, D-12) — implement as a **pure function**
`(snapshot, live, current) -> (merged_entry, changed_fields)`. Follow the same
"pure function returning a value + a summary" shape the reminders `classify_fire` uses
(reminders.py L110-122): a small deterministic classifier with documented branches.

**Validators pattern** (reminders.py L126-171): copy the `parse_*`/`valid_*` shape for any
input normalization of untrusted API responses (V5, RESEARCH Security Domain) — e.g.
enforce `checkoutUrl` is `https://` before it reaches the transport.

---

### `core/jinxxy_api.py` (service, HTTP client) — NEW

**Analog:** `core/github_publish.py` low-level HTTP helpers (L80-119) — the repo's proven
`requests`-based, typed-error, explicit-timeout, secret-in-header-only client idiom.
RESEARCH (A5, L164) recommends `requests`-in-`to_thread` over `aiohttp` for consistency
with this transport and testability.

**Headers pattern — secret header-only, never logged** (github_publish.py L80-85):
```python
def _headers():
    # PAT read at call time; never logged. Jinxxy: x-api-key read the same way.
    return {"Authorization": f"Bearer {config.GITHUB_PAT}", "Accept": "application/vnd.github+json"}
```
Adapt to `{"x-api-key": config.JINXXY_API_KEY}`. **Same discipline as `GITHUB_PAT`**
(RESEARCH Anti-Patterns L288, Security V2): header-only, never logged, never committed.

**Typed-error + explicit-timeout wrapper** (github_publish.py L100-119) — wrap every call
so network failures become one typed error and no call can hang:
```python
_TIMEOUT = (10, 60)   # (connect, read); requests has NO default timeout (CR-02)
def _http(method, url, what, headers=None, **kw):
    kw.setdefault("timeout", _TIMEOUT)
    try:
        return getattr(requests, method)(url, headers=headers or _headers(), **kw)
    except requests.RequestException as exc:
        raise JinxxyAPIError(f"{what} failed: network error ({exc.__class__.__name__})") from exc
```
Define a `JinxxyAPIError(RuntimeError)` mirroring `GitHubPublishError` (L72-76). Errors go
to **logs only, never Discord** (D-05).

**Pagination pattern** — RESEARCH Code Examples `list_all_products` (RESEARCH L350-372):
loop `page` until `page >= body["page_count"]`, `limit=100`, `sort_field=created_at`.
Then `GET /products/{id}` per product for rich fields. Respect `X-RateLimit-Remaining` /
429 backoff (RESEARCH Pitfall 4, Don't-Hand-Roll L299). Base URL `https://api.creators.jinxxy.com/v1`,
spec v1.2.2.

**`/me` for `store_username` + `owner_name`** — D-17 (checkoutUrl construction) and D-09
(`editor` default) both need `GET /me`. Fetch once per sync, pass into `map_product`.

---

### `core/github_publish.py` (EXTEND — object-aware store transport) — MODIFIED

**Analog:** itself — the reviews transport (L411-513). Reviews already proved the
"single JSON file, no image blobs, read-modify-write via `_commit_with_retry(fetch=...)`"
path. Store diverges in ONE way: **`store.json` is an OBJECT, not an array** (RESEARCH
Pattern 2, Pitfall 1 — the load-bearing divergence).

**The divergence** — `_fetch_json` (L151-187) **raises** `"expected a JSON array"` on a
dict body (L185-186). `store.json` is `{"_comment": ..., "products": [...]}`. Add an
object-aware sibling that PRESERVES `_comment`:
```python
def _fetch_store(repo, branch, path):
    obj = _fetch_json_object(repo, branch, path)      # dict-expecting variant of _fetch_json
    if not isinstance(obj, dict) or "products" not in obj:
        raise GitHubPublishError("store.json: expected an object with a 'products' key")
    return obj                                         # keep _comment + any staff-added keys
```

**Reuse the retry core unchanged** (L239-277): `_commit_with_retry(repo, branch, message,
build_tree, fetch=...)` was generalized in Phase 7 with a `fetch=` param. Pass
`fetch=lambda: _fetch_store(repo, branch, store_path)`. The `build_tree` closure writes the
**whole object back mutating only `products`** so `_comment` survives every sync:
```python
def build_tree(current):                    # current is the full {_comment, products} dict
    updated = dict(current)                 # preserve _comment + unknown top-level keys
    updated["products"] = merged_products   # only products changes
    return [{"path": store_path, "mode": _MODE, "type": "blob",
             "content": _serialize_json(updated)}]     # _serialize_json = ensure_ascii=False, indent=2
```

**Serialization** — reuse `_serialize_json` (L235): `json.dumps(obj, ensure_ascii=False,
indent=2)` matches the shipped `store.json` shape (2-space, Spanish text readable).

**No-op guard** (reviews L456-460, gallery L341-347): compute the merge, and **only commit
when something changed** (D-06 silent-on-no-change; RESEARCH Pitfall 2 — every commit = one
Pages rebuild). Return `{"committed": False, ...}` when `changed_fields` is empty.

**Public async wrapper** (reviews L480-512): add `async def publish_store(products)` /
`sync_store(...)` under `_commit_lock` + `asyncio.to_thread` (L495-496). The module-level
`_commit_lock` (L69) already serializes store commits against gallery/reviews commits.

**Never mass-remove on API failure** (RESEARCH Security L459, mirrors gallery orphan rule):
only remove a product when the API *successfully* reports it absent/hidden — an API
error/empty page is "unknown", never "storefront is empty".

---

### `core/db.py` (EXTEND — snapshot state) — MODIFIED

**Analog:** `init_reminders` (L228-255) + `init_gallery_state` (L38-52) — the repo's
`CREATE TABLE IF NOT EXISTS` + per-feature `init_*()` idiom (the cog calls it in `__init__`,
**not** `init_db()`).

**Table-init pattern** (db.py L46-52 / L236-255): add `init_store_state()` creating the
D-12 snapshot table. Key by the D-13 link key (`checkoutUrl`) or Jinxxy product `id`; store
the last-synced Jinxxy value per owned field so the three-way compare is durable across
restarts:
```python
def init_store_state():
    with _get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS store_snapshot (
                checkout_url TEXT PRIMARY KEY,   -- D-13 link key
                jinxxy_id    TEXT,
                name         TEXT,
                price        TEXT,
                category     TEXT,
                nsfw         INTEGER,
                date         TEXT,
                synced_at    TEXT NOT NULL
            )
        """)
```

**Getter/setter pattern** (db.py L55-78, `get_cursor`/`set_cursor`): add snapshot
read/write helpers. **Always `?` placeholders, never SQL f-strings** — the T-08-03 lesson
(db.py L216-217, `_REMINDER_UPDATABLE` whitelist L222-225) applies to any column-name
that comes from a variable. `datetime.now(timezone.utc).isoformat()` for `synced_at`
(same idiom as `save_post` L96-97).

---

### `config.py` (EXTEND) — MODIFIED

**Analog:** the reviews (L72-84) + reminders (L86-98) env blocks — a commented Spanish
section header, `os.getenv(...)` with sane defaults, comma-split role-id lists with a
fallback to `GALLERY_STAFF_ROLE_IDS`.

**Env-block pattern** (config.py L86-98):
```python
# ── Jinxxy (Fase 9: sync de la tienda) ────────────────────────────────────────────
JINXXY_API_KEY            = os.getenv("JINXXY_API_KEY", "")            # secreto; header-only
JINXXY_ANNOUNCE_CHANNEL_ID = int(os.getenv("JINXXY_ANNOUNCE_CHANNEL_ID", "1525202600738295818"))  # D-18
JINXXY_POLL_HOURS         = int(os.getenv("JINXXY_POLL_HOURS", "6"))   # D-03 banda 6-12h
WEBSITE_STORE_JSON        = os.getenv("WEBSITE_STORE_JSON", "src/data/store.json")
JINXXY_STAFF_ROLE_IDS = [
    int(x) for x in os.getenv("JINXXY_STAFF_ROLE_IDS", "").split(",") if x.strip()
] or GALLERY_STAFF_ROLE_IDS                                            # fallback idiom (L82, L95)
```
`GITHUB_PAT` / `WEBSITE_REPO` / `WEBSITE_BRANCH` (L63-67) are **reused unchanged**.

---

### `bot.py` (EXTEND) — MODIFIED

**Analog:** `setup_hook` cog list (L42-48) + `main()` fail-fast validation (L79-117).

**Cog-load pattern** (bot.py L47): add `await self.load_extension("cogs.jinxxy")` to
`setup_hook`. Guild-only command sync (L58-64) is already generic — the new `/tienda`
GroupCog registers automatically.

**Fail-fast env pattern** (bot.py L91-99, mirrors the gallery PAT check): add a
`JINXXY_API_KEY` guard so a missing key exits at startup, not on the first poll:
```python
if not config.JINXXY_API_KEY:
    log.error("JINXXY_API_KEY no configurado en el .env (requerido para el sync de la tienda)")
    sys.exit(1)
```
`GITHUB_PAT`/`WEBSITE_REPO` are already validated (L91-96); `JINXXY_STAFF_ROLE_IDS` falls
back to `GALLERY_STAFF_ROLE_IDS`, so no separate check needed (same reasoning as reviews,
L100-102).

---

### `cogs/jinxxy.py` (controller — scheduler + command + announce) — NEW

**Composite analog:** `cogs/reminders.py` (background loop + GroupCog + staff gate) for the
**structure**, `cogs/reviews.py` (transport calls + startup reconcile + branded embeds) for
the **publish/announce** behavior.

**GroupCog + `__init__`/`cog_unload` loop lifecycle** (reminders.py L313-334) — RESEARCH
Pattern 1 (RESEARCH L230-256):
```python
class JinxxyCog(commands.GroupCog, name="Jinxxy", group_name="tienda",
                group_description="Sincroniza la tienda con Jinxxy (staff)"):
    def __init__(self, bot):
        self.bot = bot
        db.init_store_state()                 # repo idiom: ensure table exists
        self._poll.start()
    async def cog_unload(self):
        self._poll.cancel()                   # hot-reload safety (reminders L331-334)

    @tasks.loop(hours=config.JINXXY_POLL_HOURS)   # D-03 band 6-12h
    async def _poll(self):
        await self._run_sync(datetime.now(timezone.utc))

    @_poll.before_loop
    async def _before(self):
        await self.bot.wait_until_ready()     # channels/guild resolve first (reminders L724-729)

    @_poll.error
    async def _on_error(self, exc):
        log.exception("jinxxy: el poll se cayó, reiniciando", exc_info=exc)  # LOGS ONLY (D-05)
        self._poll.restart()
```

**Staff-gated command** (reminders.py `crear` L337-364, staff gate FIRST L361-364) — the
`/tienda sync` manual trigger (D-02). Staff gate is the FIRST thing that runs; non-staff
gets an ephemeral "Sin permisos." `_is_staff` copies reminders.py L189-197 verbatim,
swapping `REMINDERS_STAFF_ROLE_IDS` → `JINXXY_STAFF_ROLE_IDS`:
```python
def _is_staff(member) -> bool:
    role_ids = {r.id for r in getattr(member, "roles", [])}
    return bool(role_ids & set(config.JINXXY_STAFF_ROLE_IDS))
```

**Branded announce embed** (reminders.py `_deliver` embed L672-681, reviews `panel_resenas`
embed L247-257) — D-06 discretion, Spanish-first, brand red `0xC0192C`. Resolve the channel
with the `get_channel` → `fetch_channel` fallback (reminders L656-662), post added/updated/
removed summary. **Silent on no changes** (D-06); **errors never posted** (D-05, log only).

**Transport call + typed-error handling** (reviews `_publish` L301-338): call
`github_publish.sync_store(...)`, catch `GitHubPublishError` → `log.exception` (NOT a
Discord message, D-05 — this diverges from reviews' ⚠️ reply UX). Post the announce embed
only after a successful commit that actually changed something.

**Startup reconvergence** (reviews `on_ready` + `_backfill` L480-528, CONTEXT L108) — an
`on_ready` that runs once (guard with `self._synced_once`) reconciling snapshot vs live
`store.json` vs Jinxxy so restarts converge. Never mass-remove on a transient API failure
(reviews `_reconcile_orphans` "remove only on definitive NotFound" L530-568; RESEARCH
Security L459).

**Discord attach flow for images/description (D-15)** — NEW mechanic, planner's-discretion
design (reply-based or command-based). Reuse: the reviews modal pattern (`ReviewModal`
L145-198) for a command flow, OR an `on_message`/reaction reply flow like gallery. The
attached image path should follow the gallery photo pipeline conventions (`core/image_optimize.py`
exists) and write into `store.json`'s `images[]` via the same object-aware transport. These
two fields are 100% staff-owned — the sync merge never overwrites them.

---

### `tests/test_store_sync.py` (test — pure helpers) — NEW

**Analog:** `tests/test_reminders_cog.py` (L1-90) — the repo's pure-function test idiom:
plain `assert fn(...) == expected`, `types.SimpleNamespace` fakes, **no pytest-asyncio**,
`asyncio.run` for any coroutine.

**SimpleNamespace fake pattern** (test_reminders_cog.py L33-42):
```python
def _member(role_ids, is_bot=False):
    return types.SimpleNamespace(roles=[types.SimpleNamespace(id=r) for r in role_ids], bot=is_bot)
```
Test the three merge branches (D-12: Jinxxy-unchanged / Jinxxy-changed-staff-untouched /
both-changed), `map_product` field mapping (checkoutUrl construction D-17, nsfw D-16,
verbatim name D-10), and the `_is_staff` gate — each a pure `assert`.

---

### `tests/test_store_publish.py` + `tests/test_jinxxy_api.py` (test — HTTP-mocked) — NEW

**Analog:** `tests/test_reviews_publish.py` (full file) — the repo's HTTP-mock idiom:
a `FakeGitHub` (L52-120) monkeypatching `requests.get/post/patch`, `asyncio.run` driving the
async transport, canned JSON per endpoint, a `wire(monkeypatch)` fixture (L125-144) that also
silences backoff sleeps and asserts the PAT never logs.

**Store transport tests must additionally pin (RESEARCH Pitfall 1):**
- `_comment` **survives** a sync commit (the object-preservation guarantee) — assert the
  committed blob still contains the `_comment` key. This is the load-bearing new assertion.
- object-shape rejection: a non-object / missing-`products` body raises the typed error
  (mirror `test_fetch_json_non_array_body_raises_typed_error` L385-392).
- no-op when nothing changed → no commit, no ref patch (mirror
  `test_remove_with_no_matching_entry_is_a_noop_no_empty_commit` L305-313).

**`test_jinxxy_api.py`** reuses the same `_Resp`/fake-`requests` scaffolding for the
Creator API client: pagination loop, `x-api-key` header present on every call, key never
logged (mirror `test_pat_is_never_written_to_logs` L329-335), explicit timeout on every call
(mirror L355-362), 429/backoff handling.

---

### `Website/src/data/store.json` (data contract — bot writes, do not redesign)

**Analog:** the existing file itself. Currently `{"_comment": "<locked schema doc>",
"products": []}`. The Phase-6 schema is **locked** (D-13 there). The bot's writes must:
- **preserve `_comment` verbatim** (the staff-facing schema doc, RESEARCH Pitfall 1).
- write only sync-owned fields into each product; leave `images`/`description`/`license`/
  `details`/`updates`/`storefronts`/`featured` for staff (D-12/D-15).
- `checkoutUrl` and any `storefronts[].url` are **`https://`-only** per the schema — enforce
  the scheme before writing (RESEARCH Security L457).
- `price` is a plain number string, NO `$` (the site adds "$ … USD").

No Astro/component work — `ProductCard.astro` / `QuickViewModal.astro` consume `store.json`
as-is (CONTEXT L102).

---

## Shared Patterns

### Secret handling (API key / PAT — header-only, never logged)
**Source:** `core/github_publish.py` `_headers` (L80-85), Security V2, RESEARCH Anti-Pattern L288.
**Apply to:** `core/jinxxy_api.py` (`x-api-key`), `config.py` (fail-fast in `bot.py`).
`JINXXY_API_KEY` is handled exactly like `GITHUB_PAT`: read at call time, placed only in a
request header, never interpolated into a log line or commit, `.env`-only, fail-fast if missing.

### Staff-role gate (trust boundary)
**Source:** `cogs/reminders.py` `_is_staff` (L189-197) / `cogs/reviews.py` `_is_staff` (L85-92).
**Apply to:** `cogs/jinxxy.py` `/tienda sync` command (and its autocomplete if any).
Gate FIRST, before any work; non-staff → ephemeral "Sin permisos."; fallback to
`GALLERY_STAFF_ROLE_IDS` when `JINXXY_STAFF_ROLE_IDS` unset. Autocomplete callbacks return
`[]` for non-staff (reminders L505-513, the Phase-8 CR-01 lesson).

### Errors → logs only, NEVER Discord (D-05 — hard rule)
**Source:** `cogs/reminders.py` `_on_scheduler_error` (L731-736), `_process_due` per-row
try/except (L703-718).
**Apply to:** every failure path in `cogs/jinxxy.py` and every raise in `core/jinxxy_api.py`.
This is the deliberate divergence from reviews' ⚠️-reply UX: `log.exception(...)`, never a
channel message. The announce embed is for **store news only** (added/updated/removed).

### Cross-repo commit transport (reuse, don't fork)
**Source:** `core/github_publish.py` `_commit_with_retry(fetch=...)` (L239-277), `_commit_lock`
(L69), `_http` typed errors + `_TIMEOUT` (L100-119).
**Apply to:** the new `publish_store`/`sync_store`. Reuse blob→tree→commit→ref, stale-ref
retry, the module lock, and the typed error. Only `_fetch_store`/`build_tree` (object-aware)
differ. RESEARCH Don't-Hand-Roll L295.

### State persistence via SQLite `init_*()` (per-feature)
**Source:** `core/db.py` `init_gallery_state` (L38-52), `init_reminders` (L228-255),
`?`-placeholder discipline + whitelist (L216-225).
**Apply to:** `init_store_state()` + snapshot getters/setters; cog calls it in `__init__`.

### Background loop (Phase-8 shape, cadence-only change)
**Source:** `cogs/reminders.py` scheduler (L313-334, L720-736).
**Apply to:** `cogs/jinxxy.py` `@tasks.loop(hours=…)` — copy the `start`/`cancel`/
`before_loop wait_until_ready`/`error restart` shape exactly; change only the cadence
(6-12h vs 1min) and the body.

### Pure-function-first testing (SimpleNamespace + asyncio.run, no pytest-asyncio)
**Source:** `tests/test_reminders_cog.py` (L1-42), `tests/test_reviews_publish.py`
`FakeGitHub` (L52-144).
**Apply to:** all three new test files. Merge/mapping logic (D-12) and API mapping are
ideal pure-function territory (CONTEXT L106).

---

## No Analog Found

None. Every file has a strong in-repo analog. The three *new mechanics* (Jinxxy client,
object-aware store transport, three-way merge) are new **code** but each follows an existing
**pattern** (HTTP client idiom, reviews transport, reminders pure-helpers), so there is no
file the planner must build from RESEARCH abstractions alone.

**Genuinely-new design surface** (patterned but not copy-paste — budget explicit tasks):
| Concern | Why new | Pattern to follow |
|---------|---------|-------------------|
| Object-aware `store.json` fetch/serialize | gallery/reviews are arrays; store is an object with `_comment` | github_publish reviews transport + Pattern 2 guard |
| Three-way ownership merge (D-12) | no prior snapshot-merge in the repo | reminders pure-helper + classifier shape |
| Discord image/description attach flow (D-15) | no store-side staff-input flow exists | reviews `ReviewModal` OR gallery photo pipeline |

---

## Metadata

**Analog search scope (bot repo):** `bot.py`, `config.py`, `core/*.py` (`github_publish.py`,
`db.py`), `cogs/*.py` (`reminders.py`, `reviews.py`, `gallery.py`, `help.py`), `tests/*.py`
(`test_reviews_publish.py`, `test_reminders_cog.py`). **Website repo:** `src/data/store.json`.
**Files scanned:** 12 read in full/part; 8032-line repo inventory reviewed for sizing.
**Pattern extraction date:** 2026-07-10
</content>
</invoke>
