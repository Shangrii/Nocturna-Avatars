---
phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse
plan: 06
subsystem: infra
tags: [jinxxy, discord-cog, store-sync, attach-flow, image-optimize, autocomplete, deploy, bot]

# Dependency graph
requires:
  - phase: 09-04
    provides: "core/github_publish.attach_store_media(checkout_url, media, description) — staff images (public/store blobs -> /store/<f>) + description into the matched product in ONE commit; None-skip per field"
  - phase: 09-05
    provides: "cogs/jinxxy.py JinxxyCog (GroupCog /tienda) + _is_staff + db.get_store_snapshot — the class this plan extends"
  - phase: 05
    provides: "core/image_optimize.optimize_to_webp (downscale 1920px, EXIF/GPS stripped) + gallery asyncio.to_thread off-loop pattern + cinema-host git-pull+systemctl deploy precedent"
provides:
  - "cogs/jinxxy.py: /tienda medios — staff-gated command attaching up to 4 optimized WebP images + a bilingual description to a synced product via attach_store_media (checkoutUrl-matched)"
  - "cogs/jinxxy.py: _optimize_attachments + _slug_from_url helpers (bot-generated numeric/slug .webp filenames, no raw user text) and _producto_choices snapshot-backed staff-gated autocomplete"
  - "JINXXY_DEPLOY.md: cinema-host deploy checklist (env vars, git-pull+systemctl restart, mandatory API-key rotation)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Discord attach flow: app-command discord.Attachment params (a modal cannot carry attachments) → off-thread WebP re-encode → object-aware cross-repo commit, staff-owned fields only"
    - "Staff-gated autocomplete delegating to a plain testable coroutine (_producto_choices) so the [] non-staff / snapshot-Choices staff paths are unit-asserted without reaching the registered callback"

key-files:
  created:
    - "../nocturna-bot/JINXXY_DEPLOY.md"
  modified:
    - "../nocturna-bot/cogs/jinxxy.py"
    - "../nocturna-bot/tests/test_jinxxy_cog.py"

key-decisions:
  - "Image filenames are bot-generated {slug}-{index}.webp where slug is _slug_from_url(checkoutUrl) re-sanitised to [a-z0-9-] (hash fallback) — no raw user text ever reaches a committed path (T-09-19)"
  - "producto autocomplete reads the LOCAL durable snapshot (db.get_store_snapshot) rather than the cross-repo _fetch_store, so per-keystroke suggestions stay fast and add no GitHub round-trip; label=name, value=checkoutUrl, capped 25"
  - "The description dict OMITS a locale key when its param is None (not empty-string), so a partial edit rides 09-04's None-skip and never wipes the other locale; no params → description=None (images-only edit leaves description untouched)"
  - "Only IMAGES + DESCRIPTION are written by /tienda medios — never a sync-owned field; the attach flow and the merge are disjoint (D-12/D-15)"

patterns-established:
  - "Staff-gated Discord attach command: gate FIRST (before defer/read) → defer ephemeral → read+optimize off-thread → object-aware commit → ephemeral confirm; errors are logs-only + a staff-facing ephemeral reply (D-05)"

requirements-completed: [STORE-SYNC-02]

# Metrics
duration: 4min
completed: 2026-07-11
---

# Phase 09 Plan 06: Staff Image/Description Attach Flow + Deploy Notes Summary

**`/tienda medios` closes the reduced-sync gap (D-14/D-15): a staff-gated Discord command attaches up to 4 images + a bilingual description to a synced product — attachments are re-encoded to WebP with bot-generated numeric filenames, committed under `public/store` and written as `/store/<file>` + description into the matched product's `store.json` entry via 09-04's `attach_store_media`, with images/description staying 100% staff-owned — plus `JINXXY_DEPLOY.md` giving the cinema operator an unambiguous env/restart/key-rotation checklist.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-07-11T07:34:09Z
- **Completed:** 2026-07-11T07:38:49Z
- **Tasks:** 2 (Task 1 TDD)
- **Files:** 3 (1 created, 2 modified — all in ../nocturna-bot)

