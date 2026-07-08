/**
 * store-cart.ts — asset-store REAL purchase cart engine (Plan 06-03).
 *
 * A SIBLING of cart.ts, not an import of it. The mechanics (Map state, WR-01
 * drawer open/close, focus trap, badge sync, astro:page-load lifecycle) are COPIED
 * from cart.ts and re-namespaced to the store contract. This module and the
 * /servicios cotización (cart.ts) are fully separate systems (D-19): distinct Map,
 * distinct DOM hooks (#storeCart*), distinct localStorage key. It NEVER references
 * cart.ts's cotización DOM or the catalog grid.
 *
 * Differences from the cotización cart:
 *   - Entry shape is FLAT { id, name, price, checkoutUrl, qty } — no category
 *     grouping, no per-row image (rows are text-only).
 *   - It PERSISTS to localStorage['nocturna-store-cart'] as [id, qty] pairs and, on
 *     init, RECONCILES the hydrated ids against the canonical [data-store-products]
 *     island — dropping unknown ids and rebuilding name/price/checkoutUrl from the
 *     island (never trusting stored price/url — T-06-04).
 *   - Checkout is per-product: each drawer row carries its own "Comprar en Jinxxy"
 *     link (D-18 NO branch) — there is NO single buy-all button. The total is a
 *     labeled "Total (referencia)" only.
 *
 * Security: every drawer node is built with createElement + textContent (no
 * raw-HTML sink — T-06-01); a row's buy href is assigned ONLY when the checkoutUrl
 * passes an https guard (T-06-02), else a disabled span is rendered; outbound links
 * carry rel="noopener noreferrer" (T-06-03).
 */

const STORAGE_KEY = 'nocturna-store-cart';

// ---------------------------------------------------------------------------
// SECTION 1 — Types and module-level state
// ---------------------------------------------------------------------------

interface StoreCartEntry {
  id: string;
  name: string;
  price: string; // raw numeric string from store.json, e.g. "25"
  checkoutUrl: string;
  qty: number;
}

// The canonical product catalog, rebuilt from the island each page-load.
interface CanonicalProduct {
  id: string;
  name: string;
  price: string;
  checkoutUrl: string;
}

// Module-level cart state — persists across astro:page-load navigations.
const cart = new Map<string, StoreCartEntry>();

// Canonical products from the island (reconcile source), rebuilt each load.
let canonical = new Map<string, CanonicalProduct>();

// Document-level listeners (Escape, backdrop) bound only once per page lifetime.
let storeCartDocListenersBound = false;

// Per-load guard — prevents double-init when astro:page-load and the readyState
// fallback both fire in the same load.
let initRanThisLoad = false;

// Whether the persisted cart has been hydrated + reconciled yet (once per lifetime).
let hydrated = false;

// Focus trap handler for the drawer.
let drawerTrapHandler: ((e: KeyboardEvent) => void) | null = null;

// ---------------------------------------------------------------------------
// SECTION 2 — Canonical island parse + persistence + reconcile
// ---------------------------------------------------------------------------

/** Parse the [data-store-products] island into the canonical product Map. */
function parseCanonical(): void {
  canonical = new Map();
  const island = document.querySelector<HTMLElement>('[data-store-products]');
  const raw = island?.dataset.storeProducts;
  if (!raw) return;
  try {
    const list = JSON.parse(raw) as Array<Record<string, unknown>>;
    list.forEach((p) => {
      if (p && typeof p.id === 'string') {
        canonical.set(p.id, {
          id: p.id,
          name: typeof p.name === 'string' ? p.name : '',
          price: typeof p.price === 'string' ? p.price : String(p.price ?? ''),
          checkoutUrl: typeof p.checkoutUrl === 'string' ? p.checkoutUrl : '',
        });
      }
    });
  } catch {
    canonical = new Map();
  }
}

/** Write the current cart to localStorage as [id, qty] pairs (never full objects). */
function persist(): void {
  try {
    const pairs = [...cart.values()].map((e) => [e.id, e.qty] as [string, number]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pairs));
  } catch {
    // Storage unavailable / quota — cart still works for this session.
  }
}

/**
 * Hydrate the cart from localStorage, RECONCILED against the canonical island:
 * drop any stored id not in the catalog, and rebuild name/price/checkoutUrl FROM
 * the canonical product (never trust stored price/url — T-06-04). Runs once per
 * page lifetime; later navigations keep the in-memory Map.
 */
