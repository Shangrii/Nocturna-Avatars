# Phase 5: Photo-Publishing Bot Cog - Research

**Researched:** 2026-07-03
**Domain:** Discord bot automation (discord.py 2.7 cog) + image optimization (Pillow) + cross-repo GitHub commit (Git Data API)
**Confidence:** HIGH (write-target contract + bot conventions verified from source; git-transport + Pillow verified against official docs)

## Summary

This phase adds one new cog (`cogs/gallery.py`) to the **external `nocturna-bot` repo** (public, `Shangrii/nocturna-bot`, discord.py `2.7.1`, self-hosted 24/7). The cog watches the public photos channel, gates on a staff role, optimizes attachments to WebP via Pillow, and commits image files + a `gallery.json` entry **cross-repo** into this website repo via a GitHub Personal Access Token — which triggers `deploy.yml` and rebuilds GitHub Pages. A 🌙 reaction (replacing 🗑️) and a message-deletion listener unpublish.

The write-target contract is **fully locked and verified** from Phase 4: a flat top-level array at `src/data/gallery.json` with entries `{ file, caption?, width, height, date }`, images at `public/gallery/<file>`, both committed together, site sorts newest-first by `date` at build time (so the bot can append in any order). Two things dominate the technical risk and were resolved: (1) the **atomic multi-file commit** — GitHub's Contents API only commits one file per request, so the bot must use the **Git Data API** (blobs → tree → commit → update-ref) to put image(s) + `gallery.json` in one commit and to delete files (`sha: null`); (2) **workflow triggering** — a commit pushed with a **PAT** (not the Actions `GITHUB_TOKEN`) *does* trigger `on: push` workflows, so the deploy fires correctly.

The bot's existing conventions are well-established and must be mirrored: cog class + `async def setup(bot)`, `config.py` reading `.env` via `python-dotenv`, SQLite persistence via `core/db.py`, Spanish-first UX strings, `@commands.Cog.listener()` for events. Published-state and backfill are designed to be **near-stateless**: the filename encodes the Discord message ID (D-14), so removal is derivable without a mapping database; the only local state needed is a last-processed-message-ID cursor for startup backfill.

**Primary recommendation:** Build `cogs/gallery.py` using `on_message` (add ✅ to staff image posts), `on_raw_reaction_add` (role-gated publish/unpublish — `payload.member.roles` needs no privileged intent), and `on_raw_message_delete` (auto-unpublish). Optimize with `Pillow` (`thumbnail(1920)` + WebP q82, EXIF stripped). Commit cross-repo with the **GitHub Git Data API called via the already-present `requests` dependency** (no new git library required), wrapped in an `asyncio.Lock` + retry-with-backoff. Add `Pillow` to `requirements.txt`; new `.env` vars to `config.py` and `.env.example`; load the cog in `bot.py`'s `setup_hook`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Detect staff photo posts, add ✅ | Bot cog (`on_message`) | — | Discord gateway event; attachment + author-role inspection |
| Staff auth / role gate (D-01/D-08) | Bot cog (`payload.member.roles`) | — | Trust boundary; member delivered in guild reaction payload |
| Image optimization → WebP (BOT-03) | Bot cog (Pillow) | — | Bot is the only place images are processed; site serves as-is |
| Filename generation (D-14) | Bot cog | — | `date-msgID-index` makes removal stateless |
| Cross-repo commit / removal (BOT-04, BOT-05) | Bot cog → GitHub Git Data API | `requests` transport | Atomic multi-file commit + PAT push |
| `gallery.json` schema / data contract | Website repo (Phase 4, read-only) | — | Locked in Phase 4; bot writes against it, never changes it |
| Serving images + Pages rebuild | GitHub Actions (`deploy.yml`) / Pages | — | PAT push to `revamp` triggers `on: push` |
| Published-state / idempotency (D-05) | Discord (🟢 marker reaction) | website `gallery.json` (derivable) | State lives on the message; survives restarts, visible to staff |
| Backfill cursor (D-20) | Bot local SQLite (`core/db.py` pattern) | — | Only genuinely local state the cog needs |

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Approval flow & permissions**
- **D-01:** ✅ approvals accepted **only from configured staff role(s)** — a role ID list in the cog's config/`.env`. The public channel makes the role gate the trust boundary.
- **D-02:** **Self-approval is OK** — the poster's own ✅ publishes.
- **D-03:** The **✅ prompt is only added to image posts from staff-role members**. Community image posts are ignored entirely (BOT-01).
- **D-04:** Success confirmation is a **reply that auto-deletes after ~1 minute** ("Published N photos…"), noting the Pages rebuild takes a minute or two.
- **D-05:** After publishing, add a **persistent status marker reaction** (e.g. 🟢) so staff can tell published from pending. Further ✅s on a published message are **silently ignored** (idempotent — no double-publish).

