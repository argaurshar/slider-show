import type { SliderConfig } from '../../types/project';
import type { Exporter } from './exporter';
import { webcodecsExporter } from './webcodecsExporter';
import { ffmpegExporter } from './ffmpegExporter';
import { mediaRecorderExporter } from './mediaRecorderExporter';

/**
 * Preference order:
 * 1. WebCodecs H.264 — fast, native MP4 (Chrome/Edge).
 * 2. ffmpeg.wasm — real MP4 everywhere else (Safari/Firefox), slower.
 * 3. MediaRecorder — last-resort WebM if WebAssembly itself is unavailable.
 */
const EXPORTERS: Exporter[] = [webcodecsExporter, ffmpegExporter, mediaRecorderExporter];

/** Return the first exporter that reports support for `config`, or null. */
export async function firstSupported(
  exporters: Exporter[],
  config: SliderConfig,
): Promise<Exporter | null> {
  for (const exporter of exporters) {
    try {
      if (await exporter.isSupported(config)) return exporter;
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function pickExporter(config: SliderConfig): Promise<Exporter | null> {
  return firstSupported(EXPORTERS, config);
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after the click has been handled.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function buildFileName(config: SliderConfig, extension: string): string {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const ratio = config.aspectRatio.replace(':', 'x');
  return `slider-show-${ratio}-${stamp}.${extension}`;
}
