/**
 * gallery.ts — the /galeria · /gallery masonry wall controller (Plan 04-02).
 *
 * Two responsibilities, one swap-safe module:
 *   1. Masonry.js + imagesLoaded init for the photo wall (this file, Task 1).
 *   2. The hand-rolled lightbox controller (this file, Task 2).
 *
 * Mounted on the View Transitions lifecycle — Astro's ClientRouter runs a module
 * script ONCE but swaps the DOM on every navigation, so (mirroring motion/index.ts
 * and cart.ts) we register the lifecycle listeners at module scope and do the real
 * init/teardown on the per-navigation events. On astro:page-load we destroy any
 * prior Masonry instance, re-query the live wall, imagesLoaded → new Masonry, then
 * run the tile reveal AFTER layout settles; on astro:before-swap we reset the guard
 * FIRST then destroy so nothing leaks or double-binds across navigations.
 *
 * No-ops cleanly when [data-gallery-wall] is absent, so it is safe to load on every
 * page. All motion is gated on prefersReduced() (D-14 / UI-SPEC Motion contract).
 */

import Masonry from 'masonry-layout';
import imagesLoaded from 'imagesloaded';
import { prefersReduced } from './motion/motion-prefs';

// ---------------------------------------------------------------------------
// Lifecycle guard + live instance (module scope — survives across navigations)
// ---------------------------------------------------------------------------

/** Guards against double-binding when astro:page-load re-fires (motion/index.ts idiom). */
let inited = false;
/** The live Masonry instance for the current page, or null between pages. */
let masonry: Masonry | null = null;

// ---------------------------------------------------------------------------
// Responsive Masonry config (UI-SPEC Layout Contract — Masonry Wall)
// ---------------------------------------------------------------------------

/** 8-point tokens read at runtime so gutters stay in lockstep with theme.css. */
function spaceToken(name: string): number {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return parseInt(v, 10) || 0;
}

/**
 * Column count + gutter token per breakpoint (2/3/4 columns; --space-xs/sm/md gutters).
 * percentPosition + a computed columnWidth keeps the columns fluid within the wall.
 */
function wallConfig(wall: HTMLElement): { columns: number; gutter: number } {
  const w = window.innerWidth;
  if (w < 768) return { columns: 2, gutter: spaceToken('--space-xs') };
  if (w < 1024) return { columns: 3, gutter: spaceToken('--space-sm') };
  return { columns: 4, gutter: spaceToken('--space-md') };
}

/**
 * Reveal the tiles AFTER Masonry has positioned them (UI-SPEC "reveal runs AFTER
 * imagesLoaded + Masonry layout settles" — tiles never fade in mid-reflow).
 *
 * Under prefersReduced() the stagger is skipped entirely: tiles are shown at full
 * opacity with no travel and no delay. Otherwise a small incremental delay (~50ms,
 * capped) keys off DOM order. We drive the reveal by toggling a data attribute the
 * CSS animates, so this never fights Masonry's absolute positioning.
 */
function revealTiles(tiles: HTMLElement[]): void {
  if (prefersReduced()) {
    tiles.forEach((tile) => {
      tile.style.transitionDelay = '0ms';
      tile.setAttribute('data-revealed', '');
    });
    return;
  }
  const STEP = 50; // ms per tile
  const CAP = 600; // never delay a tile past this so late tiles don't lag
  tiles.forEach((tile, i) => {
    tile.style.transitionDelay = `${Math.min(i * STEP, CAP)}ms`;
    tile.setAttribute('data-revealed', '');
  });
}

// ---------------------------------------------------------------------------
// Wall init / teardown
// ---------------------------------------------------------------------------

function initWall(): void {
  const wall = document.querySelector<HTMLElement>('[data-gallery-wall]');
  if (!wall) return; // other pages: no wall, no-op cleanly

  // Destroy any stale instance before re-init (defensive — teardown should have run).
  if (masonry) {
    masonry.destroy?.();
    masonry = null;
  }

  const tiles = Array.from(wall.querySelectorAll<HTMLElement>('[data-gallery-tile]'));
  const { gutter } = wallConfig(wall);

  // Hand the wall over to JS: the static fallback grid becomes the Masonry surface
  // (tiles are percent-width + start hidden for the reveal — see gallery.css).
  wall.classList.add('is-masonry');

  // Lay the wall out only once all images have settled so no tile jumps mid-decode.
  imagesLoaded(wall, () => {
    masonry = new Masonry(wall, {
      itemSelector: '[data-gallery-tile]',
      percentPosition: true,
      gutter,
      // columnWidth is a real tile so Masonry derives fluid column widths from the
      // rendered box (percentPosition then scales gaps proportionally).
      columnWidth: '[data-gallery-tile]',
      transitionDuration: prefersReduced() ? 0 : '0.2s',
    });
    // Reveal AFTER layout settles (next frame so positions are committed first).
    requestAnimationFrame(() => revealTiles(tiles));
  });

  // Re-lay the wall on resize so the column count/gutter follow the breakpoints.
  bindWallResize();
}

