import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { version } from './package.json'


export default defineConfig({
plugins: [
react(),
VitePWA({
registerType: 'autoUpdate',
includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
manifest: {
name: 'Adventskalender',
short_name: 'Advent',
description: 'Adventskalender met elke dag 1 activiteit.',
theme_color: '#ffffff',
background_color: '#ffffff',
display: 'standalone',
start_url: '/',
scope: '/',
lang: 'nl-NL',
icons: [
{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
]
},
workbox: {
globPatterns: ['**/*.{js,css,html,ico,png,svg,json,webmanifest}'],
runtimeCaching: [
{
urlPattern: ({ request }) => request.destination === 'document',
handler: 'NetworkFirst',
options: { cacheName: 'html-cache' }
},
{
urlPattern: ({ request }) => ['style','script','worker'].includes(request.destination),
handler: 'StaleWhileRevalidate',
options: { cacheName: 'asset-cache' }
},
{
// Firestore REST (fallback) of activiteiten.json
urlPattern: ({ url }) => url.pathname.includes('/activities'),
handler: 'NetworkFirst',
options: { cacheName: 'data-cache' }
},
{
urlPattern: ({ request }) => request.destination === 'image',
handler: 'CacheFirst',
options: { cacheName: 'image-cache', expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 } }
}
]
},
devOptions: { enabled: true }
})
],
define: {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString())
}
})