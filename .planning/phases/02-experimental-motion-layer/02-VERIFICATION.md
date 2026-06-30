---
phase: 02-experimental-motion-layer
verified: 2026-06-30T00:00:00Z
status: human_needed
score: 12/12
overrides_applied: 0
human_verification:
  - test: "Desktop wheel-inertia smoke — open the built site in a real browser (or dev server) and wheel-scroll the landing on desktop"
    expected: "Mouse wheel scrolling has visible inertia; releasing the wheel causes the page to coast smoothly and then settle. Scrolling with prefers-reduced-motion emulated produces instant native scroll with no inertia."
    why_human: "Lenis inertia is a continuous rAF effect; cannot be confirmed by static-file grep or a build check alone."
  - test: "ClientRouter no-leak smoke — navigate landing → /servicios → back → forward × 3 with the browser DevTools console open"
    expected: "ScrollTrigger.getAll().length does not grow across navigations. No 'Too many calls to Location or History APIs' console error appears. No duplicate Lenis instance. Nav drawer, language switcher, and Discord modal still work after each swap."
    why_human: "Runtime leak detection requires live navigation events and DevTools; cannot be asserted from static code analysis."
  - test: "Hero WebGL shader live smoke — load the landing on a WebGL2-capable desktop browser"
    expected: "The hero displays an animated grain + chromatic-aberration + glitch-burst field on a navy background. Moving the mouse distorts the field toward the cursor. The headline and Abrir Ticket CTA remain readable over the shader at peak glitch. Navigating away and back produces exactly one rAF loop / WebGL context — no orphaned loop."
    why_human: "WebGL rendering and cursor reactivity require a live GPU context; not verifiable from source alone."
  - test: "Hero fallback smoke — disable WebGL in the browser (about:config webgl.disabled=true) or emulate prefers-reduced-motion: reduce"
    expected: "The static AVIF fallback image is the visible hero background. The headline and Abrir Ticket CTA are present and AA-legible. No 'WebGL not supported' apology text appears."
    why_human: "Requires toggling browser capabilities; cannot be checked statically."
  - test: "Custom cursor smoke — open the landing on desktop (pointer: fine) with no reduced-motion preference"
    expected: "A white blend-mode-difference circle follows the mouse. Over .dc-trigger, .nav-link, .hero-cta, and .card targets the circle grows and the target nudges ≤8px toward the cursor. Clicking the FloatingCTA or any .dc-trigger still opens the Discord modal (hit box not shifted). Touch emulation → native cursor only."
    why_human: "cursor follow, grow, and magnetism are live pointer-event effects; requires an actual browser."
  - test: "Glitch-wipe page transition smoke — navigate between pages (landing → /servicios → back → forward)"
    expected: "Each navigation plays a brief (~0.26s) RGB-split steps-eased glitch wipe. The FloatingCTA and nav stay visible and do not wipe. With prefers-reduced-motion: reduce, the transition is a plain opacity fade."
    why_human: "View-transition animations require live ClientRouter navigation events."
  - test: "First-visit intro smoke — clear localStorage key 'nocturna-intro-seen', then hard-load the site"
    expected: "A ~1s opaque overlay with three glitching bars appears and auto-dismisses. A tap during the intro dismisses it immediately AND the FloatingCTA beneath is still clickable (pointer-events:none overlay). On reload the intro does not replay. With prefers-reduced-motion: reduce the intro never plays."
    why_human: "Requires controlling localStorage state and verifying overlay dismissal timing in a live browser."
  - test: "Nav hide/show scroll smoke — scroll down slowly past 120px, then scroll back up"
    expected: "Nav slides off-screen (translateY(-100%)) when scrolling down past the top zone. Nav reappears when scrolling up. FloatingCTA remains visible and clickable throughout. With prefers-reduced-motion: reduce the nav stays always visible."
    why_human: "Nav hide behavior is triggered by scroll events and CSS transitions; requires live interaction."
  - test: "Landing choreography smoke — visit the landing on desktop with motion enabled"
    expected: "The gallery teaser section's content scrolls horizontally as you scroll vertically past it (marquee). Package cards tilt in 3D as you move the pointer over them. The featured-work teaser section parallaxes at a different speed from the background. On touch or with reduced-motion none of these play — sections reveal with the gentle Plan 01 fade only."
    why_human: "ScrollTrigger scrub animations and pointer-tilt require live scroll/pointer events."
  - test: "JS-disabled content visibility check — open a page from dist/ with JavaScript blocked"
    expected: "All .reveal content is visible (no opacity:0 stuck). The hero shows the static AVIF fallback (not a blank canvas). The Abrir Ticket FloatingCTA is present and clickable."
    why_human: "Requires serving the built dist/ with JS disabled in the browser; cannot be fully inferred from HTML alone (motion-ready class is never added, reveal CSS correctly shows content)."
