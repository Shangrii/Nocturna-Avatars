/**
 * store.ts — asset-store display + quick-view behaviors.
 *
 * Swap-safe behaviors bound on every astro:page-load (View Transitions
 * navigations + the initial hard load). NO cart logic — the purchase cart is a
 * sibling module in Plan 03.
 *
 *   1. Broken Jinxxy CDN hotlink -> local branded placeholder, no layout shift
 *      (D-11 / T-06-05). The handler removes itself after firing so a broken
 *      placeholder can't loop.
 *   2. NSFW reveal button toggles a per-card, per-session `product-card--revealed`
 *      class and swaps its own label between the reveal/hide strings via
 *      textContent (XSS-safe — no raw-HTML sink). No persisted 18+ state (D-10).
 *   3. Quick-view (Plan 06-02): clicking / keyboard-activating a product card opens
 *      the QuickViewModal (dc-overlay + focus trap) with the product's image
 *      gallery, description, price, editor, and a validated "Comprar en Jinxxy"
 *      outbound link. Every dynamic node is populated via createElement/textContent
 *      only (T-06-01 — no raw-HTML sink); the buy href is assigned ONLY after the
 *      checkoutUrl passes an https guard (T-06-02) else the disabled
 *      "Enlace no disponible" state is shown.
 *
 * The live DOM is re-queried each load; per-page hooks (cards, overlay) are re-bound
 * with element-level guards, while document-level listeners (Escape) bind once.
 */

const PLACEHOLDER = '/store/placeholder.svg';

// ---------------------------------------------------------------------------
// Browse-slice behaviors (Plan 06-01)
// ---------------------------------------------------------------------------

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

    btn.addEventListener('click', (e) => {
      // The reveal control lives inside the card; stop the activation from
      // bubbling to the card's quick-view opener (it toggles blur, not the modal).
      e.stopPropagation();
      const card = btn.closest<HTMLElement>('[data-product-id]');
      if (!card) return;
      const revealed = card.classList.toggle('product-card--revealed');
      const revealLabel = btn.dataset.labelReveal ?? '';
      const hideLabel = btn.dataset.labelHide ?? '';
      // textContent (no raw-HTML sink) — XSS-safe label swap.
      btn.textContent = revealed ? hideLabel : revealLabel;
      btn.setAttribute('aria-pressed', revealed ? 'true' : 'false');
    });
  });
}

// ---------------------------------------------------------------------------
// Quick-view controller (Plan 06-02)
// ---------------------------------------------------------------------------

interface QuickViewProduct {
  id: string;
  name: string;
  description: string;
  price: string;
  images: string[];
  checkoutUrl: string;
  // Optional additional storefronts (booth, gumroad, …). checkoutUrl remains the
  // primary Jinxxy buy button; these render as extra platform-labeled buttons.
  // No product carries this yet — the render loop is prepared, renders nothing.
  storefronts?: Array<{ platform: string; url: string }>;
  editor: string;
  nsfw: boolean;
  // Optional long-form quick-view sections (present only when staff data defines
  // them; each rendered under the photo as a labeled section when non-empty).
  license?: string;
  details?: string;
  updates?: string;
}

// Per-load: rebuilt from the [data-store-products] island each page.
let qvProducts = new Map<string, QuickViewProduct>();
// Current open product's gallery state.
let qvImages: string[] = [];
let qvIndex = 0;
// Focus origin so closing returns focus to the originating card (a11y).
let qvLastFocus: HTMLElement | null = null;
let qvTrapHandler: ((e: KeyboardEvent) => void) | null = null;
// Document-level listeners (Escape) bound exactly once per page lifetime.
let qvDocListenersBound = false;
// WR-01: pending close-transition handler. A named (non-{once}) listener so a
// bubbling child transitionend (.dc-modal transform, button hover transitions)
// can't consume it before the overlay's own opacity transition ends; open
// cancels it so a stale close can never re-hide a re-opened overlay.
let qvPendingHide: ((e: TransitionEvent) => void) | null = null;

function getOverlay(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-quickview-overlay]');
}

/** Set an element's text via textContent only — no raw-HTML sink (T-06-01). */
function setQvText(root: HTMLElement, selector: string, text: string): void {
  const el = root.querySelector<HTMLElement>(selector);
  if (el) el.textContent = text;
}

/**
 * Render the written sections beneath the product photo. Description is always
 * shown; license/details/updates render only when the field is present and
 * non-empty. Section headings come from the container's data-heading-* attrs
 * (single-sourced i18n). Every node is built with createElement/textContent —
 * no raw-HTML sink (T-06-01). Line breaks are preserved by the .quickview__section-body
 * `white-space: pre-line` rule, so \n in staff data needs no markup.
 */