function hydrateFromStorage(): void {
  if (hydrated) return;
  hydrated = true;
  let pairs: Array<[string, number]> = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        pairs = parsed.filter(
          (p): p is [string, number] =>
            Array.isArray(p) && typeof p[0] === 'string' && typeof p[1] === 'number',
        );
      }
    }
  } catch {
    pairs = []; // corrupt storage → start empty
  }

  cart.clear();
  pairs.forEach(([id, qty]) => {
    const product = canonical.get(id);
    if (!product) return; // unknown id → dropped (T-06-04)
    const cleanQty = Math.max(1, Math.floor(qty));
    cart.set(id, {
      id: product.id,
      name: product.name,
      price: product.price,
      checkoutUrl: product.checkoutUrl,
      qty: cleanQty,
    });
  });
  // Persist the reconciled state so dropped ids don't linger in storage.
  persist();
}

/** Refresh in-cart entries' name/price/url from the (possibly updated) island. */
function reconcileInMemory(): void {
  let changed = false;
  [...cart.keys()].forEach((id) => {
    const product = canonical.get(id);
    if (!product) {
      cart.delete(id);
      changed = true;
      return;
    }
    const entry = cart.get(id)!;
    entry.name = product.name;
    entry.price = product.price;
    entry.checkoutUrl = product.checkoutUrl;
  });
  if (changed) persist();
}

// ---------------------------------------------------------------------------
// SECTION 3 — Cart state mutations
// ---------------------------------------------------------------------------

/** Add one unit of `id`. Returns true when the catalog knows the id (a real add). */
function addToCart(id: string): boolean {
  const existing = cart.get(id);
  if (existing) {
    existing.qty += 1;
  } else {
    const product = canonical.get(id);
    if (!product) return false; // never add an id the catalog doesn't know
    cart.set(id, {
      id: product.id,
      name: product.name,
      price: product.price,
      checkoutUrl: product.checkoutUrl,
      qty: 1,
    });
  }
  persist();
  syncCartUI();
  return true;
}

function removeFromCart(id: string): void {
  cart.delete(id);
  persist();
  syncCartUI();
}

function getCount(): number {
  let total = 0;
  cart.forEach((e) => { total += e.qty; });
  return total;
}

/** Sum price*qty across the cart into a plain "$N USD" reference total. */
function formatTotal(): string {
  let sum = 0;
  cart.forEach((e) => {
    const n = parseFloat(String(e.price).replace(/[^0-9.]/g, ''));
    if (!isNaN(n)) sum += n * e.qty;
  });
  // Trim a trailing ".00"-style artifact but keep genuine decimals.
  const display = Number.isInteger(sum) ? String(sum) : String(Math.round(sum * 100) / 100);
  return `$${display} USD`;
}

// ---------------------------------------------------------------------------
// SECTION 4 — DOM sync (re-queries fresh each call)
// ---------------------------------------------------------------------------

function syncCartUI(): void {
  const pill = document.querySelector<HTMLButtonElement>('#storeCartPill');
  const badge = pill?.querySelector<HTMLElement>('.store-cart-pill__badge');
  const drawer = document.querySelector<HTMLElement>('#storeCartDrawer');
  const drawerList = document.querySelector<HTMLUListElement>('.store-cart-drawer__items');
  const totalSpan = document.querySelector<HTMLElement>('[data-store-cart-total]');

  const count = getCount();

  // Badge count + visibility.
  if (badge) {
    badge.textContent = String(count);
    if (count > 0) badge.removeAttribute('hidden');
    else badge.setAttribute('hidden', '');
  }

  // Pill aria-label from the localized template ("...: {n} productos").
  if (pill) {
    const tpl = drawer?.dataset.i18nPillLabel ?? '';
    pill.setAttribute('aria-label', tpl ? tpl.replace('{n}', String(count)) : String(count));
  }

  // Rebuild the flat item list — createElement + textContent only (T-06-01).
  if (drawerList) {
    while (drawerList.firstChild) drawerList.removeChild(drawerList.firstChild);

    const buyLabel = drawer?.dataset.i18nBuy ?? '';
    const removeLabel = drawer?.dataset.i18nRemove ?? '';
    const unavailLabel = drawer?.dataset.i18nUnavailable ?? '';

    cart.forEach((entry) => {
      const li = document.createElement('li');
      li.className = 'store-cart-drawer__item';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'store-cart-drawer__item-name';
      nameSpan.textContent = entry.name;

      const priceSpan = document.createElement('span');
      priceSpan.className = 'store-cart-drawer__item-price';
      const unit = parseFloat(String(entry.price).replace(/[^0-9.]/g, ''));
      const linePrice = isNaN(unit) ? entry.price : String(
        Number.isInteger(unit * entry.qty) ? unit * entry.qty : Math.round(unit * entry.qty * 100) / 100,
      );
      priceSpan.textContent = `$${linePrice} USD`;

      // Per-item Jinxxy checkout — href ONLY when https-valid (T-06-02); else a
      // disabled span. Outbound links carry rel="noopener noreferrer" (T-06-03).
      const url = entry.checkoutUrl;
      const validUrl = typeof url === 'string' && url.startsWith('https://');
      let buyEl: HTMLElement;
      if (validUrl) {
        const a = document.createElement('a');
        a.className = 'store-cart-drawer__buy';
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = buyLabel;
        buyEl = a;
      } else {
        const span = document.createElement('span');
        span.className = 'store-cart-drawer__buy store-cart-drawer__buy--disabled';
        span.setAttribute('aria-disabled', 'true');
        span.textContent = unavailLabel;
        buyEl = span;
      }

      const removeBtn = document.createElement('button');
      removeBtn.className = 'store-cart-drawer__item-remove';
      removeBtn.type = 'button';
      removeBtn.textContent = '×';
      removeBtn.dataset.removeId = entry.id;
      removeBtn.setAttribute('aria-label', removeLabel ? `${removeLabel}: ${entry.name}` : entry.name);

      li.append(nameSpan, priceSpan, buyEl, removeBtn);
      drawerList.appendChild(li);
    });
  }

  // Reference total.
  if (totalSpan) totalSpan.textContent = formatTotal();
}

