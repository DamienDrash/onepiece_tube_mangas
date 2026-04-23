const SW_VERSION = '2.0.0'
const STATIC_CACHE = `onepiece-static-${SW_VERSION}`
const DYNAMIC_CACHE = `onepiece-dynamic-${SW_VERSION}`
const IMAGE_CACHE = `onepiece-images-${SW_VERSION}`
const ALL_CACHES = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE]

const OFFLINE_URL = '/op/offline'
const BASE = '/op'

const PRECACHE_ASSETS = [
    '/op/offline',
    '/op/icon-192x192.png',
    '/op/icon-512x512.png',
    '/op/badge-72x72.png',
    '/op/onepiece-logo.png',
    '/op/manifest.json',
]

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => cache.addAll(PRECACHE_ASSETS))
            .then(() => self.skipWaiting())
    )
})

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            caches.keys().then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => !ALL_CACHES.includes(key))
                        .map((key) => caches.delete(key))
                )
            ),
            self.clients.claim(),
        ])
    )
})

self.addEventListener('fetch', (event) => {
    const { request } = event
    const url = new URL(request.url)

    if (request.method !== 'GET') return
    if (url.origin !== self.location.origin) return

    // Next.js static assets — content-hashed, cache forever
    if (url.pathname.includes('/_next/static/')) {
        event.respondWith(cacheFirst(request, STATIC_CACHE))
        return
    }

    // API requests — network first, cache fallback
    if (url.pathname.startsWith('/op/api/') || url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirst(request, DYNAMIC_CACHE))
        return
    }

    // Images — cache first
    if (request.destination === 'image') {
        event.respondWith(cacheFirst(request, IMAGE_CACHE))
        return
    }

    // Navigation — network first with offline fallback
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() =>
                caches.match(OFFLINE_URL).then((r) => r || caches.match(BASE + '/'))
            )
        )
        return
    }

    // Everything else — stale-while-revalidate
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE))
})

async function cacheFirst(request, cacheName) {
    const cached = await caches.match(request)
    if (cached) return cached
    const response = await fetch(request)
    if (response.ok) {
        const cache = await caches.open(cacheName)
        cache.put(request, response.clone())
    }
    return response
}

async function networkFirst(request, cacheName) {
    try {
        const response = await fetch(request)
        if (response.ok) {
            const cache = await caches.open(cacheName)
            cache.put(request, response.clone())
        }
        return response
    } catch {
        const cached = await caches.match(request)
        return cached || new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
        })
    }
}

async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName)
    const cached = await cache.match(request)
    const fetchPromise = fetch(request)
        .then((response) => {
            if (response.ok) cache.put(request, response.clone())
            return response
        })
        .catch(() => null)
    return cached || fetchPromise
}

self.addEventListener('push', (event) => {
    if (!event.data) return

    let data
    try {
        data = event.data.json()
    } catch {
        data = { title: 'Grand Line Archive', body: 'Neue Inhalte verfügbar' }
    }

    event.waitUntil(
        self.registration.showNotification(data.title || 'Grand Line Archive', {
            body: data.body || data.message || 'Neue Inhalte verfügbar',
            icon: '/op/icon-192x192.png',
            badge: '/op/badge-72x72.png',
            tag: data.tag || 'onepiece-notification',
            data: data.data || {},
            requireInteraction: false,
            actions: [
                { action: 'open', title: 'Öffnen' },
                { action: 'close', title: 'Schließen' },
            ],
            timestamp: Date.now(),
        })
    )
})

self.addEventListener('notificationclick', (event) => {
    const { notification, action } = event
    const data = notification.data || {}
    notification.close()

    if (action === 'close') return

    let url = '/op/'
    if (data.url) url = data.url
    else if (data.chapter) url = '/op/downloads'

    event.waitUntil(
        self.clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then((clients) => {
                for (const client of clients) {
                    if (client.url.startsWith(self.location.origin + '/op') && 'focus' in client) {
                        client.navigate(url)
                        return client.focus()
                    }
                }
                return self.clients.openWindow(url)
            })
    )
})

self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
