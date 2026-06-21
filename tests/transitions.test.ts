import { describe, it, expect } from 'vitest';
import {
  blindBands,
  circleMaxRadius,
  halfPlanePolygon,
  timelinePosition,
} from '../src/lib/render/sliderGeometry';

describe('timelinePosition', () => {
  const tl = { totalFrames: 11, holdStartFrames: 2, holdEndFrames: 3, motionFrames: 6 };
  it('maps the first frame to 0 and the last to 1', () => {
    expect(timelinePosition(0, tl)).toBe(0);
    expect(timelinePosition(10, tl)).toBe(1);
  });
  it('is monotonic across the whole timeline (holds included)', () => {
    expect(timelinePosition(5, tl)).toBeCloseTo(0.5, 5);
  });
  it('clamps out-of-range frames', () => {
    expect(timelinePosition(-4, tl)).toBe(0);
    expect(timelinePosition(99, tl)).toBe(1);
  });
});

describe('circleMaxRadius', () => {
  it('reaches the corner from the centre', () => {
    // 6-8-10 triangle: half-diagonal of 12x16 is 10.
    expect(circleMaxRadius(12, 16)).toBe(10);
  });
});

describe('blindBands', () => {
  it('produces one strip per band', () => {
    expect(blindBands(0.5, 6, 600, true)).toHaveLength(6);
  });
  it('reveals nothing at 0 and everything at 1', () => {
    expect(blindBands(0, 4, 400, true).every((b) => b.size === 0)).toBe(true);
    const full = blindBands(1, 4, 400, true);
    expect(full.every((b) => b.size === 100)).toBe(true);
    // Fully revealed bands tile the axis with no gaps.
    expect(full.map((b) => b.start)).toEqual([0, 100, 200, 300]);
  });
  it('grows from the far edge when not forward', () => {
    const [first] = blindBands(0.5, 4, 400, false);
    // band size 100, reveal 50, grows from the band's trailing edge.
    expect(first.start).toBeCloseTo(50, 5);
    expect(first.size).toBeCloseTo(50, 5);
  });
});

describe('halfPlanePolygon', () => {
  it('returns a triangle near a corner', () => {
    // x + y <= 50 inside 100x100 -> triangle (0,0),(50,0),(0,50).
    const poly = halfPlanePolygon(100, 100, 1, 1, 50);
    expect(poly).toHaveLength(3);
    const xs = poly.map((p) => p[0]).sort((a, b) => a - b);
    const ys = poly.map((p) => p[1]).sort((a, b) => a - b);
    expect(xs[xs.length - 1]).toBeCloseTo(50, 5);
    expect(ys[ys.length - 1]).toBeCloseTo(50, 5);
  });
  it('covers the whole rectangle once the line passes the far corner', () => {
    const poly = halfPlanePolygon(100, 100, 1, 1, 999);
    expect(poly).toHaveLength(4);
  });
  it('is empty before the line enters the rectangle', () => {
    const poly = halfPlanePolygon(100, 100, 1, 1, -10);
    expect(poly).toHaveLength(0);
  });
});
