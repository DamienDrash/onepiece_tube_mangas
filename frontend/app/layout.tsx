import type { Metadata, Viewport } from 'next'
import { Inter, Bangers, Noto_Sans_JP } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import Navigation from '@/components/Navigation'
import BottomNav from '@/components/BottomNav'
import InstallPrompt from '@/components/InstallPrompt'

const inter    = Inter({ subsets: ['latin'] })
const bangers  = Bangers({
    weight: '400',
    subsets: ['latin'],
    variable: '--font-bangers',
    display: 'swap',
})
const notoJP   = Noto_Sans_JP({
    weight: '900',
    subsets: ['latin'],
    variable: '--font-noto-jp',
    display: 'swap',
})

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor: '#0d0d0d',
}

export const metadata: Metadata = {
    title: 'Grand Line Archive',
    description: 'Premium One Piece Manga Offline Reader',
    manifest: '/op/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'Grand Line',
    },
    icons: {
        apple: [{ url: '/op/apple-touch-icon.png', sizes: '180x180' }],
        icon:  [
            { url: '/op/favicon.ico',       sizes: 'any' },
            { url: '/op/icon-192x192.png',  sizes: '192x192', type: 'image/png' },
        ],
    },
    other: {
        'mobile-web-app-capable': 'yes',
    },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="de">
            <body className={`${inter.className} ${bangers.variable} ${notoJP.variable}`}>
                <Providers>
                    <Navigation />
                    <main className="relative container mx-auto px-4 pb-28 md:pb-8 max-w-6xl"
                          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 6rem)' }}>
                        {children}
                    </main>
                    <BottomNav />
                    <InstallPrompt />
                </Providers>
            </body>
        </html>
    )
}
