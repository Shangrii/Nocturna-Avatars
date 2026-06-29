/**
 * cursor — custom blend-difference cursor + magnetic pull (FX-04, D-06/07/08).
 *
 * The ENTIRE module is gated behind `finePointer && !prefersReduced` (D-08/D-21):
 * touch devices and reduced-motion users keep the native cursor with no magnetism.
 *
 * The cursor is a fixed `<div>` with `pointer-events: none` (Pitfall 7) appended to
 * <body>, moved by `gsap.quickTo` off a `pointermove` listener (RESEARCH Pattern 4 —
 * frame-synced, no manual rAF loop). Over interactive targets it grows; the target
 * itself is nudged ≤8px toward the pointer using `transform` ONLY — never top/left/
 * width/height, never its hit box. The magnetic displacement is purely visual so the
 * `.dc-trigger` Abrir Ticket / Discord-modal click targets stay exactly where the
 * static layout puts them and still open on click (Pitfall 7, D-19, T-02-CTA).
 *
 * Mounts on the 02-01 controller: initCursor() in initMotion, destroyCursor() in
 * teardownMotion — one init path, clean teardown so a swap re-inits from scratch.
 */

import { gsap } from 'gsap';
import { prefersReduced, finePointer } from './motion-prefs';

/** Elements magnetism nudges. .dc-trigger opens the Discord modal — never shift its hit box. */
const MAGNET_SELECTOR = '.dc-trigger, .nav-link, .hero-cta, .card';

let cursorEl: HTMLDivElement | null = null;
let xTo: ((v: number) => void) | null = null;
let yTo: ((v: number) => void) | null = null;
let onPointerMove: ((e: PointerEvent) => void) | null = null;
let onPointerOut: ((e: PointerEvent) => void) | null = null;

/** Per-target enter/leave bindings, tracked so teardown removes exactly what it added. */
interface MagnetBinding {
  el: HTMLElement;
  enter: (e: PointerEvent) => void;
  move: (e: PointerEvent) => void;
  leave: () => void;
}
let magnets: MagnetBinding[] = [];

/** Read a --space-* token in px from :root (no arbitrary px in JS — UI-SPEC Spacing). */
function spaceToken(name: string): number {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return parseInt(v, 10) || 0;
}

export function initCursor(): void {
  // D-08/D-21: desktop fine-pointer only, never under reduced-motion. Leave the native cursor.
  if (!finePointer || prefersReduced) return;

  // Idempotent: a stale cursor from a missed teardown would otherwise duplicate.
  if (cursorEl) destroyCursor();

  // ── Cursor element ── invert circle, pointer-events:none (Pitfall 7). Styling in cursor.css.
  cursorEl = document.createElement('div');
  cursorEl.className = 'cursor-fx';
  cursorEl.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cursorEl);

  // Frame-synced follow — gsap.quickTo, no manual loop (RESEARCH Pattern 4).
  xTo = gsap.quickTo(cursorEl, 'x', { duration: 0.25, ease: 'power3' });
  yTo = gsap.quickTo(cursorEl, 'y', { duration: 0.25, ease: 'power3' });

  onPointerMove = (e: PointerEvent) => {
    xTo?.(e.clientX);
    yTo?.(e.clientY);
  };
  window.addEventListener('pointermove', onPointerMove, { passive: true });

  // Hide the cursor while it leaves the viewport so it never lingers off-screen.
  onPointerOut = (e: PointerEvent) => {
    if (!e.relatedTarget && cursorEl) cursorEl.classList.remove('cursor-fx--visible');
  };
  window.addEventListener('pointerout', onPointerOut, { passive: true });
  window.addEventListener(
    'pointerover',
    () => cursorEl?.classList.add('cursor-fx--visible'),
    { passive: true, once: true },
  );

  // ── Magnetism (D-07) ── transform-only nudge ≤8px within a ~48px catch radius.
  const maxPull = spaceToken('--space-2xs') || 8; // ≤8px displacement
  const radius = spaceToken('--space-xl') || 48; // ~48px catch radius

  const targets = Array.from(document.querySelectorAll<HTMLElement>(MAGNET_SELECTOR));
  targets.forEach((el) => {
    // quickTo on the target's transform — never on layout properties (Pitfall 7).
    const tx = gsap.quickTo(el, 'x', { duration: 0.3, ease: 'power3' });
    const ty = gsap.quickTo(el, 'y', { duration: 0.3, ease: 'power3' });

    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      // Offset from the element centre, capped to the catch radius then scaled to maxPull.
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const reach = Math.min(dist, radius) / radius; // 0..1
      const pull = reach * maxPull;
      tx((dx / dist) * pull);
      ty((dy / dist) * pull);
    };

    const enter = (e: PointerEvent) => {
      cursorEl?.classList.add('cursor-fx--grow');
      move(e);
    };
    const leave = () => {
      cursorEl?.classList.remove('cursor-fx--grow');
      tx(0); // ease the element back to its static layout position
      ty(0);
    };

    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointermove', move, { passive: true });
    el.addEventListener('pointerleave', leave);
    magnets.push({ el, enter, move, leave });
  });
}

export function destroyCursor(): void {
  if (onPointerMove) window.removeEventListener('pointermove', onPointerMove);
  if (onPointerOut) window.removeEventListener('pointerout', onPointerOut);
  onPointerMove = null;
  onPointerOut = null;

  // Remove per-target listeners and reset any in-flight magnetic offset to zero.
  magnets.forEach(({ el, enter, move, leave }) => {
    el.removeEventListener('pointerenter', enter);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerleave', leave);
    gsap.killTweensOf(el);
    gsap.set(el, { x: 0, y: 0 });
  });
  magnets = [];

  // Kill the follow tweens and remove the cursor div so re-init starts clean.
  if (cursorEl) {
    gsap.killTweensOf(cursorEl);
    cursorEl.remove();
  }
  cursorEl = null;
  xTo = null;
  yTo = null;
}
