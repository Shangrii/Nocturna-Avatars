/**
 * reveals — scroll-driven reveals + SplitText display headings (FX-02).
 *
 * Animates ONLY opacity/transform (never top/left/width/height — reflow blows the
 * perf budget). Travel offsets come from the --space-* tokens (24/32/48px). Bold
 * spray/stagger on the landing, subtler fade on inner pages (D-12). Display headings
 * split per word/char and stagger AFTER document.fonts.ready so the .ttf glyph widths
 * measure correctly (Pitfall 9). ScrollTrigger.refresh() after init/swap fixes stale
 * dimensions (Pitfall 2). Reduced-motion collapses everything to a single gentle fade
 * (D-21). All triggers + splits are killed in teardown so navigation never leaks.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { prefersReduced } from './motion-prefs';

/** Landing routes get the bold treatment; everything else is subtle (D-12). */
const LANDING_PATHS = ['/', '/es/', '/en/'];

let splits: SplitText[] = [];

function isLanding(): boolean {
  return LANDING_PATHS.includes(location.pathname);
}

/** Read a --space-* token in px from :root (no arbitrary px in JS). */
function spaceToken(name: string): number {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return parseInt(v, 10) || 0;
}

export function initReveals(): void {
  const reveals = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));

  // Reduced-motion: a single gentle whole-element fade, no stagger/clip/split (D-21).
  if (prefersReduced()) {
    reveals.forEach((el, i) => {
      gsap.fromTo(
        el,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.6,
          ease: 'power1.out',
          scrollTrigger: { id: `reveal-${i}`, trigger: el, start: 'top 90%', once: true },
        },
      );
    });
    ScrollTrigger.refresh();
    return;
  }

  gsap.registerPlugin(ScrollTrigger, SplitText);

  const bold = isLanding();
  // Travel + stagger scale with boldness — landing slides further and staggers harder.
  const travel = bold ? spaceToken('--space-xl') : spaceToken('--space-md'); // 48 vs 24

  reveals.forEach((el, i) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: travel },
      {
        opacity: 1,
        y: 0,
        duration: bold ? 0.8 : 0.6,
        ease: bold ? 'power3.out' : 'power2.out',
        delay: bold ? (i % 4) * 0.05 : 0, // light offset stagger on landing
        scrollTrigger: { id: `reveal-${i}`, trigger: el, start: 'top 85%', once: true },
      },
    );
  });

  // Display headings: split per word/char and stagger AFTER the font is ready so glyph
  // widths measure correctly and we don't reflow on font swap (Pitfall 9).
  const headings = Array.from(
    document.querySelectorAll<HTMLElement>('.hero-title, .section-title'),
  );
  if (headings.length) {
    document.fonts.ready.then(() => {
      headings.forEach((h, i) => {
        const split = new SplitText(h, { type: 'words,chars' });
        splits.push(split);
        gsap.from(split.chars, {
          opacity: 0,
          y: spaceToken('--space-md'),
          duration: 0.5,
          ease: 'power3.out',
          stagger: bold ? 0.02 : 0.01,
          scrollTrigger: { id: `reveal-heading-${i}`, trigger: h, start: 'top 85%', once: true },
        });
      });
      // Heights changed after the font swap + split — recompute trigger positions.
      ScrollTrigger.refresh();
    });
  }

  // Stale dimensions after a swap (Pitfall 2).
  ScrollTrigger.refresh();
}

export function destroyReveals(): void {
  // Kill ONLY this module's triggers (tagged with the 'reveal-' prefix) — never
  // choreography's choreo-marquee / choreo-parallax triggers (CR-07).
  ScrollTrigger.getAll()
    .filter((t) => (t.vars as { id?: string }).id?.startsWith('reveal-'))
    .forEach((t) => t.kill());
  splits.forEach((s) => s.revert());
  splits = [];
}
