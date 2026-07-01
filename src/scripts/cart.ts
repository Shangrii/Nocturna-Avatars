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
  name: string;  // item display name (resolved at add time from DOM)
  price: string; // raw price string: "99" or "cotizar"
  qty: number;
}

// Module-level cart state — intentionally persists across astro:page-load (D-06)
const cart = new Map<string, CartEntry>();

// Module-level guard — document-level listeners bound only once per page lifetime
let cartDocListenersBound = false;

// Module-level modal/drawer focus trap state (Plan 03.1-06)
let lastFocusBeforeModal: HTMLElement | null = null;
let drawerTrapHandler: ((e: KeyboardEvent) => void) | null = null;
let modalTrapHandler: ((e: KeyboardEvent) => void) | null = null;

// ---------------------------------------------------------------------------
// SECTION 2 — Cart state functions (pure, no DOM)
// ---------------------------------------------------------------------------

function addItem(id: string, name: string, price: string, repeatable: boolean): void {
  if (!repeatable) {
    // Non-repeatable: idempotent — already added = no-op
    if (!cart.has(id)) {
      cart.set(id, { name, price, qty: 1 });
    }
  } else {
    // Repeatable: increment qty or add with qty=1
    const existing = cart.get(id);
    if (existing) {
      cart.set(id, { ...existing, qty: existing.qty + 1 });
    } else {
      cart.set(id, { name, price, qty: 1 });
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

function getTotal(): number {
  let total = 0;
  cart.forEach((entry) => {
    const parsed = parseInt(entry.price, 10);
    if (!isNaN(parsed)) {
      total += parsed * entry.qty;
    }
  });
  return total;
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
        ? `Ver selección: ${count} servicios`
        : `View selection: ${count} services`,
    );
  }

  // 7. Show/hide pill (prefers-reduced-motion guard on both show and hide paths)
  if (pill) {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (count > 0) {
      pill.removeAttribute('hidden');
      if (!prefersReduced) {
        pill.classList.remove('cart-pill--hiding');
        pill.classList.add('cart-pill--visible');
      }
    } else {
      pill.classList.remove('cart-pill--visible');
      if (prefersReduced) {
        pill.classList.remove('cart-pill--hiding');
        pill.setAttribute('hidden', '');
      } else {
        pill.classList.add('cart-pill--hiding');
        pill.addEventListener(
          'animationend',
          () => {
            pill.classList.remove('cart-pill--hiding');
            pill.setAttribute('hidden', '');
          },
          { once: true },
        );
      }
    }
  }

  // 8. Rebuild drawerList using DOM node creation (textContent safe — T-03.1-05)
  if (drawerList) {
    // Clear existing children safely
    while (drawerList.firstChild) {
      drawerList.removeChild(drawerList.firstChild);
    }
    cart.forEach((entry, id) => {
      const li = document.createElement('li');
      li.className = 'cart-drawer__item';

      // Name span
      const nameSpan = document.createElement('span');
      nameSpan.className = 'cart-drawer__item-name';
      nameSpan.textContent = entry.name; // textContent — T-03.1-05 XSS guard

      // Qty span (only show if qty > 1)
      const qtySpan = document.createElement('span');
      qtySpan.className = 'cart-drawer__item-qty';
      if (entry.qty > 1) {
        qtySpan.textContent = `×${entry.qty}`;
      }

      // Price span
      const priceSpan = document.createElement('span');
      priceSpan.className = 'cart-drawer__item-price';
      const parsed = parseInt(entry.price, 10);
      if (!isNaN(parsed)) {
        priceSpan.textContent = `$${parsed * entry.qty} USD`;
      } else {
        priceSpan.textContent = 'Cotizar';
      }

      // Remove button
      const removeBtn = document.createElement('button');
      removeBtn.className = 'cart-drawer__item-remove';
      removeBtn.type = 'button';
      removeBtn.textContent = '×';
      removeBtn.dataset.removeId = id;
      removeBtn.setAttribute('aria-label', `Eliminar ${entry.name}`);

      li.appendChild(nameSpan);
      li.appendChild(qtySpan);
      li.appendChild(priceSpan);
      li.appendChild(removeBtn);
      drawerList.appendChild(li);
    });
  }

  // 9. Update total
  if (totalSpan) {
    totalSpan.textContent = String(getTotal());
  }

  // 10. Sync catalog row button states
  document.querySelectorAll<HTMLElement>('[data-item-id]').forEach((li) => {
    const id = li.dataset.itemId;
    if (!id) return;
    const inCart = cart.has(id);
    const entry = cart.get(id);
    const lang = document.documentElement.lang || 'en';

    // Sync Agregar/Quitar button
    const addBtn = li.querySelector<HTMLButtonElement>('.cart-add-trigger');
    if (addBtn) {
      if (inCart) {
        addBtn.classList.add('catalog-row__cart-btn--added');
        addBtn.textContent = lang === 'es' ? 'Quitar' : 'Remove';
      } else {
        addBtn.classList.remove('catalog-row__cart-btn--added');
        addBtn.textContent = lang === 'es' ? 'Agregar' : 'Add';
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
      const li = btn.closest<HTMLElement>('[data-item-id]')!;
      const nameEl = li.querySelector<HTMLElement>('.catalog-row__name')!;
      const priceEl = li.querySelector<HTMLElement>('.catalog-row__price')!;
      const name = nameEl.textContent?.trim() ?? '';
      // Extract raw price: strip '$' prefix and ' USD' suffix, or use 'cotizar'
      const rawPrice = priceEl.classList.contains('catalog-row__price--cotizar')
        ? 'cotizar'
        : (priceEl.textContent?.trim().replace(/^\$/, '').replace(/\s*USD$/, '') ?? '0');

      if (cart.has(id)) {
        removeItem(id);
      } else {
        addItem(id, name, rawPrice, false);
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
      const li = btn.closest<HTMLElement>('[data-item-id]')!;
      const nameEl = li.querySelector<HTMLElement>('.catalog-row__name')!;
      const priceEl = li.querySelector<HTMLElement>('.catalog-row__price')!;
      const name = nameEl.textContent?.trim() ?? '';
      const rawPrice = priceEl.classList.contains('catalog-row__price--cotizar')
        ? 'cotizar'
        : (priceEl.textContent?.trim().replace(/^\$/, '').replace(/\s*USD$/, '') ?? '0');

      if (cart.has(id)) {
        setQty(id, (cart.get(id)?.qty ?? 0) + 1);
      } else {
        addItem(id, name, rawPrice, true);
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
  if (!drawer || !backdrop || getCount() === 0) return;

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
function buildClipboardText(lang: 'es' | 'en'): string {
  const lines: string[] = [];
  lines.push(lang === 'es' ? 'Mi selección de servicios:' : 'My service selection:');

  cart.forEach((entry) => {
    const parsed = parseInt(entry.price, 10);
    if (entry.qty === 1) {
      const priceStr = isNaN(parsed) ? 'Cotizar' : `$${parsed} USD`;
      lines.push(`• ${entry.name} — ${priceStr}`);
    } else {
      const priceStr = isNaN(parsed) ? 'Cotizar' : `$${parsed * entry.qty} USD`;
      lines.push(`• ${entry.name} x${entry.qty} — ${priceStr}`);
    }
  });

  lines.push('');
  const total = getTotal();
  lines.push(
    lang === 'es'
      ? `Total estimado: $${total} USD`
      : `Estimated total: $${total} USD`,
  );
  lines.push(
    lang === 'es'
      ? '(Precios sujetos a cotización final)'
      : '(Prices subject to final quote)',
  );

  return lines.join('\n');
}

function openCartModal(): void {
  const overlay = document.querySelector<HTMLElement>('[data-cart-modal-overlay]');
  if (!overlay) return;
  const lang = (document.documentElement.lang || 'en') as 'es' | 'en';

  // Populate modal list — createElement + textContent (T-03.1-08 XSS guard)
  const listEl = overlay.querySelector<HTMLElement>('.cart-modal__list');
  const totalEl = overlay.querySelector<HTMLElement>('.cart-modal__total');
  if (listEl) {
    while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
    cart.forEach((entry) => {
      const p = document.createElement('p');
      const parsed = parseInt(entry.price, 10);
      const lineTotal = isNaN(parsed) ? 'Cotizar' : `$${parsed * entry.qty} USD`;
      const qtyStr = entry.qty > 1 ? ` ×${entry.qty}` : '';
      p.textContent = `• ${entry.name}${qtyStr} — ${lineTotal}`;
      listEl.appendChild(p);
    });
  }
  if (totalEl) {
    const totalNum = getTotal();
    totalEl.textContent =
      lang === 'es'
        ? `Total estimado: $${totalNum} USD`
        : `Estimated total: $${totalNum} USD`;
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

  // Wire copy button (once — re-wired each open)
  const copyBtn = overlay.querySelector<HTMLButtonElement>('[data-cart-copy]');
  if (copyBtn) {
    copyBtn.addEventListener(
      'click',
      () => {
        const text = buildClipboardText(lang);
        navigator.clipboard.writeText(text).then(() => {
          // Success: show ¡Copiado! state for 1500ms then revert
          copyBtn.classList.add('cart-modal__copy--copied');
          copyBtn.textContent = lang === 'es' ? '¡Copiado!' : 'Copied!';
          setTimeout(() => {
            copyBtn.classList.remove('cart-modal__copy--copied');
            copyBtn.textContent = lang === 'es' ? 'Copiar selección' : 'Copy selection';
          }, 1500);
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
// SECTION 10 — initCart() and astro:page-load registration (mirrors chrome.ts exactly)
// ---------------------------------------------------------------------------

function initCart(): void {
  bindCartRowControls();
  bindPillClick();
  bindDrawerClose();
  bindDrawerTicket();
  syncCartUI(); // re-render from persisted module state on each navigation

  if (!cartDocListenersBound) {
    cartDocListenersBound = true;
    bindEscapeKey();
    bindBackdropClick();
  }
}

document.addEventListener('astro:page-load', initCart);
