# Phase 2: Experimental Motion Layer - Context

**Gathered:** 2026-06-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Layer experimental motion onto the existing Phase 1 bilingual shell so the site feels "máximo experimental" — **without burying the "Abrir Ticket" conversion path or hurting load speed**. Delivers FX-01 (Lenis smooth scroll), FX-02 (GSAP/ScrollTrigger scroll reveals), FX-03 (one WebGL hero shader — noise/distortion, NOT a 3D scene), FX-04 (interactive cursor), and NAV-04 (Astro View Transitions between pages).

**Libraries are already locked by the approved design spec** (Lenis · GSAP/ScrollTrigger · Astro View Transitions · one WebGL shader · cursor effects). This phase decides *how it looks and behaves*, not which tools. Three.js / real 3D, ambient audio, and gallery filtering are explicitly out of scope (v2). Data-driven catalog (Phase 3) and gallery (Phase 4) remain unchanged — Phase 2 only animates the existing shell.

</domain>

<decisions>
## Implementation Decisions

### Hero WebGL shader (FX-03)
- **D-01:** Aesthetic = **grain + glitch/chromatic** — scanlines, chromatic aberration, digital glitch bursts (street/graffiti energy), echoing the existing film-grain overlay.
- **D-02:** Color = **navy/black field with red accents** (`#0a0c14` base, `#c0192c` bleed) — dark and atmospheric, keeps hero text legible.
- **D-03:** Reaction = **mouse-reactive** (distorts toward the cursor); pointer input must be throttled for perf.
- **D-04:** Legibility = shader sits **behind a subtle contrast/vignette overlay** so the headline + CTA are always readable. **No-WebGL fallback** = a static grain/gradient image (progressive enhancement — hero is fully readable without WebGL).
- **D-05:** Hero-on-scroll = **parallax fade + glitch-intensity ramp**, then dissolve into the next section (cheap, cinematic — not a scroll-pin).

### Cursor & micro-interactions (FX-04)
- **D-06:** Custom cursor = **blend-mode `difference` invert circle** — high-contrast over text, images, and the shader; on-brand with the glitch direction.
- **D-07:** Hover behavior = **magnetic pull on interactive elements + cursor grows** over them (CTA, links, cards). Draws the eye toward the conversion CTA.
- **D-08:** Scope = **desktop / fine-pointer only** — gated by pointer/hover media queries; touch devices keep the native cursor and get no magnetism.
- **D-09:** Micro-interactions = a **tasteful set** on buttons, nav, and package cards (lift / underline-draw / a small **glitch flicker** that echoes the hero shader) — cohesive, not noisy.

### Scroll reveals & smooth scroll (FX-01, FX-02)
- **D-10:** Reveal energy = **bold + graffiti energy** — staggered entrances with clip/mask "spray" wipes and offset slides.
- **D-11:** Display headings (`A Another Tag` font) animate in **split per word/char** (staggered) — signature use of the display type.
- **D-12:** Strongest reveals **concentrated on the landing's showcase moments** (featured work, packages summary, gallery teaser); dedicated pages (`/servicios`, `/galeria`, `/terminos`) get a subtler treatment.
- **D-13:** Lenis feel = **smooth but snappy** — short smoothing duration / light inertia so it never slows the path to the CTA.

### Landing section choreography (bespoke moments on top of D-10)
- **D-14:** **Gallery teaser** = scroll-driven horizontal marquee/track that previews `/galeria`.
- **D-15:** **Package cards** = staggered reveal with a subtle 3D tilt/hover (makes the pricing tiers feel premium/tactile).
- **D-16:** **Featured work** = parallax depth against the background on scroll.

### Page transitions (NAV-04)
- **D-17:** Style = **quick glitch wipe** — a fast wipe with a brief glitch/chromatic flash echoing the hero shader, kept short so navigation stays snappy. (Astro View Transitions.)

### Intro / first-load
- **D-18:** **Brief glitch-tag intro (~1s)** on the **first visit only** while shader + fonts initialize — **skippable**, instant on repeat visits, **disabled under reduced-motion**, and must **never block the CTA / content**.

### Chrome behavior in motion
- **D-19:** Nav = **hide-on-scroll-down / show-on-scroll-up** (reclaims space for immersion); the floating **"Abrir Ticket" CTA stays persistent** with a subtle pulse/entrance so conversion stays alive in every motion state.

### Motion safety & performance (hard constraint)
- **D-20:** **Progressive enhancement** — hero text + CTA render and work **before** any motion JS; Lenis / GSAP / shader load **deferred after first paint**; the site is fully usable with JS disabled or slow.
- **D-21:** **Reduced-motion = partial reduce** — when `prefers-reduced-motion` is set: disable smooth-scroll inertia, bold reveals, the live shader, and the custom cursor, but **keep gentle fades and a static shader**. All content/CTA remain fully present.
- **D-22:** **Mobile = full motion** (including a live shader), BUT the live shader runs **ambient/autonomous on touch** (no pointer to follow) and **falls back to the static grain image if it can't meet the hard perf budget on low-end devices** — **performance wins ties.**

