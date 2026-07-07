---
status: all_fixed
phase: 05-photo-publishing-bot-cog
review: 05-REVIEW.md
fix_scope: critical_warning
findings_in_scope: 9
fixed: 9
skipped: 0
iteration: 1
completed: 2026-07-04
---

# Phase 05 Code Review Fix Report

All 9 in-scope findings (3 Critical + 6 Warning) fixed in the `nocturna-bot` repo, each verified by new regression tests. Suite: **84 passed** (was 65 at review time; +19 tests across the fix session). Info findings (8) were out of scope (`--all` not passed).

Commits (nocturna-bot `main`, pushed `8345beb..904906e`):

| Finding | Fix | Commit |
|---------|-----|--------|
| CR-01 | Every `requests` call routed through a `_http` wrapper converting `RequestException` → typed `GitHubPublishError` (D-19 UX now fires on network failures; only the exception class name is logged — no URL/token leak) | `ac530b8` |
| CR-02 | Explicit `(connect, read)` timeout on every GitHub HTTP call — a black-holed connection can no longer hold `_commit_lock` forever | `ccecc50` |
| CR-03 | `_resolve_member` REST fallback: backfill staff-gates work with a cold member cache; the privileged `members` intent stays OFF (no Developer-Portal action needed) — enabling it later just upgrades the REST fetches to cache lookups | `6785c7d` |
| WR-01 | `_fetch_gallery` re-fetches via `application/vnd.github.raw+json` when the Contents API returns `encoding: "none"` (>1 MB); failure propagates the typed error — never an empty list that would let the next publish wipe the gallery | `ef788e4` |
| WR-02 | `build_tree` drops existing entries for the same message before appending — double-✅ races and re-✅ after a lost 🟢 republish cleanly, never duplicate | `36b4cc9` |
| WR-06 | ONE strict filename parser (`^\d{8}-(\d+)-\d+\.webp$`) in `github_publish`, delegated to by `gallery.py`; deletion can never match manually-committed files | `36b4cc9` |
| WR-03 | `_publish` enforces the staff-AUTHOR gate via `_resolve_member` (fail closed), matching `on_message` and the backfill reconcile | `904906e` |
| WR-04 | Two-tier Discord-failure containment: pre-commit failures (fetch, `attachment.read`) fire the D-19 ⚠️ surface; post-commit bookkeeping failures (🟢/🌙/reply) are logged loudly but never re-surface a committed operation as a failure; the failure reply itself is guarded | `904906e` |
| WR-05 | Dismiss path uses tolerant `_remove_own_reaction` for the ✅ prompt — an absent prompt can no longer abort a dismiss | `904906e` |

## Deployment note

The LIVE bot on host `cinema` needs a pull + restart to pick these up:
```bash
cd ~/nocturna-bot && git pull && sudo systemctl restart nocturna-bot
```
No `.env` changes, no Developer-Portal changes, no new dependencies.

## Context

The first fixer agent (CR-01/02/03 + most of WR-01) was terminated by a provider weekly quota limit mid-run; its committed work was verified and the remainder (WR-01 commit, WR-02..WR-06 + regression tests) was completed inline by the orchestrator. No work was lost.
