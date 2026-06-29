# Phase 2: Experimental Motion Layer - Pattern Map

**Mapped:** 2026-06-28
**Files analyzed:** 13 new + 4 modified = 17
**Analogs found:** 17 / 17 (all have at least a role-match; 5 are net-new motion concepts with partial analogs)

> Scope note: This phase adds **client TS/GLSL + CSS + BaseLayout wiring** onto the shipped Phase 1 shell. It introduces **no new Astro components and no new pages** — it animates existing markup. The dominant analog is `src/scripts/chrome.ts` (the established deferred-client-JS entry pattern) and `src/layouts/BaseLayout.astro` (the shell). Every new motion module copies chrome.ts's structure but **must invert one thing**: chrome.ts gates on `DOMContentLoaded` (fires once) — motion must gate on `astro:page-load` / `astro:before-swap` instead (RESEARCH Pitfall 1, 8).

---

## File Classification

| New / Modified File | New? | Role | Data Flow | Closest Analog | Match Quality |
|---------------------|------|------|-----------|----------------|---------------|
| `src/scripts/motion/index.ts` | new | controller (lifecycle) | event-driven | `src/scripts/chrome.ts` | role-match (invert lifecycle gate) |
| `src/scripts/motion/motion-prefs.ts` | new | utility (capability gate) | transform | `src/pages/index.astro` inline detect block | partial (detection idiom) |
| `src/scripts/motion/smooth-scroll.ts` | new | service (Lenis) | event-driven | `src/scripts/chrome.ts` `initNav` scroll listener | role-match |
| `src/scripts/motion/reveals.ts` | new | service (ScrollTrigger/SplitText) | event-driven | `src/scripts/chrome.ts` (init/query/bind idiom) | partial (net-new concept) |
| `src/scripts/motion/choreography.ts` | new | service (marquee/tilt/parallax) | event-driven | `src/scripts/chrome.ts` (`querySelectorAll`+bind) | partial |
| `src/scripts/motion/cursor.ts` | new | service (cursor + magnetism) | event-driven | `src/scripts/chrome.ts` `initDiscordModal` (pointer/listener idiom) | role-match |
| `src/scripts/motion/transitions.ts` | new | service (VT animation + intro) | event-driven | `src/pages/index.astro` (localStorage flag idiom) | partial |
| `src/scripts/motion/hero-shader/shader.ts` | new | service (WebGL2 rAF) | streaming (rAF) | none (net-new) | no-analog (use RESEARCH Pattern 3) |
| `src/scripts/motion/hero-shader/glitch.frag` | new | config (GLSL) | transform | none | no-analog (UI-SPEC color tokens) |
| `src/scripts/motion/hero-shader/quad.vert` | new | config (GLSL) | transform | none | no-analog |
| `src/styles/motion.css` | new | config (styles) | n/a | `src/styles/chrome.css` (reduced-motion + token idiom) | role-match |
| `public/hero-fallback.*` | new | config (static asset) | file-I/O | `public/favicon.png` / `public/fonts/*.ttf` | role-match |
| `package.json` | mod | config | n/a | `package.json` (existing pinned-dep idiom) | exact |
| `src/layouts/BaseLayout.astro` | mod | layout (shell) | request-response | `src/layouts/BaseLayout.astro` (self) | exact |
| `src/scripts/chrome.ts` | mod | controller | event-driven | `src/scripts/chrome.ts` (self — migrate gate) | exact (mandatory, Pitfall 8) |
| `src/styles/global.css` | mod | config | n/a | `src/styles/global.css` (self — guard line 28) | exact |
| `src/pages/[lang]/index.astro` | mod | page (hero markup) | request-response | self (add shader canvas + static `<img>`) | exact |

---

## Pattern Assignments

### `src/scripts/motion/index.ts` (controller, event-driven) — THE deliverable

**Analog:** `src/scripts/chrome.ts`

chrome.ts is the template for "a dependency-free deferred client module with an `init()` that queries the DOM and binds listeners." Copy its **module shape** (top doc comment, named `initX()` functions, single `init()` aggregator) — but **replace its bottom-of-file gate**.

**chrome.ts gate to NOT copy** (lines 125-135 — this is the bug under ClientRouter, Pitfall 1/8):
```typescript
function init(): void {
  initNav();
  initLangSwitch();
  initDiscordModal();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);  // ← fires ONCE; dies after first VT swap
} else {
  init();
}
```

