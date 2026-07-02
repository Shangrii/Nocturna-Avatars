/**
 * cart.ts — Catalog Configurator cart engine.
 *
 * Vanilla TypeScript. No external dependencies.
 * Implements Map-based cart state, DOM sync (pill badge, drawer list, drawer total),
 * and drawer open/close following the WR-01 pattern from chrome.ts.
 *
 * Architecture notes:
 *   - cart Map is module-level: persists across astro:page-load navigations (D-06)
 *   - cartDocListenersBound is module-level: document-level handlers bound exactly once
 *   - All DOM queries happen inside functions that run each page-load (no stale refs)
 *   - textContent used for all user-facing text (no direct DOM injection) — T-03.1-05 XSS guard
 */

// ---------------------------------------------------------------------------
// SECTION 1 — Types and module-level state
// ---------------------------------------------------------------------------

interface CartEntry {
  name: string;         // item display name (resolved at add time from DOM)
  price: string;        // raw price string: "5" | "10-35" | "cotizar"
  qty: number;
  categoryId: string;   // catalog category slug (for grouping the drawer list)
  categoryName: string; // localized category label
}

// Module-level cart state — intentionally persists across astro:page-load (D-06)
const cart = new Map<string, CartEntry>();

// Module-level guard — document-level listeners bound only once per page lifetime
let cartDocListenersBound = false;

// Per-load guard — prevents double-init when both astro:page-load and the
// readyState fallback fire in the same page load (cart.ts is page-specific so
// astro:page-load may have already fired before this module executes on first load)
let initCartRanThisLoad = false;

// Module-level modal/drawer focus trap state (Plan 03.1-06)
let lastFocusBeforeModal: HTMLElement | null = null;
let drawerTrapHandler: ((e: KeyboardEvent) => void) | null = null;
let modalTrapHandler: ((e: KeyboardEvent) => void) | null = null;

// ---------------------------------------------------------------------------
// SECTION 2 — Cart state functions (pure, no DOM)
// ---------------------------------------------------------------------------

function addItem(
  id: string,
  name: string,
  price: string,
  repeatable: boolean,
  categoryId = '',
  categoryName = '',
): void {
  if (!repeatable) {
    // Non-repeatable: idempotent — already added = no-op
    if (!cart.has(id)) {
      cart.set(id, { name, price, qty: 1, categoryId, categoryName });
    }
  } else {
    // Repeatable: increment qty or add with qty=1
    const existing = cart.get(id);
    if (existing) {
      cart.set(id, { ...existing, qty: existing.qty + 1 });
    } else {
      cart.set(id, { name, price, qty: 1, categoryId, categoryName });
    }
  }
}

function removeItem(id: string): void {
  cart.delete(id);
}

function setQty(id: string, qty: number): void {
  if (qty <= 0) {
    removeItem(id);
  } else {
    const existing = cart.get(id);
    if (existing) {
      cart.set(id, { ...existing, qty });
    }
  }
}

function getCount(): number {
  let total = 0;
  cart.forEach((entry) => { total += entry.qty; });
  return total;
}

interface PriceParts { min: number; max: number; quote: boolean; }

/** Parse a raw price string ("5" | "10-35" | "cotizar") into numeric min/max. */
function parsePrice(raw: string): PriceParts {
  const s = (raw ?? '').toLowerCase().trim();
  if (s === 'cotizar' || s === '') return { min: 0, max: 0, quote: true };
  const nums = s.split('-').map((p) => parseInt(p.replace(/[^0-9]/g, ''), 10));
  if (nums.length >= 2 && !isNaN(nums[0]) && !isNaN(nums[1])) {
    return { min: nums[0], max: nums[1], quote: false };
  }
  const n = parseInt(s.replace(/[^0-9]/g, ''), 10);
  if (isNaN(n)) return { min: 0, max: 0, quote: true };
  return { min: n, max: n, quote: false };
}

