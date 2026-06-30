---
phase: 02-experimental-motion-layer
plan: 03
subsystem: ui
tags: [cursor, magnetism, micro-interactions, choreography, marquee, tilt, parallax, scrolltrigger, accessibility, fx-04]

# Dependency graph
requires:
  - phase: 02-experimental-motion-layer
    plan: 01
    provides: "Lifecycle motion controller (initMotion/teardownMotion), motion-prefs gate (prefersReduced/finePointer), GSAP+ScrollTrigger one-clock"
  - phase: 02-experimental-motion-layer
    plan: 02
    provides: "finePointer/reduced-motion enhancement conventions; controller mount pattern"
provides:
  - "Custom blend-difference cursor (FX-04): gsap.quickTo follow, grow-on-hover, transform-only magnetic pull (D-06/07/08)"
  - "Cohesive micro-interaction set on interactive targets (.dc-trigger/.nav-link/.hero-cta/.card) (D-09)"
  - "Landing choreography: gallery-teaser horizontal marquee (D-14), package-card 3D tilt (D-15), featured-work parallax (D-16)"
  - "All effects fine-pointer + reduced-motion aware; landing-path only; transform/opacity only"
  - "CTA/Discord-modal hit targets never shifted by magnetism — conversion path stable (D-19, Pitfall 7)"
affects: [02-04-transitions-intro]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Custom cursor: fixed pointer-events:none <div> moved by gsap.quickTo off pointermove (no manual rAF loop) — RESEARCH Pattern 4"
    - "Magnetism is transform-only (gsap.quickTo on x/y), displacement capped to a --space-* token (≤8px) within a ~48px catch radius — never the hit box (Pitfall 7)"
    - "Tracked per-target enter/move/leave bindings + tagged ScrollTriggers (id prefix 'choreo') so teardown removes exactly what each module added — getAll() stays stable across swaps"
    - "Choreography gates on !prefersReduced AND landing-path (/, /es/, /en/); tilt additionally on finePointer; transform/opacity only (xPercent/yPercent/rotateX/rotateY)"
    - "Spacing pulled from tokens via getComputedStyle (no arbitrary px in JS) — UI-SPEC Spacing"
    - "Mounts on the 02-01 controller (init in initMotion, destroy in teardownMotion) — no competing astro:* init path"

key-files:
  created:
    - src/scripts/motion/cursor.ts
    - src/scripts/motion/choreography.ts
    - src/styles/cursor.css
    - src/styles/choreography.css
  modified:
    - src/scripts/motion/index.ts
    - src/components/sections/Teaser.astro

key-decisions:
  - "Whole cursor module gates on finePointer && !prefersReduced — touch and reduced-motion keep the native cursor with no magnetism (D-08/D-21)"
  - "Magnetism nudges the target with transform only (≤8px, token-driven), so .dc-trigger Abrir Ticket/Discord click targets stay exactly where static layout puts them and still click-open (T-02-CTA, D-19)"
  - "Choreography runs ONLY on the landing path; inner pages keep Plan 01's subtler reveals (D-12)"
  - "Each module tracks/tags what it creates (magnet bindings, tilt bindings, 'choreo'-prefixed ScrollTriggers) and tears down only those — never Plan 01's reveal triggers (Validation Architecture, no-leak invariant)"

requirements-completed: [FX-04]

# Metrics
duration: ~2 sessions (executor + orchestrator finish after quota interruption)
completed: 2026-06-29
---

# Phase 2 Plan 03: Interaction + Landing Choreography Summary

**A custom blend-difference cursor with grow-on-hover and transform-only magnetic pull (FX-04), a cohesive micro-interaction set, and the bespoke landing moments — gallery-teaser horizontal marquee, package-card 3D tilt, and featured-work parallax — all mounted on the 02-01 controller, fine-pointer + reduced-motion aware, landing-only, and engineered so the magnetism never shifts the Abrir Ticket / Discord-modal hit targets (D-19, Pitfall 7).**

## Performance

- **Tasks:** 2 (both `type="auto"`)
- **Files:** 6 (4 created, 2 modified)
- **Completed:** 2026-06-29

## Accomplishments

- **Custom cursor + magnetism (Task 1, FX-04):** `cursor.ts` is gated entirely behind `finePointer && !prefersReduced` (D-08/D-21). A fixed `pointer-events:none` `<div class="cursor-fx">` (aria-hidden) is appended to `<body>` and moved by `gsap.quickTo` off a `pointermove` listener — frame-synced, no manual loop (RESEARCH Pattern 4). Over interactive targets (`.dc-trigger, .nav-link, .hero-cta, .card`) the cursor grows and the target is nudged ≤8px toward the pointer using `transform` only, capped to a `--space-*` token within a ~48px catch radius. `destroyCursor()` removes every listener, kills tweens, resets each target's `x/y` to 0, and removes the cursor div so a swap re-inits clean.
- **Landing choreography (Task 2, D-14/15/16):** `choreography.ts` gates on `!prefersReduced` and the landing path (`/`, `/es/`, `/en/`):
  - **D-14 gallery marquee** — the gallery teaser body scrubs horizontally (`xPercent` translateX) on a ScrollTrigger as the user scrolls vertically past it.
  - **D-16 featured parallax** — the featured teaser body drifts on `yPercent` translateY against the background via a `scrub` ScrollTrigger (depth).
  - **D-15 package-card tilt** — on `finePointer` only, each `.cards--summary .card` gets a pointer-driven `rotateX/rotateY` tilt (≤6°, `transformPerspective: 700`) on top of Plan 01's staggered reveal; touch gets the reveal without tilt.
  - Triggers are tagged with the `'choreo'` id prefix and tilt bindings tracked; `destroyChoreography()` kills only those and resets rotation, keeping `ScrollTrigger.getAll().length` stable across navigations.