---

# Phase 02: Experimental Motion Layer Verification Report

**Phase Goal:** The site feels "máximo experimental" — smooth scroll, scroll-triggered reveals, a WebGL hero shader, animated page transitions, and an interactive cursor — without burying the conversion path.
**Verified:** 2026-06-30
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

All 12 observable truths are VERIFIED by static code evidence. The phase goal is achieved in the codebase. The `human_needed` status reflects that 10 behavioral checks (live motion, real browser) cannot be confirmed programmatically — they are standard post-ship smoke tests, not signals of broken code.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Smooth (Lenis) wheel-inertia scroll on desktop; reduced-motion and touch keep native scroll | VERIFIED | `smooth-scroll.ts`: `prefersReduced` hard no-op, `syncTouch:false`, `lenis.raf(time*1000)` on gsap.ticker, `lenis.destroy()` in teardown |
| 2 | `.reveal` sections animate on scroll; display headings split after font-ready; bold landing / subtle inner pages | VERIFIED | `reveals.ts`: `document.fonts.ready.then(→SplitText)`, `ScrollTrigger.refresh()`, `isLanding()` path split, `getAll().forEach(t=>t.kill())` in teardown |
| 3 | Hero displays a WebGL2 grain + chromatic-aberration + glitch shader (mouse-reactive desktop, ambient touch) | VERIFIED | `hero-shader/shader.ts`: `failIfMajorPerformanceCaveat`, frame-budget guard, `finePointer` pointermove gate, ambient `u_time` warp, `webglcontextlost` fallback swap, `cancelAnimationFrame` teardown |
| 4 | No-WebGL / reduced-motion / budget-miss → static AVIF fallback, no apology text | VERIFIED | `shader.ts` capability gates; `hero-shader.css`: `prefers-reduced-motion` forces static img visible; `public/hero-fallback.avif`: 1 249 bytes (non-zero, real asset) |
| 5 | Hero headline and Abrir Ticket CTA remain AA-legible at peak glitch | VERIFIED | `.hero-shader-overlay` in hero markup (z-index:2 contrast/vignette overlay); shader itself has built-in vignette (`0.55+0.45*vig`); CTA lives in static HTML above canvas |
| 6 | Desktop custom cursor (blend-difference invert circle) with magnetic pull ≤8px, fine-pointer gated, never shifts hit box | VERIFIED | `cursor.ts`: `finePointer&&!prefersReduced` gate, `gsap.quickTo` follow, `transform` only for magnetism, displacement capped to `--space-2xs`; cursor div `pointer-events:none` in `cursor.css` |
| 7 | Cohesive micro-interactions (lift/underline-draw/glitch flicker/CTA pulse), reduced-motion neutralised | VERIFIED | `choreography.css`: lift, underline-draw, `nocturna-glitch-flicker` keyframe, `nocturna-cta-pulse` on `.floating-cta`; reduced-motion block neutralises all |
| 8 | Animated glitch-wipe page transitions; reduced-motion collapses to fade | VERIFIED | `BaseLayout.astro` `<main transition:animate={glitchWipe}>`, `transitions.css` `@keyframes glitch-out/glitch-in` with RGB-split red fringe, reduced-motion redefines keyframes as plain fade |
| 9 | First-visit-only skippable glitch intro (~1s); repeat visits skip; reduced-motion disabled | VERIFIED | `transitions.ts`: `nocturna-intro-seen` localStorage flag, `introHandled` module flag, `prefersReduced` gate, `pointer-events:none` overlay, window-level skip listener, auto-dismiss `setTimeout(1000)` |
| 10 | Nav hides on scroll-down / shows on scroll-up; single shared scroll listener (no double-bind) | VERIFIED | `chrome.ts`: exactly **1** `addEventListener('scroll'` (grep count = 1); D-19 direction logic folded inside the existing handler; `.nav--hidden { transform:translateY(-100%) }` in `transitions.css` |
| 11 | FloatingCTA and Discord modal remain reachable in every motion state | VERIFIED | `FloatingCTA` is a sibling of `<main>` (BaseLayout line 76, after `</main>` at 71) — never inside the transition wrapper; overlay `pointer-events:none`; cursor div `pointer-events:none`; magnetism is `transform` only |
| 12 | Progressive enhancement: no JS → all `.reveal` content visible; motion is JS-only enhancement | VERIFIED | `motion.css`: `.reveal{opacity:0}` gated behind `html.motion-ready` (class added by JS controller); without JS the class never appears so content stays visible |

