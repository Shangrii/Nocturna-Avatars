---
phase: 10-editor-profile-pages-carrd-style-template-editor-for-nocturn
plan: 11
subsystem: infra
tags: [systemd, uvicorn, caddy, fastapi, discord-oauth2, deploy, tls, reverse-proxy]

# Dependency graph
requires:
  - phase: 10-08
    provides: FastAPI admin app (app.main:app) + OAuth2 login + role gate + session
  - phase: 10-10
    provides: block editor UI + image upload + save/publish + self-unpublish endpoints
  - phase: 10-09
    provides: cogs.editors role-loss auto-unpublish (on_member_update + polling sweep)
  - phase: 10-03
    provides: confirmed infra facts (subdomain, Client ID, redirect URI, Caddy, members intent)
provides:
  - "systemd unit (nocturna-editor-admin.service) running uvicorn app.main:app on 127.0.0.1:8770 from the shared bot venv"
  - "Caddy reverse-proxy snippet: automatic HTTPS on editors.nocturna-avatars.site → loopback uvicorn + proxy-level rate limits"
  - "Finalized EDITOR_DEPLOY.md §7 with concrete, copy-pasteable install/enable/reload steps for the cinema host"
affects: [editor-profile-pages, cinema-deploy, live-verification]

# Tech tracking
tech-stack:
  added: [systemd unit, Caddy reverse_proxy + caddy-ratelimit]
  patterns:
    - "Sibling systemd unit sharing the bot venv/core/.env but running its own uvicorn process (crash isolation)"
    - "uvicorn loopback-only (127.0.0.1) behind a TLS-terminating reverse proxy (Pitfall 8)"
    - "Secrets live ONLY in the cinema .env via EnvironmentFile — never a literal in any deploy artifact"

key-files:
  created:
    - ../nocturna-bot/deploy/nocturna-editor-admin.service
    - ../nocturna-bot/deploy/Caddyfile.snippet
  modified:
    - ../nocturna-bot/deploy/EDITOR_DEPLOY.md

key-decisions:
  - "uvicorn bound to 127.0.0.1:8770 (matches app/main.py __main__ + the systemd ExecStart + the Caddy reverse_proxy target)"
  - "Rate limiting done at the Caddy proxy layer (caddy-ratelimit plugin), not a new pip dependency — mirrors 10-10's documented choice"
  - "systemd hardening added (NoNewPrivileges, PrivateTmp, ProtectSystem=full, ProtectHome=read-only) since the app writes nothing to local disk (commits over the network)"

patterns-established:
  - "Deploy artifacts live in nocturna-bot/deploy/ (EDITOR_DEPLOY.md is the infra source of truth)"

requirements-completed: []  # EDIT-04/05/06/07 are NOT fully closed until live human verification (Task 2) passes

# Metrics
duration: ~15min (Task 1 only — Task 2/3 pending live human verification)
completed: 2026-07-15 (partial — Task 1 only)
---

# Phase 10 Plan 11: Deploy + Live E2E Verification Summary

**Deploy artifacts shipped for the editor admin app — a sibling systemd unit running uvicorn on 127.0.0.1:8770 in the shared bot venv, a Caddy auto-HTTPS reverse-proxy snippet for `editors.nocturna-avatars.site`, and a finalized `EDITOR_DEPLOY.md` with copy-pasteable cinema install steps. Live end-to-end human verification (Task 2) + its recording (Task 3) remain PENDING — they require real cinema-host + browser + Discord OAuth access this executor cannot perform.**

> **STATUS: PARTIAL — Task 1 done, Task 2 (blocking human-verify) + Task 3 pending.**
> This plan is NOT fully complete. The phase is code-complete and deploy-ready but is
> NOT yet live-verified. Do not mark Phase 10 complete until the human runs the Task 2
> checklist on cinema and signs off (then Task 3 records the outcome).

## Performance

- **Duration:** ~15 min (Task 1 only)
- **Started:** 2026-07-15T09:17:08Z
- **Completed (Task 1):** 2026-07-15 (Task 2/3 pending human action)
- **Tasks:** 1 of 3 complete (Task 2 = blocking human-verify checkpoint; Task 3 depends on it)
- **Files modified:** 3 (all in the sibling `nocturna-bot` repo)

## Accomplishments

