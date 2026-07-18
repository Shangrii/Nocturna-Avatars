# Store-First Repositioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reposition the Nocturna landing + navigation from commissions-first to store-first, and add a synthesized "glitch" click-SFX layer with a persisted, reduced-motion-aware mute toggle.

**Architecture:** Pure content/markup edits to existing Astro components + i18n JSON, one new lightweight landing section (`StoreTeaser`, mirroring `FeaturedGallery`), and one new self-contained client module (`sfx.ts`) that synthesizes audio via the Web Audio API and binds via `document`-level event delegation (survives Astro ClientRouter swaps). The one branch worth unit-testing (`resolveMuted`) is extracted to a pure module and tested with vitest.

**Tech Stack:** Astro 7 (static output), TypeScript, Web Audio API, vitest (new dev-only).

## Global Constraints

- Static output only — must stay deployable to GitHub Pages; no backend/DB, no new runtime dependency (vitest is dev-only).
- Bilingual ES + EN required for every user-facing string.
- No URL/route/slug changes — `/servicios` stays; only its label changes.
- `store.json` and `editors.json` are bot-written — READ only, never modified here.
- All external data rendered through Astro auto-escaping only — never a raw-HTML directive (XSS parity with existing sections).
- Brand: red `#c0192c` / navy `#0a0c14` / off-white `#f0eae4`; keep the glitch identity.
- Verification for markup/copy tasks = `astro build` (all 22 routes compile) + `dist/` grep assertions; Web Audio playback is verified by manual UAT.

---

### Task 1: Trim About "Our story"

**Files:**
- Modify: `src/components/sections/About.astro` (remove the `.about-story` block + its scoped styles)
- Modify: `src/i18n/pages.json` (remove `about.storyTitle` + `about.story`, both `es` + `en`)

**Interfaces:**
- Consumes: nothing
- Produces: nothing (self-contained content removal)

- [ ] **Step 1: Remove the story markup block from `About.astro`**

Delete these lines (the final block inside `<section>`, currently lines 84-87):

```astro
  <div class="about-story reveal">
    <h3 class="about-story-title">{t.storyTitle}</h3>
    {t.story.map((para) => <p>{para}</p>)}
  </div>
```

Then remove any now-unused `.about-story`, `.about-story-title` rules from the component's `<style>` block if present (search the file for `about-story`).

- [ ] **Step 2: Remove the story copy keys from `pages.json`**

In BOTH the `es` and `en` `about` objects, delete the `storyTitle` string and the `story` array (the 2-paragraph array). Leave `tag`, `title`, `subtitle`, `features`, `workflowTitle`, `workflowSteps` intact.

- [ ] **Step 3: Build and verify the story text is gone**

Run: `npx astro build`
Expected: `Complete!`, 22 pages built, no error.

Run: `grep -rc "Our story\|Nuestra historia\|about-story" dist/es/index.html dist/en/index.html dist/index.html`
Expected: `0` for every file (the story block no longer renders).

