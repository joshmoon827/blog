const CACHE_VERSION = 'v3'
const STATIC_CACHE = `static-${CACHE_VERSION}`
const API_CACHE = `api-${CACHE_VERSION}`

const PRECACHE_URLS = [
  '/',
  '/offline',
  '/test-ui/offline-reader',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url))),
    ),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key)),
      ),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstApi(event.request))
    return
  }

  if (url.pathname.startsWith('/images/')) {
    event.respondWith(cacheFirstImage(event.request))
    return
  }

  const accept = event.request.headers.get('accept') || ''
  const isNavigate =
    event.request.mode === 'navigate' || accept.includes('text/html')

  if (isNavigate) {
    event.respondWith(handleNavigate(event.request))
    return
  }

  event.respondWith(staleWhileRevalidate(event.request))
})

async function networkFirstApi(request) {
  try {
    const response = await fetch(request.clone())
    const cache = await caches.open(API_CACHE)
    cache.put(request, response.clone())
    return response
  } catch {
    const cached = await caches.match(request)
    return (
      cached ||
      new Response(JSON.stringify({ error: 'offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    )
  }
}

async function cacheFirstImage(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    const cache = await caches.open(STATIC_CACHE)
    cache.put(request, response.clone())
    return response
  } catch {
    return new Response('', { status: 404 })
  }
}

async function handleNavigate(request) {
  const url = new URL(request.url)
  const cache = await caches.open(STATIC_CACHE)
  try {
    const response = await fetch(request)
    if (response.ok && url.pathname.startsWith('/articles/')) {
      cache.put(request, response.clone())
    }
    // Keep real HTTP errors (404/500). Only fall back when the network fails.
    return response
  } catch {
    // network failed — fall through to cache / offline page
  }

  const cached =
    (await cache.match(request)) || (await caches.match(request))
  if (cached) return cached

  const offline =
    (await cache.match('/offline')) || (await caches.match('/offline'))
  return (
    offline ||
    new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  )
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE)
  const cached = await cache.match(request)
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => null)
  return cached || (await fetchPromise) || new Response('', { status: 504 })
}
