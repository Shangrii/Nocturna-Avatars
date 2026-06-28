# Phase 2: Experimental Motion Layer - Research

**Researched:** 2026-06-28
**Domain:** Client-side motion in an Astro 7 static site — Lenis smooth scroll + GSAP/ScrollTrigger reveals + one WebGL hero shader + custom cursor + Astro View Transitions (`ClientRouter`)
**Confidence:** HIGH (libraries verified on npm + official docs; integration pitfalls corroborated by documented GitHub issues)

## Summary

This phase wires five locked motion libraries onto an already-shipped Astro 7 static shell. The tools are **not** in question — the risk is entirely in *integration mechanics*, because Astro's `ClientRouter` (client-side View Transitions) fundamentally changes the page lifecycle: **module scripts run exactly once and never re-run on navigation**, while the DOM is swapped under the running JS. Every scroll trigger, every Lenis instance, and every shader/cursor listener that assumes a fresh page load will either leak, double-bind, or break after the first in-site navigation. This is the single highest-value thing the planner must get right, and the entire codebase already has documented bug reports for exactly this combination (Astro #12725, multiple GSAP forum threads).

The second axis is performance discipline (D-20/D-22, "perf wins ties"). The current project has **zero client runtime dependencies** (`astro 7.0.3` only) — Lenis and GSAP will be the first. They must be code-split and deferred after first paint, the shader must self-degrade to a static image on low-end hardware, and the whole motion layer must be a no-op under `prefers-reduced-motion` (partial reduce, D-21) and on no-JS/no-WebGL.

**Primary recommendation:** Build one shared, lifecycle-aware **motion controller** module (`src/scripts/motion/`) that owns init AND teardown, driven by `astro:page-load` (setup) and `astro:before-swap` / `astro:after-swap` (teardown + ScrollTrigger refresh). Drive `ScrollTrigger.update` from Lenis and drive `lenis.raf` from `gsap.ticker` (one clock, not two). Hand-author the hero shader as a single full-screen-quad GLSL fragment shader on a raw WebGL2 context (no Three.js, no helper lib needed) with `failIfMajorPerformanceCaveat: true` so blacklisted/software GPUs fall straight to the static fallback. Gate cursor + magnetism behind `(pointer: fine) and (hover: hover)`. Treat reduced-motion as the *default safe state* and progressively enhance up from it.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Smooth scroll (FX-01, Lenis) | Browser / Client | — | Pure client behavior; hijacks native scroll. Must not exist server-side or pre-JS. |
| Scroll reveals (FX-02, GSAP/ScrollTrigger) | Browser / Client | — | Animates pre-rendered DOM (`reveal` hooks already in markup). Server emits inert markup; client animates. |
| Hero WebGL shader (FX-03) | Browser / Client | CDN/Static (fallback image) | Live shader is client-only; the **fallback** is a static asset served from `public/`. |
| Custom cursor + magnetism (FX-04) | Browser / Client | — | Pointer-driven, desktop-only. No server role. |
| Page transitions (NAV-04) | Frontend Server (SSR/SSG) + Client | — | `ClientRouter` component is emitted at build into `<head>` (BaseLayout); the swap + animations run client-side. |
| Conversion path (CTA, content) | Frontend Server (SSG) | — | **Hard constraint:** renders and is interactive at the HTML tier *before* any motion JS (D-20). Motion never owns the CTA's existence. |

**Tier note for the planner:** Nothing in this phase belongs on a backend/API tier — there is none (static GitHub Pages, no backend per CLAUDE.md). The only "server" tier is Astro's build-time static generation, which owns exactly one motion concern: placing `<ClientRouter />` and the inert `reveal`/markup hooks. Everything else is client.

## User Constraints (from CONTEXT.md)

### Locked Decisions (D-01 … D-22 — verbatim intent; do not relitigate)

**Hero WebGL shader (FX-03)**
- **D-01:** Aesthetic = grain + glitch/chromatic (scanlines, chromatic aberration, digital glitch bursts), echoing the existing film-grain overlay.
- **D-02:** Color = navy/black field (`#0a0c14`) with red accents (`#c0192c` bleed, `#e8223b` glow) — minority accent only; keep hero text legible.
- **D-03:** Reaction = mouse-reactive (distorts toward cursor); pointer input throttled for perf.
- **D-04:** Legibility = shader sits behind a contrast/vignette overlay; headline + CTA always AA-readable. No-WebGL fallback = static grain/gradient image (progressive enhancement; hero fully readable without WebGL).
- **D-05:** Hero-on-scroll = parallax fade + glitch-intensity ramp, then dissolve into next section. NOT a scroll-pin.

**Cursor & micro-interactions (FX-04)**
- **D-06:** Custom cursor = blend-mode `difference` invert circle.
- **D-07:** Magnetic pull on interactive elements + cursor grows over them (CTA, links, cards). Pull radius ~48px (`--space-xl`), element displacement ≤8px (`--space-2xs`).
- **D-08:** Scope = desktop / fine-pointer only — gated by `@media (pointer: fine) and (hover: hover)`. Touch keeps native cursor, no magnetism.
- **D-09:** Micro-interactions = tasteful, cohesive set on buttons/nav/package cards (lift / underline-draw / small glitch flicker echoing the hero shader).

**Scroll reveals & smooth scroll (FX-01, FX-02)**
- **D-10:** Reveal energy = bold + graffiti — staggered entrances with clip/mask "spray" wipes + offset slides (24/32/48px travel).
- **D-11:** Display headings (`A Another Tag`) animate split per word/char (staggered).
- **D-12:** Strongest reveals concentrated on the landing's showcase moments; dedicated pages get subtler treatment.
- **D-13:** Lenis feel = smooth but snappy — short duration / light inertia (target ~0.8–1.0s duration, low lerp). Never slows the path to the CTA.

**Landing choreography (bespoke moments on top of D-10)**
- **D-14:** Gallery teaser = scroll-driven horizontal marquee/track previewing `/galeria`.
- **D-15:** Package cards = staggered reveal + subtle 3D tilt/hover.
- **D-16:** Featured work = parallax depth against background on scroll.

