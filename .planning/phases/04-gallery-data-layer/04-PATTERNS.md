# Phase 4: Gallery & Data Layer - Pattern Map

**Mapped:** 2026-07-02
**Files analyzed:** 8 (5 new/net-new, 3 modified) + 1 package.json dependency add
**Analogs found:** 8 / 8 (every file has a strong in-repo analog)

> Read alongside `04-CONTEXT.md` (D-01..D-16) and `04-UI-SPEC.md` (approved design contract). This map answers "what existing code should each new file copy from," with line-level excerpts. All excerpts are READ-ONLY references — no source was modified.

---

## File Classification

| New/Modified File | Exists today? | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|---------------|------|-----------|----------------|---------------|
| `src/data/gallery.json` | **NO — net-new** | data / model | file-I/O (build import) | `src/data/services.json` | role-match (schema is flatter + single-lang captions, NOT bilingual-per-field) |
| `public/gallery/` (dir) | **NO — net-new** | asset store | file-I/O (static serve) | *(no analog — see No Analog Found)* | none |
| `src/scripts/gallery.ts` | **NO — net-new** | script / controller | event-driven | `src/scripts/cart.ts` (lifecycle+trap) + `src/scripts/chrome.ts` (doc listeners) + `src/scripts/motion/index.ts` (init/teardown) | exact (composite) |
| `src/components/sections/GalleryPage.astro` | YES (EmptyState shell) | component | transform (render data) | `src/components/sections/ServicesPage.astro` (data-driven page body) | exact |
| `src/components/sections/Teaser.astro` | YES (placeholder) | component | transform (render subset) | `src/components/sections/ServicesPage.astro` + itself (variant split) | exact |
| `src/pages/[lang]/index.astro` | YES | route / composition | request-response (SSG) | itself (swap `<Teaser variant="featured">` for featured grid) | exact |
| lightbox DOM (inside `gallery.ts`) | **NO — net-new** | UI construction | event-driven | `src/scripts/cart.ts` `openCartModal`/`trapFocus` + `src/components/CartSummaryModal.astro` | exact |
| `src/i18n/pages.json` (NOT `src/data/pages.json`) | YES | config / i18n | file-I/O (build import) | existing `es`/`en` structure in `pages.json` | exact |
| `src/styles/sections.css` (+ maybe new gallery styles) | YES | styling | n/a | `sections.css` section rhythm + `src/styles/motion.css` reveal + `chrome.css` `.dc-overlay`/`.dc-modal` | exact |
| `package.json` | YES | config | n/a | existing devDeps (pin exact versions, `npm audit`) | n/a |

**IMPORTANT net-new flags for the planner** (the CONTEXT/prompt listed these; they do NOT exist yet, treat as create-from-scratch):
- `src/data/gallery.json` — does not exist. `src/data/` currently contains ONLY `services.json`.
- `public/gallery/` — does not exist. Create it; commit a `.gitkeep` or a placeholder so the empty dir survives git + so the site builds when `gallery.json` is empty.
- `src/scripts/gallery.ts` — does not exist. `src/scripts/` currently contains `cart.ts`, `chrome.ts`, and `motion/`.
- Masonry.js + imagesLoaded — **NOT installed** (`package.json` has no `masonry`/`imagesloaded`). Planner must `npm install masonry-layout imagesloaded` (pin exact versions, run `npm audit`, per UI-SPEC Registry Safety note). `@types/masonry-layout` + `@types/imagesloaded` for TS.
- **i18n path correction:** the UI-SPEC + prompt say "`src/data/pages.json`" but the dictionary actually lives at **`src/i18n/pages.json`** (imported by `src/i18n/ui.ts`). All new gallery/lightbox keys go there, under both `es` and `en`.

---

## Pattern Assignments

### `src/data/gallery.json` (data/model, file-I/O) — NET-NEW

**Analog:** `src/data/services.json` — the established build-imported JSON data-file. **Key divergence (D-03):** services uses bilingual-per-field objects (`{ "es": "...", "en": "..." }`); gallery captions are a **single-language plain string** shown as-is, so DO NOT wrap `caption` in an `{es,en}` object.

