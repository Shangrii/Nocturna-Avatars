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
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
