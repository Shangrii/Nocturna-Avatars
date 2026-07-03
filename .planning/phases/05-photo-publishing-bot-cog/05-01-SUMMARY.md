---
phase: 05-photo-publishing-bot-cog
plan: 01
subsystem: infra
tags: [pillow, webp, discord-bot, image-optimization, pytest, config, exif]

# Dependency graph
requires:
  - phase: 04-gallery-data-layer
    provides: locked gallery.json schema ({ file, caption?, width, height, date }) that optimize_to_webp's returned dimensions feed
provides:
  - "optimize_to_webp(raw: bytes) -> (webp_bytes, width, height): pure, tested WebP pipeline (downscale-only 1920px, EXIF stripped)"
  - "Seven Phase-5 .env-driven config constants in nocturna-bot/config.py (PHOTO_CHANNEL_ID, GALLERY_STAFF_ROLE_IDS, GITHUB_PAT, WEBSITE_REPO, WEBSITE_BRANCH, WEBSITE_GALLERY_JSON, WEBSITE_IMAGE_DIR)"
  - "pytest test harness (tests/conftest.py) for the nocturna-bot repo"
affects: [05-02, 05-03, 05-04, 05-05, photo-publish-cog, cross-repo-commit]

# Tech tracking
tech-stack:
  added: ["Pillow>=12.0.0 (installed 12.3.0)", "pytest>=8.0.0 (installed 9.1.1)"]
  patterns:
    - "Pure image-optimize unit (io + PIL only, no discord/config) callable off the event loop by the cog"
    - "conftest.py inserts repo root on sys.path so tests import top-level packages like the bot does at runtime"
    - "Config constants mirror the existing os.getenv-after-load_dotenv idiom; GALLERY_STAFF_ROLE_IDS is a comma-split list[int]"

key-files:
  created:
    - nocturna-bot/core/image_optimize.py
    - nocturna-bot/tests/test_image_optimize.py
    - nocturna-bot/tests/conftest.py
  modified:
    - nocturna-bot/config.py
    - nocturna-bot/requirements.txt
    - nocturna-bot/.env.example

key-decisions:
  - "WEBSITE_REPO default = Shangrii/Nocturna-Avatars, WEBSITE_BRANCH default = revamp (D-15: branch flips at cutover with zero code changes)"
  - "WebP q82 method=6; EXIF/GPS stripped by omitting exif= on save (verified: Pillow 12.3 WebP encoder does NOT auto-carry im.info['exif'])"
  - "optimize_to_webp stays pure (no asyncio.to_thread wrapper); the 05-03 cog owns off-loop execution"
  - "slopcheck 0.6.1 uses `scan --pkg pypi <name>` (research doc's `-e pypi` was the install subcommand syntax); Pillow + pytest both [OK] on PyPI"

patterns-established:
  - "Pattern 2 (image optimize): exif_transpose -> mode-normalize -> thumbnail(1920, LANCZOS) -> save WEBP no-exif -> return (bytes, w, h)"
  - "Repo-root sys.path bootstrap via tests/conftest.py for a previously test-less bot repo"

requirements-completed: [BOT-03]

# Metrics
duration: 10min
completed: 2026-07-03
---

# Phase 5 Plan 01: Config Surface + optimize_to_webp Summary

**Pure, pytest-proven Pillow pipeline (`optimize_to_webp`) that turns a staff attachment into a downscale-only 1920px WebP with EXIF stripped, plus the seven `.env`-driven Phase-5 config constants the later publish/removal slices build on.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-07-03T16:55:30Z
- **Completed:** 2026-07-03T17:05:13Z
- **Tasks:** 2 (both TDD)
- **Files modified:** 6 (3 created, 3 modified) — all in the external `nocturna-bot` repo

## Accomplishments
- `optimize_to_webp(raw) -> (webp_bytes, width, height)` implemented and GREEN against 5 behaviour tests: downscale to 1920 long edge (aspect preserved), never-upscale, `format == "WEBP"`, EXIF/GPS stripped, and P-mode-with-transparency handled without raising.
- Seven Phase-5 config constants added to `config.py` (mirroring the existing `os.getenv` idiom) and documented in `.env.example` with `GITHUB_PAT` as a blank placeholder only.
- `Pillow>=12.0.0` + `pytest>=8.0.0` declared in `requirements.txt` (every existing pin untouched); slopcheck `[OK]` on both via PyPI.
- Bootstrapped a pytest harness for a previously test-less bot repo (`tests/conftest.py` puts the repo root on `sys.path`).