**How services.json is imported + resolved** (`src/components/sections/ServicesPage.astro:13`, `27-36`):
```typescript
import servicesData from '../../data/services.json';
// ...
const resolvedTiers = servicesData.packages.tiers.map((tier) => ({
  ...tier,
  tier: (tier.tier as { es: string; en: string })[lang], // ← bilingual pick; gallery does NOT do this for caption
  // ...
}));
```

**Gallery contract to author** (from D-01..D-06 — this is the Phase 5 bot write-target). Ship the file as either an empty array `[]` or `{ "entries": [] }` — pick one and lock it, because the bot commits against exactly this shape. Recommended top-level array of:
```json
{
  "file": "2026-07-02-luna-a1b2c3.webp",
  "caption": "Luna — full outfit + toggles",
  "width": 1600,
  "height": 2000,
  "date": "2026-07-02T18:30:00Z"
}
```
- `file` is identity (D-02) — no separate `id`. Image lives at `public/gallery/<file>`.
- `caption` optional, single string (D-03) — used as `alt`; generic localized fallback when absent.
- `width`/`height` drive the CLS-free aspect box (D-04); `date` (required ISO 8601) drives newest-first sort + featured N=6 (D-05, D-15).
- Ship it **empty** for this phase so `EmptyState` fallback renders (D-12); Phase 5 fills it.

---

### `src/components/sections/GalleryPage.astro` (component, transform) — MODIFY

**Analog:** `src/components/sections/ServicesPage.astro` (data-driven page body that imports a `data/*.json`, resolves per-lang, `.map()`s into markup) + the file's own current EmptyState shell (keep as the empty-`gallery.json` fallback, D-12).

**Current shell to preserve as fallback** (`GalleryPage.astro:14-38`):
```astro
import EmptyState from '../EmptyState.astro';
import { useTranslations, type Lang } from '../../i18n/ui';
interface Props { lang: Lang; }
const { lang } = Astro.props;
const page = useTranslations(lang, 'pages').galeria;
const empty = useTranslations(lang, 'pages').emptyState;
---
<section class="section section-page-top section--rule">
  <div class="section-header reveal">
    <span class="section-tag">{page.tag}</span>
    <h2 class="section-title">{page.title}</h2>
    <p class="section-subtitle">{page.subtitle}</p>
  </div>
  <div class="reveal">
    <EmptyState heading={empty.heading} body={empty.galleryBody} ticketLabel={empty.ticketCta} />
  </div>
</section>
```

**Change pattern (mirror ServicesPage):**
1. Add `import galleryData from '../../data/gallery.json';` (same style as `import servicesData` at `ServicesPage.astro:13`).
2. Sort newest-first by `date` (D-05), compute a per-lang `altFallback` from `useTranslations(lang,'pages').gallery.altFallback`.
3. Conditionally render: `entries.length ? <masonry wall> : <EmptyState ...>` (D-12). Keep the exact `section section-page-top section--rule` + `section-header reveal` header wrapper (do not restyle the header — UI-SPEC "header already shipped").
4. Each tile is a real `<button>` (a11y contract, UI-SPEC), inside an aspect-ratio box: `style={`aspect-ratio:${w}/${h}`}` + `<img src={`/gallery/${e.file}`} width={w} height={h} alt={e.caption ?? altFallback} loading={i < cols ? 'eager' : 'lazy'} decoding="async">` (D-04/D-09/D-03). Auto-escaping only — never `set:html`.
5. Tag the wall container + tiles with data hooks (`data-gallery-wall`, `data-gallery-tile`, `data-index`) for `gallery.ts` to query. Add `.reveal` to tiles for the reveal system.

---

### `src/components/sections/Teaser.astro` + `src/pages/[lang]/index.astro` (featured grid) — MODIFY

**D-16:** replace the `featured` Teaser variant with a real featured grid (newest 6). The `gallery` variant stays a link-out placeholder.

**Landing composition today** (`src/pages/[lang]/index.astro:87-90`) — order must stay hero → featured → about → packages → gallery teaser → closing:
```astro
<Teaser lang={lang} variant="featured" />   {/* ← replace with featured grid */}
<About lang={lang} surface />
<PackagesSummary lang={lang} />
<Teaser lang={lang} variant="gallery" />     {/* ← keep as-is (link-out) */}
```

