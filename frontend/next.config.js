/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://backend:8001/api/:path*',
            },
        ]
    },
}

module.exports = nextConfig