**Score: 12/12 truths verified**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/scripts/motion/index.ts` | Lifecycle controller: init on page-load, teardown on before-swap, idempotent | VERIFIED | Both listeners at module scope; `inited` flag prevents double-init; all 6 module init/destroy calls present |
| `src/scripts/motion/motion-prefs.ts` | Exports `prefersReduced`, `finePointer`, `webglOK()` | VERIFIED | All three exports present; `webglOK` uses `failIfMajorPerformanceCaveat:true` in try/catch |
| `src/scripts/motion/smooth-scroll.ts` | Lenis on one-clock; `lenis.raf` in ticker callback; `lenis.destroy()` in teardown | VERIFIED | `lenis.raf(time*1000)`, `gsap.ticker.add/remove`, `lenis.destroy()` all present; no `autoRaf` |
| `src/scripts/motion/reveals.ts` | ScrollTrigger reveals + SplitText, font-ready gated, reduced-motion safe | VERIFIED | `document.fonts.ready.then(→SplitText)`, `ScrollTrigger.refresh()` ×2, `getAll().forEach(kill)` in teardown |
| `src/styles/motion.css` | Reveal initial states + reduced-motion override; `.motion-ready` gate | VERIFIED | `html.motion-ready .reveal { opacity:0; transform:translateY(var(--space-md)) }` + reduced-motion block forcing visibility |
| `src/scripts/motion/hero-shader/shader.ts` | WebGL2 rAF, `failIfMajorPerformanceCaveat`, pointer throttled, frame-budget guard, full teardown | VERIFIED | All patterns present; brand colors from tokens.css via `getComputedStyle`; no hard-coded hex |
| `src/scripts/motion/hero-shader/glitch.frag` | grain + chromatic aberration + glitch bursts; `u_mouse` uniform; navy base + minority red | VERIFIED | All four effect layers present; `u_mouse` declared; red ceiling `0.18` keeps it minority |
| `src/scripts/motion/hero-shader/quad.vert` | Attributeless full-screen-triangle | VERIFIED | `gl_VertexID`-derived clip coords; `v_uv` out for fragment shader |
| `public/hero-fallback.avif` | Non-zero static fallback image | VERIFIED | 1,249 bytes; real AVIF asset |
| `src/styles/hero-shader.css` | canvas/img/overlay z-layering; `data-shader-live` reveal handshake; reduced-motion override | VERIFIED | All three layers present; `data-shader-live` state toggles; reduced-motion forces static img |
| `src/scripts/motion/cursor.ts` | `gsap.quickTo` follow; `finePointer&&!prefersReduced` gate; transform-only magnetism; teardown | VERIFIED | `quickTo` x/y, `pointer-events:none` cursor div, `--space-2xs/xl` tokens, tracked magnet bindings, full teardown |
| `src/scripts/motion/choreography.ts` | Gallery marquee (xPercent), card tilt (rotateX/Y), featured parallax (yPercent); `'choreo'`-tagged triggers | VERIFIED | All three effects; `ST_ID='choreo'` prefix; teardown kills only choreo triggers |
| `src/styles/cursor.css` | `mix-blend-mode:difference`; `(pointer:fine) and (hover:hover)` gate; reduced-motion hides | VERIFIED | All present |
| `src/styles/choreography.css` | lift/underline/glitch-flicker micro-interactions; CTA pulse; reduced-motion block | VERIFIED | All present; `nocturna-cta-pulse` on `.floating-cta` |
| `src/scripts/motion/transitions.ts` | `nocturna-intro-seen` localStorage; `introHandled` flag; `pointer-events:none` overlay; window-level skip | VERIFIED | All present |
| `src/styles/transitions.css` | `@keyframes glitch-out/glitch-in` with RGB-split red fringe; `.nav--hidden`; reduced-motion collapse | VERIFIED | All present; reduced-motion redefines keyframes as plain opacity fade |
| `src/layouts/BaseLayout.astro` | `<ClientRouter />` in head; `transition:animate={glitchWipe}` on `<main>`; FloatingCTA outside `<main>` | VERIFIED | ClientRouter at line 60; `<main transition:animate={glitchWipe}>` at line 69; FloatingCTA at line 76 (after `</main>`) |
| `src/scripts/chrome.ts` | `astro:page-load` gate (no DOMContentLoaded); exactly 1 scroll listener; `nav--hidden` toggled | VERIFIED | `document.addEventListener('astro:page-load', init)` at line 193; no `DOMContentLoaded`; scroll count = 1; `nav--hidden` at lines 45/47 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `BaseLayout.astro` | `astro:transitions ClientRouter` | `import {ClientRouter}` + `<ClientRouter />` | WIRED | 2 occurrences confirmed (import line 10, element line 60) |
| `smooth-scroll.ts` | `gsap.ticker / ScrollTrigger` | `lenis.on('scroll', ScrollTrigger.update)` + `gsap.ticker.add(t => lenis.raf(t*1000))` | WIRED | One-clock recipe confirmed |
| `chrome.ts` | `astro:page-load` | `document.addEventListener('astro:page-load', init)` | WIRED | DOMContentLoaded fully replaced |
| `index.ts` | `hero-shader/shader.ts` | `initHeroShader()` in `initMotion`, `destroyHeroShader()` in `teardownMotion` | WIRED | Both wiring calls confirmed |
| `shader.ts` | `glitch.frag` | `import fragSrc from './glitch.frag?raw'` | WIRED | `?raw` import present |
| `shader.ts` | `motion-prefs.ts` | `webglOK()` + `prefersReduced` + `finePointer` gate | WIRED | All three prefs used |
| `cursor.ts` | `.dc-trigger / .nav-link / .hero-cta / .card` | `transform`-only magnetism via `gsap.quickTo(el,'x'/'y')` | WIRED | Never layout props; `pointer-events:none` cursor |
| `index.ts` | `cursor.ts + choreography.ts` | `initCursor()/initChoreography()` in `initMotion` | WIRED | Confirmed |
| `transitions.ts` | `localStorage nocturna-intro-seen` | `localStorage.getItem/setItem(INTRO_KEY)` in try/catch | WIRED | Key constant `'nocturna-intro-seen'` confirmed |
| `chrome.ts` | `nav hide-on-scroll` | Single shared `'scroll'` handler toggling `.nav--hidden` | WIRED | Exactly 1 scroll listener; direction logic inside; reduced-motion neutralised in CSS |

---

### Data-Flow Trace (Level 4)

Not applicable — this is a static Astro site with no dynamic data components. All motion effects operate on DOM/WebGL APIs with no data store, database, or API fetch chain. The shader's brand colors flow from `tokens.css → getComputedStyle → WebGL uniforms`, confirmed in `shader.ts:readBrandColors()`.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 10 task commits exist in git history | `git log --oneline \| grep <hash>` | All 10 hashes found | PASS |
| `public/hero-fallback.avif` is non-zero | `wc -c hero-fallback.avif` | 1 249 bytes | PASS |
| Exactly 1 scroll listener in chrome.ts | `grep -c "addEventListener('scroll'"` | 1 | PASS |
| `DOMContentLoaded` absent from chrome.ts | `grep -c DOMContentLoaded chrome.ts` | 0 | PASS |
| `autoRaf` absent from smooth-scroll.ts | `grep autoRaf smooth-scroll.ts` | 0 matches | PASS |
| `lenis.raf(time*1000)` present | `grep "lenis.raf" smooth-scroll.ts` | confirmed | PASS |
| FloatingCTA outside `<main>` wrapper | Layout review of BaseLayout.astro | FloatingCTA at line 76, `</main>` at line 71 | PASS |
| No layout props animated in cursor.ts | `grep -E "top\|left\|width\|height:" cursor.ts` | Only `getBoundingClientRect()` reads | PASS |
| No debt markers (TBD/FIXME/XXX) | grep across all motion files | 0 matches | PASS |
| Astro build produces output | SUMMARY.md (all 4) report `npx astro build` 12 pages | Confirmed per all 4 SUMMARYs | PASS |

---

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|---------------|-------------|--------|----------|
| FX-01 | 02-01 | The site uses smooth scrolling | SATISFIED | `smooth-scroll.ts` Lenis on gsap.ticker, reduced-motion no-op, clean teardown |
| FX-02 | 02-01 | Sections animate / reveal on scroll | SATISFIED | `reveals.ts` ScrollTrigger + SplitText, font-ready gated, bold/subtle path split |
| FX-03 | 02-02 | The hero displays a WebGL shader effect | SATISFIED | `hero-shader/shader.ts` + `glitch.frag` + `quad.vert`, static fallback, frame-budget guard |
| FX-04 | 02-03 | The cursor has an interactive effect | SATISFIED | `cursor.ts` blend-difference cursor, `gsap.quickTo`, transform-only magnetism |
| NAV-04 | 02-01 (scaffold), 02-04 (delivery) | Navigating between pages uses animated transitions | SATISFIED | `transition:animate={glitchWipe}` on `<main>`, `glitch-out/glitch-in` keyframes, ClientRouter enabled |

All 5 phase-02 requirements (FX-01, FX-02, FX-03, FX-04, NAV-04) are SATISFIED. No orphaned requirements.

---

### Anti-Patterns Found

No blockers or warnings. The scan found:

- **Debt markers (TBD/FIXME/XXX):** 0 matches across all motion files and modified BaseLayout/chrome — no unresolved debt.
- **`return null` patterns in `shader.ts`:** These are WebGL compile/link error guard paths (defensive degradation), not stubs. Each is preceded by a genuine operation (shader compile, program link) and correctly routes to the static fallback — classified as INFO, not a blocker.
- **`hero-fallback.avif` flagged as "art-pass candidate"** in SUMMARY-02-02: the SUMMARY itself notes it is a functional, AA-legible procedurally-generated asset, not a placeholder. File exists at 1 249 bytes. Classified as INFO.
- **No `innerHTML`/`eval` sinks** introduced in any motion module.
- **No hardcoded brand hex** in `glitch.frag` — colors flow via uniforms.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `hero-fallback.avif` | — | Low-fidelity procedural art (navy field + red bleed) | INFO | Not a code stub; functional fallback; an optional art pass would raise visual polish |
| `shader.ts` | 72, 77, 85, 87, 95 | `return null` on WebGL error paths | INFO | These are correct defensive degradation paths; each is preceded by a real GL operation |

---

### Human Verification Required

The automated verification passes on all 12 truths. The following 10 items require live-browser testing and cannot be confirmed from static analysis. They are organized by area:

#### 1. Smooth Scroll Feel (FX-01)
**Test:** Open the landing in a desktop browser (no reduced-motion). Wheel-scroll.
**Expected:** Visible wheel inertia / coast-and-settle on mouse release. Emulate `prefers-reduced-motion: reduce` → instant native scroll, zero inertia.
**Why human:** Lenis inertia is a continuous rAF effect.

#### 2. ClientRouter No-Leak (NAV-04, FX-01/FX-02)
**Test:** Navigate landing → /servicios → back → forward ×3 with the DevTools console open.
**Expected:** `ScrollTrigger.getAll().length` stable (does not grow). No "Too many calls to Location or History APIs" error. No duplicate Lenis. Nav / lang switcher / Discord modal work after every swap.
**Why human:** Runtime leak detection requires live navigation events.

#### 3. WebGL Hero Shader Live (FX-03)
**Test:** Load the landing in a WebGL2-capable desktop browser.
**Expected:** Animated grain + chromatic-aberration + glitch-burst field fills the hero. Moving the mouse distorts the field toward the cursor. Navigate away and back → exactly one rAF loop / WebGL context.
**Why human:** WebGL rendering requires a live GPU context.

#### 4. Hero Fallback (FX-03, progressive enhancement)
**Test:** Disable WebGL in the browser OR emulate `prefers-reduced-motion: reduce`.
**Expected:** Static AVIF fallback is the visible hero background. Headline and Abrir Ticket CTA are AA-legible. No apology text.
**Why human:** Requires toggling browser capabilities.

#### 5. Custom Cursor + Magnetism (FX-04, D-19/Pitfall 7)
**Test:** Desktop with fine pointer, no reduced-motion. Hover over `.dc-trigger`, `.nav-link`, `.hero-cta`, `.card`. Click the FloatingCTA.
**Expected:** Blend-difference circle follows mouse; grows over targets; targets nudge ≤8px. FloatingCTA and Discord modal still open on click. Touch emulation → native cursor only.
**Why human:** Live pointer events required.

#### 6. Glitch-Wipe Page Transitions (NAV-04, D-17)
**Test:** Navigate landing → /servicios → back → forward.
**Expected:** Each navigation plays a ~0.26s RGB-split steps-eased wipe. FloatingCTA and nav stay visible (do not wipe). `prefers-reduced-motion: reduce` → plain opacity fade.
**Why human:** View-transition animations require live ClientRouter navigation.

#### 7. First-Visit Intro (D-18)
**Test:** Clear `localStorage.removeItem('nocturna-intro-seen')`. Hard-load the site.
**Expected:** ~1s overlay with three glitching bars appears and auto-dismisses. A tap dismisses early AND the FloatingCTA beneath is still clickable (overlay is `pointer-events:none`). On reload: no intro. `prefers-reduced-motion: reduce` → no intro.
**Why human:** Requires localStorage control and overlay timing in a live browser.

#### 8. Nav Hide/Show on Scroll (D-19)
**Test:** Scroll down past 120px slowly, then scroll back up.
**Expected:** Nav slides off-screen on scroll-down. Nav reappears on scroll-up. FloatingCTA stays visible and clickable throughout. `prefers-reduced-motion: reduce` → nav always visible.
**Why human:** Scroll events and CSS transitions require live interaction.

#### 9. Landing Choreography (D-14/D-15/D-16)
**Test:** Visit the landing on desktop with motion enabled. Scroll and move the pointer over package cards.
**Expected:** Gallery teaser scrolls horizontally on vertical scroll. Package cards tilt in 3D on pointer hover. Featured-work section parallaxes against background. Touch or `prefers-reduced-motion: reduce` → none of these, only gentle fades.
**Why human:** ScrollTrigger scrub and pointer-tilt require live events.

#### 10. JS-Disabled Content Visibility (D-20)
**Test:** Serve `dist/` with JavaScript blocked in browser DevTools.
**Expected:** All `.reveal` content is visible (no stuck `opacity:0`). Hero shows the static AVIF fallback (not a blank canvas). Abrir Ticket FloatingCTA is present and clickable.
**Why human:** Requires serving the built dist/ with JS disabled in a browser.

---

### Gaps Summary

No gaps found. All 12 observable truths are VERIFIED by static codebase evidence. All 5 requirement IDs (FX-01, FX-02, FX-03, FX-04, NAV-04) are satisfied. All 10 task commits exist in git history. No debt markers, stubs, or orphaned requirements were found.

The `human_needed` status reflects 10 behavioral smoke tests that require a live browser — standard post-ship verification for a motion-heavy phase, not indicators of broken implementation.

---

_Verified: 2026-06-30_
_Verifier: Claude (gsd-verifier)_