/** Format one entry's price with qty applied: "$25", "$20–$70", or "Cotizar". */
function formatEntryPrice(raw: string, qty: number): string {
  const p = parsePrice(raw);
  if (p.quote) return 'Cotizar';
  if (p.min === p.max) return `$${p.min * qty}`;
  return `$${p.min * qty}–$${p.max * qty}`;
}

/** Sum a list of entries (default: the whole cart) into a min/max range + quote flag. */
function getTotalRange(
  entries: CartEntry[] = [...cart.values()],
): { min: number; max: number; hasQuote: boolean } {
  let min = 0;
  let max = 0;
  let hasQuote = false;
  entries.forEach((entry) => {
    const p = parsePrice(entry.price);
    if (p.quote) {
      hasQuote = true;
    } else {
      min += p.min * entry.qty;
      max += p.max * entry.qty;
    }
  });
  return { min, max, hasQuote };
}

/** Format the quote total for display: "$45 USD", "$60–$120 USD", "$45 USD + a cotizar". */
function formatTotal(lang: string, entries?: CartEntry[]): string {
  const { min, max, hasQuote } = getTotalRange(entries);
  let text = min === max ? `$${min}` : `$${min}–$${max}`;
  text += ' USD';
  if (hasQuote) text += lang === 'es' ? ' + a cotizar' : ' + to be quoted';
  return text;
}

// ---------------------------------------------------------------------------
// SECTION 3 — DOM sync (re-queries fresh each call — critical for ClientRouter)
// ---------------------------------------------------------------------------

