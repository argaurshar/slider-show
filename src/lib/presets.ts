import type { AspectRatioId, AspectRatioPreset, SliderConfig } from '../types/project';

/**
 * Social-media format presets. Dimensions are chosen at a 1080px short edge,
 * a safe export resolution that every target platform accepts.
 */
export const ASPECT_PRESETS: AspectRatioPreset[] = [
  { id: '9:16', label: '9 : 16', platform: 'Reels / TikTok / Stories', width: 1080, height: 1920 },
  { id: '1:1', label: '1 : 1', platform: 'Instagram feed (square)', width: 1080, height: 1080 },
  { id: '4:5', label: '4 : 5', platform: 'Instagram portrait', width: 1080, height: 1350 },
  { id: '16:9', label: '16 : 9', platform: 'YouTube / landscape', width: 1920, height: 1080 },
  { id: '3:4', label: '3 : 4', platform: 'Classic portrait', width: 1080, height: 1440 },
  { id: '2:3', label: '2 : 3', platform: 'Pinterest / print', width: 1080, height: 1620 },
];

export function getPreset(id: AspectRatioId): AspectRatioPreset | undefined {
  return ASPECT_PRESETS.find((p) => p.id === id);
}

/** Round up to the nearest even integer (H.264 / yuv420p needs even dimensions). */
export function toEven(n: number): number {
  const r = Math.round(n);
  return r % 2 === 0 ? r : r + 1;
}

export const DEFAULT_CONFIG: SliderConfig = {
  aspectRatio: '9:16',
  width: 1080,
  height: 1920,
  durationMs: 6000,
  fps: 30,
  transition: 'reveal',
  direction: 'ltr',
  easing: 'easeInOut',
  loop: 'none',
  holdStartMs: 600,
  holdEndMs: 800,
  line: {
    color: '#ffffff',
    width: 6,
  },
  handle: {
    enabled: true,
    icon: 'arrows',
    radius: 26,
    color: '#ffffff',
    iconColor: '#6c5cff',
  },
  background: '#000000',
};
