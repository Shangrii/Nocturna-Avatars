/**
 * gallery.ts — the /galeria · /gallery pin-wall controller (Plan 04-02).
 *
 * Three responsibilities, one swap-safe module:
 *   1. The seeded scatter layout engine (layoutWall) — replaced Masonry per user
 *      feedback: photos get very varied sizes and continuous random positions,
 *      never column/row alignment.
 *   2. The decor drawing (drawThread) — red thread pin-to-pin, fairy-light
 *      garland, sparse warm board lamps, all into the wall's decor SVG.
 *   3. The hand-rolled lightbox controller.
 *
 * Mounted on the View Transitions lifecycle — Astro's ClientRouter runs a module
 * script ONCE but swaps the DOM on every navigation, so (mirroring motion/index.ts
 * and cart.ts) we register the lifecycle listeners at module scope and do the real
 * init/teardown on the per-navigation events. On astro:page-load we re-query the
 * live wall, imagesLoaded → scatter layout, then run the tile reveal AFTER layout
 * settles; on astro:before-swap we reset the guard FIRST so nothing leaks or
 * double-binds across navigations.
 *
 * No-ops cleanly when [data-gallery-wall] is absent, so it is safe to load on every
 * page. All motion is gated on prefersReduced() (D-14 / UI-SPEC Motion contract).
 */

import imagesLoaded from 'imagesloaded';
import { prefersReduced } from './motion/motion-prefs';

// ---------------------------------------------------------------------------
// Lifecycle guard + live layout state (module scope — survives across navigations)
// ---------------------------------------------------------------------------

/** Guards against double-binding when astro:page-load re-fires (motion/index.ts idiom). */
let inited = false;

/** Placed card rects (padding-box coords) — feeds thread + board-light drawing. */
interface PlacedRect {
  x: number;
  y: number;
  w: number;
  h: number;
  m: number;
}
let placedRects: PlacedRect[] = [];

// ---------------------------------------------------------------------------
// Deterministic PRNG — the scattered layout must look random but be stable
// across reloads (same photos + same width → same wall), so all "randomness"
// flows from a seeded mulberry32 stream, never Math.random().
// ---------------------------------------------------------------------------

