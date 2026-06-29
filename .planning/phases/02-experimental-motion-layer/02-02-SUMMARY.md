---
phase: 02-experimental-motion-layer
plan: 02
subsystem: ui
tags: [webgl2, glsl, shader, hero, progressive-enhancement, motion, accessibility, fx-03]

# Dependency graph
requires:
  - phase: 02-experimental-motion-layer
    plan: 01
    provides: "Lifecycle motion controller (initMotion/teardownMotion), motion-prefs gate (webglOK/prefersReduced/finePointer), ClientRouter"
provides:
  - "Hero WebGL2 glitch field (FX-03): grain + chromatic aberration + glitch bursts on a navy field with minority red bleed"
  - "Mouse-reactive (rAF-coalesced) on desktop, ambient u_time-driven on touch"
  - "Static AVIF fallback default for no-WebGL2 / reduced-motion / frame-budget-miss / context-loss (no apology text)"
  - "Contrast/vignette legibility overlay keeping headline + CTA AA at peak glitch"
  - "data-shader-live reveal handshake — static img is the default-visible hero background"
affects: [02-03-cursor-choreography, 02-04-transitions-intro]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "WebGL2 full-screen-triangle: attributeless draw (gl_VertexID-derived clip coords), gl.drawArrays(TRIANGLES,0,3) with a bound VAO"
    - "GLSL bundled via Vite ?raw import (import frag from './glitch.frag?raw') — no remote shader fetch"
    - "Progressive enhancement handshake: static <img> is the default; canvas reveals (data-shader-live on .hero-bg) only once the first frame renders"
    - "Frame-budget guard: sustained >22ms over ~1s cancels rAF and swaps to the static fallback (perf wins ties, D-22)"
    - "Brand colors read from tokens.css custom props and uploaded as uniforms — no hard-coded hex in GLSL"
    - "Mounts on the 02-01 controller (init in initMotion, destroy in teardownMotion) — no competing astro:* init path"

key-files:
  created:
    - src/scripts/motion/hero-shader/shader.ts
    - src/scripts/motion/hero-shader/glitch.frag
    - src/scripts/motion/hero-shader/quad.vert
    - src/styles/hero-shader.css
    - public/hero-fallback.avif
  modified:
    - src/pages/[lang]/index.astro
    - src/scripts/motion/index.ts

key-decisions:
  - "Static fallback is the DEFAULT-visible hero background; the shader reveals its canvas (and retires the img) only after rendering one frame — JS-off / pre-init / degraded all resolve to the static image (D-04/D-20)"
  - "Brand colors come from tokens.css via getComputedStyle → uniforms (no hard-coded brand hex in GLSL); a numeric fallback rgb covers a missing/unparseable token"
  - "hero-shader.css imported from the page (index.astro) alongside sections.css — hero-scoped styling, not global BaseLayout chrome"
  - "AVIF fallback generated with ffmpeg libaom-av1 (still-picture): navy field + faint red bleed + grain; flagged for a higher-fidelity art pass later"

requirements-completed: [FX-03]

# Metrics
duration: ~20min
completed: 2026-06-29
---

# Phase 2 Plan 02: Hero WebGL Glitch Shader Summary

**A hand-authored WebGL2 full-screen-quad glitch field (FX-03) — grain + chromatic aberration + glitch bursts on a navy base with minority red bleed, mouse-reactive on desktop and ambient on touch — mounted on the 02-01 motion controller as pure progressive enhancement over a static AVIF fallback, behind a contrast/vignette overlay that keeps the headline + Abrir Ticket CTA AA-legible at peak glitch.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-06-29
- **Tasks:** 2 (both `type="auto"`)
- **Files:** 7 (5 created, 2 modified)

## Accomplishments

- **Hero markup + fallback layering (Task 1):** Added `<canvas data-hero-shader>`, a default-visible `<img data-hero-fallback>` (the static AVIF), and a `.hero-shader-overlay` contrast/vignette element inside `.hero-bg`. `hero-shader.css` owns the z-layering (img z0 → canvas z1 → overlay z2), the `data-shader-live` reveal state, and a `prefers-reduced-motion` rule that forces the static image and hides the canvas (D-21). The `.reveal` hooks (Plan 01) were left untouched.
- **WebGL2 shader runtime (Task 2):** `shader.ts` gates on `webglOK() && !prefersReduced`, opens the context with `failIfMajorPerformanceCaveat: true` (drops software/weak GPUs → keeps fallback, Pitfall 5), compiles the attributeless quad + glitch programs from `?raw` GLSL, and runs a single rAF loop. Pointer input is bound **only** on `finePointer`, cached, and read **once per frame** (D-03 throttle); on touch the warp is driven from `u_time` (ambient, D-22). A frame-budget guard cancels the loop and swaps to the static fallback on a sustained >22ms/~1s miss, and `webglcontextlost` does the same. `destroyHeroShader()` cancels rAF, removes listeners, loses the GL context, and restores the default fallback state.
- **GLSL (`glitch.frag`):** navy base field with `u_time`/`u_resolution`/`u_mouse` plus brand-color uniforms; layers low-amplitude film grain (harmonized below the global `body::after` grain, Pitfall 6), radius+burst chromatic aberration carrying the red fringe, periodic block/scanline glitch bursts, and a `u_mouse` warp. Red stays a minority bleed (≤0.18 ceiling, D-02).
- **Lifecycle wiring:** `initHeroShader()`/`destroyHeroShader()` hooked into the 02-01 controller's `initMotion`/`teardownMotion` — one init path, no second astro:* listener, clean teardown on navigation.

## Task Commits

