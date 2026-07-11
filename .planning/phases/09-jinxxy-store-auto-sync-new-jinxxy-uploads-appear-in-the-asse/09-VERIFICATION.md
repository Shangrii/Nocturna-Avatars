---
phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse
verified: 2026-07-11T13:00:00Z
status: gaps_found
score: 10/11 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 7/10
  gaps_closed:
    - "The three-way merge, snapshot, and transport never clobber staff hand-edits (WR-01 concurrent-attach re-graft + WR-05 deleted-current resurrection) — old gap #1"
    - "The scheduled 6-12h poll reliably reads the storefront under Jinxxy API load (CR-02 unbounded 429 backoff, now clamped to 60s, epoch-aware) — old gap #2"
  gaps_remaining: []
  regressions:
    - "NEW: the WR-03 fix (09-09) moved the durable-snapshot upsert to run unconditionally, but placed it BEFORE github_publish.sync_store instead of after. A transient GitHub transport failure (retry budget exhausted, network outage) now leaves the snapshot advanced past a store.json that was never actually written, permanently masking that Jinxxy field update on every future cycle (misread as 'Jinxxy unchanged, staff edit wins'). Confirmed by direct source read of cogs/jinxxy.py:195-217 (step 5 runs before step 6) and by the fresh 09-REVIEW.md CR-01 finding. Zero tests exercise sync_store raising inside _run_sync after the snapshot upsert loop."
gaps:
  - truth: "New products are added, price/name/category/nsfw/date changes propagate reliably (including across a transient GitHub commit failure), and delisted products are removed"
    status: failed
    reason: "cogs/jinxxy.py::_run_sync (L195-217, confirmed by direct read) advances db.upsert_store_snapshot for every live product (step 5) BEFORE calling github_publish.sync_store (step 6). If sync_store raises GitHubPublishError (retry budget exhausted on a 409/422 conflict storm, or any network failure) after a genuine Jinxxy field change was detected, the snapshot is already at the new value while store.json still holds the old one. The next sync cycle's three_way_merge (core/store_sync.py:134-135) then sees live_v == snap_v and treats the field as 'Jinxxy unchanged, keep current (staff edit wins)', permanently dropping the update — the storefront never receives that price/name/category/nsfw/date change until Jinxxy changes the SAME field again. This is a regression introduced by the 09-09 gap-closure plan (which correctly moved the snapshot upsert out of the `if result['changed']` guard per WR-03, but did not also move it after the commit). It directly contradicts STORE-SYNC-01's 'each change is committed cross-repo... while errors go to logs only' — an error should cause a retry next cycle, not a silent permanent loss. Confirmed via the fresh 09-REVIEW.md CR-01 (second-pass) finding, independently re-traced against the current source, not merely trusted from the review report. No test in tests/test_jinxxy_cog.py wires sync_store to raise after a changed=True reconcile (confirmed by reading test_run_sync_no_change_still_advances_snapshot and test_run_sync_api_failure_aborts_no_removal_no_commit — neither covers this path); full suite still reports 337 passed because the failure path is untested, not because it's absent."
    artifacts:
      - path: "../nocturna-bot/cogs/jinxxy.py"
        issue: "_run_sync (L195-217): step 5 (unconditional db.upsert_store_snapshot loop) executes before step 6 (github_publish.sync_store, gated on result['changed']). A failed step 6 leaves the snapshot ahead of the actually-committed store.json."
    missing:
      - "Reorder so the commit (github_publish.sync_store, gated on changed) runs BEFORE the unconditional snapshot upsert loop, so a raise from sync_store skips the snapshot advance and the change is naturally retried on the next cycle (the fix already sketched in 09-REVIEW.md CR-01)"
      - "A regression test that wires github_publish.sync_store to raise inside _run_sync and asserts the durable snapshot was NOT advanced for the changed field(s), so the next cycle still reports changed=True and retries"
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

