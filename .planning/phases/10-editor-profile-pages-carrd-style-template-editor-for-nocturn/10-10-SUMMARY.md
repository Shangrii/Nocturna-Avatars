---
phase: 10-editor-profile-pages-carrd-style-template-editor-for-nocturn
plan: 10
subsystem: api
tags: [fastapi, jinja2, alpinejs, sortablejs, pillow, image-upload, idor, oauth, nocturna-bot]

# Dependency graph
requires:
  - phase: 10-02
    provides: core/editors_model.py (EditorPage validation) this plan's save endpoint runs every payload through
  - phase: 10-05
    provides: core/github_publish.sync_editors + unpublish_editor transport this plan's save/publish/self-unpublish endpoints call
  - phase: 10-08
    provides: app/deps.require_editor() ownership dependency every write in this plan is scoped through (D-08 IDOR choke point)
provides:
  - "../nocturna-bot/app/templates/editor.html + login.html — the two-pane block editor (Alpine live preview + SortableJS reorder) and the login/403 page"
  - "../nocturna-bot/app/static/{alpine.min.js,Sortable.min.js,editor.css} — vendored front-end libs + brand-token CSS"
  - "../nocturna-bot/app/main.py — GET /editor (+ alias '/'), POST /editor/image, POST /editor/save, POST /editor/unpublish, all behind require_editor"
affects: [10-11 (deploy consumes app.main:app + the documented Caddy rate-limit config)]

# Tech tracking
tech-stack:
  added: ["alpinejs 3.15.12 (vendored, not CDN)", "sortablejs 1.15.7 (vendored, not CDN)"]
  patterns:
    - "Content-negotiating exception handler: browser navigation hitting 401/403 renders login.html; fetch() JSON calls keep getting a JSON error body"
    - "Image upload: reject SVG by content-type AND extension before any Pillow decode; stream-read with an early size-cap abort; only Pillow-re-encoded WebP bytes are ever committed"
    - "Save endpoint: merge client payload with session identity LAST (discordId/slug/published forced from require_editor's session, silently overriding any body value) before EditorPage validation"
    - "sync_editors called with the freshly-fetched unchanged entry + a new image blob for /editor/image (no dedicated image-only transport helper needed — reuses the existing upsert-by-discordId path)"

key-files:
  created:
    - ../nocturna-bot/app/templates/editor.html
    - ../nocturna-bot/app/templates/login.html
    - ../nocturna-bot/app/static/editor.css
    - ../nocturna-bot/app/static/alpine.min.js
    - ../nocturna-bot/app/static/Sortable.min.js
    - ../nocturna-bot/tests/test_app_editor.py
  modified:
    - ../nocturna-bot/app/main.py
    - ../nocturna-bot/deploy/EDITOR_DEPLOY.md

key-decisions:
  - "Route path conflict resolved: 10-08 fixed POST_LOGIN_REDIRECT='/' documenting the app root as '10-10's editor dashboard', but this plan's own artifact contract says GET /editor. Mounted the SAME handler at both '/' and '/editor' rather than picking one and breaking the other plan's documented assumption."
  - "Rate limiting (T-10-10-04) implemented at the PROXY level (Caddy rate_limit directive, documented in EDITOR_DEPLOY.md for 10-11) instead of adding slowapi as a new pip dependency mid-plan — a fresh package install would need its own legitimacy checkpoint (mirroring 10-02's), and the plan's own action text names proxy-level as an accepted alternative to slowapi."
  - "POST /editor/image commits via sync_editors(current_unchanged_entry, images=[(name, webp_bytes)]) rather than adding a new image-only transport helper to core/github_publish.py — stays within this plan's file scope (app/main.py + tests only) and reuses the audited upsert-by-discordId path verbatim."
  - "login.html would otherwise be an orphaned template (no route ever rendered it) — added a content-negotiating StarletteHTTPException handler so browser navigation to a 401/403 (unauthenticated or role-loss) renders the UI-SPEC login/403 page, while every editor-app fetch() call keeps receiving JSON (unchanged behavior for the JS client)."

