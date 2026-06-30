/**
 * Global chrome behaviors (loaded once via BaseLayout).
 *
 * Dependency-free vanilla TS — no GSAP/Lenis (that motion layer is Phase 2).
 * Ported from the legacy functions.js initNav + initDiscordModal, adapted to the
 * multi-page Astro shell:
 *   (a) toggle `.scrolled` on the nav past 60px of scroll;
 *   (b) wire the hamburger to open/close the mobile drawer, closing on link click;
 *   (c) persist a manual language pick to localStorage('nocturna-lang') before the
 *       switcher navigates (D-05/D-06; only the literal 'es'/'en' is written — T-01-05);
 *   (d) open the shared Discord modal from any `.dc-trigger`; close on dismiss,
 *       backdrop click, or Escape.
 */

const LANG_KEY = 'nocturna-lang';
const VALID_LANGS = ['es', 'en'] as const;

/**
 * Under ClientRouter the swapped DOM gives fresh per-element nodes each navigation,
 * so per-element addEventListener calls never stack. The only listeners that DO stack
 * are the document-level Escape/outside-click handlers below — bind those exactly once
 * across the page's lifetime, guarded by these module flags (RESEARCH Pitfall 8).
 *
 * scrollHandler is module-scoped so initNav() can remove the previous scroll listener
 * before adding a new one — prevents stacking one per navigation (WR-05).
 */
let langDocListenersBound = false;
let modalDocListenersBound = false;
let scrollHandler: (() => void) | null = null;

function initNav(): void {
  const nav = document.querySelector<HTMLElement>('[data-nav]');
  const toggle = document.querySelector<HTMLButtonElement>('[data-nav-toggle]');
  const links = document.querySelector<HTMLElement>('[data-nav-links]');

  // (a) Scroll state + D-19 hide-on-scroll. ONE shared passive listener (Pitfall 8 —
  // never bind a second 'scroll' handler): it toggles `.scrolled` at 60px AND hides the
  // nav on scroll-down / shows it on scroll-up. The top zone always shows the nav; a
  // small delta threshold avoids jitter; equal positions are a no-op. The reduced-motion
  // neutralisation lives in transitions.css (.nav--hidden → transform:none), so the nav
  // stays visible under reduce even if the class toggles. The FloatingCTA is a separate
  // fixed element and is never hidden by this.
  if (nav) {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      nav.classList.toggle('scrolled', y > 60);
      if (y > lastY + 6 && y > 120) {
        nav.classList.add('nav--hidden'); // scrolling down, past the top zone
      } else if (y < lastY - 6 || y <= 120) {
        nav.classList.remove('nav--hidden'); // scrolling up, or back in the top zone
      }
      lastY = y;
    };
    // Remove any previous scroll listener before adding the fresh one so
    // repeated navigations don't stack handlers on window (WR-05).
    if (scrollHandler) window.removeEventListener('scroll', scrollHandler);
    scrollHandler = onScroll;
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // (b) Hamburger drawer.
  if (toggle && links) {
    const setOpen = (open: boolean) => {
      toggle.classList.toggle('open', open);
      links.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', () => {
      setOpen(!links.classList.contains('open'));
    });
    links.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', () => setOpen(false));
    });
  }
}

