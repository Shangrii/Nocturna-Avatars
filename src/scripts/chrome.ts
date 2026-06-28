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

function initNav(): void {
  const nav = document.querySelector<HTMLElement>('[data-nav]');
  const toggle = document.querySelector<HTMLButtonElement>('[data-nav-toggle]');
  const links = document.querySelector<HTMLElement>('[data-nav-links]');

  // (a) Scroll state.
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 60);
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
}

function initDiscordModal(): void {
  // (d) Shared Discord modal opened by any .dc-trigger.
  const overlay = document.querySelector<HTMLElement>('[data-dc-overlay]');
  if (!overlay) return;

  const open = () => {
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };
  const close = () => {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  document.querySelectorAll<HTMLElement>('.dc-trigger').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      open();
    });
  });

  overlay.querySelectorAll<HTMLElement>('[data-dc-dismiss]').forEach((btn) => {
    btn.addEventListener('click', close);
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) close();
  });
}

function init(): void {
  initNav();
  initLangSwitch();
  initDiscordModal();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