/** Resize handler is bound once behind a module flag; re-queries the live wall. */
let wallResizeBound = false;
let resizeRaf = 0;
function bindWallResize(): void {
  if (wallResizeBound) return;
  wallResizeBound = true;
  window.addEventListener('resize', () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      const wall = document.querySelector<HTMLElement>('[data-gallery-wall]');
      if (!wall || !masonry) return;
      const { gutter } = wallConfig(wall);
      // Update the gutter then re-run layout for the new breakpoint.
      (masonry as unknown as { options: { gutter: number } }).options.gutter = gutter;
      masonry.layout?.();
    });
  });
}

function initGallery(): void {
  if (inited) return;
  inited = true;
  initWall();
  initLightbox();
}

function teardownGallery(): void {
  if (!inited) return;
  // Reset the guard FIRST so a throwing destroyer can't permanently break re-init.
  inited = false;
  if (masonry) {
    masonry.destroy?.();
    masonry = null;
  }
  // Drop the JS-took-over flag so a re-visit starts from the clean static fallback.
  document
    .querySelector<HTMLElement>('[data-gallery-wall]')
    ?.classList.remove('is-masonry');
}

// ---------------------------------------------------------------------------
// Lightbox controller (D-13/D-14) — hand-rolled on the dc-overlay + focus-trap
// pattern (cart.ts / chrome.ts). Captions come from Discord (untrusted), so the
// img/caption/counter are built via textContent ONLY — no raw HTML injection (T-04-04).
// ---------------------------------------------------------------------------

interface LightboxEntry {
  file: string;
  caption: string; // '' when absent
  alt: string;
}

/** Entries are DERIVED from the rendered [data-gallery-tile] nodes each page-load
 *  (not a shared JSON import) so the same controller drives the full wall on
 *  /galeria and the featured-6 subset on the landing without reconciling arrays. */
let entries: LightboxEntry[] = [];
let currentIndex = 0;
let lastFocus: HTMLElement | null = null;
let trapHandler: ((e: KeyboardEvent) => void) | null = null;
/** Document-level keyboard/pointer listeners bind ONCE behind this flag. */
let lightboxDocBound = false;

/**
 * trapFocus — copied near-verbatim from cart.ts:516-531. Cycles Tab/Shift+Tab
 * within the container; skips elements inside a [hidden] ancestor.
 */
function trapFocus(container: HTMLElement): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => !el.hasAttribute('disabled') && !el.closest('[hidden]'));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
}

/** Preload one image without inserting it (D-14 neighbor preload). */
function preload(index: number): void {
  const entry = entries[index];
  if (!entry) return;
  new Image().src = `/gallery/${entry.file}`;
}

/** Render the entry at `currentIndex` into the live overlay. textContent ONLY. */
function renderCurrent(overlay: HTMLElement): void {
  const entry = entries[currentIndex];
  if (!entry) return;

  const img = overlay.querySelector<HTMLImageElement>('[data-lightbox-img]');
  const counter = overlay.querySelector<HTMLElement>('[data-lightbox-counter]');
  const caption = overlay.querySelector<HTMLElement>('[data-lightbox-caption]');

  if (img) {
    img.src = `/gallery/${entry.file}`;
    img.alt = entry.alt; // already caption-or-fallback from Plan 01's tile markup
  }
  if (counter) {
    const tpl = overlay.dataset.counterLabel ?? '{n} / {total}';
    counter.textContent = tpl
      .replace('{n}', String(currentIndex + 1))
      .replace('{total}', String(entries.length));
  }
  if (caption) {
    if (entry.caption) {
      caption.textContent = entry.caption; // XSS-safe — plain text only (T-04-04)
      caption.hidden = false;
    } else {
      caption.textContent = '';
      caption.hidden = true; // hide the block but keep the counter (D-03)
    }
  }

  // Preload both neighbors so navigation is instant (loops at both ends).
  preload((currentIndex + 1) % entries.length);
  preload((currentIndex - 1 + entries.length) % entries.length);
}

function isOpen(overlay: HTMLElement): boolean {
  return overlay.classList.contains('active');
}

/** Navigate by delta with wrap-around loop at both ends (D-14). */
function navigate(overlay: HTMLElement, delta: number): void {
  if (entries.length === 0) return;
  currentIndex = (currentIndex + delta + entries.length) % entries.length;
  renderCurrent(overlay);
}

function openLightbox(overlay: HTMLElement, index: number): void {
  if (entries.length === 0) return;
  currentIndex = ((index % entries.length) + entries.length) % entries.length;
  lastFocus = document.activeElement as HTMLElement | null;

  renderCurrent(overlay);

  // WR-01 open: unhide FIRST, then add .active next frame so the fade plays.
  overlay.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => {
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
  });

  // Trap focus inside the dialog; move focus to Close.
  if (trapHandler) document.removeEventListener('keydown', trapHandler);
  trapHandler = trapFocus(overlay);
  document.addEventListener('keydown', trapHandler);
  const closeBtn = overlay.querySelector<HTMLElement>('[data-lightbox-close]');
  setTimeout(() => closeBtn?.focus(), 50);
}

