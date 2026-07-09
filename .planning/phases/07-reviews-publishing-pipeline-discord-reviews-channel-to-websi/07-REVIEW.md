---
phase: 07-reviews-publishing-pipeline-discord-reviews-channel-to-websi
reviewed: 2026-07-09T06:55:17Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - src/components/sections/Reviews.astro
  - src/i18n/pages.json
  - src/pages/[lang]/index.astro
  - src/data/reviews.json
  - ../nocturna-bot/cogs/reviews.py
  - ../nocturna-bot/core/github_publish.py
  - ../nocturna-bot/core/db.py
  - ../nocturna-bot/config.py
  - ../nocturna-bot/bot.py
  - ../nocturna-bot/tests/test_reviews_publish.py
  - ../nocturna-bot/tests/test_reviews_cog.py
findings:
  critical: 0
  warning: 5
  info: 8
  total: 13
status: fixed
fixed_at: 2026-07-09
fix_commits:
  nocturna-bot: [3ee13ba, 20d425d, e2771ba, e073f81]
  website: [b92ef02]
---

# Phase 7: Code Review Report

**Reviewed:** 2026-07-09T06:55:17Z
**Depth:** standard
**Files Reviewed:** 11
**Status:** fixed — all 5 warnings fixed (bot suite 164 passing, website build green); the 8 info findings remain open

## Summary

Reviewed the full reviews publishing pipeline: the Astro testimonials section (`Reviews.astro` + i18n wiring + `reviews.json`), the Discord `ReviewsCog` (detection, staff-gated publish/unpublish, guided anonymous/named collection flow, startup reconcile), the cross-repo GitHub transport (`publish_review`/`remove_review`), config/bootstrap, and both test suites.

**Security focus areas hold up:**
- **XSS**: review text and author flow exclusively through Astro auto-escaping (`{entry.text}`, `{...entry.author...}` — no `set:html` anywhere). User-generated HTML/script is inert. Verified end-to-end.
- **Anonymity**: the anonymous modal path never reads submitter identity (`_build_review_embed(text, None)`), the seam maps "no embed author" → `author: None`, and the transport preserves `null` verbatim. No identity reaches the embed, the JSON, the commit message, or the logs. Pinned by tests.
- **Staff gating**: `on_raw_reaction_add` gates on `payload.member` roles before any fetch; backfill role-checks reactors with REST fallback that fails closed. Non-staff/bot reactions cannot publish.
- **PAT handling**: read at call time, only ever in the `Authorization` header; network errors interpolate exception class name only; tests assert the PAT never reaches logs.

