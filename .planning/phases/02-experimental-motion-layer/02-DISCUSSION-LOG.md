# Phase 2: Experimental Motion Layer - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-28
**Phase:** 2-Experimental Motion Layer
**Areas discussed:** Hero WebGL shader, Cursor & micro-interactions, Scroll reveal character, Transitions & motion safety, Intro/preloader, Landing section choreography, Hero-on-scroll behavior, Nav & CTA in motion

---

## Hero WebGL shader

| Option | Description | Selected |
|--------|-------------|----------|
| Flowing ink/noise warp | Organic smoke/ink distortion | |
| Grain + glitch/chromatic | Scanlines, chromatic aberration, glitch bursts | ✓ |
| Liquid metallic ripple | Sleek reflective ripple | |

**User's choice (look):** Grain + glitch/chromatic

| Option | Description | Selected |
|--------|-------------|----------|
| Navy/black + red accents | Dark field, red bleed, legible text | ✓ |
| Bold red×navy gradient | Full saturated brand field | |
| Off-white grain ghost | Pale noise on navy | |

**User's choice (color):** Navy/black + red accents

| Option | Description | Selected |
|--------|-------------|----------|
| Mouse-reactive | Distorts toward cursor | ✓ |
| Ambient drift | Autonomous churn | |
| Scroll-reactive | Intensifies on scroll | |

**User's choice (motion):** Mouse-reactive (throttled)

| Option | Description | Selected |
|--------|-------------|----------|
| Overlay + static fallback | Contrast/vignette overlay; static grain if no WebGL | ✓ |
| Text on solid panel | Headline on opaque card | |
| You decide | Planner chooses | |

**User's choice (legibility):** Overlay + static fallback

---

## Cursor & micro-interactions

| Option | Description | Selected |
|--------|-------------|----------|
| Blend-mode invert circle | mix-blend-mode: difference circle | ✓ |
| Dot + trailing ring | Dot with lagging ring | |
| Graffiti reticle/crosshair | Tag-style marker | |

**User's choice (style):** Blend-mode invert circle

| Option | Description | Selected |
|--------|-------------|----------|
| Magnetic + cursor grows | Elements pull toward cursor, cursor scales | ✓ |
| Cursor label on hover | Cursor shows word (Ticket/Ver) | |
| Simple scale only | Cursor grows, no magnetism | |

**User's choice (hover):** Magnetic + cursor grows

| Option | Description | Selected |
|--------|-------------|----------|
| Desktop/fine-pointer only | Gated to fine-pointer; native on touch | ✓ |
| You decide | Planner applies gating | |

**User's choice (scope):** Desktop/fine-pointer only

| Option | Description | Selected |
|--------|-------------|----------|
| Tasteful set + glitch accent | Buttons/nav/cards w/ glitch flicker | ✓ |
| CTA-focused only | Mostly the conversion path | |
| Broad / everything moves | Wide application | |

**User's choice (micro scope):** Tasteful set + glitch accent

---

## Scroll reveal character

| Option | Description | Selected |
|--------|-------------|----------|
| Bold + graffiti energy | Staggered, clip/mask spray wipes | ✓ |
| Subtle fade-up | Gentle fade + small shift | |
| Mixed: bold showcase, subtle text | Per-block intensity | |

**User's choice (energy):** Bold + graffiti energy

| Option | Description | Selected |
|--------|-------------|----------|
| Split per word/char | Headings animate letter/word-by-word | ✓ |
| Whole-block reveal | Heading as one unit | |
| You decide | Planner chooses | |

**User's choice (headings):** Split per word/char

| Option | Description | Selected |
|--------|-------------|----------|
| Landing showcase moments | Concentrate on landing; pages subtler | ✓ |
| Uniform everywhere | Same language across all pages | |

**User's choice (focus):** Landing showcase moments

| Option | Description | Selected |
|--------|-------------|----------|
| Smooth but snappy | Short duration, light inertia | ✓ |
| Heavy / floaty | Long inertia/glide | |
| You decide | Planner tunes | |

**User's choice (scroll feel):** Smooth but snappy

---

## Transitions & motion safety

| Option | Description | Selected |
|--------|-------------|----------|
| Quick glitch wipe | Fast wipe + glitch flash | ✓ |
| Clean fade/dissolve | Simple crossfade | |
| Directional slide | Push/slide | |

**User's choice (transition):** Quick glitch wipe

| Option | Description | Selected |
|--------|-------------|----------|
| Full honor, content intact | Strip heavy motion, keep content | (initial) |
| Partial reduce | Keep gentle fades + static shader | ✓ |

**User's choice (reduced-motion):** Partial reduce (re-confirmed after follow-up)

| Option | Description | Selected |
|--------|-------------|----------|
| Progressive enhancement | CTA/text before motion JS; deferred libs | ✓ |
| You decide | Planner chooses | |

**User's choice (perf strategy):** Progressive enhancement

| Option | Description | Selected |
|--------|-------------|----------|
| Lighter on mobile | Drop cursor; shader cheap/static | |
| Full motion everywhere | Same motion incl. live shader | ✓ |
| Minimal on mobile | Transitions + light fades only | |

**User's choice (mobile):** Full motion everywhere → refined via follow-up to **live shader, fall back to static if over perf budget** (ambient on touch, since no pointer; performance wins ties).

---

## Intro / preloader

| Option | Description | Selected |
|--------|-------------|----------|
| Brief glitch-tag intro | ~1s splash, skippable, first-visit only | ✓ |
| No preloader | Instant content | |
| Minimal logo flash | Quick logo fade | |

**User's choice:** Brief glitch-tag intro (first-visit, skippable, off under reduced-motion, never blocks CTA)

---

## Landing section choreography

| Option | Description | Selected |
|--------|-------------|----------|
| Gallery teaser scroll-track | Horizontal marquee preview of /galeria | ✓ |
| Package cards stagger + tilt | Staggered reveal + 3D tilt | ✓ |
| Featured-work parallax | Parallax depth on scroll | ✓ |
| Keep reveals uniform | No bespoke moments | |

**User's choice:** All three bespoke moments (gallery scroll-track + package tilt + featured parallax)

---

## Hero-on-scroll behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Parallax fade + glitch ramp | Parallax + glitch intensity, then dissolve | ✓ |
| Pin briefly then release | Scroll-driven pin | |
| Simple fade out | Hero fades on scroll | |

**User's choice:** Parallax fade + glitch ramp

---

## Nav & CTA in motion

| Option | Description | Selected |
|--------|-------------|----------|
| Hide-on-down + CTA pulse | Nav hides on down/shows on up; CTA pulses | ✓ |
| Always visible + static CTA | Fixed nav, no extra motion | |
| Nav condenses on scroll | Nav shrinks after hero | |

**User's choice:** Hide-on-down + CTA pulse

---

## Claude's Discretion

- GSAP/ScrollTrigger + Lenis + View Transitions integration wiring, shader GLSL authoring approach, concrete perf-budget thresholds, Lenis duration/easing values, split-text mechanics.
- Whether to hand-author the shader vs. a thin GLSL/canvas helper (must stay one shader, not 3D, and meet legibility/perf/fallback decisions).

## Deferred Ideas

- Ambient music player / audio toggle — raised as "music"; deferred to v2 (FX2-02).
- Real-time 3D viewer (Three.js) — v2 (FX2-01).
- Gallery filter by category/tag — v2 (GAL2-01); gallery rendering is Phase 4.