**Verified:** 2026-07-11T13:00:00Z
**Status:** gaps_found
**Re-verification:** Yes — after gap-closure plans 09-07..09-10

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `JinxxyCog` reads the storefront via the Creator API on a 6-12h poll + staff `/tienda sync` | ✓ VERIFIED | `cogs/jinxxy.py` `@tasks.loop(hours=config.JINXXY_POLL_HOURS)` (L222), `/tienda sync` app_command (L242-282), both delegate to `_run_sync`. Unchanged from initial verification. |
| 2 | Each product is mapped from API-available fields only (name, price, checkoutUrl, category, nsfw, date, editor) | ✓ VERIFIED | `core/store_sync.py::map_product` unchanged; 24+ unit tests in `tests/test_store_sync.py` pin key-set purity |
| 3 | The three-way merge / snapshot / transport never clobber staff hand-edits — images/description stay 100% staff-owned | ✓ VERIFIED (gap closed) | `core/github_publish.py::_sync_store_sync.build_tree` (L609-629) now re-grafts `STAFF_OWNED + editor` keys from the freshly-fetched `cur["products"]` onto every pre-computed product before writing (WR-01, 09-07). `core/store_sync.py::three_way_merge` (L120-124) resurrects a COMPLETE entry (with generated `id` + empty `description` object) whenever `current is None`, covering both new products and staff-deleted-while-live products — never an empty/partial `{}` (WR-05, 09-07). Both pinned by new tests in `test_store_publish.py`/`test_store_sync.py`, part of the 337-passing suite. |
| 4 | `store.json` is committed cross-repo preserving `_comment` and staff top-level keys | ✓ VERIFIED | `build_tree` copies `dict(cur)` and mutates only `products`; unchanged, still passing |
| 5 | New products are added, price/name/category/nsfw/date changes propagate reliably (incl. across a transient GitHub commit failure), delisted products are removed | ✗ FAILED (NEW regression) | `cogs/jinxxy.py::_run_sync` (L195-217) now advances the durable snapshot for EVERY live product (step 5) BEFORE the commit (step 6, `github_publish.sync_store`, gated on `changed`). A `GitHubPublishError` from step 6 leaves the snapshot ahead of the uncommitted `store.json`; the next cycle's `three_way_merge` reads `live == snapshot` and silently drops the update forever. See gap below (new CR-01, second-pass review). |
| 6 | A transient Jinxxy **API** (enumeration) failure aborts the sync with no removals (removal-safety) | ✓ VERIFIED | `get_me`/`list_all_products`/`get_product` raise before any commit/snapshot-write; `test_run_sync_api_failure_aborts_no_removal_no_commit` passes. Distinct failure surface from truth #5 (that one is a GitHub-transport failure occurring AFTER the Jinxxy read succeeds). |
| 7 | The scheduled poll reliably reads the storefront even under Jinxxy API load/rate-limiting (429 backoff) | ✓ VERIFIED (gap closed) | `core/jinxxy_api.py::_retry_delay` (L97-124) clamps every branch to `_MAX_BACKOFF=60.0s`; `X-RateLimit-Reset` converted epoch→delta before clamping (CR-02, 09-08); 6 new tests in `tests/test_jinxxy_api.py`. **Residual warning (not a blocker):** `list_all_products`'s pagination loop (L159-182) has no page cap — a malformed/hostile `page_count` could still loop indefinitely; see WR-02 (second-pass) below. |
| 8 | Store updates announced Spanish-first once per real change; no-change syncs silent; errors log-only, never Discord | ✓ VERIFIED (gap closed) | The old duplicate `on_ready` + poll-first-tick double-run is gone — `on_ready`/`_synced_once` deleted, pinned by `test_no_on_ready_listener_defined`/`test_no_synced_once_flag` (CR-01, 09-09). `_announce`'s `channel.send` now wrapped in `try/except discord.HTTPException` (WR-09, 09-10). **Residual warning (not a blocker):** no `asyncio.Lock` serializes the poll tick against a concurrent staff `/tienda sync`, so an overlapping manual trigger could still double-announce; see WR-01 (second-pass) below. |
| 9 | Staff attach images + bilingual description via `/tienda medios`; until supplied the card shows the branded placeholder + empty description | ✓ VERIFIED | `cogs/jinxxy.py::medios` unchanged in shape; WR-07 (bad/bomb attachment) and WR-08 (malformed detail record) now guard broadly with `except Exception` (09-10), pinned by `test_medios_bomb_attachment_does_not_raise`/`test_sync_command_mapping_error_is_ephemeral_never_announced` |
| 10 | Config/env/db surface: `JINXXY_API_KEY`/`JINXXY_ANNOUNCE_CHANNEL_ID`/`JINXXY_POLL_HOURS`/`WEBSITE_STORE_JSON`/`WEBSITE_STORE_IMAGE_DIR`/`JINXXY_STAFF_ROLE_IDS` + durable `store_snapshot` table + `bot.py` fail-fast + deploy docs | ✓ VERIFIED | `config.py` L105-118 unchanged; `bot.py` L48 `load_extension("cogs.jinxxy")` unchanged |
| 11 | Malformed input to `/tienda medios` (non-image/decompression-bomb) or `/tienda sync` (malformed Jinxxy detail) yields a graceful ephemeral error, never a hung deferred interaction | ✓ VERIFIED (gap closed) | `medios`'s `_optimize_attachments` call now wrapped in `except Exception` (L340-347, WR-07); `sync`'s guard broadened to `except Exception` (L260-272, WR-08); both pinned by tests in the 337-passing suite (09-10) |

