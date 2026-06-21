import { AbortError, type ExportRequest, type ExportResult, type Exporter } from './exporter';

// Ordered by preference. VP9 gives the best quality where supported.
const MIME_CANDIDATES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4',
];

function pickMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const mime of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return null;
}

/**
 * Real-time fallback: paints frames onto a canvas at wall-clock pace and records
 * the captured stream. Used only when WebCodecs H.264 encode is unavailable.
 * Output is usually WebM, which the UI flags (iOS Safari cannot play it).
 */
export const mediaRecorderExporter: Exporter = {
  id: 'media-recorder',
  get mimeType() {
    return pickMime() ?? 'video/webm';
  },
  get fileExtension() {
    return (pickMime() ?? '').includes('mp4') ? 'mp4' : 'webm';
  },

  async isSupported(): Promise<boolean> {
    return (
      typeof MediaRecorder !== 'undefined' &&
      typeof HTMLCanvasElement.prototype.captureStream === 'function' &&
      pickMime() !== null
    );
  },

  async export({
    config,
    totalFrames,
    drawFrame,
    onProgress,
    signal,
  }: ExportRequest): Promise<ExportResult> {
    const mime = pickMime();
    if (!mime) throw new Error('MediaRecorder is not available.');

    const canvas = document.createElement('canvas');
    canvas.width = config.width;
    canvas.height = config.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create rendering context.');

    const fps = config.fps;
    const stream = canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: Math.min(16_000_000, config.width * config.height * 2),
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const fileExtension = mime.includes('mp4') ? 'mp4' : 'webm';

    return new Promise<ExportResult>((resolve, reject) => {
      let rafId = 0;
      const start = performance.now();
      const durationMs = (totalFrames / fps) * 1000;

      const cleanup = () => cancelAnimationFrame(rafId);

      recorder.onstop = () => {
        cleanup();
        resolve({
          blob: new Blob(chunks, { type: mime }),
          mimeType: mime,
          fileExtension,
        });
      };
      recorder.onerror = () => {
        cleanup();
        reject(new Error('Recording failed.'));
      };

      const tick = () => {
        if (signal.aborted) {
          cleanup();
          try {
            recorder.stop();
          } catch {
            /* noop */
          }
          reject(new AbortError());
          return;
        }
        const elapsed = performance.now() - start;
        const frame = Math.min(totalFrames - 1, Math.floor((elapsed / durationMs) * totalFrames));
        drawFrame(ctx, frame, totalFrames);
        onProgress({ phase: 'rendering', value: Math.min(1, elapsed / durationMs) });

        if (elapsed >= durationMs) {
          // Draw the final frame, then give the recorder a beat to flush it.
          drawFrame(ctx, totalFrames - 1, totalFrames);
          onProgress({ phase: 'encoding', value: 1 });
          setTimeout(() => {
            try {
              recorder.stop();
            } catch {
              /* noop */
            }
          }, 1000 / fps);
          return;
        }
        rafId = requestAnimationFrame(tick);
      };

      recorder.start();
      rafId = requestAnimationFrame(tick);
    });
  },
};
