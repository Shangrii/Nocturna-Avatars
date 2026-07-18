/**
 * Pure mute-state resolution for the glitch SFX layer.
 *
 * An explicit persisted user choice ("1" = muted, "0" = unmuted) always wins. When
 * unset, the SFX defaults to ON, EXCEPT it auto-mutes for users who prefer reduced
 * motion (there is no cross-browser prefers-reduced-sound query, so we reuse the
 * reduced-motion signal as the "less stimulation" default). Extracted as a pure
 * function so this branch is unit-testable without a DOM.
 */
export const SFX_MUTE_KEY = 'nocturna-sfx-muted';

export function resolveMuted(stored: string | null, reducedMotion: boolean): boolean {
  if (stored === '1') return true;
  if (stored === '0') return false;
  return reducedMotion;
}
