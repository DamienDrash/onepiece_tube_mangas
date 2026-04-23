'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from 'react-query'
import { Download, BookOpen, FileText, BookOpenCheck } from 'lucide-react'
import Link from 'next/link'
import { apiService, type AvailableChapter, type Chapter } from '@/lib/api'
import clsx from 'clsx'

interface ChapterCardProps {
    chapter: AvailableChapter
    isDownloaded: boolean
    downloadedChapter?: Chapter
    angle?: string
}

export default function ChapterCard({ chapter, isDownloaded, downloadedChapter, angle = '' }: ChapterCardProps) {
    const [isDownloading, setIsDownloading] = useState(false)
    const queryClient = useQueryClient()

    const downloadMutation = useMutation(
        () => apiService.downloadChapter(chapter.number),
        {
            onMutate: () => setIsDownloading(true),
            onSuccess: () => queryClient.invalidateQueries('downloaded-chapters'),
            onError: (error: any) => alert(`Download fehlgeschlagen: ${error.message}`),
            onSettled: () => setIsDownloading(false),
        }
    )

    return (
        <article className={clsx(
            'panel panel-hover group',
            angle,
            !chapter.available && 'opacity-40 pointer-events-none grayscale'
        )}>
            {/* ── Panel header strip ── */}
            <div className="flex items-stretch border-b-[4px] border-[#0d0d0d] relative overflow-hidden">
                {/* Halftone texture on header */}
                <div className="absolute inset-0 halftone opacity-[0.06] pointer-events-none" />

                {/* Chapter badge */}
                <div className="bg-[#dc2626] border-r-[4px] border-[#0d0d0d] px-4 py-2 flex items-center gap-2 relative z-10 flex-shrink-0">
                    <span className="ink-headline text-white text-base tracking-[0.1em]">
                        第<span className="text-xl mx-0.5">{chapter.number}</span>話
                    </span>
                </div>

                {/* Header info */}
                <div className="flex-1 bg-[#0d0d0d] px-4 py-2 flex items-center justify-between relative z-10">
                    <span className="text-[#fafaf8]/60 text-[10px] font-black tracking-[0.25em] uppercase">
                        {chapter.date || 'GRAND LINE'}
                    </span>
                    {isDownloaded && (
                        <span className="status-badge bg-[#4ade80] text-[#0d0d0d]">
                            ✓ GESICHERT
                        </span>
                    )}
                </div>
            </div>

            {/* ── Panel body ── */}
            <div className="p-5 md:p-6 flex flex-col sm:flex-row sm:items-end justify-between gap-5">
                <div className="space-y-3 min-w-0">
                    <h3 className="ink-headline text-2xl md:text-3xl group-hover:text-[#dc2626] transition-colors duration-150 leading-tight">
                        {chapter.title}
                    </h3>
                    <div className="ink-rule-red w-16" />
                    <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                        <span className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-[#0d0d0d]" />
                            {chapter.pages} Seiten
                        </span>
                        <span className="flex items-center gap-1.5 text-[#dc2626]">
                            ◆ One Piece Archiv
                        </span>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex-shrink-0 flex items-center gap-2">
                    {isDownloaded ? (
                        <>
                            <Link
                                href={`/read/${chapter.number}`}
                                onClick={(e) => e.stopPropagation()}
                                className="panel-sm bg-[#dc2626] text-white px-5 py-3 ink-headline text-sm tracking-[0.15em] flex items-center gap-2 hover:bg-[#b91c1c] transition-colors duration-150 whitespace-nowrap"
                            >
                                <BookOpenCheck className="w-4 h-4" /> Lesen
                            </Link>
                            <button
                                onClick={() => window.open(apiService.getEpubDownloadUrl(chapter.number), '_blank')}
                                className="panel-sm bg-[#0d0d0d] text-white px-4 py-3 ink-headline text-sm tracking-[0.1em] flex items-center gap-2 hover:bg-[#333] transition-colors duration-150 whitespace-nowrap"
                                title="Als EPUB herunterladen"
                            >
                                <BookOpen className="w-4 h-4" />
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => downloadMutation.mutate()}
                            disabled={isDownloading}
                            className="panel-sm bg-[#0d0d0d] text-white px-6 py-3 ink-headline text-sm tracking-[0.15em] flex items-center gap-2 hover:bg-[#dc2626] transition-colors duration-150 disabled:opacity-50 whitespace-nowrap"
                        >
                            {isDownloading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Lädt…
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4" /> Sichern
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Screentone corner accent */}
            <div className="absolute bottom-0 right-0 w-24 h-24 halftone opacity-[0.04] pointer-events-none" />
        </article>
    )
}