Run: `grep -c "workflow-step\|feature-card" dist/en/index.html`
Expected: a non-zero count (the kept cards + workflow still render).

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/About.astro src/i18n/pages.json
git commit -m "landing: drop About 'Our story' sub-block"
```

---

### Task 2: StoreTeaser section + landing insertion

**Files:**
- Create: `src/components/sections/StoreTeaser.astro`
- Modify: `src/i18n/pages.json` (add `teaser.store` under `es` + `en`)
- Modify: `src/pages/[lang]/index.astro` (import + render `<StoreTeaser>` above `<PackagesSummary>`)

**Interfaces:**
- Consumes: `src/data/store.json` (read-only), `useTranslations`, `localizedPath`
- Produces: `<StoreTeaser lang={Lang} />` — a landing section rendering ≤4 featured/newest SFW products, each linking to `/tienda`

- [ ] **Step 1: Add the teaser i18n keys to `pages.json`**

Under the existing `es` root object add (mirror the shape of the existing `teaser` object if one exists; otherwise add a `teaser` object):

```json
"teaser": {
  "store": {
    "tag": "Tienda",
    "title": "Assets listos para usar",
    "viewAll": "Ver tienda"
  }
}
```

Under `en`:

```json
"teaser": {
  "store": {
    "tag": "Store",
    "title": "Ready-to-use assets",
    "viewAll": "View store"
  }
}
```

If a `teaser` object ALREADY exists (it holds `featured` for the gallery), add the `store` key INTO that existing object rather than creating a second `teaser`.

- [ ] **Step 2: Create `StoreTeaser.astro`**

Create `src/components/sections/StoreTeaser.astro`:

```astro
---
/**
 * StoreTeaser — the landing's store teaser (store-first repositioning).
 *
 * A lightweight, conversion-focused teaser (NOT the full /tienda page): it renders
 * the featured-pinned-then-newest SFW products from store.json as simple cards that
 * link to /tienda, mirroring FeaturedGallery's role for the gallery. No cart, no
 * quick-view, no product island — the cart lives only on /tienda. store.json is a
 * staff/bot write-target so the read is defensive end-to-end (copy-before-filter,
 * per-field fallback); all copy renders through Astro auto-escaping only (T-06-01).
 */
import { useTranslations, type Lang } from '../../i18n/ui';
import { localizedPath } from '../../i18n/routes';
import storeData from '../../data/store.json';

interface StoreProduct {
  id: string;
  name?: { es?: string; en?: string };
  price?: string;
  images?: string[];
  editor?: string;
  nsfw?: boolean;
  featured?: boolean;
  date?: string;
}

interface Props {
  lang: Lang;
}
const { lang } = Astro.props;
const head = useTranslations(lang, 'pages').teaser.store;
const usd = useTranslations(lang, 'pages').tienda.usd;

// Defensive copy-before-filter (StorePage parity): keep only products with the
// structural minimum (id + name object) and SFW; featured pinned first, then newest
// by date; take the first 4. Auto-curated so store.json sync keeps it current.
const rawProducts: StoreProduct[] = Array.isArray((storeData as { products?: unknown }).products)
  ? ([...((storeData as { products: StoreProduct[] }).products)])
  : [];
const featured = rawProducts
  .filter(
    (p) =>
      Boolean(p) &&
      typeof p.id === 'string' &&
      typeof p.name === 'object' && p.name !== null &&
      p.nsfw !== true &&
      Array.isArray(p.images) && typeof p.images[0] === 'string' && p.images[0].length > 0,
  )
  .sort(
    (a, b) =>
      (b.featured ? 1 : 0) - (a.featured ? 1 : 0) ||
      String(b.date ?? '').localeCompare(String(a.date ?? '')),
  )
  .slice(0, 4)
  .map((p) => ({
    id: p.id,
    name: p.name?.[lang] ?? p.name?.es ?? p.name?.en ?? '',
    price: typeof p.price === 'string' ? p.price : String(p.price ?? ''),
    image: p.images![0],
  }));
---

{featured.length >= 1 && (
  <section class="section section--rule" data-store-teaser>
    <div class="section-header reveal">
      <span class="section-tag">{head.tag}</span>
      <h2 class="section-title">{head.title}</h2>
    </div>

    <div class="store-teaser-grid reveal">
      {featured.map((product) => (
        <a class="store-teaser-card" href={localizedPath('store', lang)}>
          <span class="store-teaser-card__frame">
            <img src={product.image} alt={product.name} loading="lazy" decoding="async" />
          </span>
          <span class="store-teaser-card__name">{product.name}</span>
          {product.price && <span class="store-teaser-card__price">${product.price} {usd}</span>}
        </a>
      ))}
    </div>

    <div class="featured-action reveal">
      <a href={localizedPath('store', lang)} class="link-arrow">{head.viewAll}</a>
    </div>
  </section>
)}