**Score:** 10/11 truths verified (1 failed — a new regression surfaced by the fresh code review, not present in the original 09-01..09-06 plans)

### Deferred Items

None.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `../nocturna-bot/config.py` | Jinxxy env block | ✓ VERIFIED | Unchanged, L105-118 |
| `../nocturna-bot/core/db.py` | `store_snapshot` table + CRUD | ✓ VERIFIED | Unchanged |
| `../nocturna-bot/.env.example` | Jinxxy env docs | ✓ VERIFIED | Unchanged |
| `../nocturna-bot/core/jinxxy_api.py` | Creator API read client | ✓ VERIFIED | `_retry_delay` now capped (CR-02 closed); pagination loop still uncapped (WR-02, warning) |
| `../nocturna-bot/core/store_sync.py` | pure mapper + merge + reconcile | ✓ VERIFIED | `three_way_merge` current-is-None branch now resurrects a complete entry (WR-05 closed) |
| `../nocturna-bot/core/github_publish.py` | object-aware store transport | ✓ VERIFIED | `build_tree` re-grafts staff-owned fields from fresh `cur` (WR-01 closed) |
| `../nocturna-bot/cogs/jinxxy.py` | `JinxxyCog` controller + `/tienda sync` + `/tienda medios` | ⚠️ VERIFIED w/ NEW defect | on_ready duplicate closed (old CR-01); WR-07/08/09 closed; **but** `_run_sync`'s snapshot-before-commit ordering (new CR-01, second-pass) is an unresolved defect — see gap |
| `../nocturna-bot/bot.py` | load_extension + fail-fast | ✓ VERIFIED | Unchanged |
| `../nocturna-bot/JINXXY_DEPLOY.md` | deploy checklist | ✓ VERIFIED | Present, unchanged in scope |
| `../nocturna-bot/tests/*` | test coverage for the above | ⚠️ VERIFIED (with a gap) | 337 passed, 0 failed (up from 313); but zero tests cover `sync_store` raising after a changed reconcile inside `_run_sync` — the exact path that exposes the new regression |
| `../nocturna-bot/09-REVIEW.md` | fresh code review after gap closure | ✓ VERIFIED (committed) | Confirms all 11 first-pass findings closed; surfaces 1 new critical (CR-01 second-pass) + 2 new warnings (WR-01/WR-02 second-pass) + 6 info items |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `cogs/jinxxy.py::_run_sync` | `core.jinxxy_api.list_all_products` | full enumeration before any removal | ✓ WIRED | Unchanged, still raises before any write |
| `cogs/jinxxy.py::_run_sync` | `core.github_publish.sync_store` | commit only when `reconcile.changed` | ⚠️ WIRED but MIS-ORDERED | L214-217: commit is correctly gated on `changed`, but the snapshot upsert loop (L199-210) that should logically follow a SUCCESSFUL commit runs BEFORE it — see gap |
| `cogs/jinxxy.py::medios` | `core.github_publish.attach_store_media` | optimized webp bytes + description | ✓ WIRED | Unchanged |
| `core/github_publish.py::sync_store` | live `store.json` state | re-fetch before write (staff-edit preservation) | ✓ WIRED (gap closed) | `build_tree(cur)` now re-grafts `STAFF_OWNED + editor` from the fresh `cur` (WR-01 closed) |
| `cogs/jinxxy.py::_run_sync` step 5 (snapshot upsert) | `cogs/jinxxy.py::_run_sync` step 6 (commit) | ordering dependency | ✗ NOT_WIRED (wrong order) | Snapshot advance has no dependency on commit success — should run AFTER a successful `sync_store`, currently runs unconditionally before it |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `store.json.products` (via `sync_store`) | `result["products"]` | `store_sync.reconcile_store` merging live Jinxxy data + DB snapshot + current store.json | Yes on the happy path; the staff-ownership paths (WR-01/WR-05) are now correct | ✓ FLOWING for staff-owned fields |
| Durable `store_snapshot` DB rows | `db.upsert_store_snapshot` | `_run_sync` step 5, unconditional on every live product | Advances even when the paired commit (step 6) subsequently fails | ⚠️ STATIC/STALE-INDUCING — the snapshot can now describe a state `store.json` never reached, corrupting the NEXT cycle's diff (new regression) |
| Product card `images`/`description` | `attach_store_media` write | staff Discord attachment + description params | Yes, protected by the WR-01 re-graft even against a concurrent sync | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full bot test suite | `cd ../nocturna-bot && python -m pytest -q` | `337 passed, 2 warnings` | ✓ PASS |
| No debt markers in phase-modified files | `grep -n -E "TBD\|FIXME\|XXX\|TODO\|HACK\|PLACEHOLDER" cogs/jinxxy.py core/store_sync.py core/jinxxy_api.py core/github_publish.py core/db.py config.py JINXXY_DEPLOY.md` | no matches | ✓ PASS |
| `build_tree` re-grafts staff fields from fresh `cur` | source read (`core/github_publish.py:609-629`) | confirmed present | ✓ PASS |
| `three_way_merge` resurrects complete entry on `current is None` | source read (`core/store_sync.py:120-124`) | confirmed present | ✓ PASS |
| `_retry_delay` caps every 429 backoff branch | source read (`core/jinxxy_api.py:97-124`) | confirmed present, `_MAX_BACKOFF` on all 3 branches | ✓ PASS |
| `_run_sync` step ordering: snapshot upsert vs commit | source read (`cogs/jinxxy.py:195-217`) | confirmed: snapshot upsert (L199-210) precedes commit (L214-217) | ✗ FAIL (new regression, confirmed independently of 09-REVIEW.md) |
| `list_all_products` pagination has a page cap | source read (`core/jinxxy_api.py:159-182`) | confirmed absent — no `_MAX_PAGES` | ✗ FAIL (WR-02 second-pass, warning-level) |
| No mutual exclusion (`asyncio.Lock`) around `_run_sync` | source read (`cogs/jinxxy.py`, full file) | confirmed absent — no `self._sync_lock` anywhere | ✗ FAIL (WR-01 second-pass, warning-level) |

