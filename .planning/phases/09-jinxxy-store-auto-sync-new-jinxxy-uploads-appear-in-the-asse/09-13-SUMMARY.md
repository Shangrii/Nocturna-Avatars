---
phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse
plan: 13
subsystem: discord-bot
tags: [jinxxy, store-sync, announce-embed, i18n-override, discord-bot, cross-repo]

# Dependency graph
requires:
  - phase: 09-12
    provides: "prior UAT gap closure (/tienda editar); bot suite green at 356/356 baseline"
  - phase: 09-05
    provides: "cogs/jinxxy.py _announce (D-05 log-only / D-06 silent-on-no-change) + _build_announce_embed"
  - phase: 09-03
    provides: "core/store_sync.is_https_url https guard for rendering URLs as links/thumbnails"
provides:
  - "config.WEBSITE_BASE_URL + config.JINXXY_STORE_URL env constants (site origin + EN store page)"
  - "_build_announce_embed rewritten: English engaging copy + store-page link + per-product checkoutUrl links + best-effort site thumbnail"
affects: [jinxxy-store-auto-sync, jinxxy-announce-channel]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "STORE-announce override of D-05 Spanish-first: the public announce embed is English-first while every error path stays log-only (D-05) and no-change stays silent (D-06)"
    - "URL-tampering mitigation at the embed boundary: per-product link only when store_sync.is_https_url(checkoutUrl); thumbnail composed only from a site-relative /store/... path against the trusted WEBSITE_BASE_URL constant (never raw external URL text)"
    - "Markdown-label sanitization: strip []() from a product name before using it as a [label](url) link label (T-09-28)"

key-files:
  created: []
  modified:
    - ../nocturna-bot/config.py
    - ../nocturna-bot/.env.example
    - ../nocturna-bot/cogs/jinxxy.py
    - ../nocturna-bot/tests/test_jinxxy_cog.py

key-decisions:
  - "JINXXY_STORE_URL default = https://nocturna-avatars.site/en/store — the EN store route (audience is now English), not /es/tienda; env-configurable so it can flip without a code change"
  - "Store link set BOTH as embed.url and as a visible 'Store' field link so it survives clients that don't surface embed.url"
  - "Product name is English-first (name['en'] → name['es'] → key) since the announce is now English"
  - "Thumbnail is best-effort: prefer an added product, else any, with a site-relative images[0]; omitted entirely (never set to empty/None url) when no product has images"

patterns-established:
  - "A public-facing conversion embed overrides the project's Spanish-first default while keeping all operational/error text (D-05) unchanged — the override is scoped to the STORE announce copy only"

requirements-completed: [STORE-SYNC-01]

# Metrics
duration: 11min
completed: 2026-07-12
---

# Phase 9 Plan 13: English Visual Announce Override (GAP-2) Summary

**The public store announce embed is now English, engaging, and visual — an English title/description, a link to the EN store page (`nocturna-avatars.site/en/store`), each added/updated product linked to its `checkoutUrl`, and a best-effort product thumbnail — overriding D-05's Spanish-first default for STORE announcements only, while error handling stays log-only (D-05) and no-change syncs stay silent (D-06).**

## Performance

- **Duration:** ~11 min
- **Completed:** 2026-07-12
- **Tasks:** 2 (auto)
- **Files modified:** 4 (all in ../nocturna-bot)

## Accomplishments

- Closed GAP-2 (09-HUMAN-UAT 2026-07-11): the announce channel is PUBLIC and the audience is now American/English, but the embed was generic Spanish (`title="Tienda actualizada"`, ES bucket labels, footer `Nocturna · tienda`) — a plain Spanish status line does not drive American visitors to the storefront.
- **Task 1** — added two env constants to `config.py` (Jinxxy Fase 9 block) with matching Spanish comments + `.env.example` docs:
  - `WEBSITE_BASE_URL = os.getenv("WEBSITE_BASE_URL", "https://nocturna-avatars.site")` — the deployed site origin, used to turn a site-relative `/store/<file>.webp` image path into an absolute embed thumbnail URL.
  - `JINXXY_STORE_URL = os.getenv("JINXXY_STORE_URL", "https://nocturna-avatars.site/en/store")` — the EN store page the public announce embed links to.