<style>
  .store-teaser-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-md);
    max-width: 1100px;
    margin-inline: auto;
  }
  @media (min-width: 640px) {
    .store-teaser-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (min-width: 1024px) {
    .store-teaser-grid { grid-template-columns: repeat(4, 1fr); }
  }
  .store-teaser-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
    text-decoration: none;
    color: inherit;
  }
  .store-teaser-card__frame {
    display: block;
    aspect-ratio: 1 / 1;
    overflow: hidden;
    border: 1px solid var(--color-border);
    background: var(--color-ink-raised, rgba(255,255,255,0.03));
  }
  .store-teaser-card__frame img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }
  .store-teaser-card:hover .store-teaser-card__frame img { transform: scale(1.04); }
  .store-teaser-card__name { font-weight: 600; }
  .store-teaser-card__price { font-family: var(--font-mono); color: var(--color-white-dim, #9a9198); }
  @media (prefers-reduced-motion: reduce) {
    .store-teaser-card__frame img { transition: none; }
    .store-teaser-card:hover .store-teaser-card__frame img { transform: none; }
  }
</style>
```

NOTE: verify the exact token names (`--color-border`, `--font-mono`, `--space-*`) against `src/styles/theme.css`; substitute the repo's actual token names if these differ. Match `FeaturedGallery.astro`'s `.featured-action` / `.link-arrow` usage for the "view all" link.

- [ ] **Step 3: Insert `<StoreTeaser>` into the landing above packages**

In `src/pages/[lang]/index.astro`, add the import next to the other section imports (near line 11-14):

```astro
import StoreTeaser from '../../components/sections/StoreTeaser.astro';
```

Then change the section render block (currently lines 88-91) to insert StoreTeaser between About and PackagesSummary:

```astro
  <FeaturedGallery lang={lang} />
  <About lang={lang} surface />
  <StoreTeaser lang={lang} />
  <PackagesSummary lang={lang} />
  <Reviews lang={lang} />
```

- [ ] **Step 4: Build and verify the teaser renders and links to the store**

Run: `npx astro build`
Expected: `Complete!`, 22 pages built.

Run: `grep -c "data-store-teaser" dist/en/index.html dist/es/index.html`
Expected: `1` each (the section rendered — assumes store.json has ≥1 SFW product; if the store is empty this is `0` by design, in which case confirm with `node -e "console.log(require('./src/data/store.json').products.filter(p=>!p.nsfw).length)"`).

Run: `grep -o "store-teaser-card" dist/en/index.html | head -1`
Expected: `store-teaser-card` (cards present).

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/StoreTeaser.astro src/i18n/pages.json "src/pages/[lang]/index.astro"
git commit -m "landing: add StoreTeaser section above packages"
```

---

### Task 3: Rewire hero CTAs to View Store / View Commissions

**Files:**
- Modify: `src/i18n/home.json` (add `heroCtaStore`, `heroCtaCommissions` to `es` + `en`)
- Modify: `src/pages/[lang]/index.astro` (hero CTA markup, lines 69-74)

**Interfaces:**
- Consumes: `localizedPath('store' | 'services', lang)`
- Produces: hero renders two `<a>` CTAs (store primary, commissions secondary)

- [ ] **Step 1: Add the new hero CTA keys to `home.json`**

In the `es` object add:

```json
"heroCtaStore": "Ver Tienda",
"heroCtaCommissions": "Ver Comisiones",
```

In the `en` object add:

```json
"heroCtaStore": "View Store",
"heroCtaCommissions": "View Commissions",
```

Leave `ctaPrimary` ("Abrir Ticket"/"Open a Ticket") and `ctaSecondary` UNTOUCHED — the mid-page Discord trigger and FloatingCTA still use `ctaPrimary`.

- [ ] **Step 2: Rewire the two hero buttons**

In `src/pages/[lang]/index.astro`, replace the hero CTA block (currently lines 69-74):

```astro
      <div class="hero-ctas reveal">
        <button class="hero-cta dc-trigger" type="button">
          {t.ctaPrimary}
        </button>
        <a href={localizedPath('services', lang)} class="hero-cta hero-cta--outline">{t.ctaSecondary}</a>
      </div>
```

with:

```astro
      <div class="hero-ctas reveal">
        <a href={localizedPath('store', lang)} class="hero-cta">{t.heroCtaStore}</a>
        <a href={localizedPath('services', lang)} class="hero-cta hero-cta--outline">{t.heroCtaCommissions}</a>
      </div>
```

- [ ] **Step 3: Build and verify the hero CTAs**

Run: `npx astro build`
Expected: `Complete!`, 22 pages built.

Run: `grep -o 'class="hero-cta"[^>]*>View Store' dist/en/index.html; grep -o 'View Commissions' dist/en/index.html`
Expected: both match (primary "View Store", secondary "View Commissions").

Run: `grep -o 'href="/en/store"' dist/en/index.html | head -1`
Expected: `href="/en/store"` (store CTA points at the store).

- [ ] **Step 4: Commit**

```bash
git add src/i18n/home.json "src/pages/[lang]/index.astro"
git commit -m "landing: hero CTAs to View Store / View Commissions"
```

---

### Task 4: Nav relabel + reorder + Discord modal copy

**Files:**
- Modify: `src/i18n/routes.ts:36` (reorder `navConcepts`)
- Modify: `src/i18n/nav.json` (relabel `navServices`; rewrite `modalBody`, both langs)

**Interfaces:**
- Consumes: nothing
- Produces: nav renders Home · Tienda · Comisiones · Galería · Términos; modal shows store-aware copy

- [ ] **Step 1: Reorder the nav concepts (store-first)**

In `src/i18n/routes.ts`, change line 36:

```ts
export const navConcepts: PageConcept[] = ['home', 'services', 'gallery', 'store', 'terms'];
```

to:

```ts
export const navConcepts: PageConcept[] = ['home', 'store', 'services', 'gallery', 'terms'];
```

(The concept stays `services` — only its position and label change; the route remains `/servicios`.)

- [ ] **Step 2: Relabel + rewrite modal copy in `nav.json`**

In the `es` object: change `"navServices": "Servicios"` to `"navServices": "Comisiones"`, and replace `modalBody` with:

```json
"modalBody": "Únete a nuestro Discord para abrir un ticket: encargos personalizados, cotizaciones y soporte. ¿Buscas assets listos para usar? Ya puedes explorar nuestra tienda.",
```

In the `en` object: change `"navServices": "Services"` to `"navServices": "Commissions"`, and replace `modalBody` with:

```json
"modalBody": "Join our Discord to open a ticket: custom commissions, quotes, and support. Looking for ready-to-use assets? Our store is already open.",
```

- [ ] **Step 3: Build and verify nav order + labels + modal copy**

Run: `npx astro build`
Expected: `Complete!`, 22 pages built.

Run: `node -e "const h=require('fs').readFileSync('dist/en/index.html','utf8'); const nav=h.slice(h.indexOf('data-nav-links')); const order=[...nav.matchAll(/class=\"nav-link[^>]*>([^<]+)</g)].map(m=>m[1].trim()); console.log(order.join(' | '));"`
Expected: `Home | Store | Commissions | Gallery | Terms`

Run: `grep -c "Our store is already open" dist/en/index.html`
Expected: `1` (new modal copy present).

Run: `grep -c "coming soon\|próximamente" dist/en/index.html dist/es/index.html`
Expected: `0` each (stale copy gone).

- [ ] **Step 4: Commit**

```bash
git add src/i18n/routes.ts src/i18n/nav.json
git commit -m "nav: store-first order + Comisiones label + store-aware modal"
```

---

### Task 5: SFX mute-state logic (vitest TDD)

**Files:**
- Modify: `package.json` (add vitest dev-dep + `test` script)
- Create: `src/scripts/sfx-mute.ts`
- Create: `src/scripts/sfx-mute.test.ts`

**Interfaces:**
- Produces:
  - `resolveMuted(stored: string | null, reducedMotion: boolean): boolean`
  - `const SFX_MUTE_KEY = 'nocturna-sfx-muted'`

- [ ] **Step 1: Add vitest (dev-only) + test script**

Run: `npm install -D vitest`

Then in `package.json` `scripts`, add:

```json
"test": "vitest run"
```

- [ ] **Step 2: Write the failing test**

Create `src/scripts/sfx-mute.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveMuted } from './sfx-mute';

describe('resolveMuted', () => {
  it('unset + no reduced-motion → unmuted', () => {
    expect(resolveMuted(null, false)).toBe(false);
  });
  it('unset + reduced-motion → muted (auto)', () => {
    expect(resolveMuted(null, true)).toBe(true);
  });
  it('explicit "0" overrides the reduced-motion default → unmuted', () => {
    expect(resolveMuted('0', true)).toBe(false);
  });
  it('explicit "1" → muted', () => {
    expect(resolveMuted('1', false)).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/scripts/sfx-mute.test.ts`
Expected: FAIL — cannot resolve `./sfx-mute` (module not created yet).

- [ ] **Step 4: Write the implementation**

Create `src/scripts/sfx-mute.ts`:

```ts
/**
 * Pure mute-state resolution for the glitch SFX layer.
 *
 * An explicit persisted user choice ("1" = muted, "0" = unmuted) always wins. When
 * unset, the SFX defaults to ON, EXCEPT it auto-mutes for users who prefer reduced
 * motion (there is no cross-browser prefers-reduced-sound query, so we reuse the
 * reduced-motion signal as the "less stimulation" default). Extracted as a pure
 * function so this branch is unit-testable without a DOM.
 */
export const SFX_MUTE_KEY = 'nocturna-sfx-muted';

export function resolveMuted(stored: string | null, reducedMotion: boolean): boolean {
  if (stored === '1') return true;
  if (stored === '0') return false;
  return reducedMotion;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/scripts/sfx-mute.test.ts`
Expected: PASS (4 passed).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/scripts/sfx-mute.ts src/scripts/sfx-mute.test.ts
git commit -m "sfx: pure mute-state resolver + vitest"
```

---

### Task 6: SFX Web Audio engine + global load

**Files:**
- Create: `src/scripts/sfx.ts`
- Modify: `src/layouts/BaseLayout.astro` (import `sfx.ts` globally, after the motion script)

**Interfaces:**
- Consumes: `resolveMuted`, `SFX_MUTE_KEY` from `./sfx-mute`
- Produces (module side effects + exports for Task 7):
  - `toggleMuted(): boolean`
  - `isMuted(): boolean`
  - `updateToggleUI(): void`
  - fires `document` `CustomEvent('nocturna:sfx-muted', { detail: boolean })` on change
  - plays a tick on click of `.hero-cta, .btn-primary, .nav-link, .nav-cta, .dc-trigger, .link-arrow`
  - handles clicks on `[data-sfx-toggle]` (toggles + refreshes UI, no tick)

- [ ] **Step 1: Create `sfx.ts`**

Create `src/scripts/sfx.ts`:

```ts
/**
 * Glitch SFX layer — a short synthesized "glitch tick" on click of buttons + nav
 * links, extending the site's glitch visual identity into sound. Web Audio only (no
 * asset files). Bound via document-level event delegation so it survives Astro
 * ClientRouter page swaps with no per-navigation re-init. Muted state is resolved
 * from a persisted choice + prefers-reduced-motion (see ./sfx-mute).
 */
import { resolveMuted, SFX_MUTE_KEY } from './sfx-mute';

const TRIGGER_SELECTOR =
  '.hero-cta, .btn-primary, .nav-link, .nav-cta, .dc-trigger, .link-arrow';
const TOGGLE_SELECTOR = '[data-sfx-toggle]';

let ctx: AudioContext | null = null;
let muted = false;

function reducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function readStored(): string | null {
  try {
    return localStorage.getItem(SFX_MUTE_KEY);
  } catch {
    return null;
  }
}

function syncMuted(): void {
  muted = resolveMuted(readStored(), reducedMotion());
  updateToggleUI();
}

export function isMuted(): boolean {
  return muted;
}

export function toggleMuted(): boolean {
  muted = !muted;
  try {
    localStorage.setItem(SFX_MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* storage unavailable — session-only toggle */
  }
  updateToggleUI();
  document.dispatchEvent(new CustomEvent('nocturna:sfx-muted', { detail: muted }));
  return muted;
}

export function updateToggleUI(): void {
  document.querySelectorAll<HTMLElement>(TOGGLE_SELECTOR).forEach((btn) => {
    btn.dataset.muted = String(muted);
    btn.setAttribute('aria-pressed', String(muted));
    const label = muted ? btn.dataset.labelMuted : btn.dataset.labelOn;
    if (label) btn.setAttribute('aria-label', label);
  });
}

function playTick(): void {
  if (muted) return;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') void ctx.resume();
  const now = ctx.currentTime;
  // Dry digital "glitch" tick (~45ms): square blip pitched down fast.
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.04);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.05);
}

function onClick(e: MouseEvent): void {
  const el = e.target as Element | null;
  if (!el) return;
  if (el.closest(TOGGLE_SELECTOR)) {
    toggleMuted();
    return; // the toggle itself never plays a tick
  }
  if (el.closest(TRIGGER_SELECTOR)) playTick();
}

// Bind ONCE at module scope — delegation survives ClientRouter DOM swaps.
document.addEventListener('click', onClick, { capture: true });
// Re-evaluate the reduced-motion default if the user has not set an explicit choice.
window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change', syncMuted);
// Re-apply the toggle button's visual state after each page swap.
document.addEventListener('astro:page-load', updateToggleUI);

syncMuted();
```

- [ ] **Step 2: Load `sfx.ts` globally from `BaseLayout.astro`**

In `src/layouts/BaseLayout.astro`, after the motion script (currently lines 117-119), add:

```astro
    <script>
      import '../scripts/sfx.ts';
    </script>
```

- [ ] **Step 3: Build and verify the module bundles**

Run: `npx astro build`
Expected: `Complete!`, 22 pages built, no TypeScript/bundle error.

Run: `npx vitest run`
Expected: PASS (the Task 5 test still green — nothing regressed).

- [ ] **Step 4: Manual smoke (document in the commit body, run by a human later)**

On the built site: click a hero CTA or nav link → a short glitch tick plays. (Full UAT, including the toggle, is Task 7.)

- [ ] **Step 5: Commit**

```bash
git add src/scripts/sfx.ts src/layouts/BaseLayout.astro
git commit -m "sfx: synthesized glitch-tick engine, globally loaded"
```

---

### Task 7: SFX mute toggle UI in the nav

**Files:**
- Modify: `src/i18n/nav.json` (add `sfxMute`, `sfxUnmute`, both langs)
- Modify: `src/components/Nav.astro` (add the `[data-sfx-toggle]` button next to `LanguageSwitcher`)
- Modify: `src/styles/chrome.css` (icon show/hide by `[data-muted]`) — OR a scoped `<style>` in Nav.astro if that matches the repo pattern

**Interfaces:**
- Consumes: the `sfx.ts` delegation (Task 6) — the button needs only the `data-sfx-toggle` hook + `data-label-*`; no inline script (sfx.ts handles the click via delegation and updates the UI)
- Produces: a persisted, accessible mute control in the nav

- [ ] **Step 1: Add the toggle labels to `nav.json`**

In `es` add: `"sfxMute": "Silenciar sonidos", "sfxUnmute": "Activar sonidos",`
In `en` add: `"sfxMute": "Mute sounds", "sfxUnmute": "Unmute sounds",`

- [ ] **Step 2: Add the toggle button to `Nav.astro`**

In `src/components/Nav.astro`, inside `.nav-links`, add the button immediately before `<LanguageSwitcher lang={lang} />` (line 72):

```astro
    <button
      class="nav-sfx"
      type="button"
      data-sfx-toggle
      aria-pressed="false"
      aria-label={t.sfxMute}
      data-label-on={t.sfxMute}
      data-label-muted={t.sfxUnmute}
    >
      <svg class="nav-sfx__on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
        <path d="M11 5 6 9H2v6h4l5 4V5z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" />
      </svg>
      <svg class="nav-sfx__off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
        <path d="M11 5 6 9H2v6h4l5 4V5z" />
        <path d="M22 9l-6 6M16 9l6 6" />
      </svg>
    </button>
```

- [ ] **Step 3: Add the icon show/hide CSS**

Add (to `Nav.astro`'s `<style>` or `chrome.css`, matching the repo pattern — Nav.astro currently has no `<style>`, so add scoped styles at the end of `Nav.astro`):

```astro
<style>
  .nav-sfx {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    background: none;
    border: 0;
    color: inherit;
    cursor: pointer;
    padding: 0;
  }
  .nav-sfx svg { width: 20px; height: 20px; }
  .nav-sfx__off { display: none; }
  .nav-sfx[data-muted="true"] .nav-sfx__on { display: none; }
  .nav-sfx[data-muted="true"] .nav-sfx__off { display: inline; }
</style>
```

- [ ] **Step 4: Build and verify the toggle renders**

Run: `npx astro build`
Expected: `Complete!`, 22 pages built.

Run: `grep -c "data-sfx-toggle" dist/en/index.html`
Expected: `1` (toggle present in the nav).

Run: `grep -o "Mute sounds" dist/en/index.html | head -1`
Expected: `Mute sounds`.

- [ ] **Step 5: Manual UAT (human-run, document in commit body)**

Serve `dist/` (`npx astro preview`) and confirm:
- Clicking a nav link / hero CTA plays the glitch tick.
- Clicking the nav speaker icon silences it; the icon swaps to the muted glyph; reload → still muted (persisted).
- Un-mute → tick returns; reload → still on.
- DevTools → Rendering → emulate `prefers-reduced-motion: reduce`, clear `localStorage['nocturna-sfx-muted']`, reload → SFX starts muted (icon shows muted).
- At ~360px width the toggle does not crowd/overflow the mobile nav drawer.

- [ ] **Step 6: Commit**

```bash
git add src/i18n/nav.json src/components/Nav.astro
git commit -m "sfx: nav mute toggle (persisted, reduced-motion aware)"
```

---

## Self-Review

**Spec coverage:**
- A (trim About "Our story") → Task 1 ✓
- B (StoreTeaser) → Task 2 ✓
- C (nav relabel+reorder → Task 4; hero CTAs → Task 3; Discord modal → Task 4) ✓
- D (SFX: pure logic → Task 5; engine + global load → Task 6; nav toggle → Task 7) ✓
- E (testing: vitest logic test → Task 5; build+grep per task; manual UAT → Tasks 6/7) ✓

**Placeholder scan:** none — every code/JSON/command step carries actual content.

**Type consistency:** `resolveMuted(stored: string | null, reducedMotion: boolean): boolean` and `SFX_MUTE_KEY` defined in Task 5, consumed identically in Task 6. `toggleMuted`/`updateToggleUI`/`isMuted` defined in Task 6; Task 7's button relies only on the `data-sfx-toggle` / `data-label-*` hooks that Task 6's delegation reads. Nav concept `services` unchanged (route stable); only order + label move.

## Notes for the executor

- **Cross-repo push race:** the bot pushes `store.json`/`editors.json` + editor media to this repo. When pushing, expect to `git fetch` + rebase onto `origin/revamp`; resolve any `store.json`/`editors.json` conflict by taking the bot's version (we only read those files). Never modify `store.json`.
- **Token names:** `StoreTeaser.astro` and the nav CSS reference CSS custom properties; verify exact names against `src/styles/theme.css` before finalizing each and substitute the repo's actual token names.
- **No route changes:** the `services` concept keeps `/servicios`; do not rename slugs.
