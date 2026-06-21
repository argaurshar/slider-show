import type { SliderConfig } from '../../types/project';
import { coverRect } from '../image/coverRect';
import { applyEasing } from './easing';
import {
  axisOf,
  blindBands,
  circleMaxRadius,
  halfPlanePolygon,
  loopProgress,
  splitFraction,
} from './sliderGeometry';

/** Anything we can hand to ctx.drawImage that also exposes intrinsic size. */
export interface RenderImage {
  source: CanvasImageSource;
  width: number;
  height: number;
}

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Slow zoom/pan transform applied to a cover-drawn image (Ken-Burns). */
interface Motion {
  scale: number;
  panX: number;
  panY: number;
}

const NO_MOTION: Motion = { scale: 1, panX: 0, panY: 0 };

function kenBurnsMotion(config: SliderConfig, cw: number, ch: number, timelineT: number): Motion {
  if (!config.kenBurns) return NO_MOTION;
  const t = timelineT < 0 ? 0 : timelineT > 1 ? 1 : timelineT;
  // Zoom in to 110% across the clip with a gentle diagonal drift. The pan stays
  // within the margin the zoom creates, so the image always covers the frame.
  const scale = 1 + 0.1 * t;
  return { scale, panX: -cw * 0.04 * t, panY: -ch * 0.02 * t };
}

function drawCover(
  ctx: Ctx,
  img: RenderImage,
  cw: number,
  ch: number,
  offsetX = 0,
  m: Motion = NO_MOTION,
): void {
  const r = coverRect(img.width, img.height, cw, ch);
  const dw = r.dw * m.scale;
  const dh = r.dh * m.scale;
  // Scale about the canvas centre so the cover crop stays centred, then apply
  // the push offset and Ken-Burns pan.
  const dx = cw / 2 - dw / 2 + offsetX + m.panX;
  const dy = ch / 2 - dh / 2 + m.panY;
  ctx.drawImage(img.source, dx, dy, dw, dh);
}

function drawCoverY(
  ctx: Ctx,
  img: RenderImage,
  cw: number,
  ch: number,
  offsetY: number,
  m: Motion = NO_MOTION,
): void {
  const r = coverRect(img.width, img.height, cw, ch);
  const dw = r.dw * m.scale;
  const dh = r.dh * m.scale;
  const dx = cw / 2 - dw / 2 + m.panX;
  const dy = ch / 2 - dh / 2 + offsetY + m.panY;
  ctx.drawImage(img.source, dx, dy, dw, dh);
}

/**
 * Render a single frame of the slider video into `ctx`.
 *
 * This is the single source of truth for the visual output: the live preview
 * and the offline exporter both call it, so what you see is what you download.
 *
 * @param rawProgress motion progress in [0,1] BEFORE loop/easing are applied.
 * @param timelineT   position across the whole timeline (holds included), used
 *                    for Ken-Burns drift. Defaults to the motion progress.
 */
export function renderFrame(
  ctx: Ctx,
  imageA: RenderImage | null,
  imageB: RenderImage | null,
  rawProgress: number,
  config: SliderConfig,
  timelineT: number = rawProgress,
): void {
  const { width: cw, height: ch } = config;

  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = config.background;
  ctx.fillRect(0, 0, cw, ch);

  const looped = loopProgress(config.loop, rawProgress);
  const eased = applyEasing(config.easing, looped);
  const motion = kenBurnsMotion(config, cw, ch, timelineT);

  switch (config.transition) {
    case 'fade':
      renderFade(ctx, imageA, imageB, eased, cw, ch, motion);
      break;
    case 'push':
      renderPush(ctx, imageA, imageB, eased, config, cw, ch, motion);
      break;
    case 'circle':
      renderCircle(ctx, imageA, imageB, eased, config, cw, ch, motion);
      break;
    case 'diagonal':
      renderDiagonal(ctx, imageA, imageB, eased, config, cw, ch, motion);
      break;
    case 'blinds':
      renderBlinds(ctx, imageA, imageB, eased, config, cw, ch, motion);
      break;
    case 'reveal':
    default:
      renderReveal(ctx, imageA, imageB, eased, config, cw, ch, motion);
      break;
  }
}

function renderFade(
  ctx: Ctx,
  imageA: RenderImage | null,
  imageB: RenderImage | null,
  eased: number,
  cw: number,
  ch: number,
  m: Motion,
): void {
  if (imageA) drawCover(ctx, imageA, cw, ch, 0, m);
  if (imageB) {
    ctx.save();
    ctx.globalAlpha = eased;
    drawCover(ctx, imageB, cw, ch, 0, m);
    ctx.restore();
  }
}

