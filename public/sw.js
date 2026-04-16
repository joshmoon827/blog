const CACHE_VERSION = 'v1'
const STATIC_CACHE  = `static-${CACHE_VERSION}`
const API_CACHE     = `api-${CACHE_VERSION}`

const PRECACHE_URLS = [
  '/',
  '/offline',
]

// ── 설치: 정적 에셋 사전 캐시
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// ── 활성화: 이전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// ── fetch 인터셉트
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // API 요청: Network-First → 실패 시 캐시
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstApi(event.request))
    return
  }

  // 이미지: Cache-First
  if (url.pathname.startsWith('/images/')) {
    event.respondWith(cacheFirstImage(event.request))
    return
  }

  // 페이지/정적 에셋: Stale-While-Revalidate
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
    return cached || new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
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

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE)
  const cached = await cache.match(request)
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone())
    return response
  }).catch(() => null)
  return cached || (await fetchPromise) || caches.match('/')
}
