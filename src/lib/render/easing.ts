import type { EasingId } from '../../types/project';

/** Easing functions mapping t in [0,1] to an eased value in [0,1]. */
export const EASING_FNS: Record<EasingId, (t: number) => number> = {
  linear: (t) => t,
  easeOut: (t) => 1 - (1 - t) * (1 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};

export const EASING_LABELS: Record<EasingId, string> = {
  linear: 'Linear',
  easeOut: 'Ease out',
  easeInOut: 'Ease in-out',
  easeInOutCubic: 'Smooth',
};

export function applyEasing(id: EasingId, t: number): number {
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  return EASING_FNS[id](clamped);
}
