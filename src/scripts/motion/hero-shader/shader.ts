/**
 * hero-shader/shader — the WebGL2 glitch field (FX-03).
 *
 * Mounts on the Plan 01 motion controller lifecycle: initHeroShader() runs from
 * initMotion() (astro:page-load), destroyHeroShader() from teardownMotion()
 * (astro:before-swap). It does NOT register its own astro:* listeners — one init
 * path only (per the 02-01 controller contract).
 *
 * Progressive enhancement over the static <img> fallback (Task 1):
 *   - no WebGL2 / reduced-motion          → never init, fallback stays visible (D-04/D-21)
 *   - failIfMajorPerformanceCaveat / null → keep fallback, return (Pitfall 5)
 *   - sustained frame budget miss (~22ms) → cancel rAF, swap to fallback (D-22, perf wins)
 *   - webglcontextlost                    → swap to fallback
 * Only once the first frame renders do we toggle data-shader-live (reveals the
 * canvas, retires the <img>). On teardown we lose the GL context + restore the
 * default fallback state so a re-init starts clean (no leaked rAF / second loop).
 */

import { webglOK, prefersReduced, finePointer } from '../motion-prefs';
import vertSrc from './quad.vert?raw';
import fragSrc from './glitch.frag?raw';

// --- module-scoped live state (single instance) -----------------------------
let canvas: HTMLCanvasElement | null = null;
let host: HTMLElement | null = null; // .hero-bg — owns the data-shader-live flag
let gl: WebGL2RenderingContext | null = null;
let program: WebGLProgram | null = null;
let rafId = 0;
let startTime = 0;
let lostExt: WEBGL_lose_context | null = null;

// Latest pointer (normalized 0..1); read ONCE per frame (D-03 throttle).
const mouse = { x: 0.5, y: 0.5 };
let pointerBound = false;

// Frame-budget guard state (Pitfall 5 / UI-SPEC degradation order).
const BUDGET_MS = 22; // ~45fps floor
const WINDOW_MS = 1000; // steady-state sustained window before bailing
const WARMUP_MS = 700; // initial window after start that uses the tighter bail below
const WARMUP_WINDOW_MS = 350; // sustained miss during warmup → bail fast (no-accel guard)
let overBudgetSince = 0;
let lastFrame = 0;

interface Uniforms {
  time: WebGLUniformLocation | null;
  resolution: WebGLUniformLocation | null;
  mouse: WebGLUniformLocation | null;
  navy: WebGLUniformLocation | null;
  red: WebGLUniformLocation | null;
  redGlow: WebGLUniformLocation | null;
}
let uniforms: Uniforms | null = null;
let brand = { navy: [0.04, 0.05, 0.08], red: [0.75, 0.1, 0.17], redGlow: [0.91, 0.13, 0.23] };

