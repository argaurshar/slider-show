/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// WebCodecs hardware encode works without cross-origin isolation, but setting
// these headers keeps the door open for a multithreaded ffmpeg.wasm fallback
// and matches the production headers in vercel.json / public/_headers.
export default defineConfig(({ command }) => ({
  // Served from https://<user>.github.io/slider-show/ on GitHub Pages, so the
  // production build needs that sub-path as its base. Dev stays at root.
  base: command === 'build' ? '/slider-show/' : '/',
  plugins: [react()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
}));