**Page transitions, intro, chrome**
- **D-17:** Transition = quick glitch wipe (fast wipe + brief glitch/chromatic flash). Astro View Transitions.
- **D-18:** Brief glitch-tag intro (~1s) on first visit only, while shader+fonts init. Skippable, instant on repeat visits, disabled under reduced-motion, never blocks CTA/content.
- **D-19:** Nav = hide-on-scroll-down / show-on-scroll-up. Floating "Abrir Ticket" CTA stays persistent with a subtle pulse/entrance.

**Motion safety & performance (hard constraint)**
- **D-20:** Progressive enhancement — hero text + CTA render and work before any motion JS; Lenis/GSAP/shader load deferred after first paint; fully usable with JS disabled or slow.
- **D-21:** Reduced-motion = partial reduce — disable smooth-scroll inertia, bold reveals, live shader, custom cursor; keep gentle fades + a static shader. All content/CTA present.
- **D-22:** Mobile = full motion incl. live shader, BUT shader runs ambient/autonomous on touch (no pointer to follow) and falls back to static grain image if it can't meet the hard perf budget on low-end devices. **Performance wins ties.**

### Claude's Discretion
- Exact GSAP/ScrollTrigger + Lenis wiring, View Transitions setup, shader GLSL authoring, concrete perf-budget thresholds, Lenis duration/easing values, per-heading split-text mechanics.
- Hand-authored shader vs. a thin GLSL/canvas helper — open, provided it stays "one shader, not a 3D scene" and meets D-04/D-20/D-22.

### Deferred Ideas (OUT OF SCOPE — ignore completely)
- Ambient music player / audio toggle (v2, FX2-02).
- Real-time 3D avatar viewer / Three.js / any real 3D scene (v2, FX2-01).
- Gallery filter by category/tag (v2, GAL2-01); gallery rendering itself is Phase 4.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FX-01 | The site uses smooth scrolling | Lenis 1.3.25 (Standard Stack); canonical RAF + ScrollTrigger wiring (Pattern 1); reduced-motion + touch gating (Pitfall 4, D-13/D-21). |
| FX-02 | Sections animate / reveal on scroll | GSAP 3.15 + ScrollTrigger; existing `.reveal` hooks already in markup (Code Examples §Reveal); SplitText for D-11 (now free, see State of the Art); refresh-on-swap (Pitfall 1). |
| FX-03 | Hero displays a WebGL shader (noise/distortion) | Hand-authored single full-screen-quad GLSL on WebGL2 (Pattern 3); `failIfMajorPerformanceCaveat` + context-lost fallback detection (Pitfall 5); coexistence with film-grain overlay (Pitfall 6). |
| FX-04 | Cursor has an interactive effect | Custom cursor + `gsap.quickTo` magnetism (Pattern 4); pointer/hover media gating (D-08); non-interference with FloatingCTA/DiscordModal (Pitfall 7). |
| NAV-04 | Animated page transitions | Astro 7 `ClientRouter` from `astro:transitions` (Standard Stack + Pattern 2); lifecycle-driven init/teardown is the core integration risk (Pitfall 1, 2, 3). |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `lenis` | **1.3.25** | Smooth scroll (FX-01) | The current, maintained name of the library formerly `@studio-freight/lenis`. Repo `darkroomengineering/lenis`. Has a documented, first-class GSAP ScrollTrigger integration recipe. `[VERIFIED: npm registry]` (published 2026-06-26) + `[CITED: github.com/darkroomengineering/lenis]` |
| `gsap` | **3.15.0** | ScrollTrigger reveals, SplitText, parallax, tilt, quickTo magnetism (FX-02/04) | Industry-standard animation engine; **100% free incl. all plugins** since 3.13 (May 2025, Webflow). ScrollTrigger + SplitText are exactly the D-10/D-11 toolset. `[VERIFIED: npm registry]` (published 2026-04-13) + `[CITED: gsap.com/blog/3-13]` |
| `astro:transitions` → `ClientRouter` | built into **astro 7.0.3** | Page transitions (NAV-04) | Ships *inside* Astro — no separate install. The component was renamed `ViewTransitions` → `ClientRouter` in Astro 5; **Astro 7 uses `ClientRouter`**. `[CITED: docs.astro.build/en/guides/view-transitions]` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) — hand-authored GLSL | n/a | Hero shader (FX-03) | A single full-screen-quad fragment shader on a raw WebGL2 context. No library needed and none recommended: pulling in a helper risks bundle bloat and the "one shader, not a 3D scene" line (D-disc). Three.js is explicitly OUT (v2). |
| GSAP `SplitText` plugin | bundled in gsap 3.15 | Split-per-word/char headings (D-11) | Free since 3.13, rewritten with baked-in screen-reader accessibility + masking for reveals — directly serves the clip/mask "spray" wipe (D-10). Import from `gsap/SplitText`. `[CITED: gsap.com/blog/3-13]` |
| GSAP `ScrollTrigger` plugin | bundled in gsap 3.15 | All scroll reveals/parallax (FX-02, D-10/D-16) | Import from `gsap/ScrollTrigger`, `gsap.registerPlugin(ScrollTrigger)`. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-authored GLSL | A thin canvas/GLSL helper (e.g. a micro full-screen-quad util) | D-disc allows it. Verdict: **not worth a dependency** — a full-screen quad + one fragment shader is ~40 lines of boilerplate; a lib adds bundle weight against the D-20 budget for no real gain. Keep it hand-rolled. |
| GSAP ScrollTrigger reveals | Native `IntersectionObserver` + CSS | IO is lighter, but D-10/D-11 (split-text, staggered clip-mask spray wipes, scrub parallax) are exactly what GSAP exists for; reimplementing is the "Don't Hand-Roll" trap. Use GSAP. |
| Lenis | Native CSS `scroll-behavior: smooth` (already in `global.css` line 28) | Native smooth only smooths *programmatic* jumps, not wheel inertia (the D-13 "feel"). Keep Lenis for FX-01; **note** the existing `html { scroll-behavior: smooth }` should be removed/guarded when Lenis is active to avoid double-handling. |

