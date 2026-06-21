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
