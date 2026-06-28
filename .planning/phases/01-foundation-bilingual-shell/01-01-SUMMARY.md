---
phase: 01-foundation-bilingual-shell
plan: 01
subsystem: infra
tags: [astro, i18n, github-pages, static-site, css-tokens, typescript]

# Dependency graph
requires: []
provides:
  - Buildable Astro 7 static site on the revamp branch (output: static)
  - i18n routing with es/en prefixed locales, ES default (prefixDefaultLocale)
  - Centralized brand design tokens (CSS custom properties, PLAT-03)
  - BaseLayout.astro shell with chrome slots for Plan 02 (nav/footer/floating CTA)
  - Per-language JSON dictionary system + typed useTranslations helper
  - Localized landing hero (/es/, /en/) rendered from dictionaries
  - Root / client-side browser-language redirect (D-04/D-05/D-03)
  - GitHub Actions least-privilege Pages deploy workflow (revamp branch)
  - public/CNAME preserving nocturna-avatars.site through the static cutover
affects:
  - 01-02 (global chrome: nav, lang switcher, footer, floating CTA, Discord modal)
  - 01-03 (servicios/galeria/terminos shells)
  - 01-04 (production cutover)
  - phase-2 (motion layer mounts over the static hero-bg; reveal hooks present)

# Tech tracking
tech-stack:
  added: [astro@7.0.3]
  patterns:
    - "Design tokens as :root CSS custom properties; no hard-coded brand hex in components"
    - "i18n via { es, en } JSON dictionaries + typed useTranslations(lang, dict) helper"
    - "Prefixed-locale routing with a client-side root redirect (GitHub Pages = no server)"
    - "Static assets under public/ (Astro public convention chosen over src/assets)"
    - "Chrome injected via named layout slots so later plans extend without editing the slot"

key-files:
  created:
    - astro.config.mjs
    - package.json
    - tsconfig.json
    - .gitignore
    - public/CNAME
    - public/favicon.png
    - public/fonts/a-another-tag.ttf
    - src/styles/tokens.css
    - src/styles/global.css
    - src/i18n/ui.ts
    - src/i18n/common.json
    - src/i18n/home.json
    - src/layouts/BaseLayout.astro
    - src/pages/[lang]/index.astro
    - src/pages/index.astro
    - .github/workflows/deploy.yml
  modified: []

key-decisions:
  - "Pinned Astro 7.0.3 (not 5.x) — the only npm-audit-clean version; satisfies T-01-SC"
  - "Static assets under public/ (Astro public convention)"
  - "i18n content as { es, en } JSON dictionaries (not Astro content collections) — simplest for short marketing copy"
  - "Root redirect is client-side JS (GitHub Pages serves static files; no request headers at runtime)"

patterns-established:
  - "Tokens-first CSS: every component reads var(--token); tokens.css is the only place brand hex lives"
  - "Dictionary-driven copy: components import useTranslations; no UI string literals in pages"
  - "Layout chrome slots: BaseLayout exposes chrome-top/chrome-bottom for later plans"

requirements-completed: [PLAT-01, PLAT-02, PLAT-03, I18N-01, I18N-02, I18N-03]

# Metrics
duration: 16min
completed: 2026-06-28
---

# Phase 1 Plan 01: Foundation Walking-Skeleton Summary

**Astro 7 static site on the `revamp` branch with es/en prefixed i18n routing, centralized brand tokens, a dictionary-driven bilingual landing hero, a client-side root language redirect, and a least-privilege GitHub Actions Pages deploy — building to a deployable `dist/` with the CNAME preserved.**

## Performance

- **Duration:** ~16 min
- **Started:** 2026-06-28T11:58:04Z
- **Completed:** 2026-06-28T12:14:55Z
- **Tasks:** 2 implementation + 1 human-verify checkpoint (approved)
- **Files created:** 16 (project + src) / 17 changed total incl. polish

## Accomplishments

