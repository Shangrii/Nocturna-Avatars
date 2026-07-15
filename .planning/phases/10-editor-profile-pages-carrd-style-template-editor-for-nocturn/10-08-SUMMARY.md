---
phase: 10-editor-profile-pages-carrd-style-template-editor-for-nocturn
plan: 08
subsystem: api
tags: [fastapi, oauth2, authlib, discord, session, idor, role-gate, nocturna-bot, security]

# Dependency graph
requires:
  - phase: 10-02
    provides: core/editors_model.py (EditorPage + normalize_slug) + config OAuth/session/role keys this app imports
  - phase: 10-03
    provides: confirmed OAuth Client ID + fixed /auth/callback redirect URI + members-intent infra facts
  - phase: 10-05
    provides: core/github_publish.sync_editors + _fetch_json editors reader used for first-login draft
provides:
  - "../nocturna-bot/app/auth.py — Authlib Discord OAuth2 login + bot-token guild-role gate (D-07/D-15) + first-login auto-draft (D-09)"
  - "../nocturna-bot/app/deps.py — require_editor() session-only ownership dependency (D-08 IDOR choke point)"
  - "../nocturna-bot/app/main.py — FastAPI app + signed short-TTL SessionMiddleware (V3) + fail-fast config guard + route wiring"
affects: [10-09 (block-editor save endpoints mount behind require_editor), 10-11 (deploy consumes app.main:app + cinema .env secrets)]

# Tech tracking
tech-stack:
  added: []  # all deps (fastapi/authlib/httpx/starlette/itsdangerous) already pinned in 10-02
  patterns:
    - "Authlib OAuth registry (oauth.register) with identify scope + fixed registered redirect URI — state generated/verified by the library, never hand-rolled (Pitfall 4)"
    - "Server-side bot-token role read (GET /guilds/{g}/members/{id}, Authorization: Bot ...) as the authorization gate distinct from OAuth identity — the OAuth user token never reads roles (T-10-08-05)"
    - "require_editor() single ownership choke point: identity from request.session only, live role re-check each call, session-clear on revocation (D-08 / Pitfall 2)"
    - "fail-fast validate_config() at FastAPI lifespan startup (not import time) so `from app.main import app` stays tooling/test-friendly while the server refuses to boot with empty secrets/OAuth config"

key-files:
  created:
    - ../nocturna-bot/app/__init__.py
    - ../nocturna-bot/app/auth.py
    - ../nocturna-bot/app/deps.py
    - ../nocturna-bot/app/main.py
    - ../nocturna-bot/tests/test_app_auth.py
  modified: []

key-decisions:
  - "Post-login redirect is a FIXED module constant POST_LOGIN_REDIRECT='/' (the 10-10 editor dashboard root) — never a client-supplied ?next (open-redirect guard, Pitfall 4/T-10-08-04)"
  - "has_editor_role treats a Discord 404 (user not in guild) as a clean False, not an exception — a non-member is simply not an editor"
  - "ensure_draft reuses github_publish._fetch_json (via asyncio.to_thread) as the editors.json source of truth so its uniqueness check sees the same array sync_editors merges into (Pitfall 6 consistency); slug uniqueness appends -2,-3,… on collision (Pitfall 5)"
  - "normalize_slug ValueError (username with no [a-z0-9]) falls back to an id-derived slug (editor-<discordId>) so a pathological username can never crash first-login"
  - "fail-fast enforced at lifespan startup + __main__, NOT at import — reconciles the plan's 'fail-fast if SESSION_SECRET empty' with its own verify command `from app.main import app` (which runs in a dev env with empty secrets)"
  - "SessionMiddleware: https_only=True + same_site=lax + max_age=6h short TTL (V3/Pitfall 2); uvicorn bound to 127.0.0.1 behind Caddy (Pitfall 8)"

requirements-completed: [EDIT-04, EDIT-05]

# Metrics
duration: ~22min
completed: 2026-07-15
---

# Phase 10 Plan 08: Admin App Auth Core — OAuth2 + Role Gate + Session Summary

**Built the editor admin app's security-critical trust boundary in `nocturna-bot` — Discord OAuth2 login (Authlib) gated by a hard server-side bot-token guild-role check, a signed short-TTL session cookie, the `require_editor()` session-only ownership dependency (D-08 IDOR choke point), and first-login auto-draft creation — with 16 passing tests and the full bot suite green (451), all before any editing UI exists.**

## Performance
- **Duration:** ~22 min
- **Tasks:** 2 (Task 1 TDD, Task 2 auto)
- **Files:** 5 created (4 app modules + 1 test), 0 modified — all in `../nocturna-bot`
- **Tests:** +16 (10 Task 1 + 6 Task 2); full bot suite 451 passed (was 435)

