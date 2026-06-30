---
phase: 02-experimental-motion-layer
plan: 04
subsystem: ui
tags: [view-transitions, glitch-wipe, intro, nav-scroll, chrome, clientrouter, accessibility, nav-04]

# Dependency graph
requires:
  - phase: 02-experimental-motion-layer
    plan: 01
    provides: "ClientRouter, lifecycle motion controller (initMotion/teardownMotion), motion-prefs (prefersReduced)"
  - phase: 02-experimental-motion-layer
    plan: 02
    provides: "Hero shader glitch motif the wipe/intro echo (one visual language)"
  - phase: 02-experimental-motion-layer
    plan: 03
    provides: "FloatingCTA pulse keyframe (nocturna-cta-pulse) in choreography.css — confirmed, not re-authored"
provides:
  - "Glitch-wipe page transition (NAV-04/D-17): custom transition:animate on the <main> wrapper, ~0.26s steps()-eased RGB-split red fringe"
  - "First-visit-only skippable glitch intro (D-18): ~1s, pointer-events:none, nocturna-intro-seen flag, initial-load + first-ever-visit + !reduced only"
  - "Nav hide-on-scroll-down / show-on-scroll-up (D-19) via the single shared chrome.ts scroll handler (no double-bind)"
  - "Persistent pulsing Abrir Ticket FloatingCTA confirmed reachable in every motion state (intro / transition / scroll)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Custom Astro view-transition: a typed glitchWipe object ({forwards,backwards}×{old,new}) on <main transition:animate>; nav/footer/CTA sit OUTSIDE <main> so they persist across swaps"
    - "Glitch-wipe @keyframes collapse to a plain opacity fade under prefers-reduced-motion (keyframes redefined inside the media query)"
    - "First-visit gate: module-scope introHandled flag (module evaluates once) limits the intro to the initial astro:page-load, never in-site navigations; localStorage nocturna-intro-seen for first-ever-visit (mirrors nocturna-lang try/catch idiom)"
    - "Intro overlay is pointer-events:none with a window-level pointerdown/keydown skip listener — a tap skips AND still reaches the CTA underneath (never blocks conversion, T-02-CTA)"
    - "Nav hide-on-scroll folded into the existing single passive scroll handler (Pitfall 8 — exactly one 'scroll' listener); top zone always shows, delta threshold de-jitters, equal positions are a no-op"
    - "Intro DOM built via createElement only (no innerHTML/eval — T-02-INJ); no copy string (purely visual glitch bars — no i18n)"

key-files:
  created:
    - src/scripts/motion/transitions.ts
    - src/styles/transitions.css
  modified:
    - src/layouts/BaseLayout.astro
    - src/scripts/motion/index.ts
    - src/scripts/chrome.ts
    - src/styles/chrome.css

key-decisions:
  - "Glitch-wipe lives on a <main> wrapper around the page slot (no <main> existed before — clean landmark); nav/footer/FloatingCTA are siblings so they never wipe and the CTA stays put (T-02-CTA, D-19)"
  - "Intro overlay is pointer-events:none + window-level skip listener — satisfies 'skippable' AND 'never blocks the CTA' simultaneously, which a click-capturing overlay could not"
  - "Intro is purely visual glitch bars (no text) — honors UI-SPEC 'no new copy string' and sidesteps i18n entirely"
  - "Nav hide-on-scroll stays in chrome.ts inside the existing scroll handler (not a new motion module) to guarantee a single listener (Pitfall 8); reduced-motion neutralisation is CSS-side (.nav--hidden→transform:none) so the nav stays visible even if the class toggles"
  - "Plan 03 already shipped the CTA pulse keyframe — confirmed applied + reduced-motion-neutralised, not duplicated (per plan interfaces)"

requirements-completed: [NAV-04]

# Metrics
duration: ~1 session (orchestrator inline finish under executor quota limit)
completed: 2026-06-29
---

# Phase 2 Plan 04: Page Transitions, Intro & Chrome-in-Motion Summary