function syncCartUI(): void {
  // 1. Query pill
  const pill = document.querySelector<HTMLButtonElement>('#cartPill');
  // 2. Query badge inside pill
  const badge = pill?.querySelector<HTMLElement>('.cart-pill__badge');
  // 3. Query drawer item list
  const drawerList = document.querySelector<HTMLUListElement>('.cart-drawer__items');
  // 4. Query total span
  const totalSpan = document.querySelector<HTMLElement>('[data-cart-total]');

  const count = getCount();

  // 5. Update badge text
  if (badge) {
    badge.textContent = String(count);
  }

  // 6. Update pill aria-label
  if (pill) {
    const lang = document.documentElement.lang || 'en';
    pill.setAttribute(
      'aria-label',
      lang === 'es'
        ? `Ver mi cotización: ${count} servicios`
        : `View my quote: ${count} services`,
    );
  }

  // 7. The cart button is a persistent circle on the services page — it stays
  //    visible at all times; only the count badge appears once items are added.
  if (badge) {
    if (count > 0) {
      badge.removeAttribute('hidden');
    } else {
      badge.setAttribute('hidden', '');
    }
  }

  // 8. Rebuild drawerList grouped by category (textContent safe — T-03.1-05).
  //    Mirrors the catalog: a category header (icon + name) then its rows.
  if (drawerList) {
    while (drawerList.firstChild) {
      drawerList.removeChild(drawerList.firstChild);
    }

    // Group entries by category, preserving insertion order within each group.
    const groups = new Map<string, { name: string; items: Array<[string, CartEntry]> }>();
    cart.forEach((entry, id) => {
      const key = entry.categoryId || 'other';
      if (!groups.has(key)) groups.set(key, { name: entry.categoryName, items: [] });
      groups.get(key)!.items.push([id, entry]);
    });

    // Render known categories in catalog order, then any leftovers.
    const CATEGORY_ORDER = ['unity', 'blender', 'textures', 'extras'];
    const orderedKeys = [
      ...CATEGORY_ORDER.filter((k) => groups.has(k)),
      ...[...groups.keys()].filter((k) => !CATEGORY_ORDER.includes(k)),
    ];

    orderedKeys.forEach((key) => {
      const group = groups.get(key)!;

      // Category header — clone the exact glyph from the catalog header (no innerHTML).
      const header = document.createElement('li');
      header.className = 'cart-drawer__cat';
      const catGlyph = document.querySelector(
        `.catalog-cat[data-category="${key}"] .catalog-cat__glyph svg`,
      );
      if (catGlyph) {
        const glyphWrap = document.createElement('span');
        glyphWrap.className = 'cart-drawer__cat-glyph';
        glyphWrap.appendChild(catGlyph.cloneNode(true));
        header.appendChild(glyphWrap);
      }
      const catName = document.createElement('span');
      catName.className = 'cart-drawer__cat-name';
      catName.textContent = group.name;
      header.appendChild(catName);
      drawerList.appendChild(header);

      // Item rows: [name (×qty)] ......... [price] [remove ×]
      group.items.forEach(([id, entry]) => {
        const li = document.createElement('li');
        li.className = 'cart-drawer__item';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'cart-drawer__item-name';
        nameSpan.textContent = entry.name; // textContent — T-03.1-05 XSS guard
        if (entry.qty > 1) {
          const qtySpan = document.createElement('span');
          qtySpan.className = 'cart-drawer__item-qty';
          qtySpan.textContent = ` ×${entry.qty}`;
          nameSpan.appendChild(qtySpan);
        }

        const priceSpan = document.createElement('span');
        priceSpan.className = 'cart-drawer__item-price';
        priceSpan.textContent = formatEntryPrice(entry.price, entry.qty);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'cart-drawer__item-remove';
        removeBtn.type = 'button';
        removeBtn.textContent = '×';
        removeBtn.dataset.removeId = id;
        removeBtn.setAttribute('aria-label', `Eliminar ${entry.name}`);

        li.appendChild(nameSpan);
        li.appendChild(priceSpan);
        li.appendChild(removeBtn);
        drawerList.appendChild(li);
      });
    });
  }

  // 9. Update total (range-aware; may include a "+ a cotizar" suffix)
  if (totalSpan) {
    const lang = document.documentElement.lang || 'en';
    totalSpan.textContent = formatTotal(lang);
  }

  // 10. Sync catalog row button states
  document.querySelectorAll<HTMLElement>('[data-item-id]').forEach((li) => {
    const id = li.dataset.itemId;
    if (!id) return;
    const inCart = cart.has(id);
    const entry = cart.get(id);
    const lang = document.documentElement.lang || 'en';

    // Sync add/remove circle. The +/✓ glyph is CSS-driven (::before), so we only
    // toggle the --added class and update the aria-label — never textContent.
    const addBtn = li.querySelector<HTMLButtonElement>('.cart-add-trigger');
    if (addBtn) {
      const itemName = li.querySelector<HTMLElement>('.catalog-row__name')?.textContent?.trim() ?? '';
      if (inCart) {
        addBtn.classList.add('catalog-row__cart-btn--added');
        addBtn.setAttribute('aria-label', lang === 'es' ? `Quitar ${itemName}` : `Remove ${itemName}`);
      } else {
        addBtn.classList.remove('catalog-row__cart-btn--added');
        addBtn.setAttribute('aria-label', lang === 'es' ? `Agregar ${itemName}` : `Add ${itemName}`);
      }
    }

    // Sync qty count display
    const qtyCount = li.querySelector<HTMLElement>('.qty-count');
    if (qtyCount) {
      qtyCount.textContent = entry ? String(entry.qty) : '0';
    }
  });
}

// ---------------------------------------------------------------------------
// SECTION 4 — bindCartRowControls()
// ---------------------------------------------------------------------------

