/**
 * effects.ts — the opt-in JS effects engine for editor pages (D-04).
 *
 * Reads which effects are active from the page-root `data-effects` attribute the
 * EditorLayout sets from `editor.theme.effects`, then wires ONLY the JS effects:
 *   1. typewriter — reveals `[data-typewriter]` text character-by-character,
 *   2. tilt       — pointer-driven `rotate3d` on `[data-tilt]` cards (pointer devices only),
 *   3. particles  — a single lightweight, capped-count canvas overlay.
 * The CSS effects (glass / glow / gradient / hover / overlay-blur-tint) are owned by
 * editor-theme.css and are NOT touched here.
 *
 * The WHOLE engine is gated behind `prefers-reduced-motion: reduce` — under reduced
 * motion it does nothing, because the static fallbacks (full tagline, no tilt, no canvas)
 * are already the default markup/CSS. Each effect no-ops when its key is absent from
 * `data-effects`. Performance budget: at most ONE canvas per page. No third-party lib.
 *
 * Event-binding style follows src/scripts/gallery.ts (query hooks, guard, bind).
 */

const root = document.querySelector<HTMLElement>('[data-effects]');
const effects = (root?.dataset.effects ?? '').split(/\s+/).filter(Boolean);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── 1. Typewriter — char-by-char reveal of the tagline (static full text = fallback). ── */
function initTypewriter(): void {
  document.querySelectorAll<HTMLElement>('[data-typewriter]').forEach((el) => {
    const full = (el.textContent ?? '').trim();
    if (!full) return;
    // a11y: expose the complete text immediately; only the visible glyphs animate.
    el.setAttribute('aria-label', full);
    el.textContent = '';
    let i = 0;
    const tick = (): void => {
      el.textContent = full.slice(0, i);
      i += 1;
      if (i <= full.length) window.setTimeout(tick, 45);
    };
    tick();
  });
}

/* ── 2. Tilt-on-hover — pointer-driven rotate3d, pointer (fine) devices only. ── */
function initTilt(): void {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const MAX_DEG = 8;
  document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((card) => {
    const onMove = (event: PointerEvent): void => {
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(800px) rotate3d(${(-py).toFixed(3)}, ${px.toFixed(3)}, 0, ${MAX_DEG}deg)`;
    };
    const reset = (): void => {
      card.style.transform = '';
    };
    card.addEventListener('pointermove', onMove);
    card.addEventListener('pointerleave', reset);
  });
}

/* ── 3. Particles — ONE capped-count canvas overlay (performance budget). ── */
function initParticles(): void {
  // At most one particle layer per page — bail if one is already mounted.
  if (document.querySelector('[data-particles]')) return;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('data-particles', '');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    zIndex: '0',
    pointerEvents: 'none',
  } as CSSStyleDeclaration);
  (root ?? document.body).appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }

  const MAX_PARTICLES = 70; // capped count — never scales with viewport
  let width = 0;
  let height = 0;
  let dpr = 1;

  interface Particle {
    x: number;
    y: number;
    r: number;
    vx: number;
    vy: number;
    a: number;
  }
  const particles: Particle[] = [];

  const resize = (): void => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();

  for (let i = 0; i < MAX_PARTICLES; i += 1) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2 + 0.6,
      vx: (Math.random() - 0.5) * 0.3,
      vy: Math.random() * 0.6 + 0.2,
      a: Math.random() * 0.4 + 0.2,
    });
  }

  // Tint particles with the editor accent (falls back to off-white).
  const accent =
    getComputedStyle(root ?? document.documentElement).getPropertyValue('--theme-accent').trim() ||
    '#f0eae4';

  let raf = 0;
  const frame = (): void => {
    ctx.clearRect(0, 0, width, height);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y > height + 4) {
        p.y = -4;
        p.x = Math.random() * width;
      }
      if (p.x < -4) p.x = width + 4;
      if (p.x > width + 4) p.x = -4;
      ctx.globalAlpha = p.a;
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    raf = window.requestAnimationFrame(frame);
  };
  raf = window.requestAnimationFrame(frame);

  window.addEventListener('resize', resize);
  // Pause the loop while the tab is hidden (battery / perf).
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      window.cancelAnimationFrame(raf);
    } else {
      raf = window.requestAnimationFrame(frame);
    }
  });
}

// Whole engine gated on reduced motion — static fallbacks are the default.
if (!reduceMotion && root) {
  if (effects.includes('typewriter')) initTypewriter();
  if (effects.includes('tilt')) initTilt();
  if (effects.includes('particles')) initParticles();
}
