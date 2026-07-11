---
phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse
reviewed: 2026-07-11T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - ../nocturna-bot/.env.example
  - ../nocturna-bot/JINXXY_DEPLOY.md
  - ../nocturna-bot/bot.py
  - ../nocturna-bot/cogs/jinxxy.py
  - ../nocturna-bot/config.py
  - ../nocturna-bot/core/db.py
  - ../nocturna-bot/core/github_publish.py
  - ../nocturna-bot/core/jinxxy_api.py
  - ../nocturna-bot/core/store_sync.py
  - ../nocturna-bot/tests/test_jinxxy_api.py
  - ../nocturna-bot/tests/test_jinxxy_cog.py
  - ../nocturna-bot/tests/test_store_publish.py
  - ../nocturna-bot/tests/test_store_sync.py
findings:
  critical: 2
  warning: 9
  info: 9
  total: 20
status: issues_found
---

# Phase 09: Code Review Report

**Reviewed:** 2026-07-11T00:00:00Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Phase 09 adds the Jinxxy Creator API read client (`jinxxy_api.py`), the pure three-way merge core (`store_sync.py`), the object-aware `store.json` transport (`github_publish.py` additions), the `JinxxyCog` (background poll + `/tienda sync` + `/tienda medios`), the `store_snapshot` table (`db.py`), config/env wiring, and deploy notes. The secret-handling discipline is genuinely good (header-only keys, class-name-only error interpolation, explicit timeouts, removal-safety ordering), and the pure core is well tested.