**The glitch motif's through-line: a quick steps()-eased glitch-wipe page transition (NAV-04/D-17) on the `<main>` wrapper with a red-fringe RGB split that echoes the hero shader, a ~1s first-visit-only skippable glitch intro (D-18) that never blocks the CTA, and the D-19 chrome — nav hide-on-scroll-down/show-on-scroll-up through chrome.ts's single shared scroll handler plus the persistent pulsing Abrir Ticket CTA — so the four glitch surfaces (shader, transition, micro-flicker, intro) read as one language while the conversion path stays reachable in every motion state.**

## Performance

- **Tasks:** 2 (both `type="auto"`)
- **Files:** 6 (2 created, 4 modified)
- **Completed:** 2026-06-29

## Accomplishments

- **Glitch-wipe page transition (Task 1, D-17):** `BaseLayout.astro` wraps the page `<slot />` in `<main transition:animate={glitchWipe}>`. `glitchWipe` is a typed `{forwards,backwards}` object mapping `old → glitch-out` / `new → glitch-in` named animations (~0.26s, `steps(6, end)` easing, 0.04s new-delay). `transitions.css` authors those `@keyframes` as a brief RGB-split with a `--red`/`--red-glow` chromatic fringe (one motif with the hero shader). Nav, footer, and FloatingCTA are siblings of `<main>`, so they persist across navigation and the CTA never wipes.
- **First-visit-only intro (Task 1, D-18):** `transitions.ts` exports `initTransitions()`/`destroyTransitions()`. A module-scope `introHandled` flag (the module evaluates once) limits the intro to the initial `astro:page-load` — never in-site navigations. It plays only when `!prefersReduced` and `localStorage('nocturna-intro-seen')` is unset (try/catch, mirroring the `nocturna-lang` idiom), then sets the flag. The overlay is opaque navy with three glitching bars built via `createElement` (no copy, no `innerHTML`), is `pointer-events:none`, auto-dismisses after ~1s, and is skippable by any window-level tap/key — so a click both skips it and still reaches the CTA underneath. `destroyTransitions()` tears the overlay + listeners down if a swap interrupts it.
- **D-19 nav chrome (Task 2):** Extended chrome.ts's existing passive scroll handler (the 60px `.scrolled` toggle) — the SAME single listener — to also compute scroll direction and toggle `.nav--hidden` (hide on scroll-down past a top zone, show on scroll-up), with a delta threshold and an equal-position no-op. Added the `transform` transition to `.nav` in `chrome.css`; `.nav--hidden { transform: translateY(-100%) }` and its reduced-motion neutralisation live in `transitions.css`.
- **Persistent pulsing CTA (Task 2, D-19):** Confirmed Plan 03's `nocturna-cta-pulse` keyframe is applied to `.floating-cta` and reduced-motion-neutralised — not re-authored. The FloatingCTA is a separate fixed element, untouched by the nav-hide behavior.
- **Lifecycle wiring:** `initTransitions`/`destroyTransitions` hooked into the 02-01 controller's `initMotion`/`teardownMotion`.

## Task Commits

1. **Task 1: Glitch-wipe transition + first-visit intro (D-17/D-18)** — `223ea2e` (feat)
2. **Task 2: Nav hide-on-scroll via single shared handler + persistent CTA (D-19, NAV-04)** — `43551ba` (feat)

## Files Created/Modified

- `src/scripts/motion/transitions.ts` — first-visit intro overlay (createElement bars, pointer-events:none, window-level skip, ~1s auto-dismiss), `nocturna-intro-seen` flag, initial-load gate, full teardown.
- `src/styles/transitions.css` — `glitch-out`/`glitch-in` wipe keyframes (RGB-split red fringe), intro overlay + bar keyframes, `.nav--hidden` transform, and a reduced-motion block collapsing the wipe to a fade + disabling the intro + keeping the nav visible.
- `src/layouts/BaseLayout.astro` — `transitions.css` import, the `glitchWipe` transition object, and the `<main transition:animate>` page wrapper.
- `src/scripts/motion/index.ts` — `initTransitions`/`destroyTransitions` wired into the controller lifecycle.
- `src/scripts/chrome.ts` — nav hide-on-scroll direction logic folded into the existing single passive scroll handler (no second listener).
- `src/styles/chrome.css` — added `transform 0.35s` to the `.nav` transition.

## Decisions Made