## Accomplishments
- `cogs/jinxxy.py` — added `/tienda medios` on the existing `JinxxyCog` GroupCog: `producto` (autocompleted checkoutUrl), `imagen1` + optional `imagen2..4` (`discord.Attachment`), optional `descripcion_es`/`descripcion_en`. Staff gate FIRST (T-09-18) before defer or any attachment read; attachments read then `optimize_to_webp` run off the event loop via `asyncio.to_thread`; a None-skipping description dict; one `attach_store_media(checkoutUrl, media, description)` call; `GitHubPublishError` → `log.exception` + an ephemeral staff-facing reply (D-05).
- `cogs/jinxxy.py` — module-level `_slug_from_url` (sanitised `[a-z0-9-]` base, hash fallback) + `_optimize_attachments(raws, slug)` (returns `[(webp, "{slug}-{index}.webp")]`), and `_producto_choices` — a staff-gated, snapshot-backed autocomplete (`[]` for non-staff with NO store read; ≤25 Choices, `label=name`/`value=checkoutUrl` for staff) that the registered `@medios.autocomplete("producto")` delegates to.
- `tests/test_jinxxy_cog.py` — +10 unit tests (optimize filenames, autocomplete staff/non-staff/cap, attach-once + checkoutUrl + description shape, None-locale omission, no-description→None, staff-gate-before-read, publish-error ephemeral).
- `JINXXY_DEPLOY.md` — cinema-host deploy checklist: `.env` additions (`JINXXY_API_KEY` `products_read` + dashboard URL, `JINXXY_ANNOUNCE_CHANNEL_ID=1525202600738295818`, `JINXXY_POLL_HOURS`, `JINXXY_STAFF_ROLE_IDS`, `WEBSITE_STORE_*`), Phase-5-reused `GITHUB_PAT`/`WEBSITE_REPO`/`WEBSITE_BRANCH` (never re-committed), `git pull` + `systemctl restart` steps, mandatory API-key rotation reminder, first-run flow.
- Full bot suite green: **313 passed** (was 303 after 09-05; +10).

## Task Commits

Each task committed atomically in the **nocturna-bot** repo (`revamp`); Task 1 followed a TDD RED→GREEN cycle:

1. **Task 1 (RED): failing tests for /tienda medios attach flow** — `8e997d2` (test)
2. **Task 1 (GREEN): /tienda medios + _optimize_attachments/_slug_from_url + _producto_choices** — `cd5eaaf` (feat)
3. **Task 2: cinema-host deploy notes (JINXXY_DEPLOY.md)** — `494f12d` (docs)

**Plan metadata (website repo):** committed with this SUMMARY + STATE.md + ROADMAP.md + REQUIREMENTS.md.

_Code/doc commits live in ../nocturna-bot; planning artifacts live in the website repo._

## TDD Gate Compliance

Task 1 is `tdd="true"`: `8e997d2` (`test(09-06)`) precedes `cd5eaaf` (`feat(09-06)`) — RED before GREEN. The RED run failed with `AttributeError: module 'cogs.jinxxy' has no attribute 'image_optimize'` (feature/import absent), confirming no test passed unexpectedly. No REFACTOR commit needed. Task 2 is `type="auto"` (docs) and lands after GREEN.

## Files Created/Modified
- `../nocturna-bot/cogs/jinxxy.py` — `_slug_from_url` + `_optimize_attachments` helpers, `/tienda medios` command, `_medios_producto_autocomplete` + `_producto_choices`; `image_optimize`/`hashlib`/`re` imports added.
- `../nocturna-bot/tests/test_jinxxy_cog.py` — +10 attach-flow unit tests.
- `../nocturna-bot/JINXXY_DEPLOY.md` — cinema-host deploy checklist (new).

## Decisions Made
- **Local-snapshot autocomplete over cross-repo fetch.** `_producto_choices` reads `db.get_store_snapshot()` (local SQLite) not `_fetch_store` (a GitHub round-trip), so per-keystroke suggestions stay fast; the snapshot already carries `name` + `checkoutUrl`, exactly what the Choices need.
- **None-vs-empty locale distinction.** The description dict includes a locale key only when its param `is not None` — an empty string is a deliberate clear, but an absent param rides 09-04's None-skip so a single-locale edit never wipes the other locale.
- **Filename base from the checkoutUrl slug, re-sanitised.** `_slug_from_url` takes the URL's last path segment (the Jinxxy slug) and strips it to `[a-z0-9-]` with a hash fallback, giving stable, collision-resistant, user-text-free filenames.

