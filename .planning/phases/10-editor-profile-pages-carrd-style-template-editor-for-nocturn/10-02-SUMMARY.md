---
phase: 10-editor-profile-pages-carrd-style-template-editor-for-nocturn
plan: 02
subsystem: api
tags: [pydantic, fastapi, oauth, discriminated-union, url-validation, slug-normalization, nocturna-bot]

# Dependency graph
requires:
  - phase: 10-01
    provides: canonical editors.json entry schema (slug/discordId/published/name/avatar/tagline/links/blocks) this plan's pydantic model mirrors verbatim
provides:
  - core/editors_model.py in nocturna-bot — pydantic v2 EditorPage + 8-type closed block union + https-only link validation (D-16) + slug normalization (Pitfall 5)
  - Pinned admin-app Python deps in nocturna-bot/requirements.txt (fastapi/uvicorn/authlib/python-multipart/jinja2/httpx)
  - nocturna-bot config.py + .env.example editors/OAuth/session settings surface
affects: [10-05 (transport wiring editors.json commit), 10-08 (FastAPI app), 10-09 (save endpoint validation gate)]

# Tech tracking
tech-stack:
  added: ["fastapi==0.139.0", "uvicorn[standard]==0.51.0", "authlib==1.7.2", "python-multipart==0.0.32", "jinja2==3.1.6", "httpx==0.28.1", "pydantic v2 (transitive via fastapi, already present as 2.10.3)"]
  patterns: ["pydantic discriminated union on a `type` Literal field for a closed block schema", "extra=\"forbid\" on every model for closed-schema strictness", "dual URL-safety guards: is_https_url (strict, for user-typed links) vs is_safe_image_ref (relative-path-or-https, for admin-app-written image fields)"]

key-files:
  created:
    - ../nocturna-bot/core/editors_model.py
    - ../nocturna-bot/tests/test_editors_model.py
  modified:
    - ../nocturna-bot/requirements.txt
    - ../nocturna-bot/config.py
    - ../nocturna-bot/.env.example

key-decisions:
  - "Package legitimacy checkpoint (blocking-human gate) approved by user for all 6 pinned PyPI packages before install; starlette/itsdangerous left transitive (FastAPI-resolved) per RESEARCH.md guidance"
  - "Two distinct URL-safety validators: is_https_url (strict https:// only, for user-typed link URLs per D-16) vs is_safe_image_ref (site-relative path OR https://, for avatar/image/portfolio-extra fields which are normally admin-app-written paths per 10-01's schema, not user-typed URLs) — rejects javascript:/data:/http:/vbscript: schemes on both, plus `..` traversal on the relative-path form"
  - "All editors_model.py models use extra=\"forbid\" (not just the block union) — a stray top-level key in a save payload is rejected outright rather than silently ignored"
  - "ROLE_MODERATOR_ID reused verbatim as the editor role in config.py (D-15) — no new ROLE_EDITOR_ID constant added"

requirements-completed: [EDIT-04, EDIT-06]

# Metrics
duration: 20min
completed: 2026-07-14
---

# Phase 10 Plan 02: Backend Foundation — Deps, Config, editors_model.py Summary

**Pinned FastAPI/Authlib/Jinja2 admin-app stack behind an approved package-legitimacy gate, extended nocturna-bot's config/.env with editors+OAuth+session settings, and built a pydantic v2 closed-union EditorPage schema (8 block types, https-only link validation, slug normalization) with 30 passing TDD tests.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-14T22:44:30Z (approx, per STATE.md)
- **Completed:** 2026-07-14T23:02:36Z
- **Tasks:** 3 (1 checkpoint + 2 auto)
- **Files modified:** 5 (2 created, 3 modified) in `../nocturna-bot`

