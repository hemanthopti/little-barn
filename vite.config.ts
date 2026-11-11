import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { hashedAssets } from './vite-assets';

export default defineConfig({
  base: './',
  // Icons and .htaccess are copied as they are; pictures and sounds in public/ are hashed by vite-assets.ts
  publicDir: 'static',
  // Builds straight into the synced starlinkwatch folder, which uploads to public_html/play.
  build: { target: 'es2020', assetsInlineLimit: 0, outDir: process.env.OUT_DIR || '../starlinkwatch/play', emptyOutDir: true },
  plugins: [
    hashedAssets(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['icon.svg'],
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
        // The page itself is always fetched fresh when online (so a reload shows the latest version);
        // everything else has a content hash in its name and is kept for offline play.
        globPatterns: ['**/*.{js,css,svg,png,webp,woff2,json,mp3,m4a,ogg,webm}'],
        navigateFallback: null,
        runtimeCaching: [{
          urlPattern: ({ request }) => request.mode === 'navigate',
          handler: 'NetworkFirst',
          options: { cacheName: 'pages', networkTimeoutSeconds: 4 }
        }],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024
      }
    })
  ]
});
