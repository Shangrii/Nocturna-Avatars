# Website Redesign — "Refined Street Editorial"

**Date:** 2026-06-30
**Status:** Design (awaiting approval)
**Branch:** `revamp`
**Builds on:** Phase 2 motion layer (GSAP + Lenis + View Transitions) — kept intact, re-skinned.

---

## 1. Goal

Make the Nocturna Avatars site look materially better than the Phase 2 result while keeping
its street/graffiti soul. The current look leans on the graffiti font and a busy red/navy hero
that hurts legibility and reads as noisy. The redesign reframes the site as a **premium street
"zine"**: graffiti becomes a *signature accent* over a disciplined editorial base — oversized
type, generous breathing room, a clean grid, and red used surgically.

This serves the project Core Value: a visitor is visually impressed → reaches "Abrir Ticket".
It also reinforces the brand's own positioning ("we're a team, not commissions-by-DM").

**Non-goals:** changing copy/content, i18n behavior, the Discord-driven gallery automation, the
catalog data model, or the motion architecture. This is a visual + structural re-skin.

## 2. Locked Decisions

- **Aesthetic direction:** Refined Street Editorial (graffiti as accent, not everywhere).
- **Tech:** Add **Tailwind v4** (CSS-first). Keep Astro static output + GitHub Pages + CNAME.
  No React, no shadcn.
- **Remove** the custom blend-difference cursor (Phase 2 FX-04).
- **Keep** the Phase 2 motion layer (smooth scroll, reveals, page transitions, hero shader) —
  restyled, not removed.
- Brand red `#c0192c` + navy `#0a0c14` retained, but the strict red/navy *duality* is no longer a
  hard constraint — the look wins over preserving specific elements.

## 3. Design System

### 3.1 Typography (the biggest change)

Today nearly everything renders in the graffiti face "A Another Tag", which is small and
illegible at body/heading sizes. New hierarchy:

| Role | Font | Usage |
|------|------|-------|
| **Display (editorial)** | **Space Grotesk** 700 | Oversized headlines, uppercase, tight tracking (`-0.02em`), `line-height` 0.9–1.0. The workhorse for hero + section titles. |
| **Signature (graffiti)** | A Another Tag / Permanent Marker | ONLY: the "Nocturna" wordmark, section tags, and one hero accent. The street soul, rationed. |
| **Body** | Inter | All running text. 16px base, `line-height` 1.7. |
| **Meta / labels** | Space Mono | Eyebrows, prices, numbered steps, nav meta. Uppercase, wide tracking. |

Space Grotesk is the recognized street/zine/editorial grotesk — geometric with character, ideal
for descommunal headlines. It is loaded via Google Fonts (self-hosted/`font-display: swap`).

Type scale (fluid, retained from current tokens, re-pointed to Space Grotesk for display):
`--type-display`, `--type-heading`, `--type-card-title`, `--type-body`, `--type-label`.

### 3.2 Color — red/navy with editorial rhythm

Keep the brand palette but introduce **section rhythm** instead of an all-dark wall:

- **Ink (navy) sections:** `#0a0c14` field, off-white text — the default.
- **Paper sections:** off-white `#f0eae4` field, near-black text — used to break rhythm like
  magazine spreads (e.g. "¿Quiénes somos?" / process, or packages).
- **Red `#c0192c`** is the constant thread across both, used surgically: one accent per section
  (a rule, a tag, a number, the primary CTA). No splatter-everywhere.

Tokens extend the current set with semantic surface roles: `--ink`, `--paper`, `--ink-on-paper`,
`--paper-on-ink`, plus the existing red/navy scales. These map into Tailwind v4 `@theme`.

### 3.3 Texture & effects (refined, not brutalist)

- 0px radii, thin 1px rules, hairline borders.
- **Giant section numbers / tags** (Space Mono) as editorial markers.
- Headlines allowed to break lines graphically (oversized, tight).
- Restrained gallery **marquee** (kept from Phase 2 choreography, restyled).
- **Film-grain** overlay retained.
- **Cursor removed.** Hover/focus states standard and accessible.
- Hero: replace the diagonal red/navy split + ink-splatter + heavy text-shadow with a cleaner
  editorial hero (see §5.1). The Phase 2 WebGL shader canvas is retained as an optional textured
  backdrop behind the editorial layout (not driving the type legibility).

## 4. Tech Approach — Tailwind v4 in Astro

- Integrate Tailwind v4 via the **`@tailwindcss/vite`** plugin in `astro.config.mjs` (the v4
  path; the old `@astrojs/tailwind` integration is deprecated).
