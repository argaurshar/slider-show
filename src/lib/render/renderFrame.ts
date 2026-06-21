import type { SliderConfig } from '../../types/project';
import { coverRect } from '../image/coverRect';
import { applyEasing } from './easing';
import { axisOf, loopProgress, splitFraction } from './sliderGeometry';

/** Anything we can hand to ctx.drawImage that also exposes intrinsic size. */
export interface RenderImage {
  source: CanvasImageSource;
  width: number;
  height: number;
}

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function drawCover(ctx: Ctx, img: RenderImage, cw: number, ch: number, offsetX = 0): void {
  const r = coverRect(img.width, img.height, cw, ch);
  ctx.drawImage(img.source, r.dx + offsetX, r.dy, r.dw, r.dh);
}

/**
 * Render a single frame of the slider video into `ctx`.
 *
 * This is the single source of truth for the visual output: the live preview
 * and the offline exporter both call it, so what you see is what you download.
 *
 * @param rawProgress motion progress in [0,1] BEFORE loop/easing are applied.
 */
export function renderFrame(
  ctx: Ctx,
  imageA: RenderImage | null,
  imageB: RenderImage | null,
  rawProgress: number,
  config: SliderConfig,
): void {
  const { width: cw, height: ch } = config;

  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = config.background;
  ctx.fillRect(0, 0, cw, ch);

  const looped = loopProgress(config.loop, rawProgress);
  const eased = applyEasing(config.easing, looped);

  switch (config.transition) {
    case 'fade':
      renderFade(ctx, imageA, imageB, eased, cw, ch);
      break;
    case 'push':
      renderPush(ctx, imageA, imageB, eased, config, cw, ch);
      break;
    case 'reveal':
    default:
      renderReveal(ctx, imageA, imageB, eased, config, cw, ch);
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
): void {
  if (imageA) drawCover(ctx, imageA, cw, ch);
  if (imageB) {
    ctx.save();
    ctx.globalAlpha = eased;
    drawCover(ctx, imageB, cw, ch);
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
): void {
  const axis = axisOf(config.direction);
  const frac = splitFraction(config.direction, eased);
  const split = axis === 'x' ? frac * cw : frac * ch;

  // Base layer: image A fills the whole frame.
  if (imageA) drawCover(ctx, imageA, cw, ch);

  // Reveal layer: image B is clipped to the region the slider has swept past.
  if (imageB) {
    ctx.save();
    ctx.beginPath();
    if (config.direction === 'ltr') ctx.rect(0, 0, split, ch);
    else if (config.direction === 'rtl') ctx.rect(split, 0, cw - split, ch);
    else if (config.direction === 'ttb') ctx.rect(0, 0, cw, split);
    else ctx.rect(0, split, cw, ch - split);
    ctx.clip();
    drawCover(ctx, imageB, cw, ch);
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
    if (imageA) drawCover(ctx, imageA, cw, ch, aShift);
    if (imageB) drawCover(ctx, imageB, cw, ch, bShift);
  } else {
    const aShift = forward ? -offset : offset;
    const bShift = forward ? dist - offset : offset - dist;
    if (imageA) drawCoverY(ctx, imageA, cw, ch, aShift);
    if (imageB) drawCoverY(ctx, imageB, cw, ch, bShift);
  }
  ctx.restore();
}

function drawCoverY(ctx: Ctx, img: RenderImage, cw: number, ch: number, offsetY: number): void {
  const r = coverRect(img.width, img.height, cw, ch);
  ctx.drawImage(img.source, r.dx, r.dy + offsetY, r.dw, r.dh);
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
