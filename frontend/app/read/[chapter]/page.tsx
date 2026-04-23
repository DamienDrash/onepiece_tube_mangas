'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCw, Loader2 } from 'lucide-react'
import { apiService } from '@/lib/api'

const API_KEY = process.env.NEXT_PUBLIC_API_KEY || ''
const PAGE_KEY = (ch: number) => `reader-page-${ch}`

// ── Image loader: fetch with auth header, return blob URL ─────────────────────
function usePageBlob(chapter: number, pageIndex: number, enabled: boolean) {
    const [src, setSrc]       = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [error, setError]   = useState(false)
    const urlRef = useRef<string>('')

    useEffect(() => {
        if (!enabled) return
        let cancelled = false

        setSrc('')
        setLoading(true)
        setError(false)

        fetch(apiService.getChapterPageUrl(chapter, pageIndex), {
            headers: { 'X-API-Key': API_KEY },
        })
            .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.blob() })
            .then(blob => {
                if (cancelled) return
                const url = URL.createObjectURL(blob)
                urlRef.current = url
                setSrc(url)
            })
            .catch(() => { if (!cancelled) setError(true) })
            .finally(() => { if (!cancelled) setLoading(false) })

        return () => {
            cancelled = true
            if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = '' }
        }
    }, [chapter, pageIndex, enabled])

    return { src, loading, error }
}

// ── Single rendered page ──────────────────────────────────────────────────────
function PageSlide({
    chapter, pageIndex, active, preload,
    onRetry,
}: {
    chapter: number; pageIndex: number; active: boolean; preload: boolean
    onRetry: () => void
}) {
    const { src, loading, error } = usePageBlob(chapter, pageIndex, active || preload)

    return (
        <div
            className="absolute inset-0 flex items-center justify-center transition-opacity duration-200"
            style={{ opacity: active ? 1 : 0, pointerEvents: active ? 'auto' : 'none' }}
        >
            {loading && active && (
                <Loader2 className="w-10 h-10 text-white/50 animate-spin" />
            )}
            {error && active && (
                <div className="flex flex-col items-center gap-4 text-white/60">
                    <span className="ink-headline text-xl">Ladefehler</span>
                    <button onClick={onRetry} className="flex items-center gap-2 text-sm border border-white/20 px-4 py-2 hover:bg-white/10 transition-colors">
                        <RotateCw className="w-4 h-4" /> Erneut versuchen
                    </button>
                </div>
            )}
            {src && (
                <img
                    src={src}
                    alt={`Seite ${pageIndex + 1}`}
                    className="max-h-full max-w-full object-contain select-none"
                    draggable={false}
                />
            )}
        </div>
    )
}

