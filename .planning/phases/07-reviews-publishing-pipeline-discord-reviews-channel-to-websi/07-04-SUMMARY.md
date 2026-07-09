---
phase: 07-reviews-publishing-pipeline-discord-reviews-channel-to-websi
plan: 04
subsystem: bot-reviews-cog
tags: [reviews, discord-cog, cross-repo, modal, persistent-view, anonymity, backfill]
requires:
  - cogs/reviews.py ReviewsCog + _review_author_and_text seam + _reconcile (07-03)
  - github_publish.publish_review / remove_review (07-02)
  - config.REVIEWS_CHANNEL_ID / REVIEWS_STAFF_ROLE_IDS / DISCORD_USER_ID
provides:
  - ReviewModal (500-char field) + ReviewCollectView (persistent 2-button embed)
  - /panel_resenas staff-gated command posting the collection embed
  - _is_own_review_embed marker + extended _review_author_and_text (bot embed → author|None)
  - marker-aware _reconcile that converges the cog's OWN review embeds on restart (REV-05)
affects:
  - nocturna-bot/cogs/reviews.py
  - nocturna-bot/tests/test_reviews_cog.py
tech-stack:
  added: none
  patterns:
    - Persistent discord.ui.View (timeout=None + stable custom_ids + bot.add_view) — net-new, no in-repo analog
    - discord.ui.Modal single 500-char paragraph field — net-new, no in-repo analog
    - Anonymity via embed-author sentinel: no embed author ⇒ author None ⇒ author:null in reviews.json
    - One marker predicate (_is_own_review_embed) shared by the author seam and the reconcile
key-files:
  created: []
  modified:
    - nocturna-bot/cogs/reviews.py
    - nocturna-bot/tests/test_reviews_cog.py
decisions:
  - "Anonymity enforced at the embed-build boundary: the anonymous on_submit branch never reads interaction.user; _build_review_embed(text, None) sets a fixed 'Anónimo' title and no author, so identity is eliminated before it can reach the embed/repo/logs (T-07-02)"
  - "Marker = a fixed embed footer text ('reseña'); _is_own_review_embed requires author.bot AND that footer, giving both the seam and _reconcile a single definition of 'the cog's own review embed'"
  - "Collection buttons only OPEN a modal; publication still passes the staff ✅ gate, so a public (no interaction_check) view is safe (T-07-07)"
  - "Persistent view registered in on_ready via bot.add_view (idempotent per custom_id set), gated by the same _backfilled once-guard as the backfill"
  - "The bot's own review message is a BOT message, so on_message never adds ✅ to it — the modal's on_submit adds the ✅ pending control itself"
  - "discord.py 2.5.2 View.__init__ requires a running event loop, so all view/modal instantiation (tests + verify) happens inside asyncio.run"
metrics:
  duration: ~30min
  tasks: 2
  files: 2
  completed: 2026-07-09
---

# Phase 07 Plan 04: Guided Collection Flow (Modal + Persistent View) Summary

The lowest-friction review-collection path, layered on top of the 07-03 reaction pipeline without a rewrite. A staff `/panel_resenas` command posts a persistent 2-button embed ("Reseña con nombre" / "Reseña anónima"); each button opens a `discord.ui.Modal` with one 500-character review field; on submit the bot posts a formatted review embed into the reviews channel and marks it ✅ pending — so it publishes through the SAME staff-gated pipeline as a plain typed review. The `_review_author_and_text` seam was extended so the pipeline resolves author/text from the bot's own review embeds, with anonymity guaranteed by an embed-author sentinel (no embed author ⇒ `author = None` ⇒ `author: null` in `reviews.json`), and `_reconcile` was made marker-aware so a bot restart converges the guided flow's own embeds instead of blanket-skipping every bot message (REV-05). Bot suite: 155 passed (was 143; +12 new tests).

## What Was Built

### Task 1 — ReviewModal + ReviewCollectView + anonymity contract + seam extension

`cogs/reviews.py` extended (never rewritten):