- **`deploy/nocturna-editor-admin.service`** — sibling systemd unit: `ExecStart` runs `.../venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8770`, `EnvironmentFile` = the bot `.env` (shares SESSION_SECRET / OAuth secret / GITHUB_PAT / BOT_TOKEN), `Restart=on-failure`, runs as the bot user (`User=YOUR_USER` placeholder to adjust), plus systemd hardening. No secret literals.
- **`deploy/Caddyfile.snippet`** — `editors.nocturna-avatars.site { … reverse_proxy 127.0.0.1:8770 }` with automatic HTTPS (ACME) and proxy-level `rate_limit` on `/login`, `/auth/callback`, and `/editor/*` POSTs (T-10-10-04).
- **`EDITOR_DEPLOY.md` §7** — concrete cinema deploy runbook: git pull + `pip install -r requirements.txt` in the shared venv, the exact `.env` keys to fill (with the confirmed Client ID `1490114146895794246` and redirect URI, secrets as `<placeholders>` only), `systemctl enable --now nocturna-editor-admin`, `caddy validate`+reload, bot restart to load `cogs.editors`, and a prominent post-ship key-rotation step (§6/§7.6).

## Task Commits

1. **Task 1: systemd unit + reverse-proxy config + finalize deploy doc** — `0ae4ff0` (feat) — committed in the `nocturna-bot` repo (branch `main`)
2. **Task 2: Live end-to-end verification** — NOT DONE (blocking human-verify checkpoint; requires real cinema/browser/Discord access — see checklist below)
3. **Task 3: Record live verification** — NOT DONE (depends on Task 2's real outcome)

_All Task 1 files committed to `nocturna-bot`; the pre-existing unrelated `.env.example` change there was left untouched as instructed._

## Files Created/Modified

- `../nocturna-bot/deploy/nocturna-editor-admin.service` (created) — sibling systemd unit for the admin app under uvicorn/loopback.
- `../nocturna-bot/deploy/Caddyfile.snippet` (created) — auto-HTTPS reverse proxy → 127.0.0.1:8770 + rate limits.
- `../nocturna-bot/deploy/EDITOR_DEPLOY.md` (modified) — added §7 concrete deploy runbook; footer updated to point at the artifacts + note the human live verification.

## Task 1 Verification (automated — all PASS)

- `grep uvicorn deploy/nocturna-editor-admin.service` → PASS
- `grep -E "reverse_proxy|proxy_pass" deploy/Caddyfile.snippet` → PASS
- `grep 127.0.0.1 deploy/nocturna-editor-admin.service` → PASS
- No `SECRET=<8+ char literal>` in the service file → PASS
- Secret-literal sweep across all of `deploy/` → clean (no secret values; the `.env` keys in the doc are `<placeholders>`)

## Decisions Made

- **Port 8770** chosen to match `app/main.py`'s `__main__` block (uvicorn.run port) so the systemd unit, the app, and the Caddy `reverse_proxy` target all agree.
- **Rate limiting at the proxy layer** (caddy-ratelimit) rather than adding a pip dependency mid-plan — consistent with 10-10's documented choice; the snippet notes how to remove the blocks if the Caddy build lacks the plugin.
- **systemd hardening** (`NoNewPrivileges`, `PrivateTmp`, `ProtectSystem=full`, `ProtectHome=read-only`) is safe because the app persists nothing to local disk — image optimize is in-memory and publishing commits over the network via `core/github_publish.py`.

## Deviations from Plan

None for Task 1 — the deploy artifacts were written exactly as specified. Tasks 2 and 3 are intentionally NOT executed: Task 2 is a blocking human-verify checkpoint requiring live infrastructure access (SSH to cinema, real secrets, systemctl on the host, a browser + Discord OAuth session) that an automated executor cannot and must not simulate; Task 3 records Task 2's real outcome, so it cannot run first.

## Issues Encountered

- The `nocturna-bot.service` referenced by the bot's README does not exist as a committed file in the repo (it's a documented convention with User/WorkingDirectory placeholders). The new unit follows the same placeholder convention (`User=YOUR_USER`, `/home/YOUR_USER/nocturna-bot`) so the human adjusts three paths to match the actual cinema checkout — exactly as they already do for the bot unit.

## User Setup Required — LIVE VERIFICATION CHECKLIST (Task 2)

**This is the blocking human step. Run it on the cinema host + your browser + Discord. When every step passes, reply "approved"; then Task 3 records the outcome and Phase 10 closes.**

### A. Deploy on cinema (SSH)

```bash
cd ~/nocturna-bot            # your actual checkout path
git pull                     # brings in deploy/nocturna-editor-admin.service + Caddyfile.snippet + EDITOR_DEPLOY.md §7

# venv deps for the admin app (shared bot venv):
source venv/bin/activate && pip install -r requirements.txt && deactivate
```

Fill the admin-app keys in the cinema `.env` (NEVER commit them). Generate a fresh session secret ON the host:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

Then set in `.env`:

