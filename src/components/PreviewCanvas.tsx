import { useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { useProjectStore } from '../state/useProjectStore';
import { usePreviewAnimation } from '../hooks/usePreviewAnimation';
import { cn } from '../lib/cn';

export function PreviewCanvas() {
  const { imageA, imageB, config } = useProjectStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(true);
  const [scrubT, setScrubT] = useState(0.5);

  usePreviewAnimation(canvasRef, {
    imageA,
    imageB,
    config,
    playing,
    scrubT,
    onProgress: (t) => setScrubT(t),
  });

  const empty = !imageA && !imageB;
  const aspect = `${config.width} / ${config.height}`;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div
        className="relative flex max-h-[62vh] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-2xl"
        style={{ aspectRatio: aspect, maxWidth: '100%' }}
      >
        <canvas ref={canvasRef} className="h-full w-full" style={{ aspectRatio: aspect }} />
        {empty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-white/40">
            <p className="text-sm">Add two images to preview</p>
            <p className="text-xs">your slider video appears here</p>
          </div>
        )}
      </div>

      <div className="flex w-full max-w-md items-center gap-3">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition',
            'bg-brand-500 text-white hover:bg-brand-600',
          )}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={scrubT}
          onChange={(e) => {
            setPlaying(false);
            setScrubT(Number(e.target.value));
          }}
          aria-label="Scrub timeline"
        />
      </div>
    </div>
  );
}