function bindCartRowControls(): void {
  // Bind Agregar/Quitar toggle buttons (non-repeatable items)
  document.querySelectorAll<HTMLButtonElement>('.cart-add-trigger').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.itemId!;
      // Read from the row: name via textContent, RAW price via data-price
      // (the button itself also carries data-item-id, so closest targets .catalog-row).
      const li = btn.closest<HTMLElement>('.catalog-row')!;
      const name = li.querySelector<HTMLElement>('.catalog-row__name')?.textContent?.trim() ?? '';
      const rawPrice = li.dataset.price ?? 'cotizar';
      const catEl = li.closest<HTMLElement>('.catalog-cat');
      const categoryId = catEl?.dataset.category ?? '';
      const categoryName = catEl?.querySelector<HTMLElement>('.catalog-cat__name')?.textContent?.trim() ?? '';

      if (cart.has(id)) {
        removeItem(id);
      } else {
        addItem(id, name, rawPrice, false, categoryId, categoryName);
      }
      syncCartUI();
    });
  });

  // Bind qty decrement buttons (repeatable items)
  document.querySelectorAll<HTMLButtonElement>('.qty-btn--dec').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.itemId!;
      const current = cart.get(id)?.qty ?? 0;
      if (current <= 1) {
        removeItem(id);
      } else {
        setQty(id, current - 1);
      }
      syncCartUI();
    });
  });

  // Bind qty increment buttons (repeatable items)
  document.querySelectorAll<HTMLButtonElement>('.qty-btn--inc').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.itemId!;
      const li = btn.closest<HTMLElement>('.catalog-row')!;
      const name = li.querySelector<HTMLElement>('.catalog-row__name')?.textContent?.trim() ?? '';
      const rawPrice = li.dataset.price ?? 'cotizar';
      const catEl = li.closest<HTMLElement>('.catalog-cat');
      const categoryId = catEl?.dataset.category ?? '';
      const categoryName = catEl?.querySelector<HTMLElement>('.catalog-cat__name')?.textContent?.trim() ?? '';

      if (cart.has(id)) {
        setQty(id, (cart.get(id)?.qty ?? 0) + 1);
      } else {
        addItem(id, name, rawPrice, true, categoryId, categoryName);
      }
      syncCartUI();
    });
  });

  // Bind remove buttons in drawer via event delegation on the item list
  const drawerList = document.querySelector<HTMLElement>('.cart-drawer__items');
  if (drawerList) {
    drawerList.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest<HTMLButtonElement>('.cart-drawer__item-remove');
      if (target?.dataset.removeId) {
        removeItem(target.dataset.removeId);
        syncCartUI();
      }
    });
  }
}

// ---------------------------------------------------------------------------
// SECTION 5 — Drawer open/close (WR-01 pattern — mirrors chrome.ts exactly)
// ---------------------------------------------------------------------------

