---
phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse
reviewed: 2026-07-11T12:00:00Z
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
  critical: 1
  warning: 3
  info: 9
status: issues_found
---

# Phase 09: Code Review Report (third pass, post 09-11 gap closure)

**Reviewed:** 2026-07-11T12:00:00Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Third pass after gap-closure plan 09-11. The second-pass CR-01 is verified closed against the current source: `_run_sync` now commits (`github_publish.sync_store`, `cogs/jinxxy.py:201-202`) **before** the unconditional snapshot upsert loop (lines 209-220), so a failed commit leaves the durable snapshot behind and the Jinxxy change is re-detected next cycle — pinned by `test_run_sync_commit_failure_does_not_advance_snapshot`. The reorder is correct: removals still run only inside the changed branch after the commit, WR-03's no-change snapshot advancement is preserved, and no new ordering hazard was introduced by the move.

However, this pass found **one new critical defect**: the cog's WR-06 carry-through deliberately re-appends *non-dict* `products` entries into the list handed to `sync_store`, but `_sync_store_sync.build_tree` calls `dict(entry)` on every element and `_attach_store_media_sync.build_tree` calls `dict(p)` on every current product — both crash with an untyped `ValueError`/`TypeError` on the exact input WR-06 promises to tolerate. The consequence is a permanently failing 15-minute poll retry loop (silent, D-05) plus a fully broken `/tienda medios` whose deferred interaction hangs (the attach step catches only `GitHubPublishError`).

Additionally, two second-pass warnings were **not** fixed by 09-11 and remain in the code (confirmed against source and 09-VERIFICATION.md): no mutual exclusion between the poll tick and `/tienda sync`, and the untrusted, unbounded `page_count` pagination loop. The six second-pass info items also remain; they are carried forward below alongside three new info items. Secret handling (PAT/api-key header-only, class-name-only error interpolation), removal-safety ordering (T-09-15), and the staff-ownership merge contract all hold up under re-tracing. `bot.py`, `config.py`, `core/db.py`, `.env.example`, and `JINXXY_DEPLOY.md` are clean (no secrets committed, parameterized SQL throughout, fail-fast on the key, rotation documented).

## Critical Issues

### CR-01: A non-dict `products` entry crashes both store transports — WR-06 carry-through hands `sync_store` input it cannot survive

**File:** `../nocturna-bot/core/github_publish.py:616` and `:677`; fed by `../nocturna-bot/cogs/jinxxy.py:185-193`
**Issue:** The cog's WR-06 unkeyable handling (`cogs/jinxxy.py:185-188`) explicitly routes **non-dict** entries (comment: "non-dict / no key / duplicate → carry through") into `unkeyed` and re-appends them verbatim to `result["products"]` (line 193), which is passed to `sync_store` on any change. Inside `_sync_store_sync.build_tree`, the graft loop runs `merged = dict(entry)` (line 616) on every element **before** its `isinstance(entry, dict)` check on line 617 — `dict("stray string")` raises `ValueError` ("dictionary update sequence element..."), `dict(5)` raises `TypeError` (verified). Independently, `_attach_store_media_sync.build_tree` runs `products = [dict(p) for p in cur.get("products", [])]` (line 677) with no isinstance guard at all.

Trace the blast radius from one staff hand-edit that leaves a bare string in the `products` array (the exact malformed-staff-edit input class WR-06 was shipped to tolerate — `test_run_sync_unkeyable_current_product_survives` pins the dict-orphan case but the non-dict case was never exercised end-to-end):
1. **Poll path:** the next Jinxxy change makes `changed=True` → `sync_store` raises the untyped error inside `build_tree` → `_commit_with_retry` does not catch it (only HTTP statuses are handled) → it escapes `_run_sync` → `_on_poll_error` catches, sleeps 900s, restarts → the immediate first tick fails again. The sync is **permanently disabled**, retrying a full Jinxxy enumeration + GitHub fetch every 15 minutes, with no staff-visible signal (D-05 logs-only).
2. **Medios path:** every `/tienda medios` invocation crashes at line 677 regardless of whether anything changed. The error is `ValueError`/`TypeError`, not `GitHubPublishError`, so the cog's `except github_publish.GitHubPublishError` (`cogs/jinxxy.py:371`) does not catch it — the deferred interaction hangs on "thinking…" forever, the exact defect class WR-07/WR-08 were shipped to eliminate.

**Fix:** Make both `build_tree` bodies isinstance-safe, carrying non-dicts through verbatim (honoring WR-06):
```python
# _sync_store_sync.build_tree — check BEFORE dict():
for entry in new_products:
    if not isinstance(entry, dict):
        grafted.append(entry)              # WR-06: carry through verbatim
        continue
    merged = dict(entry)
    match = fresh.get(entry.get("checkoutUrl"))
    ...

# _attach_store_media_sync.build_tree:
products = [dict(p) if isinstance(p, dict) else p for p in cur.get("products", [])]
match = next((p for p in products
              if isinstance(p, dict) and p.get("checkoutUrl") == checkout_url), None)
```
Add tests: `sync_store` with a bare-string element in the current store + a changed merged list must commit and preserve the string; `attach_store_media` must succeed while a non-dict entry coexists in `products`.