However, the cog has real correctness gaps: the live reaction path lacks the bot-message filter the backfill path has (a staff ✅ on the bot's own persistent ⚠️ failure reply publishes that reply text as a review), a lost 🟢 marker makes 🌙 silently fail to remove a live review, the backfill cursor cannot replay staff approvals on previously-scanned messages (contradicting its documented contract), non-typed transport exceptions bypass the ⚠️ failure UX entirely, and a single malformed `date` in `reviews.json` breaks the entire site build.

## Warnings

### WR-01: Live reaction path publishes non-review bot messages (asymmetric with backfill)

**Fixed:** `3ee13ba` (nocturna-bot, main) — mirrored the `_reconcile` bot-message guard at the top of both `_publish` and `_unpublish`; regression tests added (staff ✅ on the ⚠️ failure reply / foreign bot posts never publish).
**File:** `C:\Users\Shangri\Pictures\Nocturna Avatars\Coding\nocturna-bot\cogs\reviews.py:273-300` (dispatch at 297-300)
**Issue:** `_reconcile` (line 562) explicitly skips bot messages that are not the cog's own marked review embed: `if message.author.bot and not _is_own_review_embed(message): return`. The live `on_raw_reaction_add` → `_publish` path has **no such filter**. It gates the *reactor* (staff) but never the *target message author*. Any bot message with text content in the reviews channel becomes publishable by a single staff ✅. The worst instance is self-inflicted: `_surface_failure` (line 404) posts a **persistent, non-auto-deleting** reply ("⚠️ No pude publicar la reseña: GitHub falló…") and tells staff to interact with reactions right next to it — a mis-tapped ✅ on that reply publishes the bot's error text to the public website with `author` = the bot's display name. Foreign-bot/webhook posts in the channel are equally publishable. `_review_author_and_text` only guards against *empty* content, not bot authorship.
**Fix:** Mirror the reconcile guard at the top of `_publish` (and `_unpublish`), so both entry points share one policy:
```python
async def _publish(self, message: discord.Message):
    if getattr(message.author, "bot", False) and not _is_own_review_embed(message):
        return                                   # never publish non-review bot posts
    ...
```

### WR-02: Lost 🟢 marker makes 🌙 silently no-op the removal — review stays live while looking unpublished

**Fixed:** `20d425d` (nocturna-bot, main) — the pending-dismiss branch now defensively calls `remove_review` (transport no-op guard: one GET, never an empty commit for a truly-pending message), healing a lost-🟢 desync; failures are logged and never abort the dismiss. Tests updated + failure-tolerance test added.
**File:** `C:\Users\Shangri\Pictures\Nocturna Avatars\Coding\nocturna-bot\cogs\reviews.py:352, 375-379`
**Issue:** `_unpublish` branches on `_is_published(message)` **without entries**, so during live operation it relies solely on the bot's 🟢 reaction. `_publish`'s own post-commit path (lines 337-342) documents that the 🟢 can be lost after a successful commit ("a lost 🟢 is harmless"). It is *not* harmless for unpublish: with the marker lost, a staff 🌙 takes the pending-dismiss branch, clears reactions, commits **nothing**, and gives no error — the review remains live on the website indefinitely while the Discord message looks fully unpublished. The startup orphan pass only heals *deleted* messages, so nothing ever reconciles this. The comment "a re-✅ is a clean republish" covers the publish side only.
**Fix:** In the pending branch, still call the transport — `remove_review` already has a no-op guard, so a truly-pending message costs one GET and no commit:
```python
else:
    await self._remove_own_reaction(message, "✅")
    await self._remove_own_reaction(message, "🌙")
    # Defensive: heal a lost-🟢 desync — no-op when nothing was ever published.
    try:
        await github_publish.remove_review(message.id)
    except github_publish.GitHubPublishError:
        log.exception("reviews: defensive removal failed for msg %s", message.id)
```
(Alternatively pass the live `entries` into `_is_published` on this path.)

### WR-03: Backfill cursor cannot replay staff approvals/removals on already-scanned messages — contract violated

**Fixed:** `e2771ba` (nocturna-bot, main) — dropped the creation-ordered cursor entirely (the review's endorsed option: no terminal state exists, the channel is low volume, `_reconcile` is idempotent); `_backfill` now full-scans the channel every startup, the dead `reviews_state` helpers were removed from `core/db.py` (gallery cursor untouched), and a regression test pins that a staff ✅ added during downtime to an already-scanned message is replayed.
**File:** `C:\Users\Shangri\Pictures\Nocturna Avatars\Coding\nocturna-bot\cogs\reviews.py:463-491`
**Issue:** The `_backfill` docstring promises to "replay anything the bot missed while down — missed ✅ prompts, staff approvals, and 🌙 removals." But the cursor is keyed by **message creation order** (`db.set_reviews_cursor(message.id)` advances unconditionally per message, line 489) while approvals are **reaction events on existing messages**. Sequence: a review is scanned during one startup (pending, cursor advances past it) → bot goes down later → staff ✅'s that older pending review during downtime → next startup scans only `after=cursor` and never sees the message → the approval is silently lost. Same for a missed 🌙 on an older published review (stays live). Pending reviews routinely linger for days, so this window is realistic. Staff get zero feedback; recovery requires knowing to remove/re-add ✅ while the bot is up.
**Fix:** Don't advance the cursor past messages still in a non-terminal state, e.g. only `set_reviews_cursor` for messages that are published (🟢) or bot/skip messages; or additionally re-scan a bounded trailing window (e.g. last N days) of pre-cursor messages each startup; or drop the cursor for the reviews channel entirely (low volume — a full scan is cheap). At minimum correct the docstring so operators don't rely on a guarantee the code doesn't provide.

### WR-04: Non-typed transport exceptions bypass the ⚠️ failure UX — staff get zero feedback

**Fixed:** `e073f81` (nocturna-bot, main) — `_fetch_json` now normalizes `json.loads` failures and non-array bodies into `GitHubPublishError` (gallery gains the same normalization; valid-data behavior unchanged); `_publish`/`_unpublish` gained the suggested `except Exception` last-resort backstop driving the same ⚠️ surface; `_reconcile_orphans` skips truthy non-dict entries via an `isinstance` guard. Transport + cog tests added.
**File:** `C:\Users\Shangri\Pictures\Nocturna Avatars\Coding\nocturna-bot\cogs\reviews.py:320-327, 354-360` and `C:\Users\Shangri\Pictures\Nocturna Avatars\Coding\nocturna-bot\core\github_publish.py:177`
**Issue:** `_publish`/`_unpublish` catch **only** `GitHubPublishError`. But the transport can raise other exception types that the retry/typed-error wrapper does not cover: `json.loads(text)` at `github_publish.py:177` raises `JSONDecodeError` if `reviews.json` is ever malformed (manual edit, partial write), and a non-array JSON body (e.g. someone commits `{}`) makes `build_tree`'s comprehension raise `AttributeError` on `e.get("id")` (`_publish_review_sync:419`). These propagate through `asyncio.to_thread` out of `_publish`, past the reaction listener, and die in discord.py's generic "Ignoring exception" log — no ⚠️, no reply, staff sees the ✅ apparently do nothing with no explanation. The same malformed-entry case (`"abc".get(...)`) aborts `_reconcile_orphans` mid-pass (`reviews.py:513` — `(entry or {}).get("id")` only guards falsy entries, not non-dict truthy ones).
**Fix:** Convert JSON-shape failures into the typed error inside `_fetch_json` so the existing ⚠️ UX fires:
```python
try:
    data = json.loads(text) if text else []
except ValueError as exc:
    raise GitHubPublishError(f"GET contents json failed: invalid JSON ({exc.__class__.__name__})") from exc
if not isinstance(data, list):
    raise GitHubPublishError("GET contents json failed: expected a JSON array")
return data
```
Optionally also broaden the cog's catch to `except Exception` with the same `_surface_failure` path as a last-resort backstop.

### WR-05: One malformed `date` in reviews.json crashes the entire site build

**Fixed:** `b92ef02` (website, revamp) — applied the suggested filter (skip entries with unparseable dates or non-string/empty text) before sort/render; valid data renders identically. Verified: `npm run build` green with `[]`, AND with an injected malformed-date + missing-date entry (bad entries skipped, valid entry rendered), then `reviews.json` reverted to `[]`.
**File:** `C:\Users\Shangri\Pictures\Nocturna Avatars\Coding\Website\src\components\sections\Reviews.astro:42, 47, 64`
**Issue:** `dateFmt.format(new Date(entry.date))` throws `RangeError: Invalid time value` at build time when `date` is missing or unparseable, and the sort comparator (line 42) returns `NaN` for invalid dates (unstable ordering). Because this component renders on the landing page for both languages, a single bad entry — a manual edit, a future transport regression, or a hand-authored test entry — takes down **every** deploy of the whole site, not just one card. The data file is written by an automated cross-repo pipeline, so defensive parsing at the consumption boundary is warranted (FeaturedGallery has the bot-controlled-filename equivalent; dates here are the trust boundary).
**Fix:** Filter/guard invalid dates before render:
```ts
const reviews = ([...(reviewsData as ReviewEntry[])])
  .filter((e) => e && typeof e.text === 'string' && e.text && !Number.isNaN(new Date(e.date).getTime()))
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  .slice(0, 9);
```

## Info

### IN-01: Modal accepts whitespace-only reviews, producing a permanently unpublishable junk embed

**File:** `C:\Users\Shangri\Pictures\Nocturna Avatars\Coding\nocturna-bot\cogs\reviews.py:168-187`
**Issue:** `required=True` blocks empty input but not `"   "`. `on_submit` strips to `""`, still posts the embed with an empty description and adds ✅. The seam then resolves empty text, so `_publish` silently skips forever — a staff ✅ appears to do nothing, with no feedback.
**Fix:** After `text = str(self.review_text.value).strip()`, if empty, send the ephemeral error and return without posting.

### IN-02: Comment claims a false invariant — the 500-char cap only covers the modal path

**File:** `C:\Users\Shangri\Pictures\Nocturna Avatars\Coding\Website\src\components\sections\Reviews.astro:99-100`
**Issue:** "~500 char cap enforced Discord-side, so no clamp/read-more needed" is only true for modal-collected reviews. Plain typed reviews (the primary REV-02 path) can be 2000-4000 chars, so a card can grow far beyond the design assumption.
**Fix:** Either enforce a length cap in `_review_author_and_text`/`_publish` for plain messages, or soften the comment and accept tall cards deliberately.

### IN-03: Cog depends on the transport's private `_fetch_json`

**File:** `C:\Users\Shangri\Pictures\Nocturna Avatars\Coding\nocturna-bot\cogs\reviews.py:543-545`
**Issue:** `_fetch_entries` calls `github_publish._fetch_json` — a private helper — across the module boundary (tests also monkeypatch it). A transport refactor can break the cog without any signature warning.
**Fix:** Expose a public `fetch_reviews()` (or `fetch_json(path)`) in `github_publish` and call that.

### IN-04: Every publish/unpublish confirmation self-triggers a delete-reconcile GitHub read 60s later

**File:** `C:\Users\Shangri\Pictures\Nocturna Avatars\Coding\nocturna-bot\cogs\reviews.py:333-336, 365-368, 424-446`
**Issue:** The `delete_after=60` replies live in the reviews channel, so their auto-deletion fires `on_raw_message_delete`, which calls `remove_review(reply_id)` — a GitHub Contents API read under `_commit_lock` — for a guaranteed no-op. Harmless but noisy (log lines + API calls on every single publish), and it briefly serializes against real commits.
**Fix:** Track the bot's own reply ids in a small in-memory set (or check `payload.cached_message.author.bot` when available) and skip them.

### IN-05: `en.notFound` contains untranslated Spanish strings

**File:** `C:\Users\Shangri\Pictures\Nocturna Avatars\Coding\Website\src\i18n\pages.json:291-300`
**Issue:** In the EN dictionary, `notFound.heading` ("Página no encontrada"), `body`, `homeCta` ("Volver al inicio") and `ticketCta` ("Abrir Ticket") are Spanish while `metaTitle`/`metaDescription` are English. The parallel `body`/`bodyEn` keys suggest a deliberately bilingual 404 page, but the EN `heading`/`homeCta` being Spanish looks unintentional. Pre-existing (not a Phase-7 change) — flagged for verification since i18n ES+EN is a launch constraint.
**Fix:** Confirm the 404 design; if per-language, translate `en.notFound.heading/body/homeCta/ticketCta`.

### IN-06: Unreachable `channel is None` branch in `_backfill`

**File:** `C:\Users\Shangri\Pictures\Nocturna Avatars\Coding\nocturna-bot\cogs\reviews.py:472-477`
**Issue:** `bot.fetch_channel` raises (`NotFound`/`Forbidden`) rather than returning `None`, so after `get_channel(...) or await fetch_channel(...)` the `if channel is None` guard is dead code; the real failure mode is the exception caught in `on_ready`. Misleading about where the error surfaces.
**Fix:** Drop the `None` check, or catch `discord.HTTPException` around `fetch_channel` and log the same warning there.

### IN-07: SQLite connections are never closed and cursor writes block the event loop

**File:** `C:\Users\Shangri\Pictures\Nocturna Avatars\Coding\nocturna-bot\core\db.py:7-10, 112-122` (used from `cogs/reviews.py:479-489`)
**Issue:** `with _get_conn() as conn:` commits the transaction but does **not** close the connection (sqlite3's context manager is transaction-scoped) — every call leaks a connection object to GC. Also, `db.set_reviews_cursor` runs synchronously inside the async backfill loop, blocking the event loop per message. Both follow the repo's pre-existing idiom and volumes are tiny; noted, not new to Phase 7.
**Fix:** Use `contextlib.closing(_get_conn())` (or an explicit `conn.close()`), and/or wrap cursor writes in `asyncio.to_thread` if the channel ever grows large.

### IN-08: `panel_resenas` posts the panel before answering the interaction; a send failure leaves it unhandled

**File:** `C:\Users\Shangri\Pictures\Nocturna Avatars\Coding\nocturna-bot\cogs\reviews.py:258-259`
**Issue:** If `interaction.channel.send(...)` raises (missing perms in the channel), the exception is unhandled — discord.py logs it and the invoker sees "The application did not respond" instead of an actionable error.
**Fix:** Wrap the send in try/except and reply ephemerally ("No pude publicar el panel: revisa mis permisos en este canal.") on failure.

---

## Verified-clean notes (adversarial checks that passed)

- **XSS end-to-end (T-07-01):** `Reviews.astro` emits `entry.text`/`entry.author` only through JSX auto-escaping; no `set:html`/`innerHTML` anywhere in scope. `white-space: pre-line` + `overflow-wrap: anywhere` handle hostile whitespace/unbroken strings without markup interpretation.
- **Anonymity (T-07-02):** anonymous path never touches `interaction.user`; embed carries no identity; `author: null` preserved verbatim through the transport (`test_publish_preserves_author_null`); commit messages contain only the numeric message id.
- **Staff gate (T-07-03):** live path checks `payload.member` roles before any action; backfill `_reaction_by_staff` role-checks each reactor with REST fallback that fails closed on `NotFound`/`Forbidden`; `_is_staff` fails closed on empty role config; `bot.py` fail-fasts on missing PAT/roles/channel.
- **PAT (T-05-04 carryover):** never logged; `_http` interpolates only the exception class name; explicit `(10, 60)` timeout on every call prevents a lock-holding hang.
- **Atomicity/dedup:** single-commit publish/removal, id-keyed exact-string dedupe (prefix snowflakes cannot collide), stale-ref 409/422 retry re-fetches ref + array each attempt, no-op removal never commits. All pinned by the transport tests.
- **Gallery regression:** `_fetch_gallery`/`_serialize_gallery`/`_commit_with_retry` signatures preserved; the `fetch` parameter defaults to the gallery fetch, so existing gallery callers are byte-compatible.

---

_Reviewed: 2026-07-09T06:55:17Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
