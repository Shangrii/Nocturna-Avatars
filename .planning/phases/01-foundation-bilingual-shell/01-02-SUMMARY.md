---
phase: 01-foundation-bilingual-shell
plan: 02
subsystem: chrome
tags: [astro, i18n, navigation, conversion-cta, discord-modal, localstorage, a11y]

# Dependency graph
requires:
  - 01-01 (BaseLayout chrome-top/chrome-bottom slots, useTranslations helper, brand tokens, root redirect's nocturna-lang contract)
provides:
  - Global chrome on every page via BaseLayout (nav, footer, floating CTA, Discord modal)
  - Fixed nav with localized multi-page links + active-state indicator
  - Path-preserving + remembered language switcher (writes localStorage nocturna-lang)
  - Shared Discord modal opened by any .dc-trigger (single source for the conversion path)
  - Persistent floating "Abrir Ticket" CTA reachable from anywhere (NAV-03)
  - nav.json (es/en) dictionary + dependency-free chrome.ts client behaviors
  - Tokenized chrome.css (nav/switcher/footer/modal/floating-CTA + mobile drawer)
affects:
  - 01-03 (servicios/galeria/terminos shells inherit chrome for free; reuse .dc-trigger)
  - 01-04 (production cutover)
  - 03 (servicios catalog CTAs reuse the shared modal)
  - 04 (galeria CTAs reuse the shared modal)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Global chrome injected via BaseLayout (Nav in chrome-top region; Footer + FloatingCTA + DiscordModal after chrome-bottom slot) so every page inherits it with zero per-page wiring"
    - "Language switcher swaps ONLY the leading locale segment of Astro.url.pathname; never resets to home"
    - "Manual language pick persisted to localStorage('nocturna-lang') as a fixed es/en literal before <a> navigation (matches plan 01 root-redirect read contract; allow-list satisfies T-01-05)"
    - "Single shared Discord modal; any element with .dc-trigger opens it (nav CTA, floating CTA, hero CTA)"
    - "chrome.ts is dependency-free vanilla TS via data-* hooks (data-nav, data-nav-toggle, data-lang-switch, data-dc-overlay, data-dc-dismiss); no GSAP/Lenis (Phase 2)"
    - "chrome.css fully tokenized — no hard-coded brand hex; touch targets reach var(--touch-min)"

key-files:
  created:
    - src/components/Nav.astro
    - src/components/LanguageSwitcher.astro
    - src/components/FloatingCTA.astro
    - src/components/DiscordModal.astro
    - src/components/Footer.astro
    - src/scripts/chrome.ts
    - src/i18n/nav.json
    - src/styles/chrome.css
  modified:
    - src/i18n/ui.ts
    - src/layouts/BaseLayout.astro

key-decisions:
  - "Language switcher computes the other-locale URL purely from the current path (segment swap), so it preserves the page on every future route without per-page config"
  - "Built modal open/close + lang persistence into chrome.ts during Task 1 (rather than splitting across tasks) since both tasks share the one script — avoids re-touching the file"
  - "modalTitle stored as an author-controlled dictionary string with <em> markup and rendered via set:html (static JSON, never untrusted input — T-01-07 accepted)"

patterns-established:
  - "Chrome-via-layout: pages never import nav/footer/CTA/modal; BaseLayout owns them"
  - "data-* attribute hooks decouple chrome.ts from CSS class names and Astro scoping"
  - "External links carry rel='noopener noreferrer' (T-01-06)"

requirements-completed: [I18N-01, NAV-03, PLAT-04]

# Metrics
duration: 21min
completed: 2026-06-28
---

# Phase 1 Plan 02: Global Chrome (Nav, Language Switcher, Conversion Path) Summary

**Global chrome wired once into BaseLayout — a fixed multi-page nav with active state, a path-preserving + remembered ES|EN language switcher, a persistent floating "Abrir Ticket" CTA, a shared Discord modal opened by any `.dc-trigger`, and the footer — so every current and future page inherits the full bilingual navigation and conversion path with zero per-page wiring.**

## Performance

- **Duration:** ~21 min (incl. human-verify pause)
- **Started:** 2026-06-28T16:29:23Z
- **Completed:** 2026-06-28 (human-verify approved as-is)
- **Tasks:** 2 implementation + 1 human-verify checkpoint (approved, no changes requested)
- **Files:** 8 created, 2 modified

## Accomplishments

- Stood up the entire global chrome slice as five shared Astro components plus one client script, all mounted through `BaseLayout` — pages composed in later plans get nav, switcher, footer, floating CTA, and the Discord modal for free.
- **Fixed nav** renders the brand wordmark (links to `/<lang>/`), localized **page** links (`/`, `/servicios`, `/galeria`, `/terminos`) with an active-state indicator computed from `Astro.url.pathname`, the language switcher, and a Discord CTA. Collapses to a hamburger drawer below 768px with ≥44px touch targets (PLAT-04).
- **Language switcher (I18N-01, D-05/D-06):** swaps only the leading locale segment of the current path (`/es/servicios → /en/servicios`; `/es/ → /en/`) so the visitor never loses their place. On click it writes the chosen locale to `localStorage('nocturna-lang')` before navigating, so plan 01's root redirect honors the manual pick.
- **Conversion path everywhere (NAV-03):** a persistent bottom-right floating "Abrir Ticket" pill and the nav Discord CTA both carry `.dc-trigger`; a single shared Discord modal (opened by any trigger) links to `discord.gg/DSMmwU35cs` and closes on dismiss / backdrop / Escape.
- **Footer** carries the brand, Instagram + Discord links, and the localized copyright line.
- `chrome.ts` is dependency-free vanilla TS (no GSAP/Lenis — that's Phase 2), wired through `data-*` hooks; `chrome.css` is fully tokenized (no hard-coded brand hex).

## Task Commits

Each task committed atomically on `revamp`:

1. **Task 1: Nav, path-preserving language switcher, chrome client script** — `7484f2a` (feat)
2. **Task 2: Discord modal, floating CTA, footer wired into BaseLayout** — `35c71ce` (feat)
3. **Progress marker (STATE.md position only, pre-checkpoint)** — `5d2a6b7` (docs)
4. **Task 3: human-verify checkpoint** — APPROVED as-is by the user (no code changes).

**Plan metadata commit:** final docs commit (SUMMARY + STATE + ROADMAP + REQUIREMENTS).

## Files Created/Modified

- `src/components/Nav.astro` — fixed nav: brand → `/<lang>/`, localized page links with active state, `<LanguageSwitcher>`, Discord CTA (`.dc-trigger`), hamburger `.nav-toggle` + drawer. Copy from `nav.json`.
- `src/components/LanguageSwitcher.astro` — `ES | EN`; each option is an `<a>` whose href is the current path with its leading locale segment swapped; carries `data-lang-switch="<target>"` for persistence; active locale `--red`, inactive `--white-dim`; ≥44px options.
- `src/components/FloatingCTA.astro` — fixed bottom-right red pill (`.dc-trigger`), `ctaTicket` label, ≥44px.
- `src/components/DiscordModal.astro` — shared `.dc-overlay` + `.dc-modal`; invite link `discord.gg/DSMmwU35cs` (`target=_blank rel="noopener noreferrer"`); dismiss button; copy from `nav.json`.
- `src/components/Footer.astro` — navy-surface footer: brand, Instagram + Discord links (`rel="noopener noreferrer"`), localized copyright.
- `src/scripts/chrome.ts` — DOM-ready behaviors: `.scrolled` nav state past 60px, hamburger drawer toggle/close-on-link, `nocturna-lang` persistence on lang-switch click (es/en allow-list), Discord modal open/close (trigger/dismiss/backdrop/Escape).
- `src/i18n/nav.json` — `{ es, en }` nav/CTA/modal/footer copy (UI-SPEC Copywriting Contract strings).
- `src/styles/chrome.css` — tokenized nav/switcher/footer/modal/floating-CTA styles + mobile drawer + reduced-motion guard.
- `src/i18n/ui.ts` *(modified)* — registered the `nav` dictionary in the typed loader.
- `src/layouts/BaseLayout.astro` *(modified)* — imports + renders `Nav` (top) and `Footer` + `FloatingCTA` + `DiscordModal` (bottom); loads `chrome.css` and `chrome.ts` once.

## Component API (props)

All chrome components take a single prop `{ lang: 'es' | 'en' }` and read their copy from the `nav` dictionary via `useTranslations(lang, 'nav')`:

- `<Nav lang />` · `<LanguageSwitcher lang />` · `<FloatingCTA lang />` · `<DiscordModal lang />` · `<Footer lang />`

Pages do **not** import these — `BaseLayout` mounts them, so any page rendered through `BaseLayout` inherits the full chrome.

## Language-switch path-swap (how it works)

`LanguageSwitcher` computes the other-locale URL with a pure function of the current path:

1. `Astro.url.pathname` → split on `/`, drop empties.
2. Replace `segments[0]` (the locale, whatever it is) with the target locale.
3. If nothing remains after the locale (bare root like `/es` or `/es/`), the target is `/<target>/`; otherwise rejoin: `/es/servicios` → `/en/servicios`.

This means the switcher preserves the page on **every** route, including pages that don't exist yet (03/04), with no per-page configuration.

## localStorage key contract (shared with plan 01)

- **Key:** `nocturna-lang`
- **Allowed values:** the literals `'es'` and `'en'` only.
- **Writer:** `chrome.ts` writes the chosen locale on a language-switch click, *before* the `<a>` navigation proceeds.
- **Reader:** plan 01's root (`/`) redirect reads it (stored pref > `navigator.language` > default `es`).
- **Trust (T-01-05):** the switcher only ever emits the fixed `es`/`en` literal; the redirect must treat the stored value as untrusted and accept only those two literals, else fall through to detection. No URL is built from the raw stored value.

## Deviations from Plan

None — plan executed exactly as written. (Both implementation tasks built and verified against their automated acceptance checks; the human-verify checkpoint was approved as-is with no code changes requested.)

A minor sequencing choice (not a deviation): the Discord-modal open/close handlers and the language-persistence handler were authored in `chrome.ts` during **Task 1** rather than being added in Task 2, because both tasks share the single client script — building it once avoided re-touching the file. Task 2's `<verify>` (modal markup in built HTML) still gates correctly because the modal **component** lands in Task 2.

## Threat Surface

The plan's `<threat_model>` dispositions were honored:

- **T-01-05 (Tampering, localStorage):** switcher writes only `es`/`en` literals; redirect-side allow-list is plan 01's responsibility (contract documented above).
- **T-01-06 (Info Disclosure, external links):** every external `target="_blank"` link (Discord invite ×2, Instagram) carries `rel="noopener noreferrer"` — verified in built HTML.
- **T-01-07 (DOM/XSS, dictionary copy):** all copy is author-controlled static JSON rendered through Astro auto-escaping; the one `set:html` use (`modalTitle`) renders a static dictionary string with `<em>` emphasis, never untrusted input — accepted.
- **T-01-SC (supply chain):** no new npm packages introduced; `chrome.ts` is dependency-free.

No new threat surface beyond the register.

## Known Stubs

None. All chrome is fully wired and data-backed by the `nav` dictionary; no placeholder/empty data paths were introduced.

## Verification

- `npm run build` exits 0; 3 pages built (`/es/`, `/en/`, `/`).
- `dist/es/index.html`: nav links to `/es/`, `/es/servicios`, `/es/galeria`, `/es/terminos`; switcher EN option → `/en/` (path preserved at root) with `data-lang-switch`; `dc-overlay`, `dc-trigger` (×4: nav, floating, hero, modal), floating CTA "Abrir Ticket", footer Instagram + Discord, invite `discord.gg/DSMmwU35cs`.
- `dist/en/index.html`: floating CTA "Open a Ticket"; modal strings "Open Discord" / "Maybe later" / "Ready to *order*?".
- `chrome.ts`: writes `nocturna-lang`, toggles `.scrolled`, opens/closes `.dc-overlay`.
- Every external `target="_blank"` carries `rel="noopener"`; no unsafe blank links.
- Human-verify checkpoint (nav/switcher/CTA/modal/drawer on the running dev site): **approved as-is**.

## User Setup Required

- **No new setup** introduced by this plan.
- **Carried from 01-01 (still pending the user):** Set GitHub Pages → Source to "GitHub Actions", then **push the `revamp` branch** to trigger deploy, and confirm the custom domain stays bound. **Nothing has been pushed in this plan** — `git push` + Pages cutover remain the user's action.

## Next Phase Readiness

- **Ready for 01-03:** the `/servicios`, `/galeria`, `/terminos` page shells will render through `BaseLayout` and inherit nav, switcher, footer, floating CTA, and the Discord modal automatically. New in-page CTAs only need the `.dc-trigger` class to open the shared modal. The `nav` dictionary + `useTranslations` pattern is established for their copy.
- **Carried blocker:** gallery image storage path (`assets/gallery/` vs `public/gallery/`) still to be finalized (feeds Phase 4 schema / Phase 5 bot).

## Self-Check: PASSED

- All 8 created files + 2 modified files verified present on disk.
- All task commits verified in git history (`7484f2a`, `35c71ce`, `5d2a6b7`).
- `npm run build` exits 0; `dist/{es,en}/index.html` contain the full chrome and pass every automated acceptance check.
- Human-verify checkpoint approved as-is.

---
*Phase: 01-foundation-bilingual-shell*
*Completed: 2026-06-28*
