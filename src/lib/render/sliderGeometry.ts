import type { Direction, LoopMode } from '../../types/project';

export type Axis = 'x' | 'y';

export function axisOf(direction: Direction): Axis {
  return direction === 'ltr' || direction === 'rtl' ? 'x' : 'y';
}

/**
 * Convert an eased progress value (0..1) into a normalized split position (0..1)
 * along the motion axis, accounting for direction.
 *
 * The split position is "how far the leading edge of image B has travelled".
 * For `ltr`/`ttb` it grows from 0→1; for `rtl`/`btt` it travels 1→0.
 */
export function splitFraction(direction: Direction, easedT: number): number {
  switch (direction) {
    case 'ltr':
    case 'ttb':
      return easedT;
    case 'rtl':
    case 'btt':
      return 1 - easedT;
  }
}

/**
 * Map a raw timeline position (0..1 across the whole motion section) to the
 * progress value used by easing, honoring the loop mode.
 *
 * - `none` / `loop`: linear 0→1 (loop just repeats the same clip).
 * - `pingpong`: triangle wave 0→1→0 so the slider returns to the start.
 */
export function loopProgress(loop: LoopMode, t: number): number {
  if (loop === 'pingpong') {
    return t < 0.5 ? t * 2 : (1 - t) * 2;
  }
  return t;
}

export interface Timeline {
  totalFrames: number;
  holdStartFrames: number;
  holdEndFrames: number;
  motionFrames: number;
}

/** Resolve the frame budget for an export/preview given duration, fps and holds. */
export function buildTimeline(
  durationMs: number,
  fps: number,
  holdStartMs: number,
  holdEndMs: number,
): Timeline {
  const holdStartFrames = Math.max(0, Math.round((holdStartMs / 1000) * fps));
  const holdEndFrames = Math.max(0, Math.round((holdEndMs / 1000) * fps));
  const motionFrames = Math.max(1, Math.round((durationMs / 1000) * fps));
  return {
    holdStartFrames,
    holdEndFrames,
    motionFrames,
    totalFrames: holdStartFrames + motionFrames + holdEndFrames,
  };
}

/**
 * Given a frame index, return the raw motion progress (0..1) before easing.
 * During the start/end holds the value is pinned to 0 or 1 respectively.
 */
export function frameProgress(frame: number, timeline: Timeline): number {
  const { holdStartFrames, motionFrames } = timeline;
  if (frame < holdStartFrames) return 0;
  const motionFrame = frame - holdStartFrames;
  if (motionFrame >= motionFrames) return 1;
  // Use motionFrames as the denominator so the final motion frame reaches 1.
  return motionFrame / motionFrames;
}

/** Position of a frame across the *entire* timeline (0..1), holds included. */
export function timelinePosition(frame: number, timeline: Timeline): number {
  const denom = timeline.totalFrames - 1;
  return denom <= 0 ? 0 : Math.min(1, Math.max(0, frame / denom));
}

/** Radius that fully covers the canvas from its centre (circle transition). */
export function circleMaxRadius(cw: number, ch: number): number {
  return Math.hypot(cw, ch) / 2;
}

export interface Band {
  /** Offset of the band's revealed strip along the axis. */
  start: number;
  /** Length of the revealed strip (grows 0..bandSize with progress). */
  size: number;
}

/**
 * Venetian-blind bands. The axis (cw or ch) is split into `count` equal bands;
 * each reveals a strip of length `bandSize * eased`. `forward` controls which
 * edge of each band the strip grows from.
 */
export function blindBands(
  eased: number,
  count: number,
  length: number,
  forward: boolean,
): Band[] {
  const bandSize = length / count;
  const reveal = Math.max(0, Math.min(1, eased)) * bandSize;
  const bands: Band[] = [];
  for (let i = 0; i < count; i++) {
    const base = i * bandSize;
    bands.push({ start: forward ? base : base + bandSize - reveal, size: reveal });
  }
  return bands;
}

type Pt = [number, number];

/**
 * Clip the canvas rectangle to the half-plane `a*x + b*y <= c`, returning the
 * polygon (clockwise) of the region that satisfies it. Used for the diagonal
 * wipe. Implemented with a single-edge Sutherland–Hodgman clip.
 */
export function halfPlanePolygon(cw: number, ch: number, a: number, b: number, c: number): Pt[] {
  const rect: Pt[] = [
    [0, 0],
    [cw, 0],
    [cw, ch],
    [0, ch],
  ];
  const inside = (p: Pt) => a * p[0] + b * p[1] <= c;
  const intersect = (p: Pt, q: Pt): Pt => {
    const dp = a * p[0] + b * p[1] - c;
    const dq = a * q[0] + b * q[1] - c;
    const t = dp / (dp - dq);
    return [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])];
  };
  const out: Pt[] = [];
  for (let i = 0; i < rect.length; i++) {
    const cur = rect[i];
    const prev = rect[(i + rect.length - 1) % rect.length];
    const curIn = inside(cur);
    const prevIn = inside(prev);
    if (curIn) {
      if (!prevIn) out.push(intersect(prev, cur));
      out.push(cur);
    } else if (prevIn) {
      out.push(intersect(prev, cur));
    }
  }
  return out;
}
