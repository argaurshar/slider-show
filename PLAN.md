# Slider Show — Product & Engineering Plan

> **Status:** Planning document. This file is the agreed blueprint before any
> new feature work begins. It captures the vision, the current state of the
> codebase, gaps, and a phased roadmap.
>
> **Last updated:** 2026-06-21

---

## 1. Vision

Let anyone turn **two images** (a "before" and an "after") into a polished,
**social-ready slider video** — the kind of before/after reveal that performs
well on Reels, TikTok, Stories, YouTube Shorts, and Pinterest.

The experience must be:

- **Effortless** — drop two images, pick a format, hit download.
- **Beautiful by default** — sensible motion, easing, and styling out of the box.
- **Flexible** — many output sizes and design options to match each platform.
- **Private & free** — everything runs in the browser; images never upload.

---

## 2. What "the user asked for" maps to

| User request | Interpretation | Plan reference |
|---|---|---|
| "inputs the first and second image" | Two-image upload (before / after) | §5.1 |
| "slider video" | Animated reveal/wipe between the two images | §5.3 |
| "in 9 to 15 or in the format the user chooses" | (a) **Aspect ratios** like 9:16; (b) **Duration** 9–15s range. Support both. | §5.2, §5.4 |
| "download the slider video in a video format" | MP4 (H.264) primary, WebM fallback | §5.6 |
| "more options, more design sizes" | Expanded preset library + custom size | §5.2 |
| "per their social media platform requirement" | Platform-labelled presets + safe-area guides | §5.2, §6 |
| "make it beautiful and better" | More transitions, themes, captions, music | §6 |

> **Decision needed (low stakes):** "9 to 15" most likely means the **9:16**
> vertical format. We will treat 9:16 as the default *and* offer a 9–15 second
> duration range, so both readings are satisfied.

---

## 3. Current state of the codebase (audit)

The repository **already contains a working MVP**. This plan builds on it
rather than starting from scratch.

**Stack:** React 18 + TypeScript + Vite + Tailwind + Zustand. Tests via Vitest.

**Already implemented:**

- ✅ Two-image input (drag-drop / click) — `ImageUploader.tsx`
- ✅ EXIF-aware decode + downscale — `lib/image/loadImage.ts`
- ✅ `object-fit: cover` compositing math — `lib/image/coverRect.ts`
- ✅ Single shared renderer for preview + export — `lib/render/renderFrame.ts`
- ✅ Three transitions: **reveal**, **push/slide**, **fade**
- ✅ Easing options, loop / ping-pong, start/end holds
- ✅ Slider line + handle styling (color, width, icon)
- ✅ 6 aspect presets: 9:16, 1:1, 4:5, 16:9, 3:4, 2:3 (`lib/presets.ts`)
- ✅ Live WYSIWYG preview — `usePreviewAnimation.ts`, `PreviewCanvas.tsx`
- ✅ MP4 (H.264) export via WebCodecs + `mp4-muxer`; WebM `MediaRecorder` fallback
- ✅ Capability routing — `lib/export/pickExporter.ts`
- ✅ COOP/COEP headers for `vercel.json` / `public/_headers`
- ✅ Unit tests for geometry, easing, cover-fit

**Known gaps / opportunities (from README roadmap + this audit):**

