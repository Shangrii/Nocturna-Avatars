---
phase: 07-reviews-publishing-pipeline-discord-reviews-channel-to-websi
plan: 01
subsystem: website-ui
tags: [testimonials, reviews, i18n, astro, xss-mitigation]
requires:
  - src/data/reviews.json (bot write-target, shipped [])
  - src/i18n/ui.ts useTranslations (unchanged)
  - src/styles/sections.css .cards/.card/.card-divider idiom
provides:
  - src/components/sections/Reviews.astro (build-time testimonials section)
  - reviews i18n key (es/en) in pages.json
  - reviews.json contract consumed here, written by the bot in 07-02
affects:
  - src/pages/[lang]/index.astro (landing composition)
tech-stack:
  added: none
  patterns:
    - Empty-array-committed data file (mirrors gallery.json) so builds never break
    - Conditional whole-section render → null when empty (diverges from EmptyState pattern)
    - Astro auto-escaping only for user-generated content (no set:html)
    - figure/blockquote/figcaption testimonial semantics
key-files:
  created:
    - src/data/reviews.json
    - src/components/sections/Reviews.astro
  modified:
    - src/i18n/pages.json
    - src/pages/[lang]/index.astro
decisions:
  - "Testimonials render as .section--surface (paper), placed after the gallery Teaser; the .section--rule hairline delineates the paper Teaser→paper Reviews boundary when populated, and Reviews emits no markup when empty so the launch rhythm stays gallery(paper)→closing(ink)"
  - "Newest-first sort, slice to 9 (clean 3×3 desktop grid, within the UI-SPEC 8–10 range)"
  - "Localized month+year date via Intl.DateTimeFormat (privacy-light; no exact day)"
  - "Decorative red quotation glyph is the card's single accent (var(--color-red-on-paper), AA-safe on paper)"
metrics:
  duration: ~14min
  tasks: 2
  files: 4
  completed: 2026-07-09
---

# Phase 07 Plan 01: Reviews Testimonials Section Summary

Build-time testimonials section that renders `src/data/reviews.json` as bilingual-aware Refined Street Editorial cards (figure/blockquote/figcaption), auto-escaped against XSS, rendering nothing until the bot publishes entries.

## What Was Built

- **`src/data/reviews.json`** — the bot write-target contract, committed as an empty array `[]` so `npm run build` always succeeds at launch. The bot (07-02) will append `{ id, author, text, date }` entries.
- **`reviews` i18n key** in `src/i18n/pages.json` under both `es` and `en` (tag/title/anonymous) — `Reseñas`/`Reviews`, `Lo que dicen nuestros clientes`/`What our clients say`, `Anónimo`/`Anonymous`. No `ui.ts` change needed (pages.json already imported+typed).
- **`src/components/sections/Reviews.astro`** — the exact analog of `FeaturedGallery.astro`: frontmatter import → copy → sort newest-first by `date` → slice to 9 → localized chrome → conditional render. Diverges deliberately: renders **nothing** when empty (no EmptyState), no client `<script>`, `<figure class="card">` with a decorative red quote glyph (`aria-hidden`), `<blockquote>{entry.text}</blockquote>`, a `.card-divider`, and a `<figcaption>` reading `— {author ?? Anonymous} · {localized month+year}`. Reuses the shared `.cards`/`.card`/`.section-header` idiom; component-scoped styles only for the glyph, blockquote reset (`--font-body`/`--type-body`/`--lh-body`) and mono figcaption meta. No hardcoded hex/px.
- **Landing wiring** — `<Reviews lang={lang} />` placed after `<Teaser variant="gallery" />` and before the closing ink section; the ink/paper order comment updated.

## Verification Evidence

- `npm run build` green with `reviews.json = []`; `grep -r "data-reviews" dist/` finds nothing (section absent when empty).
- Escaped-rendering proof: a temporary entry with body `Amazing work <b>x</b> on my avatar!` built to `dist/es/index.html` as `&lt;b&gt;x&lt;/b&gt;` (escaped) with no raw `<b>x</b>` present — confirming Astro auto-escaping and no `set:html` (T-07-01 mitigated). `reviews.json` reset to `[]` and rebuilt green.
- `grep "set:html" src/components/sections/Reviews.astro` → absent (also verifies the doc comment avoids the literal string so the acceptance grep passes).
- `grep "blockquote"` / `figure` / `figcaption` present in Reviews.astro.

## Deviations from Plan

None — plan executed as written. One minor implementation note: the doc-comment initially contained the literal string `set:html` (in a "forbidden" note), which tripped the acceptance grep `! grep -q "set:html"`; reworded to "raw-HTML injection is forbidden" so the literal-absence check passes while keeping the security intent documented.

## Threat Model Coverage

- **T-07-01 (XSS)** — mitigated: review text rendered only via `<blockquote>{entry.text}</blockquote>` Astro auto-escaping; `set:html` absent and verified so.
- **T-07-02 (info disclosure)** — mitigated: `author: null` renders localized Anonymous; schema carries no submitter identity.
- **T-07-05 / T-07-SC** — accepted per plan (long-text layout; zero new npm deps).

## Human Verification Items (autonomous run — not blocking)

- Visual QA of the populated section (spacing, quote glyph, 3×3 grid, paper rhythm) once the bot publishes real entries or a temp entry is added — deferred to phase verification; the build-time escaped-render proof stands in for correctness here.

## Notes for 07-02 (bot side)

The consumed contract is `{ id: string, author: string | null, text: string, date: string (ISO 8601) }` in a top-level array. The website sorts by `date` desc and shows the newest 9; `id` is the stable key (Discord message id), never displayed. `reviews.json` ships `ensure_ascii=False, indent=2`-compatible (committed as `[]` with trailing newline).

## Self-Check: PASSED
