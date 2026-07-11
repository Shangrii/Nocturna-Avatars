---
phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse
verified: 2026-07-11T12:00:00Z
status: gaps_found
score: 7/10 must-haves verified
overrides_applied: 0
gaps:
  - truth: "The three-way merge, snapshot, and transport never clobber staff hand-edits (images/description stay 100% staff-owned; the sync never overwrites them) — the phase goal's central promise"
    status: failed
    reason: "core/github_publish.py's _sync_store_sync.build_tree (L593-601) ignores the freshly-fetched `cur` products entirely and always writes the cog's pre-computed `new_products` list. Because a full sync (list_all_products + one get_product per product) takes seconds-to-minutes, and JINXXY_DEPLOY.md explicitly instructs staff to run `/tienda medios` per newly-imported product immediately after the first sync, a concurrent attach_store_media commit made during that window is silently overwritten by the sync's stale pre-computed list — deleting the just-attached images/description. Separately, cogs/jinxxy.py only upserts the durable snapshot inside `if result['changed']:` (WR-03): when Jinxxy changes a field to a value staff already independently matched (merged==current, changed_fields empty), the snapshot is never advanced, so a LATER staff edit on that same field is misread as 'both changed' and Jinxxy silently reverts it. Additionally, three_way_merge with (snapshot present, current=None) — a product staff deleted from store.json while still live on Jinxxy — falls through to an empty `{}` (or partial) entry appended to products (WR-05), verified by tracing core/store_sync.py:116-142: `current = current or {}` produces `merged = {}`, and the write-guard `if field in merged or new_v is not None` skips every field because `current_v` is None for all of them. No test in tests/test_store_sync.py or tests/test_jinxxy_cog.py exercises any of these three paths — they are real, unmitigated, and directly contradict the phase-goal text 'so staff hand-edits are never clobbered' and the 09-04/09-06 must-have 'the sync never overwrites images/description'."
    artifacts:
      - path: "../nocturna-bot/core/github_publish.py"
        issue: "_sync_store_sync.build_tree (L593-601) discards the freshly-refetched `cur` and always writes the stale pre-computed products list; no re-graft of staff-owned fields from the live document"
      - path: "../nocturna-bot/cogs/jinxxy.py"
        issue: "_run_sync (L196-211) only upserts store_snapshot inside `if result['changed']:`, leaving a stale snapshot when live != snapshot but merged == current"
      - path: "../nocturna-bot/core/store_sync.py"
        issue: "three_way_merge (L116-142) has no explicit branch for (snapshot present, current=None); falls through to an empty/partial garbage merged entry"
    missing:
      - "Re-graft staff-owned fields (images, description, featured, license, details, updates, storefronts, id, editor) from the freshly-fetched `cur['products']` before writing in _sync_store_sync.build_tree, OR hold a single lock across the cog's whole read-merge-commit cycle so a concurrent attach cannot land inside the sync's window"
      - "Upsert the durable snapshot on every successful sync (not only when result['changed'] is True) so a matching-but-unflagged live change still advances the snapshot"
      - "An explicit (snapshot present, current=None) branch in three_way_merge — resurrect from live (like a new product) or explicitly drop it, but never emit an empty/partial dict into products"
  - truth: "The scheduled 6-12h poll reliably reads the storefront via the Creator API even when the Jinxxy API is under load"
    status: failed
    reason: "core/jinxxy_api.py's _retry_delay (L94-106) passes a raw Retry-After OR X-RateLimit-Reset header value straight into time.sleep() with no cap. Retry-After is a delta in seconds, but X-RateLimit-Reset is conventionally a unix-epoch timestamp; a 429 response carrying that header would compute a multi-decade sleep, permanently hanging the asyncio.to_thread call that runs inside the poll/command. There is no _MAX_BACKOFF or any bound of any kind. No test in tests/test_jinxxy_api.py exercises a large/epoch-valued hint (confirmed by grep — zero matches for 'X-RateLimit-Reset' or 'epoch' in the test file). This directly threatens the phase's 'scheduled 6-12h poll' automatic-sync promise: once triggered, the poll task never completes and the @_poll.error handler never fires (no exception is ever raised), so the scheduled cadence silently stops recovering until a manual bot restart."
    artifacts:
      - path: "../nocturna-bot/core/jinxxy_api.py"
        issue: "_retry_delay (L94-106) returns an unbounded server-controlled sleep duration; no _MAX_BACKOFF cap, no epoch-vs-delta distinction for X-RateLimit-Reset"
    missing:
      - "A _MAX_BACKOFF cap (e.g. 60s) clamping both the Retry-After and X-RateLimit-Reset branches, per the review's suggested fix"
      - "A test asserting a large/epoch-valued Retry-After or X-RateLimit-Reset header does not produce an unbounded sleep"
