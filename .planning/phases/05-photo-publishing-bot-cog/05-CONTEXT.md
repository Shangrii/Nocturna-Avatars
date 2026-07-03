# Phase 5: Photo-Publishing Bot Cog - Context

**Gathered:** 2026-07-03
**Status:** Ready for planning

<domain>
## Phase Boundary

A Discord cog (Python, discord.py 2.7) living **100% inside the separate `nocturna-bot` repo** that lets staff publish gallery photos straight from Discord: the cog watches photos channel `1416329356426481717`, adds a ✅ approve prompt to staff photo posts, and on staff approval optimizes attachments via Pillow and commits them **cross-repo** to the website repo (`public/gallery/<file>` + `src/data/gallery.json`, one commit) via a GitHub PAT/deploy key — triggering a GitHub Pages rebuild so photos go live. A 🌙 reaction (user-chosen replacement for BOT-05's 🗑️) unpublishes; the message text becomes the optional caption.

**In scope:** the new photo cog (BOT-01..BOT-06), its config (.env entries), Pillow optimization pipeline, cross-repo commit/removal logic, startup backfill, and staff-facing Discord UX (prompts, markers, confirmations, errors).

**Out of scope (own phases / locked elsewhere):** any website-repo code changes (Phase 4 already shipped the gallery renderer and locked the schema), reworking existing cogs (encoding.py/forum.py), cart→ticket bot integration (deferred idea from Phase 3.1), gallery tag/category filtering (GAL2-01, v2).

**Cross-repo constraint (locked):** no bot code in the website repo, no site code in the bot repo. The bot pushes via PAT/deploy key stored in its `.env`.

</domain>

<decisions>
## Implementation Decisions

### Approval flow & permissions
- **D-01:** ✅ approvals are accepted **only from configured staff role(s)** — a role ID list in the cog's config/`.env`. The channel is public, so the role gate is the trust boundary.
- **D-02:** **Self-approval is OK** — the poster's own ✅ publishes. The gate exists to keep the public out, not to slow staff down.
- **D-03:** The **✅ prompt is only added to image posts from staff-role members**. Community image posts are ignored entirely — the gallery stays 100% Nocturna work (BOT-01).
- **D-04:** Success confirmation is a **reply that auto-deletes after ~1 minute** ("Published N photos…"). Note in the reply that the Pages rebuild takes a minute or two.
- **D-05:** After publishing, the bot adds a **persistent status marker reaction** (e.g. 🟢) to the message so staff can tell published from pending at a glance. Further ✅s on a published message are **silently ignored** (idempotent — no double-publish).

### Removal (🌙) behavior
- **D-06:** **🌙 Moon replaces 🗑️ as the remove/unpublish control** (user decision — in a public channel a trash-can on someone's art reads as a judgment of the photo; 🌙 is on-brand: "send it back to the night"). This supersedes the 🗑️ literal in BOT-05 / ROADMAP success criterion 5 — the *behavior* is unchanged, only the emoji.
- **D-07:** 🌙 does **unpublish + dismiss**: on a published message it removes that message's photos + `gallery.json` entries from the site; on a pending (never-published) message it dismisses it (bot clears its ✅ prompt and won't publish it).
- **D-08:** 🌙 uses the **same staff-role gate as ✅** — one trust level, one role list.
- **D-09:** Unpublish feedback **mirrors publish**: auto-delete reply ("Removed N photos…") + the 🟢 marker comes off, returning the message to pending state — a later re-✅ republishes it.
- **D-10:** **Deleting a published Discord message auto-unpublishes its photos** — the bot listens for message deletions; the channel is the source of truth for what's live. (Accepted risk: an accidental delete/purge removes gallery photos.)

### Image processing (Pillow)
- **D-11:** **Convert all published images to WebP** — one consistent format, best size/quality for page load. (Site is format-agnostic per Phase 4 D-08.)
- **D-12:** **Max 1920px long edge**, WebP quality ~80–85. Downscale only — never upscale smaller images.
- **D-13:** Non-image attachments (videos, GIFs, files) in an approved message are **skipped silently** — static images publish, nothing else is mentioned in the confirmation.
- **D-14:** Filename convention: **date + message ID + index** — e.g. `20260703-1416329356426481717-1.webp`. The message→files mapping is baked into the filename, so 🌙 removal and auto-unpublish can find every file for a message **statelessly** (no mapping database). Satisfies BOT-03 uniqueness (message IDs are unique snowflakes) and Phase 4 D-02 (identity = `file`).

### Publish target & git strategy
- **D-15:** Target branch is **configurable via the bot's `.env`** (e.g. `WEBSITE_BRANCH=revamp`), alongside the PAT and repo name. Deploys currently trigger on `revamp` (`.github/workflows/deploy.yml`); flip the env var at production cutover with zero code changes.
- **D-16:** **One commit per approved message** (its images + its `gallery.json` entries together, per Phase 4 D-06). No debounce-batching — clean 1:1 audit mapping; GitHub's deploy concurrency group already coalesces rapid builds.
- **D-17:** Commit messages are **descriptive + traceable**: e.g. `gallery: publish 3 photos (discord msg <id>)` / `gallery: remove 2 photos (discord msg <id>)`. No Discord usernames in the public repo history.

### Failure handling & resilience
- **D-18:** Transient failures (network, concurrent-push conflict) are **auto-retried a few times with backoff** before being reported.
- **D-19:** When all retries fail, the bot posts a **persistent error reply (NOT auto-deleting) + ⚠️ reaction** on the message — impossible to miss, doubles as a retry to-do. Staff retry manually by removing + re-adding ✅.
- **D-20:** **Backfill on startup**: the cog persists a **last-processed-message-ID marker** and on startup scans channel history after it — adding missed ✅ prompts and processing approvals/removals that happened while the bot was down. Nothing is ever missed regardless of downtime length.

### Claude's Discretion
- Git transport mechanics (GitHub REST contents API vs local clone+push), concurrency/queueing internals, and where the last-processed marker + published-state live on disk — as long as removal stays derivable from filenames (D-14).
- Exact retry counts/backoff timing (D-18) and the auto-delete delay (~60s) for confirmations.
- Exact status/marker emoji (🟢 or similar) and error message wording (bot-side UX text; Spanish-first is natural for this staff).
- Exact WebP quality value within ~80–85 and Pillow resampling filter.
- How the cog file/class is structured to follow the existing `nocturna-bot` cogs conventions (encoding.py, forum.py) — research the repo first.
- EXIF/metadata stripping policy (recommend strip; screenshots rarely carry EXIF).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The contract this phase writes against (Phase 4)
- `.planning/phases/04-gallery-data-layer/04-CONTEXT.md` — **the locked `gallery.json` schema contract** (D-01..D-08): entry shape `{ file, caption?, width, height, date }`, identity = `file`, single-language caption used as alt, bot writes real `width`/`height`, required ISO `date` (drives newest-first + featured-6), JSON at `src/data/gallery.json`, images at `public/gallery/<file>`, both in ONE commit
- `src/data/gallery.json` — live schema example (29 sample entries; **user resets it to `[]` and deletes sample images at production cutover** — the bot must tolerate both populated and empty starting states)
- `public/gallery/` — the image directory the bot commits into (served as-is by GitHub Pages)

### Requirements & phase definition
- `.planning/ROADMAP.md` — Phase 5 section (goal + 6 success criteria; note criterion 5's 🗑️ is superseded by 🌙 per D-06)
- `.planning/REQUIREMENTS.md` — BOT-01..BOT-06 (BOT-05's 🗑️ likewise superseded by 🌙, behavior unchanged)

### Deploy pipeline the bot's commits feed
- `.github/workflows/deploy.yml` — Pages deploy triggers on push to **`revamp`** (production cutover pending; hence D-15's configurable branch), concurrency group `pages` coalesces rapid builds

### Target repo (external — the cog lives HERE, not in this repo)
- `https://github.com/Shangrii/nocturna-bot` — Python discord.py 2.7, self-hosted 24/7, existing cogs structure (`encoding.py`, `forum.py`) to follow; PAT/deploy key + channel ID + role IDs + branch go in its `.env`

</canonical_refs>

<code_context>
## Existing Code Insights

*(Note: the deliverable lives in the external `nocturna-bot` repo — no local clone exists next to this repo. The website-repo insights below define what the bot writes; the bot repo's cog conventions must be researched from GitHub during planning.)*

### The write-target (website repo)
- `src/data/gallery.json` — top-level array; site sorts newest-first by `date` and features newest 6 on the landing; empty `[]` renders a branded EmptyState (never broken)
- `public/gallery/` — flat directory, filenames referenced verbatim by `gallery.json` `file`
- The site does **zero** image processing — the bot's Pillow output is served as-is (final web-ready files)

### Established patterns to respect
- Phase 4 D-02: removal = filter `gallery.json` entries by `file` match + delete `public/gallery/<file>` in the same commit
- Phase 4 discretion note: filename convention was explicitly delegated to this phase (now D-14)
- `nocturna-bot` conventions: one cog per file (`encoding.py`, `forum.py`), self-hosted 24/7 — the photo cog follows the same structure

### Integration points
- Cross-repo: bot → GitHub (PAT/deploy key) → website repo branch from `.env` → `deploy.yml` → GitHub Pages → live gallery
- Discord: channel `1416329356426481717` (public) — reaction add/remove events + message delete events + startup history scan

</code_context>

<specifics>
## Specific Ideas

- **🌙 as the removal control** came directly from the user: a 🗑️ on an art post in a public channel could be read as "this photo is ugly"; the moon is judgment-free and on-brand for *Nocturna* — "send it back to the night."
- The confirmation UX philosophy the user chose is "clean channel": self-deleting success replies + a small persistent marker reaction, but **failures stay visible** (persistent reply + ⚠️).
- Filenames deliberately encode the Discord message ID so removal never depends on a state database.

</specifics>

<deferred>
## Deferred Ideas

- **Cart → bot ticket integration** (from Phase 3.1's deferred list): after this phase ships, a future phase could let the website's quote cart send its payload to the bot to open a structured ticket. Still deferred — not part of this cog.
- **"Published skipped-attachment" notices**: the option to enumerate skipped non-image attachments in the confirmation was considered and rejected (skip silently, D-13). Revisit only if staff get confused by unpublished videos.
- **Approver name in commit messages**: considered and rejected to keep Discord usernames out of the public repo history (D-17).

</deferred>

---

*Phase: 05-photo-publishing-bot-cog*
*Context gathered: 2026-07-03*
