---
phase: 07-reviews-publishing-pipeline-discord-reviews-channel-to-websi
plan: 03
subsystem: bot-reviews-cog
tags: [reviews, discord-cog, cross-repo, reaction-pipeline, backfill, staff-gate]
requires:
  - github_publish.publish_review / remove_review + _fetch_json (07-02)
  - config.REVIEWS_CHANNEL_ID / REVIEWS_STAFF_ROLE_IDS / WEBSITE_REVIEWS_JSON (07-02)
  - db.init_reviews_state / get_reviews_cursor / set_reviews_cursor (07-02)
  - cogs/gallery.py structural template (Phase 5, reused minus images)
provides:
  - cogs/reviews.py ReviewsCog — live ✅/🌙 reaction pipeline + startup backfill/reconcile
  - _review_author_and_text seam (07-04 extends it for bot review embeds)
  - bot.py cogs.reviews registration + REVIEWS_CHANNEL_ID fail-fast
affects:
  - nocturna-bot/bot.py (cog load list + main() fail-fast block)
tech-stack:
  added: none
  patterns:
    - Mirror the proven gallery cog structure, swapping transport + gate + channel and dropping image optimization
    - Single author/text resolution seam so 07-04 extends bot-embed handling without a rewrite
    - Id-keyed published-state (str(entry["id"]) == str(message.id)) — no filename regex
    - Orphan reconcile removes ONLY on discord.NotFound (transient errors never mass-remove)
key-files:
  created:
    - nocturna-bot/cogs/reviews.py
    - nocturna-bot/tests/test_reviews_cog.py
  modified:
    - nocturna-bot/bot.py
decisions:
  - "Reviews _publish/_reconcile do NOT gate on staff AUTHOR (unlike gallery) — a review comes from a client; only the ✅/🌙 REACTOR is staff-gated (REVIEWS_STAFF_ROLE_IDS)"
  - "Author/text routed through one seam (_review_author_and_text) returning (display_name, text) for plain client messages and (None, '') for empty — 07-04 extends it for the anonymous 2-button embed without touching _publish"
  - "_is_published keys directly by the Discord message id string (exact match, prefix non-collision) — simpler than gallery's filename parse because reviews carry no images"
  - "_reconcile skips ALL bot messages in this plan; 07-04 refines it to manage the cog's own review embeds"
metrics:
  duration: ~18min
  tasks: 2
  files: 3
  completed: 2026-07-09
---

# Phase 07 Plan 03: ReviewsCog Reaction Pipeline Summary

The working, shippable reaction-gated reviews pipeline: `cogs/reviews.py` detects plain typed client reviews in the reviews channel (adds ✅), publishes staff-approved reviews to `reviews.json` via the 07-02 cross-repo transport (🟢+🌙 markers, auto-deleting reply), unpublishes on 🌙 / message delete, surfaces transport failures (⚠️ + persistent reply, never 🟢), and reconciles missed state on startup via its own reviews cursor + an orphan pass — mirroring the production gallery cog minus image optimization. Registered in `bot.py` with a `REVIEWS_CHANNEL_ID` fail-fast and covered by a 40-test suite. This is the "complement" input path (plain typed reviews); the guided 2-button collection embed is layered on top in 07-04 through the `_review_author_and_text` seam.

## What Was Built

### Task 1 — Live pipeline (commit `76fe5de`)

`cogs/reviews.py` mirroring `cogs/gallery.py`, swapping transport (`publish_review`/`remove_review`), gate (`REVIEWS_STAFF_ROLE_IDS`) and channel (`REVIEWS_CHANNEL_ID`), and dropping all image machinery:

- **Pure helpers:** `_is_staff(member)` (reviews staff roles), `_review_author_and_text(message)` (the seam: `(display_name, stripped_text)` for a plain client message, `(None, "")` for empty content), `_is_published(message, entries=None)` (bot 🟢 marker OR `str(entry["id"]) == str(message.id)` — no filename regex).
- **`on_message`:** a NON-bot message with non-empty text in `REVIEWS_CHANNEL_ID` gets a ✅ pending control. Crucially the author is NOT staff-gated (a review comes from a client, the deliberate divergence from gallery's staff-image gate).
- **`on_raw_reaction_add`:** channel-guarded, bot/None-guarded, `_is_staff(payload.member)`-gated; accepts only ✅/🌙; fetches the message; ✅ → `_publish`, 🌙 → `_unpublish`.
- **`_publish`:** idempotent (skips if 🟢 present); builds `{"id": str(message.id), "author", "text", "date"}` with the millisecond-Z date shape; on `GitHubPublishError` → `_surface_failure(message, "publicar la reseña")` and never adds 🟢; on success adds 🟢+🌙, clears any stale ⚠️, and sends an auto-deleting Spanish reply. Post-commit bookkeeping wrapped so a failed 🟢/reply never re-surfaces as a publish failure.
- **`_unpublish`:** published (🟢) → `remove_review` + clear 🟢 + `_remove_own_reaction("🌙")` + mirrored auto-deleting reply (keeps 🟢 on failure); pending → dismiss the ✅ prompt, commit nothing.
- **`_surface_failure` / `_clear_warning` / `_remove_own_reaction`:** copied from gallery; only the Spanish verb changes (`"publicar la reseña"` / `"quitar la reseña"`), persistent reply has no `delete_after`.
- **`on_raw_message_delete`:** in `REVIEWS_CHANNEL_ID` calls `remove_review(payload.message_id)` with the same defensive logging + containment. `setup()` adds the cog.

### Task 2 — Startup reconcile + registration + tests (commit `34d9598`)

- **`cogs/reviews.py` extended:** `on_ready` (once-guarded), `_backfill` (resolve channel, read `db.get_reviews_cursor()`, fetch live entries once via `_fetch_entries`, scan `channel.history(after=…, oldest_first=True)` calling `_reconcile` + `db.set_reviews_cursor(message.id)` per message, then the orphan pass), `_reconcile_orphans` (per entry parse `int(entry["id"])`, skip malformed, `fetch_message`; `discord.NotFound` → `remove_review`, any other error leaves it untouched — T-07-06 mass-remove guard), `_fetch_entries` (`asyncio.to_thread(github_publish._fetch_json, …)`, degrade to `[]`), `_reconcile` (skip bot messages, require non-empty client text, staff 🌙 → unpublish, published → leave, staff ✅ → publish, no ✅ prompt → add it), and `_resolve_member` / `_reaction_by_staff` copied from gallery (cold-cache `fetch_member`, members intent stays OFF).
- **`bot.py`:** `await self.load_extension("cogs.reviews")` after `cogs.gallery`; a `main()` fail-fast that `sys.exit(1)` on missing `REVIEWS_CHANNEL_ID` (no separate staff-role check — it falls back to `GALLERY_STAFF_ROLE_IDS`, already validated).
- **`tests/test_reviews_cog.py`:** 40 tests mirroring `test_gallery_cog.py` (SimpleNamespace fakes + `asyncio.run` + `AsyncMock`, no pytest-asyncio): `_is_staff` true/false/bot; the seam for plain + empty messages; `_is_published` id-match true AND prefix non-collision (`"9876543210"` vs `987654321`); `on_message` (client text adds ✅; empty/other-channel/bot ignored); the `_publish` entry dict shape + markers; idempotency; failure surface (⚠️, no 🟢, persistent reply); unpublish/dismiss; delete-unpublish; raw-reaction gate + dispatch; reviews cursor round-trip; full `_reconcile` dispatch table; cold-cache `_reaction_by_staff` fetch fallback + fail-closed; empty-channel tolerance; orphan removal on NotFound; malformed-id skip; live-entry left alone; transient-error-never-a-deletion.

## Verification Evidence

- `python -c "from cogs import reviews; assert hasattr(reviews,'ReviewsCog') and hasattr(reviews,'_review_author_and_text') and hasattr(reviews,'_is_staff')"` → `import ok`.
- `python -m pytest tests/test_reviews_cog.py -q` → **40 passed**.
- `python -m pytest tests/ -q` → **143 passed** (was 103; +40 reviews cog, no regressions).
- `bot.py` parses; grep confirms `load_extension("cogs.reviews")` (L46) and the `REVIEWS_CHANNEL_ID` fail-fast (L102-103).
- Cog exposes `on_ready`, `_backfill`, `_reconcile_orphans`, `_reconcile`, `_resolve_member`, `_reaction_by_staff` and references `db.get_reviews_cursor` / `set_reviews_cursor`.

## TDD Gate Compliance

Both tasks carry `tdd="true"`, but the plan deliberately front-loads the cog implementation in Task 1 (verify = import + existing suite green) and lands the dedicated test suite in Task 2, so a strict per-task RED-before-GREEN was not followed — this mirrors how Phase 5's gallery cog was structured. The Task 2 test suite (`test_reviews_cog.py`) was authored against the Task 1 implementation and passed on first run (no cog bugs surfaced), and the whole `tests/` suite is green. The transport layer beneath it (07-02) did follow strict RED→GREEN. No behavior was shipped without test coverage.

## Deviations from Plan

None — plan executed as written. The seam, id-keyed published-state, no-staff-author gate for client reviews, and the T-07-06 orphan guard were all implemented exactly per the plan's `<behavior>` and `<threat_model>`.

## Threat Model Coverage

- **T-07-03 (elevation of privilege)** — mitigated: `_is_staff(payload.member)` gates every live ✅/🌙; the backfill resolves reactors via `_reaction_by_staff` + `_resolve_member` (cold-cache `fetch_member`) so a non-staff reaction during downtime never publishes (tested: non-staff live ignore, non-staff reconcile no-publish, fail-closed on NotFound).
- **T-07-02 (information disclosure)** — mitigated: for plain client messages the author is the client's own public display name; the entry carries no other identity. The anonymous (`author=None`) path is added in 07-04 through the seam.
- **T-07-06 (DoS / mass-remove)** — mitigated: `_reconcile_orphans` removes an entry ONLY on `discord.NotFound`; any other error leaves it untouched (tested with a 503 HTTPException and a RuntimeError — neither removes).
- **T-07-05 (DoS / publish failure)** — mitigated: `GitHubPublishError` (bounded retries in 07-02) surfaces ⚠️ + a persistent reply and never adds 🟢, so state stays recoverable.
- **T-07-SC (supply chain)** — accepted: no new pip packages (discord.py + the existing transport only).

No new threat surface beyond the plan's `<threat_model>`.

## Human Verification Items (autonomous run — not blocking)

Live Discord + production verification is a manual user step after deploying to the `cinema` systemd host (`git pull` in `nocturna-bot` + restart the unit), same as Phase 5:

1. A plain (non-bot) client message in the reviews channel gets a ✅ from the bot.
2. A staff ✅ publishes it (atomic `reviews: publish review (discord msg …)` commit on `origin/revamp`; the testimonials section renders it after the Pages rebuild); a non-staff/bot ✅ never publishes.
3. A staff 🌙 on a published review removes it + returns it to pending; a 🌙 on a pending review dismisses the ✅ with no commit.
4. Deleting a published review auto-unpublishes its entry.
5. A transport failure surfaces a persistent ⚠️ + reply, no 🟢.
6. On restart the backfill reconciles missed ✅/🌙/deletes after the reviews cursor and heals orphaned entries whose message is gone (expected: nothing to remove if the channel is clean).

## Notes for 07-04 (Collection embed)

- Extend `_review_author_and_text(message)` — the single seam — to also recognize the cog's own review embeds: named → `interaction.user.display_name`, anonymous → `author = None`. `_publish` already writes whatever author the seam returns; `author: null` is preserved verbatim by the transport.
- `_reconcile` currently skips ALL bot messages; 07-04 must refine that to manage the cog's own posted review embeds (the plain-client path stays untouched).
- The persistent 2-button view + 500-char modal have no in-repo analog (see 07-PATTERNS "No Analog Found") — write from discord.py conventions with `timeout=None`, stable `custom_id`s, and `bot.add_view(...)` re-registration.

## Cross-Repo Commits (nocturna-bot repo)

- `76fe5de` — feat(07-03): ReviewsCog live pipeline (detection, staff-gated publish/unpublish, failure UX, delete-unpublish)
- `34d9598` — feat(07-03): startup reconcile + bot.py registration/fail-fast + 40-test cog suite

## Self-Check: PASSED

- Files: `nocturna-bot/cogs/reviews.py`, `nocturna-bot/tests/test_reviews_cog.py`, `nocturna-bot/bot.py` — all FOUND.
- Commits: `76fe5de`, `34d9598` — both FOUND in the nocturna-bot git log.