deferred: []
human_verification:
  - test: "Run a real /tienda sync (or wait for the poll) against the live Jinxxy Creator API with a real products_read key on the cinema host, and confirm store.json commits + the announce embed posts correctly end-to-end"
    expected: "New/changed/removed Jinxxy products propagate to src/data/store.json on the deployed site within one poll cycle or an immediate /tienda sync, and the Discord announce embed renders correctly in JINXXY_ANNOUNCE_CHANNEL_ID"
    why_human: "Requires a live Jinxxy API key, a running bot process on the cinema host, and a real Discord guild — the plan's own <verification> block explicitly defers this to the cinema-host deploy, not automated test coverage"
  - test: "Attach real images + description via /tienda medios to a freshly-synced product and confirm the card renders correctly on the deployed site (thumbnail, description, no layout shift)"
    expected: "The product card shows the staff-uploaded WebP images and bilingual description instead of the branded placeholder, with no broken links or images"
    why_human: "Requires a live Discord interaction, a real attachment upload, and visual confirmation on the deployed GitHub Pages site — not verifiable via grep/unit tests"
---

# Phase 09: Jinxxy Store Auto-Sync Verification Report

**Phase Goal:** New Jinxxy uploads appear in the website asset store automatically: a `JinxxyCog` in `nocturna-bot` reads the storefront via the Creator API (scheduled 6–12h poll + staff `/tienda sync`), maps each product, three-way-merges it against a durable snapshot + the live `store.json` so staff hand-edits are never clobbered, and commits `store.json` cross-repo (preserving `_comment`) — adding new products, propagating price/name/category/nsfw/date changes, and removing delisted ones. Because the Creator API exposes no images or descriptions (live probe D-14), those two staff-owned fields are supplied through a Discord attach flow (`/tienda medios`); until supplied the card shows the branded placeholder. Store updates are announced Spanish-first; errors go to logs only (D-05).

