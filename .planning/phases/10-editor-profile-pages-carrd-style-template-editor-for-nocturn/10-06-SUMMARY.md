---
phase: 10-editor-profile-pages-carrd-style-template-editor-for-nocturn
plan: 06
subsystem: bot-transport
tags: [gallery-cog, github-data-api, editor-credit, nsfw, slug-autocomplete, nocturna-bot, tdd, cross-repo]

# Dependency graph
requires:
  - phase: 10-01
    provides: gallery.json optional `editor` (slug) + `nsfw` fields locked in the schema; editors.json array contract the slug validation reads against
  - phase: 10-05
    provides: core/github_publish.py editors transport already extended; this plan ADDS the gallery-credit path to the SAME shared file
provides:
  - core/github_publish.py publish_message() gained optional editor slug (D-11/D-12) + nsfw flag (D-04) written into the gallery.json entry
  - core/github_publish.py set_gallery_editor() — post-approve credit write path keyed by the D-14 msgID filename segment (no image re-upload, no-op-safe)
  - cogs/gallery.py /galeria creditar — ephemeral slug-autocomplete follow-up after ✅, _is_staff-gated, slug validated against live editors.json (D-12 exact match)
affects: [10-04 (portfolio auto-pull consumes gallery.json entry.editor === slug and skips nsfw === true)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reaction-only approve captures text via an ephemeral slug-autocomplete FOLLOW-UP command (reuses the Phase-9 /tienda editar staff-gate + slug-validate pattern, 09-12)"
    - "Post-publish field editor keyed by the D-14 {msgID} filename segment (mirrors _remove_sync / _set_store_editor_sync) — pure JSON read-modify-write, no image re-upload"
    - "Optional entry fields trail the Phase-4 shape and are OMITTED when unset (missing editor = uncredited, missing nsfw = SFW) so historical entries stay valid"
    - "Credit commit message references the message id ONLY — the raw editor slug is never interpolated (T-10-05-02 / T-09-22 hygiene)"

key-files:
  created:
    - ../nocturna-bot/tests/test_gallery_credit.py
  modified:
    - ../nocturna-bot/core/github_publish.py
    - ../nocturna-bot/cogs/gallery.py

key-decisions:
  - "Task 1 decision was PRE-RESOLVED by locked D-11/D-12 + RESEARCH Open Q1 → ephemeral slug-autocomplete follow-up after ✅ (no genuinely-open choice remained; not auto-mode guessing)"
  - "Threaded editor/nsfw through publish_message AND added a separate set_gallery_editor: the reaction carries no text so the credit lands via the follow-up (set_gallery_editor), while publish_message keeps the canonical optional-field entry shape in one place"
  - "set_gallery_editor updates ALL of a message's entries by {msgID} segment, no-op-safe (no match / unchanged → no commit), and never re-uploads the already-published images"
  - "store.json re-tag is a NO-OP locally (products == []); the live re-tag is deferred + documented (editor is already a staff-owned, sync-preserved field per 09-07/09-12, so a JinxxyCog sync won't fight it)"

requirements-completed: [EDIT-08]

# Metrics
duration: 20min
completed: 2026-07-14
---

# Phase 10 Plan 06: Gallery Editor-Credit + NSFW Flag Summary

**Closed EDIT-08: extended the live gallery ✅ approve flow to credit an editor slug into `gallery.json` `entry.editor` (D-11/D-12) and flag a photo NSFW as `entry.nsfw = true` (D-04), via an ephemeral slug-autocomplete follow-up command that reuses the Phase-9 `/tienda editar` staff-gate + slug-validation pattern — plus the transport half (`publish_message` optional fields + a new `set_gallery_editor` post-approve write path). Full bot suite 435/435 (was 418; +17 TDD).**

## Performance
- **Duration:** ~20 min
- **Tasks:** 3 (Task 1 decision pre-resolved; Task 2 `auto`+`tdd`; Task 3 data re-tag → local no-op)
- **Files:** 3 in `../nocturna-bot` (1 created, 2 modified); 0 in the website repo (store.json unchanged — see Task 3)
- **Tests:** +17 (12 transport, 5 cog); full bot suite 435 passed (was 418)

## Accomplishments

### Task 1 — Credit affordance decision (pre-resolved)
The `checkpoint:decision` was already locked by the phase's own decisions and research, so no user prompt was needed:
- **D-11** — "assigned by extending the existing gallery ✅ approve flow (captured at approval time)."
- **D-12** — "Staff set it via slug-autocomplete on `/tienda editar` (existing) and the extended gallery approve flow (D-11)."
- **RESEARCH Open Q1 (RESOLVED 2026-07-14)** — "default: ephemeral slug-autocomplete after ✅, the Phase-9 `/tienda editar` pattern."

→ **Chosen: `ephemeral-autocomplete`** — an ephemeral slug-autocomplete follow-up after ✅. A reaction carries no text (Pitfall 7), so the credit is captured by a separate staff-gated slash command with an editor-slug autocomplete, validated against `editors.json` before any write.

### Task 2 — Capture editor credit + NSFW flag (TDD)
- **Transport (`core/github_publish.py`):**
  - `publish_message(message_id, entries, date=None, *, editor=None, nsfw=False)` — `_publish_sync` now trails the Phase-4 entry shape with an OPTIONAL `editor` slug (D-11/D-12) and `nsfw: true` flag (D-04); both are omitted when unset (missing `editor` = uncredited, missing `nsfw` = SFW). Uncredited publishes are byte-identical to before → no BOT-01/02 regression.
  - `set_gallery_editor(message_id, *, editor=None, nsfw=None)` + `_set_gallery_editor_sync` — the post-✅ credit write path: matches every entry whose filename parses to `{msgID}` (D-14, same key as `_remove_sync`), sets `editor`/`nsfw` per the passed args (independent so a partial credit never clobbers the other field), and commits ONE `gallery.json` blob via the audited `_commit_with_retry`. No image re-upload (photos already published). No-op-safe: no matching entries (never published / sample-named) OR an unchanged credit → `committed: False`, no ref PATCH. Commit message is `gallery: credit editor on discord msg <id>` — the raw slug is never interpolated.
- **Cog (`cogs/gallery.py`):** added `from discord import app_commands` and a `galeria` app-command group with `/galeria creditar mensaje editor [nsfw]`:
  - `_is_staff`-gated FIRST (T-10-06-01) — a non-staff invoker gets "Sin permisos." before any work.
  - message-id parsed before defer; slug validated against the live `editors.json` slug set (D-12 exact match, T-10-06-02) — an unknown slug is rejected with an ephemeral reply and NO write.
  - `@creditar.autocomplete("editor")` → `_editor_choices` offers each existing editor slug (staff-only, `[]` for non-staff, substring-filtered, capped at 25) — mirrors 09-12's `_producto_choices`.
  - Command body delegates to the plainly-testable `_do_creditar` / `_editor_choices` / `_fetch_editor_slugs` (the registered Command is awkward to reach in unit tests) — same seam idiom as `cogs/jinxxy.py`.

### Task 3 — Re-tag store.json editor values to slugs
- `src/data/store.json` `products` is `[]` in this checkout (the live store data lives on the deployed branch), so there was **nothing to re-tag locally** — the plan's verification (`products[].editor` all match `^[a-z0-9-]+$`) passes trivially (0 products, 0 bad). No file change, no commit for this task. See **Deferred / Coordination** below for the live re-tag.

## Task Commits
Task 2 committed atomically in `../nocturna-bot` (main branch, sequential execution — NOT this website repo):
1. **Task 2 RED** — `54cb152` (test: 17 failing gallery-credit tests)
2. **Task 2 GREEN** — `921261a` (feat: transport optional fields + `set_gallery_editor` + `/galeria creditar`)

Task 1 wrote no code (decision). Task 3 wrote no code (local no-op). Plan metadata (this SUMMARY + STATE/ROADMAP/REQUIREMENTS) committed in the website repo, separate from the bot commits.

## Decisions Made
- The Task-1 decision was resolved by locked context (D-11/D-12) + the resolved RESEARCH Open Q1, not by auto-mode guessing — `ephemeral-autocomplete` was the only design consistent with the phase's own decisions.
- Kept `publish_message`'s new `editor`/`nsfw` off by default (the reaction-only ✅ can't carry them) and made `set_gallery_editor` the actual affordance write path, while still adding the optional fields to the canonical entry writer so there's a single entry shape for the credit.
- `editors.json` slug validation fails closed: a fetch failure degrades to an empty slug set, so a credit is never written against an unverifiable set.

