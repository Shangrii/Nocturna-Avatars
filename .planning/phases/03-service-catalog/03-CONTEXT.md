# Phase 3: Service Catalog - Context

**Gathered:** 2026-06-30
**Status:** Ready for planning

<domain>
## Phase Boundary

A fully **data-driven `/servicios` page** rendered from a single `src/data/services.json` file.
Covers:
1. The 3 package tiers (Penumbra / Umbra / Eclipse) with features, prices, and add-ons
2. A modular catalog of individual services grouped by category (Unity, Blender/mesh, Textures, Accessories, Extras/NSFW)

Prices for catalog items are "Cotizar" (not yet agreed). Staff edit `services.json` to update packages and catalog content; zero code changes needed.

**In scope:** `services.json` schema definition; migrating `packages.json` data into it; building the CatalogSection component; wiring the services page to read from `services.json`; bilingual rendering of all content.

**Out of scope:** Gallery automation (Phase 4), bot cog (Phase 5), copy/i18n dictionary changes beyond the services domain, any new page routes.

</domain>

<decisions>
## Implementation Decisions

### Data file — location & schema

- **D-01:** Create `src/data/services.json` as the single source of truth for all service content. Astro imports it statically at build time (no runtime fetch). Staff edit this one file for all package and catalog updates.

- **D-02:** **Two-lang-per-entry bilingual strategy.** Every translatable string in `services.json` is an object `{ es: "...", en: "..." }`. Staff edit both languages in one place; no separate per-lang files.

- **D-03:** **Migrate everything** from `packages.json` into `services.json`. `packages.json` is retired (removed from `src/i18n/ui.ts` dictionaries); `src/i18n/ui.ts` gains a `services` import pointing to `src/data/services.json`. All package tiers, add-ons, and the addons note move to the new file.

- **D-04:** **Top-level schema:** `{ packages: { tiers: [...], addons: [...], addonsNote: {es, en} }, catalog: [...] }`. The `catalog` array contains category objects; each category object contains its own items array.

  Concrete schema shape:
  ```
  services.json
  ├── packages
  │   ├── tiers[]          ← 3 items (Penumbra/Umbra/Eclipse)
  │   │   ├── id           ← "penumbra" | "umbra" | "eclipse"
  │   │   ├── tier         ← {es, en}  e.g. {es: "Nivel I", en: "Level I"}
  │   │   ├── name         ← string    e.g. "Penumbra" (proper noun, no translation)
  │   │   ├── subtitle     ← {es, en}
  │   │   ├── price        ← string    e.g. "$40"
  │   │   ├── oneLiner     ← {es, en}
  │   │   ├── featured     ← boolean
  │   │   └── features[]   ← [{text: {es, en}, highlight: boolean}]
  │   ├── addons[]         ← [{name: {es, en}, price: string}]
  │   └── addonsNote       ← {es, en}
  └── catalog[]            ← category objects
      ├── id               ← "unity" | "blender" | "textures" | "accessories" | "extras"
      ├── category         ← {es, en}  (the display name for this category)
      └── items[]          ← [{name: {es, en}, price: string | "cotizar"}]
  ```

  Seed data: ship the 5 categories with empty `items: []` arrays. All catalog prices are `"cotizar"` until the team agrees.

### Catalog content

- **D-05:** Phase 3 ships a **schema-ready shell** for the catalog. The 5 categories (Unity, Blender/mesh, Textures, Accessories, Extras/NSFW) are defined in `services.json` with their bilingual names but empty item arrays. Staff populate items once prices are agreed — no code change needed.

- **D-06:** When a category's `items` array is empty, render a **per-category "coming soon" empty state** using the existing `EmptyState.astro` component. Do not hide empty categories; show them with a placeholder so the structure is visible.

- **D-07:** The **category list is fully dynamic** — the component loops over the `catalog` array from `services.json`. Staff add a new category by adding a new object to the array. No hardcoded category keys in component code.

### Catalog layout

- **D-08:** Individual services render as **editorial rows**: service name on the left, price or "Cotizar" on the right, separated by a hairline `1px` rule between items. Space Mono for price values (tabular figures). Fits the Refined Street Editorial system established in Phase 02.1.

- **D-09:** **Name + price only** per service item — no description field. The catalog is a quick-scan pricing reference; detail belongs in Discord tickets.

- **D-10:** Each category section opens with the **editorial section-tag pattern**: Space Mono uppercase tag (red accent) as the category label + a category heading below, then the service rows. Consistent with the existing `section-tag` pattern across the site.