function renderSections(overlay: HTMLElement, product: QuickViewProduct): void {
  const container = overlay.querySelector<HTMLElement>('[data-quickview-sections]');
  if (!container) return;
  // Clear any prior product's sections (single shared modal, reused per open).
  container.replaceChildren();

  const sections: Array<{ heading: string; body: string | undefined }> = [
    { heading: container.dataset.headingDescription ?? '', body: product.description },
    { heading: container.dataset.headingLicense ?? '', body: product.license },
    { heading: container.dataset.headingDetails ?? '', body: product.details },
    { heading: container.dataset.headingUpdates ?? '', body: product.updates },
  ];

  sections.forEach(({ heading, body }) => {
    if (typeof body !== 'string' || body.trim() === '') return;
    const section = document.createElement('section');
    section.className = 'quickview__section';
    const h = document.createElement('h4');
    h.className = 'quickview__section-heading';
    h.textContent = heading;
    const p = document.createElement('p');
    p.className = 'quickview__section-body';
    p.textContent = body;
    section.append(h, p);
    container.append(section);
  });
}

/**
 * Render the OPTIONAL extra-storefront buttons in the right rail, below the
 * primary buy/add controls. Each entry becomes a platform-labeled secondary
 * outbound button ("Comprar en BOOTH" / "Buy on Gumroad"). Same guards as the
 * primary buy CTA: the href is set ONLY when url passes an https:// check
 * (T-06-02), every button carries rel="noopener noreferrer" (T-06-03), and the
 * label is built via createElement/textContent only — no raw-HTML sink (T-06-01).
 *
 * The CTA template ("Comprar en {platform}") rides on data-label-cta and the
 * platform → display-name map on data-platform-names (both single-sourced from
 * pages.json), so ADDING a storefront later is a store.json-only edit: a staff
 * member appends `{ "platform": "booth", "url": "https://…" }` to a product's
 * `storefronts` array and the button appears with no code change. NO seed product
 * carries `storefronts` today, so this loop renders nothing and the container
 * stays collapsed (:empty { display: none }).
 */
function renderStorefronts(overlay: HTMLElement, product: QuickViewProduct): void {
  const container = overlay.querySelector<HTMLElement>('[data-quickview-storefronts]');
  if (!container) return;
  container.replaceChildren();

  const list = Array.isArray(product.storefronts) ? product.storefronts : [];
  const ctaTpl = container.dataset.labelCta ?? '';
  let names: Record<string, string> = {};
  try {
    names = JSON.parse(container.dataset.platformNames ?? '{}') as Record<string, string>;
  } catch {
    names = {};
  }

  list.forEach((sf) => {
    if (!sf || typeof sf.url !== 'string' || !sf.url.startsWith('https://')) return;
    const platform = typeof sf.platform === 'string' ? sf.platform : '';
    const display =
      names[platform] ??
      (platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : '');
    if (!display) return;
    const a = document.createElement('a');
    a.className = 'quickview__storefront';
    a.href = sf.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = ctaTpl ? ctaTpl.replace('{platform}', display) : display;
    container.append(a);
  });
}

/** Parse the product-data island (attribute channel) into a Map once per load. */
function parseProducts(): void {
  qvProducts = new Map();
  const island = document.querySelector<HTMLElement>('[data-store-products]');
  const raw = island?.dataset.storeProducts;
  if (!raw) return;
  try {
    const list = JSON.parse(raw) as QuickViewProduct[];
    list.forEach((p) => {
      if (p && typeof p.id === 'string') qvProducts.set(p.id, p);
    });
  } catch {
    // Malformed island → no quick-view data (cards simply won't open a modal).
    qvProducts = new Map();
  }
}

const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * trapFocus — returns a keydown handler that cycles Tab/Shift+Tab within the
 * container (mirrors cart.ts). Filters out disabled elements and any inside a
 * [hidden] ancestor so hidden gallery controls are not focusable.
 */
function trapFocus(container: HTMLElement): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => !el.hasAttribute('disabled') && !el.closest('[hidden]'));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
}

/** Render the current gallery image + counter; hide prev/next when single image. */
function renderGalleryImage(): void {
  const overlay = getOverlay();
  if (!overlay) return;
  const img = overlay.querySelector<HTMLImageElement>('[data-quickview-img]');
  const counter = overlay.querySelector<HTMLElement>('[data-quickview-counter]');
  const prevBtn = overlay.querySelector<HTMLButtonElement>('[data-quickview-prev]');
  const nextBtn = overlay.querySelector<HTMLButtonElement>('[data-quickview-next]');

  const src = qvImages[qvIndex] ?? PLACEHOLDER;
  if (img) img.src = src;

  const multiple = qvImages.length > 1;
  [prevBtn, nextBtn].forEach((b) => {
    if (b) b.hidden = !multiple;
  });
  if (counter) {
    if (multiple) {
      const tpl = overlay.dataset.counterLabel ?? '';
      counter.textContent = tpl
        .replace('{n}', String(qvIndex + 1))
        .replace('{total}', String(qvImages.length));
      counter.hidden = false;
    } else {
      counter.textContent = '';
      counter.hidden = true;
    }
  }
}

