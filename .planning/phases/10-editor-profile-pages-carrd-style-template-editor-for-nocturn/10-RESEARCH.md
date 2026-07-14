# Phase 10: Editor Profile Pages — Research

**Researched:** 2026-07-14
**Domain:** First authenticated web app (Discord OAuth2) + block-based page builder + static-site cross-repo publishing
**Confidence:** HIGH (stack/transport/auth), MEDIUM (live-preview fidelity, role-change detection)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Page content & template**
- **D-01:** Core bio fields (name, avatar, tagline/bio) + multiple custom `(label, url)` links, editor-managed. No availability/commission status badge — contact routes through the existing "Abrir Ticket" Discord CTA.
- **D-02:** Modular **block system** (bio, links, portfolio grid, quote, image, divider, …) — editor adds/removes/reorders/edits blocks. NOT raw CSS/HTML. Fixed Astro component library rendering an ordered, editor-defined block list. Optional per-block brand-constrained styling (colors within red/navy/off-white + accent) "if scope allows"; full arbitrary theming is OUT.
- **D-03:** A **portfolio block** auto-pulls work credited to the editor from `store.json` (`editor` field, Phase 9) and `gallery.json` (**new** `editor` field, D-11). Editors can ALSO hand-add custom portfolio items in the same block.
- **D-04:** NSFW-flagged items (store `nsfw`, NSFW gallery photos) are **excluded entirely** from auto-pull — profiles are SFW-only, no blur/gate.
- **D-11:** `gallery.json` gets a new `editor` field, assigned by **extending the existing gallery ✅ approve flow** (captured at approval time). No separate reassignment command in baseline scope.
- **D-12:** Credited-work → editor matching is by **exact slug** — the `editor` field value in BOTH `store.json` and the new `gallery.json` field must BE the editor's slug. Re-tags existing free-text `editor` values in `store.json`.
- **D-13:** A new/edited page **publishes immediately on editor save** — no staff ✅ approval gate.
- **D-14:** The admin app shows a **live/near-live preview** while arranging blocks.

**Creation & edit flow (the auth pivot)**
- **D-05 (PIVOT — locks project architecture beyond this phase):** Editing happens through a **new authenticated web admin app**, NOT Discord slash commands/modals. Bot's only remaining role is optional (e.g. a slash command that DMs the editor their admin-page link).
- **D-06:** The OAuth/admin backend lives **on the bot's existing always-on host ("cinema", same systemd host as `nocturna-bot`)** — NOT serverless, NOT bot-only. It commits to the website repo the same way the bot does (reuse/port `core/github_publish.py`). **The public website stays 100% static on GitHub Pages — PLAT-02 unaffected.**
- **D-07:** Login is **Discord OAuth2 + a live guild role check** (admin app verifies the editor role via the bot token/API at login).
- **D-08:** An editor can **only ever edit their own page** — 1:1 Discord ID → page, no admin override.
- **D-09:** First login **auto-creates an empty draft page** for any Discord user holding the editor role.
- **D-10:** When an editor loses the editor role, their page is **auto-unpublished on next sync** (periodic check / role-change detection).
- **D-15:** The editor role **reuses the existing moderator/staff role** (same one gating gallery/reviews/store) — no new Discord role.
- **D-16:** Editors **can self-unpublish** at any time. Custom link URLs accept **any `https://` URL**, no domain allowlist.
- **D-17:** Avatar and block images are uploaded **through the web admin app** (file-upload widget, optimized, committed to `public/editors/<slug>/`) — not via Discord.

**Identity, URLs & directory**
- **D-18:** Data schema is **one `editors.json` array**, mirroring `gallery.json`/`reviews.json` — each element holds `slug`, `name`, `avatar`, `blocks[]`, `links[]`, etc. NOT one file per editor.
- **D-19:** Slug is **derived from the editor's Discord username on first login**, staff-editable afterward. Routes: `/es/editores/<slug>` · `/en/editors/<slug>`.
- **D-20:** A **public `/editores` (`/editors`) directory page** lists all published editors (avatar + name + tagline, linking to each profile).

### Claude's Discretion
- Exact block-type list beyond those named (bio, links, portfolio grid, quote, image, divider) — propose a reasonable initial set.
- Whether per-block brand-constrained color/background options ship in v1 or defer (D-02, "if scope allows").
- Technical shape of the admin app (framework/stack) on `cinema`, and how it reuses vs. ports the bot's GitHub commit transport.
- Exact mechanism for role-change detection driving D-10 auto-unpublish (polling vs. webhook vs. periodic bot-side check).

### Deferred Ideas (OUT OF SCOPE)
- None. Discussion stayed within phase scope. (`2026-07-07-jinxxy-auto-sync` todo reviewed and correctly excluded — already done in Phase 9.)
</user_constraints>

<phase_requirements>
## Phase Requirements

No formal `EDIT-*` requirement IDs exist in REQUIREMENTS.md yet (phase is `TBD` in the traceability table). The planner should **mint new requirement IDs** (suggested prefix `EDIT-`) from the D-01…D-20 decisions above and add them to REQUIREMENTS.md, mirroring how STORE-* / REV-* / STORE-SYNC-* were added during their phase planning. Suggested mapping:

| Suggested ID | Behavior | Source |
|--------------|----------|--------|
| EDIT-01 | Public per-editor profile page renders from `editors.json` block list, ES+EN, at `/es/editores/<slug>` · `/en/editors/<slug>` | D-02/D-18/D-19 |
| EDIT-02 | Public `/editores` · `/editors` directory lists all published editors | D-20 |
| EDIT-03 | Portfolio block auto-pulls SFW credited work from `store.json`+`gallery.json` by exact slug, plus hand-added items | D-03/D-04/D-12 |
| EDIT-04 | Discord-OAuth2 admin app on `cinema`; login gated by live guild editor-role check | D-05/D-06/D-07/D-15 |
| EDIT-05 | Editor edits ONLY their own page (1:1 Discord ID→page); first login auto-creates draft | D-08/D-09 |
| EDIT-06 | Block editor with add/remove/reorder + live preview + image upload; save publishes immediately cross-repo | D-13/D-14/D-17 |
| EDIT-07 | Editor self-unpublish; role-loss auto-unpublish on next sync | D-10/D-16 |
| EDIT-08 | Gallery ✅ approve flow extended to capture `editor` credit; `store.json` editor values re-tagged to slugs | D-11/D-12 |
</phase_requirements>