function initLangSwitch(): void {
  // (c) Persist the manual language choice before navigation.
  document.querySelectorAll<HTMLElement>('[data-lang-switch]').forEach((el) => {
    el.addEventListener('click', () => {
      const target = el.getAttribute('data-lang-switch');
      if (target && (VALID_LANGS as readonly string[]).includes(target)) {
        try {
          localStorage.setItem(LANG_KEY, target);
        } catch {
          /* storage may be unavailable (private mode); navigation still proceeds */
        }
      }
      // Allow the default <a> navigation to continue.
    });
  });

  // (c2) Globe-icon dropdown (CHANGE 4): toggle the menu, and close it on
  // Escape, outside-click, or option selection. Accessible: keeps aria-expanded
  // in sync and the menu hidden via the [hidden] attribute when closed.
  const menu = document.querySelector<HTMLElement>('[data-lang-menu]');
  const trigger = menu?.querySelector<HTMLButtonElement>('[data-lang-trigger]');
  const list = menu?.querySelector<HTMLElement>('[data-lang-list]');
  if (menu && trigger && list) {
    const setOpen = (open: boolean) => {
      trigger.setAttribute('aria-expanded', String(open));
      list.toggleAttribute('hidden', !open);
      menu.classList.toggle('open', open);
    };
    // Per-element listener: the swapped DOM gives a fresh trigger node each navigation,
    // so this never stacks.
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      setOpen(list.hasAttribute('hidden'));
    });
  }

  // Document-level listeners bind ONCE for the page's lifetime (guard flag) and
  // re-query the live DOM at event time so they never hold stale post-swap nodes.
  if (!langDocListenersBound) {
    langDocListenersBound = true;
    const liveMenu = () => document.querySelector<HTMLElement>('[data-lang-menu]');
    const closeMenu = () => {
      const m = liveMenu();
      const t = m?.querySelector<HTMLButtonElement>('[data-lang-trigger]');
      const l = m?.querySelector<HTMLElement>('[data-lang-list]');
      if (m && t && l) {
        t.setAttribute('aria-expanded', 'false');
        l.toggleAttribute('hidden', true);
        m.classList.toggle('open', false);
      }
    };
    document.addEventListener('click', (e) => {
      const m = liveMenu();
      if (m && !m.contains(e.target as Node)) closeMenu();
    });
    document.addEventListener('keydown', (e) => {
      const m = liveMenu();
      const l = m?.querySelector<HTMLElement>('[data-lang-list]');
      const t = m?.querySelector<HTMLButtonElement>('[data-lang-trigger]');
      if (e.key === 'Escape' && l && !l.hasAttribute('hidden')) {
        closeMenu();
        t?.focus();
      }
    });
  }
}

function initDiscordModal(): void {
  // (d) Shared Discord modal opened by any .dc-trigger.
  const overlay = document.querySelector<HTMLElement>('[data-dc-overlay]');
  if (!overlay) return;

  // Track the element that triggered the modal so focus can be returned on close (CR-02).
  let lastFocus: HTMLElement | null = null;

  const open = (trigger?: HTMLElement) => {
    lastFocus = trigger ?? (document.activeElement as HTMLElement | null);
    // Remove [hidden] BEFORE adding .active so the element enters the layout and
    // the CSS fade transition plays correctly (WR-01).
    overlay.removeAttribute('hidden');
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    // Move focus into the modal so keyboard/AT users can reach its controls (CR-02).
    const firstFocusable = overlay.querySelector<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    firstFocusable?.focus();
  };
  const close = () => {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    // Return focus to the triggering element (CR-02).
    lastFocus?.focus();
    lastFocus = null;
    // Re-add [hidden] after the CSS fade completes so the dialog is fully removed
    // from the accessibility tree when closed (WR-01).
    overlay.addEventListener('transitionend', () => overlay.setAttribute('hidden', ''), {
      once: true,
    });
  };

  document.querySelectorAll<HTMLElement>('.dc-trigger').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      open(btn);
    });
  });

  overlay.querySelectorAll<HTMLElement>('[data-dc-dismiss]').forEach((btn) => {
    btn.addEventListener('click', close);
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // Document-level Escape binds ONCE for the page's lifetime (guard flag) and
  // re-queries the live overlay at event time to avoid holding a stale post-swap node.
  if (!modalDocListenersBound) {
    modalDocListenersBound = true;
    document.addEventListener('keydown', (e) => {
      const live = document.querySelector<HTMLElement>('[data-dc-overlay]');
      if (e.key === 'Escape' && live?.classList.contains('active')) {
        // Mirror close() behaviour: remove active, restore scroll, re-add [hidden]
        // after the fade, and return focus to the last focused element (CR-02/WR-01).
        live.classList.remove('active');
        live.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        live.addEventListener('transitionend', () => live.setAttribute('hidden', ''), {
          once: true,
        });
      }
    });
  }
}

function init(): void {
  initNav();
  initLangSwitch();
  initDiscordModal();
}

// Re-run on every ClientRouter navigation (and the initial load, which also fires
// astro:page-load). The per-element binds use the fresh swapped DOM; the document-level
// handlers self-guard against stacking. Replaces the old one-shot ready-state gate
// that died after the first view-transition swap (RESEARCH Pitfall 8).
document.addEventListener('astro:page-load', init);