### Add-ons

- **D-11:** Add-ons are **nested inside the `packages` key** (not a catalog category). `packages.addons[]` mirrors the existing 8-item structure from `packages.json`. This preserves the logical grouping: add-ons are package modifiers, not standalone services.

- **D-12:** `packages.addonsNote` stays a **free-text bilingual note** `{es, en}`. Staff edit the prose directly in `services.json`. No structured CTA replacement.

### Claude's Discretion

- Exact CSS for the editorial row layout (name/price spacing, hairline rule style, hover state if any)
- Tailwind token choices for the catalog section surface (ink vs. paper alternation)
- Specific wording for the "coming soon" empty state text in each category (can reuse `EmptyState.astro` with the existing headings or custom per-category)
- Whether to add a `ui` key to services.json for section headings / labels (vs. keeping those in `pages.json`)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing data to migrate from
- `src/i18n/packages.json` — current packages data (tiers, add-ons, note); this is the source of truth to migrate into `services.json`. All field values carry over verbatim.

### Existing components to update or reuse
- `src/components/sections/ServicesPage.astro` — current services page; the catalog "coming soon" empty state section in this file is the placeholder that Phase 3 replaces with a real catalog component.
- `src/components/PackageCard.astro` — already-built package tier card (condensed + full modes); update its data source from `packages.json` to `services.json`.
- `src/components/EmptyState.astro` — reuse for per-category "coming soon" state when `items[]` is empty.

### i18n architecture
- `src/i18n/ui.ts` — the i18n registry; remove the `packages` dictionary import and add a `services` import pointing to `src/data/services.json`.

### Design system (carry forward from Phase 02.1)
- `.planning/phases/02.1-visual-redesign-refined-street-editorial/02.1-CONTEXT.md` — locked design decisions (D-04 through D-13): Tailwind v4 `@theme` tokens, Space Grotesk display, Space Mono labels/prices, Inter body, ink/paper section rhythm, red used surgically, editorial section-tag pattern.

### Project constraints
- `CLAUDE.md` — brand constraints (red #c0192c / navy #0a0c14 / off-white #f0eae4), static Astro output (no backend/DB), GitHub Pages deploy, bilingual ES+EN required.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PackageCard.astro` — fully built with `condensed` (landing summary) and full (services page) modes; only data source needs to change from `packages.json` i18n dict to `services.json` direct import.
- `EmptyState.astro` — component for graceful "nothing here yet" states; already styled to the design system. Reuse for empty catalog categories.
- `ServicesPage.astro` — already has the two-section layout (packages section + catalog section). The catalog section has an explicit `TODO: Phase 3` empty state in it — that's the insertion point.

### Established Patterns
- **JSON import at build time:** Astro components import JSON directly (`import data from '../data/services.json'`). No fetch, no async. This is the pattern used by all `src/i18n/*.json` files.
- **`useTranslations(lang, 'dictName')`:** The existing i18n helper in `ui.ts`. Phase 3 extends this to include a `services` dictionary pointing to `src/data/services.json`.
- **Section-tag pattern:** `<span class="section-tag">` (Space Mono uppercase, red accent line). Already used in every section. Reuse for catalog category headers.
- **Reveal animation:** `class="reveal"` on elements that should animate in on scroll (GSAP/ScrollTrigger from Phase 2). New catalog sections should follow this pattern.

### Integration Points
- `src/i18n/ui.ts` → add `services` dictionary entry; remove `packages` entry.
- `src/components/sections/ServicesPage.astro` → replace `pkg = useTranslations(lang, 'packages')` with `svc = import('../../data/services.json')` (or via the updated `useTranslations`); replace catalog empty-state with `CatalogSection` component.
- `src/components/sections/PackagesSummary.astro` (landing) — also imports packages via i18n; must update to use services.json too.

</code_context>

<specifics>
## Specific Ideas

- Price field in services.json uses the string `"cotizar"` (lowercase) as the sentinel value. The component renders "Cotizar" / "Cotizar" (same in both languages per the ROADMAP) when it detects this value. Any real price is a string like `"+$5 USD"` or `"$40"`.
- The catalog section sits **below** the packages + add-ons section on `/servicios`, matching the existing two-section layout in `ServicesPage.astro`.
- The landing `PackagesSummary` uses `condensed` mode of `PackageCard` — it must also migrate its data source from `packages.json` to `services.json`.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 3 scope. (Gallery data schema and automation remain Phase 4/5.)

</deferred>

---

*Phase: 03-service-catalog*
*Context gathered: 2026-06-30*