**Two implementation options for the planner** (executor discretion, per D-16):
- **(A) New `FeaturedGallery.astro` section component** rendered in `index.astro` for `variant="featured"` — cleanest; imports `gallery.json`, slices newest 6, renders the grid; falls back to `<EmptyState>` when `<1` entry.
- **(B) Extend `Teaser.astro`** so `variant==='featured'` branches to the grid and `variant==='gallery'` keeps the current placeholder.

**Teaser's existing variant-split + section pattern to mirror** (`Teaser.astro:18-41`):
```astro
const { lang, variant } = Astro.props;
const p = useTranslations(lang, 'pages');
const head = variant === 'featured' ? p.teaser.featured : p.teaser.gallery;
// ...
<section class={`section${variant === 'gallery' ? ' section--surface' : ''} section--rule`} data-teaser={variant}>
  <div class="section-header reveal">
    <span class="section-tag">{head.tag}</span>
    <h2 class="section-title">{head.title}</h2>
  </div>
```
Featured is an INK section (no `section--surface`) per the landing rhythm comment (`index.astro:81-86`). Reuse `teaser.featured.tag`/`.title` (already in `pages.json`) or the new `gallery.featuredTag`/`gallery.featuredTitle` keys.

**Featured grid contract** (UI-SPEC "Layout Contract — Featured Grid"): CSS grid 2-up mobile / 3-up ≥768; gap `--space-sm` → `--space-md`; tiles `aspect-ratio: 1/1; object-fit: cover`; newest 6 by `date` (D-15); each tile a focusable `<button>` that opens the lightbox in place; a `.link-arrow` "View full gallery" link `--space-xl` below → `localizedPath('gallery', lang)`. `localizedPath` import pattern: `Teaser.astro:12` `import { localizedPath } from '../../i18n/routes';`.

---

### `src/scripts/gallery.ts` (script/controller, event-driven) — NET-NEW

This is a **composite** of three existing scripts. It owns Masonry+imagesLoaded init AND the hand-rolled lightbox, mounted swap-safe on the View Transitions lifecycle.

**Analog 1 — lifecycle mount (`src/scripts/motion/index.ts:22-58`).** Copy the `inited` guard + register-once-at-module-scope pattern verbatim:
```typescript
let inited = false;
function initMotion(): void {
  if (inited) return;
  inited = true;
  // ...init effects...
}
function teardownMotion(): void {
  if (!inited) return;
  inited = false; // reset FIRST so a throwing destroyer can't permanently break re-init
  // ...destroy...
}
document.addEventListener('astro:page-load', initMotion);
document.addEventListener('astro:before-swap', teardownMotion);
```
`gallery.ts` MUST: on `astro:page-load` → destroy any prior Masonry instance, re-query the live `[data-gallery-wall]`, run imagesLoaded then `new Masonry(...)`, then run the reveal stagger AFTER layout settles (UI-SPEC "reveal runs AFTER imagesLoaded + Masonry layout settles"); on `astro:before-swap` → `masonry.destroy()`, remove any document-level lightbox listeners, null the instance. No-op cleanly when `[data-gallery-wall]` is absent (other pages).

**Analog 2 — cart.ts per-load flag + document-listener guard (`src/scripts/cart.ts:735-767`).** Copy the "reset per-load flag on before-swap, register on page-load, plus readyState fallback" trio — a page-specific script that may load AFTER `astro:page-load` fired:
```typescript
document.addEventListener('astro:before-swap', () => { initCartRanThisLoad = false; });
document.addEventListener('astro:page-load', initCart);
if (document.readyState !== 'loading') { initCart(); } // hard-nav fallback
```
Bind the document-level Escape/keyboard/pointer listeners ONCE behind a module flag (like `cartDocListenersBound` at `cart.ts:746-750`), re-querying the live overlay at event time.

**Analog 3 — chrome.ts document-level Escape + live re-query (`src/scripts/chrome.ts:203-218`).** The canonical "bind once, re-query live DOM, mirror close()" idiom for the lightbox Escape + backdrop close:
```typescript
if (!modalDocListenersBound) {
  modalDocListenersBound = true;
  document.addEventListener('keydown', (e) => {
    const live = document.querySelector<HTMLElement>('[data-dc-overlay]');
    if (e.key === 'Escape' && live?.classList.contains('active')) { /* mirror close */ }
  });
}
```