- **Review-embed contract constants:** `REVIEW_EMBED_FOOTER = "reseña"` (the marker), `REVIEW_EMBED_COLOR` (brand red `0xC0192C`, identity-free), `REVIEW_ANON_LABEL = "Anónimo"` (a fixed label, never the user's name), and the two stable button custom_ids `REVIEW_BTN_NAMED = "reviews:collect:named"` / `REVIEW_BTN_ANON = "reviews:collect:anon"`.
- **`_is_own_review_embed(message)`:** pure predicate — True iff `message.author.bot` AND an embed carries the marker footer. The single shared definition used by both the seam and `_reconcile`.
- **`_build_review_embed(text, author_name)`:** named ⇒ `embed.set_author(name=…)`; anonymous (`author_name is None`) ⇒ no author, fixed `"Anónimo"` title. Both carry the marker footer. Review text is embed content (data end-to-end — Discord never executes it, the website escapes it, T-07-01).
- **`ReviewModal(discord.ui.Modal)`:** one `discord.ui.TextInput(style=paragraph, max_length=500, required=True)`. `on_submit` branches on `self.anonymous` — the anonymous branch calls `_build_review_embed(text, None)` and NEVER references `interaction.user`; the named branch passes `interaction.user.display_name`. Posts the embed to `REVIEWS_CHANNEL_ID`, adds ✅ pending (on_message skips bots so the modal must), and replies ephemerally. All wrapped so a send failure is reported to the submitter, never raised.
- **`ReviewCollectView(discord.ui.View)`:** `super().__init__(timeout=None)` (persistent), two `@discord.ui.button` handlers with stable `custom_id`s each calling `interaction.response.send_modal(ReviewModal(anonymous=…))`. No `interaction_check` author lock (public embed).
- **`_review_author_and_text` extended:** FIRST branch — for the cog's own review embed, return `(embed author name or None, embed description)`; SECOND branch — unchanged 07-03 plain-client behavior. This is the single place mapping "no embed author → None", carrying anonymity through `_publish` into `author: null`.

### Task 2 — Staff command + persistent-view registration + marker-aware _reconcile + tests

- **`/panel_resenas` command:** `@app_commands.command` on `ReviewsCog` (guild-synced by `bot.py`'s `setup_hook`), gated to `_is_staff(member)` OR `config.DISCORD_USER_ID` — others get an ephemeral "Sin permisos." On success, sends the Spanish collection embed with `view=ReviewCollectView()` into the invoking channel and confirms ephemerally.
- **Persistent view re-registration:** `on_ready` calls `self.bot.add_view(ReviewCollectView())` (inside the `_backfilled` once-guard, before the backfill) so buttons route after a restart even when the panel message is uncached.
- **Marker-aware `_reconcile`:** the 07-03 "skip ALL bot messages" guard is replaced by `if message.author.bot and not _is_own_review_embed(message): return`. The cog's own review embeds are now treated as reviewable — resolve author/text via the seam, staff 🌙 → `_unpublish`, already-published (🟢 / entry match) → left alone, staff ✅ → `_publish`, no ✅ prompt → add it. Plain-client path unchanged.
- **`tests/test_reviews_cog.py` +12 tests:** marker recognition (bot+footer, non-marker footer, non-bot); seam over a bot embed with/without author; anonymous publish ⇒ `author is None` and named publish ⇒ display name; stable custom_ids on a `timeout=None` view; anonymous modal `on_submit` embed contains the text but NOT a fake display name (and named modal carries it); `_reconcile` over a bot review embed — staff ✅ publishes, staff 🌙 unpublishes, already-published left alone, and a non-marker bot message still skipped. Same SimpleNamespace + `asyncio.run` + `AsyncMock` harness (no pytest-asyncio, no live Discord).

## Verification Evidence

- Structure (inside `asyncio.run`): `ReviewCollectView().timeout is None`; button custom_ids `{reviews:collect:named, reviews:collect:anon}`; `ReviewModal.review_text.max_length == 500` and `style == paragraph`.
- `python -m pytest tests/ -q` → **155 passed** (was 143; +12 reviews-cog tests, no regressions).
- grep confirms `class ReviewModal`, `class ReviewCollectView`, `REVIEW_BTN_NAMED/ANON`, `REVIEW_EMBED_FOOTER`, `_is_own_review_embed`, `max_length=500`, `discord.TextStyle.paragraph`, two `interaction.response.send_modal(`, one `self.bot.add_view(ReviewCollectView())` in on_ready, one `@app_commands.command`, and 5 `_is_own_review_embed` references (seam + reconcile).
- The anonymous `on_submit` branch (`if self.anonymous:` → `_build_review_embed(text, None)`) contains no reference to `interaction.user.display_name/name/id/mention`.

## Deviations from Plan

None — plan executed as written. One environment note (not a deviation): discord.py 2.5.2's `View.__init__` calls `asyncio.get_running_loop()`, so `ReviewCollectView()`/`ReviewModal()` can only be instantiated inside a running event loop. Production paths (`on_ready` `bot.add_view`, button `send_modal`, command `send`) already run in the loop; the tests and the structural verification instantiate inside `asyncio.run`. The plan's literal verify one-liner (`v=reviews.ReviewCollectView()` at module scope) was adapted to run inside a coroutine — the acceptance assertions themselves are unchanged and pass.

## Threat Model Coverage

- **T-07-02 (information disclosure)** — mitigated: the anonymous `on_submit` branch never reads `interaction.user`; `_build_review_embed(text, None)` sets no author and a fixed "Anónimo" title; the seam maps "no embed author" → `None` → `author: null`. Asserted absent by grep + unit tests (anonymous publish `author is None`, modal embed omits a fake display name).
- **T-07-03 (elevation of privilege)** — mitigated: `/panel_resenas` gated to `_is_staff` OR `DISCORD_USER_ID`; publication stays staff-✅-gated; the marker-aware `_reconcile` still resolves reactors via `_reaction_by_staff` so downtime reactions from non-staff never publish.
- **T-07-01 (injection/XSS)** — mitigated: modal input capped at 500 chars; review text is embed content (Discord does not execute it) and the website escapes it (never `set:html`).
- **T-07-07 (stale-view spoof)** — mitigated: stable custom_ids + `bot.add_view` re-registration; buttons only open a modal, and any resulting review still passes the staff ✅ gate.
- **T-07-SC (supply chain)** — accepted: no new pip packages (`discord.ui.Modal`/`View` ship with the already-present discord.py 2.5.2).

No new threat surface beyond the plan's `<threat_model>`.

## Human Verification Items (autonomous run — not blocking)

Live Discord + production verification is a manual user step after deploying to the `cinema` systemd host (`git pull` in `nocturna-bot` + restart the unit):

1. Run `/panel_resenas` in the reviews channel (as staff) → a 2-button collection embed appears; a non-staff invoker gets "Sin permisos."
2. Click "Reseña con nombre" → a 500-char modal opens; submitting posts a bot review embed carrying your display name, with a ✅.
3. Click "Reseña anónima" → submitting posts a bot review embed showing "Anónimo" and NO name anywhere.
4. A staff ✅ on a bot-posted review publishes it (atomic `reviews: publish review …` commit); named ⇒ author = display name, anonymous ⇒ `author: null` in `reviews.json`.
5. Restart the bot → the collection embed's buttons still work (persistent view), and a pending bot-posted review with a staff ✅ from downtime publishes on backfill; a staff 🌙 unpublishes; an already-published embed is left alone.

## Cross-Repo Commits (nocturna-bot repo)

- `f824d43` — feat(07-04): guided collection flow — persistent 2-button view + 500-char modal + anonymity contract + marker-aware reconcile (cogs/reviews.py + tests/test_reviews_cog.py, single closeout commit after interrupted session)

## Self-Check: PASSED

Closeout verification (2026-07-09, orchestrator): full bot suite re-run = 155 passed (matches claim); cogs/reviews.py + tests committed as f824d43 on nocturna-bot main.