## Accomplishments
- **`app/auth.py`** — `has_editor_role(user_id)` does a SERVER-SIDE `GET /guilds/{GUILD_ID}/members/{user_id}` with the `Bot {BOT_TOKEN}` header (never the OAuth user token) and checks `ROLE_MODERATOR_ID` (D-07/D-15); a 404 non-member is a clean `False`. Authlib OAuth2 client (`identify` scope, fixed registered redirect URI). `callback()` verifies `state` via Authlib (CSRF, Pitfall 4), role-gates before issuing any session, returns 403 with the UI-SPEC copy for a non-editor, and redirects to a FIXED internal path — never a client `?next`. `ensure_draft()` creates a `published=false` empty-`blocks` draft with a normalized unique slug on first login (D-09/Pitfall 5) and commits it via `sync_editors`.
- **`app/deps.py`** — `require_editor()`: the single ownership choke point. Resolves `{discord_id, slug}` from `request.session` ONLY (401 without), re-runs the bot-token role check every call and clears the session + 403s on role loss (D-08 / Pitfall 2). No code path reads slug/discordId from a request body.
- **`app/main.py`** — FastAPI app with `SessionMiddleware(https_only=True, same_site="lax", max_age=6*3600)` (V3/Pitfall 2), `/login`+`/auth/callback`+`/logout` wired, a fail-fast `validate_config()` at lifespan startup, and uvicorn bound to `127.0.0.1` behind Caddy (Pitfall 8).
- Secrets discipline: bot token, client secret, and OAuth code are never logged or returned in any error body (T-10-08-05); `validate_config` names only missing KEYS.

## Task Commits (in `../nocturna-bot`, branch `main`)
1. **Task 1 (TDD):** `1e3464a` (test, RED — app scaffold + failing auth tests) → `80ba852` (feat, GREEN — auth.py)
2. **Task 2:** `2509061` (feat — main.py + deps.py + Task 2 tests)

Plan metadata (this SUMMARY + STATE/ROADMAP) committed separately in the website repo.

## Threat Model Coverage
| Threat ID | Mitigation shipped |
|-----------|--------------------|
| T-10-08-01 (OAuth CSRF) | Authlib-generated/verified `state`; a bad/missing state → 400, no session |
| T-10-08-02 (IDOR) | `require_editor` identity from session only; body slug/discordId never read |
| T-10-08-03 (stale session) | Role re-checked every `require_editor` call + 6h TTL; session cleared on loss |
| T-10-08-04 (open redirect) | Fixed `POST_LOGIN_REDIRECT`; registered redirect URI only |
| T-10-08-05 (secret leak) | Bot token/secret/code never logged or in error bodies; role read uses Bot token server-side |
| T-10-08-06 (non-editor session) | Session issued only after the bot-token role check passes |

## Deviations from Plan
**1. [Rule 3 - Blocking] Fail-fast moved from import-time to lifespan startup**
- **Found during:** Task 2. The plan says "Fail-fast at import/startup if SESSION_SECRET or the OAuth config is empty," but its own verify command runs `from app.main import app` in a dev env where those secrets are empty — an import-time raise would make the verify (and every test import) crash.
- **Fix:** `validate_config()` is called from the FastAPI lifespan startup handler and the `__main__` uvicorn entry, NOT at module import. Import builds the `app` object cleanly; the server refuses to boot with empty secrets. A directly-callable `validate_config()` is unit-tested (empty secret raises, all-set passes).
- **Files:** `../nocturna-bot/app/main.py`, `tests/test_app_auth.py`
- **Commit:** `2509061`

**2. [Rule 2 - Missing critical] normalize_slug fallback for a slug-less username**
- **Found during:** Task 1. `normalize_slug` raises `ValueError` when a username collapses to empty (all punctuation) — an unhandled raise would 500 a legitimate first login.
- **Fix:** `ensure_draft` catches it and falls back to `normalize_slug("editor-<discordId>")`, so first-login always yields a valid, charset-safe slug (Pitfall 5).
- **Files:** `../nocturna-bot/app/auth.py`, `tests/test_app_auth.py`
- **Commit:** `1e3464a` (test), `80ba852` (feat)

**Total:** 2 auto-fixes (1 Rule 3 blocking, 1 Rule 2 hardening). No architectural changes; no schema changes.

## Known Stubs
None. This plan is auth + session + identity only by design (no editing UI); the block-editor save endpoints that consume `require_editor` arrive in 10-09. `POST_LOGIN_REDIRECT="/"` targets the 10-10 dashboard root — a fixed path, not a stub.

## User Setup Required
None for this plan (code + tests only). The `cinema` `.env` still needs real `SESSION_SECRET` + `DISCORD_OAUTH_CLIENT_SECRET` values before the app can serve — tracked for the 10-11 deploy (already documented in `EDITOR_DEPLOY.md`), enforced now by `validate_config()` fail-fast.

## Next Phase Readiness
- 10-09 can mount block-editor save/upload endpoints behind `app.deps.require_editor` and call `github_publish.sync_editors` with the session-scoped identity.
- 10-11 deploy consumes `app.main:app` under uvicorn/systemd + Caddy per `EDITOR_DEPLOY.md`.
- No blockers.

## Self-Check: PASSED
- FOUND: `../nocturna-bot/app/__init__.py`
- FOUND: `../nocturna-bot/app/auth.py`
- FOUND: `../nocturna-bot/app/deps.py`
- FOUND: `../nocturna-bot/app/main.py`
- FOUND: `../nocturna-bot/tests/test_app_auth.py`
- FOUND commit: `1e3464a` (test, RED)
- FOUND commit: `80ba852` (feat, auth.py GREEN)
- FOUND commit: `2509061` (feat, main.py + deps.py)
- VERIFIED: `pytest tests/test_app_auth.py` → 16 passed; full suite 451 passed; `from app.main import app` imports

---
*Phase: 10-editor-profile-pages-carrd-style-template-editor-for-nocturn*
*Completed: 2026-07-15*
