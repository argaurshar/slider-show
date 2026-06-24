# Slider Show

Turn **two images** into a polished **before / after slider video** for Reels,
TikTok, Stories, YouTube, and more — entirely in your browser. Your images never
leave your device; rendering and video encoding happen client-side.

## Features

- **Two-image input** — drag-and-drop or click to add a *before* and *after* image.
- **Per-image framing** — zoom and reposition (focal point) each photo to choose
  exactly what stays in frame, instead of a forced center-crop.
- **Caption overlay** — optional text on the video, with top/center/bottom
  position, size, color, and a translucent backing bar; auto-shrinks to fit.
- **Shareable settings** — every setting is encoded in the URL and saved to
  localStorage, so a "Copy share link" reopens the app with the same look, and
  your last session is restored on return. (Images aren't included — only the look.)
- **Three transitions, your choice** — *reveal* (a divider line sweeps across to
  wipe image B over image A), *slide/push*, and *fade*.
- **Every social format** — presets for 9:16, 1:1, 4:5, 16:9, 3:4, 2:3, all at a
  1080px short edge.
- **Full customization** — duration, start/end holds, frame rate (24/30/60),
  easing, loop / ping-pong, slider line color & width, handle style (arrows / dot
  / plain) and colors, and backdrop fill.
- **Real MP4 on every browser** — WebCodecs H.264 where available (Chrome/Edge),
  with an **ffmpeg.wasm** fallback that produces a real MP4 on Safari/Firefox too.
  The download starts automatically and you get an in-app preview.
- **Live, WYSIWYG preview** — the on-screen preview uses the exact same renderer as
  the exporter, so what you see is what you download.

## How it works

The heart of the app is one pure function, `renderFrame` (`src/lib/render/renderFrame.ts`),
which draws a single frame given the two images, a motion progress value, and the
config. Both the live preview (`usePreviewAnimation`, via a scaled-down config) and
the offline exporter drive that same function.

Video export is capability-routed (`src/lib/export/pickExporter.ts`):

1. **WebCodecs `VideoEncoder` (H.264) + `mp4-muxer`** — primary path. Frames are
   rendered offline and encoded deterministically to a real MP4 with exact
   duration. (Chrome/Edge/Android and modern Chromium.)
2. **ffmpeg.wasm (`libx264`)** — MP4 fallback for browsers without WebCodecs H.264
   (Safari/Firefox). Frames are rendered to JPEGs and encoded to H.264. The
   single-thread core is **self-hosted** (`vite.config.ts` copies it into
   `dist/ffmpeg/` and serves it same-origin) and loaded lazily, so nothing
   downloads until such a browser actually exports — and no cross-origin
   isolation is needed.
3. **`MediaRecorder` + `canvas.captureStream()`** — last-resort WebM, only if
   WebAssembly itself is unavailable.

Images are decoded with EXIF orientation baked in and downscaled to bound memory.
All compositing uses `object-fit: cover` math (`src/lib/image/coverRect.ts`) so any
image size/orientation fills the chosen canvas with a centered crop.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # tsc --noEmit
npm test           # vitest (pure render/geometry/easing logic)
npm run build      # tsc + vite build -> dist/
```

> **Note on headers:** the app runs **without** cross-origin isolation. WebCodecs
> encode doesn't need it, and `COEP: require-corp` actually *blocks* the Web Worker
> that the single-thread ffmpeg.wasm fallback spawns — so no COOP/COEP headers are
> set anywhere. This also matches GitHub Pages, which can't set custom headers.

## Deploy

It's a static SPA — `npm run build` produces `dist/`, deployable to Vercel,
Netlify, GitHub Pages, or any static host. The included `vercel.json` /
`public/_headers` apply the COOP/COEP headers automatically on Vercel/Netlify.

## Project structure

```
src/
  lib/
    image/      coverRect.ts, loadImage.ts          # cover-fit + EXIF-aware decode
    render/     renderFrame.ts, easing.ts,          # the shared renderer + effects
                sliderGeometry.ts, scaleConfig.ts
    export/     exporter.ts, webcodecsExporter.ts,  # encoder abstraction + backends
                mediaRecorderExporter.ts, pickExporter.ts
    presets.ts                                       # aspect presets + defaults
  state/        useProjectStore.ts                   # zustand store + export orchestration
  hooks/        usePreviewAnimation.ts
  components/   PreviewCanvas, ControlsPanel, ImageUploader, ExportBar, ui/Controls
tests/          coverRect, easing, sliderGeometry
```

## Roadmap

- Background music track.