function renderReveal(
  ctx: Ctx,
  imageA: RenderImage | null,
  imageB: RenderImage | null,
  eased: number,
  config: SliderConfig,
  cw: number,
  ch: number,
  m: Motion,
): void {
  const axis = axisOf(config.direction);
  const frac = splitFraction(config.direction, eased);
  const split = axis === 'x' ? frac * cw : frac * ch;

  // Base layer: image A fills the whole frame.
  if (imageA) drawCover(ctx, imageA, cw, ch, 0, m);

  // Reveal layer: image B is clipped to the region the slider has swept past.
  if (imageB) {
    ctx.save();
    ctx.beginPath();
    if (config.direction === 'ltr') ctx.rect(0, 0, split, ch);
    else if (config.direction === 'rtl') ctx.rect(split, 0, cw - split, ch);
    else if (config.direction === 'ttb') ctx.rect(0, 0, cw, split);
    else ctx.rect(0, split, cw, ch - split);
    ctx.clip();
    drawCover(ctx, imageB, cw, ch, 0, m);
    ctx.restore();
  }

  drawDivider(ctx, axis, split, config, cw, ch);
}

function renderPush(
  ctx: Ctx,
  imageA: RenderImage | null,
  imageB: RenderImage | null,
  eased: number,
  config: SliderConfig,
  cw: number,
  ch: number,
  m: Motion,
): void {
  const axis = axisOf(config.direction);
  // Travel direction sign: A exits one way, B enters from the opposite edge.
  const forward = config.direction === 'ltr' || config.direction === 'ttb';
  const dist = axis === 'x' ? cw : ch;
  const offset = eased * dist;

  ctx.save();
  if (axis === 'x') {
    const aShift = forward ? -offset : offset;
    const bShift = forward ? dist - offset : offset - dist;
    if (imageA) drawCover(ctx, imageA, cw, ch, aShift, m);
    if (imageB) drawCover(ctx, imageB, cw, ch, bShift, m);
  } else {
    const aShift = forward ? -offset : offset;
    const bShift = forward ? dist - offset : offset - dist;
    if (imageA) drawCoverY(ctx, imageA, cw, ch, aShift, m);
    if (imageB) drawCoverY(ctx, imageB, cw, ch, bShift, m);
  }
  ctx.restore();
}

function renderCircle(
  ctx: Ctx,
  imageA: RenderImage | null,
  imageB: RenderImage | null,
  eased: number,
  config: SliderConfig,
  cw: number,
  ch: number,
  m: Motion,
): void {
  if (imageA) drawCover(ctx, imageA, cw, ch, 0, m);

  const radius = eased * circleMaxRadius(cw, ch);
  if (imageB && radius > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cw / 2, ch / 2, radius, 0, Math.PI * 2);
    ctx.clip();
    drawCover(ctx, imageB, cw, ch, 0, m);
    ctx.restore();
  }

  // Edge ring along the expanding circle, while it is still inside the frame.
  const lineW = config.line.width;
  if (lineW > 0 && radius > 0 && eased < 1) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cw / 2, ch / 2, radius, 0, Math.PI * 2);
    ctx.lineWidth = lineW;
    ctx.strokeStyle = config.line.color;
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = lineW * 1.5;
    ctx.stroke();
    ctx.restore();
  }
}

function renderDiagonal(
  ctx: Ctx,
  imageA: RenderImage | null,
  imageB: RenderImage | null,
  eased: number,
  config: SliderConfig,
  cw: number,
  ch: number,
  m: Motion,
): void {
  if (imageA) drawCover(ctx, imageA, cw, ch, 0, m);

  const forward = config.direction === 'ltr' || config.direction === 'ttb';
  // Boundary line x + y = k sweeps from the top-left corner (forward) or the
  // bottom-right corner (reverse).
  const k = (forward ? eased : 1 - eased) * (cw + ch);
  const a = forward ? 1 : -1;
  const b = forward ? 1 : -1;
  const c = forward ? k : -k;

  if (imageB) {
    const poly = halfPlanePolygon(cw, ch, a, b, c);
    if (poly.length >= 3) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(poly[0][0], poly[0][1]);
      for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
      ctx.closePath();
      ctx.clip();
      drawCover(ctx, imageB, cw, ch, 0, m);
      ctx.restore();
    }
  }

  // Stroke the diagonal edge while it crosses the frame.
  const lineW = config.line.width;
  if (lineW > 0 && k > 0 && k < cw + ch) {
    const edge = diagonalEdgePoints(k, cw, ch);
    if (edge) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(edge[0][0], edge[0][1]);
      ctx.lineTo(edge[1][0], edge[1][1]);
      ctx.lineWidth = lineW;
      ctx.strokeStyle = config.line.color;
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = lineW * 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }
}

