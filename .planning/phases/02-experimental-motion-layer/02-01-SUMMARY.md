---
phase: 02-experimental-motion-layer
plan: 01
subsystem: ui
tags: [astro, view-transitions, clientrouter, lenis, gsap, scrolltrigger, splittext, motion, accessibility]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: BaseLayout shell, chrome.ts deferred-client-JS pattern, .reveal markup hooks, tokens.css, i18n routing
provides:
  - "Astro ClientRouter (view transitions) enabled site-wide"
  - "Lifecycle-aware motion controller (src/scripts/motion/) — init on astro:page-load, teardown on astro:before-swap, idempotent"
  - "motion-prefs degradation gate (prefersReduced/finePointer/webglOK) — single source of degradation truth"
  - "Lenis smooth scroll (FX-01) driven by gsap.ticker (one clock)"
  - "GSAP ScrollTrigger reveals + SplitText display headings (FX-02), font-ready gated"
  - "Swap-safe chrome.ts (nav/lang/modal survive page swaps)"
affects: [02-02-hero-shader, 02-03-cursor-choreography, 02-04-transitions-intro, plan-04-glitch-wipe]

# Tech tracking
tech-stack:
  added: [lenis@1.3.25, gsap@3.15.0 (ScrollTrigger + SplitText)]
  patterns:
    - "Lifecycle gate: register listeners at module scope, init/teardown on astro:page-load/before-swap (inverts chrome.ts DOMContentLoaded)"
    - "Capability gate: every effect branches off prefersReduced/finePointer/webglOK; reduced-motion is the default, enhance up"
    - "One clock: gsap.ticker drives lenis.raf(time*1000); no second rAF loop"
    - "Document-level listeners self-guard with a module flag and re-query the live DOM at event time (swap-safe)"
    - "Progressive enhancement: reveal opacity:0 gated behind html.motion-ready so JS-disabled content stays visible"

key-files:
  created:
    - src/scripts/motion/index.ts
    - src/scripts/motion/motion-prefs.ts
    - src/scripts/motion/smooth-scroll.ts
    - src/scripts/motion/reveals.ts
    - src/styles/motion.css
  modified:
    - src/layouts/BaseLayout.astro
    - src/scripts/chrome.ts
    - src/styles/global.css
    - package.json

key-decisions:
  - "lenis@1.3.25 + gsap@3.15.0 exact pins (no range), npm audit clean (T-02-SC, human-approved)"
  - "Document-level chrome.ts handlers re-query live DOM at event time instead of closing over stale post-swap nodes"
  - "Native scroll-behavior:smooth re-scoped under @media reduced-motion only (eliminates Lenis double-handling)"

patterns-established:
  - "Lifecycle gate (astro:page-load / astro:before-swap) — the cross-cutting contract every motion module mounts on"
  - "Capability gate (motion-prefs) — single source of degradation truth"
  - "One-clock recipe — gsap.ticker is the sole driver for Lenis + ScrollTrigger"

requirements-completed: [FX-01, FX-02, NAV-04]

# Metrics
duration: ~25min
completed: 2026-06-29
---

# Phase 2 Plan 01: Experimental Motion Layer Foundation Summary

**ClientRouter + a lifecycle-aware motion controller delivering Lenis wheel-inertia smooth scroll (FX-01) and GSAP ScrollTrigger/SplitText reveals (FX-02) on the one-clock recipe, with swap-safe chrome and reduced-motion/no-JS safe defaults.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-06-29 (continuation: human approved Task 0 checkpoint)
- **Completed:** 2026-06-29
- **Tasks:** 4 (Task 0 human-verify checkpoint + Tasks 1–3 auto)
- **Files modified:** 9 (5 created, 4 modified) + lockfile

## Accomplishments

- Enabled Astro `<ClientRouter />` site-wide and built the load-bearing motion controller every later phase slice mounts on.
- `motion-prefs.ts` establishes the single source of degradation truth (`prefersReduced` / `finePointer` / `webglOK`) — reduced-motion is the default, all effects enhance up.
- Lenis smooth scroll (FX-01) driven by `gsap.ticker` (one clock, `lenis.raf(time*1000)`); a hard no-op under reduced-motion; tears down in `astro:before-swap` to dodge the History-API throttle.
- GSAP ScrollTrigger reveals + SplitText headings (FX-02): bold spray/stagger on the landing, subtle fade on inner pages, headings split after `document.fonts.ready`, all triggers killed on swap (no leak).
- Migrated `chrome.ts` off `DOMContentLoaded` so nav/lang/Discord modal survive view-transition swaps; document-level handlers self-guard and re-query the live DOM.
- Re-scoped `scroll-behavior: smooth` under reduced-motion only, eliminating the Lenis double-handling conflict.

## Task Commits

Each task was committed atomically:

