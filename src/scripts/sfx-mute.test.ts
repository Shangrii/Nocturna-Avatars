import { describe, it, expect } from 'vitest';
import { resolveMuted } from './sfx-mute';

describe('resolveMuted', () => {
  it('unset + no reduced-motion → unmuted', () => {
    expect(resolveMuted(null, false)).toBe(false);
  });
  it('unset + reduced-motion → muted (auto)', () => {
    expect(resolveMuted(null, true)).toBe(true);
  });
  it('explicit "0" overrides the reduced-motion default → unmuted', () => {
    expect(resolveMuted('0', true)).toBe(false);
  });
  it('explicit "1" → muted', () => {
    expect(resolveMuted('1', false)).toBe(true);
  });
});
