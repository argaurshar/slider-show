/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Serve the ffmpeg.wasm single-thread core from the same origin as the app.
 * In dev a middleware streams it straight from node_modules; on build the two
 * files are copied into `dist/ffmpeg/`. Self-hosting avoids a third-party CDN
 * and works without cross-origin isolation (single-thread core).
 */
function ffmpegCore(): Plugin {
  // The ESM core (not UMD): Vite builds @ffmpeg/ffmpeg's worker as a *module*
  // worker, whose loader path does `import(coreURL)` and needs a default export.
  const umdDir = path.resolve('node_modules/@ffmpeg/core/dist/esm');
  const files = ['ffmpeg-core.js', 'ffmpeg-core.wasm'];
  const mimeFor = (f: string) => (f.endsWith('.wasm') ? 'application/wasm' : 'text/javascript');
  return {
    name: 'ffmpeg-core',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const match = req.url?.match(/\/ffmpeg\/(ffmpeg-core\.(?:js|wasm))(?:\?.*)?$/);
        if (!match) return next();
        const fp = path.join(umdDir, match[1]);
        if (!fs.existsSync(fp)) return next();
        res.setHeader('Content-Type', mimeFor(match[1]));
        fs.createReadStream(fp).pipe(res);
      });
    },
    closeBundle() {
      const outDir = path.resolve('dist/ffmpeg');
      fs.mkdirSync(outDir, { recursive: true });
      for (const f of files) fs.copyFileSync(path.join(umdDir, f), path.join(outDir, f));
    },
  };
}

// No cross-origin isolation: WebCodecs encode doesn't need it, GitHub Pages
// can't set the headers anyway, and crucially COEP:require-corp BLOCKS the Web
// Worker that the single-thread ffmpeg.wasm fallback spawns. Keeping isolation
// off makes dev match the Pages runtime and lets every export path work.
export default defineConfig(({ command }) => ({
  // Served from https://<user>.github.io/slider-show/ on GitHub Pages, so the
  // production build needs that sub-path as its base. Dev stays at root.
  base: command === 'build' ? '/slider-show/' : '/',
  plugins: [react(), ffmpegCore()],
  // @ffmpeg/ffmpeg ships a Web Worker that Vite's dep pre-bundler mangles in
  // dev (the worker request fails); excluding it lets the worker load as-is.
  optimizeDeps: { exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'] },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
}));