### Claude's Discretion
- Exact GSAP/ScrollTrigger + Lenis integration wiring, View Transitions API setup, shader GLSL authoring, concrete perf-budget thresholds, Lenis duration/easing values, and per-heading split-text mechanics are implementation details for the researcher/planner/executor.
- Whether to author the shader by hand vs. a small lib (e.g., a thin GLSL/canvas helper) is open, provided it stays "one shader, not a 3D scene" and meets D-04/D-20/D-22.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Approved design (source of truth)
- `docs/superpowers/specs/2026-06-28-nocturna-revamp-design.md` — full approved revamp design. §2 (Tech Stack & Architecture → the locked motion-layer library list: Lenis, GSAP/ScrollTrigger, View Transitions, one WebGL shader, cursor effects) and §4–§5 (structure + design system / visual DNA) are most relevant to Phase 2.

### Project planning
- `.planning/PROJECT.md` — constraints (performance is a hard constraint; CTA always reachable), brand tokens, and the "2D-rich + punctual WebGL (no 3D yet)" key decision.
- `.planning/REQUIREMENTS.md` — Phase 2 requirements FX-01..04, NAV-04 (and v2 deferrals FX2-01 Three.js / FX2-02 audio).
- `.planning/ROADMAP.md` §"Phase 2: Experimental Motion Layer" — goal, success criteria, performance-budget note, Three.js deferral.
- `.planning/phases/01-foundation-bilingual-shell/01-CONTEXT.md` — Phase 1 decisions; note its `code_context` flagged that `reveal` class hooks + `loading="lazy"` markup were left neutral specifically for Phase 2 to animate.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/layouts/BaseLayout.astro` — the single shared shell; the natural place to enable Astro View Transitions (D-17), mount the smooth-scroll root + shader/cursor scripts, and wire `prefers-reduced-motion` gating. Already has `chrome-top` / `chrome-bottom` slots and a `<script> import '../scripts/chrome.ts'`.
- `src/scripts/chrome.ts` — existing client-script entry point; the established pattern for adding deferred client JS (motion init should follow this, loaded after first paint per D-20).
- `src/styles/` — `tokens.css` (brand colors for shader/cursor), `global.css` (owns the film-grain overlay the glitch shader should harmonize with), `chrome.css` / `sections.css` for nav + section styling.
- `src/components/Nav.astro` + `src/components/FloatingCTA.astro` — targets for D-19 (hide-on-scroll nav, persistent pulsing CTA).
- `src/components/PackageCard.astro` + `src/components/sections/*` (Teaser, PackagesSummary, About, GalleryPage) — targets for landing choreography D-12/D-14/D-15/D-16.

### Established Patterns
- Astro static output, no current runtime deps beyond `astro` itself — motion libraries (Lenis, GSAP) will be the first added client dependencies; keep them deferred/code-split to honor the perf budget.
- i18n is language-prefixed (`/es/`, `/en/`) via `[lang]` routes — any motion that includes text (e.g., a cursor label, intro copy) must pull from the i18n dictionaries in `src/i18n/`, not hardcode strings. (Current decisions avoid cursor labels, so this is mainly a constraint to keep in mind.)
- Phase 1 intentionally left `reveal` class hooks + `loading="lazy"` neutral for Phase 2 to hook into.

### Integration Points
- View Transitions are enabled at the `BaseLayout`/`<head>` level and interact with Lenis (scroll position) and GSAP/ScrollTrigger (must refresh on transition) — a known integration point to handle carefully.
- The glitch shader must coexist with the existing `body` film-grain overlay (global.css) without doubling cost or clashing visually.
- Custom cursor + magnetism must not interfere with the existing Discord modal / FloatingCTA click targets.

</code_context>

<specifics>
## Specific Ideas

- Visual references carried from brainstorming: **akryst.moe, nichind.dev, schuh.wtf** — experiential animated portfolios; the desired benchmark for the motion feel.
- The **glitch/chromatic motif is the through-line**: it appears in the hero shader (D-01), as the page-transition flash (D-17), as the micro-interaction flicker accent (D-09), and as the first-load intro (D-18) — these should feel like one cohesive visual language, not separate effects.
- Conversion-first discipline showed up repeatedly: legibility overlay, persistent pulsing CTA, snappy (not floaty) scroll, progressive enhancement, perf-wins-ties on mobile.

</specifics>

<deferred>
## Deferred Ideas

- **Ambient music player / audio toggle** — raised during discussion ("music"); already scoped as **v2 (FX2-02)** and out of scope for this phase (a new capability, not a way to implement the motion layer). Captured so it isn't lost.
- **Real-time 3D avatar viewer (Three.js)** — v2 (FX2-01); this phase is explicitly "one shader, not a 3D scene."
- **Gallery filter by category/tag** — v2 (GAL2-01), and gallery rendering itself is Phase 4.

</deferred>

---

*Phase: 2-Experimental Motion Layer*
*Context gathered: 2026-06-28*