## Accomplishments
- Package legitimacy checkpoint (blocking-human) presented and approved by the coordinator for all 6 new PyPI packages; installed cleanly into the existing bot venv with no conflicts
- `config.py` + `.env.example` now expose `WEBSITE_EDITORS_JSON`, `WEBSITE_EDITORS_IMAGE_DIR`, `DISCORD_OAUTH_CLIENT_ID/SECRET/REDIRECT_URI`, `SESSION_SECRET` (no default, fail-fast), `EDITOR_APP_BASE_URL` — reusing `ROLE_MODERATOR_ID` as the editor role (D-15)
- `core/editors_model.py` ships a pydantic v2 `EditorPage` model with a discriminated union of all 8 UI-SPEC block types (bio/heading/text/links/portfolio/quote/image/divider), https-only URL validation on links (D-16), a scheme+traversal guard on image-like fields, `normalize_slug()` (Pitfall 5), and length caps on every string field (V5)
- Full TDD cycle: 20 RED tests committed first (import-error failure confirmed), then GREEN implementation — 30 tests pass, full bot suite 400/400 (was 360)

## Task Commits

Each task was committed atomically in `../nocturna-bot` (main branch, sequential execution — not this website repo):

1. **Task 1: Package legitimacy gate (blocking-human checkpoint)** - approved by coordinator, no commit (gate only)
2. **Task 2: Pin dependencies + extend config + .env.example** - `1d296c3` (feat)
3. **Task 3: editors_model.py — closed block union + validation (TDD)** - `f6cefdf` (test, RED) → `ab106ed` (feat, GREEN)

**Plan metadata:** this SUMMARY.md + STATE.md/ROADMAP.md update committed in the website repo (this repo), separate from the nocturna-bot commits above.

## Files Created/Modified
- `../nocturna-bot/requirements.txt` - added the 6 pinned admin-app deps under a new "Editores (Fase 10)" section
- `../nocturna-bot/config.py` - added the editors/OAuth/session settings block (7 new constants)
- `../nocturna-bot/.env.example` - documented the same 7 new keys with comments; no real secret values
- `../nocturna-bot/core/editors_model.py` - new module: `Locale`, `LinkItem`, `PortfolioExtraItem`, 8 block models, `Block` discriminated union, `EditorPage`, `is_https_url()`, `is_safe_image_ref()`, `normalize_slug()`
- `../nocturna-bot/tests/test_editors_model.py` - new module: 30 tests covering all task-3 behaviors