## Deviations from Plan

None - plan executed exactly as written.

The plan's `<verify>` grep for `rotat` (`grep -qi "rotat"`) required the literal substring `rotat`, which the Spanish "rotación"/"rotarse" do not contain; the security heading includes the English "API key rotation" so the acceptance grep matches — this is doc wording to satisfy the specified check, not a behavioural change.

## Issues Encountered
None functional. RED confirmed all 10 tests failing (import/feature absent); GREEN passed all 10 plus the 15-test 09-05 regression and the full 313-test bot suite. Git emitted the usual cosmetic `LF will be replaced by CRLF` warnings.

## Known Stubs
None. Every code path has a data source and test coverage. (Note: a freshly-synced product renders the branded placeholder + empty description until staff run `/tienda medios` — this is the intentional D-15 design, not a stub; the empty-description seed from 09-03 keeps the card past `StorePage.astro`'s structural filter.)

## Threat Model Compliance
- **T-09-18 (non-staff `/tienda medios` + autocomplete):** `_is_staff` is the FIRST statement in `medios` — a non-staff caller gets "Sin permisos." before `defer` or any attachment read (test asserts `att.reads == 0` and `attach` not awaited); `_producto_choices` returns `[]` for non-staff with NO `get_store_snapshot` call (test asserts zero store reads). Mitigated.
- **T-09-19 (malicious filename / raw user text in a committed path):** filenames are `{_slug_from_url}-{index}.webp` (sanitised `[a-z0-9-]` + numeric index, hash fallback); `optimize_to_webp` re-encodes the bytes (strips EXIF/GPS, decompression-bomb guard intact) so upload bytes never land verbatim (test asserts re-encoded output + `.webp` numeric names). Mitigated.
- **T-09-20 (XSS via staff description text):** the transport writes description as data verbatim (no HTML); the site renders `store.json` through Astro auto-escaping (T-06-01) — description is data end-to-end. Mitigated (no bot-side change needed).
- **T-09-21 (leaked/committed API key):** `JINXXY_DEPLOY.md` mandates rotating the planning-pasted key and keeping `JINXXY_API_KEY` `.env`-only, never committed. Mitigated.
- **T-09-SC (pip installs):** no new packages — reuses existing Pillow via `image_optimize`. Accepted.

## User Setup Required
The live cinema host `.env` must have `JINXXY_API_KEY` (fine-grained, `products_read`) before the bot starts (fail-fast from 09-05). `JINXXY_ANNOUNCE_CHANNEL_ID` has the D-18 default; `JINXXY_STAFF_ROLE_IDS` falls back to `GALLERY_STAFF_ROLE_IDS`. The full checklist — including the mandatory API-key rotation after this phase ships — is in `../nocturna-bot/JINXXY_DEPLOY.md`. Live verification of a real `/tienda medios` (staff attaches → commit → card renders) is a human deploy-time step.

## Next Phase Readiness
- The store-sync chain is complete end-to-end: sync imports products (09-05), and staff now complete each card's visuals/copy via `/tienda medios` (this plan) — STORE-SYNC-02 satisfied.
- This is the last plan of Phase 9; all six plans have SUMMARYs. Ready for `/gsd:verify-work 09` and phase close-out.
- No blockers.

## Self-Check: PASSED
- FOUND: ../nocturna-bot/cogs/jinxxy.py
- FOUND: ../nocturna-bot/tests/test_jinxxy_cog.py
- FOUND: ../nocturna-bot/JINXXY_DEPLOY.md
- FOUND commits: 8e997d2 (test), cd5eaaf (feat), 494f12d (docs)
- Full bot suite: 313 passed (303 prior + 10 new), zero failures; `cogs/jinxxy.py` parses; all doc greps (`JINXXY_ANNOUNCE_CHANNEL_ID`, `rotat`, `products_read`) match

---
*Phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse*
*Completed: 2026-07-11*