**Installation:**
```bash
npm install lenis@1.3.25 gsap@3.15.0
# astro ClientRouter needs NO install — it ships with astro 7.0.3
```

**Version verification (performed this session):**
- `npm view astro version` → `7.0.3` (dist-tag `latest`). Confirms `ClientRouter`-era API, NOT the old `ViewTransitions`.
- `npm view lenis version` → `1.3.25`, `time.modified` 2026-06-26, repo `github.com/darkroomengineering/lenis`. The `@studio-freight/lenis` scope is the **old** name (frozen at 1.0.42) — use unscoped `lenis`.
- `npm view gsap version` → `3.15.0`, `time.modified` 2026-04-13, created 2014. Mature.

## Package Legitimacy Audit

| Package | Registry | Age | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-------------|-----------|-------------|
| `gsap` | npm | created 2014-08 (~12 yrs) | github.com/greensock/GSAP | **[OK]** | Approved |
| `lenis` | npm | created 2023-04 (~3 yrs) | github.com/darkroomengineering/lenis | **[OK]** | Approved |
| `astro:transitions` (ClientRouter) | n/a — built into `astro` (already installed) | n/a | github.com/withastro/astro | n/a (not a new install) | Approved |

- **slopcheck verdict:** scanned a temp `package.json` with `slopcheck scan` (slopcheck 0.6.1) → both `gsap` and `lenis` returned `[OK]`. (`slopcheck install` was avoided because it installs; `scan` validates without installing.)
- **Postinstall scripts:** `npm view lenis scripts.postinstall` and `npm view gsap scripts.postinstall` both empty — no install-time scripts. Clean.
- **Packages removed due to [SLOP]:** none.
- **Packages flagged [SUS]:** none.

