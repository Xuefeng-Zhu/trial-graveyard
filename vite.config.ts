import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => ({
  base: loadEnv(mode, process.cwd(), 'VITE_').VITE_BASE || '/',
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    manifest: {
      name: 'Trial Graveyard', short_name: 'Graveyard', description: 'Catch free trials before the first charge.',
      start_url: './', scope: './', display: 'standalone',
      theme_color: '#120F23', background_color: '#120F23',
      icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }],
    },
    workbox: { globPatterns: ['**/*.{html,js,css,png,woff2,svg}'], cleanupOutdatedCaches: true },
  })],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/testSetup.ts'],
    maxWorkers: 4,
    coverage: {
      include: ['src/domain/*.ts'], exclude: ['**/*.test.ts', '**/arbitraries.ts'],
      thresholds: { lines: 100, statements: 100, branches: 100, functions: 100 },
    },
  },
}))
