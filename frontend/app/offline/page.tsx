'use client'

import Link from 'next/link'

export default function OfflinePage() {
    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center">
            <div
                className="text-7xl md:text-9xl font-black italic leading-none mb-6 select-none"
                style={{
                    fontFamily: "var(--font-noto-jp), sans-serif",
                    WebkitTextStroke: '2px white',
                    filter: 'drop-shadow(4px 4px 0px rgba(239,68,68,1))',
                }}
            >
                OFFLINE!
            </div>

            <div className="impact-frame mb-8 max-w-sm w-full">
                <h1 className="text-2xl font-black uppercase tracking-tighter mb-2">
                    KEIN SIGNAL
                </h1>
                <p className="text-gray-600 text-sm leading-relaxed">
                    Verbindung zum Grand Line Archive unterbrochen. Bereits
                    heruntergeladene Kapitel sind im Vault verfügbar.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                <Link
                    href="/downloads"
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white font-black text-sm py-3 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase tracking-widest hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                >
                    VAULT ÖFFNEN
                </Link>
                <button
                    onClick={() => window.location.reload()}
                    className="flex-1 flex items-center justify-center gap-2 bg-white text-black font-black text-sm py-3 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase tracking-widest hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                >
                    RETRY
                </button>
            </div>
        </div>
    )
}
