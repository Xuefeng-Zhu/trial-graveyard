import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';
import { resolveBase } from './vite.base';

const base = resolveBase(process.env);

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff,woff2,webmanifest}'],
        navigateFallback: `${base}index.html`,
        // Tesseract worker, core and English data come from CDNs on first use.
        // Cache them so image receipts keep working offline afterwards.
        runtimeCaching: [
          {
            urlPattern: ({ url }: { url: URL }) =>
              url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'tessdata.projectnaptha.com',
            handler: 'CacheFirst' as const,
            options: {
              cacheName: 'tesseract-assets',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'Trial Graveyard',
        short_name: 'Graveyard',
        description: 'A haunted tracker for free trials. Cancel before they rise.',
        theme_color: '#12101a',
        background_color: '#12101a',
        display: 'standalone',
        scope: base,
        start_url: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/domain/arbitraries.ts'],
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
    },
  },
});
