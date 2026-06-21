// Shared domain types for the slider video project.

export type AspectRatioId = '9:16' | '1:1' | '4:5' | '16:9' | '3:4' | '2:3' | 'custom';

export interface AspectRatioPreset {
  id: AspectRatioId;
  label: string;
  /** Short hint of where this format is used. */
  platform: string;
  width: number;
  height: number;
}

export type TransitionId = 'reveal' | 'push' | 'fade';

export type Direction = 'ltr' | 'rtl' | 'ttb' | 'btt';

export type EasingId = 'linear' | 'easeInOut' | 'easeOut' | 'easeInOutCubic';

export type LoopMode = 'none' | 'loop' | 'pingpong';

export type HandleIcon = 'arrows' | 'dot' | 'none';

export interface SliderConfig {
  aspectRatio: AspectRatioId;
  /** Resolved output canvas size in pixels (always even). */
  width: number;
  height: number;
  durationMs: number;
  fps: number;
  transition: TransitionId;
  direction: Direction;
  easing: EasingId;
  loop: LoopMode;
  /** Frames held on image A before the transition starts. */
  holdStartMs: number;
  /** Frames held on image B after the transition ends. */
  holdEndMs: number;
  line: {
    color: string;
    /** Line thickness in pixels at output resolution. */
    width: number;
  };
  handle: {
    enabled: boolean;
    icon: HandleIcon;
    radius: number;
    color: string;
    iconColor: string;
  };
  /** Solid fill drawn behind images (only visible if an image cannot fully cover). */
  background: string;
}

export type ExportStatus = 'idle' | 'preparing' | 'rendering' | 'encoding' | 'done' | 'error';

export interface ExportState {
  status: ExportStatus;
  /** 0..1 progress for the current phase. */
  progress: number;
  outputUrl?: string;
  fileName?: string;
  mimeType?: string;
  error?: string;
}