- Global stylesheet: `@import "tailwindcss";` then a `@theme { … }` block that ports the brand
  tokens (colors, fonts, spacing, type scale) so they become first-class utilities
  (`bg-ink`, `bg-paper`, `text-red`, `font-display`, `font-tag`, `font-mono`, `tracking-…`).
- **Migration strategy (incremental, low-risk):**
  1. Add Tailwind + `@theme` tokens alongside the existing CSS. Nothing breaks.
  2. Restyle component-by-component to utilities, deleting the old per-component CSS as each is
     converted. Keep complex/graffiti effects (grain, hero backdrop, marquee) as small custom
     CSS in `@layer components` / dedicated `.css` files.
  3. Retire `tokens.css` once its values live in `@theme`; keep `global.css` for resets +
     font-face + grain.
- Motion scripts (`src/scripts/motion/*`) are untouched except: delete `cursor.ts` + `cursor.css`
  and their wiring.

## 5. Page-by-page

### 5.1 Hero (landing)

Editorial hero, not a splash. Composition:
- Eyebrow (Space Mono): "Servicios de edición de avatares · VRChat".
- **"Nocturna"** wordmark in the graffiti face (signature) — large, but the *headline* weight
  moves to a Space Grotesk line: the tagline "El avatar que querías / Sin el dolor de cabeza"
  set oversized and editorial.
- Services list as mono meta row.
- Two CTAs: primary "Abrir Ticket" (solid red), secondary "Ver Paquetes" (outline). One clear
  primary per §UX `primary-action`.
- Backdrop: clean ink field with optional retained shader texture + subtle grid; legibility
  guaranteed by the editorial layout, not fighting a black-letter effect.
- Scroll cue retained.

### 5.2 Landing section order (revised)

Visual-first for a portfolio that sells a service:

1. Hero
2. **Featured gallery** (masonry teaser) — moved up; impress first.
3. **¿Quiénes somos? + Proceso** (the 6 workflow steps as an editorial timeline) — paper section.
4. **Paquetes** (3-tier summary).
5. **Closing / Abrir Ticket.**

(Current order is About → featured → packages → gallery → closing; gallery rises to #2.)

### 5.3 `/servicios`

3 tiers (Penumbra $40 / Umbra $60 / Eclipse $90) as editorial pricing cards — Umbra featured.
Add-ons grid + modular-catalog note. "Abrir Ticket" primary on each card. Mono prices with
tabular figures.

### 5.4 `/galeria`

Masonry wall + lightbox (data-driven, Discord-fed). Empty state retained and restyled to the
editorial system. Category filter affordance (visual-first pattern).

### 5.5 `/terminos`

Long-form legal restyled to the paper/editorial reading column (65–75ch measure, `line-height`
1.8). EN translation still flagged for human/legal review (unchanged).

### 5.6 Chrome (nav + footer + floating CTA + language switcher)

Restyled to the system: thin nav with mono meta + graffiti wordmark, active-state indicator,
hide-on-scroll behavior retained from Phase 2. Footer editorial. Floating "Abrir Ticket" CTA
restyled. Language switcher unchanged in behavior.

## 6. Quality Bars (from UI/UX Pro Max)

- Contrast ≥ 4.5:1 for text in BOTH ink and paper sections (verify red-on-ink and ink-on-paper).
- Touch targets ≥ 44px; visible focus rings; keyboard nav; `prefers-reduced-motion` respected.
- Responsive at 375 / 768 / 1024 / 1440. No horizontal scroll. `min-h-dvh` over `100vh`.
- Images AVIF/WebP, lazy below fold, reserved dimensions (CLS < 0.1).
- One primary CTA per screen; red reserved for primary/destructive.
- No emoji as structural icons (the ✦ decorative dividers are acceptable as accents, not icons).

## 7. Risks & Mitigations

- **Adding Tailwind churn:** mitigated by incremental component-by-component migration; site stays
  shippable at every step.
- **Font weight (Space Grotesk + graffiti + Inter + Space Mono = 4 families):** self-host/subset,
  `font-display: swap`, preload only the hero-critical face.
- **Paper sections + dark grain:** verify grain/texture reads on light fields; tune opacity per
  surface.
- **Hero shader retained:** ensure it's now purely decorative backdrop and never gates legibility.

## 8. Out of Scope

Copy changes, new content/sections, gallery automation/bot, catalog pricing, i18n logic, the
legal text itself. Pure visual + structural re-skin on the existing content and routes.