- Stood up the thinnest deployable end-to-end slice: Astro build → i18n routing → real bilingual hero content → static output → Pages-ready `dist/` with CNAME.
- Both `/es/` and `/en/` heroes render the migrated + polished copy entirely from per-language dictionaries (no literals in the component).
- Root `/` performs browser-language detection (stored pref > `navigator.language`) and redirects to `/es/` or `/en/`, with a `<noscript>` ES fallback.
- Centralized the entire brand design system as `:root` tokens (colors, fonts, 8pt spacing scale, fluid type scale); no component hard-codes brand hex.
- Fixed the locked `cabezar → cabeza` typo (D-11) at the dictionary level.
- Least-privilege deploy workflow (`contents: read`, `pages: write`, `id-token: write`) scoped to the `revamp` branch only.

## Task Commits

Each task was committed atomically on `revamp`:

1. **Task 1: Scaffold Astro project, i18n config, design tokens, deploy workflow** — `52ffe16` (feat)
2. **Task 2: Base layout, i18n dictionaries, root redirect, localized hero** — `a656c06` (feat)
3. **Progress marker (STATE.md, position only)** — `ae86173` (docs)
4. **Checkpoint-approval polish: scale down hero wordmark** — `221d1f0` (style)

**Plan metadata commit:** see final docs commit (SUMMARY + STATE + ROADMAP).

## Files Created/Modified

- `astro.config.mjs` — site URL + i18n (es/en, defaultLocale es, prefixDefaultLocale); `defineConfig` from `astro/config`.
- `package.json` / `package-lock.json` — exact-pinned `astro@7.0.3`; dev/build/preview scripts; lockfile committed.
- `tsconfig.json` — extends `astro/tsconfigs/strict`.
- `.gitignore` — `node_modules/`, `dist/`, `.astro/`, env, editor cruft.
- `public/CNAME` — `nocturna-avatars.site` (emitted to `dist/` every build, PLAT-02).
- `public/favicon.png`, `public/fonts/a-another-tag.ttf` — static assets in Astro's public convention.
- `src/styles/tokens.css` — brand tokens (PLAT-03): colors, fonts (`--font-tag`), 8pt spacing, fluid type scale.
- `src/styles/global.css` — reset, base body, film-grain `body::after`, local `@font-face` (`.ttf` only).
- `src/i18n/ui.ts` — `languages`, `defaultLang`, `langCodes`, `toLang`, typed `useTranslations(lang, dict)`.
- `src/i18n/common.json`, `src/i18n/home.json` — `{ es, en }` dictionaries; hero copy in home.json.
- `src/layouts/BaseLayout.astro` — head/fonts/favicon/global styles + `chrome-top`/`chrome-bottom` slots.
- `src/pages/[lang]/index.astro` — `getStaticPaths` (es+en); dictionary-driven hero; ported hero styles, tokenized.
- `src/pages/index.astro` — client-side language-detection redirect + `<noscript>` ES meta-refresh.
- `.github/workflows/deploy.yml` — `withastro/action@v6` build + `actions/deploy-pages@v5`, least-privilege, revamp branch.

## Decisions Made

- **Static assets in `public/`** (Astro public convention) over `src/assets` — assets are referenced by absolute path and emitted verbatim, which the CNAME/favicon/font require. (Resolves the Claude's-Discretion item; the gallery image-path decision remains for Phase 4.)
- **i18n as `{ es, en }` JSON dictionaries** (not content collections) — marketing copy is short and flat; a typed loader keeps it simple and type-safe.
- **Root redirect is client-side** — GitHub Pages serves static files with no runtime request headers, so detection must run in the browser.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Security] Astro pinned to 7.0.3 instead of 5.x (T-01-SC)**
- **Found during:** Task 1 (`npm install`)
- **Issue:** The plan pinned "Astro 5.x". Installing the latest 5.x (`5.18.2`) surfaced a **high-severity** npm advisory chain affecting `astro <= 7.0.0-beta.6` (XSS via `define:vars` incomplete `</script>` sanitization, reflected XSS via unescaped slot name, XSS via unescaped spread-prop attribute names, server-island encrypted-param replay, host-header SSRF in the prerendered error page) plus an esbuild dev-server file-read advisory. `npm audit` reported the only remediation as `astro@7.0.3`.
- **Fix:** Bumped the exact pin to `astro@7.0.3` and regenerated `package-lock.json`. This directly satisfies threat-register **T-01-SC** ("pin a clean, non-vulnerable version"). The i18n + static-output API this plan uses is unchanged in Astro 7; Node 24.13 satisfies Astro 7's `engines.node >=22.12.0`.
- **Follow-on (Rule 3):** Astro 7 no longer exports `defineConfig` from `astro` — moved the import to `astro/config`.
- **Files modified:** `package.json`, `package-lock.json`, `astro.config.mjs`
- **Verification:** `npm audit` → **0 vulnerabilities**; `npm run build` exits 0 (output `static`, 3 pages).
- **Committed in:** `52ffe16` (part of Task 1)