**Open/close animation sequencing (WR-01) — `cart.ts:603-609` / `chrome.ts:163-172`:**
```typescript
overlay.removeAttribute('hidden');            // unhide FIRST (enter layout)
document.body.style.overflow = 'hidden';
requestAnimationFrame(() => {                 // THEN add .active next frame so the fade plays
  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');
});
// close: remove .active, set aria-hidden, then re-add [hidden] on transitionend {once:true}
```

**Reduced-motion gate — reuse `src/scripts/motion/motion-prefs.ts:19-22`:**
```typescript
import { prefersReduced } from './motion/motion-prefs';
// call-time check; instant swap / no swipe-track / no entrance under reduce (UI-SPEC Motion section)
```

**Reveal stagger source (`src/scripts/motion/reveals.ts:60-73`)** — light offset stagger keyed off index, tokens read from `:root` via `spaceToken('--space-md')`; under `prefersReduced()` the whole travel/stagger is skipped (reveals.ts:37-52). Gallery tiles must run their stagger only AFTER Masonry positions them.

---

### Lightbox DOM (built inside `gallery.ts`) — NET-NEW

**Analog:** `src/scripts/cart.ts` `openCartModal`/`closeCartModal`/`trapFocus` (behavior) + `src/components/CartSummaryModal.astro` (markup + `.dc-overlay`/`.dc-modal` shell). D-13: reuse the `dc-overlay`/`dc-modal` + focus-trap; NOT PhotoSwipe.

**XSS-safe DOM construction (D-13, captions come from Discord — `cart.ts:573-591`):** `createElement` + `textContent` ONLY, never `innerHTML`:
```typescript
const listEl = overlay.querySelector<HTMLElement>('.cart-modal__list');
while (listEl.firstChild) listEl.removeChild(listEl.firstChild); // clear
quote.forEach((entry) => {
  const p = document.createElement('p');
  p.textContent = `• ${entry.name} — ${lineTotal}`; // textContent, XSS-safe
  listEl.appendChild(p);
});
```
Apply this exact idiom to the lightbox `<img>` (`img.src = '/gallery/'+file; img.alt = caption ?? altFallback`), caption node (`caption.textContent = ...`), and counter (`counter.textContent = \`${i+1} / ${total}\``).

**Focus trap (reuse `cart.ts:516-531` `trapFocus`) — copy nearly verbatim:**
```typescript
function trapFocus(container: HTMLElement): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])'),
    ).filter((el) => !el.hasAttribute('disabled') && !el.closest('[hidden]'));
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
    else { if (document.activeElement === last) { e.preventDefault(); first.focus(); } }
  };
}
```

**Focus store/restore (`cart.ts:600-601`, `703-705`; chrome.ts:157/178):**
```typescript
lastFocusBeforeModal = document.activeElement as HTMLElement; // on open, before showing
// on close:
lastFocusBeforeModal?.focus(); // return focus to the tile that opened it
lastFocusBeforeModal = null;
```

**Overlay markup contract** — reuse the CartSummaryModal overlay attributes verbatim (`CartSummaryModal.astro:34-45`). For the lightbox: `class="dc-overlay lightbox"`, `hidden`, `aria-hidden="true"`, `role="dialog"`, `aria-modal="true"`, `aria-label={lightbox.dialogLabel}`, and **`data-lenis-prevent`** (pauses Lenis smooth-scroll while open — UI-SPEC Body scroll lock). The lightbox overlay can be authored as a hidden Astro partial rendered by `GalleryPage.astro`/`index.astro`, or built entirely in JS — executor discretion; either way it reuses `.dc-overlay`.

**Wiring dismiss + backdrop click (`cart.ts:621-632`):**
```typescript
overlay.querySelector('[data-...-dismiss]')?.addEventListener('click', close, { once: true });
overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); }, { once: true });
```

