import { describe, it, expect } from 'vitest';
import { captionLayout } from '../src/lib/render/caption';
import type { CaptionConfig } from '../src/types/project';

const base: CaptionConfig = {
  text: 'Hello',
  position: 'bottom',
  sizePct: 0.06,
  color: '#ffffff',
  background: true,
};

describe('captionLayout', () => {
  it('returns null when there is no text', () => {
    expect(captionLayout({ ...base, text: '' }, 1080, 1920)).toBeNull();
    expect(captionLayout({ ...base, text: '   ' }, 1080, 1920)).toBeNull();
  });

  it('returns null for a degenerate canvas', () => {
    expect(captionLayout(base, 0, 1920)).toBeNull();
  });

  it('scales the font size with canvas height (resolution-independent)', () => {
    const small = captionLayout(base, 540, 960)!;
    const large = captionLayout(base, 1080, 1920)!;
    expect(small.fontPx).toBe(Math.round(0.06 * 960));
    expect(large.fontPx).toBe(Math.round(0.06 * 1920));
    expect(large.fontPx).toBeGreaterThan(small.fontPx);
  });

  it('anchors by position', () => {
    const ch = 1000;
    const top = captionLayout({ ...base, position: 'top' }, 800, ch)!;
    const center = captionLayout({ ...base, position: 'center' }, 800, ch)!;
    const bottom = captionLayout({ ...base, position: 'bottom' }, 800, ch)!;
    expect(top.y).toBeLessThan(center.y);
    expect(center.y).toBe(ch / 2);
    expect(bottom.y).toBeGreaterThan(center.y);
    // Symmetric margins top/bottom.
    expect(top.y).toBeCloseTo(ch - bottom.y, 5);
    // Always horizontally centred.
    expect(top.x).toBe(400);
  });

  it('splits newlines into trimmed lines', () => {
    const l = captionLayout({ ...base, text: ' a \n b ' }, 800, 1000)!;
    expect(l.lines).toEqual(['a', 'b']);
  });
});