**Removal (🌙) behavior**
- **D-06:** **🌙 Moon replaces 🗑️** as the remove/unpublish control (supersedes 🗑️ in BOT-05 / ROADMAP criterion 5 — *behavior unchanged, only the emoji*).
- **D-07:** 🌙 does **unpublish + dismiss**: on a published message removes its photos + `gallery.json` entries; on a pending message dismisses it (clears the ✅ prompt, won't publish).
- **D-08:** 🌙 uses the **same staff-role gate as ✅**.
- **D-09:** Unpublish feedback **mirrors publish**: auto-delete reply ("Removed N photos…") + the 🟢 marker comes off, returning the message to pending (a later re-✅ republishes).
- **D-10:** **Deleting a published Discord message auto-unpublishes its photos** — the bot listens for message deletions; the channel is the source of truth. (Accepted risk: accidental delete/purge removes gallery photos.)

**Image processing (Pillow)**
- **D-11:** **Convert all published images to WebP** — one consistent format. (Site is format-agnostic per Phase 4 D-08.)
- **D-12:** **Max 1920px long edge**, WebP quality ~80–85. Downscale only — never upscale.
- **D-13:** Non-image attachments (videos, GIFs, files) in an approved message are **skipped silently**.
- **D-14:** Filename convention: **date + message ID + index** — e.g. `20260703-1416329356426481717-1.webp`. Message→files mapping baked into the filename → stateless removal. Satisfies BOT-03 uniqueness + Phase 4 D-02 (identity = `file`).

**Publish target & git strategy**
- **D-15:** Target branch is **configurable via `.env`** (e.g. `WEBSITE_BRANCH=revamp`), alongside PAT and repo name. Flip the env var at production cutover — zero code changes.
- **D-16:** **One commit per approved message** (its images + its `gallery.json` entries together, per Phase 4 D-06). No debounce-batching; GitHub's `pages` concurrency group coalesces rapid builds.
- **D-17:** Commit messages **descriptive + traceable**: e.g. `gallery: publish 3 photos (discord msg <id>)` / `gallery: remove 2 photos (discord msg <id>)`. **No Discord usernames** in public repo history.

**Failure handling & resilience**
- **D-18:** Transient failures **auto-retried a few times with backoff** before being reported.
- **D-19:** When all retries fail, post a **persistent error reply (NOT auto-deleting) + ⚠️ reaction** — impossible to miss, doubles as a retry to-do. Staff retry by removing + re-adding ✅.
- **D-20:** **Backfill on startup**: persist a **last-processed-message-ID marker**; on startup scan channel history after it — add missed ✅ prompts and process approvals/removals that happened while down.

### Claude's Discretion
- Git transport mechanics (REST contents API vs local clone+push), concurrency/queueing internals, where the last-processed marker + published-state live on disk — as long as removal stays derivable from filenames (D-14).
- Exact retry counts/backoff timing (D-18) and auto-delete delay (~60s).
- Exact status/marker emoji (🟢 or similar) and error message wording (Spanish-first natural for this staff).
- Exact WebP quality within ~80–85 and Pillow resampling filter.
- How the cog file/class is structured to follow existing `nocturna-bot` conventions (encoding.py, forum.py) — research the repo first.
- EXIF/metadata stripping policy (recommend strip; screenshots rarely carry EXIF).

### Deferred Ideas (OUT OF SCOPE)
- **Cart → bot ticket integration** (Phase 3.1 deferred) — not part of this cog.
- **"Published skipped-attachment" notices** — considered and rejected (skip silently, D-13).
- **Approver name in commit messages** — rejected to keep Discord usernames out of public repo history (D-17).
- Any website-repo code changes (Phase 4 shipped the renderer + locked the schema).
- Reworking existing cogs (encoding.py/forum.py); gallery tag/category filtering (GAL2-01, v2).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BOT-01 | Detect staff photo posts in the configured channel, mark with a ✅ approve control | `on_message` listener filters `message.attachments` by image content-type + author role (D-03). Pattern already in repo: `forum.py::_extract_image_from_message` checks `att.content_type.startswith("image/")`. Backfill via `channel.history(after=...)` (D-20). |
| BOT-02 | On staff ✅, publish all attachments (1 or many) | `on_raw_reaction_add` (RAW → works even after restart when message not cached). Role gate via `payload.member.roles`. Loop over all image attachments; one commit for the message (D-16). |
| BOT-03 | Optimize images (resize/compress) before publishing | Pillow `Image.thumbnail((1920,1920), LANCZOS)` (downscale-only) + `save(format="WEBP", quality=82, method=6)`. Unique filenames via `date-msgID-index` (D-14). |
| BOT-04 | Commit images + `gallery.json` entry cross-repo | GitHub Git Data API (blobs→tree→commit→update-ref) via `requests` + PAT. Atomic multi-file commit; PAT push triggers `deploy.yml`. |
| BOT-05 | 🌙 removes published photos (emoji superseded per D-06) | Read `gallery.json`, filter entries whose `file` matches `*-{msgID}-*`, delete those blobs (`sha: null`) + rewrite `gallery.json` in one commit. Stateless (filename-derived). |
| BOT-06 | Message text captured as optional caption | `message.content` (requires `message_content` intent — **already enabled** in `bot.py`). Written verbatim to entry `caption` (omit key when empty, per contract). |
</phase_requirements>

## The Write-Target Contract (VERIFIED from Phase 4 + shipped files)

The bot writes against this **exact, already-shipped** contract. Do not re-derive it.

**`src/data/gallery.json`** — a flat top-level JSON array. Each entry: `[VERIFIED: src/data/gallery.json + 04-01-SUMMARY.md]`
```json
{
  "file": "20260703-1416329356426481717-1.webp",
  "caption": "Luna — full outfit + toggles",
  "width": 1600,
  "height": 2000,
  "date": "2026-07-02T18:30:00.000Z"
}
```
- **`file`** — unique filename, referenced verbatim; images live at `public/gallery/<file>`. Identity of an entry = `file` (Phase 4 D-02). `[VERIFIED]`
- **`caption`** — **single optional string**, single-language, shown as-is (used as `<img alt>`; generic localized fallback when absent). **Omit the key entirely when there's no caption** (the shipped data has entries with no `caption` key, not `"caption": ""`). `[VERIFIED: gallery.json entries Kuymi2/Kuymi1 have no caption key]`
- **`width` / `height`** — integers, the **stored pixel dimensions** the site uses for CLS-free aspect boxes (Phase 4 D-04). Write the **post-resize** dimensions (Pillow gives them free after `thumbnail()`). `[VERIFIED]`
- **`date`** — **required ISO 8601 string.** Site sorts newest-first by `date` (both wall and featured-6). Use the Discord message's `created_at` (UTC ISO). Shipped data uses millisecond precision (`.000Z`) — match `datetime.isoformat()` output. `[VERIFIED: GalleryPage.astro + FeaturedGallery.astro sort by new Date(b.date)-new Date(a.date)]`

**Consumption (why append-order doesn't matter):** both `GalleryPage.astro` and `FeaturedGallery.astro` do `[...galleryData].sort((a,b)=>new Date(b.date)-new Date(a.date))` at build. The bot may append anywhere in the array — newest-by-`date` floats up automatically (this is what makes "staff keep the gallery current without touching code" work). `[VERIFIED]`

**Image directory:** `public/gallery/` — flat, served as-is by GitHub Pages, contains a `.gitkeep`. The site does **zero** image processing; Pillow output is the final web-ready file. `[VERIFIED: 04-01-SUMMARY.md]`

**Empty-state tolerance:** the site renders a branded `EmptyState` when the array is `[]`. The user resets `gallery.json` to `[]` and deletes sample images at production cutover, so **the bot must tolerate both a populated and an empty starting array**. `[VERIFIED: 04-CONTEXT.md D-12 + STATE.md]`

**Deploy trigger:** `.github/workflows/deploy.yml` runs `on: push: branches: [revamp]` (+ `workflow_dispatch`), builds with `withastro/action@v6`, deploys with `actions/deploy-pages@v5`, concurrency `group: pages, cancel-in-progress: false` (rapid pushes coalesce, in-progress finishes). `[VERIFIED: deploy.yml]`

> ⚠️ **D-14 filename example clarification for the planner:** the example `20260703-1416329356426481717-1.webp` reuses the *channel* ID `1416329356426481717` as an illustrative stand-in. The real convention is `{YYYYMMDD}-{message.id}-{index}.webp` using the **per-message snowflake** (unique), which is what makes stateless removal work. Don't hard-code the channel number into filenames.

## Target-Repo Conventions (VERIFIED from `Shangrii/nocturna-bot` @ main)

The cog is a *new file in the bot repo* but MUST mirror these established patterns. `[VERIFIED: gh api repos/Shangrii/nocturna-bot]`

**Cog shape** (from `cogs/forum.py`):
```python
import discord
from discord.ext import commands
import config
log = logging.getLogger(__name__)

class GalleryCog(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        init_gallery_state()   # SQLite table, like forum.py calls init_db()

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message): ...

    @commands.Cog.listener()
    async def on_raw_reaction_add(self, payload: discord.RawReactionActionEvent): ...

async def setup(bot: commands.Bot):      # REQUIRED — how extensions load
    await bot.add_cog(GalleryCog(bot))
```

**Loader** (`bot.py::setup_hook`): the new cog must be registered — add `await self.load_extension("cogs.gallery")`. `bot.py` also validates required config at startup (`sys.exit(1)` if missing) — mirror that for the new env vars. `[VERIFIED: bot.py]`

**Intents** (`bot.py`): `intents = discord.Intents.default()` + `intents.message_content = True`. This is **sufficient** — `Intents.default()` includes guild `reactions` + `messages`; `message_content` (already on) is needed for the caption (BOT-06) and is the only privileged intent used. **No new intent needed.** `payload.member` is delivered for guild reactions **without** the privileged Members intent. `[VERIFIED: bot.py + discordpy docs + Rapptz/discord.py PR #2443]`

**Config pattern** (`config.py`): module-level constants from `os.getenv(...)` after `load_dotenv()`. Existing relevant constants already present: `GUILD_ID` (`1411899319468167190`), `ROLE_MODERATOR_ID` (`1418724526308593834`). Add new ones here + document in `.env.example`. `[VERIFIED: config.py + .env.example]`

**Persistence pattern** (`core/db.py`): `sqlite3` at `config.DB_PATH` (`bot.db`), `conn.row_factory = sqlite3.Row`, `init_db()` with `CREATE TABLE IF NOT EXISTS`, `INSERT OR REPLACE`. Follow this for the backfill cursor (a 1-row `gallery_state` table). `[VERIFIED: core/db.py]`

**UX conventions:** Spanish-first strings, `discord.Embed(color=0x7B2FBE)`, `log = logging.getLogger(__name__)`. Existing helper `_extract_image_from_message` shows the attachment-filtering idiom (`att.content_type.startswith("image/")`). `[VERIFIED: forum.py]`

**Existing deps** (`requirements.txt`, already installed on the bot host): `discord.py[voice]==2.7.1`, `aiohttp>=3.9.0`, `python-dotenv>=1.0.0`, `requests>=2.31.0`, `watchdog>=4.0.0`. **`requests` is already present — reuse it for the GitHub API; no new HTTP/git dep required.** `[VERIFIED: requirements.txt]`

## Standard Stack

### Core (new dependency for this phase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `Pillow` | 12.3.0 | Resize + WebP re-encode + read dimensions + strip EXIF | The de-facto Python imaging library; bundles libwebp in its wheels (no system dep). `[VERIFIED: PyPI 12.3.0 + pillow.readthedocs.io]` |

### Supporting (already in the bot repo — reuse, do not re-add)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `requests` | ≥2.31.0 (present) | GitHub Git Data API HTTP calls (blobs/tree/commit/ref) | Cross-repo publish + removal transport `[VERIFIED: requirements.txt]` |
| `discord.py[voice]` | 2.7.1 (present) | Gateway events, reactions, attachments, history | The whole cog `[VERIFIED]` |
| `python-dotenv` | ≥1.0.0 (present) | `.env` → config | New PAT/channel/role/branch vars `[VERIFIED]` |
| `sqlite3` | stdlib | Backfill cursor persistence | Last-processed-message-ID marker (D-20) `[VERIFIED: core/db.py]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `requests` + Git Data API | **PyGithub 2.9.1** (`repo.create_git_blob/tree/commit`, `ref.edit`) | Cleaner create-path code, but **cannot delete files** cleanly — `InputGitTreeElement` historically rejects `sha=null` (issue #1318); removal (D-07/D-10) would still need raw REST. Adds a dependency for half the flow. `[CITED: github.com/PyGithub/PyGithub/issues/1318]` |
| `requests` + Git Data API | **GitPython 3.1.50** (local clone + push) | Requires cloning the *entire* website repo (grows with every photo) onto the bot host, keeping it in sync, and handling merge/push conflicts against a live-deploy branch. Heavier and more failure modes than a stateless API call. `[ASSUMED — from GitPython model]` |
| Contents API (`PUT /contents/{path}`) | — | **Rejected: one file per request → cannot commit image + `gallery.json` atomically** (violates D-16 one-commit invariant). `[CITED: docs.github.com/rest/repos/contents]` |

**Installation (bot repo):** add to `requirements.txt`:
```
Pillow>=12.0.0
```
(`requests` already declared; no PyGithub/GitPython needed with the recommended transport.)

## Package Legitimacy Audit

Ecosystem: **PyPI** (Python bot repo). slopcheck 0.6.1 run with `-e pypi`.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `Pillow` | PyPI 12.3.0 | ~15 yrs (fork of PIL) | very high (~100M+/mo) | github.com/python-pillow/Pillow | [OK] | **Approved — the one new dep** |
| `PyGithub` | PyPI 2.9.1 | ~13 yrs | high (millions/mo) | github.com/PyGithub/PyGithub | [OK] | Not adopted (alternative only) |
| `GitPython` | PyPI 3.1.50 | ~15 yrs | high | github.com/gitpython-developers/GitPython | [OK] | Not adopted (alternative only) |

**Packages removed due to slopcheck [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none.

> Note: slopcheck's default ecosystem auto-detected as **npm** (this working dir is a Node/Astro project) and flagged all three as SLOP — a *false positive from wrong-ecosystem detection*. Re-running with `-e pypi` returned all three **[OK]**. This is itself a documented cross-ecosystem confusion vector — the planner/executor must run slopcheck with `-e pypi` in the bot repo. Age/download figures are approximate `[ASSUMED]`; versions are `[VERIFIED: pip index versions]`. Existing repo deps (discord.py, requests, aiohttp, python-dotenv) are already vetted/installed and out of scope for a fresh audit.

## Architecture Patterns

### System Architecture Diagram

```
                          PUBLIC PHOTOS CHANNEL  (id 1416329356426481717)
                                        │
         ┌──────────────────────────────┼───────────────────────────────┐
         │ staff posts image            │ staff reacts ✅ / 🌙           │ staff deletes msg
         ▼                              ▼                                ▼
   on_message                    on_raw_reaction_add              on_raw_message_delete
   (is author staff-role?        (RAW: works even if msg          (derive msgID → treat
    has image attachments?)       not cached after restart)        as unpublish, D-10)
         │ yes                          │
         ▼                              ▼  role gate: payload.member.roles ∩ STAFF_ROLE_IDS
   add ✅ prompt reaction        ┌──────┴───────────────┐
   (BOT-01, D-03)                │ ✅ + not-yet-🟢       │ 🌙
                                 ▼                       ▼
                          PUBLISH PIPELINE         UNPUBLISH PIPELINE
                                 │                       │
                    ┌────────────┘                       └───────────┐
                    ▼                                                 ▼
         for each image attachment:                      read gallery.json (GitHub API)
           attachment.read() → bytes                     filter entries file~=*-{msgID}-*
           Pillow: exif_transpose → convert              build removal set (entries+blobs)
           → thumbnail(1920,LANCZOS)                            │
           → save WEBP q82 (strips EXIF)                        │
           name: {date}-{msgID}-{idx}.webp                      │
                    │                                           │
                    ▼                                           ▼
       ┌─────────  GITHUB GIT DATA API (asyncio.Lock + retry/backoff, D-18)  ─────────┐
       │  GET  /git/ref/heads/{branch}         → latest commit sha                     │
       │  GET  /git/commits/{sha}              → base tree sha                          │
       │  GET  /contents/src/data/gallery.json → current array (append or filter)       │
       │  POST /git/blobs (base64)             → image blob sha(s) [publish only]        │
       │  POST /git/trees (base_tree=…)        → new tree                                │
       │        publish: add webp blob(s) + updated gallery.json                         │
       │        remove : gallery.json updated  + deleted files sha:null                  │
       │  POST /git/commits (parents=[sha])    → new commit (msg per D-17)                │
       │  PATCH/git/refs/heads/{branch}        → move branch (PAT → triggers on:push)     │
       └───────────────────────────────────────────────┬───────────────────────────────┘
                                                        ▼
                         .github/workflows/deploy.yml  (on: push [revamp])
                              withastro/action@v6 → actions/deploy-pages@v5
                              concurrency group: pages (coalesces rapid builds)
                                                        ▼
                                          GITHUB PAGES  → live gallery
                                                        │
   feedback on the Discord message: 🟢 marker on/off (published-state, D-05/D-09) │
   auto-delete reply ~60s on success (D-04/D-09) │ persistent reply + ⚠️ on failure (D-19)
```

### Recommended Bot-Repo File Layout
```
nocturna-bot/
├── bot.py                 # MODIFY: load_extension("cogs.gallery") + validate new config
├── config.py              # MODIFY: PHOTO_CHANNEL_ID, GALLERY_STAFF_ROLE_IDS, GITHUB_PAT,
│                          #         WEBSITE_REPO, WEBSITE_BRANCH, WEBSITE_GALLERY_JSON_PATH,
│                          #         WEBSITE_IMAGE_DIR
├── .env.example           # MODIFY: document the new vars
├── requirements.txt       # MODIFY: add Pillow>=12.0.0
├── cogs/
│   └── gallery.py         # NEW: the cog (listeners + image pipeline + orchestration)
└── core/
    ├── db.py              # MODIFY (or add gallery_state helpers): backfill cursor table
    └── github_publish.py  # NEW (recommended): pure GitHub Git Data API transport
                           #   (keeps I/O testable + separate from Discord logic)
```

### Pattern 1: RAW reaction listener with role gate (BOT-02/BOT-05/D-01/D-08)
**What:** Use RAW events so approvals/removals work even when the message isn't in the cache (post-restart, backfill). Gate on the member delivered in the payload.
**When:** All ✅ and 🌙 handling.
```python
# Source: discordpy.readthedocs.io on_raw_reaction_add + Rapptz/discord.py PR #2443
@commands.Cog.listener()
async def on_raw_reaction_add(self, payload: discord.RawReactionActionEvent):
    if payload.channel_id != config.PHOTO_CHANNEL_ID:
        return
    if payload.member is None or payload.member.bot:          # member present for guild reactions
        return
    if not (set(r.id for r in payload.member.roles) & set(config.GALLERY_STAFF_ROLE_IDS)):
        return                                                # D-01/D-08 trust boundary
    emoji = str(payload.emoji)
    channel = self.bot.get_channel(payload.channel_id)
    message = await channel.fetch_message(payload.message_id) # fetch: not guaranteed cached
    if emoji == "✅":
        await self._publish(message)      # idempotent: no-op if 🟢 already present (D-05)
    elif emoji == "🌙":
        await self._unpublish(message)    # unpublish or dismiss pending (D-07)
```
- `payload.member.roles` needs **no** privileged Members intent for guild reactions. `[VERIFIED: PR #2443 + WebSearch]`
- Idempotency (D-05): before publishing, check whether the message already carries the 🟢 marker (`any(r.emoji == '🟢' and r.me for r in message.reactions)`); if so, silently return.

### Pattern 2: Pillow optimize-to-WebP (BOT-03/D-11/D-12)
**What:** Downscale-only to 1920 long edge, re-encode WebP, strip metadata, return dimensions.
```python
# Source: pillow.readthedocs.io image-file-formats (WebP: quality 0-100, method 0-6, exif opt-in)
import io
from PIL import Image, ImageOps

def optimize_to_webp(raw: bytes) -> tuple[bytes, int, int]:
    with Image.open(io.BytesIO(raw)) as im:
        im = ImageOps.exif_transpose(im)          # honor orientation, then drop EXIF
        if im.mode in ("P", "LA"):
            im = im.convert("RGBA")
        elif im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGB")                 # CMYK, etc.
        im.thumbnail((1920, 1920), Image.Resampling.LANCZOS)  # downscale-only, keeps aspect
        w, h = im.size                             # POST-resize dims → gallery.json width/height
        out = io.BytesIO()
        im.save(out, format="WEBP", quality=82, method=6)  # no exif= arg ⇒ metadata stripped
        return out.getvalue(), w, h
```
- `thumbnail()` never upscales and preserves aspect ratio (D-12). `[VERIFIED: training + Pillow docs behavior]`
- Not passing `exif=` strips metadata by default (privacy: drops GPS/camera data). `[VERIFIED: pillow.readthedocs.io — exif is opt-in]`
- `method=6` = best compression (slowest); fine here — publishing is a background task, not latency-sensitive. `[VERIFIED: docs — method 0=fast,6=slower-better]`
- Run this in a thread (`asyncio.to_thread(optimize_to_webp, raw)`) so Pillow's CPU work doesn't block the event loop.

### Pattern 3: Atomic cross-repo commit via Git Data API (BOT-04/D-16)
**What:** Commit image blob(s) + updated `gallery.json` in ONE commit; PATCH the branch ref.
**When:** Every publish and every removal.
```python
# Source: docs.github.com REST git (blobs/trees/commits/refs) — atomic multi-file commit
# H = {"Authorization": f"Bearer {PAT}", "Accept": "application/vnd.github+json"}
# 1. base = GET /repos/{repo}/git/ref/heads/{branch}      -> parent_sha
# 2. base_tree = GET /repos/{repo}/git/commits/{parent_sha} -> tree.sha
# 3. cur = GET /repos/{repo}/contents/{gallery_json_path}?ref={branch}  (base64 -> json.loads)
#    -> append entries (publish)  OR  filter out entries file~=*-{msgID}-* (remove)
# 4a. PUBLISH: for each webp: POST /git/blobs {content: b64, encoding:"base64"} -> blob_sha
#     tree = [ {path: "public/gallery/<name>", mode:"100644", type:"blob", sha: blob_sha}, ...,
#              {path: gallery_json_path, mode:"100644", type:"blob",
#               content: json.dumps(new_array, ensure_ascii=False, indent=2)} ]
# 4b. REMOVE: tree = [ {path: gallery_json_path, mode:"100644", type:"blob", content: <new json>},
#              *[{path:"public/gallery/<name>", mode:"100644", type:"blob", sha: None}  # DELETE
#                for name in removed_files] ]
# 5. new_tree = POST /git/trees {base_tree: base_tree_sha, tree: [...]}
# 6. commit = POST /git/commits {message: "gallery: publish 3 photos (discord msg <id>)",
#                                tree: new_tree_sha, parents: [parent_sha]}
# 7. PATCH /repos/{repo}/git/refs/heads/{branch} {sha: commit_sha}   # PAT push -> on:push fires
```
- **Deletion is done in the tree with `"sha": null`** — this is why raw REST beats PyGithub here. `[VERIFIED: WebSearch — GitHub tree API sha:null deletes; PyGithub issue #1318]`
- The PATCH ref with a **PAT** triggers `deploy.yml`'s `on: push` (the `GITHUB_TOKEN` loop-prevention does NOT apply to a PAT). `[VERIFIED: docs.github.com/actions + WebSearch]`
- Wrap the whole read-modify-commit in an `asyncio.Lock` (single-process bot) so concurrent approvals don't race the same parent sha; add retry-with-backoff (D-18) for the 422/409 "ref moved" case (re-fetch parent, rebuild, retry). `[ASSUMED — standard optimistic-concurrency pattern]`

### Pattern 4: Startup backfill (D-20)
**What:** On `on_ready`/cog load, read the persisted last-processed-message-ID, scan history after it, and (a) add ✅ prompts to staff image posts missing them, (b) process any staff ✅/🌙 already present but not yet reflected in published-state.
```python
# Source: discordpy TextChannel.history(after=..., limit=None, oldest_first=True)
after = discord.Object(id=get_cursor()) if get_cursor() else None
async for msg in channel.history(after=after, limit=None, oldest_first=True):
    await self._reconcile(msg)     # add prompt if needed; apply ✅/🌙 if staff-reacted & unhandled
    set_cursor(msg.id)             # persist as we go (SQLite, core/db.py pattern)
```
- `channel.history` supports `after` (snowflake or datetime) + `oldest_first`. `[VERIFIED: training + discordpy docs]`
- Published-state check during reconcile is derivable from the 🟢 marker on the message and/or the presence of `*-{msgID}-*` entries in the fetched `gallery.json` — no local per-message DB needed (D-14). `[VERIFIED design from D-14]`

### Anti-Patterns to Avoid
- **Contents API for the two-file commit** — `PUT /contents` is one-file-per-commit; using it for image + json produces two commits (two Pages builds, non-atomic, violates D-16). Use the tree API. `[CITED: docs.github.com/rest/repos/contents]`
- **Committing with the Actions `GITHUB_TOKEN`** — would NOT trigger `deploy.yml`. The bot must use its own PAT. `[VERIFIED]`
- **Blocking the event loop with Pillow** — CPU re-encode of large images blocks all Discord handling. Use `asyncio.to_thread`. `[ASSUMED — asyncio best practice]`
- **Trusting the message cache for reactions** — after a restart the message won't be cached; RAW events + `fetch_message` are mandatory (also required for backfill). `[VERIFIED design]`
- **Putting the caption in the filename** — captions are free-form user text (path-traversal / non-ASCII risk). Filenames use only bot-controlled numerics (`date-msgID-index`). Caption goes only in the JSON. `[VERIFIED design from D-14]`
- **Reacting to non-staff / bot reactions** — always role-gate and skip `payload.member.bot`. `[VERIFIED from D-01]`

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image resize/re-encode/format convert | Custom pixel/codec code | **Pillow** `thumbnail` + `save(WEBP)` | Codecs, color modes, orientation, decompression-bomb guards are solved |
| EXIF/orientation handling | Manual EXIF parse | `ImageOps.exif_transpose` + drop-on-save | Correct rotation + privacy strip in two lines |
| Atomic multi-file git commit | Shell `git` on a local clone | **GitHub Git Data API** (`requests`) | No local repo to keep in sync; true atomicity incl. deletes (`sha:null`) |
| HTTP to GitHub | New http client | **`requests`** (already a dep) | Zero new dependency |
| Reaction/message events after restart | Manual message polling | discord.py **RAW listeners** | Cache-independent by design |
| Published→files mapping | A mapping database | **Filename-encoded message ID (D-14)** | Removal derivable statelessly from `gallery.json` |
| Backfill cursor | Ad-hoc file format | **SQLite via `core/db.py`** | Matches repo convention; crash-safe |

**Key insight:** almost everything here is a thin orchestration over solved primitives. The only genuinely novel logic is the *reconciliation state machine* (pending → published → unpublished, idempotent, backfillable) — and D-05/D-14 deliberately push that state onto Discord (🟢 marker) and the filename, so even that needs no bespoke datastore beyond a single cursor row.

## Common Pitfalls

### Pitfall 1: Non-atomic / double-triggering deploys
**What goes wrong:** Image and `gallery.json` committed separately → two Pages builds, and a window where `gallery.json` references a not-yet-committed image (broken tile).
**Why:** Reaching for the Contents API (one file per call).
**How to avoid:** Single tree-API commit containing both. `[VERIFIED]`
**Warning signs:** Two commits per publish; transient 404 images right after publishing.

### Pitfall 2: Commit doesn't trigger the deploy
**What goes wrong:** Photos committed but Pages never rebuilds.
**Why:** Using `GITHUB_TOKEN` (loop-prevention) or a PAT lacking `Contents: write`, or pushing to a branch other than `revamp` (D-15 misconfig).
**How to avoid:** Use a fine-grained PAT with **Contents: Read and write** on the website repo; push to the branch in `WEBSITE_BRANCH` (default `revamp`). `[VERIFIED]`
**Warning signs:** New commit visible on GitHub, no new Actions run.

### Pitfall 3: WebP mode/transparency errors
**What goes wrong:** `save(WEBP)` raises or produces black backgrounds for `P`/`CMYK`/`LA` images (e.g. PNG screenshots with alpha).
**Why:** WebP wants RGB/RGBA; palette/CMYK modes aren't directly encodable.
**How to avoid:** Convert `P`/`LA`→`RGBA`, other non-RGB→`RGB` before save (Pattern 2). `[VERIFIED: Pillow mode handling]`
**Warning signs:** `OSError: cannot write mode P as WEBP`; wrong colors.

### Pitfall 4: Race between simultaneous approvals
**What goes wrong:** Two photos approved within the same second → second commit's parent sha is stale → `422 Update is not a fast forward` / lost entry.
**Why:** Read-modify-write on `gallery.json` + ref without serialization.
**How to avoid:** `asyncio.Lock` around the whole publish/unpublish; retry-with-backoff re-reading the ref on conflict (D-18). `[ASSUMED — optimistic concurrency]`
**Warning signs:** Intermittent missing entries; 422 on ref PATCH.

### Pitfall 5: EXIF orientation lost / privacy leak
**What goes wrong:** Portrait phone photos render sideways, or GPS/camera metadata ships to the public site.
**Why:** Not applying orientation before strip; or copying EXIF into the WebP.
**How to avoid:** `exif_transpose` then save **without** `exif=` (Pattern 2). `[VERIFIED]`
**Warning signs:** Rotated gallery tiles; EXIF present in published files.

### Pitfall 6: Decompression-bomb / oversized attachment
**What goes wrong:** A very large image spikes memory / blocks the loop during decode.
**Why:** Public channel (staff-gated, but still) + unbounded pixel dimensions.
**How to avoid:** Keep Pillow's default `Image.MAX_IMAGE_PIXELS` guard (raises on ~178M px); optionally cap `attachment.size`; decode in `asyncio.to_thread`. `[ASSUMED — Pillow default + asyncio]`
**Warning signs:** `DecompressionBombWarning`/`Error`; event-loop stalls.

### Pitfall 7: Removal can't find files after schema/format change
**What goes wrong:** 🌙 fails to remove because it can't map message→files.
**Why:** Relying on cached message content instead of the filename convention.
**How to avoid:** Derive removals purely from `gallery.json` entries whose `file` matches `*-{msgID}-*` (D-14) — works even for messages the bot never cached and even after restarts. `[VERIFIED design]`
**Warning signs:** 🌙 no-ops on old published photos.

## Code Examples

### Detect staff image post + add ✅ (BOT-01/D-03)
```python
# Source: nocturna-bot forum.py attachment-filter idiom + config role check
IMAGE_TYPES = ("image/png", "image/jpeg", "image/webp")   # D-13: exclude image/gif + video/*

def _image_attachments(message):
    return [a for a in message.attachments
            if (a.content_type or "") in IMAGE_TYPES]

@commands.Cog.listener()
async def on_message(self, message: discord.Message):
    if message.channel.id != config.PHOTO_CHANNEL_ID or message.author.bot:
        return
    roles = getattr(message.author, "roles", [])
    if not (set(r.id for r in roles) & set(config.GALLERY_STAFF_ROLE_IDS)):
        return                                   # community posts ignored entirely (D-03)
    if _image_attachments(message):
        await message.add_reaction("✅")         # the approve control (BOT-01)
```

### Config additions (`config.py`) + `.env.example`
```python
# config.py  — mirror existing os.getenv pattern
PHOTO_CHANNEL_ID       = int(os.getenv("PHOTO_CHANNEL_ID", "1416329356426481717"))
GALLERY_STAFF_ROLE_IDS = [int(x) for x in os.getenv("GALLERY_STAFF_ROLE_IDS", "").split(",") if x.strip()]
GITHUB_PAT             = os.getenv("GITHUB_PAT", "")
WEBSITE_REPO           = os.getenv("WEBSITE_REPO", "Shangri/<website-repo>")   # owner/name
WEBSITE_BRANCH         = os.getenv("WEBSITE_BRANCH", "revamp")                 # D-15
WEBSITE_GALLERY_JSON   = os.getenv("WEBSITE_GALLERY_JSON", "src/data/gallery.json")
WEBSITE_IMAGE_DIR      = os.getenv("WEBSITE_IMAGE_DIR", "public/gallery")
```
> The exact `WEBSITE_REPO` owner/name is **not confirmed by this research** — the website repo's `owner/name` slug must be supplied by the user (this working dir is the website repo, but its GitHub remote slug isn't recorded in the planning docs). `[ASSUMED — planner must confirm the website repo slug]`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JPEG/PNG gallery images | WebP (q~82) | mature since ~2020 | Smaller files, faster Pages load (D-11) |
| `git` shell on a local clone | GitHub Git Data API over HTTPS | standard for bots | No clone to maintain; atomic; stateless |
| Cached-message reaction events | RAW reaction/delete events | discord.py 2.x norm | Survives restarts, enables backfill |
| PIL | Pillow (fork) | 2011 | PIL is dead; Pillow 12.x is current `[VERIFIED: PyPI]` |

**Deprecated/outdated:**
- `Image.ANTIALIAS` → replaced by `Image.Resampling.LANCZOS` (removed in Pillow 10). Use the enum. `[VERIFIED: Pillow ≥9.1 enum, ANTIALIAS removed in 10.0]`
- discord.py `on_reaction_add` (cached-only) for this use case → use `on_raw_reaction_add`. `[VERIFIED]`

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Website repo GitHub slug (`owner/name`) for `WEBSITE_REPO` is unknown from planning docs; user must supply | Config additions | PAT commits go to the wrong repo / fail — blocks BOT-04. **Confirm before execution.** |
| A2 | `asyncio.Lock` + retry/backoff is sufficient for the single-process bot's commit concurrency | Pattern 3 / Pitfall 4 | Rare lost entries under burst approvals if omitted |
| A3 | Keeping Pillow's default `MAX_IMAGE_PIXELS` is adequate DoS guard given the staff-only gate | Pitfall 6 | Memory spike on a pathological image |
| A4 | Download figures/age for Pillow/PyGithub/GitPython (versions are verified) | Package Audit | None material — all slopcheck [OK], versions verified |
| A5 | GitPython "requires full clone" characterization | Alternatives | Only affects the rejected alternative |
| A6 | The staff role(s) for the gallery gate — reuse `ROLE_MODERATOR_ID` (1418724526308593834) or a new list? Not specified | Config | Wrong gate = wrong people can publish. **Confirm role ID list with user.** |

**Note:** A1 and A6 are the two items that genuinely need user confirmation before execution (repo slug + staff role IDs). Everything else is verified or low-risk.

## Open Questions (RESOLVED)

1. **Website repo `owner/name` slug for the PAT target** — RESOLVED: `05-01-PLAN.md` sets the `WEBSITE_REPO` default to `Shangrii/Nocturna-Avatars`, verified against this repo's actual `git remote -v` during planning.
   - What we know: this working dir IS the website repo; deploy branch is `revamp`; path is `src/data/gallery.json`.
   - What's unclear: the exact `owner/name` GitHub slug to put in `WEBSITE_REPO` (planning docs don't record the remote).
   - Recommendation: planner adds a `checkpoint:human-verify` to capture the slug (+ confirm the PAT has Contents:write on it).

2. **Which staff role(s) gate the gallery (D-01/D-08)?** — RESOLVED: deferred by design to the blocking `checkpoint:decision` in `05-05-PLAN.md` Task 1, which captures the confirmed `GALLERY_STAFF_ROLE_IDS` list from the user before live setup.
   - What we know: the bot already has `ROLE_MODERATOR_ID=1418724526308593834`.
   - What's unclear: whether the gallery uses that same role or a distinct list.
   - Recommendation: default to a configurable `GALLERY_STAFF_ROLE_IDS` list; confirm the actual IDs with the user.

3. **PAT type — classic vs fine-grained, and rotation** — RESOLVED: deferred by design to the `05-05-PLAN.md` Task 1 checkpoint; fine-grained PAT (website repo only, Contents: Read and write) is the recommended choice captured there.
   - What we know: must trigger `on: push` (⇒ a PAT, not `GITHUB_TOKEN`) with Contents write.
   - Recommendation: **fine-grained PAT** scoped to only the website repo, **Contents: Read and write**; store in the bot's `.env` (already git-ignored); plan for expiry/rotation.

## Environment Availability

> These run on the **bot host** (self-hosted 24/7 machine running `nocturna-bot`), NOT this website-repo machine — so they can't be probed from here. Declared for the planner; verify on the bot host during setup.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python 3.x + discord.py[voice] | Whole cog | ✓ (bot runs today) | 2.7.1 | — |
| `Pillow` (+ bundled libwebp) | BOT-03 image pipeline | ✗ (new) | ≥12.0.0 target | none — hard requirement; `pip install Pillow` |
| `requests` | GitHub API transport | ✓ | ≥2.31.0 | — |
| Outbound HTTPS → api.github.com | BOT-04/05 | assumed ✓ (bot already reaches Discord) | — | — |
| GitHub PAT (Contents:write, website repo) | BOT-04/05 | ✗ (user must create) | fine-grained | none — blocks cross-repo push |
| `message_content` gateway intent | BOT-06 caption | ✓ (enabled in bot.py) | — | — |

**Missing dependencies with no fallback:**
- `Pillow` — must be added to `requirements.txt` + installed on the bot host.
- GitHub PAT — user must create + place in the bot's `.env` (STATE.md already tracks this as a Phase 5 blocker).

**Missing dependencies with fallback:** none.

## Security Domain

`security_enforcement` not set in config → treated as **enabled**. Stack: Python bot + public Discord channel + cross-repo git + static site render.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No user accounts; Discord handles identity |
| V3 Session Management | no | N/A |
| V4 Access Control | **yes** | **Role-gate** (D-01/D-08): act only on reactions from `GALLERY_STAFF_ROLE_IDS`, verified server-side from `payload.member.roles`; skip bots. |
| V5 Input Validation | **yes** | Validate attachment `content_type` ∈ image allow-list (D-13); re-encode every image through Pillow (sanitizes/normalizes, drops embedded payloads); cap size; keep decompression-bomb guard. Caption written via `json.dumps` (proper escaping). |
| V6 Cryptography | **yes (secrets)** | PAT stored only in `.env` (git-ignored); never logged (D-17 keeps usernames/secrets out of commits/logs); fine-grained least-privilege scope. Never hand-roll crypto. |
| V12 File & Resources | **yes** | Bot-controlled numeric filenames only (`date-msgID-index`) — no user text in paths → no path traversal. Commit to a fixed `public/gallery/` prefix. |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Non-staff publishes to the public gallery | Elevation of Privilege | Server-side role gate on every ✅/🌙; ignore all others (D-01/D-03) |
| Path traversal via crafted filename/caption | Tampering | Filenames = numerics only; caption never in path; commit under fixed prefix |
| Stored XSS via caption on the rendered site | Tampering | Site already renders captions with Astro auto-escaping + `createElement`/`textContent` (Phase 4, verified). Bot writes valid JSON via `json.dumps`. |
| Malicious/oversized image (bomb) | Denial of Service | Pillow re-encode + `MAX_IMAGE_PIXELS` guard + size cap + `to_thread` |
| PAT leakage → website repo compromise | Info Disclosure / Elevation | Fine-grained PAT (single repo, Contents-only), `.env` git-ignored, never logged, rotate |
| EXIF/GPS metadata leak on public images | Info Disclosure | Strip metadata on WebP save (no `exif=`) — privacy default (D-11 discretion) |
| Accidental message delete removes live photos | (accepted risk, D-10) | Documented + accepted by user; channel is source of truth |

## Sources

### Primary (HIGH confidence)
- `Shangrii/nocturna-bot` @ main — `bot.py`, `config.py`, `requirements.txt`, `.env.example`, `cogs/forum.py`, `core/db.py` (fetched via `gh api`) — cog/config/db conventions, intents, existing deps
- This repo — `src/data/gallery.json`, `src/components/sections/GalleryPage.astro`, `FeaturedGallery.astro`, `.github/workflows/deploy.yml`, `04-01-SUMMARY.md`, `04-CONTEXT.md` — the write-target contract + deploy trigger
- pillow.readthedocs.io/en/stable/handbook/image-file-formats.html — WebP save options (quality 0-100, method 0-6, exif opt-in)
- docs.github.com REST — Git trees/blobs/commits/refs (atomic multi-file commit, `sha:null` deletion) and GITHUB_TOKEN vs PAT workflow-trigger semantics

### Secondary (MEDIUM confidence)
- github.com/Rapptz/discord.py PR #2443 — `RawReactionActionEvent.member` populated for guild reactions
- github.com/PyGithub/PyGithub issue #1318 — `InputGitTreeElement` cannot pass `sha=null` (why raw REST is chosen for deletion)
- WebSearch (verified against GitHub docs): PAT-authored commits trigger `on: push`; tree API `sha:null` deletes

### Tertiary (LOW confidence)
- Package age/download magnitudes for Pillow/PyGithub/GitPython (versions verified via `pip index versions`; magnitudes approximate)

## Metadata

**Confidence breakdown:**
- Write-target contract: **HIGH** — verified from shipped files + Phase 4 summaries
- Bot-repo conventions: **HIGH** — read directly from `nocturna-bot` source
- Standard stack (Pillow): **HIGH** — official docs + slopcheck [OK] + version verified
- Git transport (Git Data API + PAT trigger): **HIGH** — GitHub docs + cross-verified search
- discord.py raw events/intents: **HIGH** — docs + PR #2443 + repo already uses discord.py 2.7.1
- Concurrency/backfill internals: **MEDIUM** — sound standard patterns; discretion (D-53) leaves exact form open

**Research date:** 2026-07-03
**Valid until:** ~2026-08-02 (30 days; discord.py 2.7 / Pillow 12 / GitHub API are stable — the only volatile input is the user-supplied repo slug + role IDs)
