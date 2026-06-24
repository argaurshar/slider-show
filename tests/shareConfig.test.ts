import { describe, it, expect } from 'vitest';
import {
  decodeConfig,
  encodeConfig,
  readHashParam,
  sanitizeConfig,
} from '../src/lib/settings/shareConfig';
import { DEFAULT_CONFIG } from '../src/lib/presets';

describe('shareConfig encode/decode', () => {
  it('round-trips a full config', () => {
    const cfg = {
      ...DEFAULT_CONFIG,
      transition: 'circle' as const,
      durationMs: 4200,
      caption: { ...DEFAULT_CONFIG.caption, text: 'Before → After ✨', position: 'top' as const },
    };
    const decoded = decodeConfig(encodeConfig(cfg));
    expect(decoded).toEqual(cfg);
  });

  it('produces a URL-safe string (no +, /, =)', () => {
    const s = encodeConfig({
      ...DEFAULT_CONFIG,
      caption: { ...DEFAULT_CONFIG.caption, text: 'lots of ??? padding ~~~~~' },
    });
    expect(s).not.toMatch(/[+/=]/);
  });

  it('returns null for malformed input', () => {
    expect(decodeConfig('not-valid-base64!!')).toBeNull();
    expect(decodeConfig('')).toBeNull();
  });
});

describe('sanitizeConfig', () => {
  it('fills defaults for a non-object', () => {
    expect(sanitizeConfig(null)).toEqual(DEFAULT_CONFIG);
    expect(sanitizeConfig('nope')).toEqual(DEFAULT_CONFIG);
  });

  it('rejects invalid enum values, keeping defaults', () => {
    const c = sanitizeConfig({ transition: 'explode', easing: 42, loop: null });
    expect(c.transition).toBe(DEFAULT_CONFIG.transition);
    expect(c.easing).toBe(DEFAULT_CONFIG.easing);
    expect(c.loop).toBe(DEFAULT_CONFIG.loop);
  });

  it('clamps out-of-range numbers', () => {
    const c = sanitizeConfig({ durationMs: 9_999_999, fps: -10 });
    expect(c.durationMs).toBe(60000);
    expect(c.fps).toBe(1);
  });

  it('re-derives preset dimensions from the aspect ratio', () => {
    const c = sanitizeConfig({ aspectRatio: '16:9', width: 5, height: 5 });
    expect(c.width).toBe(1920);
    expect(c.height).toBe(1080);
  });

  it('keeps custom dimensions (clamped, even)', () => {
    const c = sanitizeConfig({ aspectRatio: 'custom', width: 801, height: 601 });
    expect(c.aspectRatio).toBe('custom');
    expect(c.width).toBe(802);
    expect(c.height).toBe(602);
  });

  it('merges nested caption fields', () => {
    const c = sanitizeConfig({ caption: { text: 'hi', sizePct: 99, position: 'sideways' } });
    expect(c.caption.text).toBe('hi');
    expect(c.caption.sizePct).toBe(0.5); // clamped
    expect(c.caption.position).toBe(DEFAULT_CONFIG.caption.position); // invalid -> default
  });
});

describe('readHashParam', () => {
  it('extracts the settings token from a hash', () => {
    expect(readHashParam('#s=abc123')).toBe('abc123');
    expect(readHashParam('s=abc123')).toBe('abc123');
    expect(readHashParam('#other=1&s=xyz')).toBe('xyz');
  });

  it('returns null when absent', () => {
    expect(readHashParam('')).toBeNull();
    expect(readHashParam('#foo=bar')).toBeNull();
  });
});