## Warnings

### WR-01: No mutual exclusion between the poll tick and `/tienda sync` (carried forward from second pass — not fixed by 09-11)

**File:** `../nocturna-bot/cogs/jinxxy.py:135, 232-235, 269-271`
**Issue:** Still present, verified against current source (no `asyncio.Lock` anywhere in the cog; 09-VERIFICATION.md line 113 records it as ✗ FAIL). The background `_poll` tick and the staff `/tienda sync` command both call `_run_sync()` with no lock. A sync is slow by design (one sequential `get_product` HTTP round-trip per product), so the overlap window is seconds-to-minutes. Two interleaved `_run_sync` coroutines: (a) both compute `changed=True` from the same pre-commit state and both `_announce` (the cog ignores `sync_store`'s `committed: False` defensive no-op for the loser) — the announce channel gets the same "Tienda actualizada" embed twice; (b) interleaved snapshot upserts can advance the snapshot past a state the loser never committed; (c) the invoker's ephemeral summary reports work the other coroutine did.
**Fix:** Add `self._sync_lock = asyncio.Lock()` in `__init__` and wrap the `_run_sync` body in `async with self._sync_lock:`. Optionally skip `_announce` when `sync_store` reported `committed: False`.

### WR-02: `list_all_products` pagination is driven by an untrusted, unbounded `page_count` (carried forward from second pass — not fixed by 09-11)

**File:** `../nocturna-bot/core/jinxxy_api.py:159-182`
**Issue:** Still present, verified against current source (no `_MAX_PAGES`, no empty-page short-circuit; 09-VERIFICATION.md line 134 records it as open). The loop terminates only via `page >= page_count`, where `page_count` is re-read from every response body. This is the same trust class the phase treats as critical for sleep durations (first-pass CR-02): a buggy or hostile response carrying `page_count: 10**9` drives up to a billion sequential GETs, and a response that always reports `page_count = page + 1` never terminates. The sync thread spins inside `asyncio.to_thread` indefinitely — the WR-02 cool-down never engages because the tick never returns.
**Fix:** Bound the loop:
```python
_MAX_PAGES = 100        # 100 pages x limit=100 = 10,000 products

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

### WR-03: `/tienda medios` catches only `GitHubPublishError` around the attach commit — untyped transport escapes hang the deferred interaction

**File:** `../nocturna-bot/cogs/jinxxy.py:369-377`
**Issue:** WR-08 broadened `/tienda sync`'s guard to `Exception` precisely because non-typed errors escaping a deferred command leave it stuck on "thinking…" with no staff feedback. The medios command applies that lesson to the *optimize* step (line 353, broad `except Exception`) but not to the *attach* step: `await github_publish.attach_store_media(...)` is guarded only by `except github_publish.GitHubPublishError`. At least two real untyped escapes exist in the attach transport today: the CR-01 `dict(p)` crash (line 677), and `base64.b64decode`/`.decode("utf-8")` failures in `_fetch_json_object` (`binascii.Error`/`UnicodeDecodeError` raised at `github_publish.py:230-231`, *outside* the `try` that normalizes JSON errors — see IN-07). Any of them propagates out of the command callback and the deferred interaction hangs — the D-05 one-ephemeral-signal contract breaks.
**Fix:** Mirror WR-08 — broaden to `except Exception:` (keeping `log.exception` + the ephemeral "No pude adjuntar los medios; revisa los logs." reply). This is defense-in-depth even after CR-01 is fixed.

## Info

### IN-01: `_fetch_json_object` duplicates ~25 lines of `_fetch_json` (carried forward)

**File:** `../nocturna-bot/core/github_publish.py:200-239` (vs `152-188`)
**Issue:** The Contents-API read, the `encoding: "none"` raw-media fallback, the base64 decode, and the JSON-error normalization are copy-pasted. Any future fix to the large-file fallback must land in two places or silently diverge.
**Fix:** Extract a shared `_fetch_contents_text(repo, branch, path) -> str | None` and keep only the shape guards in the two wrappers.

### IN-02: `_attach_store_media_sync` uploads image blobs before validating the product match (carried forward)

**File:** `../nocturna-bot/core/github_publish.py:662-671`
**Issue:** Blob POSTs run before `build_tree` checks that `checkout_url` matches a product. `producto` is free text (autocomplete is a suggestion, not a validator), so a typo uploads every optimized image as orphaned, unreferenced blobs before the "no product with checkoutUrl" error raises.
**Fix:** Fetch the store and verify the match once before creating blobs (keep the `build_tree` re-check for retries).

### IN-03: Autocomplete truncates the choice `value` to 100 chars — a long checkoutUrl can never match (carried forward)

**File:** `../nocturna-bot/cogs/jinxxy.py:409`
**Issue:** `value=str(key)[:100]` respects Discord's cap, but a checkoutUrl over 100 chars is silently truncated and the exact-equality match in `attach_store_media` then always fails with a confusing "no product" error.
**Fix:** Skip (and `log.warning`) snapshot keys longer than 100 chars instead of truncating them into un-matchable values.

### IN-04: Duplicate live checkoutUrl silently drops a product (carried forward)

**File:** `../nocturna-bot/cogs/jinxxy.py:164-171`
**Issue:** `live_by_key[url] = entry` overwrites on a duplicate constructed checkoutUrl — the earlier product silently vanishes with no log line, unlike the adjacent non-https case which warns.
**Fix:** `if url in live_by_key: log.warning(...)` before overwriting (or skip the duplicate).

### IN-05: Re-attach with fewer images orphans committed files; slug collisions can cross products (carried forward)

**File:** `../nocturna-bot/cogs/jinxxy.py:81-108`, `../nocturna-bot/core/github_publish.py:684`
**Issue:** `attach_store_media` replaces `images` wholesale; a re-run with fewer attachments (4 → 2) leaves `{slug}-3.webp`/`{slug}-4.webp` committed under `public/store/` forever. Separately, `_slug_from_url`'s `[^a-z0-9-]` strip can collapse two distinct product slugs to the same base, letting a later attach overwrite files another product still references.
**Fix:** Emit `sha: None` deletes for previously-referenced `/store/{slug}-*.webp` paths not in the new set; consider suffixing the slug with a short URL hash.

### IN-06: `_announce`'s `fetch_channel` catch misses `discord.InvalidData` (carried forward)

**File:** `../nocturna-bot/cogs/jinxxy.py:428-430`
**Issue:** `fetch_channel` can also raise `discord.InvalidData`, which is not an `HTTPException` subclass — it would escape the "logged and skipped — never raised" contract and trigger a full poll restart over a cosmetic announce failure.
**Fix:** `except (discord.HTTPException, discord.InvalidData):`.

### IN-07: base64/UTF-8 decode failures escape the typed-error contract in both store fetchers (new)

**File:** `../nocturna-bot/core/github_publish.py:176-177` and `:230-231`
**Issue:** `raw = base64.b64decode(data.get("content", ""))` and `raw.decode("utf-8")` sit *outside* the `try/except ValueError` that normalizes JSON failures into `GitHubPublishError`. A malformed Contents-API body raises `binascii.Error`/`UnicodeDecodeError` untyped — in the medios path this compounds WR-03 (hung interaction); in the sync path it rides the broad poll handler. Very unlikely from real GitHub, but the module's docstring promises "one typed error" for every transport failure.
**Fix:** Move the decode lines inside the existing `try` (both are `ValueError` subclasses, so the existing `except ValueError` already covers them once inside).

### IN-08: `JINXXY_POLL_HOURS` is not validated — `0` produces a zero-interval hammer loop, a negative value crashes cog load with no friendly fail-fast (new)

**File:** `../nocturna-bot/config.py:109`, `../nocturna-bot/cogs/jinxxy.py:232`, `../nocturna-bot/bot.py:107-113`
**Issue:** `@tasks.loop(hours=config.JINXXY_POLL_HOURS)` is evaluated at import. `JINXXY_POLL_HOURS=0` yields a back-to-back sync loop hammering Jinxxy and GitHub continuously; a negative value raises inside `discord.ext.tasks` during `load_extension`, killing the bot with a raw traceback instead of the clear `sys.exit(1)` pattern `bot.py` uses for every other misconfiguration (it validates `JINXXY_API_KEY` two lines away but not the cadence).
**Fix:** In `bot.py`'s Fase-9 block: `if config.JINXXY_POLL_HOURS < 1: log.error("JINXXY_POLL_HOURS inválido (banda 6-12)"); sys.exit(1)`.

### IN-09: A staff `name` edit landing inside the commit window is permanently reverted — the WR-01 re-graft covers staff-owned keys but not the staff-wins `name` (new)

**File:** `../nocturna-bot/core/github_publish.py:607`
**Issue:** `_GRAFT_KEYS = STAFF_OWNED + ("editor",)` deliberately excludes `name` (it is sync-owned but staff-wins-on-conflict, D-10). If staff edit a product's `name` in `store.json` after the cog's step-3 `_fetch_store` but before the commit, the merged list carries the pre-edit name and the graft does not restore it — the commit reverts the edit, and the next cycle's merge sees `live == snapshot` → "keep current" → the reverted value sticks. Loss is permanent until staff re-edit. The window is seconds and this is the same overlap family as WR-01 (second pass); fixing the lock does not close this specific window (the race is against a human git/web edit, not another sync).
**Fix:** Low priority. If desired, graft `name` from fresh only when the fresh value differs from the merged one AND the merged name was not itself a live-sourced change — or simply document that name edits should be made via a period without an in-flight sync.

---

_Reviewed: 2026-07-11T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