## Summary

This phase introduces the project's **first authenticated web surface**. Every prior bot feature is Discord-command-driven and writes to the static site via a cross-repo GitHub Data API commit (`core/github_publish.py` in `nocturna-bot`). This phase keeps that publishing model but replaces the *authoring* surface: instead of Discord modals, editors log in to a small web app via Discord OAuth2, build a block-based profile page with a live preview, and hit save — which commits `editors.json` + uploaded images to the website repo. The public site itself stays 100% static Astro on GitHub Pages.

Two clean halves: (1) a **static site half** in this repo — a new dynamic Astro route per editor, a block-renderer component library, a directory page, and a new `editors.json` data contract; and (2) a **backend half** that belongs in the `nocturna-bot` repo (per D-06, "alongside the bot on cinema") — a Python web app that reuses the bot's existing `core/github_publish.py` transport, `core/image_optimize.py`, and `config.py` **by direct import**, plus a Discord OAuth2 login and a bot-token guild-role check.

**Primary recommendation:** Build the admin app as a **FastAPI + Uvicorn** service (new package in the `nocturna-bot` repo, its own systemd unit), authenticating with **Authlib** (Discord OAuth2 authorization-code flow, `identify` scope) and gating on a **bot-token REST role check** (`GET /guilds/{guild}/members/{user}`). Session state in a signed httpOnly `SameSite=Lax` cookie via **Starlette SessionMiddleware** (itsdangerous). Server-rendered **Jinja2** templates + **Alpine.js** (reactive live preview) + **SortableJS** (drag-reorder) — no SPA build step. Front it with **Caddy** (automatic HTTPS) on a dedicated subdomain. Because Python matches the bot, the GitHub transport, image optimizer, and config are reused verbatim — no porting. This is a genuinely new attack surface, so the Security Domain section below is load-bearing, not optional.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Render public editor page | CDN / Static (Astro build → GitHub Pages) | — | Public site must stay static (PLAT-01/02); page is built from committed `editors.json` |
| Editor directory listing | CDN / Static (Astro build) | — | Same static contract as gallery/store pages |
| Portfolio auto-pull (filter by slug, exclude nsfw) | CDN / Static (build-time read of `store.json`+`gallery.json`) | — | No runtime DB; resolved at `astro build` like all other data joins |
| Editor login / identity | API / Backend (admin app on cinema) | Discord OAuth2 (IdP) | Auth needs a server + client secret; cannot live in the browser or static site |
| Guild role authorization | API / Backend (bot-token REST call) | Discord API | Trust boundary — bot token must never reach the browser |
| Session management | API / Backend (signed cookie) | — | Server-signed; secret never client-side |
| Block editing + live preview | Browser / Client (Alpine.js + SortableJS) | API (persist on save) | Interactive authoring is a client concern; server owns persistence + validation |
| Image upload + optimize | API / Backend (Pillow re-encode) | — | Untrusted binary must be validated + re-encoded server-side (never trust client) |
| Publish (commit `editors.json` + images) | API / Backend (`core/github_publish.py`) | GitHub Data API | Reuses the bot's existing cross-repo transport + PAT |
| Role-loss auto-unpublish | API / Backend — **bot process** (`on_member_update` + periodic sweep) | — | Only the bot holds a live gateway connection to observe role changes in real time |

## Standard Stack

### Core (admin backend — new package in `nocturna-bot` repo)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `fastapi` | 0.139.0 | Web framework (routes, pydantic validation, file upload) | De-facto standard async Python API framework; native request validation is a security asset here [VERIFIED: PyPI + slopcheck] |
| `uvicorn[standard]` | 0.51.0 | ASGI server (run under systemd) | Standard FastAPI runtime [VERIFIED: PyPI + slopcheck] |
| `authlib` | 1.7.2 | Discord OAuth2 client (code exchange, state) | Mature, audited OAuth/OIDC lib; don't hand-roll token exchange [VERIFIED: PyPI + slopcheck] |
| `itsdangerous` | 2.2.0 | Signs the session cookie (via Starlette SessionMiddleware) | Pallets-maintained cookie signing; pulled in transitively by Starlette [VERIFIED: PyPI + slopcheck] |
| `python-multipart` | 0.0.32 | Parses `multipart/form-data` for image upload | Required by FastAPI for `UploadFile` [VERIFIED: PyPI + slopcheck] |
| `jinja2` | 3.1.6 | Server-rendered admin templates | Standard FastAPI templating [VERIFIED: PyPI + slopcheck] |
| `httpx` | 0.28.1 | Async HTTP to Discord token/role endpoints (Authlib backend) | Modern async client; Authlib integrates with it [VERIFIED: PyPI + slopcheck] |
| `starlette` | ≥0.40 (FastAPI-pinned) | SessionMiddleware + ASGI primitives | Bundled with FastAPI; provides the session cookie layer [VERIFIED: PyPI + slopcheck] |

> `starlette` shows `1.3.1` on the raw PyPI index but FastAPI pins a compatible `0.4x`/`0.4x`-range internally — **let FastAPI resolve Starlette**, don't pin it independently. [CITED: FastAPI dependency metadata]

### Already present in `nocturna-bot` (reuse, do not re-add)
| Library | Purpose here |
|---------|--------------|
| `requests` | The synchronous transport `core/github_publish.py` already uses (GitHub Data API) |
| `Pillow>=12.0.0` | `core/image_optimize.py::optimize_to_webp` — reuse verbatim for avatar/block image uploads (D-17) |
| `python-dotenv` | `config.py` reads `.env` — extend it with the new OAuth/session keys |
| `discord.py[voice]==2.7.1` | The bot process that will host `on_member_update` role-loss detection (D-10) |