- **Task 2** — rewrote the static `_build_announce_embed(result)` in `cogs/jinxxy.py`:
  - English + engaging copy: title `New on the Nocturna store`, description `There's a new product on our webpage — make sure to check it out!`.
  - Store-page link set both as `embed.url` and a visible `Store` field markdown link to `config.JINXXY_STORE_URL`.
  - English bucket labels (`🆕 New`, `✏️ Updated`, `🗑️ Removed`); each added/updated product rendered as `[name](checkoutUrl)` when the checkoutUrl passes `store_sync.is_https_url` (else plain name; removed keys aren't in products → plain sanitized text), with the label stripped of markdown-breaking `[]()` (T-09-28).
  - Best-effort thumbnail: first product (an `added` one preferred, else any in `products`) whose `images[0]` is a site-relative `/...` path → `embed.set_thumbnail(url=f"{config.WEBSITE_BASE_URL}{images[0]}")`; omitted entirely when no product has images.
  - English-first product name (`name['en']` → `name['es']` → key); brand red `0xC0192C` + UTC timestamp retained.
  - `_announce`'s D-05 error path and D-06 no-change guard were NOT touched (`git diff` confirms only `_build_announce_embed` changed).
- Full bot suite green: **360 passed** (was 356 baseline; +4 net new announce tests).

## Task Commits

Each task was committed atomically in the `nocturna-bot` repo:

1. **Task 1 — WEBSITE_BASE_URL + JINXXY_STORE_URL config constants** — `ba31f71` (feat) — `nocturna-bot`
2. **Task 2 — English/engaging/visual _build_announce_embed rewrite + tests** — `4aebadb` (feat) — `nocturna-bot`

**Plan metadata:** committed in the website repo (this SUMMARY + STATE.md + ROADMAP.md).

## Files Created/Modified

- `../nocturna-bot/config.py` — added `WEBSITE_BASE_URL` + `JINXXY_STORE_URL` to the Jinxxy Fase 9 env block (os.getenv defaults + Spanish comments).
- `../nocturna-bot/.env.example` — documented both new vars with defaults + one-line purpose under the Jinxxy section.
- `../nocturna-bot/cogs/jinxxy.py` — rewrote `_build_announce_embed` (English/engaging/visual: store link + per-product checkoutUrl links + best-effort thumbnail + sanitized labels); `_announce` unchanged.
- `../nocturna-bot/tests/test_jinxxy_cog.py` — updated `test_announce_sends_branded_embed_on_change` to the English/store-link contract; added 4 tests: product linked to checkoutUrl, markdown-label sanitization, thumbnail from a site-relative image, and no-thumbnail when no product has images. Retained the color `0xC0192C`, silent-on-no-change, and Forbidden/HTTPException-logged-not-raised assertions.

## Decisions Made

- `JINXXY_STORE_URL` points at the EN store route `/en/store` (not `/es/tienda`) because the audience is now English; kept env-configurable so it can flip without a code change.
- Store link set BOTH as `embed.url` and a visible `Store` field link so it survives clients that don't surface `embed.url`.
- Thumbnail is best-effort and site-relative-only: composed exclusively from a `/store/...` path against the trusted `WEBSITE_BASE_URL` constant — never from raw external URL text (T-09-27) — and omitted cleanly when absent.

## Deviations from Plan

**1. [Scope boundary] Pre-existing uncommitted `.env.example` change preserved out of my commit**
- **Found during:** Task 1
- **Issue:** `../nocturna-bot/.env.example` had a pre-existing uncommitted local edit to the REMINDERS section (`REMINDERS_STAFF_ROLE_IDS`, `REMINDERS_CATCHUP_GRACE_HOURS`) — unrelated to this plan.
- **Fix:** Saved that diff as a patch, restored the file to HEAD, applied only my Jinxxy-section additions, committed, then re-applied the user's REMINDERS change back to the working tree so it stays uncommitted and intact.
- **Files modified:** `../nocturna-bot/.env.example`
- **Commit:** `ba31f71` (contains only my two documented vars, not the REMINDERS change)

## Issues Encountered

- None blocking. One test assertion initially had a miscomputed expected string for the markdown-sanitization case (`Cahuevilama`, not `Cahuamaevil`, after stripping `[]()` from `Ca[hu](evil)ama`); corrected before the Task 2 commit.

## Threat Surface

- T-09-27 (Tampering — checkoutUrl/images[0] as embed link/thumbnail): mitigated — per-product link only when `store_sync.is_https_url(checkoutUrl)` is true; thumbnail URL built only from a site-relative `/store/...` path prefixed with the trusted `config.WEBSITE_BASE_URL`, never from raw external URL text. Pinned by the link + thumbnail tests.
- T-09-28 (Tampering — product name in a markdown link label): mitigated — `[]()` stripped from the name before it becomes a `[label](url)` label. Pinned by `test_announce_embed_sanitizes_markdown_in_product_name`.
- T-09-29 (Info disclosure — public announce channel): accept (D-18; store-news only; no secrets; error paths log-only, unchanged).
- T-09-SC (installs): accept — no new package installs (reuses discord.py already pinned).
- No new threat surface beyond the register.

## Next Phase Readiness

- GAP-2 closed. This is the LAST incomplete plan in phase 09 — all 13 plans now have a SUMMARY.md, so the phase is fully executed and ready for phase verification.
- **User setup:** the `cinema` production bot host still runs pre-fix code — a `git pull` + `nocturna-bot` systemd restart is needed to pick up `ba31f71`..`4aebadb` so the next store change posts the new English embed (standing bot-deploy note, not a new blocker).

## Self-Check: PASSED
- `../nocturna-bot/config.py` — FOUND (`WEBSITE_BASE_URL`, `JINXXY_STORE_URL` defined via os.getenv, both start with https://)
- `../nocturna-bot/cogs/jinxxy.py` — FOUND (`_build_announce_embed` rewritten; English title/description present, old Spanish strings gone)
- `../nocturna-bot/tests/test_jinxxy_cog.py` — FOUND (53 jinxxy-cog tests pass; full suite 360 passed)
- Commit `ba31f71` (nocturna-bot) — FOUND
- Commit `4aebadb` (nocturna-bot) — FOUND

---
*Phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse*
*Completed: 2026-07-12*
