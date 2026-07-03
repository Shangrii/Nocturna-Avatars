---
phase: 05-photo-publishing-bot-cog
plan: 03
subsystem: infra
tags: [discord.py, cog, pillow, github-git-data-api, sqlite, asyncio, cross-repo]

# Dependency graph
requires:
  - phase: 05-01
    provides: "core/image_optimize.optimize_to_webp (downscale-only 1920px WebP, EXIF stripped) + Phase-5 config constants"
  - phase: 05-02
    provides: "core/github_publish.publish_message / remove_message (atomic cross-repo commit via Git Data API)"
  - phase: 04-01
    provides: "gallery.json write-target contract { file, caption?, width, height, date } + public/gallery/ image dir"
provides:
  - "cogs/gallery.py — GalleryCog: on_message detection (✅ approve control) + on_raw_reaction_add publish"
  - "Pure, unit-proven helpers: _image_attachments, _is_staff, _build_filename, _caption"
  - "bot.py wired to load cogs.gallery with fail-fast config validation (GITHUB_PAT/WEBSITE_REPO/GALLERY_STAFF_ROLE_IDS)"
  - "core/db.init_gallery_state() — 1-row gallery_state backfill-cursor table scaffold"
affects: [05-04, 05-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RAW reaction listener + server-side role gate as the public-channel trust boundary (Pattern 1)"
    - "Pure module-level helpers extracted from cog so detection/filename/caption logic is unit-testable without a running bot"
    - "asyncio.to_thread wraps the CPU Pillow re-encode so Discord's event loop is never blocked"
    - "Discord-native idempotency: the bot's own 🟢 marker reaction is the published-state flag (no DB row)"

key-files:
  created:
    - "nocturna-bot/cogs/gallery.py"
    - "nocturna-bot/tests/test_gallery_cog.py"
  modified:
    - "nocturna-bot/bot.py"
    - "nocturna-bot/core/db.py"

key-decisions:
  - "Published-entry date is emitted as ISO 8601 millisecond .000Z shape (e.g. 2026-07-03T14:05:09.000Z) to byte-match Phase-4 shipped gallery.json — via created_at.astimezone(utc).isoformat(timespec='milliseconds').replace('+00:00','Z')"
  - "Spanish confirmation reply wording: '📸 Publiqué {N} foto(s) en la galería — la web tarda un par de minutos en actualizarse.' with delete_after=60 (D-04)"
  - "on_raw_reaction_add resolves the channel with get_channel() OR await fetch_channel() fallback so post-restart reactions (uncached channel) still publish"
  - "_build_filename normalizes created_at to UTC before the {YYYYMMDD} segment so a non-UTC aware datetime can't shift the date"

patterns-established:
  - "Pattern 1: RAW reaction + payload.member role gate (skip None/.bot) before any publish"
  - "Pattern 2: 🟢 marker + r.me idempotency check as the double-publish guard (D-05)"

requirements-completed: [BOT-01, BOT-02, BOT-06]

# Metrics
duration: 10min
completed: 2026-07-03
---

# Phase 5 Plan 03: Publish Vertical Slice (GalleryCog) Summary

**GalleryCog wires the two proven cores to Discord: a staff image post gets a ✅ approve control, and a staff ✅ optimizes every image to WebP and commits it live to the website's gallery.json in one cross-repo commit — with the message text as caption, role-gated and idempotent.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-07-03 (bot repo, after 05-02)
- **Completed:** 2026-07-03
- **Tasks:** 3 (Task 2 was TDD: RED → GREEN)
- **Files modified:** 4 (2 created, 2 modified) — all in the `nocturna-bot` repo

## Accomplishments
- **Detection (BOT-01/D-03):** `on_message` adds ✅ only to image posts from staff-role members in the photo channel; community posts and non-image / text-only staff posts are ignored entirely.
- **Publish (BOT-02/BOT-06/D-16):** a staff ✅ collects every static-image attachment (png/jpeg/webp, D-13), optimizes each off the event loop, and commits images + a `gallery.json` entry per image in ONE `github_publish.publish_message` call, using the message text as caption.
- **Trust boundary (D-01/D-02/D-08):** the publish handler is role-gated on `payload.member.roles ∩ GALLERY_STAFF_ROLE_IDS`, skips bots, and allows self-approval.
- **Idempotency (D-05):** a message already carrying the bot's 🟢 marker is skipped — a second ✅ never double-publishes; success adds 🟢 + a `delete_after=60` Spanish confirmation; failure logs + re-raises without 🟢 (D-19 UX deferred to 05-04).
- **Loader + fail-fast (T-05-SC):** `bot.py` loads `cogs.gallery` and `sys.exit(1)`s on missing `GITHUB_PAT` / `WEBSITE_REPO` / `GALLERY_STAFF_ROLE_IDS`; `gallery_state` cursor table scaffolded in `core/db.py`.

## Task Commits

Each task was committed atomically in the **`nocturna-bot`** repo:

1. **Task 1: Cog skeleton + bot.py loader + config validation + gallery_state table** — `ab59619` (feat)
2. **Task 2 (TDD): Detection + ✅ approve control with testable helpers**
   - `a979e8e` (test — RED: helpers absent, positive detection fails)
   - `954f0f7` (feat — GREEN: helpers + on_message, 14 passing)
3. **Task 3: Publish orchestration on checkmark (BOT-02, BOT-06)** — `75b8ac5` (feat)

_Plan metadata commit (SUMMARY/STATE/ROADMAP) is in the **website** repo._

## Files Created/Modified
- `nocturna-bot/cogs/gallery.py` (created, 147 lines) — GalleryCog + pure helpers + publish orchestration
- `nocturna-bot/tests/test_gallery_cog.py` (created) — 14 tests: allow-list, role gate, filename convention, caption trim, on_message detection
- `nocturna-bot/bot.py` (modified) — `load_extension("cogs.gallery")` + fail-fast config guards
- `nocturna-bot/core/db.py` (modified) — `init_gallery_state()` creating the 1-row `gallery_state` table

## Verification
- `python -m pytest tests/test_gallery_cog.py -q` → 14 passed
- Full bot suite → **36 passed** (22 baseline + 14 new); no regression
- `ast.parse` clean on `cogs/gallery.py`, `bot.py`, `core/db.py`; `cogs.gallery` imports cleanly
- Task greps pass: `asyncio.to_thread`, `publish_message`, `delete_after`, `class GalleryCog`, `gallery_state`, `cogs.gallery`

## Decisions Made
- **Date format:** `created_at.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")` → `2026-07-03T14:05:09.000Z`, matching shipped Phase-4 data exactly (site sorts newest-first by `date`).
- **Caption is per-message, shared across all its images**; `_caption` returns a trimmed string and an empty string for whitespace-only/None, so `github_publish` omits the `caption` key entirely (never `""`).
- **`publish_message(message.id, entries, date=date)`** — the 05-02 signature takes `date` as a top-level arg applied to every entry; the cog passes the message's `.000Z` timestamp explicitly rather than relying on the "now" default.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Channel-resolution fallback for post-restart reactions**
- **Found during:** Task 3 (on_raw_reaction_add)
- **Issue:** `self.bot.get_channel(...)` returns `None` for a channel not in the cache (e.g. right after a restart, before the guild is fully populated), which would raise `AttributeError` on `.fetch_message`.
- **Fix:** `channel = self.bot.get_channel(id) or await self.bot.fetch_channel(id)` so the RAW handler works even when the channel isn't cached (consistent with the plan's own "RAW event so it works post-restart" rationale).
- **Files modified:** `nocturna-bot/cogs/gallery.py`
- **Verification:** `ast.parse` + import clean; full suite green.
- **Committed in:** `75b8ac5` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 missing-critical robustness).
**Impact on plan:** Aligns with the plan's post-restart intent; no scope creep. All other work executed exactly as written.

