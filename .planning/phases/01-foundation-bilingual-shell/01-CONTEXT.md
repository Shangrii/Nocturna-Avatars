# Phase 1: Foundation & Bilingual Shell - Context

**Gathered:** 2026-06-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Stand up the Astro static site that ships live to GitHub Pages (CNAME preserved): the centralized brand design system, the i18n routing + content-dictionary system, the page structure (landing + `/servicios`, `/galeria`, `/terminos` shells), a persistent "Abrir Ticket"/Discord CTA, full responsiveness, the existing content migrated, and a draft EN translation of the Terms. Delivers requirements PLAT-01..04, I18N-01..04, NAV-01..03. Motion/animation (Phase 2), data-driven catalog (Phase 3), gallery rendering (Phase 4), and the bot (Phase 5) are explicitly NOT in this phase — the gallery/servicios pages are shells here.
</domain>

<decisions>
## Implementation Decisions

### i18n URL strategy
- **D-01:** Both languages are prefixed — `/es/...` and `/en/...`. The root `/` performs language detection and redirects (no unprefixed canonical pages). Chosen for symmetry and to make a future flip to EN-primary trivial.
- **D-02:** Because current live URLs are unprefixed (`/`, anchors), add redirects from legacy paths to their `/es/` equivalents so existing links/SEO are preserved on cutover.
- **D-03:** Spanish remains the default/fallback language (ES content is complete; EN is a fresh draft).

### Language detection
- **D-04:** On first visit, auto-detect the browser language and redirect to `/en/` for English browsers, otherwise `/es/`.
- **D-05:** The visitor's explicit language choice (via the switcher) is remembered (e.g., localStorage/cookie) and respected on subsequent visits — detection only drives the first, un-chosen visit, never overriding a manual pick.
- **D-06:** The language switcher preserves the current page (switches `/es/servicios` ↔ `/en/servicios`, not back to home).

### Launch / migration strategy
- **D-07:** Develop the revamp on a dedicated `revamp` branch. The current static site stays live and untouched on the production branch during the multi-phase build.
- **D-08:** Use a preview (GitHub Pages preview / branch deploy or local) to review progress without affecting production.
- **D-09:** Cut over GitHub Pages to the Astro build (GitHub Actions deployment) only once the revamp reaches parity. CNAME/custom domain must survive the cutover.

### Landing & content fidelity
- **D-10:** Re-compose the landing for the new experiential redesign (not a 1:1 copy of the current section order) — it becomes a curated summary that links to the dedicated pages.
- **D-11:** Polish/refine marketing copy (hero taglines, about/process wording) during migration — including fixing existing typos (e.g., "dolor de cabezar" → "dolor de cabeza").
- **D-12:** Keep hard/factual content faithful: package prices & features (Penumbra $40 / Umbra $60 / Eclipse $90), add-ons, and the full Terms text must port without changing their meaning.
- **D-13:** The EN Terms are a Claude-written draft, explicitly flagged for the user's later human/legal review before public launch (not blocking Phase 1).

### Claude's Discretion
- Astro project layout (src structure, content collection vs JSON dictionaries for i18n), GitHub Actions workflow specifics, and the exact responsive breakpoints are implementation details for the planner/executor.
- Carry over the brand tokens from `styles.css` `:root` (red `#c0192c`/`#7a0f1a`/`#e8223b`, navy `#0a0c14`/`#10131e`/`#181c2e`, off-white `#f0eae4`) and the film-grain overlay. Bump the `A Another Tag` type scale and reserve it for display/accents (it renders small); body stays Inter.
- Image storage path decision (`assets/gallery/` vs `public/gallery/`) is finalized in Phase 4, but Phase 1 should pick the Astro `public/` vs `src/assets` convention for static assets.
- Nav model: with multi-page, nav items link to pages (`/servicios`, `/galeria`, `/terminos`) instead of in-page anchors; keep the existing item set + Discord CTA unless a better structure emerges.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Approved design (source of truth)
- `docs/superpowers/specs/2026-06-28-nocturna-revamp-design.md` — full approved revamp design: stack, i18n, motion, structure, design system, catalog, gallery, bot. §2 (stack), §3 (i18n), §4 (structure), §5 (design system) are most relevant to Phase 1.

### Project planning
- `.planning/PROJECT.md` — project context, constraints, key decisions
- `.planning/REQUIREMENTS.md` — Phase 1 requirements PLAT-01..04, I18N-01..04, NAV-01..03 (with full text)
- `.planning/ROADMAP.md` §"Phase 1: Foundation & Bilingual Shell" — goal, success criteria, notes

### Existing site (brownfield — migrate from)
- `index.html` — current content/structure to migrate (hero, about/process, packages, terms blocks, footer, Discord modal)
- `styles.css` — brand tokens in `:root`, film-grain overlay, component styles to carry over
- `functions.js` — current interactive behaviors (nav scroll, gallery toggle, modals) to re-implement as Astro components
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `styles.css` `:root` tokens — directly become the design-system CSS custom properties (colors, fonts, nav height, section padding).
- Film-grain `body::after` SVG noise overlay — reuse as a global layer.
- `@font-face` for `A Another Tag` (woff2/woff/ttf in `assets/fonts/`) — carry over; bump its scale.
- Terms content (10 blocks) and package data already written in `index.html` — source for migration + the EN draft.
- Discord modal + `.dc-trigger` pattern and persistent CTA — re-implement as a shared component (NAV-03).

### Established Patterns
- Spanish-only, single-page anchor navigation today → becomes multi-page, language-prefixed routing.
- Google Fonts (Permanent Marker, Inter, Space Mono) loaded via `<link>` — keep in the Astro base layout `<head>`.
- `loading="lazy"` images and `reveal` class hooks exist — reveal animations land in Phase 2; keep markup hooks neutral in Phase 1.

### Integration Points
- GitHub Pages serving + `CNAME` file — the deploy cutover (D-09) must preserve this.
- `favicon.png` and `assets/` referenced relatively — adjust paths for Astro's static handling.
</code_context>

<specifics>
## Specific Ideas

- Visual direction references (carried from brainstorming): akryst.moe, nichind.dev, schuh.wtf — experiential animated portfolios. Phase 1 builds the structural/brand shell that Phase 2's motion layer will animate.
- Fix the known typo "Sin el dolor de cabezar" → "Sin el dolor de cabeza" during migration.
</specifics>

<deferred>
## Deferred Ideas

- Real 3D (Three.js) viewer — v2 / later phase.
- Ambient music player / audio toggle — v2 (FX2-02).
- Gallery filtering by category/tag — v2 (GAL2-01).
- All motion/animation (smooth scroll, reveals, WebGL hero, view transitions, cursor) — Phase 2.
- Data-driven catalog and gallery rendering — Phases 3 and 4 (Phase 1 leaves these pages as shells).

None of the discussion drifted outside phase scope — these were already roadmap'd boundaries.
</deferred>

---

*Phase: 1-Foundation & Bilingual Shell*
*Context gathered: 2026-06-28*
