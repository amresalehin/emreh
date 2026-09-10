import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { boxVitePlugin } from './src/server/boxVitePlugin';
import pkg from './package.json' with { type: 'json' };

export default defineConfig(({ command }) => {
  // Determine base path:
  // In development (serve), keep '/' for local server routing
  // In production (build):
  // 1. Explicit BASE_PATH (e.g., '/Life/')
  // 2. GITHUB_REPOSITORY (e.g., 'username/Life' -> '/Life/')
  // 3. Fallback to './' for relative asset loading
  let basePath = '/';
  if (command === 'build') {
    if (process.env.BASE_PATH) {
      let bp = process.env.BASE_PATH.trim();
      if (!bp.startsWith('/')) bp = `/${bp}`;
      if (!bp.endsWith('/')) bp = `${bp}/`;
      basePath = bp;
    } else if (process.env.GITHUB_REPOSITORY) {
      const repo = process.env.GITHUB_REPOSITORY.split('/')[1]?.trim();
      basePath = repo ? `/${repo}/` : './';
    } else {
      basePath = './';
    }
  }

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),
      boxVitePlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'app-icon.svg', 'apple-touch-icon.png', 'emreh-logo.jpg', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          id: basePath,
          start_url: basePath,
          scope: basePath,
          name: 'Emreh — Personal Life Companion',
          short_name: 'Emreh',
          description: 'Emreh — Personal life companion and fellow traveler (Hamrah / همراه) navigating daily timelines, journals, bookmarks, and memories.',
          theme_color: '#121214',
          background_color: '#121214',
          display: 'standalone',
          orientation: 'any',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        },
        devOptions: {
          enabled: false
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