### Probe Execution

Not applicable — no `scripts/*/tests/probe-*.sh` probes declared for this phase; verification relies on the bot repo's pytest suite (337 passed) plus direct source inspection of every file the fresh review flagged.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| STORE-SYNC-01 | 09-01, 09-02, 09-03, 09-04, 09-05, 09-07, 09-08, 09-09 | JinxxyCog mirrors store.json via scheduled poll + `/tienda sync`, three-way merge never overwriting staff edits, commits cross-repo preserving `_comment`, announces, errors log-only | ✗ BLOCKED | The staff-hand-edit-protection clause (old gap #1) and the scheduled-poll-reliability clause (old gap #2) are now both satisfied. But a NEW defect introduced by the 09-09 closure (snapshot-before-commit ordering) breaks the "propagating changes to the sync-owned fields" clause: a transient GitHub transport failure now permanently drops a legitimate Jinxxy field update instead of retrying it next cycle, and "errors go to logs only" is contradicted by that error causing a silent, unrecoverable data-loss side effect rather than a clean no-op retry |
| STORE-SYNC-02 | 09-06, 09-10 | Staff supply images/description via `/tienda medios`; sync never overwrites them; placeholder until supplied | ✓ SATISFIED (gap closed) | `/tienda medios` is correctly implemented and tested; the "sync never overwrites them" half — previously blocked by the shared WR-01 defect — is now protected by `build_tree`'s re-graft of staff-owned fields from the fresh fetch. WR-07/WR-08 error-handling hardening (09-10) is unrelated to but reinforces this requirement's command-reliability surface. No open defect touches staff-owned fields. |

