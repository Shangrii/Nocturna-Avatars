---
phase: 05-photo-publishing-bot-cog
reviewed: 2026-07-04T15:43:53Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - ../nocturna-bot/cogs/gallery.py
  - ../nocturna-bot/core/github_publish.py
  - ../nocturna-bot/core/image_optimize.py
  - ../nocturna-bot/core/db.py
  - ../nocturna-bot/bot.py
  - ../nocturna-bot/config.py
  - .github/workflows/deploy.yml
findings:
  critical: 3
  warning: 6
  info: 8
  total: 17
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-07-04T15:43:53Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Reviewed the Phase-5 photo-publishing pipeline: the Discord cog (`cogs/gallery.py`), the Git Data API transport (`core/github_publish.py`), the image optimizer, the DB cursor helpers, bot bootstrap/config, and the website's deploy workflow.

The security-sensitive surfaces mostly hold: the PAT is only ever placed in the `Authorization` header and never logged (`_require` logs endpoint label + status only); filenames are numeric-only so no caption text can reach a filesystem path; the staff role gate on `payload.member` correctly bounds who can trigger a publish/unpublish live; the deploy workflow uses least-privilege `contents: write` and the auto-masked `GITHUB_TOKEN`. The atomic single-commit design (blobs → tree → commit → ref, with rebuild-on-stale-ref) is sound.

However, the error-handling contract has real holes. The cog's entire D-19 failure UX hinges on `GitHubPublishError` being the only failure signal — but the transport lets `requests` network exceptions escape untyped, and no HTTP call has a timeout while a module-level lock is held around every commit. Separately, the startup backfill's staff gate depends on member/role data that the bot's configured intents never populate, which silently defeats D-20. Several Warning-tier issues follow the same theme: failure paths that degrade silently instead of surfacing.

## Critical Issues

### CR-01: `requests` network exceptions escape the `GitHubPublishError` contract — D-19 failure UX silently bypassed

**File:** `../nocturna-bot/core/github_publish.py:107-156, 173-197` (all `requests.get/post/patch` call sites); consumed at `../nocturna-bot/cogs/gallery.py:174-181, 207-214`
**Issue:** Every HTTP call in the transport (`_fetch_parent_sha`, `_fetch_base_tree_sha`, `_fetch_gallery`, `_create_blob`, `_create_tree`, `_create_commit`, `_update_ref`) calls `requests` directly with no `try/except` around the request itself. `_require` only converts non-2xx *responses* into `GitHubPublishError`. A `requests.exceptions.ConnectionError`, `Timeout`, or DNS failure — the most common real-world failure class for a bot on a home/VPS connection — propagates out of `asyncio.to_thread` as a raw `requests` exception. The cog catches **only** `github_publish.GitHubPublishError` (`gallery.py:176`, `:209`), so on any network-level failure:
- No ⚠️ reaction, no persistent reply — staff see nothing and assume the photos published.
- No 🟢 marker either, so the message looks pending, but nobody is told to retry.
- The exception dies in discord.py's generic "Ignoring exception in on_raw_reaction_add" log line.

This is a silent failure of the pipeline's primary function and defeats the exact contract the docstrings promise ("a typed `GitHubPublishError` is raised for the cog to surface").
**Fix:** Wrap the sync entry points so every transport failure is typed:
```python
def _publish_sync(message_id, entries, date):
    try:
        ...existing body...
    except requests.RequestException as exc:
        raise GitHubPublishError(f"network error: {exc.__class__.__name__}") from exc
```
(Apply the same wrapper to `_remove_sync`, or centralize with a `_request(method, url, **kw)` helper that converts `requests.RequestException` → `GitHubPublishError`.) Do not interpolate `str(exc)` if there is any chance a URL/header could appear in it — the class name is enough. As defense-in-depth, the cog's `except github_publish.GitHubPublishError` blocks can become `except Exception` with the same D-19 surface, since *any* failure at that point means "not published".

### CR-02: No timeout on any HTTP request while `_commit_lock` is held — one hung connection permanently disables the whole publish pipeline