> All recommended packages are `[OK]` and `[VERIFIED: npm registry]` (confirmed on the correct ecosystem registry, npm, AND cross-checked against their official repos). No `checkpoint:human-verify` gating required for supply-chain reasons — but the planner should still pin exact versions (consistent with Phase 1's audit-clean pinning practice, per UI-SPEC Registry Safety).

## Architecture Patterns

### System Architecture Diagram

```
                          ┌─────────────────────────────────────────────┐
   First HTML request ──► │  Astro SSG build → static HTML               │
                          │  • hero text + CTA (interactive, no JS)      │  ◄── D-20 hard floor:
                          │  • inert .reveal hooks already in markup     │      everything below
                          │  • <ClientRouter/> in <head> (BaseLayout)    │      is enhancement
                          │  • <div data-hero-shader> + <img static fb>  │
                          └───────────────┬─────────────────────────────┘
                                          │ first paint complete
                       deferred (idle / after paint, D-20)
                                          ▼
        ┌──────────────────── motion controller (src/scripts/motion/) ───────────────────┐
        │  reads: prefers-reduced-motion · (pointer:fine & hover:hover) · WebGL capability │
        │                                                                                  │
        │   reduced-motion? ──yes──► gentle CSS fades + STATIC shader img + native cursor   │
        │        │ no                                                                       │
        │        ▼                                                                          │
        │   ┌─ Lenis ─┐  scroll  ┌─ GSAP ticker ─┐  drives  ┌─ ScrollTrigger ─┐            │
        │   │ smooth  │ ───────► │ single clock   │ ───────► │ reveals/parallax │            │
        │   │ scroll  │ ◄─raf────│ lenis.raf(t)   │          │ split-text       │            │
        │   └─────────┘          └────────────────┘          └──────────────────┘            │
        │        │                                                                          │
        │   WebGL2 ok & perf ok? ─yes─► live hero shader (rAF, throttled pointer uniform)    │
        │        │ no (failIfMajorPerformanceCaveat / context-lost / mobile budget miss)     │
        │        └──────────────────────────────► swap to STATIC grain image, kill rAF       │
        │                                                                                    │
        │   pointer:fine? ─yes─► custom cursor (blend-difference) + gsap.quickTo magnetism    │
        └────────────────────────────────────────┬───────────────────────────────────────────┘
                                                  │
                        in-site link click (ClientRouter intercepts)
                                                  ▼
   astro:before-swap ─► TEARDOWN: lenis.destroy() · ScrollTrigger.getAll().forEach(kill)
                        · remove cursor/shader listeners · cancelAnimationFrame
                                                  ▼
   (DOM swapped + glitch-wipe transition animation, D-17)
                                                  ▼
   astro:page-load ──► RE-INIT controller on the new DOM (idempotent) · ScrollTrigger.refresh()
                       · CTA + content already present throughout (never torn down)
```

Read the primary use case top-to-bottom: a visitor gets a working hero + CTA from static HTML (no JS needed), motion enhances after paint, and on every in-site navigation the controller cleanly tears down and re-initialises so nothing leaks.

### Recommended Project Structure
```
src/scripts/
├── chrome.ts                 # EXISTING — nav/lang/modal (do not break; see Pitfall 8)
└── motion/                   # NEW — the motion layer, code-split, deferred
    ├── index.ts              # lifecycle controller: wires astro:page-load / before-swap; capability gates
    ├── smooth-scroll.ts      # Lenis init + destroy; exports the gsap.ticker driver
    ├── reveals.ts            # ScrollTrigger reveals + SplitText (D-10/D-11/D-12)
    ├── choreography.ts       # bespoke: gallery marquee (D-14), card tilt (D-15), parallax (D-16)
    ├── hero-shader/
    │   ├── shader.ts         # WebGL2 ctx, full-screen quad, rAF loop, pointer uniform, fallback swap
    │   ├── glitch.frag       # fragment shader: grain + chromatic aberration + glitch bursts
    │   └── quad.vert         # trivial pass-through vertex shader
    ├── cursor.ts             # custom cursor + magnetism (D-06/07/08), pointer-fine gated
    ├── transitions.ts        # glitch-wipe View Transition animation (D-17) + intro (D-18)
    └── motion-prefs.ts       # prefers-reduced-motion + pointer/hover + WebGL capability detection
```
```
src/styles/
└── motion.css                # NEW — cursor styles, reveal initial states, transition keyframes,
                              #        @media (prefers-reduced-motion) overrides
```
The shader can be imported as a module that lives in `src/`; GLSL strings can be inlined or imported as `?raw` text (Vite supports `import frag from './glitch.frag?raw'`). Keep shader assets out of `public/` — only the **static fallback image** goes in `public/` (e.g. `public/hero-fallback.avif`).

### Pattern 1: One clock — Lenis driven by GSAP ticker
**What:** Do NOT run two animation loops. Let GSAP's ticker be the single rAF source; feed Lenis from it; feed ScrollTrigger from Lenis's scroll event.
**When to use:** Always, whenever Lenis + ScrollTrigger coexist (FX-01 + FX-02).
**Example:**
```javascript
// Source: github.com/darkroomengineering/lenis (official GSAP integration recipe) [CITED]
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis({
  duration: 0.9,                 // D-13 "snappy" — below the 1.2 default
  lerp: 0.08,                    // light inertia; tune 0.06–0.1
  smoothWheel: true,
  syncTouch: false,              // touch keeps native momentum (see Pitfall 4)
  // NOTE: do NOT set autoRaf — gsap.ticker is the driver below
});

lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000)); // gsap ticker time is in seconds
gsap.ticker.lagSmoothing(0);
```
**Critical:** `gsap.ticker` provides time in **seconds**; `lenis.raf` expects **milliseconds** — hence `time * 1000`. Getting this wrong makes scroll feel frozen or hyperspeed.

### Pattern 2: `ClientRouter` setup + lifecycle-driven motion
**What:** Add `<ClientRouter />` once in `BaseLayout`'s `<head>`. Move ALL motion init out of top-level module code and into `astro:page-load`; do teardown in `astro:before-swap`.
**When to use:** NAV-04 + every other effect (because module scripts run once, Pitfall 1).
**Example:**
```astro
---
// Source: docs.astro.build/en/guides/view-transitions [CITED]
import { ClientRouter } from 'astro:transitions';
---
<head>
  <!-- ...existing head... -->
  <ClientRouter />
</head>
```
```javascript
// src/scripts/motion/index.ts — runs once, but its listeners fire on every nav
document.addEventListener('astro:page-load', () => {
  initMotion();            // idempotent: re-reads DOM, rebuilds ScrollTriggers
});
document.addEventListener('astro:before-swap', () => {
  teardownMotion();        // destroy Lenis, kill all ScrollTriggers, remove listeners
});
```

### Pattern 3: Single full-screen-quad WebGL2 shader with hard fallback
**What:** Create a WebGL2 context with `failIfMajorPerformanceCaveat: true`. If the context is null (no WebGL, blacklisted GPU, software renderer), never touch the canvas — leave the static `<img>` fallback visible. Render one full-screen triangle/quad; the fragment shader does grain + chromatic aberration + glitch.
**When to use:** FX-03. Honors D-04 (fallback), D-22 (perf wins ties), D-20 (deferred).
**Example:**
```javascript
// Source: synthesized from MDN "Detect WebGL" + WEBGL_lose_context guidance [CITED]
function getShaderContext(canvas) {
  const gl = canvas.getContext('webgl2', {
    failIfMajorPerformanceCaveat: true,  // ← drops software-rendered / blacklisted GPUs (D-22)
    antialias: false,                    // full-screen quad needs no MSAA
    alpha: true,                         // composite over the navy page
    powerPreference: 'high-performance',
  });
  return gl; // null → keep static fallback, do NOT init
}
// Also: canvas.addEventListener('webglcontextlost', swapToStaticFallback)
```
**Pointer throttling (D-03):** never set the uniform synchronously on `pointermove`. Cache the latest coords in the move handler; read them once per rAF frame and update the `u_mouse` uniform. On touch (no `pointer:fine`), don't bind pointermove at all — drive the distortion from `u_time` (ambient/autonomous, D-22).

### Pattern 4: Custom cursor + magnetism with `gsap.quickTo`
**What:** A fixed-position `<div>` with `mix-blend-mode: difference`, moved with `gsap.quickTo` for a smooth lerp follow. Magnetism nudges *interactive elements* (≤8px) toward the cursor inside a ~48px catch zone, and grows the cursor over them.
**When to use:** FX-04, only when `(pointer: fine) and (hover: hover)` matches.
**Example:**
```javascript
// Source: GSAP docs — gsap.quickTo for high-frequency pointer follow [CITED: gsap.com]
const xTo = gsap.quickTo(cursorEl, 'x', { duration: 0.25, ease: 'power3' });
const yTo = gsap.quickTo(cursorEl, 'y', { duration: 0.25, ease: 'power3' });
window.addEventListener('pointermove', (e) => { xTo(e.clientX); yTo(e.clientY); });
```
**Hard rule (D-08, Pitfall 7):** gate the *entire* cursor + magnetism behind `window.matchMedia('(pointer: fine) and (hover: hover)').matches`. Magnetism must move the element ≤8px and **never** the click hit-test in a way that steals/shifts the FloatingCTA or Discord-modal targets.

### Anti-Patterns to Avoid
- **Two rАF loops:** running `autoRaf: true` (Lenis) *and* `gsap.ticker` simultaneously — double-stepping, jank. Pick the ticker (Pattern 1).
- **Top-level module init:** initialising Lenis/GSAP at module scope. With `ClientRouter`, the module runs once and your effects silently die after the first navigation (Pitfall 1).
- **Forgetting `ScrollTrigger.refresh()` after swap:** triggers compute against stale page dimensions → reveals never fire or fire at wrong scroll positions (Pitfall 2).
- **Animating layout properties:** animating `top/left/width/height` instead of `transform`/`opacity` — causes reflow, blows the perf budget. Reveals slide via `transform: translateY()` (24/32/48px, on-scale per UI-SPEC).
- **Tinting non-CTA effects red:** UI-SPEC reserves red for the CTA + shader bleed; cursor/reveals/tilt stay achromatic/blend-mode.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Wheel-inertia smooth scroll | Custom scroll lerp on `wheel` | **Lenis** | Touchpad/wheel/keyboard normalization, anchor handling, `scrollTo`, accessibility edge cases — Lenis already solves all of it. |
| Scroll-position-driven reveals/parallax | `IntersectionObserver` + manual math | **GSAP ScrollTrigger** | Scrub, snap, refresh-on-resize, start/end markers, batch — reinventing is the classic trap and breaks on resize/View-Transition swap. |
| Splitting text per word/char | Manual `innerHTML` char-wrapping | **GSAP SplitText** | Free since 3.13, with baked-in screen-reader accessibility and built-in masking for reveals — hand-rolling breaks a11y and re-splits wrong on the custom `.ttf` font (Pitfall 9). |
| Page-transition orchestration | Custom fetch + DOM swap + History API | **Astro `ClientRouter`** | Built in; handles scroll restoration, prefetch, `transition:persist`, fallback for non-VT browsers. |
| Smooth high-frequency cursor follow | `setInterval`/manual lerp on pointermove | **`gsap.quickTo`** | Frame-synced, GC-friendly, interruptible; manual loops jank and leak. |
| 3D scene for the hero | Three.js / WebGL scene graph | **One hand-authored fragment shader** | Explicitly OUT (v2). A full-screen quad needs no scene graph; Three.js is ~150KB+ against the D-20 budget. |

**Key insight:** This phase's danger is not "can we animate" — GSAP/Lenis make that easy. It's **lifecycle hygiene under `ClientRouter`**. Every "don't hand-roll" library still needs disciplined teardown/re-init you DO have to write yourself; that glue (the motion controller) is the actual deliverable.

## Common Pitfalls

### Pitfall 1: Module scripts run once — effects die after first navigation
**What goes wrong:** You init Lenis/GSAP/cursor/shader at the top of a `<script>` module. It works on hard load, then on the first in-site link click the DOM swaps but your init never re-runs → dead scroll, frozen reveals, ghost cursor.
**Why it happens:** Astro bundles module scripts and **executes them exactly once**; `ClientRouter` swaps DOM without a full reload. `[CITED: docs.astro.build/en/guides/view-transitions]`
**How to avoid:** Put init in `astro:page-load` and teardown in `astro:before-swap` (Pattern 2). Make `initMotion()` idempotent (guard against double-binding).
**Warning signs:** "Works on refresh, breaks after clicking a nav link."

### Pitfall 2: ScrollTrigger computes against stale dimensions after swap
**What goes wrong:** Reveals don't fire, fire at the wrong scroll point, or markers are misplaced after a navigation.
**Why it happens:** ScrollTriggers created before the DOM swap cache the old page's geometry. `[CITED: gsap.com community — "Astro viewtransitions breaks ScrollTrigger the second time I enter a page"]`
**How to avoid:** In teardown, `ScrollTrigger.getAll().forEach(t => t.kill())`; after re-init on `astro:page-load`, call `ScrollTrigger.refresh()`. Also `refresh()` after fonts load and after the intro (D-18) finishes, since the `.ttf` swap changes heights.
**Warning signs:** Reveals only work after a manual page reload.

### Pitfall 3: Lenis + ClientRouter → "Too many calls to Location or History APIs"
**What goes wrong:** Console floods with history-throttle errors and navigation breaks after a few scrolls. `[CITED: github.com/withastro/astro/issues/12725]` `[CITED: github.com/darkroomengineering/lenis/issues/348]`
**Why it happens:** Lenis manually writes `window.scroll` every frame; Astro's router saves scroll position on scroll → it saves excessively and the browser throttles History API calls.
**How to avoid:** `lenis.destroy()` in `astro:before-swap` so Lenis isn't writing scroll during the swap; re-create it in `astro:page-load`. Reset scroll deterministically on new page (`lenis.scrollTo(0, { immediate: true })` after re-init, or rely on Astro's restoration with Lenis torn down during the swap window). Confirm in Firefox specifically (the linked Lenis issue was Firefox-triggered).
**Warning signs:** Errors mentioning "Location or History APIs within a short timeframe"; back/forward gets stuck.

