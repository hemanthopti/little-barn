import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  // Builds straight into the synced starlinkwatch folder, which uploads to public_html/play.
  build: { target: 'es2020', assetsInlineLimit: 0, outDir: process.env.OUT_DIR || '../starlinkwatch/play', emptyOutDir: true },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['icon.svg', 'audio/manifest.json'],
      manifest: {
        name: 'Little Barn',
        short_name: 'Little Barn',
        description: 'A tap-and-play farm for toddlers. No ads, no paywalls, works offline.',
        theme_color: '#6EC6FF',
        background_color: '#6EC6FF',
        display: 'fullscreen',
        orientation: 'landscape',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2,json,mp3,m4a,ogg,webm}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024
      }
    })
  ]
});
