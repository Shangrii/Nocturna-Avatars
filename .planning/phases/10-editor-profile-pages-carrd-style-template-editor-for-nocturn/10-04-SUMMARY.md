---
phase: 10-editor-profile-pages-carrd-style-template-editor-for-nocturn
plan: 04
subsystem: ui
tags: [astro, editor-blocks, xss-safety, portfolio, i18n, brand-tokens]

# Dependency graph
requires:
  - phase: 10-editor-profile-pages-carrd-style-template-editor-for-nocturn
    plan: 01
    provides: editors.json entry+block schema (D-01/D-02), editorPath, editors route concept
provides:
  - "src/lib/editorTypes.ts — Editor + closed EditorBlock discriminated union (render-side schema contract)"
  - "src/components/editor-blocks/BlockRenderer.astro — block.type -> component dispatch, no set:html, unknown type renders nothing"
  - "Seven typed auto-escaping block components (bio/heading/text/links/portfolio/quote/image) + inline divider rule"
  - "PortfolioBlock build-time credited-work auto-pull (exact-slug, NSFW-excluded, empty-hides)"
affects: [10-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Closed-union type->component dispatch enforces the D-02 XSS guarantee at the render layer (no set:html anywhere)"
    - "Per-block components take a variant-narrowed prop via Extract<EditorBlock,{type}> (BlockOf<T> helper)"
    - "Build-time credited-work join by exact slug equality against store.json + gallery.json with defensive copy-before-filter"
    - "Empty portfolio (no credited + no extra) renders no markup (UI-SPEC empty rule)"

key-files:
  created:
    - src/lib/editorTypes.ts
    - src/components/editor-blocks/BlockRenderer.astro
    - src/components/editor-blocks/BioBlock.astro
    - src/components/editor-blocks/HeadingBlock.astro
    - src/components/editor-blocks/TextBlock.astro
    - src/components/editor-blocks/LinksBlock.astro
    - src/components/editor-blocks/QuoteBlock.astro
    - src/components/editor-blocks/ImageBlock.astro
    - src/components/editor-blocks/PortfolioBlock.astro
  modified: []

key-decisions:
  - "The divider block renders inline in BlockRenderer as an <hr class=editor-divider> (no separate component) per the plan's dispatch spec; styled as a half-opacity red hairline (UI-SPEC reserved-red list)"
  - "PortfolioBlock honors the schema's block.auto flag: auto:false opts out of the store/gallery credited join and renders only hand-added extra items; a missing flag defaults to on (Rule 2 — wiring the schema field's intended behavior)"
  - "Empty bio/heading/text/quote/image blocks render nothing (guarded on resolved value) — only portfolio's empty-hide is mandated, but suppressing empty tags keeps the profile column clean"

requirements-completed: [EDIT-01, EDIT-03]

# Metrics
duration: ~25min
completed: 2026-07-14
---

# Phase 10 Plan 04: Editor Block Component Library Summary

**Built the closed-union editor-block component library (D-02): a `BlockRenderer` that dispatches `block.type` to eight dedicated, auto-escaping Astro components with zero `set:html`, plus a build-time `PortfolioBlock` that joins credited SFW work by exact slug from `store.json` + `gallery.json` and hides when empty — the ready-to-consume render layer for the 10-07 page route.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3
- **Files created:** 9
- **Files modified:** 0

## Accomplishments
- Shipped `src/lib/editorTypes.ts` exporting `Editor` and the discriminated `EditorBlock` union covering all 8 block types (bio, heading, text, links, portfolio, quote, image, divider), plus `Bilingual`/`EditorLink`/`PortfolioExtra` and a `BlockOf<T>` variant-narrowing helper — a faithful render-side mirror of the 10-01 `editors.json` schema.
- `BlockRenderer.astro` dispatches on `block.type` to the matching typed component (threading `slug` only to PortfolioBlock), renders the `divider` inline as a red hairline `<hr>`, and produces no output for unknown/malformed types. No `set:html` anywhere — the D-02 XSS guarantee enforced at the render layer.
- Six non-portfolio components (BioBlock, HeadingBlock, TextBlock, LinksBlock, QuoteBlock, ImageBlock) each with a typed `Props`, locale-resolved (`es → en → ''`) auto-escaped content, and scoped `<style>` using only `var(--...)` brand tokens (no raw hex). LinksBlock renders full-width 44px link-buttons with `rel="noopener noreferrer nofollow"` + `target="_blank"` (T-10-04-02).
- `PortfolioBlock.astro` performs the build-time credited-work join: store products where `p.editor === slug && !p.nsfw`, gallery entries where `g.editor === slug && g.nsfw !== true` (missing `nsfw` = SFW), plus hand-added `block.extra` items — exact-slug only (D-12), NSFW excluded entirely (D-04, T-10-04-03), empty list renders nothing (UI-SPEC), and every read is defensive copy-before-filter so one malformed entry never breaks the build (T-10-04-04). Auto-pulled items carry the ES/EN "De la tienda"/"From the store" · "De la galería"/"From the gallery" Space Mono credited badge.

## Task Commits

Each task was committed atomically:

1. **Task 1: Editor TS types + BlockRenderer dispatch** - `f5e2cfe` (feat)
2. **Task 2: Text/link/quote/image/divider block components** - `1545b00` (feat)
3. **Task 3: PortfolioBlock build-time credited-work auto-pull** - `182382d` (feat)

## Files Created/Modified
- `src/lib/editorTypes.ts` - `Editor` + closed `EditorBlock` union + `BlockOf<T>` helper; the render-side schema contract
- `src/components/editor-blocks/BlockRenderer.astro` - `block.type` dispatch; inline red-hairline divider; no `set:html`
- `src/components/editor-blocks/BioBlock.astro` / `TextBlock.astro` - Body-role bilingual paragraphs
- `src/components/editor-blocks/HeadingBlock.astro` - Heading-role bilingual heading
- `src/components/editor-blocks/LinksBlock.astro` - stacked 44px link-buttons, `rel="noopener noreferrer nofollow"`
- `src/components/editor-blocks/QuoteBlock.astro` - pull-quote with red rule accent + optional attribution
- `src/components/editor-blocks/ImageBlock.astro` - single full-column lazy-loaded image
- `src/components/editor-blocks/PortfolioBlock.astro` - build-time credited-work join (D-03/D-04/D-12), empty-hides

## Decisions Made
- **Divider renders inline in BlockRenderer** (no `DividerBlock.astro`) exactly as the plan's dispatch spec dictates (`{block.type === 'divider' && <hr class="editor-divider" />}`), styled as a half-opacity brand-red hairline per the UI-SPEC reserved-red list for dividers.
- **`block.auto` gates the credited auto-pull.** The schema carries a `portfolio.auto: boolean`; a block with `auto: false` opts out of the store/gallery join and renders only its hand-added `extra` items (a missing flag defaults to on). The plan described the join without mentioning the flag; honoring it wires the schema field's intended behavior (deviation Rule 2, below). Hand-added `extra` items are always shown regardless of `auto`.
- **Empty non-portfolio blocks render nothing.** Only the portfolio empty-hide is mandated; guarding bio/heading/text/quote/image on their resolved value avoids stray empty tags in the profile column. No behavioral risk (an empty block has no content to show).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Wired the `portfolio.auto` flag to gate the credited join**
- **Found during:** Task 3
- **Issue:** The 10-01 schema defines `portfolio` as `{ auto: boolean, extra: [...] }`, but the plan's action text described the store/gallery auto-pull without specifying what `auto` controls, leaving the flag inert.
- **Fix:** `PortfolioBlock` treats `block.auto !== false` as the gate for the store + gallery credited join (defaults on when missing); `extra` items always render. This makes the schema's `auto` field meaningful (an editor can turn off auto-pull and curate only hand-added items) without changing the mandated exact-slug/NSFW-exclusion/empty-hide behavior.
- **Files modified:** src/components/editor-blocks/PortfolioBlock.astro
- **Commit:** 182382d

### Adjustment (not a code change)

**2. Removed the literal token `set:html` from doc comments**
- The initial doc comments referenced the forbidden directive by name to explain the D-02 guarantee. The plan's own verify (`! grep -r "set:html" src/components/editor-blocks/`) and the phase verifier treat any occurrence — including a comment mention — as a gate failure. Reworded every comment to "raw-HTML directive" / "raw-HTML injection" so the load-bearing grep is genuinely clean while the intent stays documented. No behavioral change.

## Issues Encountered
- **`npx astro check` requires an interactive install of `@astrojs/check`**, which is not in the project manifest (the 10-01 executor hit the same environment gap and fell back to `npm run build`). Installed `@astrojs/check` + `typescript` with `npm i --no-save` so type-checking ran without adding a committed manifest/lockfile diff (dev-tooling only, not a runtime dependency).
- **`astro check` reports 25 pre-existing errors** in phase-6 store scripts (`store.ts`, `store-cart.ts`, `cart.ts`, `StorePage.astro`) — "Cannot redeclare block-scoped variable" / "Duplicate function implementation", the known astro-check quirk of type-checking sibling inline `<script>` modules in a shared global scope. **Zero** of these are in `editor-blocks/` or `editorTypes.ts`; they are out of scope (SCOPE BOUNDARY — pre-existing, not caused by this plan) and do not affect the real build. `npm run build` is green: 14 pages built in ~1s.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The render layer is complete and type-clean. **10-07** (the editor page route) can now import `BlockRenderer` and map an editor's `blocks[]` array to it, passing `lang` and the editor `slug`; PortfolioBlock resolves credited work automatically at build time.
- The `editor`/`nsfw` optional gallery fields consumed by PortfolioBlock are added by **10-06** (extended gallery approve flow); until then no gallery entry carries them, so gallery credited-pull yields nothing (SFW-safe by construction — a missing `nsfw` is treated as SFW, a missing `editor` matches no slug).
- The store `editor` field is matched by exact slug equality; the seed catalog is currently empty, so store credited-pull is inert until products are added with an editor slug.

## Self-Check: PASSED

All 9 files exist on disk; all 3 task commits (`f5e2cfe`, `1545b00`, `182382d`) are present in git history. `grep -r "set:html" src/components/editor-blocks/` returns nothing. `npm run build` is green (14 pages).

---
*Phase: 10-editor-profile-pages-carrd-style-template-editor-for-nocturn*
*Completed: 2026-07-14*
