/**
 * motion-prefs — single source of degradation truth for the motion layer.
 *
 * Reduced-motion is the DEFAULT safe state (D-21); every effect enhances UP from
 * it by branching off these flags. Mirrors the defensive try/catch read idiom from
 * src/pages/index.astro's language-detect block — a browser-API probe that always
 * falls back to a safe default.
 *
 *   liveShader   = webglOK() && !prefersReduced && perfBudgetOK
 *   customCursor = finePointer && !prefersReduced
 *   smoothScroll = !prefersReduced
 */

/** True when the user asked the OS to reduce motion. The safe default to gate from. */
export const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** True only on real mouse/trackpad pointers (desktop) — gates wheel-inertia & cursor FX. */
export const finePointer = matchMedia('(pointer: fine) and (hover: hover)').matches;

/**
 * Probe WebGL2 availability without throwing. Returns false on any failure so the
 * static hero fallback is the safe default (never init a live shader we can't drive).
 */
export function webglOK(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
  } catch {
    return false;
  }
}