**Verified:** 2026-07-11T12:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `JinxxyCog` reads the storefront via the Creator API on a 6-12h poll + staff `/tienda sync` | ✓ VERIFIED | `cogs/jinxxy.py` `@tasks.loop(hours=config.JINXXY_POLL_HOURS)` (L216), `/tienda sync` app_command (L234-270), both delegate to `_run_sync`. Full suite: 313 passed. |
| 2 | Each product is mapped from API-available fields only (name, price, checkoutUrl, category, nsfw, date, editor) | ✓ VERIFIED | `core/store_sync.py::map_product` (L41-64) builds exactly the sync-owned field set from `detail`; 24 unit tests in `tests/test_store_sync.py` pin key-set purity, nsfw/category defaults, checkoutUrl construction |
| 3 | The three-way merge / snapshot / transport never clobber staff hand-edits — images/description stay 100% staff-owned, the sync never overwrites them | ✗ FAILED | See gap #1. `github_publish._sync_store_sync.build_tree` discards the freshly-fetched current products and always writes a stale pre-computed list, silently overwriting a concurrently-attached `/tienda medios` commit made during a (documented, expected) multi-minute first sync window. Snapshot-staleness (WR-03) and deleted-current corruption (WR-05) compound this. |
| 4 | `store.json` is committed cross-repo preserving `_comment` and staff top-level keys | ✓ VERIFIED | `core/github_publish.py` `build_tree` copies `dict(cur)` and mutates only `products` (sync) or one product's fields (attach); `tests/test_store_publish.py` has a load-bearing `_comment`-survives assertion, all passing |
| 5 | New products are added, price/name/category/nsfw/date changes propagate, delisted products are removed | ✓ VERIFIED (with a known corruption edge case) | `core/store_sync.py::reconcile_store` computes `added`/`updated`/`removed` correctly and is branch-tested (24 tests); the deleted-current-entry edge case (WR-05, gap #1) can append a garbage `{}`/partial entry instead of cleanly resurrecting or dropping |
| 6 | A transient Jinxxy API failure aborts the sync with no removals (removal-safety) | ✓ VERIFIED | `list_all_products`/`get_product`/`get_me` raise `JinxxyAPIError` on any failure (never `[]`); `_run_sync`'s enumeration happens before any `sync_store`/`delete_store_snapshot` call; `test_run_sync_api_failure_aborts_no_removal_no_commit` passes |
| 7 | The scheduled poll reliably reads the storefront even under Jinxxy API load/rate-limiting | ✗ FAILED | See gap #2. `core/jinxxy_api.py::_retry_delay` (L94-106) has no cap; an epoch-valued `X-RateLimit-Reset` on a 429 produces an effectively-unbounded `time.sleep()`, permanently hanging the sync with no error ever raised to trigger the poll's error-restart path. Untested. |
| 8 | Store updates are announced Spanish-first in `JINXXY_ANNOUNCE_CHANNEL_ID`; no-change syncs are silent; errors log-only, never Discord | ⚠️ PARTIAL (see anti-pattern below) | `_announce` correctly gates on `result['changed']` and every failure path is `log.exception` only (D-05 verified, test-covered); HOWEVER `on_ready`'s run-once startup reconcile and the poll's own immediate first tick (`tasks.loop` runs its first iteration right after `before_loop` completes) both call `_run_sync` independently on every boot, so a first deploy (or any restart with pending changes) posts the "Tienda actualizada" embed twice. See CR-01 in Anti-Patterns. |
| 9 | Staff attach images + bilingual description via `/tienda medios`; until supplied the card shows the branded placeholder + empty description | ✓ VERIFIED | `cogs/jinxxy.py::medios` (L273-347) staff-gated, optimizes to WebP off-thread, calls `attach_store_media` once; `StorePage.astro` L71-78 structural filter (verified in website repo) requires `id`/`name`/`description` objects — the 09-03 new-product seed (`description: {es:"",en:""}`, string `id`) satisfies it; `ProductCard.astro` L44 falls back to `/store/placeholder.svg` (file confirmed present at `public/store/placeholder.svg`) |
| 10 | Config/env/db surface: `JINXXY_API_KEY`/`JINXXY_ANNOUNCE_CHANNEL_ID`/`JINXXY_POLL_HOURS`/`WEBSITE_STORE_JSON`/`WEBSITE_STORE_IMAGE_DIR`/`JINXXY_STAFF_ROLE_IDS` + durable `store_snapshot` table + bot.py fail-fast + deploy docs | ✓ VERIFIED | `config.py` L105-118 all six constants present with documented defaults; `bot.py` L48/L111-112 load_extension + fail-fast; `core/db.py` L349-406 `init_store_state`/`get_store_snapshot`/`upsert_store_snapshot`/`delete_store_snapshot` all `?`-placeholder; `.env.example` L65-70 documents every var, key blank; `JINXXY_DEPLOY.md` documents env, restart, mandatory key rotation |

**Score:** 7/10 truths verified (2 failed as BLOCKER gaps, 1 partial/warning)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `../nocturna-bot/config.py` | Jinxxy env block | ✓ VERIFIED | L105-118, all 6 constants present |
| `../nocturna-bot/core/db.py` | `store_snapshot` table + CRUD | ✓ VERIFIED | L344-406, `?`-placeholder only |
| `../nocturna-bot/.env.example` | Jinxxy env docs | ✓ VERIFIED | L65-70 |
| `../nocturna-bot/core/jinxxy_api.py` | Creator API read client | ⚠️ VERIFIED w/ defect | `list_all_products`/`get_product`/`get_me` present and tested; `_retry_delay` unbounded (gap #2) |
| `../nocturna-bot/core/store_sync.py` | pure mapper + merge + reconcile | ⚠️ VERIFIED w/ defect | All functions present, 24 tests pass; deleted-current branch produces garbage entries (gap #1) |
| `../nocturna-bot/core/github_publish.py` | object-aware store transport | ⚠️ VERIFIED w/ defect | `_fetch_store`/`sync_store`/`attach_store_media` present, 16 tests pass; `build_tree` ignores fresh `cur` (gap #1) |
| `../nocturna-bot/cogs/jinxxy.py` | `JinxxyCog` controller + `/tienda sync` + `/tienda medios` | ⚠️ VERIFIED w/ defects | All commands present and staff-gated; on_ready + poll double-run (CR-01); snapshot only upserted on changed=True (gap #1) |
| `../nocturna-bot/bot.py` | load_extension + fail-fast | ✓ VERIFIED | L48, L111-112 |
| `../nocturna-bot/JINXXY_DEPLOY.md` | deploy checklist | ✓ VERIFIED | env vars, restart steps, rotation reminder, first-run flow — but documents on_ready as "the" startup reconcile, unaware the poll's own first tick also fires (reflects CR-01 in the docs too) |
| `../nocturna-bot/tests/*` | test coverage for the above | ✓ VERIFIED (with gaps) | 313 passed, 0 failed; but zero tests cover the CR-01 interaction, the CR-02 epoch-hint case, or the WR-05 deleted-current merge branch |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `cogs/jinxxy.py::_run_sync` | `core.jinxxy_api.list_all_products` | full enumeration before any removal | ✓ WIRED | L166, raises before `sync_store`/`delete_store_snapshot` |
| `cogs/jinxxy.py::_run_sync` | `core.github_publish.sync_store` | commit only when `reconcile.changed` | ✓ WIRED | L196-197 |
| `cogs/jinxxy.py::medios` | `core.github_publish.attach_store_media` | optimized webp bytes + description | ✓ WIRED | L336 |
| `cogs/jinxxy.py::_optimize_attachments` | `core.image_optimize.optimize_to_webp` | attachment bytes → webp | ✓ WIRED | L100 |
| `core/github_publish.py::sync_store` | live `store.json` state | re-fetch before write (staff-edit preservation) | ✗ NOT_WIRED | `build_tree(cur)` receives the fresh fetch but never reads it for `products` — see gap #1 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `store.json.products` (via `sync_store`) | `result["products"]` | `store_sync.reconcile_store` merging live Jinxxy data + DB snapshot + current store.json | Partially — correct on the happy path, but the WR-01/WR-03/WR-05 paths above inject stale or corrupt data | ⚠️ HOLLOW on the concurrent-attach / deleted-current paths |
| Product card `images`/`description` | `attach_store_media` write | staff Discord attachment + description params | Yes, on the happy path | ⚠️ HOLLOW — can be silently reverted by a concurrent sync (gap #1) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full bot test suite | `cd ../nocturna-bot && python -m pytest -q` | `313 passed, 2 warnings` | ✓ PASS |
| No debt markers in phase-modified files | `grep -n -E "TBD\|FIXME\|XXX\|TODO\|HACK\|PLACEHOLDER" cogs/jinxxy.py core/store_sync.py core/jinxxy_api.py core/github_publish.py core/db.py config.py JINXXY_DEPLOY.md` | no matches | ✓ PASS |
| `_sync_store_sync.build_tree` re-grafts staff fields from fresh `cur` | source read | confirmed absent (L593-601 writes `new_products` unconditionally) | ✗ FAIL (gap #1) |
| `_retry_delay` caps the 429 backoff hint | source read | confirmed absent (L94-106, no `_MAX_BACKOFF`) | ✗ FAIL (gap #2) |
| `on_ready` + poll's first tick both invoke `_run_sync` on boot | source read + `tasks.loop` semantics (before_loop → immediate first iteration) | confirmed: two independent call sites, no shared guard | ✗ FAIL (CR-01, warning) |

### Probe Execution

Not applicable — no `scripts/*/tests/probe-*.sh` probes declared for this phase; verification relies on the bot repo's pytest suite plus direct source inspection.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| STORE-SYNC-01 | 09-01, 09-02, 09-03, 09-04, 09-05 | JinxxyCog mirrors store.json via scheduled poll + `/tienda sync`, three-way merge never overwriting staff edits, commits cross-repo preserving `_comment`, announces, errors log-only | ✗ BLOCKED | Core mechanics (enumerate/map/reconcile/commit/announce) are implemented and tested, but the explicit "never overwrites staff-edited fields" / "staff hand-edits are never clobbered" clause is violated by the confirmed WR-01/WR-03/WR-05 defects, and the "scheduled poll" reliability is threatened by the unbounded CR-02 backoff |
| STORE-SYNC-02 | 09-06 | Staff supply images/description via `/tienda medios`; sync never overwrites them; placeholder until supplied | ✗ BLOCKED (shared root cause) | The `/tienda medios` command itself is correctly implemented and tested (autocomplete gate, optimize, one atomic commit) — but the "sync never overwrites them" half of this requirement is broken by the same WR-01 defect in `_sync_store_sync`, since a sync running concurrently with (or shortly after) an attach can revert the just-attached `images`/`description` |

No orphaned requirements — both STORE-SYNC-01 and STORE-SYNC-02 are declared in plan frontmatter and map to REQUIREMENTS.md entries at lines 83-84.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `../nocturna-bot/core/github_publish.py` | 593-601 | `build_tree(cur)` ignores the freshly-fetched `cur["products"]`, always writes stale pre-computed `new_products` | 🛑 Blocker | Concurrent `/tienda medios` commits can be silently reverted by a sync — violates the phase's central staff-protection promise (gap #1) |
| `../nocturna-bot/cogs/jinxxy.py` | 196-211 | `db.upsert_store_snapshot` loop runs only inside `if result["changed"]:` | 🛑 Blocker | A "both matched, no flagged change" cycle leaves the snapshot stale, causing a LATER staff edit on the same field to be misread as a conflict and reverted by Jinxxy (gap #1, WR-03) |
| `../nocturna-bot/core/store_sync.py` | 116-142 | `three_way_merge(snapshot, live, current=None)` has no explicit branch; falls through to an empty/partial `merged` dict | 🛑 Blocker | Staff manually deleting a still-live product from `store.json` corrupts `products` with a garbage entry on the next changed sync (gap #1, WR-05) |
| `../nocturna-bot/core/jinxxy_api.py` | 94-106 | `_retry_delay` has no upper bound on the 429 backoff hint | 🛑 Blocker | An epoch-valued `X-RateLimit-Reset` header produces a multi-decade `time.sleep()`, permanently hanging the sync with no recovery path (gap #2) |
| `../nocturna-bot/cogs/jinxxy.py` | 117-146, 216-224 | `on_ready` and the poll's own immediate first tick both call `_run_sync` independently on every boot | ⚠️ Warning | Duplicate full sync + duplicate public announce embed on every restart that has changes (deterministic on first deploy); doubles Jinxxy API load, compounding the CR-02 risk |
| `../nocturna-bot/cogs/jinxxy.py` | 227-231 | `_on_poll_error` calls `self._poll.restart()` with no cool-down | ⚠️ Warning | A persistent outage becomes a tight retry hammer against both APIs instead of respecting the 6-12h cadence |
| `../nocturna-bot/cogs/jinxxy.py` | 160-162 | `store_username = me.get("username") or ""` tolerates a missing username | ⚠️ Warning | A malformed-but-2xx `/me` response silently rewrites every `checkoutUrl` key at once, mass-"removing" and mass-"adding" the whole store with broken double-slash links |
| `../nocturna-bot/cogs/jinxxy.py` | 185-189 | `current_by_key` silently drops products with an unusable/missing `checkoutUrl` | ⚠️ Warning | A hand-added product with a typo'd key is silently deleted from the repo on the next changed sync |
| `../nocturna-bot/cogs/jinxxy.py` | 322-323, `core/image_optimize.py:40` | Only `discord.HTTPException`/`GitHubPublishError` are caught around `/tienda medios` attachment processing | ⚠️ Warning | A non-image or decompression-bomb attachment raises unhandled, leaving the deferred interaction hanging with no staff feedback |
| `../nocturna-bot/cogs/jinxxy.py` | 252-259 | `/tienda sync`'s except clause is `(GitHubPublishError, JinxxyAPIError)` only | ⚠️ Warning | A `map_product` `KeyError`/`TypeError` on a malformed detail record isn't caught, hanging the deferred interaction |
| `../nocturna-bot/cogs/jinxxy.py` | 404 | `channel.send(...)` in `_announce` isn't wrapped in try/except | ⚠️ Warning | `discord.Forbidden`/`HTTPException` on the announce channel propagates, contradicting `_announce`'s own "logged and skipped — never raised" docstring |

No `TBD`/`FIXME`/`XXX` unreferenced debt markers found in any phase-modified file.

### Human Verification Required

### 1. Live end-to-end sync against the real Jinxxy Creator API

**Test:** Deploy to cinema, run `/tienda sync` (or wait for the poll) with a real `products_read` key and confirm `store.json` commits.
**Expected:** New/changed/removed Jinxxy products propagate to the deployed site within one poll cycle, and the announce embed posts correctly.
**Why human:** Requires a live API key, a running production bot process, and a real Discord guild — the plan's own `<verification>` block explicitly defers this to the cinema-host deploy.

### 2. Visual confirmation of `/tienda medios` attach flow on the live site

**Test:** Attach real images + description to a freshly-synced product via `/tienda medios` and view the resulting card on the deployed site.
**Expected:** The card renders the staff-uploaded images/description correctly, no broken links, no layout shift.
**Why human:** Requires a live Discord interaction, a real image upload, and visual confirmation on GitHub Pages.

### Gaps Summary

The Phase 9 implementation is substantively complete and well-tested on the happy path (313/313 bot tests pass, all six plans' declared artifacts exist, the pure merge core and the object-aware transport are each independently well-covered), but the code review's two Critical and several Warning findings are **confirmed present and unaddressed** in the current codebase — verified directly by reading the source, not just trusting the review report.

The most serious gap is that the phase's own headline promise — "so staff hand-edits are never clobbered" — is demonstrably false under the exact operational workflow the phase's own deploy documentation instructs staff to follow: `JINXXY_DEPLOY.md` tells staff to run `/tienda medios` per newly-imported product immediately after the first full sync, and `core/github_publish.py::_sync_store_sync` unconditionally overwrites the whole `products` array with a stale pre-computed list that ignores whatever the live `store.json` looked like at commit time — including any staff attachment that landed in that window. Two related merge/snapshot defects (a stale snapshot that later causes Jinxxy to revert an already-matching staff edit, and a deleted-current-entry case that injects a garbage `{}`/partial product) compound the same "staff work can be silently lost" risk.

The second blocker is an unbounded `time.sleep()` in the 429 backoff path (`core/jinxxy_api.py::_retry_delay`) that can hang the scheduled poll indefinitely on a single rate-limited response carrying an epoch-valued `X-RateLimit-Reset` header — directly threatening the "automatic" scheduled-poll half of the phase goal for any storefront large enough to approach Jinxxy's 120 req/min limit during a full enumeration.

A third, lower-severity issue (duplicate startup sync + duplicate public announce on every restart with changes, `CR-01`) is a real, confirmed defect but does not corrupt data (the transport's no-op guard catches the resulting redundant commit) — it is downgraded to a warning, though it compounds the CR-02 risk by doubling API calls on every boot.

None of these gaps are visual/UX items requiring only human judgment — they are structural code defects, verifiable by direct source inspection, and none of the 313 passing tests exercise the failure paths that expose them.

---

_Verified: 2026-07-11T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
