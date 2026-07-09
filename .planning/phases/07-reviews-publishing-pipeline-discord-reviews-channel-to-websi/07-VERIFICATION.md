---
phase: 07-reviews-publishing-pipeline-discord-reviews-channel-to-websi
verified: 2026-07-09T06:45:53Z
status: human_needed
score: 25/25 automated must-haves verified
overrides_applied: 0
human_verification:
  - test: "Plain client review in the reviews channel gets a bot ✅"
    expected: "Bot adds ✅ pending reaction to a non-bot message with text in the reviews channel"
    why_human: "Requires a live Discord message event; cannot be triggered from static code inspection"
  - test: "Staff ✅ publishes a review; non-staff/bot ✅ never publishes"
    expected: "Staff reaction triggers an atomic 'reviews: publish review (discord msg …)' commit on origin/revamp visible in nocturna-bot; non-staff reaction does nothing"
    why_human: "Requires live Discord reaction events + a real GitHub PAT/commit round-trip"
  - test: "Staff 🌙 unpublishes a published review / dismisses a pending one"
    expected: "🌙 on a 🟢 review removes its reviews.json entry and returns to pending; 🌙 on pending clears the ✅ prompt with no commit"
    why_human: "Requires live Discord reaction events"
  - test: "Deleting a published review message auto-unpublishes it"
    expected: "on_raw_message_delete fires and removes the reviews.json entry"
    why_human: "Requires a live message delete event"
  - test: "A transport failure surfaces ⚠️ + persistent reply, never 🟢"
    expected: "Simulate a GitHub outage in production; the message gets ⚠️ and a non-auto-deleting reply, no 🟢"
    why_human: "Requires forcing a live GitHub API failure against the production PAT/repo"
  - test: "Bot restart reconciles missed ✅/🌙/deletes and heals orphans"
    expected: "After a systemd restart on 'cinema', the reviews cursor resumes and orphaned entries (deleted messages) are cleaned up"
    why_human: "Requires a live bot restart on the production host — not exercised by unit tests with mocked Discord/GitHub"
  - test: "/panel_resenas posts the 2-button collection embed; non-staff gets 'Sin permisos.'"
    expected: "Running the slash command as staff posts the embed with both buttons; as non-staff, an ephemeral refusal"
    why_human: "Requires a live guild-synced app command interaction"
  - test: "Clicking each button opens a 500-char modal; submitting posts a review embed with/without the submitter's name"
    expected: "Named button → embed shows display name; anonymous button → embed shows 'Anónimo' and no name anywhere"
    why_human: "Requires live Discord UI interaction (modal open/submit) not exercisable from unit tests alone"
  - test: "Collection embed buttons survive a bot restart"
    expected: "After a restart, the persistent view's buttons still route to the modal (bot.add_view registration takes effect against a real gateway session)"
    why_human: "Persistent-view routing across a real restart can only be confirmed live"
  - test: "Visual QA of the populated testimonials section"
    expected: "Cards render correctly (spacing, quote glyph, 3×3 grid, paper rhythm) with real published reviews"
    why_human: "Visual/aesthetic judgment — deferred by 07-01-SUMMARY itself pending real bot-published entries"
---

# Phase 7: Reviews Publishing Pipeline Verification Report

**Phase Goal:** Client reviews written in the Discord reviews channel (ID `1453534905706221600`) reach the public website as staff-curated testimonials with zero code changes per review: `ReviewsCog` in `nocturna-bot` (2-button named/anonymous collection embed + staff ✅ reaction publication gate) publishes to `src/data/reviews.json` in the website repo via the `github_publish` transport, and the website renders a bilingual-aware testimonials section on the landing.