## Decisions Made
- Package legitimacy checkpoint approved for all 6 packages (fastapi, uvicorn, authlib, python-multipart, jinja2, httpx) — installed at exact pinned versions; `starlette` (resolved 1.3.1) and `itsdangerous` (resolved 2.2.0) arrived transitively as expected, not independently pinned
- Split image-field validation from link-field validation: the plan's action text describes "a reusable URL validator that accepts only https://", but the 10-01-locked schema documents `avatar`/`image src`/`portfolio extra.image` as site-relative paths (e.g. `/editors/aria/avatar.webp`), not user-typed URLs. Enforcing strict https-only on those fields would reject the legitimate stored form the admin app itself writes. Resolved by adding `is_safe_image_ref()` (site-relative-path-OR-https, rejects dangerous schemes + `..` traversal) alongside the stricter `is_https_url()` used only for actual link URLs (top-level `links[]` and the `links` block's `items[].url`) — both reject `javascript:`/`data:`/`http:`/`vbscript:`, satisfying the plan's acceptance criteria ("a non-https:// URL in any link/image field raises a validation error") without breaking the avatar/image path convention.
- `.env.example` had a pre-existing unrelated uncommitted change (REMINDERS_STAFF_ROLE_IDS/REMINDERS_CATCHUP_GRACE_HOURS values) sitting in the working tree before this plan started. Per instructions, left it completely untouched: staged only the new "Editores" hunk via `git apply --cached` on an isolated patch, verified with `git diff --cached` that the unrelated hunk was excluded, then committed. The unrelated change remains unstaged in the working tree exactly as found.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added a distinct image-path validator instead of applying the strict https-only validator to avatar/image/portfolio-extra fields**
- **Found during:** Task 3 (editors_model.py implementation)
- **Issue:** The plan's action text says "a reusable URL validator that accepts only `https://`" applied across "link/portfolio-extra/image URL" fields, but 10-01's locked interfaces document `avatar`/block `image.src`/`portfolio.extra[].image` as site-relative paths (e.g. `/editors/aria/avatar.webp`) that the admin app itself writes after a Pillow re-encode — never a user-typed URL. A single strict https-only validator would reject every legitimate avatar/image value the system produces.
- **Fix:** Added `is_safe_image_ref()` — allows an empty string, any scheme-less relative path without `..` traversal, or an `https://` URL; rejects `javascript:`/`data:`/`http:`/`vbscript:` and any other explicit scheme. Applied to `EditorPage.avatar`, `ImageBlock.src`, `PortfolioExtraItem.image`. Kept the strict `is_https_url()` (unchanged from the plan's description) for actual link URLs (`LinkItem.url`, used by both top-level `links[]` and the `links` block).
- **Files modified:** `../nocturna-bot/core/editors_model.py`, `../nocturna-bot/tests/test_editors_model.py`
- **Verification:** `test_image_block_src_allows_relative_path`, `test_avatar_allows_relative_path_and_empty_string`, `test_image_field_rejects_path_traversal`, plus the parametrized dangerous-scheme rejection tests for links/portfolio-extra/image — all pass
- **Committed in:** `f6cefdf` (test), `ab106ed` (feat)

**2. [Rule 2 - Missing Critical] `extra="forbid"` on every model, plus a path-traversal check on image-like fields**
- **Found during:** Task 3
- **Issue:** The plan's acceptance criteria focus on the closed block-type union and https URL/slug validation, but did not explicitly call for rejecting stray top-level keys or `../` traversal inside a relative image path — both are cheap, directly-in-scope hardening consistent with the plan's own threat model (T-10-02-01 XSS, T-10-02-03 path traversal) and V5/closed-schema intent.
- **Fix:** Set `model_config = ConfigDict(extra="forbid")` on `Locale`, `LinkItem`, `PortfolioExtraItem`, every block model, and `EditorPage`; added a `".." not in value` check inside `is_safe_image_ref()`'s relative-path branch.
- **Files modified:** `../nocturna-bot/core/editors_model.py`, `../nocturna-bot/tests/test_editors_model.py`
- **Verification:** `test_editor_page_rejects_unknown_top_level_field`, `test_image_field_rejects_path_traversal` pass
- **Committed in:** `f6cefdf` (test), `ab106ed` (feat)

---

**Total deviations:** 2 auto-fixed (both Rule 2 — missing critical functionality / defense-in-depth, directly in-scope of the plan's own V5/D-16/Pitfall-5 requirements)
**Impact on plan:** No scope creep — both additions tighten validation the plan's threat model already calls for; neither changes the locked `editors.json` schema shape from 10-01.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required for this plan. (Discord OAuth2 app registration + reverse-proxy/DNS/cinema deployment prerequisites are tracked separately in 10-03's `EDITOR_DEPLOY.md`.)

## Next Phase Readiness
- `core/editors_model.py` is ready to be imported by the FastAPI app (10-08) and the transport layer (10-05) as the server-side validation gate before any `editors.json` commit
- `config.py`/`.env.example` carry the full settings surface the admin app needs; `SESSION_SECRET`/`DISCORD_OAUTH_CLIENT_SECRET` still need real values populated on the `cinema` host before the app can run (tracked as external config, not a code blocker)
- No blockers for 10-03/10-05/10-08/10-09

## Self-Check: PASSED

- FOUND: `../nocturna-bot/core/editors_model.py`
- FOUND: `../nocturna-bot/tests/test_editors_model.py`
- FOUND: commit `1d296c3` (feat: pin deps + config/.env)
- FOUND: commit `f6cefdf` (test: RED editors_model tests)
- FOUND: commit `ab106ed` (feat: GREEN editors_model implementation)

---
*Phase: 10-editor-profile-pages-carrd-style-template-editor-for-nocturn*
*Completed: 2026-07-14*
