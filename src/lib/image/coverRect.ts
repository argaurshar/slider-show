export interface Rect {
  dx: number;
  dy: number;
  dw: number;
  dh: number;
  scale: number;
}

export type FitMode = 'cover' | 'contain';

/**
 * Compute the destination rectangle for drawing a source image into a canvas.
 *
 * - `cover` (default): fill the canvas, center-crop the overflow.
 * - `contain`: fit the whole image inside the canvas (letterbox padding shows).
 *
 * @param focusX horizontal focal point 0..1 (0.5 = centered). In `cover` it
 *               shifts the crop; in `contain` it shifts the image within the
 *               padding (and crops once `zoom` makes it overflow).
 * @param focusY vertical focal point 0..1.
 * @param zoom   extra magnification on top of the fit (1 = none).
 * @param mode   'cover' or 'contain'.
 */
export function coverRect(
  sw: number,
  sh: number,
  cw: number,
  ch: number,
  focusX = 0.5,
  focusY = 0.5,
  zoom = 1,
  mode: FitMode = 'cover',
): Rect {
  if (sw <= 0 || sh <= 0) {
    return { dx: 0, dy: 0, dw: cw, dh: ch, scale: 1 };
  }
  const base = mode === 'contain' ? Math.min(cw / sw, ch / sh) : Math.max(cw / sw, ch / sh);
  const scale = base * Math.max(1, zoom);
  const dw = sw * scale;
  const dh = sh * scale;
  const dx = (cw - dw) * focusX;
  const dy = (ch - dh) * focusY;
  return { dx, dy, dw, dh, scale };
}
