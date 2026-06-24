import type {
  AspectRatioId,
  CaptionPosition,
  Direction,
  EasingId,
  HandleIcon,
  LoopMode,
  SliderConfig,
  TransitionId,
} from '../../types/project';
import { DEFAULT_CONFIG, getPreset, toEven } from '../presets';

/** localStorage key for the last-used settings. */
export const STORAGE_KEY = 'slider-show:config';
/** URL hash key carrying shared settings, e.g. `#s=<base64url>`. */
export const HASH_KEY = 's';

const TRANSITIONS: TransitionId[] = ['reveal', 'push', 'fade', 'circle', 'diagonal', 'blinds'];
const DIRECTIONS: Direction[] = ['ltr', 'rtl', 'ttb', 'btt'];
const EASINGS: EasingId[] = ['linear', 'easeInOut', 'easeOut', 'easeInOutCubic'];
const LOOPS: LoopMode[] = ['none', 'loop', 'pingpong'];
const HANDLE_ICONS: HandleIcon[] = ['arrows', 'dot', 'none'];
const CAPTION_POS: CaptionPosition[] = ['top', 'center', 'bottom'];
const ASPECTS: AspectRatioId[] = ['9:16', '1:1', '4:5', '16:9', '3:4', '2:3', 'custom'];

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback: number, min: number, max: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const str = (v: unknown, fallback: string): string => (typeof v === 'string' ? v : fallback);
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);
function oneOf<T extends string>(v: unknown, allowed: T[], fallback: T): T {
  return typeof v === 'string' && (allowed as string[]).includes(v) ? (v as T) : fallback;
}

/**
 * Build a clean SliderConfig from untrusted input (a decoded URL / localStorage
 * blob), validating every field against {@link DEFAULT_CONFIG}. Unknown or
 * wrongly-typed values fall back to defaults, so a malformed link can never
 * produce a broken render.
 */
export function sanitizeConfig(raw: unknown): SliderConfig {
  const d = DEFAULT_CONFIG;
  if (!isObj(raw)) return { ...d };
  const line = isObj(raw.line) ? raw.line : {};
  const handle = isObj(raw.handle) ? raw.handle : {};
  const caption = isObj(raw.caption) ? raw.caption : {};

  const aspectRatio = oneOf<AspectRatioId>(raw.aspectRatio, ASPECTS, d.aspectRatio);
  // Re-derive preset dimensions so the ratio and pixel size never disagree;
  // custom keeps its own (clamped, even) size.
  let width = d.width;
  let height = d.height;
  if (aspectRatio === 'custom') {
    width = toEven(num(raw.width, d.width, 16, 4096));
    height = toEven(num(raw.height, d.height, 16, 4096));
  } else {
    const preset = getPreset(aspectRatio);
    if (preset) {
      width = toEven(preset.width);
      height = toEven(preset.height);
    }
  }

  return {
    aspectRatio,
    width,
    height,
    durationMs: num(raw.durationMs, d.durationMs, 500, 60000),
    fps: num(raw.fps, d.fps, 1, 120),
    transition: oneOf(raw.transition, TRANSITIONS, d.transition),
    direction: oneOf(raw.direction, DIRECTIONS, d.direction),
    easing: oneOf(raw.easing, EASINGS, d.easing),
    loop: oneOf(raw.loop, LOOPS, d.loop),
    holdStartMs: num(raw.holdStartMs, d.holdStartMs, 0, 10000),
    holdEndMs: num(raw.holdEndMs, d.holdEndMs, 0, 10000),
    kenBurns: bool(raw.kenBurns, d.kenBurns),
    line: {
      color: str(line.color, d.line.color),
      width: num(line.width, d.line.width, 0, 64),
    },
    handle: {
      enabled: bool(handle.enabled, d.handle.enabled),
      icon: oneOf(handle.icon, HANDLE_ICONS, d.handle.icon),
      radius: num(handle.radius, d.handle.radius, 0, 256),
      color: str(handle.color, d.handle.color),
      iconColor: str(handle.iconColor, d.handle.iconColor),
    },
    background: str(raw.background, d.background),
    caption: {
      text: str(caption.text, d.caption.text),
      position: oneOf(caption.position, CAPTION_POS, d.caption.position),
      sizePct: num(caption.sizePct, d.caption.sizePct, 0.01, 0.5),
      color: str(caption.color, d.caption.color),
      background: bool(caption.background, d.caption.background),
    },
  };
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** Encode a config to a compact, URL-safe string. */
export function encodeConfig(config: SliderConfig): string {
  const json = JSON.stringify(config);
  return toBase64Url(new TextEncoder().encode(json));
}

/** Decode a string from {@link encodeConfig} into a validated config, or null. */
export function decodeConfig(encoded: string): SliderConfig | null {
  try {
    const json = new TextDecoder().decode(fromBase64Url(encoded));
    return sanitizeConfig(JSON.parse(json));
  } catch {
    return null;
  }
}

/** Read the `#s=` settings string from a hash (with or without the leading #). */
export function readHashParam(hash: string): string | null {
  const h = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!h) return null;
  const params = new URLSearchParams(h);
  return params.get(HASH_KEY);
}

/** Full shareable URL for the given config, based on the current location. */
export function buildShareUrl(config: SliderConfig): string {
  const base =
    typeof window !== 'undefined'
      ? window.location.origin + window.location.pathname
      : '';
  return `${base}#${HASH_KEY}=${encodeConfig(config)}`;
}

/**
 * Initial config on app start: a shared URL hash wins, then the last-used
 * localStorage value, then defaults.
 */
export function loadInitialConfig(): SliderConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_CONFIG };
  const fromHash = readHashParam(window.location.hash);
  if (fromHash) {
    const decoded = decodeConfig(fromHash);
    if (decoded) return decoded;
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return sanitizeConfig(JSON.parse(stored));
  } catch {
    /* ignore unavailable/corrupt storage */
  }
  return { ...DEFAULT_CONFIG };
}

/** Persist config to localStorage and reflect it in the URL hash. */
export function persistConfig(config: SliderConfig): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
  try {
    const url = `#${HASH_KEY}=${encodeConfig(config)}`;
    window.history.replaceState(null, '', url);
  } catch {
    /* ignore history errors */
  }
}
