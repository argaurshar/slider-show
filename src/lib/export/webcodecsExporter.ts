import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import type { SliderConfig } from '../../types/project';
import {
  AbortError,
  throwIfAborted,
  type ExportRequest,
  type ExportResult,
  type Exporter,
} from './exporter';

// WebCodecs is not in every TS lib target, so we reach the constructors through
// globalThis and describe only the surface we use. This also avoids redeclaring
// globals that newer lib.dom versions already provide.
interface VideoFrameLike {
  close(): void;
}
interface VideoEncoderLike {
  readonly encodeQueueSize: number;
  configure(config: unknown): void;
  encode(frame: VideoFrameLike, options?: { keyFrame?: boolean }): void;
  flush(): Promise<void>;
  close(): void;
}
type VideoEncoderCtor = {
  new (init: {
    output: (chunk: unknown, meta: unknown) => void;
    error: (e: DOMException) => void;
  }): VideoEncoderLike;
  isConfigSupported(config: unknown): Promise<{ supported?: boolean }>;
};
type VideoFrameCtor = {
  new (source: CanvasImageSource, init: { timestamp: number; duration?: number }): VideoFrameLike;
};

function getCtors(): { VideoEncoder?: VideoEncoderCtor; VideoFrame?: VideoFrameCtor } {
  const g = globalThis as unknown as {
    VideoEncoder?: VideoEncoderCtor;
    VideoFrame?: VideoFrameCtor;
  };
  return { VideoEncoder: g.VideoEncoder, VideoFrame: g.VideoFrame };
}

// Candidate H.264 levels, most capable first. We probe each at runtime.
const CODEC_CANDIDATES = ['avc1.640028', 'avc1.4d0028', 'avc1.42001f'];

async function pickCodec(width: number, height: number, fps: number): Promise<string | null> {
  const { VideoEncoder } = getCtors();
  if (!VideoEncoder) return null;
  for (const codec of CODEC_CANDIDATES) {
    try {
      const res = await VideoEncoder.isConfigSupported({
        codec,
        width,
        height,
        framerate: fps,
        bitrate: bitrateFor(width, height),
      });
      if (res?.supported) return codec;
    } catch {
      /* try next */
    }
  }
  return null;
}

function bitrateFor(width: number, height: number): number {
  // ~0.1 bits per pixel per frame at 30fps, clamped to a sane range.
  const pixels = width * height;
  return Math.min(16_000_000, Math.max(4_000_000, Math.round(pixels * 1.6)));
}

async function waitForDrain(encoder: VideoEncoderLike): Promise<void> {
  while (encoder.encodeQueueSize > 8) {
    await new Promise((r) => setTimeout(r, 0));
  }
}

export const webcodecsExporter: Exporter = {
  id: 'webcodecs-mp4',
  mimeType: 'video/mp4',
  fileExtension: 'mp4',

  async isSupported(config: SliderConfig): Promise<boolean> {
    const { VideoEncoder, VideoFrame } = getCtors();
    if (!VideoEncoder || !VideoFrame) return false;
    const codec = await pickCodec(config.width, config.height, config.fps);
    return codec !== null;
  },

  async export({
    config,
    totalFrames,
    drawFrame,
    onProgress,
    signal,
  }: ExportRequest): Promise<ExportResult> {
    const { VideoEncoder, VideoFrame } = getCtors();
    if (!VideoEncoder || !VideoFrame) throw new Error('WebCodecs unavailable.');

    const codec = await pickCodec(config.width, config.height, config.fps);
    if (!codec) throw new Error('No supported H.264 codec.');

    const canvas = new OffscreenCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create rendering context.');

    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: 'avc', width: config.width, height: config.height },
      fastStart: 'in-memory',
    });

    let encodeError: Error | null = null;
    const encoder = new VideoEncoder({
      output: (chunk, meta) => {
        // mp4-muxer accepts the native EncodedVideoChunk + metadata directly.
        (muxer as unknown as { addVideoChunk: (c: unknown, m: unknown) => void }).addVideoChunk(
          chunk,
          meta,
        );
      },
      error: (e) => {
        encodeError = new Error(e.message);
      },
    });

    encoder.configure({
      codec,
      width: config.width,
      height: config.height,
      framerate: config.fps,
      bitrate: bitrateFor(config.width, config.height),
      latencyMode: 'quality',
    });

    const frameDuration = 1_000_000 / config.fps; // microseconds
    const keyEvery = config.fps * 2; // a keyframe roughly every 2 seconds

    try {
      for (let i = 0; i < totalFrames; i++) {
        if (signal.aborted) throw new AbortError();
        if (encodeError) throw encodeError;

        drawFrame(ctx, i, totalFrames);
        const frame = new VideoFrame(canvas, {
          timestamp: Math.round(i * frameDuration),
          duration: Math.round(frameDuration),
        });
        encoder.encode(frame, { keyFrame: i % keyEvery === 0 });
        frame.close();

        await waitForDrain(encoder);
        onProgress({ phase: 'rendering', value: (i + 1) / totalFrames });
      }

      onProgress({ phase: 'encoding', value: 1 });
      await encoder.flush();
      if (encodeError) throw encodeError;
      muxer.finalize();

      const { buffer } = muxer.target as ArrayBufferTarget;
      return {
        blob: new Blob([buffer], { type: 'video/mp4' }),
        mimeType: 'video/mp4',
        fileExtension: 'mp4',
      };
    } finally {
      try {
        encoder.close();
      } catch {
        /* already closed */
      }
    }
  },
};

export { throwIfAborted };