**2. [Checkpoint polish] Hero wordmark scaled down**
- **Found during:** human-verify checkpoint (user-requested visual fix, approved)
- **Issue:** The "NOCTURNA" wordmark rendered too large.
- **Fix:** Stepped `--type-display` down ~18%: `clamp(56px, 14vw, 300px)` → `clamp(46px, 11.5vw, 240px)`. Responsive clamp scaling, brand font, and 12px letter-spacing all preserved.
- **Files modified:** `src/styles/tokens.css`
- **Verification:** `npm run build` exits 0; new clamp value present in bundled CSS; hero still renders wordmark + tagline.
- **Committed in:** `221d1f0`

---

**Total deviations:** 2 (1 Rule 2 security auto-fix + 1 Rule 3 follow-on import; 1 approved checkpoint polish)
**Impact on plan:** The security bump is required for correctness/supply-chain integrity and is API-compatible with the plan's design — no scope creep. The wordmark tweak is a cosmetic refinement of an existing token.

## Issues Encountered

- `npx astro check` prompts to install `@astrojs/check` interactively. Skipped per the package-install policy — `npm run build` already type-checks `.astro` files under TS strict mode and renders every route, so type safety is covered without adding the optional dependency.
- Git emits LF→CRLF warnings on Windows (informational; content unaffected, including the 22-byte CNAME).

## User Setup Required

**GitHub Pages cutover is pending the user (NOT yet done):**
- **Set Pages → Build and deployment → Source to "GitHub Actions"** (currently "Deploy from a branch"). Until this is set, the `deploy.yml` workflow cannot publish.
  - Location: GitHub repo → Settings → Pages → Build and deployment → Source
- **Push the `revamp` branch** to trigger the deploy workflow. The four plan commits are local-only — **the user has NOT pushed**. (Executor intentionally did not push; push + deploy verification is the user's action.)
- **Confirm the custom domain** `nocturna-avatars.site` remains bound under Settings → Pages after the first Actions deploy (`public/CNAME` reasserts it every build; this is the T-01-02 mitigation to verify).

## Next Phase Readiness

- **Ready for 01-02:** `BaseLayout.astro` exposes `chrome-top`/`chrome-bottom` slots for the nav, language switcher, footer, persistent floating CTA, and shared Discord modal. `dc-trigger` hooks are already present on the hero primary CTA. The i18n dictionary pattern + `useTranslations` helper are established for new copy.
- **Carried blocker:** Image storage path (`assets/gallery/` vs `public/gallery/`) — Phase 1 picked the Astro `public/` convention for static assets generally; the gallery-specific path is still finalized in Phase 4.
- **Open user action:** Pages Source cutover + push (above) before the preview URL serves the hero.

## Self-Check: PASSED

- All 16 created files verified present on disk.
- All task/polish commits verified in git history (`52ffe16`, `a656c06`, `221d1f0`).
- `npm run build` exits 0; `dist/` contains `index.html`, `es/index.html`, `en/index.html`, `CNAME`.
- `npm audit`: 0 vulnerabilities.

---
*Phase: 01-foundation-bilingual-shell*
*Completed: 2026-06-28*
