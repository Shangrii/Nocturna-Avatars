/**
 * motion/index — lifecycle controller for the motion layer.
 *
 * Inverts chrome.ts's one-shot DOMContentLoaded gate (RESEARCH Pitfall 1/8):
 * under Astro's ClientRouter a module script runs ONCE, but the DOM is swapped on
 * every navigation. So we register the lifecycle listeners at module scope and do
 * the real init/teardown on the per-navigation events instead of at import time.
 *
 *   astro:page-load   → initMotion()    (idempotent re-init after every swap)
 *   astro:before-swap → teardownMotion() (destroy Lenis, kill ScrollTriggers)
 *
 * initMotion() is the single aggregator; each effect module owns its own init/destroy
 * and no-ops cleanly when its targets are absent.
 */

import { initSmoothScroll, destroySmoothScroll } from './smooth-scroll';
import { initReveals, destroyReveals } from './reveals';
import { initHeroShader, destroyHeroShader } from './hero-shader/shader';
import { initChoreography, destroyChoreography } from './choreography';
import { initTransitions, destroyTransitions } from './transitions';

/** Guards against double-binding when astro:page-load re-fires (Pitfall 1). */
let inited = false;

function initMotion(): void {
  if (inited) return;
  inited = true;

  // CSS gates the reveal initial opacity:0 behind this class, so content stays
  // visible when JS is disabled or before this runs (D-20 progressive enhancement).
  document.documentElement.classList.add('motion-ready');

  initSmoothScroll();
  initReveals();
  initHeroShader(); // HeroShader (FX-03) — no-ops without a [data-hero-shader] canvas
  initChoreography(); // Landing package-card 3D tilt (D-15) — landing + !reduced only
  initTransitions(); // First-visit glitch intro (D-18) — initial load + first-ever visit + !reduced
}

function teardownMotion(): void {
  if (!inited) return;
  // Reset the guard FIRST so that if any destroyer throws, the next astro:page-load
  // can still re-init cleanly rather than being permanently short-circuited (CR-03).
  inited = false;
  // Remove the CSS gate now so even a partial teardown (exception mid-destroyers) does
  // not leave .reveal elements frozen at opacity:0 across the subsequent re-init.
  document.documentElement.classList.remove('motion-ready');

  destroyTransitions(); // Intro teardown: pull the overlay + skip listeners if a swap interrupts it
  destroyChoreography(); // Choreography teardown: kill ONLY this module's tagged triggers + tilts
  destroyHeroShader(); // HeroShader teardown: cancelAnimationFrame, lose GL context
  destroyReveals();
  destroySmoothScroll();
}

// Register ONCE at module scope — these survive across navigations.
document.addEventListener('astro:page-load', initMotion);
document.addEventListener('astro:before-swap', teardownMotion);