// ---------------------------------------------------------------------------
// SECTION 4b — Add-to-cart feedback (button label swap + SR status + badge pulse)
// ---------------------------------------------------------------------------

const prefersReduced = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Flash a transient success state on the clicked add control: swap its label to
 * data-label-added (e.g. "✓ Añadido") + add .is-added for ~1.5s, then revert to
 * data-label-default. textContent-only (T-06-01). A per-element timer id lives on
 * the dataset so a rapid re-click (or a quick-view reopen) can cancel a pending
 * revert. Purely a label/colour change — no keyframe — so it is reduced-motion
 * safe by construction (the swap is instant either way).
 */
function flashAdded(btn: HTMLElement): void {
  const added = btn.dataset.labelAdded;
  if (!added) return;
  const def = btn.dataset.labelDefault ?? btn.textContent ?? '';
  const prev = btn.dataset.addedTimer;
  if (prev) window.clearTimeout(Number(prev));
  btn.textContent = added;
  btn.classList.add('is-added');
  const timer = window.setTimeout(() => {
    btn.textContent = def;
    btn.classList.remove('is-added');
    delete btn.dataset.addedTimer;
  }, 1500);
  btn.dataset.addedTimer = String(timer);
}

/**
 * Announce the add to assistive tech via the visually-hidden polite status region
 * on the pill (see StoreCartPill). Cleared then re-set on the next frame so an
 * identical message (adding the same product twice) still re-announces.
 */
function announceAdded(id: string): void {
  const live = document.querySelector<HTMLElement>('[data-store-cart-live]');
  const product = canonical.get(id);
  if (!live || !product) return;
  const tpl = live.dataset.i18nAdded ?? '';
  const message = tpl ? tpl.replace('{name}', product.name) : product.name;
  live.textContent = '';
  requestAnimationFrame(() => {
    live.textContent = message;
  });
}

/**
 * Pulse the pill badge when the count changes. Re-triggers the CSS animation by
 * removing the class, forcing a reflow, then re-adding it; cleans up on
 * animationend. Skipped entirely under reduced motion (instant count update).
 */
function pulseBadge(): void {
  if (prefersReduced()) return;
  const badge = document.querySelector<HTMLElement>(
    '#storeCartPill .store-cart-pill__badge',
  );
  if (!badge || badge.hasAttribute('hidden')) return;
  badge.classList.remove('store-cart-pill__badge--bump');
  void badge.offsetWidth; // reflow so the animation restarts on re-add
  badge.classList.add('store-cart-pill__badge--bump');
  badge.addEventListener(
    'animationend',
    () => badge.classList.remove('store-cart-pill__badge--bump'),
    { once: true },
  );
}

// ---------------------------------------------------------------------------
// SECTION 5 — Drawer open/close (WR-01 pattern — copied from cart.ts)
// ---------------------------------------------------------------------------

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

function openDrawer(): void {
  const drawer = document.querySelector<HTMLElement>('#storeCartDrawer');
  const backdrop = document.querySelector<HTMLElement>('#storeCartBackdrop');
  if (!drawer || !backdrop) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // WR-01: remove [hidden] BEFORE adding .active so the transition plays.
  backdrop.removeAttribute('hidden');
  drawer.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';

  if (prefersReduced) {
    backdrop.classList.add('active');
    drawer.classList.add('active');
    drawer.setAttribute('aria-hidden', 'false');
  } else {
    requestAnimationFrame(() => {
      backdrop.classList.add('active');
      drawer.classList.add('active');
      drawer.setAttribute('aria-hidden', 'false');
    });
  }

  const firstFocusable = drawer.querySelector<HTMLElement>(
    'button, [href], input, [tabindex]:not([tabindex="-1"])',
  );
  firstFocusable?.focus();

  if (drawerTrapHandler) document.removeEventListener('keydown', drawerTrapHandler);
  drawerTrapHandler = trapFocus(drawer);
  document.addEventListener('keydown', drawerTrapHandler);
}

