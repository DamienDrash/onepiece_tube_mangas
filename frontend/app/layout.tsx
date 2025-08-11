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
        icon: '/favicon.ico',
        shortcut: '/favicon.ico',
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
                    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 relative overflow-x-hidden">
                        {/* Background decoration */}
                        <div className="absolute inset-0 opacity-30" style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ff6b6b' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                        }}></div>
                        <Navigation />
                        <main className="relative z-0 container mx-auto px-4 py-8 max-w-7xl">
                            {children}
                        </main>
                    </div>
                </Providers>
            </body>
        </html>
    )
}
