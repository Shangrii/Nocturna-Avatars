/**
 * transitions — page-transition motif glue: the first-visit glitch-tag intro (D-18)
 * and the controller hooks for the glitch-wipe (D-17, whose animation lives in
 * BaseLayout's `transition:animate` + transitions.css).
 *
 * The glitch-WIPE itself is declarative (Astro view-transition on the <main> wrapper),
 * so this module owns only the INTRO overlay:
 *   - plays once, on the very first hard load of a first-ever visit
 *     (`nocturna-intro-seen` in localStorage, mirroring the `nocturna-lang` idiom);
 *   - never under reduced-motion (D-21);
 *   - never on in-site navigations — `introHandled` persists across swaps because the
 *     module is evaluated once, so only the initial astro:page-load plays it (D-18);
 *   - is skippable by a tap/key anywhere, and auto-dismisses after ~1s;
 *   - NEVER blocks the CTA: the overlay is `pointer-events:none` (the skip listener is
 *     window-level), so a click during the intro both skips it AND still reaches the
 *     FloatingCTA underneath (D-19 / Pitfall 7 / T-02-CTA).
 *
 * Mounts on the 02-01 controller: initTransitions() in initMotion, destroyTransitions()
 * in teardownMotion (a swap mid-intro tears the overlay down).
 */

import { prefersReduced } from './motion-prefs';

/** UI-only boolean flag — mirrors the nocturna-lang storage idiom (chrome.ts). */
const INTRO_KEY = 'nocturna-intro-seen';

/** Persists across navigations (module runs once) → gates the intro to the initial load. */
let introHandled = false;

let overlayEl: HTMLDivElement | null = null;
let onSkip: (() => void) | null = null;
let dismissTimer: number | null = null;
let removeTimer: number | null = null;

function hasSeenIntro(): boolean {
  try {
    return localStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return false; // storage unavailable (private mode) → treat as first visit; harmless cosmetic replay
  }
}

function markIntroSeen(): void {
  try {
    localStorage.setItem(INTRO_KEY, '1');
  } catch {
    /* storage unavailable — the intro is a cosmetic ~1s flash; replaying it is acceptable */
  }
}

export function initTransitions(): void {
  // D-18: only the initial load of the session plays the intro; in-site navigations skip.
  if (introHandled) return;
  introHandled = true;

  // D-18/D-21: never under reduced-motion, never after the first-ever visit.
  if (prefersReduced() || hasSeenIntro()) return;

  markIntroSeen();

  // Decorative, no copy string (UI-SPEC Copywriting) — three glitching bars only.
  overlayEl = document.createElement('div');
  overlayEl.className = 'nocturna-intro';
  overlayEl.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 3; i++) {
    const bar = document.createElement('span');
    bar.className = 'nocturna-intro__bar';
    overlayEl.appendChild(bar); // createElement only — no innerHTML/eval (T-02-INJ)
  }
  document.body.appendChild(overlayEl);

  // Tap/key anywhere skips. Window-level (not on the overlay) so the overlay can stay
  // pointer-events:none and never block the CTA — the same click also reaches the CTA.
  onSkip = () => dismissIntro();
  window.addEventListener('pointerdown', onSkip, { passive: true });
  window.addEventListener('keydown', onSkip);

  dismissTimer = window.setTimeout(dismissIntro, 1000);
}

/** Fade the overlay out, then remove it. Idempotent. */
function dismissIntro(): void {
  if (dismissTimer !== null) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }
  if (onSkip) {
    window.removeEventListener('pointerdown', onSkip);
    window.removeEventListener('keydown', onSkip);
    onSkip = null;
  }
  if (overlayEl) {
    const el = overlayEl;
    overlayEl = null;
    el.classList.add('nocturna-intro--out');
    removeTimer = window.setTimeout(() => el.remove(), 400); // matches the CSS fade
  }
}

export function destroyTransitions(): void {
  // A swap mid-intro: pull listeners + the overlay immediately (no lingering fade node).
  if (dismissTimer !== null) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }
  if (removeTimer !== null) {
    clearTimeout(removeTimer);
    removeTimer = null;
  }
  if (onSkip) {
    window.removeEventListener('pointerdown', onSkip);
    window.removeEventListener('keydown', onSkip);
    onSkip = null;
  }
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }
}