- **Stage CSS + markup hooks:** `choreography.css` adds the non-animated stage (gallery `overflow:hidden`, `will-change` hints, `.card--tilt { transform-style: preserve-3d }`) plus a reduced-motion block that neutralizes them; `Teaser.astro` gained `data-teaser={variant}` and `data-teaser-body` hooks so JS targets the right sections without coupling to copy.
- **Lifecycle wiring:** `initCursor`/`initChoreography` added to `initMotion`, `destroyCursor`/`destroyChoreography` to `teardownMotion` — one init path, clean teardown on swap.

## Task Commits

1. **Task 1: Custom blend-difference cursor + magnetism + micro-interactions (FX-04)** — `318f149` (feat)
2. **Task 2: Landing choreography — gallery marquee, card tilt, featured parallax (D-14/15/16)** — `13e2bd8` (feat)

## Files Created/Modified

- `src/scripts/motion/cursor.ts` — finePointer/reduced-motion-gated cursor div + quickTo follow + transform-only magnetism (token-capped ≤8px), tracked bindings, full teardown.
- `src/scripts/motion/choreography.ts` — landing-only marquee (translateX) + parallax (translateY) scrub ScrollTriggers + finePointer card tilt (rotateX/Y), 'choreo'-tagged triggers, tracked tilt bindings, clean teardown.
- `src/styles/cursor.css` — cursor-fx blend-difference circle, visible/grow states, reduced-motion/coarse-pointer hide.
- `src/styles/choreography.css` — marquee/tilt/parallax stage (overflow, perspective, will-change) + reduced-motion neutralization.
- `src/scripts/motion/index.ts` — cursor + choreography init/destroy wired into the controller lifecycle.
- `src/components/sections/Teaser.astro` — `data-teaser` / `data-teaser-body` hooks for marquee + parallax targeting.

## Decisions Made

- **Cursor + magnetism are desktop-fine-pointer only and off under reduced-motion** — touch/reduced-motion users keep the native cursor entirely (D-08/D-21).
- **Magnetism is transform-only and token-capped**, applied to the target's `x/y` (never layout properties, never the hit box), so the `.dc-trigger` Abrir Ticket and Discord-modal targets never move from their static positions and always click-open (T-02-CTA, Pitfall 7, D-19).
- **Choreography is landing-path scoped** (`/`, `/es/`, `/en/`); inner pages keep Plan 01's gentle reveals (D-12).
- **Every module tears down only what it created** (tracked bindings + `'choreo'`-prefixed ScrollTriggers), preserving Plan 01's reveal triggers and the no-leak invariant.

## Deviations from Plan

- **None behavioral.** Plan executed as written. **Process note:** the executor subagent hit a weekly usage limit partway through Task 2 — Task 1 was already committed (`318f149`); Task 2's edits were complete but uncommitted in the working tree. The orchestrator verified the uncommitted Task 2 work against the plan's acceptance criteria and automated verify gate (all pass), ran the build (12 pages), then committed it (`13e2bd8`) and authored this SUMMARY. No code was regenerated — the executor's Task 2 implementation was used as-is.

## Verification Performed

- **Task 2 automated verify gate (all pass):** `ScrollTrigger`, transform keywords (`xPercent/yPercent/rotateX/rotateY`), and `prefersReduced` present in `choreography.ts`; **no** `top/left/width/height` layout properties; `initChoreography` wired in `index.ts`.
- **Build:** `npx astro build` succeeds — 12 static pages, CNAME flow unaffected.
- **Hit-box safety (static review):** magnetism + tilt operate on `transform` only; cursor div is `pointer-events:none`; `.dc-trigger` is never repositioned via layout — conversion path stable.

## Manual Verification Recommended (not automatable here)

- **CTA survivability smoke (hard rule):** with the custom cursor active on desktop, confirm the FloatingCTA `.dc-trigger` and a card's `.dc-trigger` still open the Discord modal — magnetism never shifts the hit target enough to miss.
- **Touch smoke:** `(pointer: coarse)` emulation → no custom cursor, no magnetism, no tilt; sections still reveal (Plan 01).
- **Reduced-motion smoke:** emulate `reduce` → native cursor, no marquee/tilt/parallax, only gentle fades; CTA reachable.
- **No-leak smoke:** navigate landing → /servicios → back several times; assert `ScrollTrigger.getAll().length` stable and no duplicate `.cursor-fx` div.

## Next Phase Readiness

- FX-04 is delivered. The cursor and choreography mount/teardown on the same 02-01 controller as the shader, so the no-leak invariant holds. Plan 02-04 (page transitions, first-visit intro, chrome-in-motion) is the last slice — it adds the glitch-wipe transition that ties the cursor/shader glitch motif into navigation, and the nav hide/show + persistent pulsing Abrir Ticket CTA, all on the same lifecycle.

## Threat Surface

No new network endpoints, auth, file access, or schema. Magnetism/tilt use `transform` only with capped displacement and `pointer-events:none` cursor (T-02-CTA mitigated — CTA/modal hit boxes preserved). ScrollTriggers + pointer listeners are frame-synced and tracked/killed on teardown so they never accumulate (T-02-DOS mitigated). No `innerHTML`/`eval`; the cursor div is built via `createElement` (T-02-INJ mitigated). No threat flags.

## Self-Check: PASSED

All 4 created files + 2 modified files + this SUMMARY exist on disk; both task commits (`318f149`, `13e2bd8`) found in git history.
