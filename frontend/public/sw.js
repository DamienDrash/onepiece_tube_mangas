/**
 * Service Worker for One Piece Offline Push Notifications
 * 
 * This service worker handles:
 * - Push notification events
 * - Notification click events
 * - Background sync (future feature)
 */

// Service Worker version for cache busting
const SW_VERSION = '1.0.0'
const CACHE_NAME = `onepiece-offline-${SW_VERSION}`

// Install event
self.addEventListener('install', (event) => {
    console.log('[SW] Service Worker installing...', SW_VERSION)

    // Skip waiting to activate immediately
    self.skipWaiting()
})

// Activate event
self.addEventListener('activate', (event) => {
    console.log('[SW] Service Worker activating...', SW_VERSION)

    event.waitUntil(
        // Take control of all pages immediately
        self.clients.claim()
    )
})

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
    console.log('[SW] Push message received:', event)

    if (!event.data) {
        console.warn('[SW] Push event has no data')
        return
    }

    try {
        const data = event.data.json()
        console.log('[SW] Push data:', data)

        const options = {
            body: data.body || data.message || 'Neue Inhalte verfügbar',
            icon: data.icon || '/icon-192x192.png',
            badge: data.badge || '/badge-72x72.png',
            tag: data.tag || 'onepiece-notification',
            data: data.data || {},
            requireInteraction: data.requireInteraction || true,
            actions: [
                {
                    action: 'open',
                    title: 'Öffnen',
                    icon: '/icon-open.png'
                },
                {
                    action: 'close',
                    title: 'Schließen',
                    icon: '/icon-close.png'
                }
            ],
            timestamp: Date.now()
        }

        event.waitUntil(
            self.registration.showNotification(data.title || 'One Piece Offline', options)
        )

    } catch (error) {
        console.error('[SW] Error parsing push data:', error)

        // Fallback notification
        event.waitUntil(
            self.registration.showNotification('One Piece Offline', {
                body: 'Neue Inhalte verfügbar',
                icon: '/icon-192x192.png',
                tag: 'onepiece-fallback'
            })
        )
    }
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.notification)

    const notification = event.notification
    const action = event.action
    const data = notification.data || {}

    notification.close()

    if (action === 'close') {
        // User explicitly closed, do nothing
        return
    }

    // Determine URL to open
    let urlToOpen = '/'

    if (action === 'open' || !action) {
        if (data.url) {
            urlToOpen = data.url
        } else if (data.chapter) {
            urlToOpen = `/?chapter=${data.chapter}`
        }
    }

    event.waitUntil(
        openOrFocusWindow(urlToOpen)
    )
})

// Helper function to open or focus the app window
async function openOrFocusWindow(url) {
    try {
        // Get all clients (open windows/tabs)
        const clients = await self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        })

        // Check if app is already open
        for (const client of clients) {
            if (client.url.includes(self.location.origin)) {
                // Focus existing window and navigate to URL
                await client.focus()
                if (client.navigate && url !== '/') {
                    await client.navigate(url)
                }
                return client
            }
        }

        // Open new window if no existing window found
        return await self.clients.openWindow(url)

    } catch (error) {
        console.error('[SW] Error opening/focusing window:', error)
        // Fallback: just open new window
        return await self.clients.openWindow('/')
    }
}

// Message event - handle messages from main app
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data)

    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting()
    }
})

// Fetch event - can be used for caching in the future
self.addEventListener('fetch', (event) => {
    // For now, just let all requests pass through
    // Future: implement caching for offline functionality
})

console.log('[SW] Service Worker script loaded:', SW_VERSION)