function openDrawer(): void {
  const drawer = document.querySelector<HTMLElement>('#cartDrawer');
  const backdrop = document.querySelector<HTMLElement>('#cartBackdrop');
  // The cart button is always available, so the drawer opens even when empty
  // (it renders its own empty-state message via CSS).
  if (!drawer || !backdrop) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // WR-01: remove [hidden] BEFORE adding .active so the CSS transition plays
  backdrop.removeAttribute('hidden');
  drawer.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';

  if (prefersReduced) {
    // Skip rAF trick — apply classes immediately for instant show
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

  // Move focus into the drawer for keyboard/AT users
  const firstFocusable = drawer.querySelector<HTMLElement>(
    'button, [href], input, [tabindex]:not([tabindex="-1"])',
  );
  firstFocusable?.focus();

  // Attach drawer focus trap
  if (drawerTrapHandler) document.removeEventListener('keydown', drawerTrapHandler);
  drawerTrapHandler = trapFocus(drawer);
  document.addEventListener('keydown', drawerTrapHandler);
}

function closeDrawer(): void {
  const drawer = document.querySelector<HTMLElement>('#cartDrawer');
  const backdrop = document.querySelector<HTMLElement>('#cartBackdrop');
  if (!drawer) return;

  // Remove drawer focus trap
  if (drawerTrapHandler) {
    document.removeEventListener('keydown', drawerTrapHandler);
    drawerTrapHandler = null;
  }

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  drawer.classList.remove('active');
  backdrop?.classList.remove('active');
  drawer.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';

  // WR-01: re-add [hidden] AFTER transform transition completes
  // Filter by 'transform' to avoid early trigger from 'opacity' (RESEARCH.md Risk 4)
  if (prefersReduced) {
    // No transition — hide immediately
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

  // Return focus to the pill
  document.querySelector<HTMLElement>('#cartPill')?.focus();
}

// ---------------------------------------------------------------------------
// SECTION 6 — Pill click + drawer close bindings (per-element, fresh each page-load)
// ---------------------------------------------------------------------------

function bindPillClick(): void {
  document.querySelector<HTMLButtonElement>('#cartPill')?.addEventListener('click', openDrawer);
}

function bindDrawerClose(): void {
  document.querySelector<HTMLButtonElement>('[data-cart-close]')?.addEventListener('click', closeDrawer);
}

// ---------------------------------------------------------------------------
// SECTION 7 — Escape key + backdrop click (document-level, guarded by cartDocListenersBound)
// ---------------------------------------------------------------------------

function bindEscapeKey(): void {
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    // Re-query live DOM each keydown (same as chrome.ts pattern — RESEARCH.md Section 3)
    const modal = document.querySelector<HTMLElement>('[data-cart-modal-overlay]');
    const drawer = document.querySelector<HTMLElement>('#cartDrawer');

    if (modal?.classList.contains('active')) {
      closeCartModal(); // forward declaration — implemented in Plan 03.1-06
    } else if (drawer?.classList.contains('active')) {
      closeDrawer();
    }
  });
}

function bindBackdropClick(): void {
  document.addEventListener('click', (e) => {
    const backdrop = document.querySelector<HTMLElement>('#cartBackdrop');
    if (e.target === backdrop && backdrop?.classList.contains('active')) {
      closeDrawer();
    }
  });
}

// ---------------------------------------------------------------------------
// SECTION 8 — Drawer "Abrir Ticket" button wiring
// ---------------------------------------------------------------------------

function bindDrawerTicket(): void {
  document.querySelector<HTMLButtonElement>('[data-cart-ticket]')?.addEventListener('click', () => {
    closeDrawer();
    // openCartModal() called after drawer close animation starts — implemented in Plan 03.1-06
    setTimeout(() => openCartModal(), 50);
  });
}

// ---------------------------------------------------------------------------
// SECTION 9 — Focus trap helper, clipboard builder, openCartModal / closeCartModal
// ---------------------------------------------------------------------------

/**
 * trapFocus — returns a keydown handler that cycles Tab/Shift+Tab within container.
 * Filters out elements that are inside a [hidden] ancestor so they are not focusable.
 */
function trapFocus(container: HTMLElement): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])'),
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

/**
 * buildClipboardText — constructs the plain-text cart summary for clipboard copy (D-13).
 * Uses textContent from cart Map entries (set at add time from DOM — T-03.1-08).
 */
function buildClipboardText(lang: 'es' | 'en', entries: CartEntry[] = [...cart.values()]): string {
  const lines: string[] = [];
  lines.push(lang === 'es' ? 'Mi selección de servicios:' : 'My service selection:');

  entries.forEach((entry) => {
    const priceStr = formatEntryPrice(entry.price, entry.qty);
    const qtyStr = entry.qty > 1 ? ` x${entry.qty}` : '';
    lines.push(`• ${entry.name}${qtyStr} — ${priceStr}`);
  });

  lines.push('');
  lines.push(
    lang === 'es'
      ? `Total estimado: ${formatTotal(lang, entries)}`
      : `Estimated total: ${formatTotal(lang, entries)}`,
  );
  lines.push(
    lang === 'es'
      ? '(Precios sujetos a cotización final)'
      : '(Prices subject to final quote)',
  );

  return lines.join('\n');
}