**File:** `../nocturna-bot/core/github_publish.py:109, 115, 122, 134, 141, 148, 156` (every `requests` call); lock held at `:305-306, 321-322`
**Issue:** `requests` has **no default timeout** — a black-holed TCP connection (dropped Wi-Fi, mid-flight route change, GitHub LB stall) blocks forever. Every publish/removal runs inside `async with _commit_lock`, and the lock is held for the full duration of the `asyncio.to_thread(...)` call. One hung request therefore:
1. Blocks its worker thread indefinitely, and
2. Holds `_commit_lock` forever, so **every subsequent publish, unpublish, delete-reconcile, and orphan removal queues behind it until the process is restarted** — with zero feedback (no exception, no ⚠️, nothing in the logs).

Combined with CR-01 this is the worst failure mode available: the entire gallery feature goes dark silently.
**Fix:** Add an explicit timeout to every call, e.g. a module constant:
```python
_TIMEOUT = (10, 60)   # (connect, read) seconds — blob POSTs of ~1–2 MB images need read headroom

resp = requests.get(url, headers=_headers(), timeout=_TIMEOUT)
```
A timeout expiry raises `requests.Timeout`, which CR-01's wrapper then converts to `GitHubPublishError`, releasing the lock and triggering the ⚠️ retry UX.

### CR-03: Startup backfill's staff gate depends on member/role data the configured intents never provide — D-20 reconcile silently no-ops

**File:** `../nocturna-bot/bot.py:27-28` (intents); `../nocturna-bot/cogs/gallery.py:401, 423-442` (`_reconcile` author gate, `_reaction_by_staff`)
**Issue:** `bot.py` uses `discord.Intents.default()` + `message_content` — the privileged **members intent is off**, so the guild member cache is essentially empty after a restart (no chunking, no GUILD_MEMBER events). Two backfill code paths depend on that cache:
1. `_reconcile` (`gallery.py:401`) gates on `_is_staff(message.author)`. Messages fetched via REST `channel.history()` carry author as a plain user payload with **no member/roles data**; discord.py can only upgrade it to a role-bearing `Member` via the guild cache. With the cache cold, `getattr(member, "roles", [])` yields `[]`, `_is_staff` returns `False`, and **every staff photo post in the scan is skipped as "community/bot post — not managed"**.
2. `_reaction_by_staff` (`gallery.py:439`) does `message.guild.get_member(user.id)` for each reactor — `None` for uncached members → missed staff ✅/🌙 approvals are never replayed.

Net effect: the entire D-20 backfill (missed prompts, missed approvals, missed removals) silently does nothing in the common case, while logging "reconciled N message(s)" as if it worked. Only the orphan pass (which needs no roles) actually functions. The live paths are unaffected (`payload.member` arrives on the gateway event with roles, and `MESSAGE_CREATE` includes member data), which is exactly why this failure hides: everything works live, and the one code path whose job is to cover downtime is the one that breaks.
**Fix:** Enable the members intent (and toggle it in the Discord developer portal):
```python
intents = discord.Intents.default()
intents.message_content = True
intents.members = True          # backfill role checks need real member objects
```
Additionally (or if the privileged intent is undesirable), make the backfill resolve members explicitly instead of trusting the cache:
```python
member = message.guild.get_member(user.id) or await message.guild.fetch_member(user.id)
```
wrapped in `try/except discord.NotFound` — and do the same upgrade for `message.author` in `_reconcile` before the `_is_staff` check. Verify with a cold-restart test: restart the bot, then confirm a pre-restart staff post with a staff ✅ actually publishes.

## Warnings

### WR-01: `_fetch_gallery` silently returns `[]` for gallery.json over 1 MB — the next publish then rewrites gallery.json with only the new entries

**File:** `../nocturna-bot/core/github_publish.py:119-128`, consumed at `:234-242`
**Issue:** The GitHub Contents API returns `"content": "", "encoding": "none"` for files between 1 MB and 100 MB. `_fetch_gallery` doesn't check `encoding`/`size` — it b64-decodes the empty string, strips to `""`, and returns `[]`. `_publish_sync.build_tree` then computes `list([]) + new_entries` and **commits a gallery.json containing only the new photos, silently discarding every existing entry**. The image files stay in the repo but all tiles vanish from the site. At ~150 bytes/entry the trigger threshold is roughly 6–7k entries — distant, but the failure is silent, destructive, and will hit precisely when the gallery is most valuable. Removal has the same read path (`:257`), where a truncated read at least degrades to a harmless no-op.
**Fix:** Guard the read explicitly so it can never mistake "too big to inline" for "empty":
```python
data = resp.json()
if data.get("encoding") == "none" or (data.get("size", 0) > 0 and not data.get("content")):
    # fetch via raw media type — never treat an unreadable gallery as empty
    raw_resp = requests.get(url, headers={**_headers(), "Accept": "application/vnd.github.raw+json"},
                            params={"ref": branch}, timeout=_TIMEOUT)
    _require(raw_resp, "GET contents gallery.json (raw)")
    text = raw_resp.text.strip()
else:
    text = base64.b64decode(data["content"]).decode("utf-8").strip()
```