### Supporting (admin frontend — vendored or CDN, NOT npm-installed into the static site)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `alpinejs` | 3.15.12 | Reactive live preview + form state in the block editor | Lightweight (~15 KB), no build step; drives D-14 live preview [VERIFIED: npm + slopcheck] |
| `sortablejs` | 1.15.7 | Drag-to-reorder blocks | The standard reorder lib; solves D-02 reordering [VERIFIED: npm + slopcheck] |

> These serve the **admin app only** (which is NOT Astro). Vendor them into the app's static dir or load from a pinned CDN **with SRI hashes** (see Security Domain). Do **not** add them to the website `package.json` — the public site has no JS dependencies beyond Astro/GSAP/Lenis and must stay that way.

### Static-site half (this repo — NO new npm dependencies)
The editor pages, directory, and block renderer are plain Astro components + a new `src/data/editors.json`. No new packages. Astro `7.0.3` + Tailwind v4 (`4.3.2`) already installed cover everything.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| FastAPI (Python) | Node/Express + a **ported** GitHub transport | Rejected — forces re-porting `github_publish.py` + `image_optimize.py` to JS, doubling the maintained cross-repo commit logic and re-introducing supply-chain surface. Python reuses both by import. |
| Separate systemd service | Run the web app **inside the bot process** (uvicorn task on the discord.py loop) | Rejected as default — couples restarts, one crash takes down both. A separate unit sharing the same venv + `core/` + `.env` is cleaner. (The **role-loss listener** is the one piece that DOES belong in the bot process, because only it has the gateway.) |
| Server-rendered + Alpine | Full SPA (React/Vue/Svelte) | Rejected for v1 — needs a JS build toolchain on `cinema`, a heavier deploy, and its own bundle security review for a single-purpose internal tool. Alpine+SortableJS is enough for add/remove/reorder/preview. |
| Authlib | Hand-rolled OAuth (manual `httpx` code exchange) | Viable but discouraged — hand-rolling state/nonce/token exchange is exactly where auth bugs live. Authlib is auditable and handles the state param correctly. |
| Caddy reverse proxy | nginx + certbot | Both fine; Caddy gives automatic HTTPS with near-zero config. nginx is fine if already installed on `cinema`. Confirm what the host already runs. |

