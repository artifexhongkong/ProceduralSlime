import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Vite 配置 —— 支援 PWA + Cordova 包裝
export default defineConfig({
  root: '.',
  base: './',                  // Cordova 用相對路徑
  publicDir: 'public',
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 1024,
    rollupOptions: {
      output: {
        // 將所有 JS 打包為單檔，方便 Cordova 包成 APK
        manualChunks: undefined,
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png'],
      manifest: {
        name: 'Procedural Slime',
        short_name: 'Slime',
        description: '把真實史萊姆養在手機裡 —— 解壓放置療癒系手遊',
        theme_color: '#1a1a2e',
        background_color: '#0f0f1e',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        lang: 'zh-Hant',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
});