```
DISCORD_OAUTH_CLIENT_ID=1490114146895794246
DISCORD_OAUTH_CLIENT_SECRET=<paste from Discord Developer Portal → OAuth2 → General>
DISCORD_OAUTH_REDIRECT_URI=https://editors.nocturna-avatars.site/auth/callback
SESSION_SECRET=<the token_urlsafe(32) you just generated>
EDITOR_APP_BASE_URL=https://editors.nocturna-avatars.site
```

Install + start the service and the proxy:

```bash
sudo cp deploy/nocturna-editor-admin.service /etc/systemd/system/
sudo nano /etc/systemd/system/nocturna-editor-admin.service   # set User= + the 3 paths (WorkingDirectory, venv in ExecStart, EnvironmentFile)
sudo systemctl daemon-reload
sudo systemctl enable --now nocturna-editor-admin
systemctl status nocturna-editor-admin --no-pager
journalctl -u nocturna-editor-admin -n 50 --no-pager
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8770/login   # expect 200

# Caddy (auto-HTTPS). Confirm DNS first: dig +short editors.nocturna-avatars.site  → cinema IP
sudo cp deploy/Caddyfile.snippet /etc/caddy/sites/editors.nocturna-avatars.site.caddy   # or paste into /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
curl -sS -o /dev/null -w "%{http_code}\n" https://editors.nocturna-avatars.site/login   # expect 200 over HTTPS

# Restart the bot so cogs.editors loads + reconnects with the members intent:
sudo systemctl restart nocturna-bot
journalctl -u nocturna-bot -n 50 --no-pager   # confirm cogs.editors loaded, no error
```

> If `caddy validate` fails on `rate_limit`, your Caddy build lacks the `caddy-ratelimit`
> plugin — either delete the two `rate_limit @...` blocks from the snippet (app still runs)
> or rebuild Caddy with `xcaddy build --with github.com/mholt/caddy-ratelimit`.

### B. Full-chain verification (browser + Discord)

1. Visit `https://editors.nocturna-avatars.site` → click "Sign in with Discord" → authorize. As an **EDITOR-role** account you reach the block editor; first login shows the empty-draft state.
2. Add a few blocks (bio, links, portfolio, an image with an upload), reorder them, confirm the **live preview** matches → hit **Publish**.
3. Wait ~a couple minutes for the website deploy, then confirm `https://nocturna-avatars.site/en/editors/<your-slug>` renders your page **and** it appears in `https://nocturna-avatars.site/en/editors`.
4. **Negative path:** log in with a **NON-editor** account → you see the 403 copy, never the editor UI.
5. **Lifecycle — self-unpublish:** in the editor, self-unpublish → after the rebuild the page disappears from the site.
6. **Lifecycle — role loss:** have a mod remove your editor role → the page auto-unpublishes (real-time via `on_member_update` since the members intent is on; else after the hourly sweep).
7. **Portfolio:** confirm an item credited to your slug (store/gallery) shows, and **no NSFW item leaks**.
8. **Transport security:** confirm HTTPS is enforced (no `http://` login) and the session cookie is `Secure`.

### C. Post-ship (mandatory) — rotate secrets

- **Reset** the Discord OAuth Client Secret in the Developer Portal (treat the planning-time value as compromised) and put the new one in the cinema `.env`; revoke the old.
- Confirm `SESSION_SECRET` is a fresh 32+ byte value generated on the host, not shared with any planning artifact.

**Resume signal:** reply **"approved"** once all of B passes (and C is done), or list the failures for gap closure. On approval, Task 3 appends a "Live verification" section to `EDITOR_DEPLOY.md` recording the date + verified chain, and Phase 10 is marked complete.

## Next Phase Readiness

- **Deploy artifacts are ready.** The phase is code-complete and deploy-ready.
- **Blocker (by design):** Phase 10 is NOT complete until the Task 2 checklist above is executed live on cinema and signed off. Requirements EDIT-04/05/06/07 stay open until then. Task 3 (record verification + rotation) runs after approval.

## Self-Check: PASSED

- FOUND: `../nocturna-bot/deploy/nocturna-editor-admin.service`
- FOUND: `../nocturna-bot/deploy/Caddyfile.snippet`
- FOUND: `../nocturna-bot/deploy/EDITOR_DEPLOY.md`
- FOUND: `.planning/phases/10-.../10-11-SUMMARY.md`
- FOUND: commit `0ae4ff0` (Task 1) in the `nocturna-bot` repo

Task 2 (blocking human-verify) + Task 3 intentionally not executed — pending live human verification.

---
*Phase: 10-editor-profile-pages-carrd-style-template-editor-for-nocturn*
*Task 1 completed: 2026-07-15 — Task 2/3 pending live human verification*
