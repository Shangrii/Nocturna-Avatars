---
phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse
plan: 10
subsystem: bot-store-sync
tags: [jinxxy, cog, error-handling, D-05, gap-closure]
gap_closure: true
requires:
  - "09-09 (same file — cog orchestration hardening; edits land sequentially)"
provides:
  - "broadened /tienda medios attachment-optimize guard (WR-07)"
  - "broadened /tienda sync failure guard (WR-08)"
  - "wrapped _announce channel.send (WR-09)"
affects:
  - "../nocturna-bot/cogs/jinxxy.py"
tech-stack:
  added: []
  patterns:
    - "broad try/except Exception around off-loop PIL work (arbitrary upload bytes)"
    - "D-05 one-ephemeral-signal contract enforced on every command failure path"
key-files:
  created: []
  modified:
    - "../nocturna-bot/cogs/jinxxy.py"
    - "../nocturna-bot/tests/test_jinxxy_cog.py"
decisions:
  - "WR-07/WR-08 guard BROADLY (except Exception) because PIL raises several unrelated types (UnidentifiedImageError/DecompressionBombError/OSError) and map_product raises KeyError/TypeError — the failure taxonomy is open, so catch-all + log + ephemeral is the correct D-05 shape"
  - "WR-09 catches discord.HTTPException (Forbidden is a subclass) — narrow enough to not swallow programming errors, broad enough to cover the cosmetic channel-permission case"
metrics:
  duration: ~11min
  completed: 2026-07-11
  tasks: 3
  files: 2
requirements: [STORE-SYNC-02]
---

# Phase 9 Plan 10: Cog command/announce error-handling gap closure Summary

Closed the three cog-side error-handling warnings (WR-07/08/09) in `cogs/jinxxy.py`, each of which left a deferred Discord interaction hanging or broke the D-05 "one ephemeral signal, never a public error" contract — a bad/bomb attachment, a malformed Jinxxy detail, and an unsendable announce channel now each fail gracefully (log-only + ephemeral where applicable) instead of crashing the poll or freezing the invoker.

## What Was Built

- **WR-07 — `/tienda medios` attachment guard:** wrapped the `asyncio.to_thread(_optimize_attachments, …)` call in a broad `try/except Exception`. A non-image (PDF/video/corrupt → `UnidentifiedImageError`) or a decompression-bomb (`DecompressionBombError`) upload now yields one ephemeral "Alguna imagen no se pudo procesar" reply, logs the error, and returns *before* `attach_store_media` — resolving the deferred interaction instead of hanging it (T-09-10-01 DoS mitigation).
- **WR-08 — `/tienda sync` guard broadened:** widened `except (GitHubPublishError, JinxxyAPIError)` to `except Exception`. A `KeyError`/`TypeError` from `map_product` on a malformed 2xx detail now follows the same D-05 ephemeral "revisa los logs" path instead of escaping the handler and hanging the interaction.
- **WR-09 — `_announce` channel.send wrapped:** wrapped `channel.send(embed=…)` in `try/except discord.HTTPException` (covers `discord.Forbidden`). A missing-send-permission or cosmetic HTTP failure on the announce channel is now logged and swallowed — honoring the method's own "logged and skipped — never raised" docstring — so it no longer hangs the `/tienda sync` ephemeral summary or triggers a full poll restart.

## Tasks

| Task | Name | RED commit | GREEN commit |
| ---- | ---- | ---------- | ------------ |
| 1 | Guard /tienda medios optimize (WR-07) | 3f07a89 | cb905f7 |
| 2 | Broaden /tienda sync guard (WR-08) | 5f470b0 | 63705b4 |
| 3 | Wrap _announce channel.send (WR-09) | 9847600 | d294f1d |

All tasks TDD (RED test committed failing, then GREEN implementation). 6 new tests (+2 per warning).

## Verification

- `python -m pytest tests/test_jinxxy_cog.py -q` → **38 passed** (was 32).
- Full bot suite `python -m pytest -q` → **337 passed** (was 331 after 09-09), 0 regressions.
- Source assertions hold: `_optimize_attachments` call is guarded; `sync` catches `Exception`; `_announce`'s `channel.send` is wrapped in `try/except discord.HTTPException`.

## Deviations from Plan

None - plan executed exactly as written. The plan's `must_haves.artifacts` "contains: followup.send" is satisfied on the WR-07 path (the new guard sends `interaction.followup.send`); WR-08 reuses the existing `followup.send`; WR-09 is a log-only swallow (no followup, by design — it is the public announce path, not a command reply).

## TDD Gate Compliance

Each task shipped a `test(...)` commit (RED, verified failing) before its `fix(...)` commit (GREEN, verified passing) — six commits total, gate sequence intact for all three warnings.

## Self-Check: PASSED

- `../nocturna-bot/cogs/jinxxy.py` — FOUND (modified, 3 guards added)
- `../nocturna-bot/tests/test_jinxxy_cog.py` — FOUND (6 tests added)
- Commits 3f07a89, cb905f7, 5f470b0, 63705b4, 9847600, d294f1d — all present in nocturna-bot git log
