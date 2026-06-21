import type { SliderConfig } from '../../types/project';

export type ExportPhase = 'rendering' | 'encoding';

export interface ExportProgress {
  phase: ExportPhase;
  /** 0..1 within the overall export. */
  value: number;
}

/**
 * Draws frame `frameIndex` of `total` into the provided canvas context.
 * Implemented by the caller so the exporter stays decoupled from rendering.
 */
export type DrawFrame = (
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  frameIndex: number,
  total: number,
) => void;

export interface ExportRequest {
  config: SliderConfig;
  totalFrames: number;
  drawFrame: DrawFrame;
  onProgress: (p: ExportProgress) => void;
  signal: AbortSignal;
}

export interface ExportResult {
  blob: Blob;
  mimeType: string;
  fileExtension: string;
}

export interface Exporter {
  readonly id: string;
  readonly mimeType: string;
  readonly fileExtension: string;
  isSupported(config: SliderConfig): Promise<boolean>;
  export(request: ExportRequest): Promise<ExportResult>;
}

export class AbortError extends Error {
  constructor() {
    super('Export cancelled.');
    this.name = 'AbortError';
  }
}

export function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new AbortError();
}
