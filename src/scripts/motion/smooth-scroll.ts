/**
 * smooth-scroll — Lenis wheel-inertia (FX-01) on the one-clock recipe.
 *
 * One clock only (RESEARCH Pattern 1): Lenis is driven by gsap.ticker, NOT its own
 * internal rAF loop. gsap.ticker time is in SECONDS; lenis.raf wants MS — hence
 * `time * 1000`. Getting that conversion wrong freezes or hyperspeeds the scroll.
 *
 * Reduced-motion is a hard no-op (D-21): native scroll stays, no Lenis is created.
 * destroySmoothScroll() runs in astro:before-swap and is the documented fix for the
 * Lenis + ClientRouter "Too many calls to Location or History APIs" throttle (Pitfall 3).
 */

import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReduced } from './motion-prefs';

let lenis: Lenis | null = null;
let tickerCb: ((time: number) => void) | null = null;

export function initSmoothScroll(): void {
  // Reduced-motion: keep native scroll, never construct Lenis (D-21).
  if (prefersReduced()) return;
  // Idempotent: never double-init within a single page lifecycle.
  if (lenis) return;

  // D-13 snappy: short duration, light lerp. syncTouch:false keeps native touch
  // momentum (Pitfall 4). gsap.ticker is the single clock — no internal rAF.
  const instance = new Lenis({
    duration: 0.9,
    lerp: 0.08,
    smoothWheel: true,
    syncTouch: false,
  });
  lenis = instance;

  gsap.registerPlugin(ScrollTrigger);

  // One-clock wiring: Lenis updates ScrollTrigger, gsap.ticker drives Lenis.
  instance.on('scroll', ScrollTrigger.update);
  tickerCb = (time: number) => {
    if (!lenis) return; // removed in teardown before `lenis` is nulled; guard for TS
    lenis.raf(time * 1000); // ticker = seconds, raf = ms
  };
  gsap.ticker.add(tickerCb);
  gsap.ticker.lagSmoothing(0);
}

export function destroySmoothScroll(): void {
  if (tickerCb) {
    gsap.ticker.remove(tickerCb);
    tickerCb = null;
  }
  if (lenis) {
    lenis.destroy(); // Pitfall 3: prevents the History-API throttle on swap.
    lenis = null;
  }
}
