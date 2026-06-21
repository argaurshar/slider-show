import type { SliderConfig } from '../../types/project';
import type { Exporter } from './exporter';
import { webcodecsExporter } from './webcodecsExporter';
import { mediaRecorderExporter } from './mediaRecorderExporter';

/** Preference order: true MP4 via WebCodecs, then a WebM MediaRecorder fallback. */
const EXPORTERS: Exporter[] = [webcodecsExporter, mediaRecorderExporter];

export async function pickExporter(config: SliderConfig): Promise<Exporter | null> {
  for (const exporter of EXPORTERS) {
    try {
      if (await exporter.isSupported(config)) return exporter;
    } catch {
      /* try next */
    }
  }
  return null;
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
