export interface Rect {
  dx: number;
  dy: number;
  dw: number;
  dh: number;
  scale: number;
}

/**
 * Compute the destination rectangle for drawing a source image into a canvas
 * using `object-fit: cover` semantics (fill the canvas, center-crop the overflow).
 *
 * @param focusX horizontal focal point 0..1 (0.5 = centered). Shifts the crop.
 * @param focusY vertical focal point 0..1.
 * @param zoom   extra magnification on top of the cover fit (1 = none). The
 *               image always still covers the canvas, so panning never reveals
 *               background.
 */
export function coverRect(
  sw: number,
  sh: number,
  cw: number,
  ch: number,
  focusX = 0.5,
  focusY = 0.5,
  zoom = 1,
): Rect {
  if (sw <= 0 || sh <= 0) {
    return { dx: 0, dy: 0, dw: cw, dh: ch, scale: 1 };
  }
  const scale = Math.max(cw / sw, ch / sh) * Math.max(1, zoom);
  const dw = sw * scale;
  const dh = sh * scale;
  const dx = (cw - dw) * focusX;
  const dy = (ch - dh) * focusY;
  return { dx, dy, dw, dh, scale };
}