### Pitfall 4: Reduced-motion / touch not honored → forces smoothing where it shouldn't
**What goes wrong:** Smooth scroll fights native momentum on touch, or runs under `prefers-reduced-motion`.
**Why it happens:** Lenis `syncTouch`/smoothing applied unconditionally.
**How to avoid:** Treat reduced-motion as the **default**. Only init Lenis smoothing when `!prefers-reduced-motion`. Keep `syncTouch: false` so touch uses native momentum (D-22 mobile still scrolls naturally; the *shader* is what stays live on mobile, not necessarily smoothed scroll). Under reduced-motion: no Lenis inertia, no bold reveals, no live shader, no custom cursor — only gentle fades + static shader image (D-21).
**Warning signs:** Janky/laggy scroll on phones; motion plays for users who set reduce.

### Pitfall 5: WebGL "supported" but actually software-rendered / lost
**What goes wrong:** `getContext('webgl2')` returns a context on a weak device, the shader runs at 8fps, and the page feels broken — violating "perf wins ties" (D-22).
**Why it happens:** A plain `getContext` check passes even on blacklisted/software GPUs. `[CITED: MDN Detect WebGL; webglcontextlost event]`
**How to avoid:** Pass `failIfMajorPerformanceCaveat: true` (returns null on software fallback). Listen for `webglcontextlost` and swap to the static image. Add a runtime frame-budget guard: if measured frame time exceeds budget over the first ~1s, kill the rAF loop and reveal the static fallback (degradation order: live shader → static image **before** dropping legibility/CTA, UI-SPEC).
**Warning signs:** Hero stutters on integrated-GPU laptops / low-end Android.

