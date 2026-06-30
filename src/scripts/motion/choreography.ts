/**
 * choreography — bespoke landing moments (D-14/15/16).
 *
 *   D-14  Gallery teaser horizontal marquee — a scroll-driven translateX track.
 *   D-15  Package-card 3D tilt — pointer-driven rotateX/rotateY (finePointer only),
 *         on top of Plan 01's staggered reveal.
 *   D-16  Featured-work parallax — scrub translateY depth against the background.
 *
 * Everything gates on `!prefersReduced` (under reduced-motion the sections still reveal
 * via Plan 01's gentle fade — no marquee scrub, no tilt, no parallax, D-21) and runs
 * ONLY on the landing path (`/`, `/es/`, `/en/`); dedicated pages keep the subtler Plan
 * 01 treatment (D-12). All effects animate `transform`/`opacity` only — never top/left/
 * width/height (perf budget, RESEARCH anti-patterns).
 *
 * Teardown kills ONLY this module's ScrollTriggers (tagged with an id prefix) and its
 * own pointer listeners — it never touches Plan 01's reveal triggers — so
 * `ScrollTrigger.getAll().length` stays stable across navigations (Validation Architecture).
 *
 * Mounts on the 02-01 controller: initChoreography() in initMotion, destroyChoreography()
 * in teardownMotion.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReduced, finePointer } from './motion-prefs';

/** Landing routes only (D-12) — inner pages get Plan 01's subtler treatment. */
const LANDING_PATHS = ['/', '/es/', '/en/'];

/** ScrollTriggers this module owns are tagged so teardown kills exactly these. */
const ST_ID = 'choreo';

/** Pointer-tilt bindings tracked so teardown removes exactly what it added. */
interface TiltBinding {
  el: HTMLElement;
  move: (e: PointerEvent) => void;
  leave: () => void;
}
let tilts: TiltBinding[] = [];

function isLanding(): boolean {
  return LANDING_PATHS.includes(location.pathname);
}

export function initChoreography(): void {
  // D-21 / D-12: reduced-motion or non-landing → leave Plan 01's gentle reveals alone.
  if (prefersReduced || !isLanding()) return;

  gsap.registerPlugin(ScrollTrigger);

  // ── D-14 Gallery marquee ── the gallery teaser body slides horizontally as the user
  // scrolls vertically past it. translateX only.
  const galleryTrack = document.querySelector<HTMLElement>(
    '[data-teaser="gallery"] [data-teaser-body]',
  );
  if (galleryTrack) {
    const section = galleryTrack.closest<HTMLElement>('[data-teaser="gallery"]');
    galleryTrack.classList.add('marquee-track');
    gsap.fromTo(
      galleryTrack,
      { xPercent: 8 },
      {
        xPercent: -8,
        ease: 'none',
        scrollTrigger: {
          id: `${ST_ID}-marquee`,
          trigger: section ?? galleryTrack,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      },
    );
  }

  // ── D-16 Featured parallax ── the featured teaser body drifts on translateY against
  // the background as it scrolls through the viewport (depth). translateY only.
  const featured = document.querySelector<HTMLElement>(
    '[data-teaser="featured"] [data-teaser-body]',
  );
  if (featured) {
    const section = featured.closest<HTMLElement>('[data-teaser="featured"]');
    gsap.fromTo(
      featured,
      { yPercent: 12 },
      {
        yPercent: -12,
        ease: 'none',
        scrollTrigger: {
          id: `${ST_ID}-parallax`,
          trigger: section ?? featured,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      },
    );
  }

  // ── D-15 Package-card 3D tilt ── pointer-driven rotateX/rotateY on each summary card
  // (the staggered reveal is already Plan 01's). Touch (no finePointer) gets the reveal
  // without tilt. transform only; the .dc-trigger inside the card keeps its hit box.
  if (finePointer) {
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>('.cards--summary .card'),
    );
    cards.forEach((card) => {
      card.classList.add('card--tilt');
      const MAX = 6; // degrees — subtle (UI-SPEC "subtle 3D tilt")

      const move = (e: PointerEvent) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5; // -0.5..0.5
        const py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(card, {
          rotateY: px * MAX * 2,
          rotateX: -py * MAX * 2,
          duration: 0.3,
          ease: 'power2.out',
          transformPerspective: 700,
          overwrite: true,
        });
      };
      const leave = () => {
        gsap.to(card, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.5,
          ease: 'power3.out',
          overwrite: true,
        });
      };

      card.addEventListener('pointermove', move, { passive: true });
      card.addEventListener('pointerleave', leave);
      tilts.push({ el: card, move, leave });
    });
  }

  // Stale dimensions after a swap (Pitfall 2).
  ScrollTrigger.refresh();
}

export function destroyChoreography(): void {
  // Kill ONLY this module's triggers (tagged with the choreo id) — never Plan 01's reveals.
  ScrollTrigger.getAll().forEach((t) => {
    const id = (t.vars as { id?: string }).id;
    if (id && id.startsWith(ST_ID)) t.kill();
  });

  // Remove tilt listeners and reset any in-flight rotation.
  tilts.forEach(({ el, move, leave }) => {
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerleave', leave);
    gsap.killTweensOf(el);
    gsap.set(el, { rotateX: 0, rotateY: 0 });
  });
  tilts = [];
}
