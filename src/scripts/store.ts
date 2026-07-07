/**
 * store.ts — asset-store display behaviors (browse slice, Plan 06-01).
 *
 * Two small, swap-safe behaviors bound on every astro:page-load (View
 * Transitions navigations + the initial hard load). NO cart logic — the
 * purchase cart is a sibling module in Plan 03.
 *
 *   1. Broken Jinxxy CDN hotlink -> local branded placeholder, no layout shift
 *      (D-11 / T-06-05). The handler removes itself after firing so a broken
 *      placeholder can't loop.
 *   2. NSFW reveal button toggles a per-card, per-session `product-card--revealed`
 *      class and swaps its own label between the reveal/hide strings via
 *      textContent (XSS-safe — never innerHTML). No persisted 18+ state (D-10).
 *
 * The live DOM is re-queried each load; no persisted module state is needed here.
 */

const PLACEHOLDER = '/store/placeholder.svg';

let initRanThisLoad = false;

function bindImageFallbacks(): void {
  const imgs = document.querySelectorAll<HTMLImageElement>('[data-store-img]');
  imgs.forEach((img) => {
    if (img.dataset.storeImgBound === 'true') return;
    img.dataset.storeImgBound = 'true';

    const onError = () => {
      img.removeEventListener('error', onError);
      // Guard the loop: only swap if we aren't already on the placeholder.
      if (!img.src.endsWith(PLACEHOLDER)) {
        img.src = PLACEHOLDER;
      }
    };
    img.addEventListener('error', onError);

    // A hard navigation may have already fired `error` before this bound; if the
    // image failed and is still not the placeholder, swap now.
    if (img.complete && img.naturalWidth === 0 && !img.src.endsWith(PLACEHOLDER)) {
      onError();
    }
  });
}

function bindNsfwReveals(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-nsfw-reveal]');
  buttons.forEach((btn) => {
    if (btn.dataset.nsfwRevealBound === 'true') return;
    btn.dataset.nsfwRevealBound = 'true';

    btn.addEventListener('click', () => {
      const card = btn.closest<HTMLElement>('[data-product-id]');
      if (!card) return;
      const revealed = card.classList.toggle('product-card--revealed');
      const revealLabel = btn.dataset.labelReveal ?? '';
      const hideLabel = btn.dataset.labelHide ?? '';
      // textContent (never innerHTML) — XSS-safe label swap.
      btn.textContent = revealed ? hideLabel : revealLabel;
      btn.setAttribute('aria-pressed', revealed ? 'true' : 'false');
    });
  });
}

function initStore(): void {
  if (initRanThisLoad) return;
  initRanThisLoad = true;
  bindImageFallbacks();
  bindNsfwReveals();
}

// Reset the per-load guard when a navigation starts so the next page re-inits.
document.addEventListener('astro:before-swap', () => {
  initRanThisLoad = false;
});

// Run for every astro:page-load (View Transitions + initial load).
document.addEventListener('astro:page-load', initStore);

// Fallback: on a hard navigation astro:page-load may fire before this module
// finishes loading. If the document is past 'loading', run immediately.
if (document.readyState !== 'loading') {
  initStore();
}
