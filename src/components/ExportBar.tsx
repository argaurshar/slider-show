import { Download, Loader2, Video, X } from 'lucide-react';
import { useProjectStore } from '../state/useProjectStore';
import { downloadBlob } from '../lib/export/pickExporter';
import { cn } from '../lib/cn';

const PHASE_LABEL: Record<string, string> = {
  preparing: 'Preparing…',
  rendering: 'Rendering frames…',
  encoding: 'Finalizing video…',
};

export function ExportBar() {
  const { imageA, imageB, config, export: ex, startExport, cancelExport, resetExport } =
    useProjectStore();
  const ready = !!imageA && !!imageB;
  const busy = ex.status === 'preparing' || ex.status === 'rendering' || ex.status === 'encoding';

  const pct = Math.round(ex.progress * 100);
  const estFrames = Math.round(
    ((config.durationMs + config.holdStartMs + config.holdEndMs) / 1000) * config.fps,
  );

  return (
    <div className="space-y-3">
      {ex.status === 'done' && ex.outputUrl ? (
        <div className="space-y-3 rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-3">
          <video
            src={ex.outputUrl}
            controls
            loop
            className="max-h-64 w-full rounded-lg bg-black"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => ex.fileName && downloadFromUrl(ex)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              <Download size={16} /> Download again
            </button>
            <button
              type="button"
              onClick={resetExport}
              className="rounded-lg border border-white/15 px-3 text-sm text-white/70 transition hover:text-white"
            >
              New
            </button>
          </div>
          {ex.mimeType?.includes('webm') && (
            <p className="text-[11px] leading-snug text-amber-300/80">
              Saved as WebM (your browser can't make MP4). It won't play on iPhone — open
              this site in Chrome or Edge for an MP4.
            </p>
          )}
        </div>
      ) : busy ? (
        <div className="space-y-2 rounded-xl border border-white/10 bg-ink-800 p-3">
          <div className="flex items-center justify-between text-sm text-white/80">
            <span className="flex items-center gap-2">
              <Loader2 size={15} className="animate-spin text-brand-400" />
              {PHASE_LABEL[ex.status] ?? 'Working…'}
            </span>
            <button
              type="button"
              onClick={cancelExport}
              className="text-white/50 transition hover:text-white"
              aria-label="Cancel export"
            >
              <X size={16} />
            </button>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink-600">
            <div
              className="h-full rounded-full bg-brand-500 transition-[width]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={startExport}
            disabled={!ready}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition',
              ready
                ? 'bg-brand-500 text-white shadow-glow hover:bg-brand-600'
                : 'cursor-not-allowed bg-ink-700 text-white/40',
            )}
          >
            <Video size={17} /> Generate video
          </button>
          <p className="text-center text-[11px] text-white/40">
            {ready
              ? `${config.width}×${config.height} · ~${estFrames} frames · MP4`
              : 'Add a before and after image to start'}
          </p>
          {ex.status === 'error' && (
            <p className="text-center text-xs text-red-400">{ex.error}</p>
          )}
        </>
      )}
    </div>
  );
}

function downloadFromUrl(ex: { outputUrl?: string; fileName?: string }) {
  if (!ex.outputUrl || !ex.fileName) return;
  fetch(ex.outputUrl)
    .then((r) => r.blob())
    .then((blob) => downloadBlob(blob, ex.fileName as string));
}