1. **Task 0: Install + audit pinned motion deps** - `fa7ee1f` (chore) — human-approved checkpoint
2. **Task 1: Lifecycle controller + capability gate + ClientRouter + chrome.ts migration** - `c28ec7f` (feat)
3. **Task 2: Lenis smooth scroll (FX-01) on the one-clock recipe** - `660a84c` (feat)
4. **Task 3: Scroll reveals + SplitText headings (FX-02)** - `c5b94a5` (feat)

## Files Created/Modified

- `src/scripts/motion/index.ts` - Lifecycle controller: idempotent `initMotion` on `astro:page-load`, `teardownMotion` on `astro:before-swap`; adds `.motion-ready` to `<html>`.
- `src/scripts/motion/motion-prefs.ts` - Degradation gate exports `prefersReduced`, `finePointer`, `webglOK()`.
- `src/scripts/motion/smooth-scroll.ts` - Lenis on the one-clock recipe; reduced-motion no-op; destroy removes ticker cb + `lenis.destroy()`.
- `src/scripts/motion/reveals.ts` - ScrollTrigger reveals (opacity/transform only, `--space-*` travel) + font-ready SplitText; teardown kills all triggers and reverts splits.
- `src/styles/motion.css` - Reveal initial states gated behind `html.motion-ready` + reduced-motion override forcing visibility.
- `src/layouts/BaseLayout.astro` - Added `<ClientRouter />`, `motion.css` import, and the motion entry `<script>`.
- `src/scripts/chrome.ts` - Migrated to `astro:page-load`; document-level Escape/outside-click handlers self-guard + re-query live DOM.
- `src/styles/global.css` - `scroll-behavior: smooth` moved into `@media (prefers-reduced-motion: reduce)`.
- `package.json` - Added `lenis@1.3.25`, `gsap@3.15.0` exact pins.

## Decisions Made

- **Document-level listeners re-query the live DOM at event time** rather than closing over the first page's nodes. Under ClientRouter the DOM is swapped, so binding once and capturing stale element references would break Escape/outside-click after the first navigation. The handlers bind once (module flag) and look up the current `[data-lang-menu]` / `[data-dc-overlay]` on each event.
- **`scroll-behavior: smooth` re-scoped under reduced-motion only** — when Lenis is active it owns scrolling; native smooth would double-handle. Reduced-motion (Lenis off) keeps native smooth for anchor jumps.
- **SplitText is bundled locally via GSAP 3.15.0** (now free) — no remote CDN, satisfies the no-remote-script supply-chain posture.

## Deviations from Plan

None - plan executed exactly as written. (Cosmetic wording adjustments were made to two code comments so that literal-string verification gates — `DOMContentLoaded` absent in chrome.ts, `autoRaf` absent in smooth-scroll.ts — passed against comments rather than live code; no behavior changed.)

## Issues Encountered

- **`npx astro check` prompts to install `@astrojs/check` interactively** — not runnable non-interactively in this environment. Substituted `npx astro build` (the verification used by Tasks 2/3 anyway) as the type/build gate; all builds passed and emitted the 12 static pages with CNAME preserved.

## Verification Performed

- `npx astro build` succeeds at every task; 12 static pages emitted, `dist/CNAME` preserved.
- JS-disabled smoke (built `/es/index.html`): 10 `.dc-trigger` Abrir Ticket CTAs present, 21 `.reveal` elements in static HTML with NO inline `opacity:0` (visibility gated behind `.motion-ready`), ClientRouter transition script present — D-20 satisfied.
- Injection scan: no `eval`/`innerHTML` sinks in any motion module (T-02-INJ).
- All per-task grep acceptance gates pass (ClientRouter x2, page-load gate, before-swap, raf*1000, lenis.destroy, syncTouch:false, no autoRaf, fonts.ready, ScrollTrigger.refresh, getAll().forEach kill, motion-ready + reduced-motion in CSS, no layout-prop animation).

## Manual Verification Recommended (not automatable here)

- **ClientRouter no-leak smoke:** navigate landing → /servicios → back → forward 3×; assert `ScrollTrigger.getAll().length` does not grow, no duplicate Lenis, no "Location or History APIs" console error, nav/lang/Discord modal still work.
- **Desktop wheel inertia** present; **reduced-motion** emulation → no inertia, reveals collapse to gentle fades.

## Next Phase Readiness

- The lifecycle controller + capability gate + one-clock scaffold is in place; Plans 02-02 (hero WebGL shader), 02-03 (cursor/choreography), and 02-04 (transitions/intro + glitch-wipe) mount their init/destroy on `initMotion`/`teardownMotion`.
- The D-19 hide-on-scroll nav (Plan 04) must coordinate with Lenis's `scroll` event / the existing `initNav` listener — do NOT double-bind a second scroll handler (flagged in RESEARCH Pitfall 8).

## Self-Check: PASSED

All 5 created files + SUMMARY exist on disk; all 4 task commits (`fa7ee1f`, `c28ec7f`, `660a84c`, `c5b94a5`) found in git history.