/** The two points where the line x + y = k meets the canvas rectangle. */
function diagonalEdgePoints(k: number, cw: number, ch: number): [[number, number], [number, number]] | null {
  const pts: [number, number][] = [];
  if (k >= 0 && k <= cw) pts.push([k, 0]); // top edge
  if (k >= 0 && k <= ch) pts.push([0, k]); // left edge
  if (k - cw >= 0 && k - cw <= ch) pts.push([cw, k - cw]); // right edge
  if (k - ch >= 0 && k - ch <= cw) pts.push([k - ch, ch]); // bottom edge
  if (pts.length < 2) return null;
  return [pts[0], pts[1]];
}

function renderBlinds(
  ctx: Ctx,
  imageA: RenderImage | null,
  imageB: RenderImage | null,
  eased: number,
  config: SliderConfig,
  cw: number,
  ch: number,
  m: Motion,
): void {
  if (imageA) drawCover(ctx, imageA, cw, ch, 0, m);

  const axis = axisOf(config.direction);
  const forward = config.direction === 'ltr' || config.direction === 'ttb';
  const BAND_COUNT = 6;

  if (imageB && eased > 0) {
    const bands = blindBands(eased, BAND_COUNT, axis === 'x' ? cw : ch, forward);
    ctx.save();
    ctx.beginPath();
    for (const band of bands) {
      if (axis === 'x') ctx.rect(band.start, 0, band.size, ch);
      else ctx.rect(0, band.start, cw, band.size);
    }
    ctx.clip();
    drawCover(ctx, imageB, cw, ch, 0, m);
    ctx.restore();
  }
}

function drawDivider(
  ctx: Ctx,
  axis: 'x' | 'y',
  split: number,
  config: SliderConfig,
  cw: number,
  ch: number,
): void {
  const lineW = config.line.width;
  if (lineW > 0) {
    ctx.save();
    ctx.fillStyle = config.line.color;
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = lineW * 1.5;
    if (axis === 'x') ctx.fillRect(split - lineW / 2, 0, lineW, ch);
    else ctx.fillRect(0, split - lineW / 2, cw, lineW);
    ctx.restore();
  }

  if (!config.handle.enabled || config.handle.icon === 'none') return;

  const hx = axis === 'x' ? split : cw / 2;
  const hy = axis === 'x' ? ch / 2 : split;
  const r = config.handle.radius;

  ctx.save();
  ctx.beginPath();
  ctx.arc(hx, hy, r, 0, Math.PI * 2);
  ctx.fillStyle = config.handle.color;
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = r * 0.6;
  ctx.fill();
  ctx.shadowBlur = 0;

  if (config.handle.icon === 'arrows') {
    drawArrows(ctx, hx, hy, r, axis, config.handle.iconColor);
  } else {
    ctx.beginPath();
    ctx.arc(hx, hy, r * 0.32, 0, Math.PI * 2);
    ctx.fillStyle = config.handle.iconColor;
    ctx.fill();
  }
  ctx.restore();
}

function drawArrows(
  ctx: Ctx,
  cx: number,
  cy: number,
  r: number,
  axis: 'x' | 'y',
  color: string,
): void {
  const a = r * 0.42; // arrow size
  const gap = r * 0.34;
  ctx.fillStyle = color;
  ctx.beginPath();
  if (axis === 'x') {
    // left-pointing triangle
    ctx.moveTo(cx - gap, cy);
    ctx.lineTo(cx - gap + a, cy - a * 0.7);
    ctx.lineTo(cx - gap + a, cy + a * 0.7);
    ctx.closePath();
    // right-pointing triangle
    ctx.moveTo(cx + gap, cy);
    ctx.lineTo(cx + gap - a, cy - a * 0.7);
    ctx.lineTo(cx + gap - a, cy + a * 0.7);
    ctx.closePath();
  } else {
    // up-pointing triangle
    ctx.moveTo(cx, cy - gap);
    ctx.lineTo(cx - a * 0.7, cy - gap + a);
    ctx.lineTo(cx + a * 0.7, cy - gap + a);
    ctx.closePath();
    // down-pointing triangle
    ctx.moveTo(cx, cy + gap);
    ctx.lineTo(cx - a * 0.7, cy + gap - a);
    ctx.lineTo(cx + a * 0.7, cy + gap - a);
    ctx.closePath();
  }
  ctx.fill();
}