**Installation (on the cinema host, in the bot's existing venv):**
```bash
pip install "fastapi==0.139.0" "uvicorn[standard]==0.51.0" "authlib==1.7.2" \
            "python-multipart==0.0.32" "jinja2==3.1.6" "httpx==0.28.1"
# itsdangerous + starlette arrive transitively; Pillow/requests/dotenv already present.
```
Pin exact versions in `requirements.txt` (the repo's convention) and re-run the legitimacy gate before the first install.

## Package Legitimacy Audit

Verified 2026-07-14 via `pip index versions`, `npm view`, and `slopcheck scan` (slopcheck 0.6.1).

| Package | Registry | Latest | slopcheck | Disposition |
|---------|----------|--------|-----------|-------------|
| fastapi | PyPI | 0.139.0 | [OK] | Approved |
| uvicorn | PyPI | 0.51.0 | [OK] | Approved |
| authlib | PyPI | 1.7.2 | [OK] | Approved |
| itsdangerous | PyPI | 2.2.0 | [OK] | Approved |
| python-multipart | PyPI | 0.0.32 | [OK] (flagged "python-" LLM-bait naming but established) | Approved |
| httpx | PyPI | 0.28.1 | [OK] | Approved |
| starlette | PyPI | (FastAPI-resolved) | [OK] | Approved — do not pin independently |
| jinja2 | PyPI | 3.1.6 | [OK] | Approved |
| alpinejs | npm | 3.15.12 | (verified via npm view; slopcheck npm scan inconclusive locally) | Approved — pin + SRI |
| sortablejs | npm | 1.15.7 | (verified via npm view; slopcheck npm scan inconclusive locally) | Approved — pin + SRI |

**Packages removed due to slopcheck [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none. (`python-multipart` triggered slopcheck's name-pattern heuristic but resolved [OK] — it is the official FastAPI multipart parser.)

*All Python packages scanned [OK] against PyPI. The two npm libs are for the admin frontend only and are well-known (Alpine.js by Caleb Porzio, SortableJS by SortableJS org); pin the exact version and add Subresource Integrity if CDN-loaded.*

## Architecture Patterns

### System Architecture Diagram

```
                         ┌─────────────────────────────────────────────┐
   Editor's browser      │                                             │
   (logs in from         │   cinema host (existing bot host, systemd)  │
    anywhere)            │                                             │
        │                │   ┌──────────────┐    ┌──────────────────┐  │
        │  1. GET /login │   │  Caddy /      │    │  admin app       │  │
        ├───────────────►│   │  nginx       │───►│  (FastAPI +      │  │
        │                │   │  (auto-HTTPS,│    │   uvicorn)       │  │
        │  redirect to   │   │   subdomain) │    │                  │  │
        │◄───── Discord ─┼───┤              │    │  - OAuth2 (Authlib)│ │
        │                │   └──────────────┘    │  - session cookie  │ │
        ▼                │                        │  - block editor UI │ │
  ┌───────────┐  2.oauth │                        │    (Jinja2+Alpine) │ │
  │  Discord  │◄─────────┼────────────────────────┤  - Pillow optimize │ │
  │  OAuth2   │  3. code │                        │                  │  │
  │  + API    │─────────►│                        └────────┬─────────┘  │
  └─────┬─────┘          │        4. bot-token role check    │           │
        │  GET /guilds/  │           (GET member roles)      │           │
        │  {g}/members/  │◄──────────────────────────────────┤           │
        │  {user}        │                                   │           │
        └────────────────┼───────────────────────────────────┘           │
                         │        5. on save: commit editors.json +      │
                         │           images via core/github_publish.py   │
                         │   ┌──────────────┐                            │
                         │   │ nocturna-bot │  on_member_update ─────────┼──► (D-10 unpublish)
                         │   │ (discord.py) │  role-loss listener        │
                         │   └──────────────┘                            │
                         └───────────────┬───────────────────────────────┘
                                         │  6. GitHub Git Data API commit
                                         ▼        (blobs→tree→commit→ref)
                               ┌────────────────────┐
                               │ website repo        │  7. push triggers
                               │ (Shangrii/          │─────► deploy.yml → gh-pages
                               │  Nocturna-Avatars)  │       → GitHub Pages (static)
                               │  src/data/editors.  │
                               │  json + public/     │       Public visitor loads
                               │  editors/<slug>/    │◄────── /en/editors/<slug> (static)
                               └────────────────────┘
```

Trace the primary use case: an editor hits `/login` → Discord OAuth2 → the app exchanges the code, reads their Discord ID, calls the Discord API **with the bot token** to confirm the editor role in the guild → issues a signed session → the editor arranges blocks with a live client-side preview and uploads images → on **Save**, the app validates+optimizes and commits `editors.json` + images to the website repo → the existing deploy pipeline rebuilds the static site → the public page is live.

### Component Responsibilities

| Component | Repo | Responsibility |
|-----------|------|----------------|
| `src/pages/[lang]/editores/[slug].astro` (or a `[lang]/[section]/[slug].astro` resolver) | website | Per-editor static page; `getStaticPaths` over editors × langs |
| `src/pages/[lang]/[page].astro` (+ `routeSlugs`) | website | Add an `editors` concept for the **directory** page (D-20) |
| `src/components/editor-blocks/*.astro` | website | One component per block type; a `<BlockRenderer>` maps `block.type` → component |
| `src/data/editors.json` | website | The array contract (D-18) — the admin app's commit target |
| admin app (`app/` package) | nocturna-bot | OAuth2, session, role check, block editor UI, image upload, publish |
| `core/github_publish.py` | nocturna-bot | **Reused** — add an `publish_editors()` / `sync_editors()` function paralleling `sync_store()` |
| `core/image_optimize.py` | nocturna-bot | **Reused** — `optimize_to_webp()` for avatar/block images |
| role-loss listener (new cog or `on_member_update`) | nocturna-bot | D-10 auto-unpublish |

### Recommended Project Structure (admin app, inside nocturna-bot repo)
```
nocturna-bot/
├── core/
│   ├── github_publish.py      # REUSED + new publish_editors()/sync_editors()
│   ├── image_optimize.py      # REUSED
│   └── editors_model.py        # NEW: pydantic block/link/page schema + validation
├── app/                        # NEW admin web app
│   ├── main.py                 # FastAPI app, SessionMiddleware, routes
│   ├── auth.py                 # Authlib Discord OAuth2 + bot-token role check
│   ├── deps.py                 # require_editor() dependency (session→slug, ownership)
│   ├── templates/              # Jinja2 (login, editor, preview partials)
│   └── static/                 # vendored alpine.min.js, Sortable.min.js, admin css
├── cogs/
│   └── editors.py              # NEW: on_member_update D-10 unpublish + optional /mi-pagina DM link
└── deploy/
    └── nocturna-editor-admin.service   # systemd unit + Caddyfile snippet
```

### Pattern 1: Reuse the existing cross-repo commit transport
**What:** The admin app imports `core.github_publish` and adds an `editors.json` path exactly like `sync_store` / `publish_review` already did. The transport is a generic read-modify-commit-ref core (`_commit_with_retry`) with a stale-ref retry and atomic blobs→tree→commit→ref sequence.
**When to use:** Every write from the admin app (save page, upload image, unpublish).
**Example (the existing generic retry core the new path plugs into):**
```python
# Source: nocturna-bot/core/github_publish.py L292 (verified in repo)
def _commit_with_retry(repo, branch, message, build_tree, fetch=None):
    fetch = fetch or (lambda: _fetch_gallery(repo, branch))
    for attempt in range(_MAX_ATTEMPTS):
        parent_sha = _fetch_parent_sha(repo, branch)
        base_tree_sha = _fetch_base_tree_sha(repo, parent_sha)
        current = fetch()                       # freshly fetched each attempt
        tree_entries = build_tree(current)      # merge, never clobber (D-18/Pitfall)
        new_tree_sha = _create_tree(repo, base_tree_sha, tree_entries)
        commit_sha = _create_commit(repo, message, new_tree_sha, parent_sha)
        resp = _update_ref(repo, branch, commit_sha)
        if _ok(resp):
            return commit_sha
        # 409/422 stale-ref → exponential backoff + rebuild
```
A new `sync_editors(editors_array, images=(), *, message=None)` mirrors `sync_store` (L762): build image blobs once (survive retries), rewrite `src/data/editors.json` inside the retry loop. Run it off the event loop with `asyncio.to_thread` (or, in FastAPI, `run_in_threadpool`) since the transport uses blocking `requests`.

### Pattern 2: Authorization-code flow with a hard role gate
**What:** Discord OAuth2 gives you *who* the user is (`identify`). It does **not** by itself prove they hold the editor role. After the token exchange, make a **server-side** call with the **bot token** to `GET /guilds/{GUILD_ID}/members/{user_id}` and check the roles array against `ROLE_MODERATOR_ID`.
**When to use:** On every login, and re-check on a schedule / on each sensitive write (defense against stale sessions after role loss, D-10).
**Why bot-token, not `guilds.members.read`:** D-07 specifies the bot token/API path. Using the bot token means you don't need the extra OAuth scope and you read the *authoritative current* role set from the server rather than a token-time snapshot. The bot token already exists in `config.BOT_TOKEN`.
```python
# Pseudocode — role check with the existing bot token (CITED: Discord API docs)
r = httpx.get(
    f"https://discord.com/api/v10/guilds/{GUILD_ID}/members/{user_id}",
    headers={"Authorization": f"Bot {BOT_TOKEN}"},   # NEVER the OAuth user token
)
member = r.json()
if ROLE_MODERATOR_ID not in [int(x) for x in member.get("roles", [])]:
    raise HTTPException(403)   # not an editor → no session issued
```

### Pattern 3: Block schema as a closed union (no raw HTML)
**What:** D-02's safety guarantee comes from blocks being a **fixed, enumerated set of typed shapes**, validated server-side (pydantic), each rendered by a dedicated Astro component with auto-escaping. No `set:html`, ever.
```json
// editors.json element (proposed shape — planner to finalize)
{
  "slug": "aria",
  "discordId": "123456789012345678",
  "published": true,
  "name": "Aria",
  "avatar": "/editors/aria/avatar.webp",
  "tagline": { "es": "Editora de avatares", "en": "Avatar editor" },
  "links": [ { "label": "Twitter", "url": "https://x.com/aria" } ],
  "blocks": [
    { "type": "bio",       "text": { "es": "...", "en": "..." } },
    { "type": "portfolio", "auto": true, "extra": [ { "image": "/editors/aria/w1.webp", "caption": "..." } ] },
    { "type": "quote",     "text": { "es": "...", "en": "..." } },
    { "type": "image",     "src": "/editors/aria/shot.webp", "alt": "..." },
    { "type": "divider" }
  ]
}
```
**Proposed initial block set (Claude's discretion, D-02):** `bio`, `links`, `portfolio`, `quote`, `image`, `divider`, and optionally `heading` + `text` (plain paragraph). Ship per-block brand-constrained color as a **v2 fold** unless the block editor lands early — it multiplies preview + validation surface.

### Pattern 4: Portfolio auto-pull at build time
**What:** The `portfolio` block resolves credited work when Astro builds. In the block renderer, read `store.json` + `gallery.json`, filter `entry.editor === slug`, drop anything `nsfw === true` (store) or NSFW-tagged (gallery), then append the editor's hand-added `extra[]` items. No runtime fetch — pure build-time join, consistent with how the whole site works.
```astro
---
// Source pattern: mirrors existing build-time data reads (StorePage/GalleryPage)
import store from '../../data/store.json';
import gallery from '../../data/gallery.json';
const credited = [
  ...store.products.filter(p => p.editor === slug && !p.nsfw),
  ...gallery.filter(g => g.editor === slug /* && !g.nsfw */),
  ...(block.extra ?? []),
];
---
```

### Anti-Patterns to Avoid
- **Bot token in the browser:** The role check MUST be server-side. Never ship `BOT_TOKEN` (or the OAuth client secret) to client JS.
- **`set:html` for block text:** Defeats D-02's whole safety rationale. Astro auto-escaping only.
- **Trusting the client's `slug`/`discordId` on save:** Derive the editable page from the **session**, not from the request body (IDOR / D-08).
- **Storing uploaded bytes as-is:** Always re-encode through Pillow (strips metadata, neutralizes polyglots, enforces real image type).
- **Independent-pinning Starlette:** Let FastAPI resolve it; a mismatched pin breaks SessionMiddleware.
- **Running the web app inside the bot's asyncio loop as the default:** Keep them separate units; only the role-loss listener lives in the bot.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth2 code exchange + `state` | Manual httpx dance | `authlib` | State/nonce/token bugs are the classic auth vuln; Authlib is audited |
| Session cookie signing | Custom HMAC | Starlette `SessionMiddleware` (itsdangerous) | Signed, tamper-evident, httpOnly/Secure/SameSite in one place |
| Cross-repo commit | New GitHub API client | `core/github_publish.py` (import) | Already handles atomic blobs→tree→commit→ref + stale-ref retry + PAT hygiene |
| Image resize/strip | Custom Pillow code | `core/image_optimize.py::optimize_to_webp` | Already downscales, strips EXIF/GPS, has bomb guard, WebP-normalizes |
| Request/body validation | Hand-written type checks | FastAPI + pydantic models | Declarative, rejects malformed blocks/links before they reach the commit |
| Drag reorder | Custom pointer-event code | SortableJS | Touch/keyboard/edge cases already solved |
| Live preview reactivity | Custom DOM diffing | Alpine.js | Declarative `x-data`/`x-for` for the block list preview |
| HTTPS/certs | Manual openssl | Caddy (auto) or certbot | ACME renewal automated |
| Rate limiting login | Custom counters | `slowapi` or reverse-proxy limits | Prevents OAuth-callback abuse/brute of the role gate |

**Key insight:** This phase's backend is ~80% *assembly of existing, audited pieces* — the bot already owns the two hardest parts (atomic cross-repo commit + safe image optimization). The genuinely new code is the OAuth login, the ownership-scoped session, and the block editor UI. Keep custom code confined to those.

## Common Pitfalls

### Pitfall 1: IDOR — editing someone else's page
**What goes wrong:** The save endpoint reads `slug`/`discordId` from the request body and writes that entry, letting a logged-in editor overwrite another's page.
**Why it happens:** Trusting client input for the resource identity.
**How to avoid:** Resolve the editable entry **only** from the server session (`session.discord_id → editors.json entry`). Ignore any identity in the body. Enforce D-08's 1:1 mapping in one `require_editor()` dependency.
**Warning signs:** Any handler that accepts `slug` or `discord_id` as a writable field.

### Pitfall 2: Stale session after role loss
**What goes wrong:** An offboarded editor keeps a valid cookie and can still publish; D-10 only fires "on next sync."
**Why it happens:** OAuth/session proves identity at login time, not continuously.
**How to avoid:** Re-run the bot-token role check on each **write** (cheap, one REST call) in addition to the periodic sweep; short session TTL (e.g. a few hours). The `on_member_update` bot listener handles the *page* unpublish; the write-time check stops the *session* from acting.
**Warning signs:** Long-lived sessions, role checked only at `/login`.

### Pitfall 3: Malicious / oversized image upload
**What goes wrong:** A crafted "image" is a decompression bomb, a polyglot (valid image + embedded script), or an SVG with `<script>`.
**Why it happens:** Trusting `Content-Type` / extension.
**How to avoid:** Enforce a byte-size cap (reject before reading fully), **reject SVG entirely** (raster only), verify the real format by decoding with Pillow, and **re-encode to WebP** via `optimize_to_webp` (which already keeps Pillow's `MAX_IMAGE_PIXELS` bomb guard and drops metadata). Only the re-encoded bytes are committed.
**Warning signs:** Committing the uploaded bytes directly; accepting `image/svg+xml`.

### Pitfall 4: OAuth callback CSRF / open redirect
**What goes wrong:** Missing `state` validation lets an attacker fixate a session; an unvalidated `redirect_uri`/post-login `next` param becomes an open redirect.
**Why it happens:** Skipping the `state` check or echoing a client-supplied return URL.
**How to avoid:** Let Authlib generate+verify `state` (bound to the session). Register the exact `redirect_uri` in the Discord app and never accept an arbitrary post-login redirect target (use a fixed internal path).
**Warning signs:** No `state` compare on callback; redirecting to a URL from the query string.

### Pitfall 5: Slug collisions & path traversal
**What goes wrong:** Two editors derive the same slug from their username; or a crafted slug (`../`) escapes `public/editors/<slug>/`.
**Why it happens:** Slug derived from a non-unique display name (D-19) and used directly in a filesystem/commit path.
**How to avoid:** Normalize slugs to `[a-z0-9-]`, enforce uniqueness against existing `editors.json` on first-login creation (append a numeric suffix on collision), and validate the slug charset before it ever enters a path. Keep the `discordId` as the true 1:1 key (D-08), slug is only the URL label.
**Warning signs:** Using the raw Discord username in a path; no uniqueness check at D-09 creation.

### Pitfall 6: Concurrent commits clobbering `editors.json`
**What goes wrong:** Two editors save at once; the second overwrites the first's entry.
**Why it happens:** Read-modify-write without merge.
**How to avoid:** The existing `_commit_with_retry` already re-fetches `current` and rebuilds the tree each attempt — the new `build_tree` must **upsert this editor's entry by `discordId`** into the freshly fetched array (mirror how `sync_store`'s tree builder re-grafts by `checkoutUrl`), never replace the whole file blindly.
**Warning signs:** `build_tree` that writes a whole in-memory array captured before the fetch.

### Pitfall 7: D-11 gallery credit has no input affordance
**What goes wrong:** The gallery approve gesture is a **✅ reaction** (`cogs/gallery.py::on_raw_reaction_add`) — a reaction carries no text, so there's no obvious place to type the editor slug at approval time.
**Why it happens:** D-11 says "captured at approval time" but the current approve is reaction-only.
**How to avoid (planner decision needed):** Options — (a) after ✅, the bot posts an ephemeral **select menu / slug autocomplete** to pick the credited editor (reuses the Phase 9 `/tienda editar` slug-autocomplete pattern); (b) a separate `/galeria creditar <msg> <slug>` slash command; (c) default the credit to the **approving staff member** if they are themselves an editor. This is the single most likely place for the plan to under-specify — call it out. See Open Questions.

### Pitfall 8: Internet-exposed service with no reverse proxy / HTTPS
**What goes wrong:** Editors log in from anywhere, so the app is public; without TLS the session cookie and OAuth code travel in cleartext.
**Why it happens:** The bot today has no inbound web surface (only local `127.0.0.1` notify ports per `config.py`).
**How to avoid:** Front the app with Caddy/nginx on a dedicated subdomain (e.g. `editors.nocturna-avatars.site`), automatic HTTPS, `Secure`+`SameSite` cookies, and bind uvicorn to `127.0.0.1` behind the proxy. Requires a DNS record + the Discord app's redirect URI registered to that subdomain.
**Warning signs:** uvicorn bound to `0.0.0.0` with no proxy; `http://` redirect URI.

## Code Examples

### FastAPI ownership-scoped dependency (D-08)
```python
# The single choke point that enforces "edit only your own page"
async def require_editor(request: Request) -> dict:
    sess = request.session
    discord_id = sess.get("discord_id")
    if not discord_id:
        raise HTTPException(401)
    # re-verify role on each sensitive action (Pitfall 2)
    if not await has_editor_role(discord_id):
        request.session.clear()
        raise HTTPException(403)
    return {"discord_id": discord_id, "slug": sess["slug"]}   # identity from SESSION, never body
```

### Session middleware (signed cookie)
```python
# Source pattern: Starlette SessionMiddleware (CITED: starlette docs)
from starlette.middleware.sessions import SessionMiddleware
app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,      # from .env, 32+ random bytes, NEVER committed
    https_only=True,                # Secure flag
    same_site="lax",
    max_age=6 * 3600,               # short TTL (Pitfall 2)
)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Discord modal authoring (original todo sketch) | Web admin app + OAuth2 (D-05 pivot) | This phase | Discord modals cap at 5 fields / no reorder — incompatible with a block builder |
| `discord.com/api` OAuth host | `discord.com/developers` docs now at `docs.discord.com` | 2026 (301 redirect observed) | Use `https://discord.com/api/v10/...` for API; docs live at `docs.discord.com` |
| Passing bot token via `guilds.members.read` scope | Bot-token server-side role read (D-07) | — | Authoritative current roles, no extra scope, token stays server-side |

**Deprecated/outdated:**
- `python-multipart` name-squat noise — the legitimate package is the FastAPI-blessed one (slopcheck [OK]); ignore look-alikes.
- Do not target GitHub Pages "Actions deploy-pages" — the project deploys via a **gh-pages force-push** topology (STATE.md 05-05 incident); the editor commit rides the same `deploy.yml` path.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | FastAPI/Python is the right admin-app stack (vs. Node) | Standard Stack | Low — it's the clear reuse win, but user may prefer another stack; it's Claude's discretion per CONTEXT |
| A2 | Admin app code lives in the `nocturna-bot` repo (per D-06 "alongside the bot") | Architecture | Medium — if the user wants a third repo, structure shifts (still Python, still reuses `core/`) |
| A3 | A dedicated subdomain + reverse proxy (Caddy/nginx) is available/creatable on `cinema` | Env / Pitfall 8 | High — needs DNS control + host config; if the domain registrar/DNS isn't accessible this blocks live login. **Confirm with user.** |
| A4 | The "editor role" for D-15 is `ROLE_MODERATOR_ID = 1418724526308593834` (the existing staff role) | Auth | Low — confirmed in `config.py`; D-15 says reuse it. Verify no distinct "editor" sub-role is wanted |
| A5 | D-10 role-loss detection is best done via the bot's `on_member_update` gateway event + a periodic sweep | Architecture / Pitfall 2 | Medium — needs the `members` privileged gateway intent enabled on the bot; if not enabled, falls back to polling only |
| A6 | Per-block color theming defers to v2 | Pattern 3 | Low — explicitly Claude's discretion ("if scope allows") |
| A7 | Proposed block set (bio/links/portfolio/quote/image/divider/heading/text) | Pattern 3 | Low — discretion; planner/user can trim or extend |
| A8 | Discord OAuth2 endpoint/scope details | Pattern 2 | Low — CITED from docs.discord.com, but re-verify the exact `/v10` member endpoint at implementation time |

**Note:** A3 and A5 are the two that most need user/host confirmation before planning locks. A3 (DNS + reverse proxy + Discord redirect-URI registration) is a hard prerequisite for any live login and should be an explicit early task or `checkpoint:human-verify`.

## Open Questions

1. **How is the D-11 gallery editor-credit captured on a reaction-only approve?**
   - What we know: current approve is a ✅ reaction (`cogs/gallery.py`); no text input.
   - What's unclear: which affordance (ephemeral select vs. slash command vs. default-to-approver) the user wants.
   - Recommendation: reuse the Phase 9 `/tienda editar` slug-autocomplete as an ephemeral follow-up after ✅; simplest to build and consistent. Flag for discuss/plan.

2. **Does `cinema` already run a reverse proxy, and is DNS for a subdomain controllable?**
   - What we know: the bot only binds local `127.0.0.1` notify ports today (no inbound web).
   - What's unclear: whether Caddy/nginx exists, and who controls DNS for `nocturna-avatars.site`.
   - Recommendation: confirm before planning; add a deploy/infra task (proxy + TLS + DNS + Discord redirect URI). Blocks live login (A3).

3. **Is the bot's `members` privileged gateway intent enabled?**
   - Needed for `on_member_update` real-time role-loss detection (D-10).
   - Recommendation: if not, plan a polling sweep as the primary mechanism and enable the intent as an enhancement.

4. **Where does `editors.json` live and what is the exact schema?**
   - Recommendation: `src/data/editors.json` as a top-level array (mirrors `gallery.json`/`reviews.json`, D-18), shipped committed as `[]` so builds never break — same pattern as every prior data file.

5. **Re-tagging existing `store.json` `editor` values to slugs (D-12):** who does it and when?
   - Recommendation: a one-time data task early in the phase (the products array is currently `[]` in this repo, so the live re-tag happens against the deployed store — coordinate with the running JinxxyCog so a sync doesn't fight the edit; `editor` is already a staff-owned, sync-preserved field per 09-07/09-12).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python | Admin app + bot | ✓ (dev box) | 3.12.8 | — (cinema already runs the bot on Python 3.12) |
| Node.js | npm view / optional frontend tooling | ✓ | 24.13.0 | — (admin frontend can be vendored, no build step) |
| `nocturna-bot` repo (core/ transport) | Reuse of `github_publish.py`, `image_optimize.py`, `config.py` | ✓ local | — | — |
| Discord OAuth2 application (client id/secret) | Login (D-07) | ✗ unknown | — | **Must be created/registered** in the Discord Developer Portal; redirect URI added |
| Reverse proxy (Caddy/nginx) on cinema | HTTPS for the public login surface (Pitfall 8) | ✗ unknown | — | **No safe fallback** — TLS is mandatory for an internet login |
| DNS subdomain (e.g. `editors.nocturna-avatars.site`) | Public reachability + OAuth redirect URI | ✗ unknown | — | Could reuse a path on the apex if proxy supports it, but a subdomain is cleaner |
| Bot `members` gateway intent | D-10 real-time role-loss | ✗ unknown | — | Periodic polling sweep |
| GitHub fine-grained PAT (Contents R/W) | Commit `editors.json` + images | ✓ (in bot `.env` since 05-05) | — | — (reuse the existing `GITHUB_PAT`) |
| Bot token | Guild role check (D-07) | ✓ (`config.BOT_TOKEN`) | — | — |

**Missing dependencies with no fallback:**
- **Reverse proxy + TLS** on cinema — mandatory before any live editor login (A3 / Pitfall 8).
- **Discord OAuth2 application credentials** — must be registered; the app cannot authenticate without a client id/secret and a matching redirect URI.

**Missing dependencies with fallback:**
- `members` gateway intent → periodic polling sweep for D-10 if the intent isn't enabled.

## Security Domain

> `security_enforcement` is not set to `false` in config → enabled. This is the project's **first authenticated, internet-facing surface**, so this section is load-bearing.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | **yes** | Discord OAuth2 authorization-code flow via Authlib; `state` param enforced; no local passwords |
| V3 Session Management | **yes** | Starlette `SessionMiddleware` signed cookie — httpOnly, `Secure`, `SameSite=Lax`, short `max_age`; re-verify role on writes |
| V4 Access Control | **yes** | 1:1 `discordId → page` from session only (D-08); `require_editor()` dependency; bot-token role gate (D-07/D-15); no admin override |
| V5 Input Validation | **yes** | pydantic block/link models; closed block-type union; URL scheme allowlist (`https://` only, D-16, reject `javascript:`/`data:`); slug charset `[a-z0-9-]`; size caps on text + upload |
| V6 Cryptography | **yes** | Session signing key (itsdangerous) + OAuth `state`/token handling — all via libraries, **never hand-rolled**; secrets from `.env` only, never logged/committed |
| V12 Files & Resources | **yes** | Upload: size cap, reject SVG, Pillow decode + re-encode to WebP (metadata strip + bomb guard); commit re-encoded bytes only; slug-validated paths (no traversal) |
| V13 API / Web Service | **yes** | CSRF on state-changing POSTs (SameSite + token); fixed redirect URI (no open redirect); rate-limit `/login` + callback |

### Known Threat Patterns for {Discord-OAuth admin app + static-site commit}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| OAuth callback CSRF (missing `state`) | Spoofing | Authlib-generated `state` bound to session; verify on callback (Pitfall 4) |
| IDOR — edit another editor's page | Elevation / Tampering | Resource identity from session, never request body (Pitfall 1 / D-08) |
| Stale session after role revocation | Elevation | Re-check role on each write + short TTL + `on_member_update` unpublish (Pitfall 2 / D-10) |
| Malicious image upload (bomb / polyglot / SVG-script) | Tampering / DoS | Size cap, reject SVG, Pillow re-encode to WebP, bomb guard (Pitfall 3 / V12) |
| Stored XSS via block text / link label | Tampering | Closed block union, Astro auto-escaping (no `set:html`), pydantic validation, URL scheme allowlist |
| Open redirect (post-login `next`) | Spoofing | Fixed internal redirect target; registered redirect URI only (Pitfall 4) |
| Bot token / client secret / PAT leakage | Info Disclosure | Server-side only; `.env`; never in JS, logs, or commits (matches existing GITHUB_PAT/BOT_TOKEN discipline) |
| Path traversal via slug | Tampering | Slug charset validation + uniqueness before it enters any path (Pitfall 5) |
| Concurrent-save clobber of `editors.json` | Tampering | Upsert-by-`discordId` inside `_commit_with_retry`'s re-fetch/rebuild (Pitfall 6) |
| Login brute / callback abuse | DoS | `slowapi` or reverse-proxy rate limits; HTTPS-only |
| Cleartext session/code over HTTP | Info Disclosure | Mandatory TLS via Caddy/nginx; `Secure` cookie (Pitfall 8) |

## Project Constraints (from CLAUDE.md)

- **Astro static output, deployable to GitHub Pages, preserve CNAME/domain** — the public editor pages MUST be built statically; no runtime/backend on the public site. The admin app lives OFF the public site (cinema host). [Honored by D-06 architecture.]
- **Free static hosting; no backend/DB on the site** — `editors.json` is committed data, not a queried DB; the admin app persists via git commit, same as every bot feature.
- **The photo/publishing automation lives in `nocturna-bot`, not the website repo** — the admin app + role-loss cog belong in `nocturna-bot`; the website repo gets only static Astro + `editors.json`.
- **i18n ES + EN from launch** — editor pages, directory, and block chrome must render both locales; user-entered block/bio text is stored per-locale `{es,en}` where the editor provides it (or shown as written, consistent with gallery captions / reviews being rendered verbatim).
- **Brand palette + fonts + film grain** — block components use the existing brand tokens (Tailwind v4 `@theme` in `src/styles/theme.css`); per-block theming stays within the brand palette (D-02).
- **Performance: load fast, don't bury the conversion path** — editor pages are static + image-optimized (WebP via the existing optimizer); keep "Abrir Ticket" CTA reachable (NAV-03).
- **GSD workflow enforcement** — all edits go through a GSD command; no direct repo edits.
- **No project skills present** — `.claude/skills/` etc. absent; nothing to load.

## Sources

### Primary (HIGH confidence)
- `nocturna-bot/core/github_publish.py`, `core/image_optimize.py`, `config.py`, `cogs/gallery.py` — read directly in-repo (transport, optimizer, role/config, approve flow)
- Website repo: `src/i18n/routes.ts`, `src/pages/[lang]/[page].astro`, `src/data/{store,gallery,reviews}.json`, `package.json`, `.planning/config.json` — read directly
- PyPI via `pip index versions` + `slopcheck 0.6.1 scan` — package versions + legitimacy (fastapi 0.139.0, uvicorn 0.51.0, authlib 1.7.2, itsdangerous 2.2.0, python-multipart 0.0.32, httpx 0.28.1, jinja2 3.1.6, starlette)
- npm via `npm view` — alpinejs 3.15.12, sortablejs 1.15.7

### Secondary (MEDIUM confidence)
- `docs.discord.com/developers/topics/oauth2` — OAuth2 scopes, authorization-code flow, `state` param, `identify` scope, guild member endpoint [CITED]

### Tertiary (LOW confidence)
- Architecture recommendations (FastAPI vs. Node, separate systemd unit, Caddy) — reasoned from constraints + reuse, not from an external benchmark; flagged in Assumptions Log (A1–A3).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against PyPI/npm + slopcheck [OK].
- Transport reuse: HIGH — read the actual `github_publish.py` generic retry core; the `sync_store`/`publish_review` precedents prove the extension pattern.
- Auth flow: MEDIUM-HIGH — CITED from Discord docs; exact `/v10` member endpoint to re-confirm at build time.
- Architecture (framework/host shape): MEDIUM — Claude's discretion per CONTEXT; strongest reuse path, but A2/A3 need user confirmation.
- Live-preview fidelity: MEDIUM — the admin app approximates the Astro render; authoritative output is only the static build (documented tradeoff).
- Pitfalls / security: HIGH — standard for OAuth admin surfaces; D-11 affordance gap (Pitfall 7) is the main plan-under-spec risk.

**Research date:** 2026-07-14
**Valid until:** 2026-08-13 (30 days; stable stacks. Re-verify Discord API version + package pins at implementation.)