**Replace with the lifecycle gate** (RESEARCH Pattern 2):
```javascript
document.addEventListener('astro:page-load', () => { initMotion(); });   // idempotent re-init
document.addEventListener('astro:before-swap', () => { teardownMotion(); }); // destroy Lenis, kill ST, remove listeners, cancelAnimationFrame
```

**What to replicate from chrome.ts:**
- The `function initX(): void { ... }` + single aggregator structure (lines 18, 46, 91, 125).
- `document.querySelector<HTMLElement>('[data-...]')` typed-query idiom (lines 19-21) — use `data-*` hooks, not classes, for JS targets.
- Defensive null guards (`if (nav) {...}`, `if (!overlay) return;` lines 24, 95) — every effect must no-op if its target is absent.
- `{ passive: true }` on scroll listeners (line 26).
- `try/catch` around `localStorage` (lines 52-56) — reuse for the D-18 intro flag.

**Make `initMotion()` idempotent** (Pitfall 1 warning sign): guard against double-binding when `astro:page-load` re-fires (e.g. track a `WeakSet` of bound nodes or a module-level `inited` flag reset in teardown).

---

### `src/scripts/motion/motion-prefs.ts` (utility, capability gate)

**Analog:** the inline detection block in `src/pages/index.astro` (lines 27-48) + chrome.ts try/catch idiom.

**Detection idiom to copy** (index.astro lines 30-44 — defensive `try { } catch { }` around a browser-API read, falling to a safe default):
```javascript
try {
  var stored = localStorage.getItem('nocturna-lang');
  // ...select...
} catch (e) { target = EN; }   // always falls back to a safe default
```

**Produce** (RESEARCH Code Examples §Capability gate — copy verbatim, it is the single source of truth for degradation):
```javascript
export const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer   = matchMedia('(pointer: fine) and (hover: hover)').matches;
export function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
  } catch { return false; }
}
// liveShader = webglOK() && !prefersReduced && perfBudgetOK
// customCursor = finePointer && !prefersReduced
// smoothScroll = !prefersReduced
```
Reduced-motion is the **default safe state** (D-21) — gate UP from it.

---

### `src/scripts/motion/smooth-scroll.ts` (service, Lenis)

**Analog:** `src/scripts/chrome.ts` `initNav` scroll listener (lines 24-28).

**Existing scroll idiom** (the project already binds a passive scroll listener and toggles state at a threshold — D-19 hide-on-scroll nav will extend exactly this):
```typescript
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 60);
window.addEventListener('scroll', onScroll, { passive: true });
```

**Produce** (RESEARCH Pattern 1 — one clock; do NOT add a second rAF loop):
```javascript
const lenis = new Lenis({ duration: 0.9, lerp: 0.08, smoothWheel: true, syncTouch: false });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));  // ticker = seconds, raf = ms
gsap.ticker.lagSmoothing(0);
```
Export a `destroy()` that calls `lenis.destroy()` for `astro:before-swap` (Pitfall 3 — the history-throttle fix). **Coordinate the D-19 nav scroll-state with the existing `initNav` `onScroll`** — do not double-bind a second `scroll` listener; drive nav hide/show from Lenis's `scroll` event or share one handler (Pitfall 8).

---

### `src/scripts/motion/reveals.ts` (service, ScrollTrigger + SplitText)

**Analog:** existing `.reveal` markup hooks (no JS analog — net-new). The hooks are already placed; do NOT re-author markup.

**Reveal hooks already in the DOM** (target these, do not add new ones — RESEARCH Code Examples §Reveal):
```html
<p class="hero-eyebrow reveal">          <!-- [lang]/index.astro:34 -->
<span class="hero-tagline reveal">        <!-- [lang]/index.astro:38,39 -->
<div class="hero-services reveal">         <!-- [lang]/index.astro:41 -->
<div class="hero-ctas reveal">             <!-- [lang]/index.astro:51 -->
<div class="section-header reveal">        <!-- Teaser:25, PackagesSummary:22, About, ServicesPage, Terms -->
<div class="card ... reveal">              <!-- PackageCard.astro:40 -->
```
There is **no `data-reveal` attribute and no `loading="lazy"`** in current markup — the hook is the `reveal` **class** (Phase 1 left it inert). GSAP targets `.reveal`.

**What to replicate:** query-all-then-bind idiom from chrome.ts (`document.querySelectorAll(...).forEach(...)`, lines 40-43, 107-112). Apply **bold** spray-wipe/stagger on landing (`[lang]/index.astro`, PackagesSummary, Teaser), **subtler** fade on `/servicios`, `/galeria`, `/terminos` (D-12 — distinguish by `Astro.url.pathname` or a body/page marker).