**Lightbox-specific behavior NOT in any analog** (build fresh per UI-SPEC "Interaction Contract"): index state + loop (D-14), counter `n / total`, neighbor preload (`new Image().src = ...` on open + each nav), ←/→ keyboard nav, and mobile swipe (~50px threshold; horizontal=nav, down=close). All motion neutralized under `prefersReduced()`.

---

### `src/i18n/pages.json` (config/i18n) — MODIFY

**Analog:** the file's own `es`/`en` mirrored structure. `useTranslations(lang, 'pages')` slices by language (`src/i18n/ui.ts:49-54`). Add the new keys under BOTH `es` and `en`.

**Existing keys reused unchanged** (`pages.json`): `galeria.tag/title/subtitle` (header), `teaser.featured.tag/title` (`pages.json:39-42` es / `126-129` en), `emptyState.heading/galleryBody/galleryCta/ticketCta` (`pages.json:49-55` es / `136-142` en).

**New bilingual keys to add** (UI-SPEC Copywriting Contract). Nest under a new `gallery` + `lightbox` object inside `pages.es` and `pages.en` (mirror the existing `teaser`/`emptyState` nesting style):
| Key | ES | EN |
|-----|----|----|
| `gallery.altFallback` | `Nocturna Avatars — edición de avatar VRChat` | `Nocturna Avatars — VRChat avatar edit` |
| `gallery.viewAll` | `Ver galería completa` | `View full gallery` |
| `lightbox.close` | `Cerrar` | `Close` |
| `lightbox.prev` | `Anterior` | `Previous` |
| `lightbox.next` | `Siguiente` | `Next` |
| `lightbox.counterLabel` | `Imagen {n} de {total}` | `Image {n} of {total}` |
| `lightbox.dialogLabel` | `Galería — visor de imagen` | `Gallery — image viewer` |

(Interpolate `{n}`/`{total}` at runtime in `gallery.ts` — no interpolation helper exists yet; do a simple `.replace()`.)

---

### `src/styles/sections.css` / new gallery styles — MODIFY

**Analog:** existing `sections.css` section rhythm + `src/styles/motion.css` reveal states + `chrome.css` `.dc-overlay`/`.dc-modal`.

- **Section wrappers unchanged** (`sections.css:51-94`): `.section` (ink default), `.section--surface` (paper), `.section--rule` (hairline top/bottom), `.section-page-top` (nav offset). Gallery wall + featured both sit inside these.
- **Reveal initial state / reduced-motion escape hatch** (`src/styles/motion.css:10-22`) — DO NOT duplicate; tiles just get `.reveal`:
```css
html.motion-ready .reveal { opacity: 0; transform: translateY(var(--space-md)); }
@media (prefers-reduced-motion: reduce) {
  html.motion-ready .reveal { opacity: 1; transform: none; }
}
```
- **`.link-arrow`** for "View full gallery" is already defined (`sections.css:497-519`) — reuse, don't re-author.
- **Lightbox styling** reuses `.dc-overlay` (backdrop `rgba(4,5,10,0.88)`+`blur(8px)`, `z-index:10000`, fade 0.35s — `chrome.css:388-410`) and `.dc-modal` transform-in (`chrome.css:411-425`). Reduced-motion transition kill list at `chrome.css:601-609` — ADD `.lightbox` selectors there (or a new equivalent) so lightbox entrance/nav is neutralized under reduce.
- New tile/wall/featured/lightbox-chrome CSS: 0px radius, tokenized spacing (`--space-xs/sm/md` gutters), `--color-ink-raised` aspect-box placeholder, `focus-visible: 2px solid var(--color-red); outline-offset:2px` (mirrors `.dc-open-btn:focus-visible` at `chrome.css:504-508`), 44px `--touch-min` on lightbox controls (mirrors `.dc-dismiss`/`.link-arrow` min-height). Author as scoped `<style>` in the component or a new `src/styles/gallery.css` imported by the page — executor discretion; UI-SPEC has the full token table.

---

## Shared Patterns

### View Transitions swap-safe lifecycle (applies to `gallery.ts`)
**Source:** `src/scripts/motion/index.ts:22-58` (init/teardown guard) + `src/scripts/cart.ts:753-767` (per-load flag + readyState fallback) + `src/scripts/chrome.ts:203-218` (bind-once document listeners, re-query live DOM).
**Apply to:** the new `gallery.ts` — init Masonry+lightbox on `astro:page-load`, destroy on `astro:before-swap`, document listeners guarded by a module flag. This is the single most important cross-cutting concern: without it, Masonry instances and lightbox listeners leak/duplicate across every navigation.