// `entries` overrides the source list — used by the package CTAs to quote a single
// package instead of the modular cart. Defaults to the whole cart.
function openCartModal(entries?: CartEntry[]): void {
  const overlay = document.querySelector<HTMLElement>('[data-cart-modal-overlay]');
  if (!overlay) return;
  const lang = (document.documentElement.lang || 'en') as 'es' | 'en';
  const quote = entries ?? [...cart.values()];

  // Populate modal list — createElement + textContent (T-03.1-08 XSS guard)
  const listEl = overlay.querySelector<HTMLElement>('.cart-modal__list');
  const totalEl = overlay.querySelector<HTMLElement>('.cart-modal__total');
  if (listEl) {
    while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
    quote.forEach((entry) => {
      const p = document.createElement('p');
      const lineTotal = formatEntryPrice(entry.price, entry.qty);
      const qtyStr = entry.qty > 1 ? ` ×${entry.qty}` : '';
      p.textContent = `• ${entry.name}${qtyStr} — ${lineTotal}`;
      listEl.appendChild(p);
    });
    // Empty-quote hint (the modal can be reached with nothing selected)
    if (quote.length === 0) {
      const p = document.createElement('p');
      p.className = 'cart-modal__empty';
      p.textContent =
        lang === 'es'
          ? 'Aún no has agregado servicios a tu cotización.'
          : 'You haven’t added any services to your quote yet.';
      listEl.appendChild(p);
    }
  }
  if (totalEl) {
    totalEl.textContent =
      lang === 'es'
        ? `Total estimado: ${formatTotal(lang, quote)}`
        : `Estimated total: ${formatTotal(lang, quote)}`;
  }

  // Store focus origin so closeCartModal can return focus (a11y)
  lastFocusBeforeModal = document.activeElement as HTMLElement;

  // WR-01 open pattern: unhide FIRST, then add .active in next frame
  overlay.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => {
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
  });

  // Focus first focusable element in modal (setTimeout allows rAF to complete)
  const firstFocusable = overlay.querySelector<HTMLElement>('button, [href]');
  setTimeout(() => firstFocusable?.focus(), 50);

  // Attach modal focus trap
  if (modalTrapHandler) document.removeEventListener('keydown', modalTrapHandler);
  modalTrapHandler = trapFocus(overlay);
  document.addEventListener('keydown', modalTrapHandler);

  // Wire dismiss button (once — re-wired each open)
  overlay.querySelector<HTMLButtonElement>('[data-cart-modal-dismiss]')?.addEventListener(
    'click',
    closeCartModal,
    { once: true },
  );

  // Wire backdrop click (clicking the overlay outside the inner modal)
  overlay.addEventListener(
    'click',
    (e) => { if (e.target === overlay) closeCartModal(); },
    { once: true },
  );

  // Wire the "copy quote & open ticket" button (once — re-wired each open).
  // INTERIM behaviour: copy the quote template to the clipboard, then open Discord
  // so the user can paste it into their ticket. When the bot's ticket-creation flow
  // lands (nocturna-bot, later phase), this handler is what gets swapped.
  const copyBtn = overlay.querySelector<HTMLButtonElement>('[data-cart-copy]');
  if (copyBtn) {
    // Update the label span (keeps the button's icon intact); fall back to the button.
    const labelEl = copyBtn.querySelector<HTMLElement>('[data-copy-label]') ?? copyBtn;
    const defaultLabel = lang === 'es' ? 'Copiar cotización y abrir ticket' : 'Copy quote & open ticket';
    const ticketUrl = copyBtn.dataset.ticketUrl;
    copyBtn.addEventListener(
      'click',
      () => {
        const text = buildClipboardText(lang, quote);
        navigator.clipboard.writeText(text).then(() => {
          // Success: show copied state, open Discord, then revert the label
          copyBtn.classList.add('cart-modal__copy--copied');
          labelEl.textContent = lang === 'es' ? '¡Copiado! Abriendo Discord…' : 'Copied! Opening Discord…';
          if (ticketUrl) window.open(ticketUrl, '_blank', 'noopener,noreferrer');
          setTimeout(() => {
            copyBtn.classList.remove('cart-modal__copy--copied');
            labelEl.textContent = defaultLabel;
          }, 1800);
        }).catch(() => {
          // Failure: insert a pre element for manual copy (no alert())
          const existingPre = overlay.querySelector('.cart-modal__copy-fallback');
          if (!existingPre) {
            const pre = document.createElement('pre');
            pre.className = 'cart-modal__copy-fallback';
            pre.style.cssText =
              'font-size:12px;overflow-x:auto;padding:8px;background:rgba(255,255,255,0.05);' +
              'margin-top:8px;white-space:pre-wrap;word-break:break-word;';
            pre.textContent = text; // textContent — T-03.1-08 XSS guard
            copyBtn.insertAdjacentElement('afterend', pre);
            const msg = document.createElement('p');
            msg.style.cssText = 'font-size:12px;color:var(--color-white-dim);margin-top:4px;';
            msg.textContent =
              lang === 'es'
                ? 'No se pudo copiar. Selecciona el texto manualmente.'
                : 'Could not copy. Please select the text manually.';
            pre.insertAdjacentElement('afterend', msg);
          }
        });
      },
      { once: true },
    );
  }
}

