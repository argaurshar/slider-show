import { describe, it, expect } from 'vitest';
import { coverRect } from '../src/lib/image/coverRect';

describe('coverRect', () => {
  it('fills the canvas and centers a portrait source in a portrait canvas', () => {
    // 100x200 source into 1080x1920 canvas.
    const r = coverRect(100, 200, 1080, 1920);
    expect(r.scale).toBeCloseTo(10.8, 5); // limited by width: 1080/100
    expect(r.dw).toBeCloseTo(1080, 5);
    expect(r.dh).toBeCloseTo(2160, 5);
    expect(r.dx).toBeCloseTo(0, 5);
    expect(r.dy).toBeCloseTo((1920 - 2160) / 2, 5);
  });

  it('center-crops a landscape source into a square canvas', () => {
    const r = coverRect(2000, 1000, 1000, 1000);
    expect(r.scale).toBeCloseTo(1, 5); // limited by height: 1000/1000
    expect(r.dw).toBeCloseTo(2000, 5);
    expect(r.dh).toBeCloseTo(1000, 5);
    expect(r.dx).toBeCloseTo(-500, 5);
    expect(r.dy).toBeCloseTo(0, 5);
  });

  it('honors a focal point that shifts the crop', () => {
    const centered = coverRect(2000, 1000, 1000, 1000, 0.5);
    const left = coverRect(2000, 1000, 1000, 1000, 0);
    expect(left.dx).toBeGreaterThan(centered.dx);
    expect(left.dx).toBeCloseTo(0, 5);
  });

  it('degrades gracefully on a zero-sized source', () => {
    const r = coverRect(0, 0, 800, 600);
    expect(r).toEqual({ dx: 0, dy: 0, dw: 800, dh: 600, scale: 1 });
  });

  it('magnifies by the zoom factor while still covering the canvas', () => {
    const base = coverRect(1000, 1000, 1000, 1000);
    const zoomed = coverRect(1000, 1000, 1000, 1000, 0.5, 0.5, 2);
    expect(zoomed.scale).toBeCloseTo(base.scale * 2, 5);
    expect(zoomed.dw).toBeCloseTo(2000, 5);
    expect(zoomed.dh).toBeCloseTo(2000, 5);
    // Centered: overflow split evenly, image still covers (dx,dy <= 0).
    expect(zoomed.dx).toBeCloseTo(-500, 5);
    expect(zoomed.dy).toBeCloseTo(-500, 5);
  });

  it('treats zoom < 1 as no zoom (never exposes the backdrop)', () => {
    const r = coverRect(1000, 1000, 1000, 1000, 0.5, 0.5, 0.3);
    expect(r.scale).toBeCloseTo(1, 5);
    expect(r.dw).toBeCloseTo(1000, 5);
  });

  it('pans within the zoomed overflow via the focal point', () => {
    const left = coverRect(1000, 1000, 1000, 1000, 0, 0.5, 2);
    const right = coverRect(1000, 1000, 1000, 1000, 1, 0.5, 2);
    expect(left.dx).toBeCloseTo(0, 5); // focusX 0 -> left edge flush
    expect(right.dx).toBeCloseTo(-1000, 5); // focusX 1 -> right edge flush
  });

  it('contain mode fits the whole image with letterbox padding', () => {
    // Landscape into square: fits width, pads top/bottom.
    const r = coverRect(2000, 1000, 1000, 1000, 0.5, 0.5, 1, 'contain');
    expect(r.scale).toBeCloseTo(0.5, 5); // limited by width: 1000/2000
    expect(r.dw).toBeCloseTo(1000, 5);
    expect(r.dh).toBeCloseTo(500, 5); // shorter than the canvas -> letterbox
    expect(r.dx).toBeCloseTo(0, 5);
    expect(r.dy).toBeCloseTo(250, 5); // centred vertically
  });

  it('contain mode fits a portrait inside a square (pillarbox)', () => {
    const r = coverRect(1000, 2000, 1000, 1000, 0.5, 0.5, 1, 'contain');
    expect(r.dw).toBeCloseTo(500, 5); // narrower -> pillarbox
    expect(r.dh).toBeCloseTo(1000, 5);
    expect(r.dx).toBeCloseTo(250, 5);
  });

  it('contain mode honors the focal point within the padding', () => {
    const left = coverRect(2000, 1000, 1000, 1000, 0.5, 0, 1, 'contain');
    const top = coverRect(2000, 1000, 1000, 1000, 0.5, 0, 1, 'contain');
    expect(left.dy).toBeCloseTo(0, 5); // focusY 0 -> flush to top of padding
    expect(top.dy).toBeCloseTo(0, 5);
  });

  it('contain mode with zoom can overflow and crop like cover', () => {
    const r = coverRect(2000, 1000, 1000, 1000, 0.5, 0.5, 3, 'contain');
    expect(r.scale).toBeCloseTo(1.5, 5); // 0.5 * 3
    expect(r.dw).toBeCloseTo(3000, 5); // now larger than the canvas
    expect(r.dx).toBeCloseTo(-1000, 5);
  });
});