1. **Task 1: Hero canvas + static fallback img + legibility overlay** — `e52346a` (feat)
2. **Task 2: WebGL2 shader runtime + GLSL + budget guard, wired to controller** — `4a6b49d` (feat)

## Files Created/Modified

- `src/scripts/motion/hero-shader/shader.ts` — WebGL2 rAF runtime: capability + caveat gate, `?raw` GLSL compile/link, rAF-coalesced pointer (finePointer-only), ambient touch warp, frame-budget guard, contextlost swap, first-frame reveal, full teardown.
- `src/scripts/motion/hero-shader/glitch.frag` — grain + chromatic aberration + glitch bursts + mouse warp on a navy field, brand colors via uniforms.
- `src/scripts/motion/hero-shader/quad.vert` — attributeless full-screen-triangle pass-through.
- `src/styles/hero-shader.css` — canvas/img/overlay layering, `data-shader-live` reveal handshake, reduced-motion static-image override.
- `public/hero-fallback.avif` — static navy + red-bleed + grain fallback image (1.2 KB AVIF, ships to dist).
- `src/pages/[lang]/index.astro` — hero markup additions inside `.hero-bg` + `hero-shader.css` import (`.reveal` hooks intact).
- `src/scripts/motion/index.ts` — `initHeroShader`/`destroyHeroShader` wired into the controller lifecycle.

## Decisions Made

- **Static fallback is the default-visible background; the canvas reveals only after a frame renders** (`data-shader-live` toggled on `.hero-bg`). This makes JS-off, pre-init, and every degradation path resolve to the static image with zero apology text (D-04/D-20).
- **Brand colors flow tokens.css → `getComputedStyle` → uniforms**, never hard-coded in GLSL. A numeric rgb fallback covers an unparseable/missing token so the shader still renders on-brand.
- **`hero-shader.css` is imported from the page**, not BaseLayout — it is hero-scoped, mirroring how `sections.css` is page-imported; BaseLayout keeps owning global chrome/motion CSS.
- **AVIF fallback authored with ffmpeg `libaom-av1` still-picture** (navy field + faint red bleed + grain). It is a real, AA-legible fallback, not an empty placeholder — flagged below for an optional higher-fidelity art pass.

## Deviations from Plan

None — plan executed exactly as written. Both `<automated>` verify gates and all acceptance criteria pass; `npx astro build` emits 12 pages with `hero-fallback.avif` shipped to `dist/`.

## Known Stubs

- `public/hero-fallback.avif` is a **functional, AA-legible** procedurally generated fallback (navy field + red bleed + grain), not a stub — but a higher-fidelity hand-authored art pass (e.g. a frozen frame of the actual shader, or a designed grain plate) would raise visual polish. Not blocking FX-03; the current asset satisfies D-04/D-21/D-22.

## Verification Performed

- **Build:** `npx astro build` succeeds; 12 static pages; `dist/hero-fallback.avif` present; CNAME flow unaffected.
- **GLSL bundling:** `u_mouse` GLSL string present in the built motion JS bundle (`?raw` resolved at build, no remote fetch — T-02-REMOTE).
- **No hard-coded brand hex** in `glitch.frag` (grep for `0a0c14`/`c0192c`/`e8223b` → none; colors are uniforms — Brand-tokens rule).
- **Default-visible fallback:** built `es/index.html` has `.hero-fallback` `<img>` with NO inline `opacity:0` and `.hero-bg` carries NO `data-shader-live` attribute statically → the static image is the JS-off hero background (D-20).
- **CTA survivability:** 10 `dc-trigger` Abrir Ticket CTAs present in built HTML; the CTA lives in static markup above the canvas in every shader state (T-02-CTA).
- **Task grep gates (Task 2):** `failIfMajorPerformanceCaveat`, `webglcontextlost`, `?raw` import, `cancelAnimationFrame`, `u_mouse`, and `HeroShader` wiring all present.

## Manual Verification Recommended (not automatable here)

- **Desktop live smoke:** WebGL2 desktop → glitch field animates and distorts toward the throttled cursor; touch emulation → ambient drift (no pointer follow).
- **No-WebGL / reduced-motion smoke:** disable WebGL or emulate reduce → static grain image shows, hero AA-legible, no console error, CTA reachable.
- **No-leak smoke:** navigate landing → /servicios → back several times; assert exactly one rAF loop / WebGL context, none orphaned (teardown loses the context on `astro:before-swap`).
- **Peak-glitch legibility:** at a maximum glitch burst, confirm `--white` hero text over the overlay holds ≥ AA contrast.

## Next Phase Readiness

- FX-03 is delivered. The hero shader is the last heavy enhancement in the motion stack; Plans 02-03 (cursor/choreography) and 02-04 (transitions/intro + glitch-wipe) mount their own init/destroy on the same controller. The shader's teardown already loses the GL context on swap, so the no-leak invariant holds when later slices add more rAF-driven effects.

## Threat Surface

No new network endpoints, auth paths, file access, or schema changes were introduced. `u_mouse` is clamped numeric clientX/Y normalized to resolution (no string/shader-source injection surface, T-02-GLSL); GLSL is bundled locally via `?raw`, never fetched remotely (T-02-REMOTE); `failIfMajorPerformanceCaveat` + the budget/contextlost guards mitigate self-inflicted GPU DoS (T-02-DOS-GPU); the legibility overlay + static-HTML CTA preserve the conversion path (T-02-CTA). No threat flags.

## Self-Check: PASSED

All 5 created files + 2 modified files + SUMMARY exist on disk; both task commits (`e52346a`, `4a6b49d`) found in git history.