### WR-02: Duplicate-publish race — the idempotency check runs before the lock, so two near-simultaneous staff ✅ publish twice

**File:** `../nocturna-bot/cogs/gallery.py:153-183`; `../nocturna-bot/core/github_publish.py:234-242`
**Issue:** `_publish` checks the 🟢 marker at entry (`:153`), then does slow work (attachment download, WebP re-encode) before acquiring `_commit_lock` inside `publish_message`. If two staff members react ✅ within that window (entirely plausible — a good photo gets two quick approvals), both handlers pass the marker check and both commit. The image files collide harmlessly (same paths, same content), but `build_tree` appends `new_entries` to the *fresh* gallery — the second commit's `current` already contains the first commit's entries, so **gallery.json ends up with duplicate entries and the site shows the photo(s) twice**. The same duplication occurs if `add_reaction("🟢")` fails after a successful commit (Discord's 20-unique-reaction cap, a permission hiccup) and a staff member re-✅s: the entry-based guard exists only in the backfill path (`_is_published(message, entries)`), never live.
**Fix:** Make the commit itself idempotent — dedupe inside `build_tree`, where the freshly fetched gallery is authoritative:
```python
def build_tree(current):
    target = str(message_id)
    kept = [e for e in current if _entry_message_id(e.get("file", "")) != target]
    updated = kept + new_entries          # replace, never append-duplicate
    ...
```
This also converts a re-✅ after a lost 🟢 into a clean republish instead of a duplication. An in-flight `set` of message ids in the cog would additionally avoid the wasted double optimize/commit.

### WR-03: Live publish accepts staff ✅ on community-authored posts, but backfill refuses to manage those same messages — missed 🌙 removals are never replayed

**File:** `../nocturna-bot/cogs/gallery.py:125-145` (no author gate) vs `:401` (author gate)
**Issue:** `on_raw_reaction_add` gates only the **reactor**; `_publish` never checks `message.author`. A staff member reacting ✅ to a community member's image post publishes it — contradicting the documented detection model (D-03: only staff posts get the control; the module docstring says "community + non-image posts are ignored entirely"). Worse, the two paths disagree: `_reconcile` (`:401`) skips any message whose author isn't staff, so once a community-authored message has been published live, **a staff 🌙 (or a needed re-publish) that arrives while the bot is down is never replayed** — the backfill declares the message "not managed" while its photos sit live on the site. Only manual deletion of the message (orphan pass / raw delete) can then remove them.
**Fix:** Pick one semantic and enforce it in both paths. If only staff-authored posts are publishable (the documented design), add the author gate to the live path:
```python
if not _is_staff(message.author):      # in _publish, after fetch_message
    return
```
If staff-curated community photos are a desired feature, remove the author gate from `_reconcile` for messages that are already published (🟢/entry match) so their 🌙 removals still reconcile.

### WR-04: Discord-side failures in the publish path are uncaught — `fetch_message`, `attachment.read`, `add_reaction`, `reply` can all abort silently with no ⚠️

**File:** `../nocturna-bot/cogs/gallery.py:139-141, 168, 184-193, 216-223, 253-256`
**Issue:** The D-19 failure surface only wraps the `github_publish` call. Everything else in the hot path is bare:
- `fetch_channel`/`fetch_message` (`:139-141`) raise `NotFound`/`Forbidden`/`HTTPException` (message deleted between reaction and fetch, permission change) → handler dies silently.
- `attachment.read()` (`:168`) raises `discord.HTTPException`/`NotFound` (CDN hiccup, attachment expired) → publish aborts with no feedback, no ⚠️.
- Post-commit: `add_reaction("🟢")` (`:184`) or `reply` (`:189`) failing leaves a **committed** publish with no marker and/or no confirmation — and in `_unpublish`, `remove_reaction("🟢", ...)` (`:216`) failing after a successful removal commit leaves a stale 🟢 that makes the message look published when it isn't.

In every case staff get silence, and the ⚠️-retry contract doesn't fire even though the operation failed.
**Fix:** Two-tier handling: (a) wrap the pre-commit section (fetch/read/optimize) in a `try/except discord.HTTPException` that calls `self._surface_failure(message, "publicar")`; (b) wrap the post-commit bookkeeping (reactions/reply) in a tolerant `try/except` that logs loudly — the commit succeeded, so it must not surface as a publish failure, but a lost 🟢 must at least reach the log (and WR-02's commit-level dedupe makes a lost 🟢 harmless).

### WR-05: `_unpublish` pending path calls `remove_reaction("✅")` unguarded — `NotFound` aborts the dismiss

**File:** `../nocturna-bot/cogs/gallery.py:226-227`
**Issue:** The pending branch calls `await message.remove_reaction("✅", self.bot.user)` directly, while one line later the 🌙 cleanup correctly goes through the tolerant `_remove_own_reaction`. If the bot never added ✅ to that message (staff 🌙 on a text/non-image post — the live path never checks attachments before `_unpublish`; or the ✅ prompt was already dismissed once), Discord raises `NotFound`, the exception escapes the listener, and line 227's stale-🌙 cleanup never runs. During backfill the same throw is caught by the per-message wrapper but logs a spurious "reconcile failed" for what is a non-event.
**Fix:** Use the helper that exists for exactly this:
```python
await self._remove_own_reaction(message, "✅")
await self._remove_own_reaction(message, "🌙")
```

### WR-06: Deletion matches filenames with the loose split-parser while identification uses the strict regex — removal can match manually-committed files

**File:** `../nocturna-bot/core/github_publish.py:94-104` (loose) vs `../nocturna-bot/cogs/gallery.py:69-80` (strict); deletion at `github_publish.py:258-259, 266`
**Issue:** Two functions named `_entry_message_id` exist with different semantics. `gallery.py` uses a strict regex (`^\d{8}-(\d+)-\d+\.webp$`) precisely so "sample/manually-committed entries ... return None so the orphan reconcile can never touch them". But the function that actually **deletes files** — `_remove_sync` via `github_publish._entry_message_id` — just splits on `-` and compares segment `[1]`. Any manual entry whose second dash-segment happens to equal a published message's snowflake (e.g. `promo-1416329356426481717-final.png`) would be swept into that message's removal commit. The strict/loose asymmetry is exactly backwards: the destructive operation uses the weaker parser. The duplicated name across modules also invites future drift.
**Fix:** Move the strict regex into `github_publish.py` (it has no discord dependency), have `_remove_sync` use it, and re-export/import it in `gallery.py` so there is exactly one filename parser:
```python
_BOT_FILE_RE = re.compile(r"^\d{8}-(\d+)-\d+\.webp$")

def _entry_message_id(filename):
    m = _BOT_FILE_RE.match(filename or "")
    return m.group(1) if m else None
```

## Info

### IN-01: `publish_message`'s default `date` doesn't match the Phase-4 shape

**File:** `../nocturna-bot/core/github_publish.py:303-304`
**Issue:** The fallback `datetime.now(timezone.utc).isoformat()` yields `...+00:00` with microseconds, not the contract's millisecond-precision `Z` form the cog carefully builds (`gallery.py:162-163`). Dormant today (the cog always passes `date`), but it's a trap for any future caller.
**Fix:** Apply the same `timespec="milliseconds"` + `replace("+00:00", "Z")` normalization in the default, or require `date` and drop the default.

### IN-02: Cog reaches into the transport's private helper `_fetch_gallery`

**File:** `../nocturna-bot/cogs/gallery.py:386-387`
**Issue:** `github_publish._fetch_gallery(...)` is underscore-private; the cog calling it couples it to transport internals and bypasses the module's public async surface.
**Fix:** Export a public `async def fetch_gallery()` in `github_publish` that wraps the internal read with `asyncio.to_thread` (and benefits from CR-01/CR-02 fixes automatically).

### IN-03: Dead `if channel is None` branch — `fetch_channel` raises, it never returns `None`

**File:** `../nocturna-bot/cogs/gallery.py:318-322` (same pattern at `:139-140`)
**Issue:** `bot.fetch_channel` raises `NotFound`/`Forbidden` on failure, so the `or await ...` expression either yields a channel or throws; the `None` check at `:320` is unreachable and misleading about which failure path actually executes (the exception lands in `on_ready`'s catch-all instead).
**Fix:** Wrap the fetch in `try/except discord.HTTPException` and log the same warning there; delete the dead check.

### IN-04: Synchronous sqlite on the event loop per backfilled message; `with _get_conn()` never closes connections

**File:** `../nocturna-bot/core/db.py:7-10, 68-78`; `../nocturna-bot/cogs/gallery.py:334`
**Issue:** `db.set_cursor()` runs a blocking connect + write on the event loop for every message in the backfill scan. Also, `with sqlite3.connect(...) as conn` is a *transaction* context manager — it commits/rolls back but does not close; each call leaves closure to CPython refcount GC. Both are benign at current scale but are the standard sqlite-in-async pitfalls.
**Fix:** `await asyncio.to_thread(db.set_cursor, message.id)` in the backfill loop; use `contextlib.closing(_get_conn())` (or try/finally `conn.close()`) in the helpers.

### IN-05: No attachment size cap before download/optimize/blob upload

**File:** `../nocturna-bot/cogs/gallery.py:167-172`; `../nocturna-bot/core/github_publish.py:131-135`
**Issue:** `attachment.read()` loads the full file into RAM (Discord allows up to 500 MB with boosts); Pillow's pixel-bomb guard doesn't bound *file* size, and the Git blob API rejects very large payloads — the failure would surface late as a confusing ⚠️ after a big memory spike. Staff-gated, so not a security hole, but a cheap guard avoids the worst case.
**Fix:** Skip (or warn on) attachments over a sane cap before reading: `if attachment.size > 50 * 1024 * 1024: continue` with a log line.

### IN-06: deploy.yml — token embedded in push URL; heal-loop failure under `bash -e` turns the "non-blocking" verify step red

**File:** `.github/workflows/deploy.yml:55, 77-88`
**Issue:** (a) `git push "https://x-access-token:${GITHUB_TOKEN}@..."` puts the token on the command line/remote URL — Actions masks it in logs, but header-based auth (`git -c http.https://github.com/.extraheader="AUTHORIZATION: basic …"` as actions/checkout does, or a configured remote) avoids it appearing in process argv on the runner at all. (b) The verify step's default shell runs with `-e`; if a heal-loop `git commit`/`git push` fails transiently, the step (and run) fails even though the deploy in the previous step succeeded — contradicting the step's documented non-blocking intent.
**Fix:** (a) reuse the checkout credential or extraheader auth for both pushes; (b) guard the heal commands (`git push ... || echo "::warning::heal push failed"`) so only the deploy step itself can fail the run.

### IN-07: Config fail-fast for `WEBSITE_REPO` is dead code, and malformed `GALLERY_STAFF_ROLE_IDS` crashes at import with a raw traceback

**File:** `../nocturna-bot/config.py:58-60, 65`; `../nocturna-bot/bot.py:85-87`
**Issue:** (a) `WEBSITE_REPO` has a hardcoded truthy default, so `bot.py`'s `if not config.WEBSITE_REPO` check can never fire — a missing env var silently targets the default repo instead of failing fast like the comment claims. (b) A typo in `GALLERY_STAFF_ROLE_IDS` (e.g. `123,abc`) raises `ValueError` during `import config`, before any of `bot.py`'s friendly validation runs.
**Fix:** (a) default `WEBSITE_REPO` to `""` so the fail-fast check is live, or drop the check; (b) parse role ids defensively (`x.strip().isdigit()`) and let `bot.py` report the bad value.

### IN-08: Pre-existing (not Phase 5): unescaped LIKE wildcards in forum avatar queries

**File:** `../nocturna-bot/core/db.py:104, 141, 190`
**Issue:** Queries are correctly parameterized (no SQL injection), but the bound needle is used inside a `LIKE` pattern — an avatar name containing `%` or `_` matches unintended rows in `search_posts`/`rename_avatar`/`delete_avatar` (`delete_avatar('%')` would nuke broadly). Pre-existing forum code, out of Phase-5 scope; noted since the file was in review scope.
**Fix:** Escape `%`/`_` in the needle and add `ESCAPE '\'` to the LIKE clauses.

---

_Reviewed: 2026-07-04T15:43:53Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