**SplitText constraints (Pitfall 9):** the display heading is `A Another Tag`, a self-hosted `.ttf` with `font-display: swap` (`global.css:10-16`). **Await `document.fonts.ready`** before splitting display headings; `ScrollTrigger.refresh()` after fonts load. Under reduced-motion, collapse split-text to a single whole-heading fade.

---

### `src/scripts/motion/choreography.ts` (service, marquee/tilt/parallax)

**Analog:** `src/scripts/chrome.ts` `querySelectorAll`+bind idiom (lines 107-112); choreography targets are existing sections.

**Targets (existing markup — animate, do not re-author):**
- **Gallery teaser horizontal marquee (D-14):** `src/components/sections/Teaser.astro` `variant="gallery"` (`<section class="section section--surface section--rule">`, line 24).
- **Package card 3D tilt/hover (D-15):** `src/components/PackageCard.astro:40` (`.card.reveal`), rendered by `PackagesSummary.astro` inside `.cards.cards--summary` (PackagesSummary:28).
- **Featured-work parallax (D-16):** `src/components/sections/Teaser.astro` `variant="featured"`.

**Anti-pattern (RESEARCH):** animate `transform`/`opacity` only — never `top/left/width/height` (reflow blows the perf budget). Tilt uses `transform: rotateX/Y`, parallax uses `transform: translateY`.

---

### `src/scripts/motion/cursor.ts` (service, cursor + magnetism)

**Analog:** `src/scripts/chrome.ts` `initDiscordModal` (lines 91-123) — pointer/listener + `querySelectorAll('.dc-trigger')` idiom; FloatingCTA/Nav are the magnetism targets.

**Interactive targets that magnetism nudges** (the same elements chrome.ts already wires):
- `.dc-trigger` (FloatingCTA.astro:19, Nav.astro:72, PackageCard.astro:65, hero CTAs) — these open the Discord modal; magnetism must NOT shift their hit target (Pitfall 7).
- `.nav-link`, `.hero-cta`, `.card`.

**Produce** (RESEARCH Pattern 4):
```javascript
const xTo = gsap.quickTo(cursorEl, 'x', { duration: 0.25, ease: 'power3' });
const yTo = gsap.quickTo(cursorEl, 'y', { duration: 0.25, ease: 'power3' });
window.addEventListener('pointermove', (e) => { xTo(e.clientX); yTo(e.clientY); });
```

**Hard rules:**
- Gate the ENTIRE module behind `finePointer && !prefersReduced` (D-08).
- Cursor div is always `pointer-events: none` (Pitfall 7).
- Magnetism displacement ≤ 8px (`--space-2xs`), catch radius ~48px (`--space-xl`) — `transform` only, never the hit box (UI-SPEC Spacing).
- Verify FloatingCTA (`.dc-trigger`) + DiscordModal still click-open with cursor active.

---

### `src/scripts/motion/transitions.ts` (service, VT animation + intro D-18)

**Analog:** `src/pages/index.astro` localStorage-flag idiom (lines 30-44) for the "first visit only" intro persistence; chrome.ts try/catch (lines 52-56).

**Persistence idiom** (mirror the existing `nocturna-lang` pattern — RESEARCH Open Q2 recommends `localStorage` `nocturna-intro-seen`):
```javascript
try {
  if (!localStorage.getItem('nocturna-intro-seen')) { /* play intro */ localStorage.setItem('nocturna-intro-seen','1'); }
} catch { /* play once, no persistence */ }
```

**VT animation** belongs in BaseLayout markup, not here (see below). This module hosts the glitch-wipe keyframe orchestration + the skippable intro. Gate intro behind `!prefersReduced` (D-18); intro must **never block CTA/content** and is skippable (non-text tap-to-skip preferred — UI-SPEC Copywriting).

---

### `src/scripts/motion/hero-shader/{shader.ts, glitch.frag, quad.vert}` (service + GLSL config) — NO ANALOG

**No codebase analog.** Use RESEARCH Pattern 3 (single full-screen-quad WebGL2 with `failIfMajorPerformanceCaveat: true`; null context → keep static `<img>` fallback, never init; `webglcontextlost` → swap to fallback; frame-budget guard ~22ms sustained ~1s → bail).

