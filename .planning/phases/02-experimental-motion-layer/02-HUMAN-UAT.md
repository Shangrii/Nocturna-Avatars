---
status: partial
phase: 02-experimental-motion-layer
source: [02-VERIFICATION.md]
started: 2026-06-30
updated: 2026-06-30
---

## Current Test

[awaiting human testing]

## Tests

### 1. Desktop smooth-scroll inertia (FX-01)
expected: Mouse-wheel scrolling has visible inertia; releasing the wheel causes the page to coast smoothly and settle. With `prefers-reduced-motion: reduce` emulated → instant native scroll, no inertia.
result: [pending]

### 2. ClientRouter no-leak across navigations
expected: `ScrollTrigger.getAll().length` does not grow across navigations; no "Too many calls to Location or History APIs" console error; no duplicate Lenis instance; nav drawer, language switcher, and Discord modal still work after each swap.
result: [pending]

### 3. WebGL hero shader live (FX-03)
expected: Hero shows an animated grain + chromatic-aberration + glitch-burst field on navy; moving the mouse distorts the field toward the cursor; headline + Abrir Ticket CTA stay AA-legible at peak glitch; navigate away and back → exactly one rAF loop / WebGL context (no orphan).
result: [pending]

### 4. Hero fallback on no-WebGL / reduced-motion (FX-03)
expected: The static AVIF fallback image is the visible hero background; headline + Abrir Ticket CTA present and AA-legible; no "WebGL not supported" apology text.
result: [pending]

### 5. Custom cursor + magnetism + CTA click-through (FX-04, D-19/Pitfall 7)
expected: A white blend-difference circle follows the mouse; over `.dc-trigger`/`.nav-link`/`.hero-cta`/`.card` it grows and the target nudges ≤8px toward the cursor; clicking the FloatingCTA or any `.dc-trigger` still opens the Discord modal (hit box not shifted); touch emulation → native cursor only.
result: [pending]

### 6. Glitch-wipe page transitions (NAV-04/D-17)
expected: Each navigation plays a brief (~0.26s) RGB-split steps-eased glitch wipe; the FloatingCTA and nav stay visible and do not wipe; with `prefers-reduced-motion: reduce` → plain opacity fade.
result: [pending]

### 7. First-visit-only intro (D-18)
expected: A ~1s opaque overlay with three glitching bars appears and auto-dismisses; a tap during the intro dismisses it immediately AND the FloatingCTA beneath is still clickable (overlay is `pointer-events:none`); on reload the intro does not replay; with `prefers-reduced-motion: reduce` it never plays.
result: [pending]

### 8. Nav hide-on-scroll / show-on-scroll-up (D-19)
expected: Nav slides off-screen (`translateY(-100%)`) when scrolling down past the top zone and reappears on scroll-up; FloatingCTA stays visible and clickable throughout; with `prefers-reduced-motion: reduce` the nav stays always visible.
result: [pending]

### 9. Landing choreography — marquee / tilt / parallax (D-14/15/16)
expected: The gallery-teaser content scrolls horizontally as you scroll vertically past it; package cards tilt in 3D under the pointer; the featured-work teaser parallaxes against the background; on touch or reduced-motion none of these play — sections reveal with the gentle Plan 01 fade only.
result: [pending]

### 10. JS-disabled content visibility (D-20)
expected: With JavaScript disabled (serving `dist/`), all `.reveal` content is visible (no stuck `opacity:0`); the hero shows the static AVIF fallback (not a blank canvas); the Abrir Ticket FloatingCTA is present and clickable.
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0
blocked: 0

## Gaps