function fnv(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Tile reveal
// ---------------------------------------------------------------------------

/**
 * Reveal the tiles AFTER the scatter engine has positioned them (UI-SPEC "reveal
 * runs AFTER imagesLoaded + layout settles" — tiles never fade in mid-reflow).
 *
 * Under prefersReduced() the stagger is skipped entirely: tiles are shown at full
 * opacity with no travel and no delay. Otherwise a small incremental delay (~50ms,
 * capped) keys off DOM order. We drive the reveal by toggling a data attribute the
 * CSS animates, so this never fights the absolute positioning.
 */
function revealTiles(tiles: HTMLElement[]): void {
  if (prefersReduced()) {
    tiles.forEach((tile) => {
      tile.style.setProperty('--reveal-delay', '0ms');
      tile.setAttribute('data-revealed', '');
    });
    return;
  }
  const STEP = 50; // ms per tile
  const CAP = 600; // never delay a tile past this so late tiles don't lag
  tiles.forEach((tile, i) => {
    // Delay only the opacity fade (the polaroid's --reveal-delay), never the
    // hover/tilt transform — see gallery.css .polaroid transition.
    tile.style.setProperty('--reveal-delay', `${Math.min(i * STEP, CAP)}ms`);
    tile.setAttribute('data-revealed', '');
  });
}

// ---------------------------------------------------------------------------
// Wall init / teardown
// ---------------------------------------------------------------------------

/**
 * layoutWall — the hand-scattered collage engine (replaces Masonry, whose whole
 * algorithm is column packing — the reason photos always sat in tidy stacks).
 *
 * Per photo, all seeded (same photos + width → same wall, reloads never reshuffle):
 *   size  — a size class (small ~24% / medium ~46% / large ~30%) scaled by
 *           sqrt(aspect) so portraits and landscapes get comparable areas but
 *           very different footprints;
 *   place — 26 candidate X positions sampled across the FULL width (continuous,
 *           not column slots), each dropped to the lowest Y that clears already-
 *           placed cards (+ a per-card random gap), then scored with noise so the
 *           pick is organic rather than perfectly packed. No overlaps, no columns.
 */
function layoutWall(wall: HTMLElement): void {
  const tiles = Array.from(wall.querySelectorAll<HTMLElement>('[data-gallery-tile]'));
  if (!tiles.length) return;

  const cs = getComputedStyle(wall);
  const padL = parseFloat(cs.paddingLeft) || 0;
  const padR = parseFloat(cs.paddingRight) || 0;
  const padT = parseFloat(cs.paddingTop) || 0;
  const padB = parseFloat(cs.paddingBottom) || 0;
  const W = wall.clientWidth - padL - padR;

  const seed = fnv(
    tiles.map((t) => t.dataset.file ?? '').join('|') + '@' + Math.round(W / 48),
  );
  const rand = mulberry32(seed);
  const unit = Math.min(Math.max(W / 6.2, 105), 230);

  const rects: PlacedRect[] = [];
  let maxBottom = 0;

  for (const tile of tiles) {
    const img = tile.querySelector('img');
    const iw = Number(img?.getAttribute('width')) || 3;
    const ih = Number(img?.getAttribute('height')) || 4;
    const ar = iw / ih;

    // Size class → width (sqrt(ar) normalizes area across orientations).
    const roll = rand();
    const s =
      roll < 0.24
        ? 0.6 + rand() * 0.3 // small
        : roll < 0.7
          ? 0.95 + rand() * 0.4 // medium
          : 1.5 + rand() * 0.55; // large
    let w = s * unit * Math.sqrt(ar);
    w = Math.max(Math.min(w, W * 0.52, 460), 92);

    // Fix the width, then measure the real card height (frame + caption included).
    tile.style.position = 'absolute';
    tile.style.width = `${w.toFixed(1)}px`;
    const h = tile.offsetHeight || w / ar + 46;

    // Per-card hang gap — the "sometimes close, sometimes airy" variation.
    const m = 10 + rand() * 34;

    let best: { x: number; y: number; score: number } | null = null;
    for (let c = 0; c < 26; c++) {
      // Stratified X — candidates sweep the full width (13 strata × jitter), so
      // shallow valleys anywhere get found and the wall fills edge to edge
      // instead of clumping toward wherever uniform sampling happened to land.
      const x = (((c % 13) + rand()) / 13) * (W - w);
      let y = padT + rand() * 18;
      for (const r of rects) {
        // Horizontal interval overlap (12px halo) → must drop below that card.
        if (x < r.x + r.w + 12 && x + w > r.x - 12) {
          y = Math.max(y, r.y + r.h + (m + r.m) / 2);
        }
      }
      const score = y + rand() * 110; // noise: organic pick, not perfect packing
      if (!best || score < best.score) best = { x, y, score };
    }

    const { x, y } = best!;
    tile.style.left = `${(padL + x).toFixed(1)}px`;
    tile.style.top = `${y.toFixed(1)}px`;
    rects.push({ x, y, w, h, m });
    maxBottom = Math.max(maxBottom, y + h);
  }

  // Publish rects in padding-box coords (svg space) for thread + board lights.
  placedRects = rects.map((r) => ({ ...r, x: r.x + padL }));
  wall.style.height = `${Math.round(maxBottom + padB + 24)}px`;
}

function initWall(): void {
  const wall = document.querySelector<HTMLElement>('[data-gallery-wall]');
  if (!wall) return; // other pages: no wall, no-op cleanly

  const tiles = Array.from(wall.querySelectorAll<HTMLElement>('[data-gallery-tile]'));

  // Hand the wall over to JS: the static fallback grid becomes the scatter surface
  // (tiles go absolute + start hidden for the reveal — see gallery.css).
  wall.classList.add('is-masonry');

  // Lay the wall out only once all images have settled so no tile jumps mid-decode.
  imagesLoaded(wall, () => {
    layoutWall(wall);
    // Reveal AFTER layout settles (next frame so positions are committed first).
    requestAnimationFrame(() => {
      revealTiles(tiles);
      drawThread(wall);
    });
    // The handwritten caption face can change card heights when it swaps in late —
    // re-place + redraw once fonts are ready.
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        layoutWall(wall);
        drawThread(wall);
      });
    }
  });

  // Re-scatter on resize (new width = new seed bucket → fresh but stable layout).
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
      if (!wall || !wall.classList.contains('is-masonry')) return;
      layoutWall(wall);
      drawThread(wall);
    });
  });
}

/**
 * Draw the red thread — the wall's signature. Connects the pins pin-to-pin with
 * gently sagging curves into the wall's [data-gallery-thread] SVG, AFTER the
 * scatter layout settles (re-called on every resize relayout).
 * Pin centres are read from live bounding boxes so each card's tilt is accounted for,
 * and sorted into rough reading order so the thread flows row-by-row instead of
 * zig-zagging by DOM (newest-first) order.
 */
