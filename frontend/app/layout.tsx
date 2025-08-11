import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import Navigation from '@/components/Navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'One Piece Offline Reader',
    description: 'Offline-fähiger One Piece Manga Reader',
    icons: {
        icon: '/onepiece-logo.png',
        shortcut: '/onepiece-logo.png',
        apple: '/onepiece-logo.png',
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="de">
            <body className={inter.className}>
                <Providers>
                    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
                        <Navigation />
                        <main className="container mx-auto px-4 py-8">
                            {children}
                        </main>
                    </div>
                </Providers>
            </body>
        </html>
    )
}
