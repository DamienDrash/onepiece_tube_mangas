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
            <div className="text-center py-16 px-4 relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex flex-col items-center mb-8">
                        <div className="mb-6 transform hover:scale-105 transition-transform duration-300">
                            <img 
                                src="/onepiece-title-logo.png" 
                                alt="One Piece Logo" 
                                className="h-32 md:h-40 object-contain drop-shadow-lg"
                            />
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold mb-6">
                        <span className="gradient-pirate bg-clip-text text-transparent drop-shadow-lg">
                            Offline Reader
                        </span>
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto leading-relaxed font-medium">
                        Deine liebsten <span className="text-red-600 font-bold">One Piece</span> Kapitel offline verfügbar machen.
                        <br className="hidden md:block" />
                        <span className="text-orange-600">Automatischer Download</span> neuer Kapitel und 
                        <span className="text-blue-600">Export</span> in verschiedenen Formaten (EPUB, PDF, CBZ).
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 px-4">
                <div className="transform hover:scale-105 transition-all duration-300">
                    <StatsCard
                        title="Verfügbare Kapitel"
                        value={stats.available}
                        icon={Globe}
                        gradient="gradient-ocean"
                        loading={loadingAvailable}
                    />
                </div>
                <div className="transform hover:scale-105 transition-all duration-300">
                    <StatsCard
                        title="Heruntergeladen"
                        value={stats.downloaded}
                        icon={Download}
                        gradient="gradient-pirate"
                        loading={loadingDownloaded}
                    />
                </div>
                <div className="transform hover:scale-105 transition-all duration-300">
                    <StatsCard
                        title="Neuestes Kapitel"
                        value={stats.latest}
                        icon={Book}
                        gradient="gradient-treasure"
                        loading={loadingAvailable}
                    />
                </div>
                <div className="transform hover:scale-105 transition-all duration-300">
                    <StatsCard
                        title="Gesamt"
                        value={stats.total}
                        icon={ChevronRight}
                        gradient="from-purple-500 to-pink-500"
                        loading={loadingAvailable}
                    />
                </div>
            </div>

            {/* Search and Filter Controls */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 backdrop-blur-sm bg-white/90">
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                        <input
                            type="text"
                            placeholder="Kapitel suchen... (z.B. 'Wano', 'Gear 5', '1156')"
                            className="relative w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 text-lg text-gray-900 placeholder-gray-400 bg-gray-50 focus:bg-white shadow-inner"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-gray-600">
                            <Filter className="w-5 h-5" />
                            <span className="font-medium">Filter:</span>
                        </div>
                        <select
                            className="px-6 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 text-lg text-gray-900 bg-gray-50 focus:bg-white shadow-inner font-medium"
                            value={filterDownloaded}
                            onChange={(e) => setFilterDownloaded(e.target.value as any)}
                        >
                            <option value="all">🌍 Alle Kapitel</option>
                            <option value="downloaded">📥 Heruntergeladen</option>
                            <option value="available">🔍 Verfügbar</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Chapter List */}
            <div className="space-y-8">
                <div className="flex items-center justify-between px-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-3xl font-bold text-gray-900">
                            Kapitel
                        </h2>
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-200 rounded-full shadow-sm">
                            <span className="text-gray-800 font-bold text-lg">
                                {filteredChapters.length}
                            </span>
                            {filteredChapters.length !== availableChapters.length && (
                                <span className="text-gray-600 text-sm">
                                    von {availableChapters.length}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 px-4">
                    {(loadingAvailable || loadingDownloaded) ? (
                        // Loading state
                        Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="transform hover:scale-[1.02] transition-transform duration-300">
                                <LoadingCard />
                            </div>
                        ))
                    ) : filteredChapters.length === 0 ? (
                        // Empty state
                        <div className="text-center py-20">
                            <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-inner">
                                <Search className="w-16 h-16 text-gray-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">
                                Keine Kapitel gefunden
                            </h3>
                            <p className="text-xl text-gray-500 max-w-md mx-auto">
                                Versuche einen anderen Suchbegriff oder ändere den Filter.
                            </p>
                            <div className="mt-8 flex justify-center gap-2">
                                <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">Tipp: "Wano"</span>
                                <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">Tipp: "1156"</span>
                                <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">Tipp: "Gear"</span>
                            </div>
                        </div>
                    ) : (
                        // Chapter list
                        filteredChapters.map((chapter, index) => (
                            <div 
                                key={chapter.number} 
                                className="transform hover:scale-[1.02] transition-all duration-300"
                                style={{ 
                                    animationDelay: `${index * 50}ms`,
                                    animation: 'fadeInUp 0.6s ease-out forwards'
                                }}
                            >
                                <ChapterCard
                                    chapter={chapter}
                                    isDownloaded={downloadedChapterNumbers.has(chapter.number)}
                                    downloadedChapter={downloadedChapters.find(dc => dc.chapter === chapter.number)}
                                />
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
