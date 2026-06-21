import { AbortError, type ExportRequest, type ExportResult, type Exporter } from './exporter';

/** Same-origin location of the self-hosted single-thread core (see vite.config.ts). */
const CORE_BASE = `${import.meta.env.BASE_URL}ffmpeg/`;

function canvasToBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Frame encode failed.'));
        blob.arrayBuffer().then((b) => resolve(new Uint8Array(b))).catch(reject);
      },
      'image/jpeg',
      0.92,
    );
  });
}

/**
 * MP4 fallback for browsers without WebCodecs H.264 encode (Safari, Firefox).
 * Renders frames to JPEGs and encodes them to H.264 MP4 with ffmpeg.wasm. The
 * core is loaded lazily and from the same origin, so nothing downloads until a
 * user on such a browser actually exports.
 */
export const ffmpegExporter: Exporter = {
  id: 'ffmpeg-mp4',
  mimeType: 'video/mp4',
  fileExtension: 'mp4',

  async isSupported(): Promise<boolean> {
    // The single-thread core only needs WebAssembly and a DOM canvas; ordering
    // in pickExporter ensures this runs only when WebCodecs H.264 is missing.
    return typeof WebAssembly !== 'undefined' && typeof document !== 'undefined';
  },

  async export({ config, totalFrames, drawFrame, onProgress, signal }: ExportRequest): Promise<ExportResult> {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { toBlobURL } = await import('@ffmpeg/util');

    const ffmpeg = new FFmpeg();
    if (import.meta.env.DEV) {
      ffmpeg.on('log', ({ message }: { message: string }) => console.debug('[ffmpeg]', message));
    }
    // ffmpeg reports 0..1 during the encode; map it to the second half of the bar.
    ffmpeg.on('progress', ({ progress }: { progress: number }) => {
      const clamped = progress < 0 ? 0 : progress > 1 ? 1 : progress;
      onProgress({ phase: 'encoding', value: 0.5 + clamped * 0.5 });
    });

    if (import.meta.env.DEV) console.debug('[ffmpeg] loading core…');
    await ffmpeg.load({
      coreURL: await toBlobURL(`${CORE_BASE}ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${CORE_BASE}ffmpeg-core.wasm`, 'application/wasm'),
    });
    if (import.meta.env.DEV) console.debug('[ffmpeg] core loaded');

    const canvas = document.createElement('canvas');
    canvas.width = config.width;
    canvas.height = config.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create rendering context.');

    try {
      // Phase 1: render every frame to a JPEG in the wasm filesystem (0..0.5).
      for (let i = 0; i < totalFrames; i++) {
        if (signal.aborted) throw new AbortError();
        drawFrame(ctx, i, totalFrames);
        const bytes = await canvasToBytes(canvas);
        await ffmpeg.writeFile(`f${String(i).padStart(5, '0')}.jpg`, bytes);
        onProgress({ phase: 'rendering', value: ((i + 1) / totalFrames) * 0.5 });
      }
      if (signal.aborted) throw new AbortError();

      // Phase 2: encode the JPEG sequence to H.264 MP4 (0.5..1 via progress).
      await ffmpeg.exec([
        '-framerate', String(config.fps),
        '-start_number', '0',
        '-i', 'f%05d.jpg',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '22',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        'out.mp4',
      ]);

      const data = await ffmpeg.readFile('out.mp4');
      onProgress({ phase: 'encoding', value: 1 });
      // readFile returns Uint8Array (possibly SharedArrayBuffer-backed) or a
      // string; copy bytes into a plain ArrayBuffer-backed view for the Blob.
      const part: BlobPart = typeof data === 'string' ? data : new Uint8Array(data);
      return {
        blob: new Blob([part], { type: 'video/mp4' }),
        mimeType: 'video/mp4',
        fileExtension: 'mp4',
      };
    } finally {
      try {
        ffmpeg.terminate();
      } catch {
        /* already gone */
      }
    }
  },
};
