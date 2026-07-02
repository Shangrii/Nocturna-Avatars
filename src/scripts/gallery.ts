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
// Lightbox controller — added in Task 2
// ---------------------------------------------------------------------------

function initLightbox(): void {
  // Implemented in Task 2.
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
