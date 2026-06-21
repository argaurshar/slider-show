import { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { loadImage, type LoadedImage } from '../lib/image/loadImage';

interface Props {
  slot: 'A' | 'B';
  badge: string;
  image: LoadedImage | null;
  onLoaded: (image: LoadedImage) => void;
  onClear: () => void;
}

export function ImageUploader({ slot, badge, image, onLoaded, onClear }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    setError(null);
    try {
      const loaded = await loadImage(file);
      onLoaded(loaded);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load image.');
    }
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          'group relative flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed transition',
          dragging
            ? 'border-brand-400 bg-brand-500/10'
            : 'border-white/15 bg-ink-800 hover:border-white/30',
        )}
      >
        {image ? (
          <>
            <img
              src={image.previewUrl}
              alt={`Image ${slot}`}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white/80 opacity-0 transition group-hover:opacity-100 hover:text-white"
              aria-label={`Remove image ${slot}`}
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-white/45">
            <ImagePlus size={22} />
            <span className="text-xs">Drop or click</span>
          </div>
        )}
        <span className="absolute left-1.5 top-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
          {badge}
        </span>
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