function closeCartModal(): void {
  const overlay = document.querySelector<HTMLElement>('[data-cart-modal-overlay]');
  if (!overlay) return;

  // Remove modal focus trap
  if (modalTrapHandler) {
    document.removeEventListener('keydown', modalTrapHandler);
    modalTrapHandler = null;
  }

  // WR-01 close pattern
  overlay.classList.remove('active');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  overlay.addEventListener(
    'transitionend',
    () => overlay.setAttribute('hidden', ''),
    { once: true },
  );

  // Return focus to last focused element before modal opened
  lastFocusBeforeModal?.focus();
  lastFocusBeforeModal = null;
}

// ---------------------------------------------------------------------------
// SECTION 10 — package CTAs + initCart() and astro:page-load registration
// ---------------------------------------------------------------------------

/**
 * Package cards (Penumbra/Umbra/Eclipse) route their "Abrir Ticket" through the SAME
 * two-button quote popup as the modular cotización — quoting just that package — so the
 * whole conversion path (and the future bot ticket flow) is unified. Packages stay out
 * of the modular cart (D: "paquetes aparte").
 */
function bindPackageTickets(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-package-ticket]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.packageName?.trim() ?? '';
      const rawPrice = (btn.dataset.packagePrice ?? '').replace(/[^0-9.\-]/g, '') || 'cotizar';
      const entry: CartEntry = {
        name,
        price: rawPrice,
        qty: 1,
        categoryId: 'package',
        categoryName: '',
      };
      openCartModal([entry]);
    });
  });
}

function initCart(): void {
  if (initCartRanThisLoad) return;
  initCartRanThisLoad = true;

  bindCartRowControls();
  bindPillClick();
  bindDrawerClose();
  bindDrawerTicket();
  bindPackageTickets();
  syncCartUI(); // re-render from persisted module state on each navigation

  if (!cartDocListenersBound) {
    cartDocListenersBound = true;
    bindEscapeKey();
    bindBackdropClick();
  }
}

// Reset per-load flag on every navigation start so next page can re-init
document.addEventListener('astro:before-swap', () => {
  initCartRanThisLoad = false;
});

// Register for every astro:page-load (View Transitions navigations + initial load
// when the module executes BEFORE the event fires)
document.addEventListener('astro:page-load', initCart);

// Fallback: cart.ts is page-specific, so on a hard navigation astro:page-load
// may fire before this module finishes loading. If readyState is already past
// 'loading', the event already fired — run initCart immediately.
if (document.readyState !== 'loading') {
  initCart();
}
