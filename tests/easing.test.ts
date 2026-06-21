import { describe, it, expect } from 'vitest';
import { applyEasing, EASING_FNS } from '../src/lib/render/easing';

describe('easing', () => {
  const ids = Object.keys(EASING_FNS) as (keyof typeof EASING_FNS)[];

  it('maps endpoints 0->0 and 1->1 for every easing', () => {
    for (const id of ids) {
      expect(applyEasing(id, 0)).toBeCloseTo(0, 6);
      expect(applyEasing(id, 1)).toBeCloseTo(1, 6);
    }
  });

  it('is monotonically non-decreasing across the range', () => {
    for (const id of ids) {
      let prev = -Infinity;
      for (let t = 0; t <= 1.0001; t += 0.05) {
        const v = applyEasing(id, t);
        expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
        prev = v;
      }
    }
  });

  it('clamps out-of-range input', () => {
    expect(applyEasing('linear', -1)).toBe(0);
    expect(applyEasing('linear', 2)).toBe(1);
  });
});