## Deviations from Plan
**None — plan executed as written.** Task 1's checkpoint was satisfied by pre-existing locked decisions (documented above) rather than a live prompt; Task 3 was a documented no-op because local `products` is empty. No auto-fixes were required.

## Deferred / Coordination (live store.json re-tag, D-12)
The live re-tag must be applied against the **deployed** `store.json` (the branch the JinxxyCog syncs), not this local `[]` checkout:
- Any free-text `products[].editor` value currently on the deployed store must be changed to the matching **exact editor slug** (D-12) via the existing **`/tienda editar`** command (09-12) — staff never hand-edit `store.json`.
- Coordination is safe: `editor` is a **staff-owned, sync-preserved** field (absent from `SYNC_OWNED`, re-grafted by `sync_store`'s `_GRAFT_KEYS` per 09-07), so a concurrent JinxxyCog sync will NOT revert the re-tag.
- The portfolio auto-pull (10-04) matches `p.editor === slug` on the store side and `g.editor === slug && g.nsfw !== true` on the gallery side, so both sources must use slugs going forward.

## Known Stubs
None. `editors.json` is currently `[]` (no editors created yet), so the credit affordance validates against an empty slug set and rejects every slug until the admin app (10-08/10-09) creates editors — this is correct fail-closed behavior (D-12 exact existing slug), not a stub.

## Next Phase Readiness
- The gallery half of D-04/D-11/D-12 is live: staff can credit a published photo's editor slug + NSFW flag into `gallery.json`. 10-04's portfolio block can now consume `entry.editor`/`entry.nsfw`.
- No blockers introduced. Cinema host needs `git pull` + systemd restart to surface `/galeria creditar` (same restart the phase-9/10 bot changes already require).

## Self-Check: PASSED
- FOUND: `../nocturna-bot/core/github_publish.py` (contains `set_gallery_editor`, `_set_gallery_editor_sync`, `editor`/`nsfw` in `_publish_sync`)
- FOUND: `../nocturna-bot/cogs/gallery.py` (contains `galeria` group, `creditar`, `_do_creditar`, `_editor_choices`)
- FOUND: `../nocturna-bot/tests/test_gallery_credit.py`
- FOUND: commit `54cb152` (test, RED)
- FOUND: commit `921261a` (feat, GREEN)
- VERIFIED: full bot suite 435 passed; `store.json` re-tag verification passes (0 products, 0 bad editor values)

---
*Phase: 10-editor-profile-pages-carrd-style-template-editor-for-nocturn*
*Completed: 2026-07-14*