### Pitfall 6: Shader doubles the existing film-grain cost / clashes
**What goes wrong:** The GLSL grain stacks on top of the existing `body::after` SVG-noise overlay (`global.css` line 62, `z-index: 9999`, fixed) → visually muddy and double cost.
**Why it happens:** Two independent grain layers, the CSS one painting over the whole viewport above everything.
**How to avoid:** The shader's grain is the hero's grain; either (a) keep the CSS overlay as the *global* page grain and tune the shader grain to harmonize (lower amplitude in the hero region), or (b) reduce the CSS overlay opacity over the hero. Do not run both at full strength in the hero. The CSS overlay's `z-index: 9999` sits **above** the shader canvas — confirm the contrast/vignette legibility overlay (D-04) is layered correctly relative to both so AA holds at peak glitch.
**Warning signs:** Hero looks noisier than the rest of the site; measurable extra paint cost in the hero.

### Pitfall 7: Cursor magnetism steals/shifts the CTA or modal hit target
**What goes wrong:** Magnetic displacement moves the FloatingCTA or a Discord-modal control enough to miss clicks, or the custom cursor's element captures pointer events.
**Why it happens:** Magnetism moves layout/hit area, or the cursor div isn't `pointer-events: none`.
**How to avoid:** Cursor div is always `pointer-events: none`. Magnetism uses `transform` only (visual, ≤8px), never changes the element's hit box meaningfully; cap displacement at `--space-2xs` (8px). Verify FloatingCTA (`.dc-trigger`) and DiscordModal still open on click with the cursor active. Desktop-only gate (D-08) means touch is never affected.
**Warning signs:** "Abrir Ticket" feels slippery/hard to click on desktop.