However, the orchestration layer has real defects. The most serious: **the startup reconcile runs twice concurrently on every boot** (the `on_ready` listener AND the poll loop's immediate first tick both call `_run_sync`), which will double-announce the entire storefront import on first deploy; and **the 429 backoff will `time.sleep()` for an unbounded, server-controlled duration** — an epoch-valued `X-RateLimit-Reset` header freezes the sync thread for decades. Several merge/ownership edge cases (stale snapshot after a no-change reconcile, deleted-current entries emitting `{}` garbage, unkeyable staff entries silently dropped) violate the D-12/D-15 "staff work is never lost" contract the phase is built around.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Startup sync runs twice concurrently — duplicate public announce on every restart with changes

**File:** `../nocturna-bot/cogs/jinxxy.py:117-146, 216-224`
**Issue:** `__init__` starts `self._poll` (line 121), whose `before_loop` waits for `wait_until_ready()` and then — per `discord.ext.tasks` semantics — **runs the first iteration immediately**. The `on_ready` listener (lines 129-146) fires at the same moment and also calls `_run_sync()`. Result: two full syncs execute concurrently on every boot. Both read the (same, pre-upsert) DB snapshot and the same `store.json`, so both compute `changed=True` whenever there is anything to import — deterministically true on the very first deploy (whole-storefront import, D-13). The `_commit_lock` + `sync_store`'s defensive no-op prevent a double *commit*, but `_announce` keys off the reconcile result (`result["changed"]`), not the commit result, so **the announce channel receives the "Tienda actualizada" embed twice**. The two interleaved `_run_sync` coroutines also double every Jinxxy API call and race the snapshot upserts, violating the module's own "exactly one sync code path" doc.
**Fix:** Delete the `on_ready` reconcile (and `_synced_once`) — the poll's immediate first tick after `wait_until_ready()` *is* the startup reconcile:
```python
# cogs/jinxxy.py — remove the on_ready listener entirely; the poll's first
# iteration (which tasks.loop runs immediately after before_loop) already
# performs the startup reconcile. If on_ready must stay, guard _run_sync
# with an asyncio.Lock and skip the poll's first tick instead.
```
Alternatively keep `on_ready` and construct the loop with a skipped first iteration, but do not keep both entry points live.

### CR-02: Unbounded, server-controlled sleep in 429 backoff — one rate-limit response can freeze the sync forever

**File:** `../nocturna-bot/core/jinxxy_api.py:94-106, 119-127`
**Issue:** `_retry_delay` returns `max(0.0, float(hint))` where `hint` comes from `Retry-After` **or `X-RateLimit-Reset`**, and `_get` passes that straight to `time.sleep(delay)`. `Retry-After` is a delta, but `X-RateLimit-Reset` is conventionally a **unix epoch timestamp** — `float("1786000000")` means `time.sleep()` for ~56 years. There is no cap of any kind: a single 429 carrying that header (or a malicious/misbehaving proxy setting an arbitrary huge value) permanently hangs the thread running the request. In the poll path that thread is awaited by `asyncio.to_thread`, so the poll task never completes and never re-fires; in `/tienda sync` the deferred interaction hangs forever. The docstring's "bounded exponential backoff" claim only holds for the fallback branch — the server-hint branch is unbounded input driving a sleep (untrusted input → denial of service of the whole feature until process restart). No test covers a large hint value.
**Fix:**
```python
_MAX_BACKOFF = 60.0  # seconds — never trust a server hint beyond this

def _retry_delay(resp, attempt):
    hint = resp.headers.get("Retry-After")
    if hint is not None:
        try:
            return min(_MAX_BACKOFF, max(0.0, float(hint)))
        except (TypeError, ValueError):
            pass
    reset = resp.headers.get("X-RateLimit-Reset")
    if reset is not None:
        try:
            # epoch semantics: convert to a delta, then clamp
            return min(_MAX_BACKOFF, max(0.0, float(reset) - time.time()))
        except (TypeError, ValueError):
            pass
    return min(_MAX_BACKOFF, _BACKOFF_BASE * (2 ** attempt))
```

## Warnings

### WR-01: `sync_store` writes a stale products array computed outside the commit lock — can silently wipe a concurrent `/tienda medios` attach

**File:** `../nocturna-bot/core/github_publish.py:593-601` (and `../nocturna-bot/cogs/jinxxy.py:180-197`)
**Issue:** `_run_sync` reads `store.json` (step 3, **outside** `_commit_lock`), merges, then calls `sync_store(result["products"])`. Inside `_sync_store_sync`, `build_tree(cur)` receives the *freshly fetched* store on every attempt — the whole point of `_commit_with_retry`'s re-fetch contract ("merged rather than clobbered") — but then **ignores `cur["products"]` entirely** and writes the pre-computed `new_products` list. A full sync takes seconds-to-minutes (one `get_product` call per product); if staff run `/tienda medios` in that window, the medios commit lands first (lock), and the sync commit then rewrites `products` from its pre-medios read — deleting the just-attached `images`/`description`. This directly violates D-15 ("the sync never overwrites images/description").
**Fix:** In `_sync_store_sync.build_tree`, re-graft the staff-owned fields from the fresh `cur` before writing:
```python
def build_tree(cur):
    fresh = {p.get("checkoutUrl"): p for p in cur.get("products", []) if isinstance(p, dict)}
    grafted = []
    for p in new_products:
        f = fresh.get(p.get("checkoutUrl"))
        if f:
            merged = dict(p)
            for k in ("images", "description", "featured", "license",
                      "details", "updates", "storefronts", "id", "editor"):
                if k in f:
                    merged[k] = f[k]
            grafted.append(merged)
        else:
            grafted.append(p)
    updated = dict(cur)
    updated["products"] = grafted
    ...
```
(Or hold a shared lock across the cog's whole read-merge-commit.)

### WR-02: Poll error handler restarts with zero backoff — a persistent outage turns the 6-hour cadence into a tight retry hammer

**File:** `../nocturna-bot/cogs/jinxxy.py:227-231`
**Issue:** `_on_poll_error` calls `self._poll.restart()`. A restarted `tasks.loop` runs its first iteration immediately (after `wait_until_ready`, which is instant while connected). So during a persistent Jinxxy or GitHub outage: fail → restart → immediate full sync → fail → restart → … A fast failure mode (connection refused) loops in milliseconds-to-seconds, hammering both APIs indefinitely instead of waiting `JINXXY_POLL_HOURS`. The "mirrors reminders" comment doesn't transfer: a minutely scheduler restarting is benign; a 6-hour poll restarting immediately is a retry storm.
**Fix:** Sleep before restarting, or restart without an immediate first tick:
```python
@_poll.error
async def _on_poll_error(self, exc: Exception):
    log.exception("jinxxy: el poll de la tienda se cayó, reintento en 15 min", exc_info=exc)
    await asyncio.sleep(900)          # bounded cool-down before the retry
    self._poll.restart()
```

### WR-03: Snapshot is only upserted when `changed=True` — a stale snapshot later clobbers a staff edit

**File:** `../nocturna-bot/cogs/jinxxy.py:196-211`
**Issue:** Step 5 runs the `upsert_store_snapshot` loop only inside `if result["changed"]:`. But the reconcile can report `changed=False` while `live != snapshot` — e.g. Jinxxy changes the price to 20 and staff had already hand-edited `store.json` to 20 (`merged == current`, no changed fields). The snapshot then stays at the old value (10) indefinitely. On a later sync, if staff edits the price to 30, the merge sees `live(20) != snap(10)` and `cur(30) != snap(10)` → "both changed" → **Jinxxy wins and reverts the staff edit to 20**, violating the D-12 staff-protection contract. Had the snapshot been refreshed to 20, `live == snap` would have preserved the staff edit.
**Fix:** Upsert snapshots on every *successful* sync, not only on changed ones (removals stay inside the changed branch — `removed` is empty otherwise):
```python
if result["changed"]:
    await github_publish.sync_store(result["products"])
# snapshot must always reflect the latest successfully observed live values
for key, entry in live_by_key.items():
    ...db.upsert_store_snapshot(...)
for key in result["removed"]:
    db.delete_store_snapshot(key)
```

### WR-04: Empty `/me` username silently builds `jinxxy.com//slug` keys — one bad `/me` response mass-rewrites the store

**File:** `../nocturna-bot/cogs/jinxxy.py:160-162` (and `../nocturna-bot/core/store_sync.py:55`)
**Issue:** `store_username = me.get("username") or ""` tolerates a missing username. `map_product` then constructs `https://jinxxy.com//cahuama`, which **passes** `is_https_url` (scheme https, netloc present). Because `checkoutUrl` is the reconcile key, every product's key changes at once: all previously synced keys appear "gone from live" (→ removed, snapshots deleted) and all live products appear "new" (→ added with broken double-slash links). One malformed-but-2xx `/me` response rewrites the entire `store.json` with broken checkout links and destroys the snapshot linkage. The removal-safety design (T-09-15) guards enumeration failures but not this.
**Fix:** Fail the sync hard when `/me` lacks a username:
```python
me = await asyncio.to_thread(jinxxy_api.get_me)
store_username = me.get("username")
if not store_username:
    raise jinxxy_api.JinxxyAPIError("GET /me failed: response carried no username")
owner_name = me.get("display_name") or ""
```

### WR-05: `three_way_merge` with (snapshot present, current deleted) emits `{}` or partial garbage entries into `store.json`

**File:** `../nocturna-bot/core/store_sync.py:116-142` (reached via `reconcile_store:168-176`)
**Issue:** If staff manually delete a synced product from `store.json` while it is still live on Jinxxy, the merge runs with `snapshot != None, current = None`. `current or {}` → `merged = {}`; for every unchanged field `new_v = cur_v = None`, and the `if field in merged or new_v is not None` guard skips the write — so `merged` stays `{}` and `changed_fields` stays empty (`None != None` is False). An **empty dict is appended to `products`** (or a partial dict containing only the fields Jinxxy happened to change). If any other product changed that cycle, the commit writes this garbage entry into `store.json`. Neither "respect the deletion" nor "resurrect the product" happens — the entry is just corrupt. No test covers this input combination.
**Fix:** Handle the branch explicitly — resurrect from live like a new product (or skip it in `reconcile_store` if deletions should stick):
```python
if current is None:                      # staff deleted it; Jinxxy still lists it
    merged = dict(live)
    merged["id"] = _id_from_checkout(live["checkoutUrl"])
    merged["description"] = {"es": "", "en": ""}
    return merged, [f for f in SYNC_OWNED if f in merged]
```

### WR-06: `store.json` products without a usable `checkoutUrl` are silently deleted on the next changed sync

**File:** `../nocturna-bot/cogs/jinxxy.py:185-189` (and `../nocturna-bot/core/store_sync.py:178-184`)
**Issue:** `current_by_key` keeps only dict entries with a truthy `checkoutUrl`. Any entry that is filtered out (a hand-added product with a typo'd key — `checkouturl`, a missing key, or a non-dict) never reaches `reconcile_store`, so it is absent from `result["products"]` — and `sync_store` **replaces the whole `products` array**. The entry is silently deleted from the repo on the next changed sync. `store.json`'s own `_comment` invites staff to hand-edit the file, so this is a realistic human-error → data-loss path, and it contradicts the reconcile docstring's "staff-added, never synced → preserved unchanged and never dropped" promise. Duplicated `checkoutUrl` values also silently drop all but the last entry via the dict comprehension.
**Fix:** Carry unkeyable entries through verbatim:
```python
raw_products = current.get("products") or []
current_by_key, unkeyed = {}, []
for p in raw_products:
    if isinstance(p, dict) and p.get("checkoutUrl"):
        current_by_key[p["checkoutUrl"]] = p
    else:
        unkeyed.append(p)
result = store_sync.reconcile_store(snapshots, live_by_key, current_by_key)
result["products"].extend(unkeyed)      # never drop what we couldn't key
```

### WR-07: `/tienda medios` with a non-image (or bomb-sized) attachment raises unhandled — deferred interaction hangs, no staff feedback

**File:** `../nocturna-bot/cogs/jinxxy.py:322-323` (via `../nocturna-bot/core/image_optimize.py:40`)
**Issue:** Only `discord.HTTPException` (download) and `GitHubPublishError` (commit) are caught. `image_optimize.optimize_to_webp` calls `PIL.Image.open` on arbitrary staff bytes: a PDF/video/corrupt file raises `UnidentifiedImageError`, and an oversized image raises `DecompressionBombError`. Both propagate out of `asyncio.to_thread` uncaught → the command errors after `defer()`, the staff invoker is stuck on "thinking…" forever, and the D-05 "one user-facing ephemeral signal" contract is broken. Discord's attachment picker does not restrict content types.
**Fix:**
```python
try:
    media = await asyncio.to_thread(
        _optimize_attachments, raws, _slug_from_url(producto))
except Exception:
    log.exception("jinxxy: no pude optimizar los adjuntos de /tienda medios")
    await interaction.followup.send(
        "Alguna imagen no se pudo procesar (¿es una imagen válida?).", ephemeral=True)
    return
```

### WR-08: `/tienda sync` catch is too narrow — a mapping error (`KeyError`/`TypeError`) hangs the deferred interaction

**File:** `../nocturna-bot/cogs/jinxxy.py:252-259` (root cause in `../nocturna-bot/core/store_sync.py:51-61`)
**Issue:** `map_product` hard-indexes `detail["name"]`, `detail["url"]`, `detail["base_price"]`, `detail["created_at"][:10]`. A product detail missing any of these (or `created_at: null`) raises `KeyError`/`TypeError` — neither `JinxxyAPIError` nor `GitHubPublishError`, so the `/tienda sync` handler's `except (GitHubPublishError, JinxxyAPIError)` misses it: the deferred interaction hangs with no ephemeral reply. (In the poll path the same exception feeds the WR-02 restart hammer.) Note also `str(detail["base_price"])` would happily write the string `"None"` as a price if the API returns null.
**Fix:** Broaden the command's guard to `except Exception` (log + the same ephemeral "revisa los logs" reply) so *any* sync failure follows D-05; optionally validate `base_price`/`created_at` in `map_product` and raise `JinxxyAPIError`-adjacent typed errors for malformed details.

### WR-09: `_announce` docstring promises "never raised", but `channel.send` failures propagate

**File:** `../nocturna-bot/cogs/jinxxy.py:404`
**Issue:** The unresolvable-channel path is guarded, but `await channel.send(...)` is not: `discord.Forbidden` (missing send permission in the announce channel) or any `HTTPException` propagates. In `/tienda sync` (line 263) that leaves the deferred interaction hanging with no ephemeral summary; in the poll path it triggers a full restart-and-resync for what is a cosmetic failure. This contradicts the method's own contract ("logged and skipped — never raised").
**Fix:**
```python
try:
    await channel.send(embed=self._build_announce_embed(result))
except discord.HTTPException:
    log.exception("jinxxy: no pude publicar el anuncio de la tienda")
```

## Info

### IN-01: Cog reaches into the transport's private `_fetch_store`

**File:** `../nocturna-bot/cogs/jinxxy.py:182-184`
**Issue:** `_run_sync` calls `github_publish._fetch_store` (underscore-private) with raw config args. Every other cross-module surface in this transport is a public async wrapper.
**Fix:** Expose a public `async def fetch_store()` in `github_publish` (wrapping `asyncio.to_thread(_fetch_store, ...)`) and call that.

### IN-02: Blocking SQLite calls run directly on the event loop in `_run_sync`

**File:** `../nocturna-bot/cogs/jinxxy.py:181, 200-211`
**Issue:** `db.get_store_snapshot()` and the `upsert_store_snapshot`/`delete_store_snapshot` loops execute synchronously on the event loop, while `_producto_choices` (line 368) wraps the same read in `asyncio.to_thread`. Inconsistent, and each call opens a new SQLite connection under the gateway loop.
**Fix:** Route the `_run_sync` DB calls through `asyncio.to_thread` like the autocomplete does.

### IN-03: `_fetch_json_object` duplicates ~25 lines of `_fetch_json`

**File:** `../nocturna-bot/core/github_publish.py:199-238` (vs `151-187`)
**Issue:** The Contents-API fetch + `encoding: none` raw fallback + JSON-shape normalization now exist twice. A future fix to the WR-01 raw-fallback logic must be applied in both places or they drift.
**Fix:** Extract a shared `_fetch_json_text(repo, branch, path) -> str | None` and keep only the shape validation (array vs object) in the two wrappers.

### IN-04: `/tienda medios` filenames can orphan and cross-collide

**File:** `../nocturna-bot/cogs/jinxxy.py:75-102` (and `../nocturna-bot/core/github_publish.py:635-656`)
**Issue:** (a) Re-running the command with fewer images leaves the higher-index `/store/{slug}-N.webp` files committed but unreferenced (no cleanup of previously attached files). (b) `_slug_from_url` strips every non-`[a-z0-9-]` char, so two distinct slugs can sanitize to the same base (`item_1` → `item1` colliding with a real `item1`), letting one product's upload overwrite another's image files while both reference the same paths.
**Fix:** Delete previously referenced `/store/{slug}-*.webp` files in the same commit (sha:null entries, as the gallery removal does), and disambiguate the base with a short hash suffix (e.g. `{slug}-{md5(url)[:6]}-{i}.webp`).

### IN-05: Stale `store_snapshot` rows are never purged; autocomplete offers dead products

**File:** `../nocturna-bot/core/db.py:371-406` (and `../nocturna-bot/cogs/jinxxy.py:356-378`)
**Issue:** `delete_store_snapshot` only runs for keys in `result["removed"]`, which requires the entry to still exist in `store.json`. A product gone from both Jinxxy and (manually) from `store.json` leaves a snapshot row forever, and `_producto_choices` keeps offering it in the `/tienda medios` autocomplete (the attach then fails with an ephemeral error).
**Fix:** After a successful sync, also delete snapshot rows whose key is absent from `live_by_key`.

### IN-06: `jinxxy_id` is written but never read

**File:** `../nocturna-bot/core/db.py:359-398`, `../nocturna-bot/cogs/jinxxy.py:168-178, 203`
**Issue:** `jinxxy_id_by_key` is threaded through `_run_sync` and persisted per row, but no code path ever reads the column back. Dead data unless a future plan consumes it.
**Fix:** Either drop the column/plumbing or add a comment naming the planned consumer.

### IN-07: `JINXXY_POLL_HOURS` has no bounds validation despite bot.py's fail-fast pattern

**File:** `../nocturna-bot/config.py:109`, `../nocturna-bot/bot.py:107-113`
**Issue:** `bot.py` fail-fasts on the API key and validates `REMINDERS_TZ`, but `JINXXY_POLL_HOURS=0` yields `tasks.loop(hours=0)` — a continuous zero-interval loop hammering Jinxxy and GitHub — and a negative value crashes cog import with an opaque error. The documented band is 6–12h.
**Fix:** In `main()`: `if config.JINXXY_POLL_HOURS < 1: log.error(...); sys.exit(1)`.

### IN-08: `attach_store_media` has no no-op guard

**File:** `../nocturna-bot/core/github_publish.py:609-672`
**Issue:** Calling it with `media=()` and `description=None` (unreachable via the cog today, but a public API) builds an identical `store.json` blob and still commits + PATCHes the ref — an empty-diff commit and a wasted Pages rebuild, unlike `sync_store`'s defensive gate.
**Fix:** Return `{"committed": False, ...}` early when `not media and description is None`.

### IN-09: Test coverage gaps around the failure modes found above

**File:** `../nocturna-bot/tests/test_jinxxy_api.py`, `../nocturna-bot/tests/test_jinxxy_cog.py`, `../nocturna-bot/tests/test_store_publish.py`
**Issue:** No test exercises: a large/epoch `Retry-After`/`X-RateLimit-Reset` hint (CR-02), the on_ready-plus-first-poll-tick interplay (CR-01), `three_way_merge(snapshot, live, current=None)` (WR-05), `_fetch_store`'s 404-raises path, or `/tienda medios` with an undecodable attachment (WR-07). These are exactly the behaviors that regressed past the otherwise thorough suites.
**Fix:** Add one test per fixed finding when applying the fixes above, pinning the corrected behavior.

---

_Reviewed: 2026-07-11T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