requirements-completed: [EDIT-06, EDIT-07]

# Metrics
duration: ~70min
completed: 2026-07-15
---

# Phase 10 Plan 10: Editor Authoring Surface — Block Editor UI + Image Upload + Save/Publish/Unpublish Summary

**Built the actual carrd-style editing experience in `nocturna-bot`: a two-pane block editor (Alpine.js live preview + SortableJS drag/keyboard reorder over vendored, SRI-safe libraries), an image-upload endpoint that rejects SVG/oversized/malformed input and commits only Pillow-re-encoded WebP bytes, and save/publish (immediate, D-13) + self-unpublish (D-16) endpoints — every write scoped through `require_editor` so the request body can never carry identity (D-08 IDOR).**

## Performance
- **Duration:** ~70 min (including a session-usage-limit interruption mid-Task-1; resumed cleanly from the last uncommitted state)
- **Tasks:** 3 (Task 1 auto, Tasks 2–3 auto+TDD)
- **Files:** 6 created, 2 modified, all in `../nocturna-bot`
- **Tests:** +14 (`tests/test_app_editor.py`); full bot suite 480 passed (was 466)

## Accomplishments
- **`app/templates/editor.html`** — two-pane layout (≥1024px side-by-side, mobile tab-toggle): left pane is the block-list editor (add-block picker over the closed 8-type set, per-locale `{es,en}` fields, remove-with-confirm, SortableJS drag handle PLUS keyboard move-up/down buttons); right pane is an Alpine `x-data`/`x-for` live preview rendered in the profile's actual look, updating on every `x-model` change. Persistent top bar: Publish (accent), Unpublish (red, destructive confirm), sign-out. Image-upload widgets show an "Optimizando…/Optimizing…" state.
- **`app/templates/login.html`** — "Sign in with Discord"/"Entrar con Discord" CTA + the 403 not-an-editor copy, now actually reachable via a content-negotiating exception handler (see decisions).
- **`app/static/{alpine.min.js,Sortable.min.js}`** — vendored at the pinned versions (3.15.12 / 1.15.7, verified against the file's own embedded version string), NOT CDN-loaded. `editor.css` echoes the site's brand hex values verbatim (no forked palette).
- **`app/main.py`** — `GET /editor` (+ alias `/`) renders the session editor's live entry behind `require_editor`; `POST /editor/image` streams the upload with an early size-cap abort, rejects SVG by content-type AND extension, decodes+re-encodes via `core.image_optimize.optimize_to_webp`, and commits ONLY the re-encoded bytes under `public/editors/<session-slug>/<uuid>.webp`; `POST /editor/save` validates the merged payload through `EditorPage` (session identity forced in, `published=true` per D-13) before calling `sync_editors`; `POST /editor/unpublish` calls `unpublish_editor(session discord_id)` (D-16).
- Rate limiting (T-10-10-04) documented as a Caddy `rate_limit` directive in `deploy/EDITOR_DEPLOY.md` for the 10-11 deploy, avoiding a new pip dependency mid-plan.

## Task Commits (in `../nocturna-bot`, branch `main`)
1. **Task 1:** `b60fd20` (feat — templates + vendored libs + GET /editor wiring + content-negotiating exception handler)
2. **Task 2 (TDD):** `51b61fb` (test, RED — 6 failing image-upload tests) → `9d11bd3` (feat, GREEN)
3. **Task 3 (TDD):** `17e4c56` (test, RED — 8 failing save/unpublish tests) → `ded9cd7` (feat, GREEN)
4. **Docs:** `356a3cb` (docs — Caddy rate-limit config for 10-11)

Plan metadata (this SUMMARY + STATE/ROADMAP) committed separately in the website repo.

## Threat Model Coverage
| Threat ID | Mitigation shipped |
|-----------|--------------------|
| T-10-10-01 (image bomb/polyglot/SVG) | SVG rejected by content-type + extension before any decode; size cap enforced via streamed early-abort; Pillow decode+re-encode (bomb guard + metadata strip already in `optimize_to_webp`); only re-encoded bytes committed |
| T-10-10-02 (IDOR via body identity) | `discordId`/`slug` always overridden from `require_editor`'s session identity; upload path built from the session slug only |
| T-10-10-03 (stored XSS via block/link payload) | `EditorPage` pydantic validation (closed block union, https-only URL guard) rejects before commit; Jinja2/Alpine auto-escaping on render |
| T-10-10-04 (CSRF) | SameSite=Lax + session-only identity; rate limiting documented at the proxy level for 10-11 |
| T-10-10-05 (info disclosure) | Transient `GitHubPublishError` returns the generic UI-SPEC copy; PAT/commit internals never surfaced (verified by test asserting "PAT"/secret text absent from the response body) |
| T-10-10-06 (path traversal) | Upload commit path built from the normalized session slug only, never body input |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 4 — architectural reconciliation, resolved without a stop] Route path conflict between 10-08 and 10-10**
- **Found during:** Task 1
- **Issue:** 10-08's `auth.py` hardcodes `POST_LOGIN_REDIRECT = "/"`, documented as "the 10-10 editor dashboard root." This plan's own artifact contract instead specifies `GET /editor`. Picking only one would break either the 10-08 login flow (redirect to `/` would 404) or this plan's literal acceptance criterion.
- **Fix:** Mounted the same `editor_page` handler at both `/` and `/editor` — no duplicated logic, both plans' expectations satisfied simultaneously. Documented as a code comment at the route definition.
- **Files:** `../nocturna-bot/app/main.py`
- **Commit:** `b60fd20`

