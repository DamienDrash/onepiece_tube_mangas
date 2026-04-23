'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery } from 'react-query'
import { Book, Shield, Star, Zap, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import ChapterCard from '@/components/ChapterCard'
import LoadingCard from '@/components/LoadingCard'
import StatsCard from '@/components/StatsCard'
import { apiService } from '@/lib/api'
import { pushNotificationService } from '@/lib/push-notifications'

const ANGLES      = ['rotate-[-1deg]', 'rotate-[0.5deg]', 'rotate-[-0.5deg]', 'rotate-[1deg]']
const PER_PAGE_OPTIONS = [10, 25, 50, 100, 0] // 0 = Alle
const SESSION_KEY = 'archive-per-page'
const DEFAULT_PER = 25

function getStoredPerPage(): number {
    if (typeof sessionStorage === 'undefined') return DEFAULT_PER
    const v = sessionStorage.getItem(SESSION_KEY)
    if (!v) return DEFAULT_PER
    const n = parseInt(v, 10)
    return PER_PAGE_OPTIONS.includes(n) ? n : DEFAULT_PER
}

// ── Pagination bar ─────────────────────────────────────────────────────────────
function Pagination({
    page, total, onPage,
}: { page: number; total: number; onPage: (p: number) => void }) {
    if (total <= 1) return null

    const pages: (number | '…')[] = []
    if (total <= 7) {
        for (let i = 1; i <= total; i++) pages.push(i)
    } else {
        pages.push(1)
        if (page > 3) pages.push('…')
        for (let i = Math.max(2, page - 1); i <= Math.min(total - 1, page + 1); i++) pages.push(i)
        if (page < total - 2) pages.push('…')
        pages.push(total)
    }

    return (
        <div className="flex items-center justify-center gap-1 flex-wrap">
            <button
                disabled={page === 1}
                onClick={() => onPage(page - 1)}
                className="panel-sm p-2 bg-white hover:bg-[#0d0d0d] hover:text-white disabled:opacity-30 transition-colors"
                aria-label="Vorherige Seite"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>

            {pages.map((p, i) =>
                p === '…' ? (
                    <span key={`e${i}`} className="px-2 text-[#0d0d0d]/40 font-black select-none">…</span>
                ) : (
                    <button
                        key={p}
                        onClick={() => onPage(p as number)}
                        className={`panel-sm min-w-[2.5rem] py-2 ink-headline text-sm tracking-[0.1em] transition-colors ${
                            p === page
                                ? 'bg-[#dc2626] text-white border-[#dc2626]'
                                : 'bg-white hover:bg-[#0d0d0d] hover:text-white'
                        }`}
                    >
                        {p}
                    </button>
                )
            )}

            <button
                disabled={page === total}
                onClick={() => onPage(page + 1)}
                className="panel-sm p-2 bg-white hover:bg-[#0d0d0d] hover:text-white disabled:opacity-30 transition-colors"
                aria-label="Nächste Seite"
            >
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Home() {
    const [searchTerm,  setSearchTerm]  = useState('')
    const [filterMode,  setFilterMode]  = useState<'all' | 'downloaded' | 'available'>('all')
    const [currentPage, setCurrentPage] = useState(1)
    const [perPage,     setPerPage]     = useState(DEFAULT_PER)

    useEffect(() => { pushNotificationService.initialize() }, [])
    useEffect(() => { setPerPage(getStoredPerPage()) }, [])

    const { data: downloadedChapters = [], isLoading: loadingDownloaded } = useQuery(
        'downloaded-chapters', apiService.getDownloadedChapters,
        { refetchOnWindowFocus: true }
    )
    const { data: availableData, isLoading: loadingAvailable } = useQuery(
        'available-chapters', apiService.getAvailableChapters,
        { refetchOnWindowFocus: false, staleTime: 10 * 60 * 1000 }
    )
    const { data: latestData } = useQuery(
        'latest-chapter', apiService.getLatestChapter,
        { refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000 }
    )

    const availableChapters = availableData?.chapters || []
    const downloadedNums = useMemo(
        () => new Set(downloadedChapters.map((ch: any) => ch.chapter)),
        [downloadedChapters]
    )

    const filtered = useMemo(() => availableChapters.filter((ch: any) => {
        const matchSearch = !searchTerm ||
            ch.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ch.number.toString().includes(searchTerm)
        if (!matchSearch) return false
        if (filterMode === 'downloaded') return downloadedNums.has(ch.number)
        if (filterMode === 'available')  return !downloadedNums.has(ch.number) && ch.available
        return true
    }), [availableChapters, searchTerm, filterMode, downloadedNums])

    // Reset to page 1 whenever filter/search changes
    useEffect(() => { setCurrentPage(1) }, [searchTerm, filterMode])

    const totalPages = perPage === 0 ? 1 : Math.ceil(filtered.length / perPage)
    const paginated  = perPage === 0 ? filtered : filtered.slice((currentPage - 1) * perPage, currentPage * perPage)

    const handlePerPage = (val: number) => {
        setPerPage(val)
        setCurrentPage(1)
        sessionStorage.setItem(SESSION_KEY, String(val))
    }

    const stats = {
        total:      availableChapters.length,
        downloaded: downloadedChapters.length,
        latest:     latestData?.latest || 0,
    }

    return (
        <div className="space-y-10">

            {/* ── HERO ── */}
            <section className="relative">
                <div className="absolute top-[-28px] left-[-8px] text-6xl md:text-8xl select-none pointer-events-none z-20 sfx-don" aria-hidden="true">
                    ドン!!
                </div>
                <div className="panel panel-red speed-lines relative overflow-visible">
                    <div className="border-b-[4px] border-[#0d0d0d] bg-[#0d0d0d] flex items-center justify-between px-5 py-2">
                        <span className="ink-headline text-[#fafaf8] text-[11px] tracking-[0.3em]">グランドライン・アーカイブ</span>
                        <span className="ink-headline text-[#dc2626] text-[11px] tracking-[0.2em]">OFFLINE TREASURY</span>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-8 p-6 md:p-10">
                        <div className="relative flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/op/onepiece-title-logo.png" alt="One Piece" className="h-24 md:h-40 object-contain relative z-10" />
                            <div className="absolute inset-[-8px] halftone-red opacity-10 pointer-events-none" />
                        </div>
                        <div className="flex-1 space-y-4 text-center md:text-left">
                            <h1 className="ink-title text-5xl md:text-7xl">
                                THE <span className="text-[#dc2626]">GRAND</span><br />ARCHIVE
                            </h1>
                            <div className="ink-rule w-full max-w-xs mx-auto md:mx-0" />
                            <p className="ink-headline text-sm md:text-base tracking-[0.2em] text-[#0d0d0d]/60">
                                Offline Manga Treasury — v2.0
                            </p>
                        </div>
                        <div className="hidden md:block text-5xl select-none sfx-don opacity-40" aria-hidden="true">バン!</div>
                    </div>
                </div>
            </section>

            {/* ── STATS ── */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatsCard title="Kapitel gesamt" value={stats.total}      icon={Book}   loading={loadingAvailable} />
                <StatsCard title="Gesichert"       value={stats.downloaded} icon={Shield} loading={loadingDownloaded} />
                <StatsCard title="Letztes Signal"  value={stats.latest}    icon={Star}   loading={latestData === undefined} />
                <StatsCard title="Status"          value="SYNC"            icon={Zap}    loading={false} />
            </section>

            {/* ── SEARCH ── */}
            <section className="panel sticky top-[5.5rem] z-40">
                <div className="border-b-[4px] border-[#0d0d0d] bg-[#0d0d0d] px-5 py-2">
                    <span className="ink-headline text-[#fafaf8] text-[11px] tracking-[0.3em]">KAPITEL IDENTIFIZIEREN</span>
                </div>
                <div className="flex flex-col sm:flex-row">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#0d0d0d]/40" />
                        <input
                            type="text"
                            placeholder="Nummer oder Titel…"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-transparent outline-none font-black uppercase tracking-wider placeholder:text-[#0d0d0d]/30 text-base border-r-0 sm:border-r-[4px] border-b-[4px] sm:border-b-0 border-[#0d0d0d]"
                        />
                    </div>
                    <div className="flex items-center gap-2 px-4 py-3 bg-[#fafaf8]">
                        <Filter className="w-4 h-4 text-[#dc2626]" />
                        <select
                            value={filterMode}
                            onChange={(e) => setFilterMode(e.target.value as typeof filterMode)}
                            className="bg-transparent outline-none font-black uppercase tracking-wider text-sm cursor-pointer"
                        >
                            <option value="all">Alle</option>
                            <option value="downloaded">Gesichert</option>
                            <option value="available">Verfügbar</option>
                        </select>
                    </div>
                </div>
            </section>

            {/* ── CHAPTER LIST ── */}
            <section className="space-y-6">

                {/* ── Section header (graphic bug fixed: full border on count box) ── */}
                <div className="flex items-stretch">
                    <div className="panel-invert px-6 py-3 flex-shrink-0 flex items-center">
                        <span className="ink-headline text-[#fafaf8] text-lg md:text-xl tracking-[0.1em]">Archive Feed</span>
                    </div>
                    <div className="flex-1 border-y-[4px] border-[#0d0d0d] bg-[#0d0d0d]/5" />
                    <div className="panel px-5 py-3 flex items-center flex-shrink-0" style={{ marginLeft: 0, borderLeft: 'none' }}>
                        <span className="ink-headline text-[#dc2626] text-lg leading-none">
                            {filtered.length}<span className="text-[#0d0d0d] text-sm ml-1">話</span>
                        </span>
                    </div>
                </div>

                {/* ── Per-page selector + page info ── */}
                {!loadingAvailable && filtered.length > 0 && (
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#0d0d0d]/50">Anzeigen:</span>
                            <div className="flex gap-1">
                                {PER_PAGE_OPTIONS.map(n => (
                                    <button
                                        key={n}
                                        onClick={() => handlePerPage(n)}
                                        className={`panel-sm px-3 py-1.5 ink-headline text-xs tracking-[0.1em] transition-colors ${
                                            perPage === n
                                                ? 'bg-[#0d0d0d] text-white'
                                                : 'bg-white hover:bg-[#0d0d0d] hover:text-white'
                                        }`}
                                    >
                                        {n === 0 ? 'Alle' : n}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {perPage !== 0 && totalPages > 1 && (
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0d0d0d]/50">
                                Seite {currentPage} / {totalPages} &nbsp;·&nbsp; {filtered.length} Kapitel
                            </span>
                        )}
                    </div>
                )}

                {/* ── Cards ── */}
                <div className="grid gap-6">
                    {(loadingAvailable || loadingDownloaded) ? (
                        Array.from({ length: 5 }).map((_, i) => <LoadingCard key={i} />)
                    ) : filtered.length === 0 ? (
                        <div className="panel p-12 text-center speed-lines">
                            <div className="sfx-don text-5xl opacity-20 mb-4" aria-hidden="true">シーン…</div>
                            <p className="ink-headline text-2xl text-[#0d0d0d]/40">Keine Kapitel gefunden</p>
                        </div>
                    ) : (
                        paginated.map((chapter: any, i: number) => (
                            <ChapterCard
                                key={chapter.number}
                                chapter={chapter}
                                isDownloaded={downloadedNums.has(chapter.number)}
                                downloadedChapter={downloadedChapters.find((dc: any) => dc.chapter === chapter.number)}
                                angle={ANGLES[i % ANGLES.length]}
                            />
                        ))
                    )}
                </div>

                {/* ── Pagination bar ── */}
                {!loadingAvailable && filtered.length > 0 && perPage !== 0 && totalPages > 1 && (
                    <Pagination page={currentPage} total={totalPages} onPage={p => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
                )}

                {/* Footer SFX */}
                {!loadingAvailable && filtered.length > 0 && (currentPage === totalPages || perPage === 0) && (
                    <div className="flex justify-center pt-8 pb-4">
                        <span className="sfx-don text-6xl md:text-8xl opacity-10 rotate-12 select-none" aria-hidden="true">つづく</span>
                    </div>
                )}
            </section>
        </div>
    )
}
