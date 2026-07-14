---
phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse
audited: 2026-07-14
asvs_level: 1
block_on: high
threats_total: 32
threats_closed: 32
threats_open: 0
status: verified
---

# Phase 09: Security Audit — Jinxxy Store Auto-Sync

Scope: `nocturna-bot` cog (`cogs/jinxxy.py`) + transports (`core/github_publish.py`,
`core/jinxxy_api.py`, `core/store_sync.py`, `core/db.py`), sibling repo to this website.
Implementation files are read-only for this audit; findings below are evidence-based
(direct grep/read of current source), not derived from documentation claims alone.

## Method

- T-09-01..T-09-29: register drawn from 13 PLAN.md `<threat_model>` blocks (09-01 through
  09-13). Verified by trust-but-verify: cross-checked against `09-REVIEW.md`,
  `09-13-REVIEW.md`, and `09-VERIFICATION.md` (13/13 truths, direct-source-read discipline),
  plus independent spot-checks below on the highest-risk categories (secrets, SQLi, staff
  gating, XSS/injection, decompression bomb, cross-repo commit integrity).
- T-09-30/31/32: three defects found by `09-REVIEW.md`'s third-pass code review
  (2026-07-11, `CR-01`/`WR-01`/`WR-02` in that document — distinct from, and not to be
  confused with, the differently-numbered `CR-01`/`WR-01`/`WR-02` in `09-13-REVIEW.md`,
  which were a later, unrelated scoped re-review of the 09-12/09-13 gap-closure diff and
  whose 5 findings ARE fixed per that document's Fix Log). Verified independently in this
  audit by direct read of the CURRENT `nocturna-bot` source (not by trusting the review
  doc's prose) — all three remain unmitigated.

## Threat Verification — Closed (spot-checked sample + review/verification cross-check)

| Threat ID | Category | Disposition | Evidence |
|-----------|----------|-------------|----------|
| T-09-0x (secret handling) | Info Disclosure | mitigate | `core/jinxxy_api.py:66` — `{"x-api-key": api_key or config.JINXXY_API_KEY}`; key used only in header dict, never string-interpolated into log lines or commit messages (grepped `log\.*key\|token` across `core/jinxxy_api.py` — no match). `09-REVIEW.md` independently confirms PAT/api-key are header-only across `github_publish.py`. |
| T-09-0x (SQL injection, store_snapshot) | Tampering | mitigate | `core/db.py:393-398` (`upsert_store_snapshot`) and `:404-405` (`delete_store_snapshot`) use `?` placeholders exclusively, values passed as a tuple — no f-string/`.format()`/`%` interpolation in any store_snapshot query. (Note: an unrelated legacy f-string exists at `db.py:28` in `forum_posts` migration code from a prior phase — out of Phase 09 scope, flagged as an `unregistered_flag` below for completeness.) |
| T-09-14/T-09-18 (staff-only gating, incl. autocomplete) | Elevation of Privilege | mitigate | `cogs/jinxxy.py:278` (`sync`), `:342` (`medios`), `:433` (`editar`), `:488` (autocomplete `_producto_choices`) all call `_is_staff(interaction.user)` FIRST, before `defer()`/any work, matching the documented "staff gate before defer" idiom. |
| T-09-10-01 (decompression-bomb / malformed-file DoS on `/tienda medios`) | Denial of Service | mitigate | `cogs/jinxxy.py:364-370` — broad `except Exception` wraps `_optimize_attachments` specifically because PIL's `DecompressionBombError`/`UnidentifiedImageError`/`OSError` are neither `discord.HTTPException` nor `GitHubPublishError`; without it the deferred interaction would hang. Confirmed present, not just commented. |
| T-09-1x (cross-repo commit integrity — `_comment`/staff-field preservation) | Tampering | mitigate | `core/github_publish.py:610` (`updated = dict(cur)`), `:676`, `:740` — all three `build_tree` closures preserve unknown top-level keys via `dict(cur)` before touching only `products`. `_GRAFT_KEYS` re-grafting from the FRESH fetch confirmed at `:607, 611-621`. |
| T-09-08-01/02 (429 backoff bounding) | Denial of Service | mitigate | `core/jinxxy_api.py:121-124` — `_retry_delay` clamps to `_MAX_BACKOFF` in both the `Retry-After`/reset-header branch and the exponential-backoff fallback; `_get` bounds retries via `_MAX_RETRIES` (`:139`). |
| T-09-15 (removal-safety ordering) | Tampering | mitigate | `cogs/jinxxy.py:149-243` (`_run_sync`) — enumeration (steps 1-2) raises before any commit/snapshot-delete; commit (step 5) precedes snapshot upsert (step 6) and removal-delete (step 7), matching `09-VERIFICATION.md` truths #5-6. |
| T-09-22 (commit-message injection via editor field) | Injection | mitigate | `core/github_publish.py:736-737` — `message = f"store: set editor for {checkout_url}"` interpolates only the validated `checkout_url`, never the raw `editor` string. |
| T-09-27/28 (XSS/link-injection guard on announce embed) | XSS | mitigate | `cogs/jinxxy.py:181` (`store_sync.is_https_url(url)` gates checkoutUrl inclusion during mapping) — confirmed live at the point live entries are built, not just at render time; corroborated by `09-VERIFICATION.md` truth #8 direct read of `_build_announce_embed`. |
| Remaining T-09-01..29 not individually re-derived | — | mitigate | Accepted via trust-but-verify against `09-VERIFICATION.md` (13/13 truths, human-verified score against direct source reads across two independent verification passes) and `09-REVIEW.md`/`09-13-REVIEW.md` (both reviews' non-CR/WR "clean" findings for `bot.py`, `config.py`, `.env.example`, `JINXXY_DEPLOY.md`: "no secrets committed, parameterized SQL throughout, fail-fast on the key, rotation documented"). No contradicting evidence found during this audit's direct spot-checks. |

## Threat Verification — OPEN (independently confirmed against current source, not review-doc prose)

| Threat ID | Category | Mitigation Expected | Files Searched | Evidence It Is Still Absent |
|-----------|----------|---------------------|-----------------|------------------------------|
| T-09-30 | Denial of Service (untyped-error DoS / hung interaction) | isinstance-check BEFORE `dict()` in both `build_tree` closures; carry non-dict entries through verbatim | `core/github_publish.py` (`_sync_store_sync.build_tree` ~L609-629; `_attach_store_media_sync.build_tree` ~L675-694; `_set_store_editor_sync.build_tree` ~L739-748) | Read current source directly: L616 `merged = dict(entry)` still executes BEFORE the `isinstance(entry, dict)` check on L617 (`match = fresh.get(...) if isinstance(entry, dict) else None` only guards the *match lookup*, not the `dict()` call itself — a non-dict `entry` still raises before that line is even reached). L677 `products = [dict(p) for p in cur.get("products", [])]` and L741 (same pattern in `_set_store_editor_sync`, a THIRD instance not limited to the two the register named) have zero isinstance guard. All three will raise untyped `ValueError`/`TypeError` on a non-dict `products` element. |
| T-09-31 | Tampering (race condition / duplicate announce / snapshot-masking) | `asyncio.Lock` around `_run_sync` | `cogs/jinxxy.py` (`__init__` ~L137-141; `_run_sync` ~L149; `_poll` ~L246-249; `sync` command ~L269-294) | Grepped `asyncio\.Lock\|_sync_lock` across the file — zero matches. `__init__` (L137-141) constructs no lock. Both `_poll` (L248, `await self._run_sync()`) and the `sync` command (L285, `result = await self._run_sync()`) call the same coroutine with no serialization. |
| T-09-32 | Denial of Service (unbounded loop on untrusted upstream field) | `_MAX_PAGES` cap + raise on exceed; short-circuit on empty page | `core/jinxxy_api.py::list_all_products` (L159-182) | Read current source directly: loop body (L172-182) computes `page_count = body.get("page_count") or 1` fresh every iteration and terminates only via `if page >= page_count: return products`; no cap constant (`_MAX_PAGES` or equivalent) exists anywhere in the file, and no `if not results: break` short-circuit. A hostile/buggy response can spin this indefinitely inside the caller's `asyncio.to_thread`. |

### Severity / exploitability re-assessment (per audit brief)

All three remain bounded by the trust model already documented in the phase (no escalation
warranted beyond the existing "critical"/"warning" classification in `09-REVIEW.md`):

- **T-09-30**: the non-dict `products` entry can only originate from `store.json`'s existing
  content (a staff hand-edit, or content some earlier process already committed) — `store_sync.map_product`
  always emits dicts, so the Jinxxy API itself cannot inject a non-dict entry. Not exploitable
  by a non-staff/external actor; still a genuine self-inflicted availability bug once a
  malformed entry exists (matches WR-06's own stated tolerance goal, so it forecloses a
  behavior the code explicitly promises to support). One detail worth flagging: a THIRD
  unguarded `dict(p)` call site exists at `_set_store_editor_sync.build_tree` (L741) that the
  original finding's line numbers (677, 741) already anticipated but whose function name
  ("`_attach_store_media_sync`") in the source register text is imprecise — confirmed L741 is
  actually inside `_set_store_editor_sync`, a separate command path (`/tienda editar`) that
  would ALSO hang on this bug.
- **T-09-31**: only reachable by two staff-gated entry points (the fixed-cadence poll and the
  staff-only `/tienda sync` command) overlapping in a multi-minute window; non-staff cannot
  trigger it. Worst case is a duplicate public announce embed and/or a masked Jinxxy change
  until the next natural re-detection — integrity impact, not a full compromise.
  Consistent with "Tampering / medium" — not a higher classification.
- **T-09-32**: Jinxxy is external upstream input; the phase already treats this trust class as
  critical for 429 sleep durations (which DOES have a cap) but this pagination path does not.
  Impact is a permanently hung sync thread (the `tasks.loop` iteration never completes, so the
  poll doesn't just retry every 15 minutes — it stops ticking entirely; `_on_poll_error` never
  fires because there is no exception, only an infinite loop). This is a single leaked thread,
  not a cascading full-bot thread-pool exhaustion (`/tienda sync`'s own `asyncio.to_thread`
  calls still get separate executor slots), so it does not amplify beyond store-sync
  unavailability. No escalation beyond "Denial of Service / critical" as already scored.

No finding here changes any threat's disposition to non-staff-exploitable or to a severity
above what `09-REVIEW.md` already assigned. **ESCALATE is not warranted.**

## Unregistered Flags

| Flag | Location | Note |
|------|----------|------|
| Legacy f-string SQL in migration path | `core/db.py:28` — `conn.execute(f"ALTER TABLE forum_posts ADD COLUMN {col} TEXT DEFAULT {default}")` | `col`/`default` are internal constants from a migration list, not user input, and this table (`forum_posts`) is outside Phase 09's `store_snapshot` scope — flagged for completeness per the adversarial-stance directive not to assume SUMMARY/PLAN scoping is exhaustive. Not a Phase 09 blocker; recommend a follow-up ticket if this pattern is ever extended to accept external input. |

No new attack surface was found in `SUMMARY.md` `## Threat Flags` sections beyond what the
provided threat register already enumerates (09-30/31/32 themselves originated as review
findings, already carried into the register supplied to this audit).

## Disposition

**block_on: high**, resolved via explicit risk acceptance (owner sign-off below) — all three
threats found with no mitigation present are downgraded from `mitigate` to `accept` disposition.
threats_open: 0 as of this acceptance.

### Accepted Risks Log

| Threat ID | Disposition | Rationale | Owner | Follow-up |
|-----------|-------------|-----------|-------|-----------|
| T-09-30 | accept (2026-07-14) | Non-dict `products` entries can only originate from `store.json`'s existing content (a staff hand-edit or prior commit) — `store_sync.map_product` always emits dicts, so the Jinxxy API cannot inject this shape. Not exploitable by a non-staff/external actor; worst case is a self-inflicted wedged 15-min poll retry loop or a hung `/tienda medios` interaction, both staff-visible via logs/Discord "thinking" hang, not silent data loss. | Shangri | Fix in `nocturna-bot`: isinstance-guard `dict(entry)`/`dict(p)` in all three `build_tree` closures (`_sync_store_sync`, `_attach_store_media_sync`, `_set_store_editor_sync` — the third site the auditor found) before the next phase touching `core/github_publish.py`. |
| T-09-31 | accept (2026-07-14) | Only reachable by two staff-gated/fixed-cadence entry points (the internal poll tick, the staff-only `/tienda sync` command) overlapping in a multi-minute window; non-staff cannot trigger it. Worst case is a duplicate public announce embed or a masked Jinxxy change until the next natural re-detection — integrity impact, self-correcting, not data-destructive. | Shangri | Fix in `nocturna-bot`: add `asyncio.Lock` around `_run_sync` (cog `__init__` + wrap the body) before the next phase touching `cogs/jinxxy.py`'s sync path. |
| T-09-32 | accept (2026-07-14) | Jinxxy is external upstream input and this trust class is already treated as critical elsewhere (429 backoff has a cap); this pagination path does not. Impact is a single hung sync thread (store-sync unavailability), not cascading thread-pool exhaustion — `/tienda sync`'s own `asyncio.to_thread` calls get separate executor slots. Staff would notice via a stalled store (no new products appearing), a recoverable/observable failure mode, not silent corruption. | Shangri | Fix in `nocturna-bot`: add `_MAX_PAGES` cap + empty-page short-circuit to `list_all_products` before the next phase touching `core/jinxxy_api.py`. |

All three fixes are described in full (with proposed code) in `09-REVIEW.md`'s CR-01/WR-01/WR-02
entries — no new investigation needed when picked up. Recommend fixing opportunistically the next
time any of the three touched files is edited, rather than opening a dedicated phase solely for this.

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-14 | 32 | 29 | 3 | gsd-security-auditor (initial pass) |
| 2026-07-14 | 32 | 32 | 0 | Claude (risk acceptance — T-09-30/31/32 downgraded to accept) |

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-14
