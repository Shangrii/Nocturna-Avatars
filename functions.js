// ═══════════════════════════════════════
// NOCTURNA AVATARS — Website JS
// ═══════════════════════════════════════
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    initNav();
    initSmoothScroll();
    initScrollReveal();
    initScrollSpy();
    initGalleryLightbox();
    initDiscordModal();
  }

  /* ── Navigation ── */
  function initNav() {
    const nav = document.getElementById('nav');
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');

    if (toggle && links) {
      toggle.addEventListener('click', () => {
        toggle.classList.toggle('open');
        links.classList.toggle('open');
      });
      links.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
          toggle.classList.remove('open');
          links.classList.remove('open');
        });
      });
    }

    let lastY = 0;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (nav) {
        nav.classList.toggle('scrolled', y > 60);
        nav.classList.toggle('nav-hidden', y > lastY && y > 400);
      }
      lastY = y;
    }, { passive: true });
  }

  /* ── Smooth Scroll ── */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const id = this.getAttribute('href');
        if (id === '#') return;
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          const offset = document.getElementById('nav')?.offsetHeight || 0;
          const top = target.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      });
    });
  }

  /* ── Scroll Reveal (Intersection Observer) ── */
  function initScrollReveal() {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }

  /* ── Scroll Spy — highlight active nav link ── */
  function initScrollSpy() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === '#' + id);
          });
        }
      });
    }, { threshold: 0.25, rootMargin: '-80px 0px -50% 0px' });

    sections.forEach(s => observer.observe(s));
  }

  /* ── Gallery Lightbox ── */
  function initGalleryLightbox() {
    const items = document.querySelectorAll('.gallery-item img');
    if (!items.length) return;

    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.innerHTML = '<div class="lightbox-content"><img src="" alt=""><button class="lightbox-close" aria-label="Cerrar">&times;</button></div>';
    document.body.appendChild(lb);

    const lbImg = lb.querySelector('img');
    const lbClose = lb.querySelector('.lightbox-close');

    items.forEach(img => {
      img.style.cursor = 'pointer';
      img.addEventListener('click', () => {
        lbImg.src = img.src;
        lbImg.alt = img.alt;
        lb.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
    });

    function close() {
      lb.classList.remove('active');
      document.body.style.overflow = '';
    }

    lbClose.addEventListener('click', close);
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }

  /* ── Discord Modal ── */
  function initDiscordModal() {
    const overlay = document.getElementById('dcOverlay');
    const dismiss = document.getElementById('dcDismiss');
    if (!overlay) return;

    function open() {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }

    document.querySelectorAll('.dc-trigger').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        open();
      });
    });

    if (dismiss) dismiss.addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }
})();
