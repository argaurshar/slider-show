import { describe, it, expect } from 'vitest';
import { firstSupported } from '../src/lib/export/pickExporter';
import type { Exporter } from '../src/lib/export/exporter';
import { DEFAULT_CONFIG } from '../src/lib/presets';

function stub(id: string, supported: boolean | (() => Promise<boolean>)): Exporter {
  return {
    id,
    mimeType: 'video/mp4',
    fileExtension: 'mp4',
    isSupported: async () =>
      typeof supported === 'function' ? supported() : supported,
    export: async () => {
      throw new Error('not used');
    },
  };
}

describe('firstSupported', () => {
  it('returns the first exporter that reports support', async () => {
    const a = stub('a', false);
    const b = stub('b', true);
    const c = stub('c', true);
    const pick = await firstSupported([a, b, c], DEFAULT_CONFIG);
    expect(pick?.id).toBe('b');
  });

  it('prefers WebCodecs, then ffmpeg, then MediaRecorder', async () => {
    const webcodecs = stub('webcodecs', false);
    const ffmpeg = stub('ffmpeg', true);
    const media = stub('media', true);
    const pick = await firstSupported([webcodecs, ffmpeg, media], DEFAULT_CONFIG);
    expect(pick?.id).toBe('ffmpeg'); // MP4 fallback wins over WebM
  });

  it('skips exporters whose isSupported throws', async () => {
    const boom = stub('boom', () => Promise.reject(new Error('nope')));
    const ok = stub('ok', true);
    const pick = await firstSupported([boom, ok], DEFAULT_CONFIG);
    expect(pick?.id).toBe('ok');
  });

  it('returns null when nothing is supported', async () => {
    const pick = await firstSupported([stub('a', false), stub('b', false)], DEFAULT_CONFIG);
    expect(pick).toBeNull();
  });
});