### XSS-safe DOM construction (applies to lightbox in `gallery.ts`)
**Source:** `src/scripts/cart.ts:573-591`, `661-674` — `createElement` + `textContent`, never `innerHTML`. Captions originate from Discord messages (untrusted), so this is mandatory (D-13). Astro-side (`.astro` templates) rely on auto-escaping — never `set:html` (per EmptyState.astro:11-12 convention).

### Focus trap + focus restore (applies to lightbox)
**Source:** `src/scripts/cart.ts:516-531` (`trapFocus`), `600-601`+`703-705` (store/restore). Reuse verbatim; the lightbox is `role="dialog" aria-modal="true"` (UI-SPEC Accessibility Contract).

### Reduced-motion gate (applies to tiles reveal, hover, lightbox entrance/nav/swipe)
**Source:** JS `src/scripts/motion/motion-prefs.ts:19-22` `prefersReduced()`; CSS escape hatch `src/styles/motion.css:17-22` + `chrome.css:601-609`. Every motion path must branch off `prefersReduced()` (D-14, D-21, UI-SPEC Motion sections).

### Data import + per-lang resolution (applies to GalleryPage, featured grid)
**Source:** `src/components/sections/ServicesPage.astro:13` (`import ... from '../../data/*.json'`) + `src/i18n/ui.ts:49-54` (`useTranslations(lang, 'pages')`) + `src/i18n/routes.ts:31-34` (`localizedPath('gallery', lang)`). Note the caption divergence: gallery captions are single-language (D-03), unlike services' bilingual fields.

### `.dc-overlay`/`.dc-modal` reuse (applies to lightbox chrome)
**Source:** `src/styles/chrome.css:388-425` + `src/components/CartSummaryModal.astro:34-45` overlay attribute set (incl. `data-lenis-prevent`).

---

## No Analog Found

| File | Role | Data Flow | Reason / Planner guidance |
|------|------|-----------|---------------------------|
| `public/gallery/` (directory) | asset store | file-I/O | No existing image-content directory the bot targets. `public/` holds one-off assets (`hero-fallback.avif`) but no auto-populated media folder. Create the dir + a `.gitkeep` so it survives an empty git tree and the build succeeds with zero photos. This is a **contract artifact for Phase 5** — the bot commits `public/gallery/<file>` here (D-06/D-07). |
| Masonry.js + imagesLoaded init | vendor integration | event-driven | No prior use of a layout library — all Phase 2 motion is bespoke GSAP/Lenis. No init pattern to copy for `masonry-layout`/`imagesloaded` specifically; follow their docs, but wrap the init in the swap-safe lifecycle above. Not installed — planner adds them (pin exact versions + `npm audit`, UI-SPEC Registry Safety). |
| Lightbox counter / loop / neighbor-preload / swipe | interaction | event-driven | The MODAL shell (overlay, trap, open/close, Escape, backdrop) has strong analogs (cart modal); the image-carousel behaviors (index+loop D-14, counter, `new Image()` preload, ←/→ + touch-swipe) are net-new with no in-repo precedent. Build fresh from the UI-SPEC "Interaction Contract — Lightbox". |

---

## Metadata

**Analog search scope:** `src/data/`, `src/scripts/` (incl. `motion/`), `src/components/` (+ `sections/`), `src/pages/[lang]/`, `src/i18n/`, `src/styles/`, `public/`, `package.json`.
**Files scanned (read or grep-targeted):** GalleryPage.astro, Teaser.astro, ServicesPage.astro, CartSummaryModal.astro, EmptyState.astro, chrome.ts, cart.ts, motion/index.ts, motion/reveals.ts, motion/motion-prefs.ts, [lang]/index.astro, [lang]/[page].astro, i18n/ui.ts, i18n/routes.ts, i18n/pages.json, data/services.json, styles/motion.css, styles/sections.css, styles/chrome.css, styles/choreography.css, package.json.
**Pattern extraction date:** 2026-07-02
