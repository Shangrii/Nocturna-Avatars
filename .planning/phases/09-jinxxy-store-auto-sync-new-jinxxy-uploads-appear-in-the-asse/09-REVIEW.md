---
phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse
reviewed: 2026-07-11T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - ../nocturna-bot/cogs/jinxxy.py
  - ../nocturna-bot/core/github_publish.py
  - ../nocturna-bot/core/jinxxy_api.py
  - ../nocturna-bot/core/store_sync.py
  - ../nocturna-bot/tests/test_jinxxy_api.py
  - ../nocturna-bot/tests/test_jinxxy_cog.py
  - ../nocturna-bot/tests/test_store_publish.py
  - ../nocturna-bot/tests/test_store_sync.py
findings:
  critical: 1
  warning: 2
  info: 6
  total: 9
status: issues_found
---

# Phase 09: Code Review Report (re-review after gap-closure 09-07..09-10)

**Reviewed:** 2026-07-11T00:00:00Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Second pass after gap-closure plans 09-07..09-10. All 11 first-pass findings were verified closed against the current source: the duplicate `on_ready` startup reconcile is gone (poll's immediate first tick is the sole entry point, pinned by `test_no_on_ready_listener_defined`), the 429 backoff is clamped in every branch including the epoch-valued `X-RateLimit-Reset` (pinned by 6 dedicated tests), the snapshot now advances on no-change cycles (WR-03), unkeyable staff entries are carried through (WR-06), the staff-deleted-while-live product resurrects a complete entry (WR-05), the `/tienda sync` guard is broadened to `Exception` (WR-08), `/tienda medios` guards PIL failures broadly (WR-07), the poll error handler sleeps a bounded cool-down (WR-02), `_announce` swallows `HTTPException` (WR-09), the concurrent-attach re-graft protects staff `images`/`description` (WR-01), and a username-less `/me` hard-fails before any write (WR-04). All 103 tests in the four suites pass.

However, **the WR-03 fix introduced a regression**: the durable snapshot is now advanced *before* the commit, so a failed `sync_store` leaves the snapshot ahead of `store.json`, and the next cycle's three-way merge misreads the un-committed Jinxxy change as "Jinxxy unchanged, staff edit wins" — the update (price, nsfw, name, category, date) is then silently and permanently dropped. One residual concurrency gap (poll tick vs manual `/tienda sync`, no mutual exclusion) and one untrusted-input loop (`page_count`-driven pagination) remain at warning level. Secret-handling discipline, removal-safety ordering, and the staff-ownership merge contract otherwise hold up under adversarial tracing.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Snapshot advances before the commit — a failed `sync_store` permanently masks Jinxxy field updates

**File:** `../nocturna-bot/cogs/jinxxy.py:195-217`
**Issue:** The WR-03 gap fix moved the `db.upsert_store_snapshot` loop (step 5, lines 199-210) *out of* the changed branch — but it now runs **before** `github_publish.sync_store` (step 6, line 215). The step-5 comment says "advance the durable snapshot to live truth on EVERY **successful** sync", but the code advances it on **unsuccessful** syncs too. Trace the failure path: Jinxxy changes a price from `"10"` to `"20"`; the merge reports `changed=True`; the snapshot is upserted to `"20"`; then `sync_store` raises `GitHubPublishError` (retry budget exhausted, network outage). `store.json` still holds `"10"`. On the next cycle `three_way_merge` (`store_sync.py:134-135`) sees `live_v ("20") == snap_v ("20")` → "Jinxxy unchanged" → keeps `current` (`"10"`), reports zero changed fields, `changed=False`, no commit — **the price change never reaches the storefront** until Jinxxy changes that field *again* or staff hand-edits. Additions self-heal (snapshot-present + current-absent resurrects via the WR-05 branch) and removals are safe (`delete_store_snapshot` stays after the commit), but every *update* to a sync-owned field is silently lost across a transient GitHub failure. None of the tests exercise `sync_store` raising inside `_run_sync`, which is why 103 green tests didn't catch it.
**Fix:** Commit first, then advance the snapshot (still unconditionally, preserving WR-03's no-change advancement):
```python
# 5. Commit ONLY on change (D-06) — BEFORE the snapshot advances, so a failed
#    commit leaves the snapshot behind and the change is retried next cycle.
if result["changed"]:
    await github_publish.sync_store(result["products"])

# 6. WR-03: advance the durable snapshot to live truth on every SUCCESSFUL sync
#    (a raise above skips this, keeping snapshot <= store.json).
for key, entry in live_by_key.items():
    ...
    db.upsert_store_snapshot(...)

if result["changed"]:
    for key in result["removed"]:
        db.delete_store_snapshot(key)
```
Add a regression test: wire `sync_store` to raise, assert `rec.upserts == []` (or that a second `_run_sync` after the failure still commits the change).

## Warnings

### WR-01: No mutual exclusion between the poll tick and `/tienda sync` — concurrent syncs race the snapshot and double-announce

**File:** `../nocturna-bot/cogs/jinxxy.py:135, 222-225, 259-261`
**Issue:** First-pass CR-01 removed the duplicate *startup* entry point, but the same double-run mechanism is still reachable: the background `_poll` tick and the staff `/tienda sync` command both call `_run_sync()` with no lock. A sync is slow by design (one sequential `get_product` HTTP round-trip per product), so the race window is seconds-to-minutes. Two interleaved `_run_sync` coroutines: (a) both compute `changed=True` from the same pre-commit state, and since `_announce` keys off the *reconcile* result — not the commit result (`sync_store`'s defensive no-op returns `committed: False` for the loser, which the cog ignores) — the announce channel receives the same "Tienda actualizada" embed **twice**; (b) the unconditional snapshot upserts interleave with the other coroutine's merge, compounding CR-01's snapshot-ahead-of-store window; (c) the invoker's ephemeral summary reports adds/updates that the other coroutine actually committed.
**Fix:** Serialize the single sync code path the module docstring already promises:
```python
def __init__(self, bot):
    ...
    self._sync_lock = asyncio.Lock()

async def _run_sync(self) -> dict:
    async with self._sync_lock:
        ...  # existing body
```
Optionally also skip the announce when `sync_store` reported `committed: False`.

### WR-02: `list_all_products` pagination loop is driven by an untrusted, unbounded `page_count`

**File:** `../nocturna-bot/core/jinxxy_api.py:159-183`
**Issue:** The loop terminates only via `page >= page_count`, where `page_count` is re-read from **every** response body. This is the same trust class the phase already treats as critical for sleep durations (first-pass CR-02: "never trust a server hint"): a buggy or hostile response carrying `page_count: 10**9` drives up to a billion sequential GETs, and a response that always reports `page_count = page + 1` never terminates at all. Either way the sync thread spins inside `asyncio.to_thread` indefinitely — the poll loop hangs with no cadence recovery (the WR-02 cool-down only applies after the tick *fails*, and this tick never returns). There is no overall page cap or empty-page stop.
**Fix:** Bound the loop with a sanity cap and an empty-page short-circuit:
```python
_MAX_PAGES = 100        # 100 pages x limit=100 = 10,000 products — far beyond the storefront

while True:
    body = _get(...).json()
    results = body.get("results") or []
    products.extend(results)
    page_count = body.get("page_count") or 1
    if page >= page_count or not results:
        return products
    page += 1
    if page > _MAX_PAGES:
        raise JinxxyAPIError("GET /products failed: page_count exceeded the sanity cap")
```

## Info

### IN-01: `_fetch_json_object` duplicates ~25 lines of `_fetch_json`

**File:** `../nocturna-bot/core/github_publish.py:200-239` (vs `152-188`)
**Issue:** The Contents-API read (404 handling aside), the `encoding: "none"` raw-media fallback, the base64 decode, and the JSON-error normalization are copy-pasted between `_fetch_json` and `_fetch_json_object`. Any future fix to the WR-01 large-file fallback must now land in two places or silently diverge.
**Fix:** Extract a shared `_fetch_contents_text(repo, branch, path) -> str | None` (returns `None` on 404) and keep only the shape guards (`list` vs `dict`-with-`products`) in the two wrappers.

### IN-02: `_attach_store_media_sync` uploads image blobs before validating the product match

**File:** `../nocturna-bot/core/github_publish.py:662-682`
**Issue:** The blob POSTs (lines 663-670) run before `build_tree` checks that `checkout_url` matches a product. `producto` is a free-text slash-command string (autocomplete is a suggestion, not a validator), so a typo uploads every optimized image to the repo as orphaned, unreferenced blobs before the "no product with checkoutUrl" error raises.
**Fix:** Fetch the store and verify the match once before creating blobs (the `build_tree` re-check stays for the retry path).

### IN-03: Autocomplete truncates the choice `value` to 100 chars — a long checkoutUrl can never match

**File:** `../nocturna-bot/cogs/jinxxy.py:399`
**Issue:** `value=str(key)[:100]` respects Discord's 100-char cap, but a checkoutUrl longer than 100 chars would be silently truncated, and the subsequent `attach_store_media` match (exact string equality) would always fail with a confusing "no product" error. Jinxxy URLs are realistically short, but the failure mode is silent.
**Fix:** Skip (and `log.warning`) snapshot keys longer than 100 chars instead of truncating them into un-matchable values.

### IN-04: Duplicate live checkoutUrl silently drops a product

**File:** `../nocturna-bot/cogs/jinxxy.py:160-171`
**Issue:** `live_by_key[url] = entry` overwrites on a duplicate constructed checkoutUrl (e.g., two Jinxxy products whose slugs collide after the store-username join) — the earlier product silently vanishes from the storefront with no log line, unlike the adjacent non-https case which warns.
**Fix:** `if url in live_by_key: log.warning(...)` before overwriting (or skip the duplicate).

### IN-05: Re-attach with fewer images orphans committed files; slug collisions can cross products

**File:** `../nocturna-bot/cogs/jinxxy.py:81-108`, `../nocturna-bot/core/github_publish.py:684`
**Issue:** `attach_store_media` replaces `images` wholesale, but a re-run with fewer attachments (4 → 2) leaves `{slug}-3.webp`/`{slug}-4.webp` committed under `public/store/` forever (repo bloat, stale served files). Separately, `_slug_from_url`'s sanitization (`[^a-z0-9-]` strip) can collapse two distinct product slugs to the same base, letting a later attach overwrite files another product still references.
**Fix:** In `build_tree`, emit `sha: None` deletes for previously-referenced `/store/{slug}-*.webp` paths not in the new set; consider suffixing the slug with the short URL hash to make bases collision-free.

### IN-06: `_announce`'s `fetch_channel` catch misses `discord.InvalidData`

**File:** `../nocturna-bot/cogs/jinxxy.py:418-420`
**Issue:** `fetch_channel` can also raise `discord.InvalidData` (unknown channel type payload), which is not an `HTTPException` subclass — it would escape the "logged and skipped — never raised" contract and trigger a full poll restart-and-resync over a cosmetic announce failure (same class as first-pass WR-09).
**Fix:** `except (discord.HTTPException, discord.InvalidData):` on the `fetch_channel` call.

---

_Reviewed: 2026-07-11T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