function openQuickView(id: string, card: HTMLElement | null): void {
  const overlay = getOverlay();
  if (!overlay) return;
  const product = qvProducts.get(id);
  if (!product) return;

  const lang = document.documentElement.lang || 'en';

  // Detail rows — textContent only (T-06-01).
  setQvText(overlay, '[data-quickview-name]', product.name);
  const credit = lang === 'es' ? 'por' : 'by';
  setQvText(overlay, '[data-quickview-editor]', `${credit} ${product.editor}`);
  setQvText(overlay, '[data-quickview-price]', `$${product.price} USD`);

  // Written sections under the photo — description + optional license/details/
  // updates, each rendered via createElement/textContent (T-06-01).
  renderSections(overlay, product);

  // Gallery — fall back to the branded placeholder when a product has no images.
  qvImages = Array.isArray(product.images) && product.images.length
    ? product.images.slice()
    : [PLACEHOLDER];
  qvIndex = 0;

  // NSFW: the quick-view inherits the card's reveal state (D-10). If the product
  // is nsfw and its card was NOT revealed, open the gallery blurred.
  const gallery = overlay.querySelector<HTMLElement>('[data-quickview-gallery]');
  const cardRevealed = card?.classList.contains('product-card--revealed') ?? false;
  if (gallery) {
    gallery.classList.toggle('quickview__gallery--nsfw', product.nsfw && !cardRevealed);
  }
  renderGalleryImage();

  // Buy CTA — validate https BEFORE assigning href (T-06-02). Otherwise render the
  // disabled "Enlace no disponible" / "Link unavailable" state.
  const buy = overlay.querySelector<HTMLAnchorElement>('[data-quickview-buy]');
  if (buy) {
    const buyLabel = buy.dataset.labelBuy ?? '';
    const unavailLabel = buy.dataset.labelUnavailable ?? '';
    const url = product.checkoutUrl;
    const valid = typeof url === 'string' && url.startsWith('https://');
    if (valid) {
      buy.setAttribute('href', url);
      buy.classList.remove('quickview__buy--disabled');
      buy.removeAttribute('aria-disabled');
      if (buyLabel) buy.textContent = buyLabel;
    } else {
      buy.removeAttribute('href');
      buy.classList.add('quickview__buy--disabled');
      buy.setAttribute('aria-disabled', 'true');
      if (unavailLabel) buy.textContent = unavailLabel;
    }
  }

  // Optional extra storefronts (booth/gumroad/…) below the primary buttons —
  // renders nothing today (no seed product defines `storefronts`).
  renderStorefronts(overlay, product);

  // Point the secondary add-to-cart control at the currently-viewed product so
  // store-cart.ts (which binds [data-store-add] by data-product-id) adds THIS item.
  // Also clear any lingering "✓ Añadido" feedback from a previously-viewed product
  // (the modal reuses one shared button): cancel a pending revert timer and restore
  // the default label so the reopened rail never shows a stale success state.
  const addBtn = overlay.querySelector<HTMLElement>('[data-quickview-actions] [data-store-add]');
  if (addBtn) {
    addBtn.dataset.productId = product.id;
    const pending = addBtn.dataset.addedTimer;
    if (pending) {
      window.clearTimeout(Number(pending));
      delete addBtn.dataset.addedTimer;
    }
    const def = addBtn.dataset.labelDefault;
    if (def !== undefined) addBtn.textContent = def;
    addBtn.classList.remove('is-added');
  }

  // Focus origin (return focus here on close). WR-03: the article itself is no
  // longer focusable, so prefer the card's open button (the real tab stop).
  qvLastFocus =
    card?.querySelector<HTMLElement>('[data-card-open]') ??
    card ??
    (document.activeElement as HTMLElement | null);

  // WR-01: cancel any still-pending close handler so a re-open within the close
  // transition can't be force-hidden when the OPEN transition ends.
  if (qvPendingHide) {
    overlay.removeEventListener('transitionend', qvPendingHide);
    qvPendingHide = null;
  }

  // WR-01 open: remove [hidden] BEFORE adding .active so the transition plays.
  overlay.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
  if (prefersReducedMotion()) {
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
  } else {
    requestAnimationFrame(() => {
      overlay.classList.add('active');
      overlay.setAttribute('aria-hidden', 'false');
    });
  }

  // Move focus into the modal (setTimeout lets the rAF activation settle).
  // WR-02: filter out [hidden]/disabled elements (same visibility rule as
  // trapFocus) — for single-image products the gallery prev/next buttons are
  // first in DOM order but [hidden], and .focus() on a display:none element is
  // a no-op that would strand focus behind the dialog.
  const firstFocusable = Array.from(
    overlay.querySelectorAll<HTMLElement>('button, [href]'),
  ).find((el) => !el.hasAttribute('disabled') && !el.closest('[hidden]'));
  setTimeout(() => firstFocusable?.focus(), 50);

  // Attach focus trap.
  if (qvTrapHandler) document.removeEventListener('keydown', qvTrapHandler);
  qvTrapHandler = trapFocus(overlay);
  document.addEventListener('keydown', qvTrapHandler);
}

