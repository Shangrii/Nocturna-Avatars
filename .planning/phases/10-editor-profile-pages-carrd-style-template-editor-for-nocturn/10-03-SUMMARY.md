---
phase: 10-editor-profile-pages-carrd-style-template-editor-for-nocturn
plan: 03
subsystem: infra-deploy
status: COMPLETE
tags: [infra, oauth2, dns, tls, reverse-proxy, discord, deploy-notes]
dependency_graph:
  requires:
    - "nocturna-bot repo (deploy/ notes convention, JINXXY_DEPLOY.md precedent)"
    - "10-02 config keys (DISCORD_OAUTH_*/SESSION_SECRET/EDITOR_APP_BASE_URL) — in-flight in bot working tree"
  provides:
    - "deploy/EDITOR_DEPLOY.md — confirmed infra facts, source of truth for the 10-11 deploy"
  affects:
    - "10-09 (D-10 role-loss mechanism: on_member_update real-time PRIMARY + polling sweep as backstop — members intent confirmed enabled)"
    - "10-11 (final deploy consumes the confirmed OAuth Client ID/redirect URI, subdomain, Caddy proxy)"
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
  - "Redirect URI documented as the fixed callback path ${EDITOR_APP_BASE_URL}/auth/callback — no arbitrary post-login redirect (Pitfall 4); registered value confirmed https://editors.nocturna-avatars.site/auth/callback"
  - "OAuth2 app reuses the existing bot application (D-15) — Client ID 1490114146895794246 confirmed; Client Secret deliberately NOT recorded in the repo, deferred to cinema .env at 10-11"
  - "Subdomain confirmed: editors.nocturna-avatars.site; reverse proxy confirmed: Caddy (automatic HTTPS)"
  - "members privileged gateway intent confirmed ENABLED — D-10 role-loss mechanism is on_member_update (real-time) as PRIMARY, with the 10-09 polling sweep retained as a backstop (per the plan's original dual-mechanism design), not a fallback-only path"
  - "Secrets (OAuth client secret, SESSION_SECRET) documented as cinema .env-only, never committed; prominent rotation section mirrors the Phase 9 Jinxxy-key note"
metrics:
  duration: ~25min (across the human-action checkpoint round-trip)
  completed: "2026-07-14"
  tasks_completed: 4
  tasks_total: 4
---

# Phase 10 Plan 03: Infra Prerequisites (OAuth + DNS/TLS + members intent) Summary

**One-liner:** Resolved and documented all three human-only infra prerequisites — Discord OAuth2 app (Client ID + registered redirect URI), DNS subdomain + Caddy reverse proxy/TLS on cinema, and the `members` gateway intent (confirmed enabled, unlocking real-time role-loss detection) — in `EDITOR_DEPLOY.md`, the source of truth for the 10-11 deploy plan.

## What Got Done

### Task 1 (auto) — COMPLETE
Created `../nocturna-bot/deploy/EDITOR_DEPLOY.md` modeled on the existing `JINXXY_DEPLOY.md` format (Spanish, cinema-host manual deploy guide). All six sections scaffolded with TODO placeholders for the human-confirmed values.

### Task 2 (checkpoint:human-action, blocking) — COMPLETE
User registered the Discord OAuth2 app (reusing the existing bot application per D-15) and confirmed:
- **Client ID:** `1490114146895794246`
- **Redirect URI:** `https://editors.nocturna-avatars.site/auth/callback` — registered in the Developer Portal under OAuth2 → Redirects, exact fixed callback path (Pitfall 4).
- Client Secret intentionally withheld from this session — will be set directly in the cinema `.env` at 10-11 deploy time (never committed).

### Task 3 (checkpoint:human-verify, blocking) — COMPLETE
User confirmed:
- **Subdomain:** `editors.nocturna-avatars.site`
- **Reverse proxy:** Caddy (automatic HTTPS)
- **`members` privileged gateway intent:** **enabled (Yes)**

This resolves Assumption A5 favorably — the D-10 role-loss mechanism is **`on_member_update`** in real time as the **primary** path, with the 10-09 polling sweep retained as a backstop (the plan's original design already builds both; the intent-enabled outcome just confirms which one leads).

### Task 4 (auto) — COMPLETE
Filled all TODO placeholders in `EDITOR_DEPLOY.md` with the confirmed values from Tasks 2–3:
- §1 OAuth2 app: Client ID + registered redirect URI recorded; Client Secret explicitly marked as NOT written here, deferred to the cinema `.env` at 10-11.
- §2 DNS subdomain: `editors.nocturna-avatars.site` confirmed.
- §3 Reverse proxy: Caddy (automatic HTTPS) confirmed.
- §5 `members` intent: **Sí** — with the resulting D-10 mechanism note (`on_member_update` primary + polling backstop).
- §6 Secret-rotation reminder unchanged (still applies to the Client Secret + `SESSION_SECRET` once set on cinema).

Verification passed: `grep -qi 'members.*intent' EDITOR_DEPLOY.md && ! grep -Eq 'CLIENT_SECRET *= *[A-Za-z0-9]' EDITOR_DEPLOY.md` — the confirmed-values table required an explicit "members intent" phrasing to satisfy the exact plan-specified grep pattern; added as a bilingual parenthetical on the table row without changing the Spanish-first prose elsewhere. No secret literal exists anywhere in the file.

Committed to the `nocturna-bot` repo (branch `main`) as a normal hook-run commit scoped to the single file.

## Result

The two hard, human-only infrastructure prerequisites (OAuth2 app + DNS/reverse-proxy/TLS) are resolved and documented, and the D-10 mechanism is decided (on_member_update primary + polling backstop). 10-08/10-09/10-11 can proceed without external blockers — `EDITOR_DEPLOY.md` is the confirmed-facts source of truth for the 10-11 deploy.

## Deviations from Plan

**1. [Rule 1 - minor fix] Grep-pattern word-order mismatch in Task 4 verification**
- **Found during:** Task 4 automated verification.
- **Issue:** The plan's exact verify command `grep -qi 'members.*intent'` requires "members" to appear before "intent" on the same line. The scaffold's Spanish prose used "Intent `members`" (intent-then-members word order throughout), which never satisfied that pattern.
- **Fix:** Added a small bilingual parenthetical `(members intent)` to the confirmed-values table row for that field, satisfying the grep pattern without altering the Spanish-first document voice elsewhere.
- **Files modified:** `../nocturna-bot/deploy/EDITOR_DEPLOY.md`
- **Commit:** `b51ef98`

## Known Stubs

None remaining. All confirmed-value fields in `EDITOR_DEPLOY.md` are filled. The Client Secret and `SESSION_SECRET` are intentionally absent from the repo by design (cinema `.env`-only, filled at 10-11 deploy) — this is documented in the file itself (§1, §4, §6), not an unresolved stub.

## Self-Check: PASSED

- FOUND: `../nocturna-bot/deploy/EDITOR_DEPLOY.md`
- FOUND commit: `5872257` (nocturna-bot, branch main — Task 1 scaffold)
- FOUND commit: `b51ef98` (nocturna-bot, branch main — Task 4 confirmed values)
- FOUND: `.planning/phases/10-editor-profile-pages-carrd-style-template-editor-for-nocturn/10-03-SUMMARY.md`