/** Parse a CSS custom property hex (#rrggbb) into linear-ish 0..1 rgb. */
function readBrandColors(el: HTMLElement): void {
  const cs = getComputedStyle(el);
  const toRgb = (name: string, fallback: number[]): number[] => {
    const hex = cs.getPropertyValue(name).trim();
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return fallback;
    const n = parseInt(m[1], 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };
  brand = {
    navy: toRgb('--navy', brand.navy),
    red: toRgb('--red', brand.red),
    redGlow: toRgb('--red-glow', brand.redGlow),
  };
}

/**
 * Detect a software / no-hardware-acceleration WebGL renderer (SwiftShader, llvmpipe,
 * Mesa offscreen, Microsoft Basic Render, …). `failIfMajorPerformanceCaveat` is not
 * reliable on its own — Chrome's SwiftShader fallback still hands back a context — so we
 * additionally read the UNMASKED_RENDERER string and refuse to start the loop when it
 * names a known software rasterizer. Without this the glitch field runs at single-digit
 * fps on machines/browsers with hardware acceleration off (user report). The static
 * <img> fallback stays visible instead (perf wins, D-22).
 */
function isSoftwareRenderer(glc: WebGL2RenderingContext): boolean {
  try {
    const ext = glc.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return false;
    const r = String(glc.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '').toLowerCase();
    return /swiftshader|llvmpipe|software|basic render|microsoft basic|mesa offscreen|paravirtual|angle \(software/.test(
      r,
    );
  } catch {
    return false;
  }
}

function compile(glc: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const sh = glc.createShader(type);
  if (!sh) return null;
  glc.shaderSource(sh, src);
  glc.compileShader(sh);
  if (!glc.getShaderParameter(sh, glc.COMPILE_STATUS)) {
    glc.deleteShader(sh);
    return null;
  }
  return sh;
}

function link(glc: WebGL2RenderingContext): WebGLProgram | null {
  const vs = compile(glc, glc.VERTEX_SHADER, vertSrc);
  const fs = compile(glc, glc.FRAGMENT_SHADER, fragSrc);
  if (!vs || !fs) return null;
  const prog = glc.createProgram();
  if (!prog) return null;
  glc.attachShader(prog, vs);
  glc.attachShader(prog, fs);
  glc.linkProgram(prog);
  glc.deleteShader(vs);
  glc.deleteShader(fs);
  if (!glc.getProgramParameter(prog, glc.LINK_STATUS)) {
    glc.deleteProgram(prog);
    return null;
  }
  return prog;
}

function resize(): void {
  if (!canvas || !gl) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
  }
}

/** Swap to the static fallback and stop the loop (degradation / loss / budget). */
function swapToFallback(): void {
  cancelAnimationFrame(rafId);
  rafId = 0;
  host?.removeAttribute('data-shader-live');
}

const onContextLost = (e: Event): void => {
  e.preventDefault();
  swapToFallback();
};

function onPointerMove(e: PointerEvent): void {
  if (!canvas) return;
  const r = canvas.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return;
  mouse.x = (e.clientX - r.left) / r.width;
  mouse.y = 1 - (e.clientY - r.top) / r.height; // flip to GL space
}

function frame(now: number): void {
  if (!gl || !program || !uniforms || !canvas) return;

  // --- frame-budget guard: bail to fallback on a sustained miss (D-22) ------
  if (lastFrame !== 0) {
    const dt = now - lastFrame;
    // Tighter sustained-miss window during the warmup phase so a weak renderer that
    // slipped past isSoftwareRenderer() bails in ~350ms instead of churning for a full
    // second; steady-state keeps the lenient 1s window so transient hitches don't kill it.
    const window = now - startTime < WARMUP_MS ? WARMUP_WINDOW_MS : WINDOW_MS;
    if (dt > BUDGET_MS) {
      if (overBudgetSince === 0) overBudgetSince = now;
      else if (now - overBudgetSince > window) {
        swapToFallback();
        return;
      }
    } else {
      overBudgetSince = 0;
    }
  }
  lastFrame = now;

  resize();
  const t = (now - startTime) / 1000;

  // On touch (no fine pointer) drift the "mouse" from time → ambient breathing (D-22).
  let mx = mouse.x;
  let my = mouse.y;
  if (!finePointer) {
    mx = 0.5 + Math.cos(t * 0.23) * 0.22;
    my = 0.5 + Math.sin(t * 0.31) * 0.18;
  }

  gl.useProgram(program);
  gl.uniform1f(uniforms.time, t);
  gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
  gl.uniform2f(uniforms.mouse, mx, my); // pointer read ONCE per frame (throttled)
  gl.uniform3fv(uniforms.navy, brand.navy);
  gl.uniform3fv(uniforms.red, brand.red);
  gl.uniform3fv(uniforms.redGlow, brand.redGlow);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  // First successful frame → reveal canvas, retire the static <img>.
  if (!host?.hasAttribute('data-shader-live')) host?.setAttribute('data-shader-live', '');

  rafId = requestAnimationFrame(frame);
}

export function initHeroShader(): void {
  // Defensive: a page without a hero has no canvas — no-op (chrome.ts idiom).
  canvas = document.querySelector<HTMLCanvasElement>('[data-hero-shader]');
  if (!canvas) return;
  host = canvas.closest<HTMLElement>('.hero-bg');

  // Capability gate (single source of truth): no live shader under no-WebGL2 or
  // reduced-motion — leave the static <img> fallback visible (D-04/D-21).
  if (!webglOK() || prefersReduced) {
    canvas = null;
    host = null;
    return;
  }

  const ctx = canvas.getContext('webgl2', {
    failIfMajorPerformanceCaveat: true,
    antialias: false,
    alpha: true,
    powerPreference: 'high-performance',
    depth: false,
    stencil: false,
  });
  if (!ctx) {
    // Software / weak GPU dropped by the caveat flag → keep fallback (Pitfall 5).
    canvas = null;
    host = null;
    return;
  }
  gl = ctx;

  // No-hardware-acceleration guard: SwiftShader/llvmpipe/etc. slip past the caveat flag
  // but render the field at single-digit fps. Never start the loop — keep the fallback.
  if (isSoftwareRenderer(gl)) {
    gl = null;
    canvas = null;
    host = null;
    return;
  }

  program = link(gl);
  if (!program) {
    // Compile/link failure → keep fallback, return.
    gl = null;
    canvas = null;
    host = null;
    return;
  }

  // Read brand colors from tokens.css (NO hard-coded hex in GLSL/runtime).
  readBrandColors(canvas);
  uniforms = {
    time: gl.getUniformLocation(program, 'u_time'),
    resolution: gl.getUniformLocation(program, 'u_resolution'),
    mouse: gl.getUniformLocation(program, 'u_mouse'),
    navy: gl.getUniformLocation(program, 'u_navy'),
    red: gl.getUniformLocation(program, 'u_red'),
    redGlow: gl.getUniformLocation(program, 'u_redGlow'),
  };

  // A VAO is required to draw with no buffers in WebGL2.
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  // Pointer (D-03): bind ONLY on a fine pointer; cache coords, read once/frame.
  // Touch (no finePointer) drives the warp from u_time (ambient) — no listener.
  if (finePointer) {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    pointerBound = true;
  }
  canvas.addEventListener('webglcontextlost', onContextLost, false);

  startTime = performance.now();
  lastFrame = 0;
  overBudgetSince = 0;
  lostExt = gl.getExtension('WEBGL_lose_context');
  resize();
  rafId = requestAnimationFrame(frame);
}

export function destroyHeroShader(): void {
  cancelAnimationFrame(rafId);
  rafId = 0;

  if (pointerBound) {
    window.removeEventListener('pointermove', onPointerMove);
    pointerBound = false;
  }
  canvas?.removeEventListener('webglcontextlost', onContextLost);

  // Lose the GL context so the driver reclaims it (no leak across navigations).
  lostExt?.loseContext();

  // Restore the default static-fallback state so a re-init starts clean.
  host?.removeAttribute('data-shader-live');

  gl = null;
  program = null;
  uniforms = null;
  lostExt = null;
  canvas = null;
  host = null;
  lastFrame = 0;
  overBudgetSince = 0;
}