**Verified:** 2026-07-09T06:45:53Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Landing shows testimonial cards (verbatim text, author-or-Anónimo, localized month+year) when reviews.json has entries | ✓ VERIFIED | `src/components/sections/Reviews.astro` L41-68; live-tested with a temp entry — build produced `— {author} · {localized date}` figcaption and escaped blockquote text |
| 2 | Testimonials section renders no markup when reviews.json is `[]` | ✓ VERIFIED | `npm run build` with `reviews.json=[]`; `grep -rl "data-reviews" dist/` → no match (exit 1) |
| 3 | Review body rendered through Astro auto-escaping; HTML/script cannot execute | ✓ VERIFIED | Temp entry with `<b>x</b>` built to `dist/es/index.html` as `&lt;b&gt;x&lt;/b&gt;` (escaped); `grep "set:html" Reviews.astro` → absent |
| 4 | Section chrome localized ES/EN from pages.json; review body never translated | ✓ VERIFIED | `pages.json` `es.reviews`={tag:"Reseñas",title:"Lo que dicen nuestros clientes",anonymous:"Anónimo"}, `en.reviews`={tag:"Reviews",title:"What our clients say",anonymous:"Anonymous"} — confirmed via node eval |
| 5 | reviews.json ships committed as `[]` so build always succeeds | ✓ VERIFIED | `src/data/reviews.json` = `[]`; `npm run build` exits 0; reverted cleanly after temp-entry test (`git diff` empty) |
| 6 | `publish_review` commits ONE entry atomically, keyed/deduped by discord message id | ✓ VERIFIED | `core/github_publish.py::_publish_review_sync` L402-432 — single tree entry, drops matching id then appends; `test_publish_is_idempotent_dedupes_by_id` passes |
| 7 | `publish_review` preserves `author: null` verbatim | ✓ VERIFIED | `test_publish_preserves_author_null` + `test_remove_preserves_author_null_on_the_kept_entries` pass |
| 8 | `remove_review` drops matching entry; no-op (no empty commit) when no match | ✓ VERIFIED | `_remove_review_sync` L435-467 returns `{"committed": False}` on no-match; `test_remove_with_no_matching_entry_is_a_noop_no_empty_commit` passes |
| 9 | Gallery transport UNCHANGED — full `test_github_publish.py` suite still passes | ✓ VERIFIED | `pytest tests/test_reviews_publish.py tests/test_github_publish.py -q` and full `pytest tests/ -q` → 155 passed, 0 failed |
| 10 | `reviews_state` is a separate 1-row cursor table from `gallery_state`, round-trips | ✓ VERIFIED | `core/db.py` L82-121 `init_reviews_state`/`get_reviews_cursor`/`set_reviews_cursor` on distinct table; unit tests pass |
| 11 | GitHub PAT rides only in Authorization header, never reaches logs | ✓ VERIFIED | `test_authorization_header_is_bearer_pat_on_every_call` + `test_pat_is_never_written_to_logs` (caplog) pass |
| 12 | Three reviews env vars documented in `.env.example` alongside gallery vars | ✓ VERIFIED | `.env.example` L54-56: `REVIEWS_CHANNEL_ID`, `REVIEWS_STAFF_ROLE_IDS`, `WEBSITE_REVIEWS_JSON` |
| 13 | Plain client message in reviews channel gets ✅ pending control | ✓ VERIFIED | `cogs/reviews.py::on_message` L261-271; unit tests `test_reconcile_client_review_without_prompt_adds_check` etc. |
| 14 | Staff ✅ publishes (author=display name); non-staff/bot reaction never publishes | ✓ VERIFIED | `on_raw_reaction_add` L273-300 gates on `_is_staff(payload.member)`; `_publish` L302-342; `test_reconcile_non_staff_check_does_not_publish` passes |
| 15 | Staff 🌙 on published review removes+returns to pending; 🌙 on pending dismisses with no commit | ✓ VERIFIED | `_unpublish` L344-379 branches on `_is_published`; commit only in the published branch |
| 16 | Deleting a published review message auto-unpublishes its entry | ✓ VERIFIED | `on_raw_message_delete` L424-446 calls `remove_review(payload.message_id)` (safe no-op semantics from #8) |
| 17 | Transport failure surfaces persistent ⚠️+reply; 🟢 never added on failure | ✓ VERIFIED | `_publish` L320-327 catches `GitHubPublishError` → `_surface_failure`, returns before the 🟢 block |
| 18 | Startup reconcile heals missed ✅/🌙/deletes + orphans after the reviews cursor | ✓ VERIFIED | `_backfill` L463-495, `_reconcile` L550-583, `_reconcile_orphans` L497-533 (NotFound-only removal, T-07-06 guard) |
| 19 | Staff command posts a collection embed with 2 buttons ("Reseña con nombre"/"Reseña anónima") | ✓ VERIFIED | `panel_resenas` L233-259 (`_is_staff` or `DISCORD_USER_ID` gate); `ReviewCollectView` L201-222 defines both buttons |
| 20 | Clicking a button opens a modal with 1 field capped at 500 chars | ✓ VERIFIED | `ReviewModal.__init__` L156-166: `discord.ui.TextInput(..., max_length=500, style=paragraph)` |
| 21 | Named modal posts review with display name; anonymous posts with NO submitter name anywhere | ✓ VERIFIED | `_build_review_embed` L66-82: anonymous branch never sets `set_author`, no reference to `interaction.user.*`; `test_anonymous_modal_embed_omits_submitter_identity` passes |
| 22 | Bot adds ✅ pending control to its own posted review message | ✓ VERIFIED | `ReviewModal.on_submit` L179-180: `sent.add_reaction("✅")` (required since `on_message` skips bot messages) |
| 23 | Staff ✅ on bot-posted review publishes with author=name (named) or null (anonymous) | ✓ VERIFIED | `_review_author_and_text` L108-116 maps embed author→name / no author→None; `test_anonymous_bot_review_publishes_with_author_none` passes |
| 24 | Collection embed buttons survive a bot restart (persistent view re-registered) | ✓ VERIFIED | `ReviewCollectView.__init__` L211-212 `super().__init__(timeout=None)`; `on_ready` L457 `self.bot.add_view(ReviewCollectView())`; stable custom_ids `REVIEW_BTN_NAMED`/`REVIEW_BTN_ANON` |
| 25 | `_reconcile` converges bot-posted review embeds on restart (marker-aware, not blanket-skipped) | ✓ VERIFIED | `_reconcile` L562 replaces "skip all bot" with `if message.author.bot and not _is_own_review_embed(message): return`; `test_reconcile_bot_review_embed_staff_check_publishes` + 3 sibling tests pass |

**Score:** 25/25 truths verified (all automated must-haves)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/data/reviews.json` | Committed `[]` | ✓ VERIFIED | Content is `[]`; build green; reverted cleanly after temp-entry proof |
| `src/components/sections/Reviews.astro` | Build-time testimonials section | ✓ VERIFIED | 113 lines; figure/blockquote/figcaption; empty→null; no set:html |
| `src/i18n/pages.json` | `reviews` key under es/en | ✓ VERIFIED | Both locales present with exact copy |
| `src/pages/[lang]/index.astro` | `<Reviews lang={lang}>` wired after Teaser | ✓ VERIFIED | L15 import, L96 placement after `<Teaser ... variant="gallery" />` (L95) |
| `nocturna-bot/config.py` | REVIEWS_CHANNEL_ID / REVIEWS_STAFF_ROLE_IDS / WEBSITE_REVIEWS_JSON | ✓ VERIFIED | L77-84, gallery-role fallback confirmed |
| `nocturna-bot/.env.example` | Three reviews vars documented | ✓ VERIFIED | L54-56 |
| `nocturna-bot/core/db.py` | reviews_state cursor helpers | ✓ VERIFIED | L82-121, separate table from gallery_state |
| `nocturna-bot/core/github_publish.py` | publish_review/remove_review + _fetch_json + fetch-param retry | ✓ VERIFIED | L151(_fetch_json), L229(_commit_with_retry fetch=), L402/435/470/489 |
| `nocturna-bot/tests/test_reviews_publish.py` | Contract tests, HTTP mocked | ✓ VERIFIED | 19 tests, all passing, cover every plan behavior bullet |
| `nocturna-bot/cogs/reviews.py` | ReviewsCog full pipeline + guided flow | ✓ VERIFIED | 629 lines; class ReviewsCog, ReviewModal, ReviewCollectView all present and wired |
| `nocturna-bot/bot.py` | cogs.reviews loaded + fail-fast | ✓ VERIFIED | L46 load_extension, L102-103 fail-fast |
| `nocturna-bot/tests/test_reviews_cog.py` | Cog unit tests | ✓ VERIFIED | 52 tests (40 from 07-03 + 12 from 07-04), all passing |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `Reviews.astro` | `src/data/reviews.json` | build-time import | ✓ WIRED | L22 `import reviewsData from '../../data/reviews.json'` |
| `[lang]/index.astro` | `Reviews.astro` | component placement | ✓ WIRED | L15 import, L96 `<Reviews lang={lang} />` |
| `github_publish.py::publish_review` | `config.WEBSITE_REVIEWS_JSON` | single-JSON-blob tree entry | ✓ WIRED | L413, L421-427 |
| `_commit_with_retry` | `_fetch_json`/`_fetch_gallery` | optional `fetch` callable | ✓ WIRED | L229-241, default preserves gallery behavior |
| `reviews.py::_publish` | `github_publish.publish_review` | entry dict | ✓ WIRED | L318-321 |
| `reviews.py::on_raw_reaction_add` | `_is_staff` (REVIEWS_STAFF_ROLE_IDS) | staff trust gate | ✓ WIRED | L282 |
| `reviews.py::on_ready` | `db.get_reviews_cursor`/`set_reviews_cursor` | backfill cursor | ✓ WIRED | L479, L489 |
| `ReviewModal.on_submit` | reviews channel + ✅ | send + add_reaction | ✓ WIRED | L179-180 |
| `_review_author_and_text` | bot review embed | embed footer/author parse | ✓ WIRED | L108-116 |
| `_reconcile` | `_is_own_review_embed` | marker-aware dispatch | ✓ WIRED | L562 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `Reviews.astro` | `reviews` (from `reviewsData`) | `src/data/reviews.json` (committed by bot's `publish_review` commits) | Yes — file is the real cross-repo commit target; verified end-to-end by temp-entry build proof | ✓ FLOWING |
| `cogs/reviews.py` entries used by `_reconcile`/`_is_published` | `_fetch_entries()` | `github_publish._fetch_json` against `config.WEBSITE_REPO`/`WEBSITE_BRANCH`/`WEBSITE_REVIEWS_JSON` (the SAME repo this Reviews.astro reads) | Yes — same file, same repo/branch; degrades safely to `[]` on fetch failure (never fabricates data) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Website build succeeds with reviews.json=[] | `npm run build` | 14 pages built, exit 0 | ✓ PASS |
| Empty section emits no markup | `grep -rl "data-reviews" dist/` | no match | ✓ PASS |
| XSS-safe rendering | temp entry with `<b>x</b>` → build → grep `dist/es/index.html` | `&lt;b&gt;x&lt;/b&gt;` present, raw `<b>x</b>` absent | ✓ PASS |
| reviews.json reverted cleanly | `git diff src/data/reviews.json` | empty | ✓ PASS |
| Full bot test suite | `python -m pytest tests/ -q` (nocturna-bot) | 155 passed | ✓ PASS |
| Reviews transport + gallery regression gate | `pytest tests/test_reviews_publish.py tests/test_github_publish.py -q` | 45 passed (19 reviews + 26 gallery-adjacent incl. base) | ✓ PASS |
| bot.py fail-fast + cog registration present | `grep "cogs.reviews\|REVIEWS_CHANNEL_ID" bot.py` | load_extension + fail-fast both found | ✓ PASS |

### Probe Execution

No `scripts/*/tests/probe-*.sh` convention or PLAN/SUMMARY-declared probes found for this phase. This phase's verification is carried by its own pytest suites (executed above) and the website build, not a separate probe harness.

Step 7c: SKIPPED (no probes declared or discovered for this phase).

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|-----------------|--------------|--------|----------|
| REV-01 | 07-01 | Website renders bilingual testimonials, empty→nothing | ✓ SATISFIED | Truths #1-5, artifacts table |
| REV-02 | 07-03, 07-04 | ReviewsCog collects via 2-button embed+modal AND plain typed reviews, marks ✅ | ✓ SATISFIED | Truths #13, #19-22. Note: REQUIREMENTS.md checkbox for REV-02 is still `[ ]` unchecked despite full implementation and passing tests — a stale tracking-doc issue, not a functional gap (see Anti-Patterns note below) |
| REV-03 | 07-03 | Staff ✅ publishes / 🌙 or delete unpublishes, staff-gated | ✓ SATISFIED | Truths #14-17 |
| REV-04 | 07-02, 07-04 | Anonymous reviews store author:null, no identity leak | ✓ SATISFIED | Truths #7, #21, #23 |
| REV-05 | 07-02, 07-03, 07-04 | Transport reuse without gallery regression; restart converges via backfill+orphan reconcile | ✓ SATISFIED | Truths #9, #18, #25 |

No orphaned requirements — REQUIREMENTS.md's Phase 7 section (REV-01…REV-05) is fully claimed across the four plans' `requirements` frontmatter fields.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `.planning/REQUIREMENTS.md` | 74 | REV-02 checkbox unchecked (`[ ]`) while REV-01/03/04/05 are checked, and the phase/code fully implements REV-02 | ℹ️ Info | Documentation-tracking inconsistency only; does not affect phase goal achievement (functionality verified via code + 52 passing cog tests) |

No debt markers (TBD/FIXME/XXX/TODO/HACK) found in any phase-modified file. The one `placeholder=` match in `cogs/reviews.py` is a legitimate Discord `TextInput` UI placeholder string, not a stub marker. No stub returns, no hardcoded empty renders beyond the intentional empty-array launch state (which is the documented, tested design).

### Human Verification Required

### 1. Plain client review detection (live)

**Test:** Post a plain text message as a non-staff client in the live reviews channel.
**Expected:** The bot adds a ✅ reaction within moments.
**Why human:** Requires a live Discord gateway event; only unit-mocked in tests.

### 2. Staff ✅ publish / non-staff no-op (live)

**Test:** React ✅ as a staff role holder on a pending review; separately, react ✅ as a non-staff member.
**Expected:** Staff reaction produces a `reviews: publish review (discord msg …)` commit on `origin/revamp` (nocturna-bot repo) and the review appears on the site after the Pages rebuild; non-staff reaction does nothing.
**Why human:** Requires a live cross-repo commit against the production PAT/repo.

### 3. Staff 🌙 unpublish / dismiss (live)

**Test:** React 🌙 on a published (🟢) review, then on a pending (no 🟢) review.
**Expected:** Published → entry removed from reviews.json, message returns to pending; pending → ✅ prompt cleared, no commit.
**Why human:** Live reaction event.

### 4. Delete-unpublish (live)

**Test:** Delete a published review message.
**Expected:** Its reviews.json entry is auto-removed.
**Why human:** Live message-delete event.

### 5. Transport failure UX (live)

**Test:** Force a GitHub API failure (e.g. revoke/rotate the PAT temporarily) during a publish attempt.
**Expected:** ⚠️ reaction + persistent (non-auto-deleting) reply; 🟢 never added.
**Why human:** Requires forcing a live failure against the real transport/credentials.

### 6. Bot restart backfill/reconcile (live, production "cinema" host)

**Test:** Restart the bot service (`git pull` + systemd restart) after some Discord activity occurred while it was down.
**Expected:** The reviews cursor resumes, missed ✅/🌙/deletes are replayed, and orphaned reviews.json entries (deleted messages) are healed.
**Why human:** Requires an actual production restart; not exercised by mocked unit tests.

### 7. `/panel_resenas` staff-gated command (live)

**Test:** Run `/panel_resenas` as staff, then as a non-staff member.
**Expected:** Staff → the 2-button collection embed posts; non-staff → ephemeral "Sin permisos."
**Why human:** Requires a live guild-synced app command interaction.

### 8. Modal submission + anonymity (live)

**Test:** Click "Reseña con nombre" and submit; separately click "Reseña anónima" and submit.
**Expected:** Named → bot posts an embed with the submitter's display name + ✅; anonymous → bot posts an embed titled "Anónimo" with no name/id/mention anywhere + ✅.
**Why human:** Requires live Discord Modal UI interaction.

### 9. Persistent view survives restart (live, production host)

**Test:** After a bot restart, click a button on a previously-posted (now-uncached) collection embed.
**Expected:** The modal still opens (routed via `bot.add_view` re-registration).
**Why human:** Real gateway session + real restart required.

### 10. Visual QA of populated testimonials section

**Test:** With real published reviews on the live site, inspect the rendered section (spacing, quote glyph, 3×3 grid, paper rhythm, AA contrast).
**Expected:** Matches the Refined Street Editorial system; no layout breakage with real-world review lengths.
**Why human:** Aesthetic/visual judgment; the 07-01-SUMMARY itself deferred this pending real bot-published entries.

### Gaps Summary

No automated must-have failed. All 25 observable truths derived from the four plans' `must_haves` frontmatter (merged, since ROADMAP.md carries no separate `success_criteria` array for this phase — the phase goal + REV-01…REV-05 requirements are the contract) were verified directly against the codebase: the website build was actually run (not just claimed) with both an empty and a populated `reviews.json`, escaping was proven with a live temporary entry and reverted cleanly; the bot repo's full 155-test suite was re-run independently and passed, and the transport, cog, modal/view, and marker-aware reconcile code was read in full and matches every claimed behavior line-for-line. The gallery regression gate (`test_github_publish.py`) is included in that green run, satisfying the T-07-REG backward-compatibility requirement.

The only non-blocking finding is a stale checkbox in `.planning/REQUIREMENTS.md` (REV-02 left `[ ]` despite being fully implemented and tested) — a documentation-tracking artifact, not a code or functionality gap.

Everything that remains unverified is inherently live-Discord/production-only (button clicks, staff reactions, a real bot restart on the "cinema" systemd host, forcing a live transport failure) — these cannot be exercised by static/codebase verification and are correctly deferred to human testing, consistent with the plans' own `<verification>` sections which flagged them as manual post-deploy steps outside phase scope.

---

_Verified: 2026-07-09T06:45:53Z_
_Verifier: Claude (gsd-verifier)_
