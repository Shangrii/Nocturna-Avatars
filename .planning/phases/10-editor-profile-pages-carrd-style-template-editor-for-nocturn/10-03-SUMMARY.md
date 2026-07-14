---
phase: 10-editor-profile-pages-carrd-style-template-editor-for-nocturn
plan: 03
subsystem: infra-deploy
status: BLOCKED — awaiting human action (checkpoint)
tags: [infra, oauth2, dns, tls, reverse-proxy, discord, deploy-notes]
dependency_graph:
  requires:
    - "nocturna-bot repo (deploy/ notes convention, JINXXY_DEPLOY.md precedent)"
    - "10-02 config keys (DISCORD_OAUTH_*/SESSION_SECRET/EDITOR_APP_BASE_URL) — in-flight in bot working tree"
  provides:
    - "deploy/EDITOR_DEPLOY.md — infra prerequisites source of truth for 10-11 deploy"
  affects:
    - "10-09 (D-10 role-loss mechanism depends on members-intent status — still TODO)"
    - "10-11 (final deploy consumes confirmed OAuth/DNS/proxy values — still TODO)"
tech-stack:
  added: []
  patterns:
    - "deploy notes mirror JINXXY_DEPLOY.md (Spanish, cinema host, secret-rotation section)"
key-files:
  created:
    - "../nocturna-bot/deploy/EDITOR_DEPLOY.md"
  modified: []
decisions:
  - "Deploy notes live at ../nocturna-bot/deploy/EDITOR_DEPLOY.md (plan-specified path; JINXXY_DEPLOY.md is at repo root, but the plan pins the deploy/ subdir for the new doc)"
  - "Redirect URI documented as the fixed callback path ${EDITOR_APP_BASE_URL}/auth/callback — no arbitrary post-login redirect (Pitfall 4)"
  - "Secrets (OAuth client secret, SESSION_SECRET) documented as cinema .env-only, never committed; prominent rotation section mirrors the Phase 9 Jinxxy-key note"
metrics:
  duration: ~15min
  completed: "PARTIAL — 2026-07-14"
  tasks_completed: 1
  tasks_total: 4
---

# Phase 10 Plan 03: Infra Prerequisites (OAuth + DNS/TLS + members intent) Summary

**One-liner:** Scaffolded `EDITOR_DEPLOY.md` as the infra source-of-truth for the editor admin app, then reached a blocking human-action checkpoint for the two non-automatable prerequisites (Discord OAuth2 app + DNS/reverse-proxy/TLS on cinema) plus the `members` privileged-intent status.

## What Got Done

### Task 1 (auto) — COMPLETE
Created `../nocturna-bot/deploy/EDITOR_DEPLOY.md` modeled on the existing `JINXXY_DEPLOY.md` format (Spanish, cinema-host manual deploy guide). All six required sections present, with confirmed-value fields left as explicit `TODO` placeholders for Tasks 2–4:

1. **Discord OAuth2 app** — reuse the existing bot application (D-15); obtain Client ID / reset Client Secret; register the **exact fixed** redirect URI `${EDITOR_APP_BASE_URL}/auth/callback` (Pitfall 4, no arbitrary post-login redirect); `identify` scope only (role check is server-side via bot token).
2. **DNS subdomain** — proposed `editors.nocturna-avatars.site` → A/AAAA record to the cinema host IP.
3. **Reverse proxy + automatic HTTPS** — Caddy preferred / nginx+certbot acceptable, fronting uvicorn bound to `127.0.0.1` (Pitfall 8); `Secure`+`SameSite=Lax` cookies.
4. **`.env` keys to fill on cinema** — `DISCORD_OAUTH_CLIENT_ID/SECRET/REDIRECT_URI`, `SESSION_SECRET` (32+ random bytes), `EDITOR_APP_BASE_URL`; plus the reused-and-live keys (`GITHUB_PAT`, `WEBSITE_REPO`, `WEBSITE_BRANCH`, `BOT_TOKEN`) that must not be re-committed.
5. **`members` gateway-intent status field** (Yes/No) with the resulting D-10 mechanism note (real-time `on_member_update` if Yes, periodic polling sweep if No).
6. **Prominent secret-rotation reminder** — any secret pasted during planning must be rotated/reset after ship (mirrors the Phase 9 Jinxxy-key note and the Phase 5 `GITHUB_PAT` regime).

Verification passed (`test -f` + `grep 'redirect URI'` + `grep 'rotation/rotación'`).
Committed to the `nocturna-bot` repo (branch `main`) as a normal hook-run commit scoped to the single file.

### Task 2 (checkpoint:human-action, blocking) — NOT STARTED (awaiting human)
Create/register the Discord OAuth2 application. Developer-Portal-only; no CLI/API path. Requires the user to reveal/reset the Client Secret and register the redirect URI.

### Task 3 (checkpoint:human-verify, blocking) — NOT STARTED (awaiting human)
Confirm DNS subdomain control, reverse-proxy/TLS availability on cinema, and whether the bot's `members` privileged gateway intent is enabled (drives the D-10 mechanism).

### Task 4 (auto) — BLOCKED on Tasks 2–3
Record the confirmed values (redirect URI, subdomain, proxy, members-intent Yes/No + D-10 note) into the `EDITOR_DEPLOY.md` TODO placeholders. Cannot run until the human supplies Task 2–3 values.

## Checkpoint Reached — Human Action Required

This plan is `autonomous: false`. Tasks 2 and 3 are hard, human-only infrastructure gates. **No values were fabricated or guessed.** The specifics the user must provide are listed in the completion/checkpoint output.

## Deviations from Plan

None. Task 1 executed exactly as written.

**Observation (not a deviation):** the `nocturna-bot` working tree has uncommitted changes to `config.py`, `requirements.txt`, and `.env.example` — these belong to the parallel Wave-1 plan **10-02** (they add exactly the `DISCORD_OAUTH_*` / `SESSION_SECRET` / `EDITOR_APP_BASE_URL` keys this deploy doc references). They were left untouched per orchestrator instruction; my commit staged only `deploy/EDITOR_DEPLOY.md`.

## Known Stubs

The confirmed-value fields in `EDITOR_DEPLOY.md` (§1 Client ID + redirect URI, §2 subdomain + DNS, §3 proxy + HTTPS + bind, §5 members intent + D-10 mechanism) are intentional `TODO` placeholders that Task 4 fills once the human resolves Tasks 2–3. This is by design — the plan splits scaffold (Task 1) from human-confirmed values (Tasks 2–4).

## Self-Check: PASSED

- FOUND: `../nocturna-bot/deploy/EDITOR_DEPLOY.md`
- FOUND commit: `5872257` (nocturna-bot, branch main)
- FOUND: `.planning/phases/10-editor-profile-pages-carrd-style-template-editor-for-nocturn/10-03-SUMMARY.md`
