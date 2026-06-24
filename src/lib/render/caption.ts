import type { CaptionConfig } from '../../types/project';

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Font stack shared by preview and export so they measure identically. */
const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/** Margin from the frame edge, as a fraction of the canvas height. */
const EDGE_MARGIN = 0.07;

export interface CaptionLayout {
  lines: string[];
  fontPx: number;
  /** Horizontal centre. */
  x: number;
  /** Baseline anchor for the block (top of first line / middle / bottom of last). */
  y: number;
  marginY: number;
}

/**
 * Pure layout for the caption: returns null when there is nothing to draw,
 * otherwise the font size, lines and anchor position. Resolution-independent —
 * `sizePct`/margins are fractions of the canvas height.
 */
export function captionLayout(caption: CaptionConfig, cw: number, ch: number): CaptionLayout | null {
  const text = caption.text.trim();
  if (!text || cw <= 0 || ch <= 0) return null;
  const lines = caption.text.split('\n').map((l) => l.trim());
  const fontPx = Math.max(1, Math.round(caption.sizePct * ch));
  const marginY = ch * EDGE_MARGIN;
  let y: number;
  if (caption.position === 'top') y = marginY;
  else if (caption.position === 'center') y = ch / 2;
  else y = ch - marginY;
  return { lines, fontPx, x: cw / 2, y, marginY };
}

/** Draw the caption overlay (translucent backing bar + centred text). */
export function drawCaption(ctx: Ctx, caption: CaptionConfig, cw: number, ch: number): void {
  const layout = captionLayout(caption, cw, ch);
  if (!layout) return;
  const { lines, x, y, position } = { ...layout, position: caption.position };

  let fontPx = layout.fontPx;
  ctx.save();
  // Shrink to fit so a long single line never runs off the frame.
  const maxWidth = cw * 0.9;
  ctx.font = `600 ${fontPx}px ${FONT_STACK}`;
  const widest = () => Math.max(...lines.map((l) => ctx.measureText(l).width));
  if (widest() > maxWidth) {
    fontPx = Math.max(1, Math.floor((fontPx * maxWidth) / widest()));
    ctx.font = `600 ${fontPx}px ${FONT_STACK}`;
  }

  const lineH = fontPx * 1.25;
  const blockH = lineH * lines.length;
  // Resolve the block's top edge from the anchor + vertical alignment.
  let top: number;
  if (position === 'top') top = y;
  else if (position === 'center') top = y - blockH / 2;
  else top = y - blockH;

  if (caption.background) {
    const padX = fontPx * 0.5;
    const padY = fontPx * 0.3;
    const bw = Math.min(cw, widest() + padX * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    const bx = x - bw / 2;
    const by = top - padY;
    const bh = blockH + padY * 2;
    const r = Math.min(fontPx * 0.4, bh / 2);
    roundRect(ctx, bx, by, bw, bh, r);
    ctx.fill();
  }

  ctx.fillStyle = caption.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  if (!caption.background) {
    // Drop shadow for legibility when there is no backing bar.
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = fontPx * 0.25;
    ctx.shadowOffsetY = fontPx * 0.04;
  }
  lines.forEach((line, i) => {
    ctx.fillText(line, x, top + i * lineH + (lineH - fontPx) / 2);
  });
  ctx.restore();
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
