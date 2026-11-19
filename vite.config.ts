import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { ocrAssets } from './scripts/ocr-assets'

export default defineConfig(({ mode }) => ({
  base: loadEnv(mode, process.cwd(), 'VITE_').VITE_BASE || '/',
  build: {
    rollupOptions: { output: {
      onlyExplicitManualChunks: true,
      manualChunks(id) {
        if (id.includes('/node_modules/tesseract.js/')) return 'tesseract-reader'
      },
    } },
  },
  plugins: [react(), ocrAssets(), VitePWA({
    registerType: 'autoUpdate',
    manifest: {
      name: 'Trial Graveyard', short_name: 'Graveyard', description: 'Catch free trials before the first charge.',
      start_url: './', scope: './', display: 'standalone',
      theme_color: '#120F23', background_color: '#120F23',
      icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }],
    },
    workbox: {
      globPatterns: ['**/*.{html,js,css,png,woff2,svg}'],
      globIgnores: ['ocr/**', 'assets/tesseract*.js'],
      cleanupOutdatedCaches: true,
      runtimeCaching: [{
        urlPattern: ({ url, sameOrigin }) => sameOrigin
          && /\/(ocr\/(worker\.min\.js|tesseract-core-lstm\.wasm\.js|eng\.traineddata\.gz)|assets\/tesseract(?:Engine|-reader)-[\w-]+\.js)$/.test(url.pathname),
        handler: 'CacheFirst',
        options: { cacheName: 'tesseract-assets-v7', expiration: { maxEntries: 6, maxAgeSeconds: 60 * 60 * 24 * 30 }, cacheableResponse: { statuses: [200] } },
      }],
    },
  })],
  test: {
    environment: 'node',
    setupFiles: ['./src/testSetup.ts'],
    maxWorkers: 4,
    testTimeout: 15_000,
    coverage: {
      enabled: true,
      include: ['src/domain/*.ts'], exclude: ['**/*.test.ts', '**/arbitraries.ts'],
      thresholds: { lines: 100, statements: 100, branches: 100, functions: 100 },
    },
  },
}))
