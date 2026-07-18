# Store-First Repositioning — Design

**Date:** 2026-07-18
**Repo:** Website (Astro static, GitHub Pages, branch `revamp`)
**Status:** Design — awaiting user review before planning

## Goal

Nocturna's business focus has shifted: ready-to-use asset **sales (the store)** are
now the primary offering, with custom **commission services** secondary. Several
pieces of the landing + navigation still read commissions-first from the original
Phase 1–3 build. This work repositions the site's messaging and layout to
store-first, and adds a light "glitch" audio layer that extends the site's existing
glitch visual identity into sound.

## Non-Goals (YAGNI)

- No change to the `/servicios` route/slug or any URL — only labels change (no broken
  links / SEO impact).
- No inline shopping cart on the landing — the cart stays on `/tienda` (and
  `/servicios`); the landing teaser drives visitors TO the store.
- No new store data model — the teaser reads the existing `store.json`.
- No new audio asset files — the SFX is synthesized at runtime (Web Audio API).
- No redesign of the store, gallery, packages, or reviews sections themselves.

## Components

The change is five independently-testable pieces.

### A. About section — trim "Our story"

`src/components/sections/About.astro` currently renders: header ("Who are we?" /
"We're not 'commissions by DM'"), 3 feature cards, a 6-step commission workflow, and
an "Our story" sub-block (2 paragraphs).

**Change:** remove ONLY the `about-story` sub-block (the `about-story-title` + the
`story` paragraphs). Keep the header, the 3 feature cards, and the workflow.

- `About.astro`: delete the `.about-story` block (markup) and its scoped styles.
- `src/i18n/pages.json`: remove `about.storyTitle` and `about.story` (both `es` + `en`).

### B. StoreTeaser — new landing section

New `src/components/sections/StoreTeaser.astro`, mirroring the existing
`FeaturedGallery.astro` pattern (a lightweight, conversion-focused landing teaser —
NOT the full store page).

- Reads `src/data/store.json` defensively (copy-before-filter; tolerate missing/typo'd
  fields exactly as `StorePage.astro` does).
- Selects **featured-pinned first, then newest-by-`date`**, SFW only (`!nsfw`), and
  takes the first **4**. Auto-curated (no manual list) so the bot's `store.json` sync
  keeps it current with zero code change — same principle as `FeaturedGallery`.
- Renders a purpose-built **lightweight teaser card** per product: product image,
  name (locale-resolved `name[lang]`), price, and an optional `featured` badge. The
  WHOLE card is an `<a href={localizedPath('store', lang)}>` linking to `/tienda`
  (mirrors how `FeaturedGallery` cards drive to the gallery). No inline add-to-cart,
  no quick-view, no product island, no cart scripts on the landing (the cart UI lives
  only on `/tienda` + `/servicios` today; dragging it onto the landing is out of scope).
