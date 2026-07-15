---
phase: 10-editor-profile-pages-carrd-style-template-editor-for-nocturn
plan: 09
subsystem: bot-cog
tags: [discord-cog, on-member-update, tasks-loop, role-loss, removal-safety, nocturna-bot, tdd]

# Dependency graph
requires:
  - phase: 10-05
    provides: core/github_publish.unpublish_editor() — the atomic no-op-guarded unpublish transport this cog calls
  - phase: 10-03
    provides: confirmed `members` privileged gateway intent (Developer Portal toggle ENABLED) → on_member_update is the D-10 PRIMARY mechanism
provides:
  - cogs/editors.py EditorsCog in nocturna-bot — role-loss auto-unpublish via on_member_update (real-time PRIMARY) + hourly @tasks.loop sweep (backstop) with a hard mass-removal guard; optional /mi-pagina admin-link DM
  - bot.py wires cogs.editors + enables intents.members (required for on_member_update to fire)
affects: [10-10 (self-unpublish UI completes EDIT-07's other half), 10-11 (deploy + live role-loss E2E verification)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "enumerate-before-remove mass-removal guard (mirror JinxxyCog._run_sync T-09-15): a transient membership-check error aborts the whole sweep with ZERO unpublishes (T-10-09-02)"
    - "tick delegates to a plain _process_role_losses() so the sweep is unit-testable (tasks.Loop.start neutralized in the fixture)"
    - "discord.NotFound (member left the guild) caught BEFORE the general HTTPException → confirmed loss, not a transient abort"
    - "single shared _unpublish_one funnels both the event path and the sweep path through the same idempotent transport call (D-05 log-only)"

key-files:
  created:
    - ../nocturna-bot/cogs/editors.py
    - ../nocturna-bot/tests/test_editors_cog.py
  modified:
    - ../nocturna-bot/bot.py

key-decisions:
  - "on_member_update is the D-10 PRIMARY real-time mechanism; the hourly sweep is the backstop that heals a role change missed during downtime (per 10-03's members-intent-enabled outcome)"
  - "Enabled intents.members = True in bot.py — REQUIRED for on_member_update to fire; safe now that 10-03 confirmed the Developer Portal toggle is enabled (bot no longer crashes with PrivilegedIntentsRequired). Bonus: gallery fetch_member() REST calls become cache lookups."
  - "Sweep candidate set is `published is True` only — a draft/already-unpublished entry (published False) is never re-considered, so the transport's no-op guard is never even hit (idempotency at the candidate level, D-13/D-16)"
  - "A member who left the guild entirely (discord.NotFound) is a CONFIRMED role loss → unpublished; any OTHER HTTPException is transient → aborts the whole sweep with zero unpublishes"
  - "/mi-pagina is staff-gated on the editor role (ROLE_MODERATOR_ID, D-15) and DMs EDITOR_APP_BASE_URL; DMs-closed (Forbidden) falls back to an ephemeral reply, never leaking the link to a channel"
  - "No OAuth/session fail-fast added to bot.py — those belong to the admin-app process, not the bot (per the plan)"

requirements-completed: []

# Metrics
duration: ~20min
completed: 2026-07-15
---

# Phase 10 Plan 09: Role-Loss Cog — EditorsCog Summary

**One-liner:** A new `EditorsCog` in `nocturna-bot` auto-unpublishes an editor's page when they lose the editor role — in real time via `on_member_update` (the D-10 PRIMARY path, now that `bot.py` enables the confirmed `members` intent) and via an hourly `@tasks.loop` sweep as the backstop, with a hard enumerate-before-remove mass-removal guard so a transient API outage can never mass-unpublish the directory — plus the optional `/mi-pagina` command that DMs an editor their admin-app link. Reuses 10-05's `unpublish_editor` transport verbatim; 30 net bot tests → full suite 466/466.

## Performance

- **Duration:** ~20 min
- **Tasks:** 2 (Task 1 `auto`+`tdd`, Task 2 `auto`)
- **Files:** 2 created + 1 modified in `../nocturna-bot`
- **Tests:** +15 editors-cog tests; full bot suite **466 passed** (was 451 at 10-08)

## Accomplishments

### Task 1 — EditorsCog role-loss auto-unpublish (event + sweep), TDD
- **`on_member_update(before, after)`** (PRIMARY, D-10): fires only on the exact edge — editor role in `before.roles`, absent in `after.roles` — and calls `unpublish_editor(str(after.id))` once. Any other member update (nickname, unrelated role add/remove, role still held) is ignored.
- **Hourly `@tasks.loop` sweep** (backstop): the tick delegates to a plain `_process_role_losses()` (unit-testable; `tasks.Loop.start` neutralized in the fixture). It reads the published `editors.json` entries via `github_publish._fetch_json` (off the event loop through `asyncio.to_thread`), then reconciles each against live guild membership.
- **Mass-removal guard (T-10-09-02):** the sweep ENUMERATES every published editor's membership FIRST and unpublishes NOTHING if any membership check raises a transient `discord.HTTPException` — mirroring the Phase-9 `JinxxyCog` enumerate-before-remove abort (T-09-15). A member who has genuinely LEFT the guild (`discord.NotFound`, caught before the general `HTTPException`) is a CONFIRMED loss and IS unpublished. An unresolvable guild is treated like a transient error (zero unpublishes).
- **Idempotency:** candidates are `published is True` only, so an already-unpublished page or draft is never re-considered; combined with `unpublish_editor`'s no-op guard (10-05), a redundant pass does nothing.
- **D-05:** every failure path is `log` only; a `GitHubPublishError` from the transport is swallowed to logs and never escapes the event/sweep. Nothing is ever posted to a channel.

### Task 2 — /mi-pagina DM command + bot.py wiring
- **`/mi-pagina`** (implemented in the cog): staff-gated on the editor role FIRST (T-10-09-04), then DMs the invoker their `EDITOR_APP_BASE_URL` admin-app link (Spanish-first, staff-facing) and confirms ephemerally. DMs-closed (`discord.Forbidden`) falls back to an ephemeral "abre tus DMs" reply — the link never reaches a channel.
- **`bot.py`:** `load_extension("cogs.editors")` added to `setup_hook` (mirrors `cogs.jinxxy`/`cogs.reminders`). No OAuth/session fail-fast added (admin-app process concern).
- **`intents.members = True` enabled** in `bot.py` — see the deviation below.

## members-intent posture (recorded per Task 2)

The `members` privileged gateway intent is **enabled** — the Developer Portal toggle was confirmed ON in 10-03 (`deploy/EDITOR_DEPLOY.md` §5), and this plan flips `intents.members = True` in `bot.py` to actually receive the events. Therefore **`on_member_update` is the PRIMARY real-time D-10 mechanism** and the hourly sweep is the **backstop** (heals a role change the gateway missed during downtime), exactly as 10-03 recorded.

## Task Commits

Each task committed atomically in `../nocturna-bot` (branch `main`, normal hook-run commits — sequential execution, not this website repo):

1. **Task 1 (TDD):** `7101db7` (test, RED — module absent, import error) → `58108a8` (feat, GREEN — 15 tests pass)
2. **Task 2:** `9955145` (feat — bot.py loads cogs.editors + enables intents.members; /mi-pagina shipped in the Task-1 cog file and covered by its tests)

**Plan metadata:** this SUMMARY.md + STATE.md/ROADMAP.md updates committed in the website repo (this repo), separate from the nocturna-bot commits above.

## Deviations from Plan

### Auto-fixed / required additions

**1. [Rule 2 - Missing critical functionality] Enabled `intents.members = True` in bot.py**
- **Found during:** Task 2 (bot.py wiring).
- **Issue:** `on_member_update` only fires when the `members` privileged intent is enabled in CODE, not just in the Developer Portal. `bot.py` previously kept `intents.members` OFF (a deliberate CR-03 guard against `PrivilegedIntentsRequired` crashes while the portal toggle was off). Without enabling it, the plan's PRIMARY D-10 mechanism (`on_member_update`) would never fire and only the backstop sweep would work — contradicting the plan's objective and success criteria.
- **Fix:** Set `intents.members = True` and rewrote the CR-03 comment to record that the portal toggle is confirmed enabled (10-03) so this is now safe, and that it is a hard requirement of `EditorsCog`.
- **Files modified:** `../nocturna-bot/bot.py`
- **Commit:** `9955145`
- **Safety:** 10-03 (2026-07-14) records the user confirming the "Server Members Intent" toggle is enabled; enabling it in code no longer crashes at startup.

**Total deviations:** 1 required addition (Rule 2). No scope creep; no change to the plan's locked design.

## Issues Encountered
The pre-existing unrelated `.env.example` modification in `../nocturna-bot` was left completely untouched (never staged), per the execution instructions — it remains unstaged in that repo's working tree exactly as found.

## Requirements

`requirements-completed` is empty: **EDIT-07** spans 10-05 / 10-09 / 10-10. This plan delivers the **role-loss** half (auto-unpublish on role loss). The **self-unpublish** half (D-16, editor-initiated) is the 10-10 block-editor UI. Marking EDIT-07 complete here would be premature — it stays unchecked until 10-10 finishes the chain.

## Next Phase Readiness
- The cog is deployable. Live activation requires the cinema host to `git pull` + restart the `nocturna-bot` systemd unit (the process must reconnect with the new `members` intent). Full role-loss E2E verification is scheduled for 10-11.
- No blockers introduced. The transport stays the single 10-05 write path; no new commit path was invented.

## Self-Check: PASSED

- FOUND: `../nocturna-bot/cogs/editors.py` (EditorsCog: on_member_update, _process_role_losses, _sweep, mi_pagina)
- FOUND: `../nocturna-bot/tests/test_editors_cog.py` (15 tests)
- FOUND: `../nocturna-bot/bot.py` loads `cogs.editors` + `intents.members = True`
- FOUND commit: `7101db7` (nocturna-bot — Task 1 test, RED)
- FOUND commit: `58108a8` (nocturna-bot — Task 1 feat, GREEN)
- FOUND commit: `9955145` (nocturna-bot — Task 2 feat, bot.py wiring + members intent)

---
*Phase: 10-editor-profile-pages-carrd-style-template-editor-for-nocturn*
*Completed: 2026-07-15*