No orphaned requirements — both STORE-SYNC-01 and STORE-SYNC-02 are declared in plan frontmatter (09-01..09-10) and map to REQUIREMENTS.md entries at lines 83-84.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `../nocturna-bot/cogs/jinxxy.py` | 195-217 | Durable-snapshot upsert loop (step 5) runs unconditionally BEFORE the gated commit (step 6, `github_publish.sync_store`) | 🛑 Blocker | A transient GitHub transport failure leaves the snapshot ahead of the never-committed `store.json`; the next cycle's three-way merge misreads the un-committed Jinxxy field change as "Jinxxy unchanged, staff edit wins" and silently, permanently drops it (new CR-01, second-pass review; confirmed independently by direct source read) |
| `../nocturna-bot/cogs/jinxxy.py` | 135, 222-225, 259-261 | No `asyncio.Lock` / mutual exclusion between the `_poll` tick and `/tienda sync` — both call `_run_sync()` concurrently-reachable | ⚠️ Warning | An overlapping manual trigger during a slow poll cycle can double-announce and interleave snapshot upserts, compounding the CR-01 window (WR-01, second-pass) |
| `../nocturna-bot/core/jinxxy_api.py` | 159-183 | `list_all_products` pagination loop is bounded only by a server-supplied `page_count`, no `_MAX_PAGES` sanity cap or empty-page short-circuit | ⚠️ Warning | A buggy/hostile `page_count` value could drive an effectively unbounded loop inside `asyncio.to_thread`, hanging the sync with no cadence recovery (WR-02, second-pass) |
| `../nocturna-bot/core/github_publish.py` | 200-239 vs 152-188 | `_fetch_json_object` duplicates ~25 lines of `_fetch_json` | ℹ️ Info | Future fixes to the Contents-API read path must land in two places (IN-01) |
| `../nocturna-bot/core/github_publish.py` | 662-682 | Image blobs uploaded before `build_tree` validates the product match | ℹ️ Info | A typo'd `producto` string uploads orphaned blobs before the "no product" error raises (IN-02) |
| `../nocturna-bot/cogs/jinxxy.py` | 399 | Autocomplete `value=str(key)[:100]` truncates a long checkoutUrl silently | ℹ️ Info | A checkoutUrl >100 chars would never match on attach (IN-03) |
| `../nocturna-bot/cogs/jinxxy.py` | 160-171 | Duplicate live checkoutUrl silently overwrites in `live_by_key` with no log line | ℹ️ Info | Unlike the adjacent non-https case, a colliding slug drops a product with no warning (IN-04) |
| `../nocturna-bot/cogs/jinxxy.py` | 81-108 / `github_publish.py:684` | Re-attach with fewer images orphans old committed files; slug collisions possible across products | ℹ️ Info | Repo bloat / stale served files; cross-product overwrite risk under sanitized-slug collision (IN-05) |
| `../nocturna-bot/cogs/jinxxy.py` | 418-420 | `_announce`'s `fetch_channel` catch misses `discord.InvalidData` | ℹ️ Info | An unlikely payload shape could escape the "logged and skipped" contract (IN-06) |

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` debt markers found in any phase-modified file.

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

Gap closure plans 09-07..09-10 successfully closed both original BLOCKERS: `core/github_publish.py::_sync_store_sync.build_tree` now re-grafts staff-owned fields (`images`, `description`, and the rest of `STAFF_OWNED + editor`) from a freshly-fetched `store.json` before every commit, closing the concurrent-`/tienda medios`-attach race that could silently revert staff work (old gap #1 / WR-01); `core/store_sync.py::three_way_merge` now resurrects a complete entry (never an empty/partial `{}`) whenever `current is None`, covering both new products and staff-deleted-while-live products (old gap #1 / WR-05); and `core/jinxxy_api.py::_retry_delay` now clamps every 429 backoff branch to a 60-second cap with correct epoch-vs-delta handling for `X-RateLimit-Reset` (old gap #2 / CR-02). All three fixes are pinned by new tests, verified by direct source read, not merely trusted from SUMMARY.md claims. The old CR-01 duplicate-startup-announce defect is also confirmed gone (`on_ready`/`_synced_once` deleted, poll's own first tick is the sole entry point).

However, a fresh code review performed after gap closure (`09-REVIEW.md`, committed) surfaced **one new, confirmed, unaddressed Critical**: the 09-09 fix for WR-03 (advance the snapshot on every successful sync, not just `changed=True`) correctly moved the snapshot-upsert loop out of the `changed` guard, but placed it BEFORE the gated commit (`github_publish.sync_store`) instead of after. Traced independently against the current source (`cogs/jinxxy.py:195-217`, not merely trusting the review report): if `sync_store` raises after a genuine Jinxxy field change was detected — a transient GitHub outage, a retry-budget-exhausted 409/422 conflict storm, any network failure — the durable snapshot is already advanced to the new value while `store.json` still holds the old one. The next sync cycle's three-way merge then reads `live == snapshot` and treats the field as "Jinxxy unchanged, staff edit wins," permanently dropping that Jinxxy update until the same field changes again on Jinxxy's side. This directly contradicts the phase requirement text "each change is committed cross-repo... while errors go to logs only" (STORE-SYNC-01) — an error should cause a clean retry next cycle, not an unrecoverable, silent loss of a legitimate storefront update. Zero of the 337 passing tests exercise `sync_store` raising after a `changed=True` reconcile inside `_run_sync`, which is exactly why this regression shipped invisibly alongside 09-09's correct fix for the original WR-03 gap.

Two further second-pass findings are real but downgraded to Warning (not blocking this verification): no `asyncio.Lock` serializes the poll tick against a concurrent staff-invoked `/tienda sync` (WR-01 second-pass — can double-announce and interleave snapshot writes under manual overlap, a staff-controlled and infrequent scenario), and `list_all_products`'s pagination loop trusts an unbounded server-supplied `page_count` with no sanity cap (WR-02 second-pass — a plausible-but-unlikely hang against Jinxxy's own API, distinct from the now-fixed CR-02 429-backoff issue). Neither causes silent data loss the way the new Critical does, so they are recorded as anti-patterns for the next gap-closure round rather than failed truths.

STORE-SYNC-02 (staff-supplied images/description) is now fully SATISFIED — its previous BLOCKED status shared the same root cause as old gap #1, which is closed. STORE-SYNC-01 remains BLOCKED solely because of the new snapshot-ordering regression; every other clause of that requirement (poll cadence, `/tienda sync`, mapping, removal-safety, `_comment` preservation, announce behavior, log-only errors on the read/enumeration side) is verified working and tested.

---

_Verified: 2026-07-11T13:00:00Z_
_Verifier: Claude (gsd-verifier)_