**2. [Rule 2 — missing critical functionality] `login.html` was an orphaned template**
- **Found during:** Task 1
- **Issue:** The plan's action text says to "build `login.html`" but neither 10-08 nor 10-10's own action text wires a route that ever renders it — `require_editor` raises a plain `HTTPException(401/403)`, which FastAPI serializes as bare JSON by default. A browser visiting the app unauthenticated (or after role loss) would see `{"detail": "..."}`, never the UI-SPEC login/403 page.
- **Fix:** Added a `StarletteHTTPException` exception handler that renders `login.html` (with `forbidden=True` on 403) ONLY for requests carrying `Accept: text/html` (browser navigation) — every `fetch()` call from the editor app's own JS (image/save/unpublish) has no such header and keeps receiving the original JSON error body unchanged.
- **Files:** `../nocturna-bot/app/main.py`
- **Commit:** `b60fd20`

**3. [Rule 3 — blocking, package-install exclusion honored] Rate limiting via proxy instead of `slowapi`**
- **Found during:** Task 3 (rate-limiting requirement, T-10-10-04)
- **Issue:** The plan's action text offers `slowapi` OR proxy-level rate limiting. Installing `slowapi` mid-plan would be a new pip dependency, which this executor's own rules exclude from unilateral auto-fix authority (would need its own package-legitimacy checkpoint, as 10-02 required for its 6 packages).
- **Fix:** Documented a Caddy `rate_limit` directive (via the `caddy-ratelimit` plugin) covering `/login`, `/auth/callback`, and every `POST /editor/*`, in `deploy/EDITOR_DEPLOY.md` for the 10-11 deploy — the plan's own named alternative, zero new Python dependency.
- **Files:** `../nocturna-bot/deploy/EDITOR_DEPLOY.md`
- **Commit:** `356a3cb`

**4. [Rule 1 — test bug found during TDD] FastAPI misparses `*args, **kwargs` dependency signatures**
- **Found during:** Task 3 GREEN verification
- **Issue:** A test fixture using `async def deny(*a, **k): raise HTTPException(401)` as a `require_editor` override unexpectedly returned 422, not 401. Root cause (confirmed via a standalone repro): FastAPI's dependency signature introspection interprets bare `*a, **k` as required QUERY parameters literally named `a` and `k`, not as "accept nothing" — so the override never actually executed its raise, and the request fell through to the real handler's `EditorPage` validation (422 on the incomplete test body).
- **Fix:** Changed the fixture to an explicit no-arg `async def deny():` signature, matching how a dependency override should be declared. Verified the fix with a standalone script reproducing both the broken and working forms.
- **Files:** `../nocturna-bot/tests/test_app_editor.py`
- **Commit:** `ded9cd7`