**Brand-token constraints (must read from `tokens.css`, no hard-coded hex — UI-SPEC Color):**
- Base field `--navy #0a0c14`; red bleed `--red #c0192c`; glitch-burst glow `--red-glow #e8223b`. Red stays a **minority bleed** (D-02/D-04).
- **Coexist with the existing film-grain overlay** `body::after` (`global.css:62-70`, `z-index: 9999`, `opacity: 0.45`, fixed) — do NOT run two full-strength grains in the hero (Pitfall 6). Harmonize: lower shader grain amplitude in the hero region OR reduce CSS overlay opacity over the hero.
- Pointer uniform throttled via rAF coalescing (D-03); on touch (no `finePointer`) drive distortion from `u_time` only (ambient, D-22).

GLSL imported as `?raw` (`import frag from './glitch.frag?raw'`); shader assets stay in `src/`, only the **static fallback** goes in `public/`.

---

### `src/styles/motion.css` (config, styles)

**Analog:** `src/styles/chrome.css` (token-driven values + the `@media (prefers-reduced-motion: reduce)` block, lines 536-544).

**Reduced-motion idiom to copy** (chrome.css:536-544 — kill transitions/animations under reduce):
```css
@media (prefers-reduced-motion: reduce) {
  .nav, .nav-links, .dc-overlay, .dc-modal, .floating-cta { transition: none; }
}
```
Extend it: under reduce, no live-shader canvas, no custom cursor, no bold reveals — only gentle fades + the static shader image (D-21).

**CTA pulse (D-19)** extends the existing `.floating-cta` (chrome.css:306-345) — add a keyframe pulse using `--red-glow`; mirror its existing `box-shadow` red-glow values (`rgba(232,34,59,...)`). Reveal initial states (`opacity:0; transform: translateY(24/32/48px)` = `--space-md/lg/xl`) and the `@keyframes` for the glitch-wipe live here. **All values from `tokens.css`** — no off-scale px (UI-SPEC Spacing).

---

### `public/hero-fallback.*` (config, static asset)

**Analog:** `public/favicon.png`, `public/fonts/a-another-tag.ttf` (existing `public/` assets referenced by absolute path).

Static grain/gradient image, navy field + red bleed, AA-legible behind the hero overlay (D-04). Referenced from the new `<img>` in the hero markup with a root-absolute `/hero-fallback.avif` path (same convention as `href="/favicon.png"`, BaseLayout:34).

---

## Modified Files

### `src/layouts/BaseLayout.astro` (add ClientRouter + motion entry)

**Self-analog** — extend the existing `<head>` (lines 28-41) and the single `<script>` import (lines 55-57).

**Existing script-import idiom to copy** (lines 55-57):
```astro
<script>
  import '../scripts/chrome.ts';
</script>
```
Add a sibling deferred import for `'../scripts/motion/index.ts'` (same deferred-module pattern, D-20).

**Add `<ClientRouter />`** in `<head>` (RESEARCH Pattern 2):
```astro
---
import { ClientRouter } from 'astro:transitions';   // Astro 7 name — NOT ViewTransitions
---
<head> ... <ClientRouter /> </head>
```
The glitch-wipe `transition:animate` (D-17) goes on the `<slot />`/`<main>` wrapper (RESEARCH Code Examples §Glitch-wipe). Keep `motion.css` import alongside `global.css`/`chrome.css` (lines 10-11).

### `src/scripts/chrome.ts` (MANDATORY migration — Pitfall 8, RESEARCH A3)

**Self-analog.** The `DOMContentLoaded` gate (lines 131-135) fires once and dies after the first ClientRouter swap → nav/lang/modal break on page 2. **Required task, not optional:** migrate `init()` to run on `astro:page-load` (or delegate listeners to `document` so they survive swaps). Coordinate `initNav`'s scroll listener (lines 24-28) with the new D-19 hide-on-scroll behavior — share one scroll handler, do not double-bind.

### `src/styles/global.css` (guard the smooth-scroll conflict)

**Self-analog.** `html { scroll-behavior: smooth }` (line 28) **conflicts with Lenis** (double-handling). Guard/remove it when Lenis is active (RESEARCH State of the Art / Alternatives). Leave the film-grain overlay (lines 62-70) intact — the shader harmonizes with it, does not replace it.

### `src/pages/[lang]/index.astro` (add shader canvas + static fallback to hero)

**Self-analog.** Add `<canvas data-hero-shader>` + a static `<img>` fallback inside `.hero-bg` (lines 29-32) — the `.reveal` hooks already present (lines 34, 38-39, 41, 51) stay. The existing `@media (prefers-reduced-motion: reduce)` block (lines 316-320) is the local precedent for gating hero animation.