// ── Main reader ───────────────────────────────────────────────────────────────
export default function ReaderPage({ params }: { params: { chapter: string } }) {
    const chapter    = parseInt(params.chapter, 10)
    const router     = useRouter()

    const [pageCount, setPageCount] = useState(0)
    const [currentPage, setCurrentPage] = useState(0)
    const [title, setTitle]         = useState(`Kapitel ${chapter}`)
    const [uiVisible, setUiVisible] = useState(true)
    const [retryKey, setRetryKey]   = useState(0)
    const [loadError, setLoadError] = useState(false)

    const uiTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
    const touchStartX = useRef(0)
    const touchStartY = useRef(0)

    // ── Load chapter metadata ────────────────────────────────────────────────
    useEffect(() => {
        apiService.getChapterPages(chapter)
            .then(data => {
                setPageCount(data.count)
                const saved = localStorage.getItem(PAGE_KEY(chapter))
                const start = saved ? Math.min(parseInt(saved, 10), data.count - 1) : 0
                setCurrentPage(start)
            })
            .catch(() => setLoadError(true))
    }, [chapter, retryKey])

    // ── Load chapter title from downloaded list ──────────────────────────────
    useEffect(() => {
        apiService.getDownloadedChapters().then(chapters => {
            const ch = chapters.find(c => c.chapter === chapter)
            if (ch) setTitle(ch.title || `Kapitel ${chapter}`)
        }).catch(() => {})
    }, [chapter])

    // ── Persist last page ────────────────────────────────────────────────────
    useEffect(() => {
        if (pageCount > 0) localStorage.setItem(PAGE_KEY(chapter), String(currentPage))
    }, [chapter, currentPage, pageCount])

    // ── UI auto-hide ─────────────────────────────────────────────────────────
    const resetUiTimer = useCallback(() => {
        setUiVisible(true)
        if (uiTimerRef.current) clearTimeout(uiTimerRef.current)
        uiTimerRef.current = setTimeout(() => setUiVisible(false), 3500)
    }, [])

    useEffect(() => {
        resetUiTimer()
        return () => { if (uiTimerRef.current) clearTimeout(uiTimerRef.current) }
    }, [resetUiTimer])

    // ── Navigation ───────────────────────────────────────────────────────────
    const goTo = useCallback((idx: number) => {
        if (idx < 0 || idx >= pageCount) return
        setCurrentPage(idx)
        resetUiTimer()
    }, [pageCount, resetUiTimer])

    const nextPage = useCallback(() => goTo(currentPage + 1), [currentPage, goTo])
    const prevPage = useCallback(() => goTo(currentPage - 1), [currentPage, goTo])

    // Keyboard
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown')  nextPage()
            if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')    prevPage()
            if (e.key === 'Escape') router.back()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [nextPage, prevPage, router])

    // Touch swipe
    const onTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX
        touchStartY.current = e.touches[0].clientY
    }
    const onTouchEnd = (e: React.TouchEvent) => {
        const dx = e.changedTouches[0].clientX - touchStartX.current
        const dy = e.changedTouches[0].clientY - touchStartY.current
        if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return // tap
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx < -30) nextPage()
            else if (dx > 30) prevPage()
        }
    }

    // Tap zones
    const onTap = (e: React.MouseEvent) => {
        const x = e.clientX / window.innerWidth
        if (x < 0.33) prevPage()
        else if (x > 0.67) nextPage()
        else { setUiVisible(v => !v); if (uiTimerRef.current) clearTimeout(uiTimerRef.current) }
        resetUiTimer()
    }

    const progress = pageCount > 0 ? ((currentPage + 1) / pageCount) * 100 : 0

    // ── Error state ──────────────────────────────────────────────────────────
    if (loadError) {
        return (
            <div className="fixed inset-0 z-[200] bg-[#0d0d0d] flex flex-col items-center justify-center gap-6 text-white">
                <div className="sfx-don text-5xl opacity-30">エラー!</div>
                <p className="ink-headline text-xl">Kapitel nicht gefunden</p>
                <p className="text-sm text-white/50">Kapitel {chapter} ist nicht heruntergeladen.</p>
                <div className="flex gap-3">
                    <button onClick={() => router.back()} className="panel-sm bg-white text-[#0d0d0d] px-6 py-2 ink-headline text-sm tracking-widest">
                        ← Zurück
                    </button>
                    <button onClick={() => { setLoadError(false); setRetryKey(k => k + 1) }}
                        className="panel-sm bg-[#dc2626] text-white px-6 py-2 ink-headline text-sm tracking-widest">
                        Retry
                    </button>
                </div>
            </div>
        )
    }

    // ── Loading skeleton ─────────────────────────────────────────────────────
    if (pageCount === 0) {
        return (
            <div className="fixed inset-0 z-[200] bg-[#0d0d0d] flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-white/30 animate-spin" />
            </div>
        )
    }

    return (
        <div
            className="fixed inset-0 z-[200] bg-[#0d0d0d] overflow-hidden cursor-pointer"
            onMouseMove={resetUiTimer}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onClick={onTap}
        >
            {/* ── Progress bar ── */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-white/10 z-10">
                <div
                    className="h-full bg-[#dc2626] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* ── Header ── */}
            <div
                className="absolute top-0 left-0 right-0 z-10 transition-all duration-300"
                style={{ transform: uiVisible ? 'translateY(0)' : 'translateY(-100%)' }}
            >
                <div className="flex items-center gap-3 bg-gradient-to-b from-black/90 to-transparent px-4 pt-3 pb-8">
                    <button
                        onClick={(e) => { e.stopPropagation(); router.back() }}
                        className="p-2 hover:bg-white/10 transition-colors flex-shrink-0"
                        aria-label="Zurück"
                    >
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-black tracking-[0.25em] text-white/50 uppercase">
                            Kapitel {chapter}
                        </div>
                        <div className="text-sm font-black text-white truncate uppercase tracking-wide">
                            {title}
                        </div>
                    </div>
                    <div className="flex-shrink-0 text-[11px] font-black tracking-[0.2em] text-white/50 uppercase">
                        {currentPage + 1} / {pageCount}
                    </div>
                </div>
            </div>

            {/* ── Pages ── */}
            <div className="absolute inset-0 flex items-center justify-center">
                {/* Render current ± 1 for preloading */}
                {pageCount > 0 && [-1, 0, 1].map(offset => {
                    const idx = currentPage + offset
                    if (idx < 0 || idx >= pageCount) return null
                    return (
                        <PageSlide
                            key={`${retryKey}-${idx}`}
                            chapter={chapter}
                            pageIndex={idx}
                            active={offset === 0}
                            preload={offset !== 0}
                            onRetry={() => setRetryKey(k => k + 1)}
                        />
                    )
                })}
            </div>

            {/* ── Tap zone hints (visible while UI shown) ── */}
            {uiVisible && pageCount > 1 && (
                <>
                    {currentPage > 0 && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 p-4 pointer-events-none">
                            <div className="bg-black/40 p-2">
                                <ChevronLeft className="w-8 h-8 text-white/60" />
                            </div>
                        </div>
                    )}
                    {currentPage < pageCount - 1 && (
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 p-4 pointer-events-none">
                            <div className="bg-black/40 p-2">
                                <ChevronRight className="w-8 h-8 text-white/60" />
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ── Footer ── */}
            <div
                className="absolute bottom-0 left-0 right-0 z-10 transition-all duration-300"
                style={{ transform: uiVisible ? 'translateY(0)' : 'translateY(100%)' }}
            >
                <div className="flex items-center justify-between bg-gradient-to-t from-black/90 to-transparent px-4 pb-6 pt-8">
                    <button
                        onClick={(e) => { e.stopPropagation(); prevPage() }}
                        disabled={currentPage === 0}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 disabled:opacity-20 transition-colors ink-headline text-white text-sm tracking-[0.1em]"
                    >
                        <ChevronLeft className="w-4 h-4" /> ZURÜCK
                    </button>

                    {/* Page dots (max 9 visible) */}
                    <div className="flex items-center gap-1">
                        {pageCount <= 12 ? (
                            Array.from({ length: pageCount }).map((_, i) => (
                                <button
                                    key={i}
                                    onClick={(e) => { e.stopPropagation(); goTo(i) }}
                                    className={`rounded-full transition-all ${
                                        i === currentPage
                                            ? 'w-3 h-3 bg-[#dc2626]'
                                            : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'
                                    }`}
                                />
                            ))
                        ) : (
                            <span className="ink-headline text-white/60 text-sm tracking-widest">
                                {currentPage + 1} / {pageCount}
                            </span>
                        )}
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); nextPage() }}
                        disabled={currentPage === pageCount - 1}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 disabled:opacity-20 transition-colors ink-headline text-white text-sm tracking-[0.1em]"
                    >
                        WEITER <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
