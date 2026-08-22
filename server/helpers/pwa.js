/* global WIKI */

const { getPwaAppName, PWA_APP_NAME } = require('./siteDisplayName')
const { getResolvedAssets } = require('./assets')

const PWA_THEME_COLOR = '#1976d2'
const PWA_DEFAULT_APP_NAME = PWA_APP_NAME

const PWA_SERVICE_WORKER_SOURCE = `
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
`.trim()

function getWebAppManifest () {
  const appName = getPwaAppName()

  return {
    name: appName,
    short_name: appName,
    // Distinct from the site origin (`/`). Using `/` made Chrome treat the PWA as
    // the website itself and show the HTML title / og:site_name (সুন্নি নূর).
    id: '/pwa/sunni-noor',
    start_url: '/',
    scope: '/',
    lang: 'en',
    dir: 'ltr',
    icons: [
      {
        src: getResolvedAssets().androidChrome192,
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: getResolvedAssets().androidChrome256,
        sizes: '256x256',
        type: 'image/png'
      }
    ],
    theme_color: PWA_THEME_COLOR,
    background_color: PWA_THEME_COLOR,
    display: 'standalone'
  }
}

function sendWebAppManifest (req, res) {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
    'CDN-Cache-Control': 'no-store',
    'Cloudflare-CDN-Cache-Control': 'no-store'
  })
  res.type('application/manifest+json').send(getWebAppManifest())
}

function sendServiceWorker (req, res) {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
    'CDN-Cache-Control': 'no-store',
    'Cloudflare-CDN-Cache-Control': 'no-store'
  })
  res.type('application/javascript').set('Service-Worker-Allowed', '/').send(PWA_SERVICE_WORKER_SOURCE)
}

module.exports = {
  PWA_THEME_COLOR,
  PWA_DEFAULT_APP_NAME,
  getWebAppManifest,
  sendWebAppManifest,
  sendServiceWorker
}
