'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from 'react-query'
import { Download, BookOpen, CheckCircle, AlertCircle, Clock, FileText } from 'lucide-react'
import { apiService, type AvailableChapter, type Chapter } from '@/lib/api'
import clsx from 'clsx'

interface ChapterCardProps {
    chapter: AvailableChapter
    isDownloaded: boolean
    downloadedChapter?: Chapter
}

export default function ChapterCard({ chapter, isDownloaded, downloadedChapter }: ChapterCardProps) {
    const [isDownloading, setIsDownloading] = useState(false)
    const queryClient = useQueryClient()

    const downloadMutation = useMutation(
        () => apiService.downloadChapter(chapter.number),
        {
            onMutate: () => {
                setIsDownloading(true)
            },
            onSuccess: () => {
                queryClient.invalidateQueries('downloaded-chapters')
            },
            onError: (error: any) => {
                console.error('Download failed:', error)
                alert(`Download fehlgeschlagen: ${error.message}`)
            },
            onSettled: () => {
                setIsDownloading(false)
            },
        }
    )

    const handleDownload = () => {
        if (!isDownloading && !isDownloaded) {
            downloadMutation.mutate()
        }
    }

    const handleEpubDownload = () => {
        if (isDownloaded) {
            const url = apiService.getEpubDownloadUrl(chapter.number)
            window.open(url, '_blank')
        }
    }

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('de-DE', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            })
        } catch {
            return dateString
        }
    }

    return (
        <div
            className={clsx(
                'bg-white rounded-xl shadow-sm border transition-all duration-200 hover:shadow-md',
                isDownloaded ? 'border-green-200 bg-green-50/30' : 'border-gray-200',
                !chapter.available && 'opacity-60'
            )}
        >
            <div className="p-6">
                <div className="flex items-start justify-between">
                    {/* Chapter Info */}
                    <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                                Kapitel {chapter.number}
                            </span>
                            {isDownloaded && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Heruntergeladen
                                </span>
                            )}
                            {!chapter.available && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Nicht verfügbar
                                </span>
                            )}
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {chapter.title}
                        </h3>

                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                                <Clock className="w-4 h-4" />
                                <span>{formatDate(chapter.date)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <FileText className="w-4 h-4" />
                                <span>{isDownloaded ? downloadedChapter?.pages : chapter.pages} Seiten</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                        {isDownloaded ? (
                            <div className="flex space-x-2">
                                <button
                                    onClick={handleEpubDownload}
                                    className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200"
                                >
                                    <BookOpen className="w-4 h-4 mr-2" />
                                    EPUB öffnen
                                </button>
                            </div>
                        ) : chapter.available ? (
                            <button
                                onClick={handleDownload}
                                disabled={isDownloading}
                                className={clsx(
                                    'inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
                                    isDownloading
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-red-600 text-white hover:bg-red-700'
                                )}
                            >
                                {isDownloading ? (
                                    <>
                                        <div className="w-4 h-4 mr-2 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                        Herunterladen...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4 mr-2" />
                                        Herunterladen
                                    </>
                                )}
                            </button>
                        ) : (
                            <div className="text-sm text-gray-400 px-4 py-2">
                                Nicht verfügbar
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