**Total:** 4 auto-fixes (1 route-conflict reconciliation, 1 Rule 2 missing-route-for-existing-template, 1 Rule 3 package-install-exclusion honored via documented alternative, 1 Rule 1 test-harness bug). No scope creep; no change to the locked `editors.json` schema or transport contracts.

## Issues Encountered
Execution was interrupted mid-Task-1 by a session usage limit while writing `editor.html` (the file write itself had not landed on disk). Resumed by verifying `git status`/directory contents in `../nocturna-bot` first (confirmed `alpine.min.js`, `Sortable.min.js`, `editor.css`, `login.html` were present and uncommitted; `editor.html` was genuinely missing), then completing the write and continuing the plan from Task 1 as originally scoped — no work was lost or duplicated.

The pre-existing unrelated `.env.example` modification in `../nocturna-bot` was left completely untouched throughout (never staged); verified via `git diff --stat` after the final commit that it is the only remaining uncommitted change.

## User Setup Required
None for this plan's code. The Caddy `rate_limit` directive documented in `EDITOR_DEPLOY.md` (§3.1) and the pre-existing `SESSION_SECRET`/`DISCORD_OAUTH_CLIENT_SECRET` cinema `.env` values remain deferred to the 10-11 deploy, as already tracked.

## Next Phase Readiness
- The editor authoring surface (Surface B) is functionally complete: login → auto-draft (10-08) → two-pane block editor with live preview and image upload (this plan) → immediate publish or self-unpublish (this plan) → role-loss auto-unpublish backstop (10-09).
- 10-11 (final deploy) needs to: apply the Caddy config from `EDITOR_DEPLOY.md` (§3 reverse proxy + §3.1 rate limiting), populate the real `SESSION_SECRET`/`DISCORD_OAUTH_CLIENT_SECRET` in the cinema `.env`, install/enable the systemd unit for `app.main:app`, and restart `nocturna-bot` (members intent + editors cog from 10-09) — all already tracked in the deploy doc.
- No blockers.

## Known Stubs
None. Every block type in the UI-SPEC's closed 8-type set has both an editor-pane form and a preview-pane renderer wired to real Alpine state; the image-upload path is fully wired to the real `optimize_to_webp` + `sync_editors` transport (no mock/placeholder data path in production code).

## Self-Check: PASSED
- FOUND: `../nocturna-bot/app/templates/editor.html`
- FOUND: `../nocturna-bot/app/templates/login.html`
- FOUND: `../nocturna-bot/app/static/editor.css`
- FOUND: `../nocturna-bot/app/static/alpine.min.js` (version string `3.15.12` verified embedded)
- FOUND: `../nocturna-bot/app/static/Sortable.min.js` (header comment confirms `1.15.7`)
- FOUND: `../nocturna-bot/tests/test_app_editor.py`
- FOUND commit: `b60fd20` (feat, Task 1)
- FOUND commit: `51b61fb` (test, RED, Task 2)
- FOUND commit: `9d11bd3` (feat, GREEN, Task 2)
- FOUND commit: `17e4c56` (test, RED, Task 3)
- FOUND commit: `ded9cd7` (feat, GREEN, Task 3)
- FOUND commit: `356a3cb` (docs, rate limiting)
- VERIFIED: `pytest tests/test_app_editor.py -x -q -k image` → 6 passed
- VERIFIED: `pytest tests/test_app_editor.py -q` → 14 passed
- VERIFIED: full bot suite → 480 passed (was 466)
- VERIFIED: Jinja2 parses both templates; `entry | tojson` renders correctly with a real dict
- VERIFIED: `git diff --stat` in `../nocturna-bot` shows only the pre-existing unrelated `.env.example` change remaining uncommitted

---
*Phase: 10-editor-profile-pages-carrd-style-template-editor-for-nocturn*
*Completed: 2026-07-15*
