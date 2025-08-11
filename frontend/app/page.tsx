'use client'

import { useState } from 'react'
import { useQuery } from 'react-query'
import { Download, Book, Globe, ChevronRight, Search, Filter } from 'lucide-react'
import ChapterCard from '@/components/ChapterCard'
import LoadingCard from '@/components/LoadingCard'
import StatsCard from '@/components/StatsCard'
import { apiService } from '@/lib/api'

export default function Home() {
    const [searchTerm, setSearchTerm] = useState('')
    const [filterDownloaded, setFilterDownloaded] = useState<'all' | 'downloaded' | 'available'>('all')

    // Fetch downloaded chapters
    const { data: downloadedChapters = [], isLoading: loadingDownloaded } = useQuery(
        'downloaded-chapters',
        apiService.getDownloadedChapters,
        {
            refetchOnWindowFocus: true,
        }
    )

    // Fetch available chapters
    const { data: availableData, isLoading: loadingAvailable } = useQuery(
        'available-chapters',
        apiService.getAvailableChapters,
        {
            refetchOnWindowFocus: false,
            staleTime: 10 * 60 * 1000, // 10 minutes
        }
    )

    // Fetch latest chapter
    const { data: latestData } = useQuery(
        'latest-chapter',
        apiService.getLatestChapter,
        {
            refetchOnWindowFocus: false,
            staleTime: 5 * 60 * 1000, // 5 minutes
        }
    )

    const availableChapters = availableData?.chapters || []
    const downloadedChapterNumbers = new Set(downloadedChapters.map(ch => ch.chapter))

    // Filter and search logic
    const filteredChapters = availableChapters.filter(chapter => {
        const matchesSearch = searchTerm === '' ||
            chapter.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            chapter.number.toString().includes(searchTerm)

        if (!matchesSearch) return false

        switch (filterDownloaded) {
            case 'downloaded':
                return downloadedChapterNumbers.has(chapter.number)
            case 'available':
                return !downloadedChapterNumbers.has(chapter.number) && chapter.available
            default:
                return true
        }
    })

    const stats = {
        total: availableChapters.length,
        downloaded: downloadedChapters.length,
        latest: latestData?.latest || 0,
        available: availableChapters.filter(ch => ch.available).length
    }

    return (
        <div className="space-y-8">
            {/* Hero Section */}
            <div className="text-center py-12 px-4">
                <div className="flex flex-col items-center mb-6">
                    <img 
                        src="/onepiece-title-logo.png" 
                        alt="One Piece Logo" 
                        className="h-24 md:h-32 object-contain mb-4"
                    />
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full gradient-pirate shadow-lg">
                        <Book className="w-8 h-8 text-white" />
                    </div>
                </div>
                <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
                    <span className="gradient-pirate bg-clip-text text-transparent">Offline Reader</span>
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                    Deine liebsten One Piece Kapitel offline verfügbar machen.
                    Automatischer Download neuer Kapitel und EPUB-Export für alle Geräte.
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Verfügbare Kapitel"
                    value={stats.available}
                    icon={Globe}
                    gradient="gradient-ocean"
                    loading={loadingAvailable}
                />
                <StatsCard
                    title="Heruntergeladen"
                    value={stats.downloaded}
                    icon={Download}
                    gradient="gradient-pirate"
                    loading={loadingDownloaded}
                />
                <StatsCard
                    title="Neuestes Kapitel"
                    value={stats.latest}
                    icon={Book}
                    gradient="gradient-treasure"
                    loading={loadingAvailable}
                />
                <StatsCard
                    title="Gesamt"
                    value={stats.total}
                    icon={ChevronRight}
                    gradient="from-purple-500 to-pink-500"
                    loading={loadingAvailable}
                />
            </div>

            {/* Search and Filter Controls */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Kapitel suchen..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="text-gray-400 w-5 h-5" />
                        <select
                            value={filterDownloaded}
                            onChange={(e) => setFilterDownloaded(e.target.value as any)}
                            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                            <option value="all">Alle Kapitel</option>
                            <option value="downloaded">Heruntergeladen</option>
                            <option value="available">Verfügbar</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Chapter List */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">
                        Kapitel ({filteredChapters.length})
                    </h2>
                </div>

                <div className="grid gap-4">
                    {(loadingAvailable || loadingDownloaded) ? (
                        // Loading state
                        Array.from({ length: 6 }).map((_, i) => (
                            <LoadingCard key={i} />
                        ))
                    ) : filteredChapters.length === 0 ? (
                        // Empty state
                        <div className="text-center py-12">
                            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                                <Search className="w-12 h-12 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Keine Kapitel gefunden
                            </h3>
                            <p className="text-gray-500">
                                Versuche einen anderen Suchbegriff oder ändere den Filter.
                            </p>
                        </div>
                    ) : (
                        // Chapter list
                        filteredChapters.map((chapter) => (
                            <ChapterCard
                                key={chapter.number}
                                chapter={chapter}
                                isDownloaded={downloadedChapterNumbers.has(chapter.number)}
                                downloadedChapter={downloadedChapters.find(dc => dc.chapter === chapter.number)}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