### `package.json` (add pinned deps)

**Self-analog** — the existing `"astro": "7.0.3"` exact-pin idiom (no `^`/`~`). Add `"lenis": "1.3.25"`, `"gsap": "3.15.0"` (RESEARCH Standard Stack; both slopcheck `[OK]`, no postinstall). Run `npm audit` post-install.

---

## Shared Patterns

### Lifecycle gate (the cross-cutting contract for EVERY motion module)
**Source:** invert `src/scripts/chrome.ts:131-135`.
**Apply to:** `motion/index.ts`, and through it every effect module + the `chrome.ts` migration.
```javascript
// DO: re-init on every navigation, tear down before swap
document.addEventListener('astro:page-load', initMotion);     // idempotent
document.addEventListener('astro:before-swap', teardownMotion); // destroy/kill/cancel
// DON'T: top-level init or DOMContentLoaded (runs once, dies after first VT swap)
```

### Capability gate (single source of degradation truth)
**Source:** `src/scripts/motion/motion-prefs.ts` (RESEARCH Code Examples).
**Apply to:** every effect — `liveShader`, `customCursor`, `smoothScroll`, bold reveals all branch off `prefersReduced` / `finePointer` / `webglOK()`. Reduced-motion is the default; enhance up.

### Defensive query + null-guard
**Source:** `src/scripts/chrome.ts:19-24, 95` (`querySelector<HTMLElement>('[data-...]')` then `if (el)` / `if (!el) return`).
**Apply to:** all effect modules — no-op cleanly when a target is absent (a page without a hero has no shader canvas).

### Brand tokens, not hex/px
**Source:** `src/styles/tokens.css` (`--navy`, `--red`, `--red-glow`, `--space-*`).
**Apply to:** shader uniforms, cursor, motion.css. UI-SPEC: no hard-coded hex/px in motion code; reveal travel = 24/32/48px (`--space-md/lg/xl`); magnetism ≤8px (`--space-2xs`), radius ~48px (`--space-xl`).

### Reduced-motion CSS escape hatch
**Source:** `src/styles/chrome.css:536-544`.
**Apply to:** `motion.css` — extend the same `@media (prefers-reduced-motion: reduce)` block to neutralize cursor, live shader, and bold reveals.

### CTA survivability (hard constraint)
**Source:** `.dc-trigger` wiring in `chrome.ts:107-112` + `FloatingCTA.astro:19`.
**Apply to:** cursor (Pitfall 7 — never shift `.dc-trigger` hit box), transitions, intro — `.floating-cta` clickable in every motion state (D-19).

---

## No Analog Found

| File | Role | Data Flow | Reason → Use |
|------|------|-----------|--------------|
| `src/scripts/motion/hero-shader/shader.ts` | service | streaming (rAF) | No WebGL/canvas code exists in the project → RESEARCH Pattern 3 + Pitfall 5. |
| `src/scripts/motion/hero-shader/glitch.frag` | config (GLSL) | transform | No GLSL exists → author per UI-SPEC color tokens + D-01 aesthetic. |
| `src/scripts/motion/hero-shader/quad.vert` | config (GLSL) | transform | No GLSL exists → trivial pass-through (RESEARCH structure). |
| `src/scripts/motion/reveals.ts` (GSAP/SplitText) | service | event-driven | No GSAP usage exists → RESEARCH Pattern 1 + Pitfall 9 (font-ready). Markup hooks exist; the GSAP wiring does not. |

These four have **structural** analogs (chrome.ts module shape, defensive queries) but no **behavioral** analog — planner takes the behavior from RESEARCH.md patterns, the module skeleton from chrome.ts.

---

## Metadata

**Analog search scope:** `src/scripts/`, `src/layouts/`, `src/components/` (+ `sections/`), `src/styles/`, `src/pages/`, `public/`, `package.json`.
**Files scanned:** 27 source files (Glob `src/**/*.{astro,ts,css}`) + package.json; 13 read in full or in targeted ranges.
**Key insight:** there is exactly one established client-JS pattern (`chrome.ts`) and one shell (`BaseLayout.astro`). The entire motion layer copies chrome.ts's module shape while **inverting its single lifecycle gate** — that inversion (plus the mandatory chrome.ts migration) is the highest-value, highest-risk thing the planner must encode.
**Pattern extraction date:** 2026-06-28
