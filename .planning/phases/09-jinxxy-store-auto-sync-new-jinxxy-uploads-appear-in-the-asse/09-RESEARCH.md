# Phase 9: Jinxxy Store Auto-Sync - Research

**Researched:** 2026-07-10
**Domain:** Discord bot cog (Python / discord.py) + third-party REST API integration (Jinxxy Creator API) + cross-repo JSON commit
**Confidence:** HIGH on the API contract and bot patterns; the feasibility verdict is HIGH-confidence on the *documented* contract, MEDIUM on the *live* response (one authenticated probe closes the gap).

## Summary

The Jinxxy Creator API is real, current, and well-documented: a REST API at `https://api.creators.jinxxy.com/v1` (OpenAPI 3.1, spec version **1.2.2**), authenticated with an `x-api-key` header, rate-limited to **120 requests/minute**, with `GET /products` (paginated list) and `GET /products/{id}` (detail) endpoints. So "can the API enumerate the storefront?" is **yes**. [VERIFIED: api.creators.jinxxy.com/v1/openapi.json]

**But the feasibility gate (D-04) is NOT cleanly cleared.** The documented product schema exposes name, price, listing URL, category, tags, visibility, and created/updated dates — but it does **NOT** expose two fields the store card fundamentally needs: **product images** and **product descriptions**. The only `image` fields in the entire spec are `profile_image` (the creator's avatar); the only `description` fields are on license activations. A brand-new Jinxxy upload synced by the bot would therefore produce a store card with **no thumbnail and no description** — visually broken and useless for the conversion path. This is precisely the scenario D-04 anticipates ("API or nothing — if the API can't list products with the needed fields, pause"). See **`## Feasibility Gate`** below — this section is the load-bearing output of this research and should be resolved with the user *before* the planner writes tasks.

**Primary recommendation:** Before planning proceeds, the user runs **one authenticated probe** (`GET /products/{id}` with their real API key) to confirm whether the *live* response includes undocumented `images`/`description` fields the spec omits. If it does, the full mirror (D-11/D-12) is buildable as designed. If it does not, the phase must be re-scoped to a **reduced sync** (name, price, checkoutUrl, category, date, add/remove — images & descriptions stay staff-owned) or paused per strict D-04. The bot-side transport/scheduler/state patterns are all proven and reusable regardless of which path is chosen.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Sync lives as a **bot cog in `nocturna-bot`** (JinxxyCog alongside gallery/reviews) — reuses the cross-repo commit transport (`core/github_publish.py`), the SQLite state idiom (`core/db.py`), and the Phase-8 scheduler precedent.
- **D-02:** Trigger = **scheduled poll + manual command** (background loop + staff `/sync`).
- **D-03:** Poll interval: **a few times a day (every 6–12h)**. Manual command covers "I want it now". Keeps Jinxxy requests and Pages rebuilds sparse.
- **D-04:** Data source is the **Jinxxy Creator API only — no scraping fallback**. If the API can't list products, pause the phase and reconsider with the user ("API or nothing").
- **D-05:** Bot **only announces store updates** (added/updated/removed). **Errors are never posted to Discord** — logs only.
- **D-06:** Syncs with no changes are silent. Announcement channel configurable via env var (`JINXXY_ANNOUNCE_CHANNEL_ID`). Embed format is Claude's discretion (branded, Spanish-first).
- **D-07:** **Direct publish — no staff approval gate.** Uploading to Jinxxy IS the approval.
- **D-08:** `nsfw` maps from **Jinxxy's mature-content flag** (research must confirm the API exposes it). Staff can hand-correct afterwards.
- **D-09:** `editor` and `category` mapping is **Claude's discretion** — derive from API where possible, else sensible defaults.
- **D-10:** Jinxxy listing name/description copied **verbatim into BOTH `es` and `en`** — no machine translation. Staff polish by hand; ownership model protects those edits.
- **D-11:** **Full mirror**: add new, update price/image changes, remove delisted products.
- **D-12:** **Field ownership + snapshot merge**: sync only writes fields it owns and only when the Jinxxy value changed vs. the last-synced snapshot (SQLite). Name/description become staff-owned once edited (three-way compare vs snapshot). `license`, `details`, `updates`, `storefronts`, `featured` are **100% staff-owned — never touched**.
- **D-13:** **First run imports the entire storefront**, linking products already present in `store.json` (match by `checkoutUrl`) so nothing duplicates and hand-edits survive.

### Claude's Discretion
- `editor`/`category` field mapping and defaults (D-09).
- Exact poll interval within 6–12h; `/sync` command name/registration style (follow repo's Spanish app-command conventions).
- Announcement embed design and copy (D-06).
- Exact ownership boundary per field and snapshot/merge implementation (within D-12's guarantees), including how "staff edited this field" is detected/stored.
- API-key/env configuration names (`JINXXY_API_KEY` etc.) following `config.py` patterns; commit message format for sync commits.
- Rate-limit/backoff handling for the Creator API.

### Deferred Ideas (OUT OF SCOPE)
- Machine translation of listings (DeepL/LLM) — rejected in favor of verbatim copy + hand-polish (D-10).
- Jinxxy sales/webhook notifications (sales pings, accounting) — separate from catalog sync.
- Public "new product" marketing embeds vs staff-only reports — left open via the channel env var; a richer format could be a later polish task.
- Scraping fallbacks; translation services; any store UI/component change (Phase 6 shipped them, schema is locked).
</user_constraints>

<phase_requirements>
## Phase Requirements

No REQUIREMENTS.md IDs were mapped to this phase in the ROADMAP (the phase description states "Requirements: TBD" / "none mapped"). The closest existing requirements are the **v2** items this phase would satisfy:

| ID (v2) | Description | Research Support |
|---------|-------------|------------------|
| STORE2-03 | Creator API price/product sync between Jinxxy and `store.json` (manual sync in v1) | This phase is the promotion of STORE2-03 from v2 → active. The Creator API `GET /products` + `GET /products/{id}` support price/URL/name/date/category sync; images & descriptions are **not** API-available (see Feasibility Gate). |
| STORE2-02 | Discord bot × Jinxxy integration (Creator API/webhooks) | Partially satisfied: this phase adds the Creator-API read path. Sales pings/accounting remain deferred (D of CONTEXT). |

**Planner action:** if the feasibility gate resolves "go", add a phase requirement (e.g. `STORE-SYNC-01`) to REQUIREMENTS.md so the sync has a traceable acceptance criterion. The wording must reflect the *actual* achievable scope after the gate (full mirror vs reduced sync).
</phase_requirements>

## Feasibility Gate (D-04) — LOAD-BEARING

> This is the single most important output of this research. Read it before planning.

### ✅ GATE RESOLVED (2026-07-10) — live probe executed during plan-phase

The recommended authenticated probe was run against the real NocturnaAssets store (API key with `products_read` scope; test product `3938443562705749387` "Cahuama"). Results override the spec-based rows below where they conflict:

- **CONFIRMED ABSENT:** `images` and `description` do not exist in the live `GET /products/{id}` response. Guessed sub-endpoints (`/products/{id}/images`, `/media`, `/files`, `/description`) all return 404. The spec-based gap is real.
- **CONFIRMED PRESENT — D-08 resolved:** `restrictions: ["CONTENT_MATURE"]` — the mature flag exists. Map `nsfw = "CONTENT_MATURE" in restrictions`.
- **`visibility` enum observed:** `"PUBLISHED"` on a live listing — drives D-11 add/remove.
- **⚠ URL CORRECTION:** the live `url` field is a **slug** (`"cahuama"`), not a full URL. The public listing lives at `https://jinxxy.com/{store_username}/{slug}` (verified 200; `/{store_username}/products/{slug}` is 404). `checkoutUrl` must be **constructed** from the `/me` username + slug, and D-13 first-run matching must compare against that constructed form.
- **Other live fields:** `base_price: 0` + `currency_code: "USD"`, `category: "avatar-props"`, `tags: ["vrchat"]`, `type[]`, `gender`, `platforms[]`, `versions[]`, `created_at`/`updated_at`. List endpoint pagination (`results`/`page`/`cursor_count`/`page_count`) works as documented.

**USER DECISION (resolves the gate): Reduced sync + Discord attach.**
1. The bot mirrors every API-available field (name, price, checkoutUrl, category, nsfw, date, add/remove by visibility/presence).
2. `images` and `description` are **staff-supplied through Discord**: when a new product syncs, the announcement embed prompts staff to attach product images and description via the bot (reply/command flow — design at planner's discretion, consistent with existing cog conventions); the bot writes them into `store.json` through the same cross-repo transport. Until supplied, the card uses a branded placeholder image and empty/placeholder description.
3. These two fields remain 100% staff-owned per D-12 — the sync never overwrites them.

**Deploy-time value from the user:** `JINXXY_ANNOUNCE_CHANNEL_ID=1525202600738295818` (store-update announcements channel).

### Original verdict (pre-probe): CONDITIONAL BLOCK

The Creator API **can enumerate the storefront** and provides *most* required fields, but the **documented contract omits product images and product descriptions** — two fields the store card and quick-view cannot render without. Under strict D-04 ("API or nothing"), a missing image + missing description for every new product is a gate failure. The gate resolves one of three ways depending on a single authenticated probe (see recommendation).

### What the API DOES provide (verified against OpenAPI 1.2.2)

`GET /products` (list) returns a **minimal** shape per product: `object`, `id`, `name`, `versions[{id,name}]`, plus pagination (`page`, `cursor_count`, `page_count`, `results`). Query params: `page`, `limit`, `search_query`, `sort_field` (`created_at`|`updated_at`), `sort_order` (`asc`|`desc`). [VERIFIED: openapi.json GET /products]

`GET /products/{id}` (detail) returns the rich record. Every `required` field in the schema: [VERIFIED: openapi.json GET /products/{id}]

| store.json field | Jinxxy API source | Available? | Notes |
|------------------|-------------------|-----------|-------|
| `name{es,en}` | `name` (string) | ✅ | Copy verbatim into both locales (D-10). |
| `price` | `base_price` (number) + `currency_code` + `versions[].price` + `pwyw_pricing` (bool) | ✅ | Map `base_price` → `str(base_price)`. `pwyw_pricing:true` = pay-what-you-want (base_price is the minimum). Store adds "$ … USD" — confirm `currency_code == "USD"`. |
| `checkoutUrl` | `url` (string) | ✅ | The public listing URL. **Also the link key for D-13 matching.** |
| `category` | `category` (nullable) + `type[]` + `tags[]` + `platforms[]` + `gender` | ✅ (nullable) | Discretion (D-09). Fall back to a default when null. |
| `date` | `created_at` (date-time) | ✅ | Truncate to `YYYY-MM-DD`. `updated_at` also available for change-detection. |
| (mirror add/remove) | `visibility` (string) | ✅ | Undocumented enum (likely `public`/`hidden`/`draft`). Drives D-11 add/remove decisions. |
| `editor` | — (not on product; `/me` gives the authenticated creator) | ⚠️ | Discretion (D-09): default to the store owner's name from `/me`, staff-editable. |
| `nsfw` | `restrictions` (array of strings, nullable) | ⚠️ **UNCONFIRMED** | No explicit `mature`/`nsfw`/`adult` field exists in the spec. `restrictions[]` *may* carry an age/content marker but its enum is undocumented. Default `false`, keep staff-owned (D-08). |
| `description{es,en}` | — **ABSENT** | ❌ | No product `description` in the schema. The only `description` fields are on license activations. |
| `images[]` | — **ABSENT** | ❌ | No `images`/`media`/`thumbnail`/`cover`/`preview` field. The only image field is `profile_image` (creator avatar). |
| `featured`, `license`, `details`, `updates`, `storefronts` | — N/A | — | 100% staff-owned by design (D-12). No API source needed. |

### Why the two gaps are show-stoppers for the stated goal

The phase goal is "**new Jinxxy uploads appear in the asset store automatically**" and CONTEXT's north star is "staff never edit JSON for anything Jinxxy already knows." But:
- `store.json`'s own `_comment` schema states **`images[0]` is the card thumbnail** — a product with no images renders a broken/empty card.
- The `ProductCard` shows the description; an empty description weakens the conversion path.
- Jinxxy's API does **not** "know" images or descriptions in a machine-readable form — they live only on the rendered listing page, and extracting them = scraping, which D-04 forbids.

So a fully-automatic new upload would surface a card that **still requires staff to paste images and write a description** before it's usable — which is most of the manual toil the phase set out to eliminate.

### Recommendation (resolve before planning)

1. **Run one authenticated probe.** OpenAPI specs are frequently hand-maintained and lag the live API. The user (who has dashboard access) issues a single call with their real key and inspects the raw JSON:
   ```bash
   curl -s -H "x-api-key: $JINXXY_API_KEY" \
     "https://api.creators.jinxxy.com/v1/products?limit=1"
   # then, using an id from the list:
   curl -s -H "x-api-key: $JINXXY_API_KEY" \
     "https://api.creators.jinxxy.com/v1/products/{id}"
   ```
   Look specifically for any `images`/`media`/`thumbnail`/`preview` and `description` keys not in the spec, and inspect the actual `restrictions[]` and `visibility` values (this also resolves D-08's mature-flag question).
2. **If the probe shows images + description are present** → the full mirror (D-11/D-12) is buildable exactly as CONTEXT designed. Proceed.
3. **If the probe confirms they are absent** → the phase does **not** meet D-04's "API or nothing" bar for a *complete* mirror. Two honest options for the user:
   - **Re-scope to a reduced sync:** the bot owns name, price, checkoutUrl, category, date, and add/remove-by-visibility; **images and descriptions stay 100% staff-owned** (a new product appears as a stub the API keeps priced/linked/named, and staff add the two visual fields once). This still automates new-product detection, price propagation, and delisting — a real reduction in toil, just not the full "zero-touch" vision.
   - **Pause the phase** per strict D-04 and revisit when/if Jinxxy adds media/description to the API.

This decision belongs to the user (it changes the phase's success criteria), so surface it via `/gsd:discuss-phase` or a checkpoint rather than letting the planner assume.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Poll Jinxxy on a schedule | Bot (discord.py `tasks.loop`) | — | Only a long-running process can poll; the static site cannot. Mirrors Phase-8 scheduler. |
| Manual `/sync` trigger | Bot (app command) | — | Staff-facing Discord command, staff-role-gated like gallery/reviews. |
| Call the Creator API | Bot (HTTP client) | — | API key is a secret; must live server-side in the bot host `.env`, never in the repo/site. |
| Field-ownership merge + snapshot | Bot (pure functions + SQLite) | — | Business logic; unit-testable pure helpers per the repo idiom. State in `core/db.py`. |
| Commit `store.json` cross-repo | Bot (`core/github_publish.py`) | GitHub API | Reuse the proven blob→tree→commit→ref transport; extend, don't fork. |
| Render the store from `store.json` | Static site (Astro build) | GitHub Pages | Already shipped in Phase 6 — **zero** website-side work this phase. |
| Announce updates | Bot (Discord embed) | — | Store-news only (D-05); channel via env var (D-06). |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `discord.py[voice]` | 2.7.1 (already pinned) | Cog framework, app commands, `tasks.loop` scheduler | The repo's bot framework; Phase 8 established the `@tasks.loop` precedent. [VERIFIED: requirements.txt] |
| `aiohttp` | >=3.9.0 (already present) | Async HTTP client for the Creator API | Already a dependency (pulled by discord.py); native async fits the event loop. [VERIFIED: requirements.txt] |
| `requests` | >=2.31.0 (already present) | Sync HTTP (used by `github_publish` via `asyncio.to_thread`) | Already the transport's HTTP client; the Jinxxy client can follow the same sync-in-a-thread idiom if preferred for testability. [VERIFIED: requirements.txt] |
| `sqlite3` | stdlib | Snapshot/state table (D-12) | The repo's state idiom (`core/db.py` `init_*` + `CREATE TABLE IF NOT EXISTS`). [VERIFIED: core/db.py] |
| `pytest` | >=8.0.0 (already present) | Unit tests for pure merge/mapping helpers | Repo test idiom. [VERIFIED: requirements.txt] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `python-dotenv` | >=1.0.0 (present) | `JINXXY_API_KEY` / `JINXXY_ANNOUNCE_CHANNEL_ID` from `.env` | Config load in `config.py`. [VERIFIED: requirements.txt] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `aiohttp` (async) | `requests` in `asyncio.to_thread` | Both already present. `requests`+`to_thread` matches `github_publish.py` exactly and keeps the client synchronous/pure for unit tests; `aiohttp` is more idiomatic for polling. Discretion — recommend `requests` for consistency with the existing transport and testability. |

**Installation:** **No new packages required.** Every dependency (discord.py, aiohttp, requests, sqlite3, pytest, dotenv, tzdata) is already in `requirements.txt`. Adding a JinxxyCog is pure new *code*, not new deps.

## Package Legitimacy Audit

**No external packages are installed by this phase.** The JinxxyCog is built entirely from the bot's existing pinned dependencies (`discord.py`, `aiohttp`, `requests`, `python-dotenv`, `pytest`, stdlib `sqlite3`/`zoneinfo`). slopcheck / registry verification is therefore N/A — there is no new install surface.

**Packages removed due to slopcheck [SLOP] verdict:** none (no installs).
**Packages flagged as suspicious [SUS]:** none (no installs).

## Architecture Patterns

### System Architecture Diagram

```
                          nocturna-bot process (host "cinema", systemd)
   ┌──────────────────────────────────────────────────────────────────────────┐
   │                                                                            │
   │   @tasks.loop(hours=6–12)  ──┐                                             │
   │   /sync  (staff-gated)  ─────┤──▶  _run_sync(now)                          │
   │                              │        │                                    │
   │                              │        ▼                                    │
   │                              │   Jinxxy client (x-api-key)                 │
   │                              │   GET /products (paginate page/limit)       │
   │                              │   GET /products/{id} for each  ─────────────┼──▶ api.creators.jinxxy.com/v1
   │                              │        │  (120 req/min budget)              │
   │                              │        ▼                                    │
   │                              │   map_product() → desired store entries     │
   │                              │        │                                    │
   │                              │        ▼                                    │
   │                              │   merge(snapshot, live_jinxxy, current_json)│  ◀── read store.json (GitHub Contents API)
   │                              │   3-way field-ownership diff (D-12)         │
   │                              │        │                                    │
   │                    ┌─────────┴────────┴─── changed? ── no ──▶ silent (D-06)│
   │                    │                       │                               │
   │                    ▼                       ▼ yes                           │
   │            update SQLite            github_publish.publish_store(products) ─┼──▶ Shangrii/Nocturna-Avatars
   │            snapshot table           (blob→tree→commit→ref, retry)          │      branch: revamp, src/data/store.json
   │                                            │                               │
   │                                            ▼                               │
   │                                    announce embed (added/updated/removed)  ─┼──▶ #store-updates (JINXXY_ANNOUNCE_CHANNEL_ID)
   │   errors ──▶ logs ONLY (D-05, never Discord)                               │
   └──────────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼  (push to revamp)
                              .github/workflows/deploy.yml → gh-pages → Pages rebuild → live site
```

Each sync that changes anything = **one commit = one Pages rebuild** (deploy.yml runs on push to `revamp`). This is exactly why D-03 mandates a sparse 6–12h interval. [VERIFIED: .github/workflows/deploy.yml on:push branches:[revamp]]

### Recommended Structure (bot repo)
```
nocturna-bot/
├── core/
│   ├── jinxxy_api.py     # NEW: thin Creator API client (list_products, get_product) — pure, stdlib+requests only
│   ├── store_sync.py     # NEW: pure merge/mapping helpers (map_product, three_way_merge, diff_summary)
│   ├── github_publish.py # EXTEND: add publish_store() / _fetch_store() (object-aware, preserves _comment)
│   └── db.py             # EXTEND: init_store_state() + snapshot getters/setters
├── cogs/
│   └── jinxxy.py         # NEW: JinxxyCog — @tasks.loop + /sync command + announce embed
├── config.py             # EXTEND: JINXXY_API_KEY, JINXXY_ANNOUNCE_CHANNEL_ID, poll interval, WEBSITE_STORE_JSON
├── bot.py                # EXTEND: load_extension("cogs.jinxxy") + fail-fast env validation
└── tests/                # NEW: test_store_sync.py, test_jinxxy_api.py (pure helpers, SimpleNamespace)
```

### Pattern 1: Background scheduler loop (from Phase 8)
**What:** A `@tasks.loop` whose body delegates to a plain, unit-testable coroutine; started in `__init__`, cancelled in `cog_unload`, gated on `wait_until_ready`, self-restarting on error.
**When to use:** the D-02/D-03 poll loop — copy the Phase-8 shape exactly (only the cadence and body change).
**Example:**
```python
# Source: nocturna-bot/cogs/reminders.py (Phase 8, VERIFIED)
class JinxxyCog(commands.GroupCog, name="Jinxxy", group_name="tienda", ...):
    def __init__(self, bot):
        self.bot = bot
        db.init_store_state()
        self._poll.start()
    async def cog_unload(self):
        self._poll.cancel()

    @tasks.loop(hours=6)            # D-03 band 6–12h; discretion
    async def _poll(self):
        await self._run_sync(datetime.now(timezone.utc))

    @_poll.before_loop
    async def _before(self):
        await self.bot.wait_until_ready()   # channels/guild resolve first

    @_poll.error
    async def _on_error(self, exc):
        log.exception("jinxxy: el poll se cayó, reiniciando", exc_info=exc)  # logs only, D-05
        self._poll.restart()
```

### Pattern 2: Extend the cross-repo transport — but store.json is an OBJECT, not an array
**What:** `github_publish.py`'s generic `_fetch_json` **explicitly raises if the body is not a JSON array** (`"expected a JSON array"`). `store.json` is `{ "_comment": "...", "products": [...] }` — an **object**. The gallery/reviews path cannot be reused as-is.
**When to use:** always for this phase — this is a genuine divergence the planner must budget a task for.
**Example:**
```python
# NEW in github_publish.py — object-aware fetch that PRESERVES _comment (WR-style guard)
def _fetch_store(repo, branch, path):
    obj = _fetch_json_object(repo, branch, path)   # variant of _fetch_json that expects a dict
    if not isinstance(obj, dict) or "products" not in obj:
        raise GitHubPublishError("store.json: expected an object with a 'products' key")
    return obj                                       # keep _comment + any future keys intact

def _serialize_store(obj):
    # store.json ships 2-space indent, ensure_ascii=False (matches _serialize_json / site expectation)
    return json.dumps(obj, ensure_ascii=False, indent=2)
```
The build_tree closure writes the **whole object** back (mutating only `products`), so `_comment` and any staff-added top-level keys survive every sync. Reuse `_commit_with_retry` (already generalized with a `fetch=` param in Phase 7) — only the fetch/serialize differ. [VERIFIED: core/github_publish.py `_fetch_json`, `_commit_with_retry(fetch=...)`]

### Pattern 3: Three-way field-ownership merge (D-12)
**What:** For each product and each sync-owned field, compare `snapshot` (last-synced Jinxxy value in SQLite) vs `live` (this sync's Jinxxy value) vs `current` (value in `store.json`).
- If `live == snapshot` → Jinxxy didn't change → **leave `current` alone** (respects staff edits).
- If `live != snapshot` and `current == snapshot` → Jinxxy changed, staff hadn't edited → **write `live`**, update snapshot.
- If `live != snapshot` and `current != snapshot` → both changed (staff edited AND Jinxxy changed) → **staff wins** for staff-editable fields (name/description D-10/D-12); for pure sync-owned fields (price/checkoutUrl/date) Jinxxy wins. Record the decision; snapshot advances to `live`.
- Never-touch fields (`license`, `details`, `updates`, `storefronts`, `featured`) are excluded from the merge entirely.
**When to use:** the heart of the sync — implement as a **pure function** taking three dicts and returning `(merged_entry, changed_fields)` for unit testing.

### Anti-Patterns to Avoid
- **Treating `store.json` as an array** like gallery/reviews — it's an object; blindly reusing `_fetch_json` will raise, and a naive rewrite would **drop the `_comment` schema doc** the staff rely on.
- **Full-file overwrite every poll** — would create a Pages rebuild on every 6–12h tick even with no changes. Must diff first and **only commit when something changed** (D-06 silent-on-no-change), same as reviews' no-op guard.
- **Fetching every product detail on every poll without a budget** — 120 req/min is generous but not infinite; for a large store, paginate and respect `X-RateLimit-Remaining` / back off on 429.
- **Logging the API key** — `JINXXY_API_KEY` must be handled like `GITHUB_PAT`: header-only, never logged, never committed (the repo already has this discipline, T-05-04).
- **Posting errors to Discord** — D-05 is explicit; every failure path goes to `log.exception`, never a channel message.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-repo commit | A new git/HTTP push path | Extend `core/github_publish.py` (`_commit_with_retry`) | Atomic blob→tree→commit→ref with stale-ref retry + typed errors already solved; Phase 7 generalized it. |
| Background scheduling | A manual `asyncio.sleep` loop | `discord.ext.tasks.loop` (Phase-8 pattern) | Handles reconnects, before_loop readiness, error restart, hot-reload cancel. |
| State persistence | A JSON sidecar or in-memory dict | `core/db.py` SQLite `init_store_state()` | Survives restarts; the D-12 snapshot needs durable three-way state; matches `gallery_state`/`reviews_state`. |
| Concurrent-commit safety | Your own locking | The transport's module-level `_commit_lock` + ref-retry | Already serializes read-modify-commit across cogs. |
| Rate-limit handling | Guessing sleep durations | Read `X-RateLimit-Remaining`/`X-RateLimit-Reset` headers; honor 429 | The API documents these headers explicitly. |

**Key insight:** ~90% of this phase is *reuse*. The only genuinely new mechanics are (1) the Jinxxy API client, (2) the object-aware store transport variant, and (3) the three-way merge. Everything else is a copy-with-cadence-change of Phases 5/7/8.

## Runtime State Inventory

> This phase introduces new runtime state (a snapshot) and a first-run import — worth an explicit inventory even though it isn't a rename.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **New** SQLite table (e.g. `store_snapshot`) in the bot's `bot.db` holding the last-synced Jinxxy value per product/field (D-12). Keyed by `checkoutUrl` (the D-13 link key) or Jinxxy product `id`. | Add `init_store_state()` to `core/db.py`; design the snapshot schema. |
| First-run state | `store.json` currently `{"_comment": ..., "products": []}` (empty — emptied in quick task 260709-hm5). D-13 first-run imports the **entire** storefront and links existing entries by `checkoutUrl` (currently none). | First sync writes the full mirror; linking is a no-op today but the code must still match-by-`checkoutUrl` for future re-imports/restarts. |
| Live service config | Jinxxy storefront itself is the source of truth — lives in Jinxxy's dashboard, not git. API key is created in the Jinxxy creator dashboard. | User creates the API key (dashboard) and adds `JINXXY_API_KEY` to the cinema-host `.env` (manual deploy step, not phase scope). |
| OS-registered state | The bot runs under systemd on host "cinema". Adding a cog needs a `git pull` + `systemctl restart` on that host. | Documented manual deploy step (human, out of phase scope) — same as Phases 5/7/8. |
| Secrets/env vars | **New:** `JINXXY_API_KEY` (secret), `JINXXY_ANNOUNCE_CHANNEL_ID`, poll interval, `WEBSITE_STORE_JSON` (default `src/data/store.json`). Existing `GITHUB_PAT`/`WEBSITE_REPO`/`WEBSITE_BRANCH` are reused unchanged. | Add to `config.py` + `.env.example`; fail-fast in `bot.py` on missing `JINXXY_API_KEY`. |
| Build artifacts | None — no compiled artifacts; the website side is pure data. `_comment` key in `store.json` must survive serialization. | Serializer preserves `_comment` (Pattern 2). |

## Common Pitfalls

### Pitfall 1: The transport rejects store.json's object shape
**What goes wrong:** Reusing `_fetch_json` (which enforces "expected a JSON array") on `store.json` raises immediately, or a hand-rolled rewrite silently drops the `_comment` schema doc.
**Why it happens:** gallery.json/reviews.json are top-level arrays; store.json is an object with `_comment` + `products`.
**How to avoid:** Add an object-aware fetch/serialize pair (Pattern 2); write back the whole object mutating only `products`; assert `_comment` survives with a unit test.
**Warning signs:** `GitHubPublishError: expected a JSON array`; a diff that removes `_comment`.

### Pitfall 2: Every poll triggers a Pages rebuild
**What goes wrong:** Committing on every tick (even no-change) burns Actions minutes and needlessly rebuilds the live site every 6–12h.
**Why it happens:** No diff before commit.
**How to avoid:** Compute the merge, compare to current `store.json`; **only commit when `changed_fields` is non-empty** (D-06). Mirror reviews' no-op guard.
**Warning signs:** `store: sync` commits with empty diffs on `revamp`.

### Pitfall 3: Staff edits get clobbered
**What goes wrong:** A sync overwrites a staff-polished ES/EN name/description or a hand-set image.
**Why it happens:** Two-way compare (Jinxxy vs store.json) instead of three-way (vs snapshot) can't tell "Jinxxy changed" from "staff changed".
**How to avoid:** The snapshot is mandatory (D-12). Only write a field when `live != snapshot AND current == snapshot` for staff-editable fields. Unit-test the three merge branches.
**Warning signs:** Staff report their translations reverting after a sync.

### Pitfall 4: Rate-limit / large-store fan-out
**What goes wrong:** `GET /products/{id}` per product × N products can approach the 120 req/min ceiling on a big catalog or a tight retry loop → 429s.
**Why it happens:** List endpoint is minimal, forcing a detail call per product.
**How to avoid:** Paginate the list; fetch details sequentially with a small pace; read `X-RateLimit-Remaining`; on 429 back off until `X-RateLimit-Reset`. At 6–12h cadence for an infrequent-upload store this is comfortable, but code the guard.
**Warning signs:** 429 responses in logs; partial syncs.

### Pitfall 5: Assuming the mature/nsfw flag exists
**What goes wrong:** Mapping `nsfw` from a field that isn't in the API (`restrictions[]` enum is undocumented; no `mature` field).
**Why it happens:** D-08 assumed the API exposes it; the spec doesn't confirm it.
**How to avoid:** Default `nsfw=false`, keep it staff-owned, and only map from `restrictions[]` once the authenticated probe reveals the real values. Note: Jinxxy banned explicit content (Mar 2026, per REQUIREMENTS Out-of-Scope), so mature listings are edge cases and low-stakes.
**Warning signs:** All products syncing as `nsfw:false` when some should blur — acceptable interim; staff hand-correct (D-08).

## Code Examples

### List all products with pagination (client sketch)
```python
# Source: OpenAPI 1.2.2 GET /products (VERIFIED). Sync client mirrors github_publish's requests idiom.
import requests
BASE = "https://api.creators.jinxxy.com/v1"

def list_all_products(api_key: str) -> list[dict]:
    headers = {"x-api-key": api_key}
    out, page = [], 1
    while True:
        r = requests.get(f"{BASE}/products",
                         headers=headers,
                         params={"page": page, "limit": 100,
                                 "sort_field": "created_at", "sort_order": "desc"},
                         timeout=30)
        r.raise_for_status()                 # 429 handling / backoff wraps this
        body = r.json()
        out.extend(body["results"])          # results: [{id, name, versions, ...}]
        if page >= body["page_count"]:
            break
        page += 1
    return out                               # then GET /products/{id} for rich fields
```

### Map a Jinxxy product detail → store.json entry (only API-available fields)
```python
# Source: OpenAPI 1.2.2 GET /products/{id} (VERIFIED). Pure function → unit-testable.
def map_product(detail: dict, owner_name: str) -> dict:
    name = detail["name"]
    price = str(detail["base_price"])               # store adds "$ … USD"
    return {
        # id/checkoutUrl are the D-13 link key:
        "checkoutUrl": detail["url"],
        "name": {"es": name, "en": name},           # verbatim into both (D-10)
        "price": price,
        "category": detail.get("category") or "assets",   # discretion (D-09)
        "editor": owner_name,                        # from /me; staff-editable (D-09)
        "nsfw": False,                               # staff-owned; API has no confirmed flag (D-08)
        "date": detail["created_at"][:10],           # YYYY-MM-DD
        # images{}, description{} are NOT available from the API — see Feasibility Gate.
        # featured/license/details/updates/storefronts are never set by sync (D-12).
    }
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual `store.json` edits per Jinxxy upload | Creator API read + cross-repo commit | This phase | Automates name/price/URL/date/add-remove; images/descriptions gap TBD by gate. |
| Creator API "reworked to fix performance" | v1.2.2 OpenAPI at `/v1/docs` (Scalar renderer) | Per Jinxxy changelog (2026) | The `/v1/` base + `x-api-key` + 120 req/min is the current contract; earlier docs URLs (`/docs` without `/v1`) redirect. |

**Deprecated/outdated:**
- The help-center article still links `https://api.creators.jinxxy.com/docs` (no `/v1`); the live, versioned docs are at `https://api.creators.jinxxy.com/v1/docs` serving `openapi.json` v1.2.2. Use the `/v1` base.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Product `images` and `description` are truly absent from the *live* API (spec-based; not probed with a key) | Feasibility Gate | HIGH — flips the phase between "full mirror" and "reduced sync / pause". The recommended authenticated probe resolves it. |
| A2 | `restrictions[]` / `visibility` enums (undocumented) — `visibility` distinguishes public vs hidden/draft for add/remove; `restrictions[]` may carry a mature marker | Feasibility Gate, Pitfall 5 | MEDIUM — affects D-08 nsfw mapping and D-11 removal logic. Probe reveals real values. |
| A3 | `currency_code` is `USD` for this store (site hard-codes "$ … USD") | Standard Stack / mapping | LOW-MEDIUM — a non-USD store would mislabel prices. Verify in the probe. |
| A4 | `base_price` is the correct "price" to show (vs a `versions[].price`) | Feasibility Gate | LOW — for multi-version products the base price is the standard headline; staff can override. |
| A5 | `requests`-in-`to_thread` is the preferred client style (vs `aiohttp`) | Standard Stack | LOW — both work; consistency/testability argument only. |
| A6 | Each sync commit to `revamp` triggers exactly one Pages rebuild | Architecture / Pitfall 2 | LOW — verified from deploy.yml `on:push branches:[revamp]`. |

## Open Questions

1. **Does the live API return undocumented images/description?** (A1)
   - What we know: OpenAPI 1.2.2 omits both; only `profile_image` and license `description` exist.
   - What's unclear: whether the runtime response carries fields the hand-maintained spec dropped.
   - Recommendation: authenticated probe (see Feasibility Gate) before planning — this is the gate.
2. **What does `restrictions[]` contain, and does `visibility` gate storefront membership?** (A2)
   - What we know: both fields exist; enums undocumented.
   - Recommendation: capture real values in the same probe; use `visibility` for D-11 add/remove; map `nsfw` from `restrictions[]` only if a clear marker appears.
3. **`editor` mapping:** `/me` gives the store owner, but individual products have no per-product seller/creator field. If Nocturna credits *different* editors per asset, the API can't distinguish them.
   - Recommendation (D-09 discretion): default `editor` to the store owner from `/me`; leave it staff-editable. Acceptable since `editor` is display-only.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Jinxxy Creator API | The entire sync | ✓ (reachable, documented) | v1.2.2 | none — D-04 forbids scraping |
| `JINXXY_API_KEY` | Auth | ✗ (must be created in Jinxxy dashboard by user) | — | none — hard blocker until provisioned |
| `GITHUB_PAT` (cross-repo) | store.json commit | ✓ (live in cinema `.env` since Phase 5) | fine-grained, Contents RW | none needed |
| discord.py / aiohttp / requests / sqlite3 / pytest | Cog, client, state, tests | ✓ | pinned in requirements.txt | none needed |
| Host "cinema" systemd + `git pull` | Deploy the new cog | ✓ (existing bot host) | — | manual deploy step |

**Missing dependencies with no fallback:**
- `JINXXY_API_KEY` — the user must create it in the Jinxxy creator dashboard (`https://dashboard.jinxxy.com/api-keys`) with at least `products_read` scope, and add it to the cinema-host `.env`. Nothing works until this exists. (Also the enabler for the feasibility probe.)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `x-api-key` header to Jinxxy; `GITHUB_PAT` to GitHub. Secrets from `.env` only. |
| V3 Session Management | no | Stateless API calls; no sessions. |
| V4 Access Control | yes | `/sync` command staff-role-gated (`JINXXY_STAFF_ROLE_IDS` falling back to `GALLERY_STAFF_ROLE_IDS`), mirroring gallery/reviews `_is_staff`. |
| V5 Input Validation | yes | Treat API responses as untrusted: validate types, tolerate missing/nullable fields (`category`, `restrictions`), reject non-object store.json (WR-style guard). Preserve `_comment`. |
| V6 Cryptography | no | No crypto to implement; TLS via HTTPS to both APIs (never hand-roll). |

### Known Threat Patterns for a bot × third-party-API × cross-repo-commit stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key leaked in logs/commits | Information Disclosure | Header-only, never logged, never committed — same discipline as `GITHUB_PAT` (T-05-04). Add to `.gitignore`d `.env`; fail-fast if missing. |
| Malicious/malformed API response injected into store.json → XSS on site | Tampering / (downstream) | Site already auto-escapes (Astro, T-07-01). Still validate/normalize fields before commit; never write raw HTML. `checkoutUrl`/`storefronts` are `https://`-only per the store schema — enforce the scheme on `url` before writing `checkoutUrl`. |
| Non-staff triggering `/sync` | Elevation of Privilege | Staff-role gate on the command (and its autocomplete if any), returning silently for non-staff — the Phase-8 CR-01 lesson. |
| Sync mass-removing the storefront on a transient API outage | Denial of Service (of content) | Never treat an API error/empty page as "storefront is empty" → never mass-remove. Only remove a product when the API *successfully* reports it absent/hidden (mirror the gallery orphan-reconcile "remove only on definitive NotFound" rule, T-05/T-07). |
| 429 abuse / runaway retries | DoS (self-inflicted) | Honor `X-RateLimit-*` headers + 429 backoff; sparse 6–12h cadence. |

## Sources

### Primary (HIGH confidence)
- `https://api.creators.jinxxy.com/v1/openapi.json` — OpenAPI 3.1 spec **v1.2.2** (fetched, parsed): paths, `GET /products` + `GET /products/{id}` schemas, `x-api-key` security scheme, 120 req/min rate-limit, `X-RateLimit-*` headers. **The authoritative contract.**
- `https://api.creators.jinxxy.com/v1/docs` — Scalar renderer confirming the live docs point at the same `openapi.json` (v1.2.2).
- `https://support.jinxxy.com/hc/en-us/articles/28052364650637-How-can-I-access-the-Creator-API` — API intro (Products/Customers/Discount codes/Licenses/Orders + realtime webhooks; key from dashboard). Fetched with a browser UA (Zendesk 403s plain fetches).
- `nocturna-bot/core/github_publish.py`, `core/db.py`, `config.py`, `bot.py`, `cogs/reminders.py`, `cogs/gallery.py`, `requirements.txt` — reuse patterns (transport, state, scheduler, staff gate).
- `Website/src/data/store.json` (`_comment` schema) + `.github/workflows/deploy.yml` — data contract + rebuild trigger.

### Secondary (MEDIUM confidence)
- WebSearch (Jinxxy Creator API) — corroborated the `/v1` base, `x-api-key`, scopes (`products_read`, `orders_read`, `licenses_write`), and the "reworked API" changelog note.

### Tertiary (LOW confidence)
- `https://dlthub.com/context/source/jinxxy-creators-api` — confirmed the API exists as a data source; did not add field-level detail.

## Metadata

**Confidence breakdown:**
- API contract / endpoints / auth / rate limits: HIGH — parsed directly from the live OpenAPI 1.2.2 spec.
- Feasibility verdict (images/description absent): HIGH on the documented contract, MEDIUM on live behavior — one authenticated probe converts it to HIGH.
- Bot reuse patterns (transport/state/scheduler/gate): HIGH — read from the actual repo.
- `restrictions`/`visibility`/`nsfw` mapping: LOW-MEDIUM — undocumented enums, needs the probe.

**Research date:** 2026-07-10
**Valid until:** ~2026-08-10 for the bot patterns (stable); ~2026-07-24 for the Jinxxy API (actively "reworked" per changelog — re-check the spec version before implementing).