## Task Commits

Each task was committed atomically in the `nocturna-bot` checkout (`../nocturna-bot`, branch `main`):

1. **Task 1: Config surface, dependencies, and a failing image-optimization test** - `db09ace` (test — RED gate)
2. **Task 2: Implement optimize_to_webp (GREEN)** - `ee5f591` (feat — GREEN gate)

**Plan metadata:** committed separately in THIS website repo (docs: complete plan).

_TDD: RED (`test`) → GREEN (`feat`); no refactor commit needed (implementation was clean)._

## Files Created/Modified
- `nocturna-bot/core/image_optimize.py` (created) - Pattern-2 WebP optimizer; imports only `io` + `PIL`.
- `nocturna-bot/tests/test_image_optimize.py` (created) - 5 in-memory Pillow behaviour tests for the D-11/D-12 contract.
- `nocturna-bot/tests/conftest.py` (created) - inserts repo root on `sys.path` for top-level imports.
- `nocturna-bot/config.py` (modified) - seven Phase-5 `.env`-driven constants.
- `nocturna-bot/requirements.txt` (modified) - appended `Pillow>=12.0.0` + `pytest>=8.0.0`.
- `nocturna-bot/.env.example` (modified) - documents the seven new vars; PAT blank placeholder.

## Verification Evidence
- `python -m pytest tests/test_image_optimize.py -q` → **5 passed** (exit 0).
- `python -c "import config"` → **OK** (constants importable, no syntax error).
- Asserted post-resize dimensions: 3000x2000 → **(1920, 1280)**; 800x600 → **(800, 600)** unchanged.
- EXIF strip proven empirically: source JPEG carried 5 EXIF tags incl. a GPS IFD; optimized WebP `getexif()` length **0** and no `exif` in `info`.
- **slopcheck 0.6.1** (`scan --pkg pypi`): **Pillow → [OK]**, **pytest → [OK]** on PyPI (T-05-SC mitigated).

## Decisions Made
- Verified before coding that Pillow 12.3's WebP encoder does **not** auto-carry `im.info['exif']` — so omitting `exif=` on `save()` genuinely strips metadata (Pitfall 5 / T-05-02 mitigated). No explicit `exif=b""` needed.
- Kept `optimize_to_webp` pure (only `io` + `PIL`) so it is independently testable; the cog (05-03) owns `asyncio.to_thread` off-loop execution.
- Pillow's default `MAX_IMAGE_PIXELS` decompression-bomb guard left in place (T-05-01 mitigation).

## Deviations from Plan

None affecting scope. One tooling adaptation:

- The plan/RESEARCH referenced `slopcheck -e pypi Pillow`. The installed slopcheck 0.6.1 exposes that flag only on its `install` subcommand; the single-package audit is `slopcheck scan --pkg pypi <name>`. Adapted the invocation; verdict unchanged (`[OK]` for both Pillow and pytest). No code or dependency impact.

## Issues Encountered
- Initial EXIF fixture used nested GPS rational tuples, which Pillow's TIFF writer rejected (`TypeError: bad operand type for abs()`). Simplified the GPS IFD to string/int reference tags (`{1:"N", 3:"W", 5:0}`) — still proves the source carries GPS EXIF and that the output strips it. Resolved before Task 1 was committed.

## User Setup Required
None for this plan. (Phase-5 go-live still needs a GitHub PAT + confirmed staff role IDs — captured later in the `05-05` checkpoint, tracked as a standing blocker.)

## Next Phase Readiness
- The image half of the publish happy-path is proven in isolation; `optimize_to_webp` is ready for the cog to consume in 05-03.
- All seven `.env` config constants are importable and default to the verified values (`WEBSITE_REPO=Shangrii/Nocturna-Avatars`, `WEBSITE_BRANCH=revamp`).
- Plans 05-02..05-05 (github publish transport, the cog + listeners, backfill, live setup) build directly on this config + optimizer.

## Self-Check: PASSED

- All 6 bot files present (`core/image_optimize.py`, `tests/test_image_optimize.py`, `tests/conftest.py`, `config.py`, `requirements.txt`, `.env.example`).
- Both task commits exist in `../nocturna-bot` history: `db09ace` (test/RED), `ee5f591` (feat/GREEN).
- `05-01-SUMMARY.md` present in the website repo.

---
*Phase: 05-photo-publishing-bot-cog*
*Completed: 2026-07-03*
