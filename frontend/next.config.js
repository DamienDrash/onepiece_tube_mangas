/** @type {import('next').NextConfig} */
const nextConfig = {
    basePath: '/op',
    assetPrefix: '/op',
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://backend:8001/api/:path*',
            },
        ]
    },
    async headers() {
        return [
            {
                // Service worker must never be cached so browsers pick up updates
                source: '/sw.js',
                headers: [
                    { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
                    { key: 'Service-Worker-Allowed', value: '/op/' },
                ],
            },
            {
                // Manifest should revalidate regularly
                source: '/manifest.json',
                headers: [
                    { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
                ],
            },
        ]
    },
}
module.exports = nextConfig