- A `.link-arrow` "View store · Ver tienda" link to `/tienda` below the grid.
- Empty/typo'd store (0 valid SFW products) → render nothing (no empty grid), matching
  the FeaturedGallery/portfolio empty rule. (The store's own page keeps its EmptyState.)
- All copy renders through Astro auto-escaping only (no raw-HTML directive) — store.json
  is a staff write-target (T-06-01 parity).
- New i18n keys under `pages.teaser.store`: `tag`, `title`, and `viewAll`
  (the link label, e.g. `"Ver tienda"` / `"View store"`). Price uses the existing
  `pages.tienda.usd` suffix. Add all under both `es` + `en`.

**Placement:** inserted into `src/pages/[lang]/index.astro` directly above
`PackagesSummary`. New landing order:

`Hero → FeaturedGallery → About → StoreTeaser → PackagesSummary → Reviews`

`StoreTeaser` gets a `surface`/rule treatment consistent with the alternating
ink/paper rhythm (match whatever the adjacent sections use so the rhythm stays intact).

### C. Copy pivot

**Navbar** (`src/components/Nav.astro` + `src/i18n/nav.json`):

- Relabel `navServices`: `"Servicios"` → `"Comisiones"` (es), `"Services"` →
  `"Commissions"` (en). **Label only** — the link still points at `/servicios`.
- Reorder nav items to store-first: **Home · Tienda · Comisiones · Galería · Términos**
  (currently Home · Servicios · Galería · Tienda · Términos). This is a markup reorder
  in `Nav.astro`; the mobile drawer order must match.

**Hero CTAs** (`src/pages/[lang]/index.astro` hero + `src/i18n/home.json`):

- Add two NEW i18n keys (do NOT repurpose `ctaPrimary`/`ctaSecondary` — those stay
  `"Open a Ticket"` / `"View Packages"` for the mid-page Discord trigger at
  `index.astro:101` and any other `dc-trigger` reuse):
  - `heroCtaStore`: `"Ver Tienda"` / `"View Store"`
  - `heroCtaCommissions`: `"Ver Comisiones"` / `"View Commissions"`
- Rewire the two hero buttons (`index.astro:70-73`):
  - Primary → `<a href={localizedPath('store', lang)} class="hero-cta">` = **View Store**
    (was the `dc-trigger` Discord button).
  - Secondary → `<a href={localizedPath('services', lang)} class="hero-cta hero-cta--outline">`
    = **View Commissions** (was "View Packages", already an `<a>` to services).
- The Discord "Open a Ticket" path is NOT lost — it remains via the global FloatingCTA
  and the nav Discord button. It is simply demoted from the hero (store-first).

**Discord modal copy** (`src/i18n/nav.json` — `modalBody`, both langs). The current
copy is commission/order-framed AND stale (it says the store is "coming soon", but the
store is live). Replace with a store-aware, commission/support framing:

- es `modalBody`: *"Únete a nuestro Discord para abrir un ticket: encargos
  personalizados, cotizaciones y soporte. ¿Buscas assets listos para usar? Ya puedes
  explorar nuestra tienda."*
- en `modalBody`: *"Join our Discord to open a ticket: custom commissions, quotes, and
  support. Looking for ready-to-use assets? Our store is already open."*
- `modalTitleEm` currently "ordenar"/"order" — keep as-is (still fits opening a ticket).

### D. Glitch SFX system

A new, self-contained interaction-audio module that plays a short synthesized "glitch
tick" on click of buttons and nav links, extending the glitch visual identity into
sound.

- New `src/scripts/sfx.ts`:
  - A single lazily-created `AudioContext` (created on the first qualifying user
    gesture — respects the browser autoplay gesture requirement; a click IS a gesture,
    so click SFX is always allowed).
  - Synthesizes the tick with Web Audio only (oscillator/noise burst + short gain
    envelope, ~30–60 ms) — no asset files. Exact timbre is tunable; target a dry,
    short, digital "glitch" tick (not a musical beep).
  - **Event delegation on `document`** (`click`, capture or bubble) matching a fixed
    selector set: `.hero-cta`, `.btn-primary`, `.nav-link`, `.dc-trigger`,
    `.link-arrow` (buttons + nav only, per scope). Delegation on `document` survives
    Astro ClientRouter page swaps automatically (no per-navigation re-init).
  - Throttle/guard so a rapid double-fire on one element doesn't stack.
- **Mute state** (`resolveMuted()` — the one unit worth a logic test):
  - Persisted key `localStorage['nocturna-sfx-muted']` = `"1"` | `"0"`.
  - Default when unset: **unmuted**, EXCEPT auto-muted when
    `matchMedia('(prefers-reduced-motion: reduce)').matches` is true.
  - An explicit user choice (toggle) always wins over the reduced-motion default and is
    persisted, so a reduced-motion user who un-mutes stays un-muted.
- **Mute toggle UI**: a small speaker/`speaker-muted` icon button in the nav, adjacent
  to the language switcher (`src/components/Nav.astro`, mobile drawer too). Toggles the
  state, updates the icon + `aria-pressed`/`aria-label`, persists to localStorage. Purely
  additive to the nav — must not disturb existing nav layout/behavior.
- Load: imported once (e.g. a `<script>` in `BaseLayout.astro` alongside the other
  global scripts) so it is present on every page; the module no-ops safely if Web Audio
  is unavailable.

### E. Testing / verification

- `astro build` passes (all 22 routes compile).
- A small unit-style logic test for `resolveMuted()` (unset+reduced-motion → muted;
  unset+no-preference → unmuted; explicit "0" under reduced-motion → unmuted; explicit
  "1" → muted). This is the one branch worth testing; Web Audio playback itself is
  verified manually.
- Manual UAT (documented, human-run): store teaser shows featured products and links to
  /tienda; landing order correct; About has no "Our story"; nav reads
  Home·Tienda·Comisiones·Galería·Términos; hero CTAs are View Store / View Commissions
  and link correctly; Discord modal shows the new store-aware copy; clicking a
  button/nav link plays the glitch tick; the nav mute toggle silences it and persists
  across reloads; with `prefers-reduced-motion` emulated the SFX starts muted.

## File-by-file change list

**Modified**
- `src/components/sections/About.astro` — remove `.about-story` block + its styles.
- `src/i18n/pages.json` — remove `about.storyTitle`/`about.story`; add `teaser.store.*`.
- `src/pages/[lang]/index.astro` — insert `<StoreTeaser>` above `<PackagesSummary>`;
  rewire the two hero buttons to the new store/commissions links + keys.
- `src/i18n/home.json` — add `heroCtaStore`, `heroCtaCommissions` (es + en).
- `src/i18n/nav.json` — relabel `navServices` → Comisiones/Commissions; rewrite
  `modalBody` (es + en).
- `src/components/Nav.astro` — reorder nav items (store-first) in both desktop + mobile;
  add the SFX mute-toggle button next to the language switcher.
- `src/layouts/BaseLayout.astro` — import the global `sfx.ts` script.

**New**
- `src/components/sections/StoreTeaser.astro`
- `src/scripts/sfx.ts`
- a test for `resolveMuted()` (location/runner per repo convention; if none exists, a
  minimal standalone node/vitest check — decide during planning).

## Risks / notes

- **Cross-repo data race:** `store.json` (like `editors.json`) is bot-written; the bot
  may commit between our local edits and push. The teaser only READS `store.json`, so
  there's no conflict risk on our side beyond the usual rebase-on-push (handle exactly
  as we did this session). We do not modify `store.json`.
- **Web Audio is hard to auto-test** — accepted; covered by the `resolveMuted()` logic
  test + manual UAT.
- **No `prefers-reduced-sound`** media query exists cross-browser, so the manual mute
  toggle (with the reduced-motion default) is the accessibility answer.
- **Nav real-estate:** adding a mute toggle must not crowd the mobile nav — verify the
  toggle placement at ~360px during UAT.