## Issues Encountered
None. The suite already ran async tests via `asyncio.run` (no pytest-asyncio), so the new cog tests followed the same convention.

## User Setup Required
None new in this plan. The fail-fast guards now require `GITHUB_PAT`, `WEBSITE_REPO`, and `GALLERY_STAFF_ROLE_IDS` in the bot's `.env` before the process will start — these are captured at the 05-05 live-setup checkpoint (STATE.md already tracks the PAT as a Phase-5 blocker).

## Next Phase Readiness
- **Ready for 05-04:** removal (🌙 via `github_publish.remove_message`), the D-19 persistent-error UX on the publish failure path, and startup backfill (reading/advancing the `gallery_state` cursor already scaffolded here).
- **Ready for 05-05:** live end-to-end confirmation (human checkpoint) + deployment to the running bot host, plus the `GALLERY_STAFF_ROLE_IDS` / PAT capture decision.
- No blockers introduced.

## Self-Check: PASSED

- Files: `cogs/gallery.py`, `tests/test_gallery_cog.py`, `bot.py`, `core/db.py` all present (bot repo); `05-03-SUMMARY.md` present (website repo).
- Commits verified in bot repo history: `ab59619`, `a979e8e`, `954f0f7`, `75b8ac5`.

---
*Phase: 05-photo-publishing-bot-cog*
*Completed: 2026-07-03*