- ❌ No MP4 on Safari/Firefox (WebM only — iOS can't play WebM)
- ❌ No text / caption overlay
- ❌ No background music track
- ❌ No focal-point crop adjustment per image
- ❌ No custom (free-form) size input — `'custom'` type exists but no UI
- ❌ Limited preset count vs. the full social matrix users expect
- ❌ No theme/styling presets ("templates") for one-click beauty
- ❌ No shareable settings via URL
- ❌ No way to swap A/B order or reuse the same image

---

## 4. Goals & non-goals

**Goals**
- Keep it 100% client-side (privacy + zero hosting cost).
- Broaden output formats and make styling delightful with minimal clicks.
- Maintain the "one renderer drives both preview and export" invariant.

**Non-goals (for now)**
- Accounts, cloud storage, or server-side rendering.
- Multi-clip timelines / more than two images.
- Real-time collaborative editing.

---

## 5. Core feature specification

### 5.1 Image input
- Two slots: **Before (A)** and **After (B)**.
- Drag-and-drop, click-to-browse, and paste support.
- Swap A↔B button; clear/replace per slot.
- Validate type/size; show friendly errors; downscale to bound memory.

### 5.2 Output sizes & social presets (EXPAND)
Maintain the 1080px short-edge convention. Group presets by platform:

| Format | Ratio | Px (W×H) | Where |
|---|---|---|---|
| Vertical | 9:16 | 1080×1920 | Reels, TikTok, Shorts, Stories |
| Square | 1:1 | 1080×1080 | IG/FB feed |
| Portrait | 4:5 | 1080×1350 | IG/FB feed (max height) |
| Portrait | 3:4 | 1080×1440 | Classic portrait |
| Pin | 2:3 | 1080×1620 | Pinterest |
| Landscape | 16:9 | 1920×1080 | YouTube, X, LinkedIn |
| **NEW** Wide pin | 1.91:1 | 1080×566 | FB/LinkedIn link card |
| **NEW** Custom | any | user W×H | power users |

- Add a **Custom size** control (numeric W/H, even-rounded for H.264).
- Show a **platform badge** and **safe-area overlay** (so handles/captions
  don't collide with platform UI like the Reels caption bar).

### 5.3 Transitions / motion (EXPAND)
Current: reveal, push, fade. Planned additions:
- **Clip wipe** variations: circle, diagonal, blinds.
- **Zoom/Ken-Burns** drift on hold frames for life.
- Per-transition direction (ltr / rtl / ttb / btt) already supported — surface
  it consistently for every transition.

### 5.4 Timing
- Duration slider with a **9–15s sweet-spot band** highlighted (good for Reels).
- Start hold / end hold, fps (24 / 30 / 60), easing, loop / ping-pong.

### 5.5 Styling & "templates" (NEW — the "make it beautiful" ask)
- One-click **style presets** (e.g. "Minimal", "Bold", "Studio") bundling line
  color/width, handle icon/colors, and background.
- **Caption/title overlay**: text, font, size, color, position, safe-area aware.
- **Background music** track: pick an audio file, trim to clip length, mux into
  the MP4 (WebCodecs `AudioEncoder` or ffmpeg.wasm path).

### 5.6 Export (HARDEN)
- Keep WebCodecs H.264 + `mp4-muxer` primary.
- Add **ffmpeg.wasm** fallback so Safari/Firefox also get **MP4** instead of WebM
  (closes the biggest compatibility gap; iOS can't play WebM).
- Progress UI per phase (prepare → render → encode), in-app preview, auto-download.
- Filename includes format + timestamp.

### 5.7 Sharing & persistence (NICE-TO-HAVE)
- Encode settings into URL params for shareable configs.
- Optional `localStorage` of last-used settings.

---

## 6. UX / layout plan

- **Left:** image slots + live preview (the hero).
- **Right:** controls panel, grouped into collapsible sections:
  1. Format & size (with platform badges + safe-area toggle)
  2. Motion (transition, direction, duration, easing, loop)
  3. Style (template presets, line, handle, background)
  4. Overlays (caption, music) — phase 2
  5. Export
- Mobile: stack preview on top, controls below; sticky export bar.
- Accessibility: keyboard-operable controls, ARIA labels, focus states.

---

## 7. Architecture (keep the core invariant)

```
two images + progress(0..1) + SliderConfig ──► renderFrame() ──► one canvas frame
                                                   │
                         ┌─────────────────────────┴───────────────────────┐
                         ▼                                                   ▼
              usePreviewAnimation (scaled)                       offline exporter loop
              → on-screen canvas                                 → WebCodecs / ffmpeg / MediaRecorder
```

- `renderFrame` stays the **single source of truth**; any new transition,
  overlay, or style must be added there so preview == export.
- New `SliderConfig` fields (caption, audio, stylePreset, customSize) are
  additive and backward-compatible.
- Exporter abstraction (`pickExporter`) gains an ffmpeg.wasm backend behind the
  same interface.

---

## 8. Phased roadmap

**Phase 0 — Planning (this document).** ✅

**Phase 1 — Format & polish (highest value, lowest risk)**
- Custom size input + even-rounding.
- Add wide-link preset; group presets by platform; safe-area overlay.
- Style presets ("templates") for one-click beauty.
- Swap A/B, paste support.

**Phase 2 — Beauty & reach**
- Caption/title overlay (safe-area aware) in `renderFrame`.
- ffmpeg.wasm fallback → MP4 everywhere (Safari/Firefox).
- More transitions (circle/diagonal/blinds wipes, Ken-Burns).

**Phase 3 — Audio & sharing**
- Background music + audio muxing.
- Shareable URL settings + localStorage.
- Focal-point crop per image.

Each phase ends with: typecheck green, tests green, manual verify in-app,
commit + PR.

---

## 9. Testing & quality

- Pure-logic unit tests (Vitest): geometry, easing, cover-fit, new transition
  math, caption layout, duration→frame counts.
- Manual verification matrix: Chrome (MP4), Safari/Firefox (fallback), mobile.
- `npm run typecheck` and `npm test` gate every PR.

---

## 10. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| WebM-only on Safari/iOS | Users can't play output | ffmpeg.wasm MP4 fallback (Phase 2) |
| ffmpeg.wasm bundle size | Slow first load | Lazy-load only when fallback needed |
| Large images → memory | Crash / slow | Downscale on decode (already done) |
| Audio muxing complexity | Scope creep | Defer to Phase 3, behind a flag |
| COOP/COEP not set on host | WebCodecs disabled | Headers already configured; document for other hosts |

---

## 11. Open questions for the user

1. **"9 to 15"** — confirm: vertical **9:16 format**, a **9–15 second**
   duration range, or both? (Plan currently does both.)
2. Which platforms matter most? (Drives which presets ship first.)
3. Are **captions** and **background music** in-scope for v1, or later?
4. Any brand styling (colors/logo watermark) you'd want as a default template?

---

## 12. Definition of done (for the overall product)

- Upload two images → see an instant, accurate live preview.
- Choose any supported format/size (incl. custom) with platform guidance.
- Tweak motion + style, optionally add a caption.
- Download a real, playable **MP4** on every major browser.
- No image ever leaves the device.