function closeLightbox(overlay: HTMLElement): void {
  if (trapHandler) {
    document.removeEventListener('keydown', trapHandler);
    trapHandler = null;
  }
  overlay.classList.remove('active');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  overlay.addEventListener(
    'transitionend',
    () => overlay.setAttribute('hidden', ''),
    { once: true },
  );
  // Fallback re-hide under reduced-motion where no transition fires.
  if (prefersReduced()) overlay.setAttribute('hidden', '');

  // Return focus to the tile that opened it (a11y).
  lastFocus?.focus();
  lastFocus = null;
}

function initLightbox(): void {
  const overlay = document.querySelector<HTMLElement>('[data-lightbox-overlay]');
  if (!overlay) return; // pages without a lightbox: no-op

  // Rebuild the entries array from the rendered tiles on THIS page (full wall on
  // /galeria, featured 6 on the landing) — scoped, not a global JSON import.
  entries = Array.from(
    document.querySelectorAll<HTMLElement>('[data-gallery-tile]'),
  ).map((tile) => ({
    file: tile.dataset.file ?? '',
    caption: tile.dataset.caption ?? '',
    alt: tile.querySelector('img')?.getAttribute('alt') ?? '',
  }));

  // Each tile opens the lightbox at its index (click + Enter/Space via native
  // <button> semantics — no extra keydown wiring needed).
  document.querySelectorAll<HTMLElement>('[data-gallery-tile]').forEach((tile) => {
    tile.addEventListener('click', () => {
      const idx = Number(tile.dataset.index ?? '0');
      openLightbox(overlay, idx);
    });
  });

  // Controls: ✕ close, ‹ prev, › next.
  overlay
    .querySelector('[data-lightbox-close]')
    ?.addEventListener('click', () => closeLightbox(overlay));
  overlay
    .querySelector('[data-lightbox-prev]')
    ?.addEventListener('click', () => navigate(overlay, -1));
  overlay
    .querySelector('[data-lightbox-next]')
    ?.addEventListener('click', () => navigate(overlay, 1));

  // Backdrop click (outside the stage/controls) closes.
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeLightbox(overlay);
  });

  // Document-level keyboard + touch swipe bind ONCE (re-query the live overlay at
  // event time — chrome.ts idiom — so a post-swap overlay node is never stale).
  if (!lightboxDocBound) {
    lightboxDocBound = true;

    document.addEventListener('keydown', (e) => {
      const live = document.querySelector<HTMLElement>('[data-lightbox-overlay]');
      if (!live || !isOpen(live)) return;
      if (e.key === 'Escape') closeLightbox(live);
      else if (e.key === 'ArrowRight') navigate(live, 1);
      else if (e.key === 'ArrowLeft') navigate(live, -1);
    });

    // Mobile swipe: horizontal navigates (left=next, right=prev), vertical-down
    // closes. ~50px threshold to distinguish intent. Motion feedback (drag track)
    // is gated on prefersReduced().
    let startX = 0;
    let startY = 0;
    let dragging = false;
    const THRESHOLD = 50;

    document.addEventListener(
      'touchstart',
      (e) => {
        const live = document.querySelector<HTMLElement>('[data-lightbox-overlay]');
        if (!live || !isOpen(live) || e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        dragging = true;
      },
      { passive: true },
    );

    document.addEventListener(
      'touchmove',
      (e) => {
        if (!dragging || prefersReduced()) return;
        const live = document.querySelector<HTMLElement>('[data-lightbox-overlay]');
        const img = live?.querySelector<HTMLElement>('[data-lightbox-img]');
        if (!img) return;
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        // Light horizontal drag feedback only (never for vertical intent).
        if (Math.abs(dx) > Math.abs(dy)) {
          img.style.transform = `translateX(${dx * 0.3}px)`;
        }
      },
      { passive: true },
    );

    document.addEventListener(
      'touchend',
      (e) => {
        if (!dragging) return;
        dragging = false;
        const live = document.querySelector<HTMLElement>('[data-lightbox-overlay]');
        if (!live || !isOpen(live)) return;
        const img = live.querySelector<HTMLElement>('[data-lightbox-img]');
        if (img) img.style.transform = '';
        const t = e.changedTouches[0];
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > THRESHOLD) {
          navigate(live, dx < 0 ? 1 : -1); // left swipe = next, right = prev
        } else if (dy > THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
          closeLightbox(live); // swipe-down closes
        }
      },
      { passive: true },
    );
  }
}

// ---------------------------------------------------------------------------
// Lifecycle registration (module scope — survives navigations)
// ---------------------------------------------------------------------------

document.addEventListener('astro:before-swap', teardownGallery);
document.addEventListener('astro:page-load', initGallery);

// Hard-nav fallback: gallery.ts is page-specific, so on a full load astro:page-load
// may fire before this module finishes loading. If readyState is past 'loading',
// the event already fired — run init immediately (cart.ts idiom).
if (document.readyState !== 'loading') {
  initGallery();
}
