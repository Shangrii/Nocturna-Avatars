/**
 * splash.ts — the editor-page click-to-enter gate behaviour (D-22).
 *
 * On Enter (click / Enter key) — or Escape as a skip — this fades the splash out and
 * dispatches a document-level `editor:enter` CustomEvent EXACTLY ONCE. That single
 * dispatch is the shared unlock signal plan 04's background-audio + view-counter scripts
 * listen for (event name is a cross-plan contract — do NOT rename). It also starts any
 * `[data-editor-bg-video]` playback, which is now permitted because dismissal is a user
 * gesture (autoplay + audio unlock).
 *
 * Reduced-motion: skip the fade (instant hide) but STILL dispatch — the gate is a
 * legibility/consent step, not decoration.
 *
 * Event-binding style follows src/scripts/gallery.ts (query hooks, guard a flag,
 * bind once). This module is imported by EditorLayout and runs on every editor page.
 */

const splash = document.querySelector<HTMLElement>('[data-splash]');
const enterBtn = document.querySelector<HTMLElement>('[data-splash-enter]');

// Once-guard: `editor:enter` must fire exactly once no matter how enter is triggered.
let entered = false;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function hideSplash(): void {
  if (!splash) return;
  if (reduceMotion) {
    splash.hidden = true;
    splash.setAttribute('aria-hidden', 'true');
    return;
  }
  splash.classList.add('is-leaving');
  const done = (): void => {
    splash.hidden = true;
    splash.setAttribute('aria-hidden', 'true');
    splash.removeEventListener('transitionend', done);
  };
  splash.addEventListener('transitionend', done);
  // Fallback in case transitionend never fires (e.g. display swap, no transition).
  window.setTimeout(done, 650);
}

function enter(): void {
  if (entered) return;
  entered = true;

  // Start background video playback — unlocked by this user gesture.
  document.querySelectorAll<HTMLVideoElement>('[data-editor-bg-video]').forEach((video) => {
    const played = video.play();
    if (played && typeof played.catch === 'function') played.catch(() => {});
  });

  // The single cross-plan unlock signal (audio + view-counter consume this).
  document.dispatchEvent(new CustomEvent('editor:enter'));

  hideSplash();
}

if (splash && enterBtn) {
  enterBtn.addEventListener('click', enter);

  // Enter confirms; Escape skips the gate. Both funnel through the once-guard.
  document.addEventListener('keydown', (event) => {
    if (entered) return;
    if (event.key === 'Enter' || event.key === 'Escape') {
      event.preventDefault();
      enter();
    }
  });

  // Move focus to the enter control so keyboard users can act immediately.
  window.requestAnimationFrame(() => enterBtn.focus?.());
}
