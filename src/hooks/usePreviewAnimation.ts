import { useEffect, useRef } from 'react';
import type { ImageTransform, SliderConfig } from '../types/project';
import { DEFAULT_TRANSFORM } from '../lib/presets';
import type { LoadedImage } from '../lib/image/loadImage';
import { renderFrame } from '../lib/render/renderFrame';
import { scaleConfig } from '../lib/render/scaleConfig';
import { buildTimeline, frameProgress, timelinePosition } from '../lib/render/sliderGeometry';

interface Options {
  imageA: LoadedImage | null;
  imageB: LoadedImage | null;
  config: SliderConfig;
  transformA?: ImageTransform;
  transformB?: ImageTransform;
  playing: boolean;
  /** Manual position 0..1 across the full timeline, used while paused. */
  scrubT: number;
  onProgress?: (t: number) => void;
}

/**
 * Drives the live preview canvas with a requestAnimationFrame loop while
 * playing, or paints a single scrubbed frame while paused. Uses the same
 * `renderFrame` as the exporter (via a scaled-down config) for WYSIWYG.
 */
export function usePreviewAnimation(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  {
    imageA,
    imageB,
    config,
    transformA = DEFAULT_TRANSFORM,
    transformB = DEFAULT_TRANSFORM,
    playing,
    scrubT,
    onProgress,
  }: Options,
): void {
  const stateRef = useRef({ playing, scrubT, config, imageA, imageB, transformA, transformB, onProgress });
  stateRef.current = { playing, scrubT, config, imageA, imageB, transformA, transformB, onProgress };

  // Keep the canvas backing store sized to the scaled preview config.
  const preview = scaleConfig(config);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = preview.width;
    canvas.height = preview.height;
  }, [canvasRef, preview.width, preview.height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let startTime = performance.now();

    const draw = (t: number) => {
      const s = stateRef.current;
      const scaled = scaleConfig(s.config);
      const timeline = buildTimeline(
        scaled.durationMs,
        scaled.fps,
        scaled.holdStartMs,
        scaled.holdEndMs,
      );
      let frame: number;
      if (s.playing) {
        const totalMs = (timeline.totalFrames / scaled.fps) * 1000;
        const elapsed = (t - startTime) % totalMs;
        frame = Math.min(timeline.totalFrames - 1, Math.floor((elapsed / totalMs) * timeline.totalFrames));
        s.onProgress?.(frame / (timeline.totalFrames - 1 || 1));
      } else {
        frame = Math.round(s.scrubT * (timeline.totalFrames - 1));
      }
      const raw = frameProgress(frame, timeline);
      renderFrame(
        ctx,
        s.imageA,
        s.imageB,
        raw,
        scaled,
        timelinePosition(frame, timeline),
        s.transformA,
        s.transformB,
      );
    };

    const loop = (t: number) => {
      draw(t);
      raf = requestAnimationFrame(loop);
    };

    // Reset the clock whenever playback (re)starts so it begins from the top.
    startTime = performance.now();
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // Re-create the loop when playback toggles; live values come from stateRef.
  }, [canvasRef, playing]);

  // Repaint immediately on any config/image/scrub change while paused.
  useEffect(() => {
    if (playing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const scaled = scaleConfig(config);
    const timeline = buildTimeline(scaled.durationMs, scaled.fps, scaled.holdStartMs, scaled.holdEndMs);
    const frame = Math.round(scrubT * (timeline.totalFrames - 1));
    renderFrame(
      ctx,
      imageA,
      imageB,
      frameProgress(frame, timeline),
      scaled,
      timelinePosition(frame, timeline),
      transformA,
      transformB,
    );
  }, [canvasRef, playing, scrubT, config, imageA, imageB, transformA, transformB]);
}
