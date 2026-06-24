import { create } from 'zustand';
import type { AspectRatioId, ExportState, ImageTransform, SliderConfig } from '../types/project';
import { DEFAULT_TRANSFORM, getPreset, toEven } from '../lib/presets';
import { disposeImage, type LoadedImage } from '../lib/image/loadImage';
import { renderFrame } from '../lib/render/renderFrame';
import { buildTimeline, frameProgress, timelinePosition } from '../lib/render/sliderGeometry';
import { pickExporter, downloadBlob, buildFileName } from '../lib/export/pickExporter';
import { loadInitialConfig, persistConfig } from '../lib/settings/shareConfig';

interface ProjectState {
  imageA: LoadedImage | null;
  imageB: LoadedImage | null;
  transformA: ImageTransform;
  transformB: ImageTransform;
  config: SliderConfig;
  export: ExportState;
  abortController: AbortController | null;

  setImage: (slot: 'A' | 'B', image: LoadedImage) => void;
  clearImage: (slot: 'A' | 'B') => void;
  swapImages: () => void;
  updateTransform: (slot: 'A' | 'B', patch: Partial<ImageTransform>) => void;
  resetTransform: (slot: 'A' | 'B') => void;
  updateConfig: (patch: Partial<SliderConfig>) => void;
  setAspectRatio: (id: AspectRatioId, custom?: { width: number; height: number }) => void;
  startExport: () => Promise<void>;
  cancelExport: () => void;
  resetExport: () => void;
}

const idleExport: ExportState = { status: 'idle', progress: 0 };

export const useProjectStore = create<ProjectState>((set, get) => ({
  imageA: null,
  imageB: null,
  transformA: { ...DEFAULT_TRANSFORM },
  transformB: { ...DEFAULT_TRANSFORM },
  config: loadInitialConfig(),
  export: idleExport,
  abortController: null,

  setImage: (slot, image) => {
    const key = slot === 'A' ? 'imageA' : 'imageB';
    const tKey = slot === 'A' ? 'transformA' : 'transformB';
    const previous = get()[key];
    if (previous) disposeImage(previous);
    // Reset framing for the new image.
    set({ [key]: image, [tKey]: { ...DEFAULT_TRANSFORM } } as Pick<
      ProjectState,
      'imageA' | 'imageB' | 'transformA' | 'transformB'
    >);
  },

  clearImage: (slot) => {
    const key = slot === 'A' ? 'imageA' : 'imageB';
    const tKey = slot === 'A' ? 'transformA' : 'transformB';
    const previous = get()[key];
    if (previous) disposeImage(previous);
    set({ [key]: null, [tKey]: { ...DEFAULT_TRANSFORM } } as Pick<
      ProjectState,
      'imageA' | 'imageB' | 'transformA' | 'transformB'
    >);
  },

  swapImages: () =>
    set((s) => ({
      imageA: s.imageB,
      imageB: s.imageA,
      transformA: s.transformB,
      transformB: s.transformA,
    })),

  updateTransform: (slot, patch) =>
    set((s) => {
      const tKey = slot === 'A' ? 'transformA' : 'transformB';
      return { [tKey]: { ...s[tKey], ...patch } } as Pick<ProjectState, 'transformA' | 'transformB'>;
    }),

  resetTransform: (slot) =>
    set(
      () =>
        ({ [slot === 'A' ? 'transformA' : 'transformB']: { ...DEFAULT_TRANSFORM } }) as Pick<
          ProjectState,
          'transformA' | 'transformB'
        >,
    ),

  updateConfig: (patch) => {
    set((s) => ({ config: { ...s.config, ...patch } }));
    persistConfig(get().config);
  },

  setAspectRatio: (id, custom) => {
    set((s) => {
      if (id === 'custom' && custom) {
        return {
          config: {
            ...s.config,
            aspectRatio: 'custom',
            width: toEven(custom.width),
            height: toEven(custom.height),
          },
        };
      }
      const preset = getPreset(id);
      if (!preset) return s;
      return {
        config: {
          ...s.config,
          aspectRatio: id,
          width: toEven(preset.width),
          height: toEven(preset.height),
        },
      };
    });
    persistConfig(get().config);
  },

  startExport: async () => {
    const { imageA, imageB, config, transformA, transformB } = get();
    if (!imageA || !imageB) {
      set({ export: { status: 'error', progress: 0, error: 'Add both images first.' } });
      return;
    }

    set({ export: { status: 'preparing', progress: 0 } });

    const exporter = await pickExporter(config);
    if (!exporter) {
      set({
        export: {
          status: 'error',
          progress: 0,
          error: 'Your browser cannot export video. Try the latest Chrome or Edge.',
        },
      });
      return;
    }

    const timeline = buildTimeline(
      config.durationMs,
      config.fps,
      config.holdStartMs,
      config.holdEndMs,
    );

    const controller = new AbortController();
    set({ abortController: controller, export: { status: 'rendering', progress: 0 } });

    const drawFrame = (
      ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
      frameIndex: number,
    ) => {
      const raw = frameProgress(frameIndex, timeline);
      renderFrame(
        ctx,
        imageA,
        imageB,
        raw,
        config,
        timelinePosition(frameIndex, timeline),
        transformA,
        transformB,
      );
    };

    try {
      const result = await exporter.export({
        config,
        totalFrames: timeline.totalFrames,
        drawFrame,
        onProgress: (p) => {
          set({
            export: {
              status: p.phase === 'encoding' ? 'encoding' : 'rendering',
              progress: p.value,
            },
          });
        },
        signal: controller.signal,
      });

      const fileName = buildFileName(config, result.fileExtension);
      const outputUrl = URL.createObjectURL(result.blob);
      set({
        abortController: null,
        export: {
          status: 'done',
          progress: 1,
          outputUrl,
          fileName,
          mimeType: result.mimeType,
        },
      });
      downloadBlob(result.blob, fileName);
    } catch (err) {
      console.error('[export]', err);
      const message = err instanceof Error ? err.message : 'Export failed.';
      const aborted = err instanceof Error && err.name === 'AbortError';
      set({
        abortController: null,
        export: aborted ? idleExport : { status: 'error', progress: 0, error: message },
      });
    }
  },

  cancelExport: () => {
    const { abortController } = get();
    abortController?.abort();
    set({ abortController: null, export: idleExport });
  },

  resetExport: () => {
    const url = get().export.outputUrl;
    if (url) URL.revokeObjectURL(url);
    set({ export: idleExport });
  },
}));
