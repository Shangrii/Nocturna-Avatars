/**
 * viewcounter.ts — self-hosted cinema view-counter ping (D-25).
 *
 * On the `editor:enter` splash-dismiss event it does ONE GET to the cinema
 * endpoint and writes the returned count via `textContent` ONLY (never a
 * raw-HTML sink — XSS-safe, T-10.1-04-01). Any failure (non-200, network, timeout,
 * malformed body) leaves the element hidden with NO error text (Copywriting
 * Contract graceful-degrade). The fetch fires AT MOST once even if the event
 * repeats. Endpoint origin matches the plan-12 contract exactly.
 */

/** Endpoint contract (== plan 12): GET .../editors.nocturna-avatars.site/api/views/<slug>?hit=1 */
const VIEWS_BASE = 'https://editors.nocturna-avatars.site/api/views';

let fired = false;

function ping(el: HTMLElement): void {
  if (fired) return; // double-fire guard (fetch once even if the event repeats)
  fired = true;

  const slug = el.dataset.slug;
  if (!slug) return; // stay hidden, no error text

  fetch(`${VIEWS_BASE}/${encodeURIComponent(slug)}?hit=1`)
    .then((res) => (res.ok ? res.json() : null))
    .then((json) => {
      const count = json?.count;
      if (typeof count !== 'number' || !Number.isFinite(count)) return; // hidden

      const out = el.querySelector<HTMLElement>('[data-viewcount-n]');
      if (out) out.textContent = String(count); // textContent ONLY — XSS-safe
      el.hidden = false; // reveal ONLY on success
    })
    .catch(() => {
      /* graceful degrade — leave the element hidden, no error text (D-25) */
    });
}

function boot(): void {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-viewcount]'));
  if (!els.length) return;
  // Splash-gated: fire once on enter. If the splash never dispatches the event
  // the counter simply never appears — that is the intended contract (D-25).
  document.addEventListener('editor:enter', () => els.forEach(ping), { once: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