function closeQuickView(): void {
  const overlay = getOverlay();
  if (!overlay) return;

  if (qvTrapHandler) {
    document.removeEventListener('keydown', qvTrapHandler);
    qvTrapHandler = null;
  }

  overlay.classList.remove('active');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';

  // WR-01 close: re-add [hidden] AFTER the overlay's OWN opacity transition ends.
  // No { once: true } — a bubbling child transitionend (.dc-modal 0.35s transform,
  // 0.2s button hover transitions) would consume a once-listener before the
  // overlay's opacity completes, leaving it un-hidden at opacity 0 with its buy
  // link/buttons still in the Tab order. The named handler self-detaches only
  // when the matching event (target === overlay, propertyName === 'opacity')
  // arrives; openQuickView cancels it on re-open.
  if (prefersReducedMotion()) {
    overlay.setAttribute('hidden', '');
  } else {
    if (qvPendingHide) overlay.removeEventListener('transitionend', qvPendingHide);
    qvPendingHide = (e: TransitionEvent) => {
      if (e.target !== overlay || e.propertyName !== 'opacity') return;
      overlay.removeEventListener('transitionend', qvPendingHide!);
      qvPendingHide = null;
      overlay.setAttribute('hidden', '');
    };
    overlay.addEventListener('transitionend', qvPendingHide);
  }

  // Return focus to the originating card.
  qvLastFocus?.focus();
  qvLastFocus = null;
}

/**
 * Bind card activation — per-card, guarded per load.
 *
 * WR-03: the card's SEMANTIC opener is the product-name <button data-card-open>
 * (ProductCard.astro) — a native button, so Enter/Space activate it with no
 * keydown shim here. This delegated click handler keeps the click-anywhere
 * mouse affordance: the open button's click bubbles into it too (one open —
 * a single listener fires once per click).
 */
function bindCardActivation(): void {
  document.querySelectorAll<HTMLElement>('.product-card').forEach((card) => {
    if (card.dataset.qvBound === 'true') return;
    card.dataset.qvBound = 'true';

    card.addEventListener('click', (e) => {
      // Ignore clicks on nested interactive controls (NSFW reveal, and the
      // Plan-03 add-to-cart control) so they don't also open the quick-view.
      const target = e.target as HTMLElement;
      if (target.closest('[data-nsfw-reveal]') || target.closest('[data-store-add]')) return;
      const id = card.dataset.productId;
      if (id) openQuickView(id, card);
    });
  });
}

/** Bind the modal's own controls (close, backdrop, prev/next) — per overlay. */
function bindQuickViewControls(): void {
  const overlay = getOverlay();
  if (!overlay || overlay.dataset.qvControlsBound === 'true') return;
  overlay.dataset.qvControlsBound = 'true';

  overlay.querySelector<HTMLButtonElement>('[data-quickview-close]')
    ?.addEventListener('click', closeQuickView);

  // Backdrop click (only when the overlay itself, not the inner modal, is clicked).
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeQuickView();
  });

  overlay.querySelector<HTMLButtonElement>('[data-quickview-prev]')
    ?.addEventListener('click', () => {
      if (qvImages.length < 2) return;
      qvIndex = (qvIndex - 1 + qvImages.length) % qvImages.length;
      renderGalleryImage();
    });
  overlay.querySelector<HTMLButtonElement>('[data-quickview-next]')
    ?.addEventListener('click', () => {
      if (qvImages.length < 2) return;
      qvIndex = (qvIndex + 1) % qvImages.length;
      renderGalleryImage();
    });
}

function bindQuickViewDocListeners(): void {
  if (qvDocListenersBound) return;
  qvDocListenersBound = true;
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const overlay = getOverlay();
    if (overlay?.classList.contains('active')) closeQuickView();
  });
}

// ---------------------------------------------------------------------------
// Init + astro:page-load lifecycle
// ---------------------------------------------------------------------------

function initStore(): void {
  if (initRanThisLoad) return;
  initRanThisLoad = true;
  bindImageFallbacks();
  bindNsfwReveals();
  parseProducts();
  bindCardActivation();
  bindQuickViewControls();
  bindQuickViewDocListeners();
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