### Pitfall 8: Breaking the existing `chrome.ts` listeners on swap
**What goes wrong:** `chrome.ts` (nav drawer, lang switch, Discord modal) is a module script (runs once). After a `ClientRouter` swap, its `DOMContentLoaded`-gated `init()` never re-runs → nav/modal dead on subsequent pages.
**Why it happens:** `chrome.ts` currently keys off `document.readyState`/`DOMContentLoaded` (lines 131–135), which only fire on hard load.
**How to avoid:** This is a **pre-existing integration cost of enabling NAV-04** — `chrome.ts` must be migrated to re-init on `astro:page-load` too (or its listeners delegated to `document` so they survive swaps). The planner must include a task to make `chrome.ts` `ClientRouter`-safe; it is not optional once `<ClientRouter/>` is added. The Nav scroll-state listener also needs to coordinate with the new D-19 hide-on-scroll behavior (don't double-bind scroll).
**Warning signs:** Hamburger/lang menu/Discord modal stop working after navigating once.

### Pitfall 9: SplitText reflow / FOUT on the custom `.ttf` display font
**What goes wrong:** Splitting `A Another Tag` headings before the `.ttf` loads measures wrong glyph widths → wrong line breaks, CLS, jumpy reveals.
**Why it happens:** The display face is a self-hosted `.ttf` with `font-display: swap` (`global.css` lines 10–16); split-text before the font swaps in measures the fallback font.
**How to avoid:** Wait for `document.fonts.ready` (or specifically the `A Another Tag` face) before running SplitText on display headings; reserve final layout, then animate (UI-SPEC type-in-motion: "reserve final layout first, then animate"). Under reduced-motion, collapse split-text to a single gentle whole-heading fade (no per-char). `ScrollTrigger.refresh()` after fonts ready (ties to Pitfall 2).
**Warning signs:** Headings reflow/jump ~100ms after load; CLS in Lighthouse.

## Runtime State Inventory

Phase 2 is **additive client behavior on existing static markup** — it stores no persistent data and registers no external/OS state. Checked each category:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no datastore writes. (The only `localStorage` use is the pre-existing `nocturna-lang` key in `chrome.ts`, untouched by this phase.) | None — verified by grep of `src/scripts/chrome.ts`. |
| Live service config | None — static GitHub Pages, no backend/services (CLAUDE.md). | None. |
| OS-registered state | None — browser-only. | None. |
| Secrets/env vars | None — no env reads; brand values read from CSS tokens, not env. | None. |
| Build artifacts | New deps add to `package-lock.json` / `node_modules`; the static fallback image is a new `public/` asset. No stale-artifact risk (greenfield additions). | Add `lenis`+`gsap` to lockfile; add `public/hero-fallback.*`. |

**The one cross-cutting runtime concern is not "state" but "lifecycle leakage"** — listeners/instances surviving `ClientRouter` swaps (Pitfalls 1–3, 8). That is handled by the teardown contract, not a data migration.

## Code Examples

### Reveal hooks already present in markup (reuse, do not re-author)
```html
<!-- Source: existing src/components/sections/*.astro + index.astro [VERIFIED: codebase grep] -->
<div class="section-header reveal"> … </div>     <!-- About, Teaser, PackagesSummary, ServicesPage, Terms -->
<div class="card … reveal">                       <!-- PackageCard.astro:40 -->
<p class="hero-eyebrow reveal">                   <!-- index.astro hero -->
```
GSAP targets `.reveal`; per D-12, apply the **bold** spray-wipe/stagger variant on landing sections and a **subtler** fade on `/servicios`, `/galeria`, `/terminos`. There is **no** `data-reveal` attribute and `loading="lazy"` was not found in current markup — the hook is the `reveal` **class** (Phase-1 left it inert).

### Capability gate (the single source of truth for degradation)
```javascript
// src/scripts/motion/motion-prefs.ts
export const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer   = matchMedia('(pointer: fine) and (hover: hover)').matches;
export function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
  } catch { return false; }
}
// Decision: liveShader = webglOK() && !prefersReduced && perfBudgetOK
//           customCursor = finePointer && !prefersReduced
//           smoothScroll = !prefersReduced
```

### Glitch-wipe View Transition (D-17) — custom animation
```astro
---
// Source: docs.astro.build/en/guides/view-transitions (custom transition:animate) [CITED]
const glitchWipe = {
  old: { name: 'glitch-out', duration: '0.28s', easing: 'steps(4, end)' },
  new: { name: 'glitch-in',  duration: '0.28s', easing: 'steps(4, end)' },
};
const wipe = { forwards: glitchWipe, backwards: glitchWipe };
---
<main transition:animate={wipe}> … </main>
```
Keep it ≤~300ms (D-17 "kept short so navigation stays snappy") and add the RGB-split/chromatic red fringe in the `@keyframes`. Under reduced-motion, fall back to Astro's built-in `fade` or `none`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@studio-freight/lenis` | `lenis` (unscoped) | repo moved to `darkroomengineering` | Install `lenis`, not the scoped name (frozen at 1.0.42). |
| `import { ViewTransitions } from 'astro:transitions'` | `import { ClientRouter } from 'astro:transitions'` | Astro 5 (rename) | On Astro 7.0.3 you MUST use `ClientRouter`; `ViewTransitions` is removed/deprecated. `[CITED: docs.astro.build]` |
| GSAP SplitText/MorphSVG = paid "Club GSAP" | All GSAP plugins 100% free incl. commercial | GSAP 3.13, May 2025 (Webflow) | No license gate, no token; install plain `gsap` and import `gsap/SplitText`. `[CITED: gsap.com/blog/3-13]` |
| Lenis `new Lenis()` + own rAF loop | `autoRaf: true` OR (preferred here) drive via `gsap.ticker` | Lenis 1.x | Use the gsap.ticker driver for ScrollTrigger sync (Pattern 1); don't run both. |

**Deprecated/outdated (do not use):**
- `ViewTransitions` component name → use `ClientRouter`.
- `@studio-freight/lenis` → use `lenis`.
- Any GSAP "register license token" / Club CDN gating → gone since 3.13.
- The existing `html { scroll-behavior: smooth }` (global.css:28) conflicts with Lenis — guard/remove it when smooth scroll is active.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The exact teardown recipe for the Lenis+ClientRouter history-throttle bug (destroy in `before-swap`, re-init in `page-load`) is the right fix. The bug is documented (Astro #12725, Lenis #348) but the issue body doesn't contain canonical code — the recipe is synthesized from Lenis's `destroy()` API + Astro's lifecycle docs. | Pitfall 3 | Medium — if insufficient, may need additionally to suppress Astro scroll-save during the Lenis-active window or set `data-astro-history`. Validate in Firefox during execution (Validation Architecture). |
| A2 | Concrete perf thresholds (e.g. frame-time budget, when to drop the shader) are left to the executor per D-disc; no specific FPS/KB number is locked here. UI-SPEC only requires "~60fps on mid-range desktop, degrade gracefully below." | Performance budget | Low — intentionally discretionary; planner should pick a measurable budget (suggest: bail to static if >~22ms/frame sustained ~1s, or on `failIfMajorPerformanceCaveat`). |
| A3 | `chrome.ts` must be migrated to be `ClientRouter`-safe as part of this phase. This is inferred from its `DOMContentLoaded` gating + the documented once-only module execution; not stated in CONTEXT.md. | Pitfall 8 | Medium-high if missed — nav/modal silently break after one navigation. The planner MUST include this task. |
| A4 | Driving `lenis.raf` from `gsap.ticker` (one clock) is preferred over `autoRaf`. This is the official Lenis recipe but the choice between them is a judgment call; both work if not combined. | Pattern 1 | Low. |

## Open Questions

1. **Does Astro's built-in scroll restoration cooperate with a torn-down Lenis, or does the new page need an explicit `scrollTo(0, {immediate:true})`?**
   - What we know: Tearing down Lenis in `before-swap` removes the history-throttle trigger (Pitfall 3).
   - What's unclear: Whether scroll lands correctly on the new page or needs an explicit reset post-`page-load`.
   - Recommendation: Implement teardown first, test back/forward + fresh nav; add an explicit `lenis.scrollTo(0,{immediate:true})` on `page-load` only if restoration misbehaves.

2. **Intro (D-18) "first visit only" persistence mechanism.**
   - What we know: Must be skippable, instant on repeat, reduced-motion-disabled, never block CTA.
   - What's unclear: Session vs. persistent — likely `sessionStorage` (per-session) vs `localStorage` (ever-seen). CONTEXT says "instant on repeat visits," implying persistent.
   - Recommendation: `localStorage` flag (`nocturna-intro-seen`), consistent with the existing `nocturna-lang` pattern in `chrome.ts`; gate behind `!prefersReduced`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `lenis` (npm) | FX-01 | ✗ (not yet installed) | 1.3.25 (verified on npm) | none needed — install step |
| `gsap` (npm) | FX-02/04 | ✗ (not yet installed) | 3.15.0 (verified on npm) | none needed — install step |
| `ClientRouter` (astro built-in) | NAV-04 | ✓ | ships in astro 7.0.3 (installed) | Astro auto-provides a non-VT fallback for unsupported browsers |
| WebGL2 (runtime, end-user) | FX-03 | runtime-detected | per device | **static grain/gradient image** (D-04) — this is a designed product fallback, not a build blocker |
| Self-hosted `.ttf` font | D-11 split-text | ✓ | `public/fonts/a-another-tag.ttf` present | `font-display: swap` already set; wait `document.fonts.ready` before split |

**Missing dependencies with no fallback:** none (both npm libs are a routine install; no build blockers).
**Missing dependencies with fallback:** WebGL2 at runtime → static image (by design, D-04/D-22).

## Validation Architecture

> `workflow.nyquist_validation` is `false` in `.planning/config.json`, so a full test-framework section is not required. These are the **meaningful, observable** checks worth wiring as acceptance gates for a motion phase (per research_focus item 6). The project has no test framework today; these are mostly build-time + manual/scriptable browser checks, not unit tests.

| Check | Type | How to observe | Maps to |
|-------|------|----------------|---------|
| No-JS hero + CTA work | Static / build | Build, load `dist/.../index.html` with JS disabled → hero text visible, "Abrir Ticket" clickable | D-20, FX gate |
| Reduced-motion degrades correctly | Manual / scriptable | Emulate `prefers-reduced-motion: reduce` → no smooth-scroll inertia, no live shader (static image shown), no custom cursor, gentle fades only | D-21 |
| No-WebGL fallback | Manual / scriptable | Disable WebGL (or force `failIfMajorPerformanceCaveat`) → static grain image, hero still AA-legible | D-04, FX-03 |
| ClientRouter no-leak | Manual | Navigate landing → /servicios → back → forward several times; assert no growth in `ScrollTrigger.getAll().length`, no duplicate cursors, no "History APIs" console error, nav/modal still work | Pitfalls 1,2,3,8 / NAV-04 |
| CTA reachable in every motion state | Manual | During intro, mid-transition, mid-scroll, reduced-motion, no-WebGL → FloatingCTA clickable and opens Discord modal | D-19 (hard) |
| Touch keeps native cursor | Manual | `(pointer: coarse)` device/emulation → no custom cursor, no magnetism | D-08 |
| No CLS from split-text | Build / Lighthouse | Lighthouse CLS ≈ 0 on landing; headings don't reflow after font swap | Pitfall 9 |
| Lighthouse perf not regressed | Build / Lighthouse | Perf score holds vs. Phase 1 baseline; motion JS code-split & deferred | D-20/D-22 |

**Recommended automation:** a lightweight Playwright smoke (if the planner wants automated coverage) can assert: JS-disabled CTA present, `ScrollTrigger.getAll().length` stable across N navigations, and reduced-motion path renders the static image. These are the highest-signal checks for this phase.

## Security Domain

> `security_enforcement` not present in `.planning/config.json` (treat as enabled), but this phase has a **minimal** security surface: a static site, no backend, no user input, no auth, no data writes (UI-SPEC: "Motion creates, edits, or deletes no data; there are no forms, writes, or confirmations").

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | No auth in this site. |
| V3 Session Management | no | No sessions; only a `localStorage` UI flag. |
| V4 Access Control | no | Fully public static site. |
| V5 Input Validation | minimal | No user input. Only "input" is pointer coordinates → clamped before use as a shader uniform (no injection surface). |
| V6 Cryptography | no | None. |

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Supply-chain (malicious dep) | Tampering | Pin exact versions; `lenis`/`gsap` slopcheck `[OK]`, no postinstall scripts (Package Legitimacy Audit). Run `npm audit` post-install. |
| Third-party script injection | Tampering | No new third-party CDN scripts — both libs are bundled locally via npm/Vite (good for a static GH-Pages CSP posture). Keep shader GLSL inline/local, no remote shader fetch. |
| DoS via runaway rAF on weak devices | DoS (self-inflicted UX) | Frame-budget guard + `failIfMajorPerformanceCaveat` fallback (Pitfall 5) — also a perf control. |

No new attack surface of note; the dominant "safety" concern remains the lifecycle-leak/CTA-survivability contract, covered above.

## Sources

### Primary (HIGH confidence)
- `docs.astro.build/en/guides/view-transitions` — `ClientRouter` import/name, full lifecycle event order (`before-preparation` → `after-preparation` → `before-swap` → `after-swap` → `page-load`), module-scripts-run-once, `transition:persist`, custom `transition:animate`, `astro:page-load` re-init pattern.
- `github.com/darkroomengineering/lenis` — canonical GSAP ScrollTrigger recipe (`lenis.on('scroll', ScrollTrigger.update)`, `gsap.ticker.add(t => lenis.raf(t*1000))`, `lagSmoothing(0)`), constructor defaults (`duration` 1.2, `lerp` 0.1, `smoothWheel`, `syncTouch`), `destroy()`, unscoped package name.
- `gsap.com/blog/3-13` + `webflow.com/updates/gsap-becomes-free` — GSAP 3.13 fully free incl. SplitText (rewritten, a11y + masking).
- MDN: `Detect WebGL`, `webglcontextlost event`, `WEBGL_lose_context` — `failIfMajorPerformanceCaveat`, context-lost handling.
- npm registry (`npm view`) — `astro 7.0.3`, `lenis 1.3.25`, `gsap 3.15.0` versions/dates/repos; no postinstall scripts.
- Codebase (`grep`/`Read`) — `.reveal` hooks present, film-grain overlay `z-index:9999` (`global.css:62`), `.ttf` `font-display:swap` (`global.css:10`), `chrome.ts` `DOMContentLoaded` gating, `BaseLayout` `<head>` + single `<script>` import, no existing client deps.
- slopcheck 0.6.1 `scan` — `lenis` + `gsap` both `[OK]`.

### Secondary (MEDIUM confidence)
- `github.com/withastro/astro/issues/12725` — Lenis + ClientRouter "Too many calls to Location or History APIs" (root cause confirmed; exact fix synthesized, see A1).
- `github.com/darkroomengineering/lenis/issues/348` — same class of bug, Firefox-specific.
- GSAP community forums — "Astro viewtransitions breaks ScrollTrigger the second time I enter a page" (refresh-on-swap requirement).

### Tertiary (LOW confidence)
- General WebGL detection blog (`xjavascript.com`) — corroborates `failIfMajorPerformanceCaveat` advice; superseded by MDN above.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all three verified on npm with dates + official docs/repos; GSAP licensing change confirmed.
- Architecture / wiring (Lenis↔ticker↔ScrollTrigger, ClientRouter lifecycle): HIGH — from official Lenis + Astro docs.
- ClientRouter+Lenis leak fix (Pitfall 3): MEDIUM — bug is documented; exact teardown code synthesized (flagged A1), validate in Firefox.
- Shader fallback strategy: HIGH — MDN-grounded.
- Pitfalls overall: HIGH — corroborated by multiple documented issues + codebase inspection.

**Research date:** 2026-06-28
**Valid until:** ~2026-07-28 (30 days; Astro/Lenis/GSAP all move moderately — re-verify `ClientRouter` API and Lenis version if planning slips a month).
