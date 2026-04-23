'use client'

import { useState, useEffect } from 'react'
import { Download, X, Share, ExternalLink } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'pwa-install-dismissed'

function useInstallState() {
    const [state, setState] = useState<
        | { type: 'android'; prompt: BeforeInstallPromptEvent }
        | { type: 'ios-safari' }
        | { type: 'ios-chrome' }
        | { type: 'hidden' }
    >({ type: 'hidden' })

    useEffect(() => {
        if (localStorage.getItem(DISMISSED_KEY)) return

        // Already installed (standalone mode)
        const isStandalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (navigator as any).standalone === true
        if (isStandalone) return

        const ua = navigator.userAgent
        const isIOS = /iP(hone|ad|od)/.test(ua)
        const isIOSChrome = isIOS && /CriOS/.test(ua)
        const isIOSSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua)

        if (isIOSChrome) {
            setState({ type: 'ios-chrome' })
            return
        }
        if (isIOSSafari) {
            setState({ type: 'ios-safari' })
            return
        }

        // Android / Desktop Chrome — wait for browser prompt
        const handler = (e: Event) => {
            e.preventDefault()
            setState({ type: 'android', prompt: e as BeforeInstallPromptEvent })
        }
        window.addEventListener('beforeinstallprompt', handler)
        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    return state
}

function Wrapper({ onDismiss, children }: { onDismiss: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed bottom-[4.5rem] md:bottom-6 left-4 right-4 z-[200] md:left-auto md:right-6 md:w-80">
            <div className="bg-white border-[4px] border-[#0d0d0d] shadow-[8px_8px_0_0_#0d0d0d]">
                <div className="flex items-center justify-between border-b-[4px] border-[#0d0d0d] bg-[#0d0d0d] px-4 py-2">
                    <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/op/onepiece-logo.png" alt="" className="w-5 h-5 object-contain" />
                        <span className="ink-headline text-[#fafaf8] text-xs tracking-[0.2em]">APP INSTALLIEREN</span>
                    </div>
                    <button
                        onClick={onDismiss}
                        className="p-1 hover:bg-white/10 transition-colors"
                        aria-label="Schließen"
                    >
                        <X className="w-3.5 h-3.5 text-white" />
                    </button>
                </div>
                <div className="p-4">{children}</div>
            </div>
        </div>
    )
}

export default function InstallPrompt() {
    const installState = useInstallState()
    const [dismissed, setDismissed] = useState(false)

    if (dismissed || installState.type === 'hidden') return null

    const dismiss = () => {
        localStorage.setItem(DISMISSED_KEY, '1')
        setDismissed(true)
    }

    // ── Android / Desktop Chrome ──────────────────────────────────────────────
    if (installState.type === 'android') {
        const handleInstall = async () => {
            await installState.prompt.prompt()
            const { outcome } = await installState.prompt.userChoice
            if (outcome === 'accepted') setDismissed(true)
        }
        return (
            <Wrapper onDismiss={dismiss}>
                <p className="text-xs text-[#0d0d0d]/60 mb-4 leading-relaxed">
                    Zum Startbildschirm hinzufügen für das beste offline Leseerlebnis.
                </p>
                <button
                    onClick={handleInstall}
                    className="w-full flex items-center justify-center gap-2 bg-[#dc2626] text-white ink-headline text-sm tracking-[0.15em] py-2.5 border-[3px] border-[#0d0d0d] shadow-[4px_4px_0_0_#0d0d0d] hover:shadow-[2px_2px_0_0_#0d0d0d] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                >
                    <Download className="w-4 h-4" /> Installieren
                </button>
            </Wrapper>
        )
    }

    // ── iOS Safari — manual Share sheet ──────────────────────────────────────
    if (installState.type === 'ios-safari') {
        return (
            <Wrapper onDismiss={dismiss}>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0d0d0d]/50 mb-3">
                    Als App speichern:
                </p>
                <ol className="space-y-3">
                    <li className="flex items-start gap-3">
                        <span className="ink-headline text-[#dc2626] text-base leading-none mt-0.5 flex-shrink-0">1</span>
                        <span className="text-xs text-[#0d0d0d]/70 leading-relaxed">
                            Tippe auf das{' '}
                            <span className="inline-flex items-center gap-0.5 align-middle bg-[#0d0d0d] text-white px-1.5 py-0.5 text-[10px] font-black">
                                <Share className="w-3 h-3" /> Teilen
                            </span>
                            {' '}Symbol in der Safari-Leiste
                        </span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="ink-headline text-[#dc2626] text-base leading-none mt-0.5 flex-shrink-0">2</span>
                        <span className="text-xs text-[#0d0d0d]/70 leading-relaxed">
                            Wähle <strong className="font-black text-[#0d0d0d]">„Zum Home-Bildschirm"</strong>
                        </span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="ink-headline text-[#dc2626] text-base leading-none mt-0.5 flex-shrink-0">3</span>
                        <span className="text-xs text-[#0d0d0d]/70 leading-relaxed">
                            Tippe oben rechts auf <strong className="font-black text-[#0d0d0d]">„Hinzufügen"</strong>
                        </span>
                    </li>
                </ol>
            </Wrapper>
        )
    }

    // ── iOS Chrome — redirect to Safari ──────────────────────────────────────
    if (installState.type === 'ios-chrome') {
        return (
            <Wrapper onDismiss={dismiss}>
                <p className="text-xs text-[#0d0d0d]/70 leading-relaxed mb-4">
                    Chrome auf iOS kann keine PWAs installieren.
                    Öffne diese Seite in <strong className="font-black text-[#0d0d0d]">Safari</strong>, um die App zum Home-Bildschirm hinzuzufügen.
                </p>
                <button
                    onClick={() => {
                        window.open(window.location.href, '_blank')
                        dismiss()
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-[#0d0d0d] text-white ink-headline text-xs tracking-[0.15em] py-2.5 border-[3px] border-[#0d0d0d] shadow-[4px_4px_0_0_#dc2626] hover:bg-[#dc2626] transition-colors"
                >
                    <ExternalLink className="w-4 h-4" /> In Safari öffnen
                </button>
            </Wrapper>
        )
    }

    return null
}
