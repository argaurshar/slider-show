import type { RenderImage } from '../render/renderFrame';

/** Largest edge we keep for source bitmaps — bounds memory and draw cost. */
const MAX_EDGE = 2160;

export interface LoadedImage extends RenderImage {
  /** Object URL for showing a thumbnail in the UI. Revoke when discarded. */
  previewUrl: string;
  fileName: string;
}

async function decodeBitmap(file: File): Promise<ImageBitmap> {
  // `imageOrientation: 'from-image'` bakes EXIF rotation into the pixels so
  // phone photos appear upright on the canvas.
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Older browsers may reject the options bag; fall back to a plain decode.
    return await createImageBitmap(file);
  }
}

function downscale(bitmap: ImageBitmap): ImageBitmap | Promise<ImageBitmap> {
  const longest = Math.max(bitmap.width, bitmap.height);
  if (longest <= MAX_EDGE) return bitmap;
  const scale = MAX_EDGE / longest;
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return bitmap;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const resized = createImageBitmap(canvas);
  bitmap.close();
  return resized;
}

export async function loadImage(file: File): Promise<LoadedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }
  const decoded = await decodeBitmap(file);
  const bitmap = await downscale(decoded);
  return {
    source: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    previewUrl: URL.createObjectURL(file),
    fileName: file.name,
  };
}

export function disposeImage(img: LoadedImage | null): void {
  if (!img) return;
  if (img.source instanceof ImageBitmap) img.source.close();
  URL.revokeObjectURL(img.previewUrl);
}