- **The glitch-wipe is on a `<main>` wrapper** (none existed before — a clean landmark) so only page content wipes; nav/footer/FloatingCTA persist and the CTA stays clickable across navigations (T-02-CTA, D-19).
- **The intro is `pointer-events:none` with a window-level skip listener** — this is the only arrangement that is simultaneously "skippable by tap" and "never blocks the CTA"; a click-capturing overlay would block conversion for the intro's duration.
- **The intro carries no text** (purely visual glitch bars), honoring UI-SPEC "no new copy string" and avoiding i18n.
- **Nav hide-on-scroll stays in chrome.ts's single scroll handler** (Pitfall 8 — exactly one `scroll` listener); reduced-motion neutralisation is CSS-side so the nav stays visible even if the class toggles.
- **Plan 03's CTA pulse was confirmed, not duplicated**, per the plan's interface note.

## Deviations from Plan

- **None behavioral.** Plan executed as written. **Process note:** the phase's executor model hit a weekly usage limit during Plan 02-03, so Plan 02-04 was executed **inline by the orchestrator** following the plan exactly (read_first files, both task actions, both `<automated>` verify gates, build) rather than via a subagent. No scope changed.

## Verification Performed

- **Task 1 automated gate (all pass):** `transition:animate` in BaseLayout; `nocturna-intro-seen` in transitions.ts; `glitch-out`/`glitch-in` in transitions.css; `prefers-reduced-motion` in transitions.css; `initTransitions` wired in index.ts.
- **Task 2 automated gate (all pass):** `nav--hidden` in chrome.ts; **exactly one** `addEventListener('scroll'` in chrome.ts (Pitfall 8); `nav--hidden`/`floating-cta` in transitions.css.
- **Build:** `npx astro build` succeeds — 12 static pages, CNAME flow unaffected.
- **Built-output checks:** `<main data-astro-transition-scope=...>` present in `dist/es/index.html` (the wipe wrapper is applied); the `glitch-in` keyframe is bundled into the emitted CSS; the FloatingCTA `.dc-trigger` + `.nav` ship in static HTML (CTA outside `<main>` → persists, T-02-CTA).

## Manual Verification Recommended (not automatable here)

- **NAV-04 smoke:** navigate landing → /servicios → back → forward — the glitch-wipe plays each way; Lenis/ScrollTrigger do not leak (Plan 01 teardown); nav + Discord modal still work.
- **Intro smoke:** clear `nocturna-intro-seen` + hard load → ~1s skippable intro; reload → no intro (instant); reduced-motion → no intro; tap during the intro → it skips and the CTA still opens the modal.
- **D-19 smoke:** scroll down → nav hides; scroll up → nav shows; near the top the nav always shows; FloatingCTA stays visible + pulsing + clickable throughout; reduced-motion → nav stays visible.
- **CTA survivability (hard):** during the intro, mid-transition, and mid-scroll the FloatingCTA opens the Discord modal.

## Next Phase Readiness

- NAV-04 is delivered and Phase 2 (the experimental motion layer) is feature-complete: smooth scroll (FX-01), reveals (FX-02), hero shader (FX-03), cursor + choreography (FX-04), and now page transitions + intro + chrome motion (NAV-04). All effects mount/teardown on the one 02-01 controller, gate on reduced-motion / fine-pointer, and preserve the Abrir Ticket conversion path. The recommended manual smokes above are the remaining human-verification items for the phase.

## Threat Surface

No new network endpoints, auth, file access, or schema. The intro overlay is built via `createElement` (no `innerHTML`/`eval`, T-02-INJ) and is `pointer-events:none` so it never blocks the CTA (T-02-CTA); the glitch keyframes are local CSS (no remote fetch). One shared passive scroll handler avoids listener pile-up (T-02-DOS, Pitfall 8); the intro overlay is removed on swap. `nocturna-intro-seen` is a non-sensitive UI boolean (T-02-TAMPER accepted — tampering only re-plays/skips a ~1s cosmetic intro). No threat flags.

## Self-Check: PASSED

Both created files + 4 modified files + this SUMMARY exist on disk; both task commits (`223ea2e`, `43551ba`) found in git history; build emits 12 pages.