function drawThread(wall: HTMLElement): void {
  const svg = wall.querySelector<SVGSVGElement>('[data-gallery-thread]');
  if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  const w = wall.clientWidth;
  const h = wall.clientHeight;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  // Garland + board lamps + doodles first (independent of pin count) so they
  // never get skipped by the thread's early return below.
  drawGarland(svg, w);
  drawBoardLights(svg, w, h);
  drawDoodles(svg, w, h);

  const wallRect = wall.getBoundingClientRect();
  const pins = Array.from(wall.querySelectorAll<HTMLElement>('.pin'));
  if (pins.length < 2) return;

  const pts = pins.map((pin) => {
    const r = pin.getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - wallRect.left,
      y: r.top + r.height / 2 - wallRect.top,
    };
  });
  // Bucket into ~140px rows, then left-to-right within each row.
  pts.sort((a, b) => {
    const ra = Math.round(a.y / 140);
    const rb = Math.round(b.y / 140);
    return ra !== rb ? ra - rb : a.x - b.x;
  });

  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const midX = (a.x + b.x) / 2;
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const sag = Math.min(46, dist * 0.14); // gentle droop between pins
    const cy = Math.max(a.y, b.y) + sag;
    d += ` Q ${midX.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', d);
  path.setAttribute('class', 'gallery-thread__line');
  svg.appendChild(path);
}

/**
 * Fairy-light garland — a wire draped along the top of the wall in sagging arcs,
 * with warm bulbs sampled along its true length (getPointAtLength), so it follows
 * the wall edge-to-edge at any width instead of a tiled background that clips.
 * Drawn into the same decor SVG as the thread (and cleared/redrawn with it).
 */
function drawGarland(svg: SVGSVGElement, w: number): void {
  const NS = 'http://www.w3.org/2000/svg';
  const y0 = 12;
  const margin = 10;
  const sagBase = w < 700 ? 14 : 24;
  const segs = Math.max(2, Math.round(w / 430));
  const step = (w - margin * 2) / segs;

  let d = `M ${margin} ${y0}`;
  for (let i = 1; i <= segs; i++) {
    const x = margin + step * i;
    const sag = sagBase + ((i * 53) % 13); // slightly uneven droops
    d += ` Q ${(margin + step * (i - 0.5)).toFixed(1)} ${y0 + sag} ${x.toFixed(1)} ${y0}`;
  }
  const wire = document.createElementNS(NS, 'path');
  wire.setAttribute('d', d);
  wire.setAttribute('class', 'gallery-lights__wire');
  svg.appendChild(wire);

  const total = wire.getTotalLength();
  for (let t = 26, k = 0; t < total - 20; t += 56, k++) {
    const p = wire.getPointAtLength(t);
    const alt = k % 2 === 1;
    const cy = (p.y + 4).toFixed(1);
    const glow = document.createElementNS(NS, 'circle');
    glow.setAttribute('cx', p.x.toFixed(1));
    glow.setAttribute('cy', cy);
    glow.setAttribute('r', '7');
    glow.setAttribute('class', `gallery-lights__glow${alt ? ' gallery-lights__glow--b' : ''}`);
    svg.appendChild(glow);
    const bulb = document.createElementNS(NS, 'circle');
    bulb.setAttribute('cx', p.x.toFixed(1));
    bulb.setAttribute('cy', cy);
    bulb.setAttribute('r', '2.4');
    bulb.setAttribute('class', `gallery-lights__bulb${alt ? ' gallery-lights__bulb--b' : ''}`);
    svg.appendChild(bulb);
  }
}

/** Seeded gap-finder — retries for a point clear of all placed cards (+pad). */
function seekGap(
  rand: () => number,
  w: number,
  h: number,
  pad: number,
): { x: number; y: number } {
  let x = w / 2;
  let y = h / 2;
  for (let a = 0; a < 16; a++) {
    x = 24 + rand() * (w - 48);
    y = 80 + rand() * (h - 160);
    const clear = !placedRects.some(
      (r) => x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad,
    );
    if (clear) break;
  }
  return { x, y };
}

/**
 * Graffiti doodles — a few red marker scribbles seeded into gaps between cards:
 * an arrow squiggle, crossed-out marks, and a tiny "nctrn" tag in the graffiti
 * face. Street-notebook energy without competing with the photos.
 */
function drawDoodles(svg: SVGSVGElement, w: number, h: number): void {
  if (h < 300 || placedRects.length === 0) return;
  const NS = 'http://www.w3.org/2000/svg';
  const rand = mulberry32(fnv(`doodle:${Math.round(w)}x${Math.round(h)}`));

  const squiggle = seekGap(rand, w, h, 26);
  const gArrow = document.createElementNS(NS, 'g');
  gArrow.setAttribute('class', 'gallery-doodle');
  gArrow.setAttribute(
    'transform',
    `translate(${squiggle.x.toFixed(0)} ${squiggle.y.toFixed(0)}) rotate(${Math.round(rand() * 360)})`,
  );
  const arrow = document.createElementNS(NS, 'path');
  arrow.setAttribute('d', 'M0 0 q14 -18 26 -6 q12 12 26 -4 M44 -16 l10 4 -6 9');
  gArrow.appendChild(arrow);
  svg.appendChild(gArrow);

  const cross = seekGap(rand, w, h, 22);
  const gCross = document.createElementNS(NS, 'g');
  gCross.setAttribute('class', 'gallery-doodle');
  gCross.setAttribute(
    'transform',
    `translate(${cross.x.toFixed(0)} ${cross.y.toFixed(0)}) rotate(${Math.round(rand() * 40 - 20)})`,
  );
  const marks = document.createElementNS(NS, 'path');
  marks.setAttribute('d', 'M0 0 l10 10 M10 0 l-10 10 M20 2 l10 10 M30 2 l-10 10 M40 4 l10 10 M50 4 l-10 10');
  gCross.appendChild(marks);
  svg.appendChild(gCross);

  const tagAt = seekGap(rand, w, h, 30);
  const tag = document.createElementNS(NS, 'text');
  tag.setAttribute('x', tagAt.x.toFixed(0));
  tag.setAttribute('y', tagAt.y.toFixed(0));
  tag.setAttribute('class', 'gallery-doodle__tag');
  tag.setAttribute(
    'transform',
    `rotate(${(rand() * 24 - 12).toFixed(0)} ${tagAt.x.toFixed(0)} ${tagAt.y.toFixed(0)})`,
  );
  tag.textContent = 'nctrn';
  svg.appendChild(tag);
}

/** Tiny NS-circle helper for the decor SVG. */
function svgCircle(x: number, y: number, r: number, cls: string): SVGCircleElement {
  const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  c.setAttribute('cx', x.toFixed(1));
  c.setAttribute('cy', y.toFixed(1));
  c.setAttribute('r', String(r));
  c.setAttribute('class', cls);
  return c;
}

/**
 * Sparse warm lamps scattered across the board itself — rarer than the top
 * garland, each a halo + glow + core so the light reads convincingly warm.
 * Seeded placement retries to land in gaps between cards (placedRects); the
 * odd one that can't find a gap stays behind the cards (z0), which is fine.
 */
function drawBoardLights(svg: SVGSVGElement, w: number, h: number): void {
  if (h < 200 || placedRects.length === 0) return;
  const rand = mulberry32(fnv(`lamps:${Math.round(w)}x${Math.round(h)}:${placedRects.length}`));
  const count = Math.min(10, Math.max(3, Math.round((w * h) / 150000)));
  for (let i = 0; i < count; i++) {
    let x = 0;
    let y = 0;
    let ok = false;
    for (let a = 0; a < 14 && !ok; a++) {
      x = 16 + rand() * (w - 32);
      y = 60 + rand() * (h - 120);
      ok = !placedRects.some(
        (r) => x > r.x - 10 && x < r.x + r.w + 10 && y > r.y - 10 && y < r.y + r.h + 10,
      );
    }
    const alt = i % 2 === 1 ? ' gallery-boardlight--b' : '';
    svg.appendChild(svgCircle(x, y, 15, `gallery-boardlight__halo${alt}`));
    svg.appendChild(svgCircle(x, y, 6.5, `gallery-boardlight__glow${alt}`));
    svg.appendChild(svgCircle(x, y, 2.2, `gallery-boardlight__bulb${alt}`));
  }
}

/**
 * Torch — warm light halo following the cursor across the board. Binds to the
 * live wall each page-load (fresh nodes after a swap → no double-bind). Skipped
 * for touch-only devices and under prefers-reduced-motion (CSS hides it too).
 */
function initTorch(): void {
  if (!window.matchMedia('(hover: hover)').matches || prefersReduced()) return;
  const wall = document.querySelector<HTMLElement>('[data-gallery-wall]');
  const torch = wall?.querySelector<HTMLElement>('[data-gallery-torch]');
  if (!wall || !torch) return;
  let raf = 0;
  let px = 0;
  let py = 0;
  wall.addEventListener('mousemove', (e) => {
    px = e.clientX;
    py = e.clientY;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const r = wall.getBoundingClientRect();
      torch.style.setProperty('--tx', `${(px - r.left).toFixed(0)}px`);
      torch.style.setProperty('--ty', `${(py - r.top).toFixed(0)}px`);
      torch.classList.add('is-on');
    });
  });
  wall.addEventListener('mouseleave', () => torch.classList.remove('is-on'));
}

/**
 * Sky depth parallax — drives --sky-shift from scroll so the star field (1×),
 * twinkle layer (1.35×) and fireflies (0.7×) drift slower than the board.
 * Scroll listener binds once and re-queries the live section (chrome.ts idiom).
 */
let skyScrollBound = false;
function initSky(): void {
  if (prefersReduced()) return;
  const update = () => {
    const sec = document.querySelector<HTMLElement>('.gallery-night');
    if (!sec) return;
    const r = sec.getBoundingClientRect();
    sec.style.setProperty('--sky-shift', `${(r.top * -0.06).toFixed(1)}px`);
  };
  update();
  if (!skyScrollBound) {
    skyScrollBound = true;
    let raf = 0;
    window.addEventListener(
      'scroll',
      () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          update();
        });
      },
      { passive: true },
    );
  }
}

function initGallery(): void {
  if (inited) return;
  inited = true;
  initWall();
  initLightbox();
  initTorch();
  initSky();
}

function teardownGallery(): void {
  if (!inited) return;
  // Reset the guard FIRST so a throwing destroyer can't permanently break re-init.
  inited = false;
  placedRects = [];
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
  editor: string; // '' when uncredited; otherwise the editor slug (D-17)
}

/** Client-side slug guard (defense-in-depth): gallery.json is bot-written but
 *  externally sourced, so validate the editor slug before it becomes a credit href. */
const EDITOR_SLUG_RE = /^[a-z0-9-]+$/;

/**
 * Resolve a tile's `data-file` to an <img> src. Legacy gallery tiles carry a BARE
 * filename ("foo.webp") that lives under /gallery/; the editor PortfolioBlock (plan
 * 10.1-05) emits a FULL path ("/gallery/foo.webp" or any "/…/…" src). Accept both:
 * a value already containing a slash is used as-is; a bare filename keeps the legacy
 * /gallery/ prefix. Cross-plan contract with 10.1-05.
 */
function resolveSrc(file: string): string {
  return file.includes('/') ? file : `/gallery/${file}`;
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
  new Image().src = resolveSrc(entry.file);
}

/** Render the entry at `currentIndex` into the live overlay. textContent ONLY. */
function renderCurrent(overlay: HTMLElement): void {
  const entry = entries[currentIndex];
  if (!entry) return;

  const img = overlay.querySelector<HTMLImageElement>('[data-lightbox-img]');
  const counter = overlay.querySelector<HTMLElement>('[data-lightbox-counter]');
  const caption = overlay.querySelector<HTMLElement>('[data-lightbox-caption]');
  const credit = overlay.querySelector<HTMLAnchorElement>('[data-lightbox-credit]');

  if (img) {
    img.src = resolveSrc(entry.file);
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
  if (credit) {
    // D-17 gallery half: show a "por/by <editor>" link to /e/<slug> ONLY when the
    // tile carries a valid slug. The regex guard blocks a crafted `editor` value
    // (e.g. `javascript:`, `//evil`) from ever reaching the href — the path prefix is
    // a fixed literal so the target is always same-origin /e/… (T-10.1-08-03). Set via
    // textContent/setAttribute ONLY — never raw-HTML injection (D-02). The else branch
    // re-hides + clears so prev/next between credited/uncredited photos toggles right.
    if (entry.editor && EDITOR_SLUG_RE.test(entry.editor)) {
      const prefix = document.documentElement.lang === 'es' ? 'por ' : 'by ';
      credit.textContent = prefix + entry.editor;
      credit.setAttribute('href', '/e/' + entry.editor);
      credit.hidden = false;
    } else {
      credit.textContent = '';
      credit.removeAttribute('href');
      credit.hidden = true;
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
    editor: tile.dataset.editor ?? '', // '' = uncredited (D-17 gallery half)
  }));

  // Each tile opens the lightbox at its GLOBAL index (click + Enter/Space via
  // native <button> semantics — no extra keydown wiring needed). The index is the
  // tile's position in this same document-order query, which is exactly how
  // `entries[]` above was built — so it resolves correctly even with multiple
  // PortfolioBlock groups on one editor page. We deliberately do NOT trust a
  // per-tile `data-index` (WR-02): PortfolioBlock restarts `data-index` at 0 per
  // block, so a second block's tiles would otherwise open an earlier block's photo.
  document.querySelectorAll<HTMLElement>('[data-gallery-tile]').forEach((tile, idx) => {
    tile.addEventListener('click', () => {
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