function closeDrawer(): void {
  const drawer = document.querySelector<HTMLElement>('#storeCartDrawer');
  const backdrop = document.querySelector<HTMLElement>('#storeCartBackdrop');
  if (!drawer) return;

  if (drawerTrapHandler) {
    document.removeEventListener('keydown', drawerTrapHandler);
    drawerTrapHandler = null;
  }

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  drawer.classList.remove('active');
  backdrop?.classList.remove('active');
  drawer.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';

  // WR-01: re-add [hidden] AFTER the transform transition completes (filtered by
  // propertyName so an early opacity transition doesn't hide it prematurely).
  if (prefersReduced) {
    drawer.setAttribute('hidden', '');
    backdrop?.setAttribute('hidden', '');
  } else {
    drawer.addEventListener(
      'transitionend',
      (e) => {
        if (e.propertyName === 'transform') {
          drawer.setAttribute('hidden', '');
          backdrop?.setAttribute('hidden', '');
        }
      },
      { once: true },
    );
  }

  document.querySelector<HTMLElement>('#storeCartPill')?.focus();
}

// ---------------------------------------------------------------------------
// SECTION 6 — Bindings (per-element each load; document-level once)
// ---------------------------------------------------------------------------

/** Bind add-to-cart controls (card + quick-view) — per element, guarded per load. */
function bindAddControls(): void {
  document.querySelectorAll<HTMLElement>('[data-store-add]').forEach((btn) => {
    if (btn.dataset.storeAddBound === 'true') return;
    btn.dataset.storeAddBound = 'true';
    btn.addEventListener('click', (e) => {
      // Never let the add click bubble to the card's quick-view opener.
      e.stopPropagation();
      const id = btn.dataset.productId;
      if (!id) return;
      // Only surface feedback on a real add (a known catalog id).
      if (addToCart(id)) {
        flashAdded(btn);
        announceAdded(id);
        pulseBadge();
      }
    });
  });
}

function bindPillAndClose(): void {
  const pill = document.querySelector<HTMLButtonElement>('#storeCartPill');
  if (pill && pill.dataset.storeBound !== 'true') {
    pill.dataset.storeBound = 'true';
    pill.addEventListener('click', openDrawer);
  }
  const closeBtn = document.querySelector<HTMLButtonElement>('[data-store-cart-close]');
  if (closeBtn && closeBtn.dataset.storeBound !== 'true') {
    closeBtn.dataset.storeBound = 'true';
    closeBtn.addEventListener('click', closeDrawer);
  }
  // Delegate remove-button clicks on the item list.
  const drawerList = document.querySelector<HTMLElement>('.store-cart-drawer__items');
  if (drawerList && drawerList.dataset.storeBound !== 'true') {
    drawerList.dataset.storeBound = 'true';
    drawerList.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest<HTMLButtonElement>(
        '.store-cart-drawer__item-remove',
      );
      if (target?.dataset.removeId) removeFromCart(target.dataset.removeId);
    });
  }
}

function bindDocListeners(): void {
  if (storeCartDocListenersBound) return;
  storeCartDocListenersBound = true;

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const drawer = document.querySelector<HTMLElement>('#storeCartDrawer');
    if (drawer?.classList.contains('active')) closeDrawer();
  });

  document.addEventListener('click', (e) => {
    const backdrop = document.querySelector<HTMLElement>('#storeCartBackdrop');
    if (e.target === backdrop && backdrop?.classList.contains('active')) closeDrawer();
  });
}

// ---------------------------------------------------------------------------
// SECTION 7 — Init + astro:page-load lifecycle
// ---------------------------------------------------------------------------

function initStoreCart(): void {
  if (initRanThisLoad) return;
  initRanThisLoad = true;

  parseCanonical();
  hydrateFromStorage(); // once per lifetime
  reconcileInMemory(); // refresh entries against the current island each load

  bindAddControls();
  bindPillAndClose();
  bindDocListeners();

  syncCartUI(); // re-render from persisted module state on every navigation
}

document.addEventListener('astro:before-swap', () => {
  initRanThisLoad = false;
});

document.addEventListener('astro:page-load', initStoreCart);

if (document.readyState !== 'loading') {
  initStoreCart();
}
