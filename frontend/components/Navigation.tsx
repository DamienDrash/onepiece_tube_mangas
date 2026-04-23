'use client'

import Link from 'next/link'
import { Book, Download, Settings } from 'lucide-react'
import { useQuery } from 'react-query'
import { apiService } from '@/lib/api'

const navItems = [
    { href: '/',          label: 'ARCHIVE',  icon: Book },
    { href: '/downloads', label: 'VAULT',    icon: Download },
    { href: '/settings',  label: 'SYSTEM',   icon: Settings },
]

export default function Navigation() {
    const { data, isError, isLoading } = useQuery(
        'health-check',
        apiService.healthCheck,
        { refetchInterval: 30000, retry: 2 }
    )

    const statusColor = isLoading
        ? 'bg-amber-400 animate-pulse'
        : isError
        ? 'bg-[#dc2626]'
        : 'bg-green-500'

    return (
        <nav className="fixed top-0 left-0 right-0 z-[100] bg-white border-b-[5px] border-[#0d0d0d]"
             style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
            {/* Thin halftone strip at very top */}
            <div className="h-[6px] halftone bg-[#0d0d0d] opacity-100" />

            <div className="container mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
                {/* Brand */}
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-[#0d0d0d] border-[3px] border-[#0d0d0d] flex items-center justify-center flex-shrink-0"
                         style={{ boxShadow: '3px 3px 0 0 #dc2626', transform: 'rotate(-4deg)' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/op/onepiece-logo.png"
                            alt="Straw Hat"
                            className="w-7 h-7 md:w-9 md:h-9 object-contain drop-shadow-sm"
                        />
                    </div>
                    <div>
                        <div className="ink-headline text-xl md:text-2xl leading-none">GRAND LINE</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="h-[2px] bg-[#dc2626] flex-1" />
                            <span className="text-[8px] font-black tracking-[0.25em] uppercase text-[#0d0d0d]/60 whitespace-nowrap">
                                OFFLINE READER
                            </span>
                        </div>
                    </div>
                </Link>

                {/* Desktop nav */}
                <div className="hidden md:flex items-center gap-1">
                    {navItems.map(({ href, label }) => (
                        <Link
                            key={href}
                            href={href}
                            className="ink-headline text-sm px-5 py-2 tracking-[0.15em] border-[3px] border-transparent hover:border-[#0d0d0d] hover:bg-[#0d0d0d] hover:text-white transition-colors duration-100"
                        >
                            {label}
                        </Link>
                    ))}

                    {/* Status indicator */}
                    <div className="ml-4 flex items-center gap-2 border-[3px] border-[#0d0d0d] px-4 py-2 bg-[#fafaf8]"
                         style={{ boxShadow: '3px 3px 0 0 #0d0d0d' }}>
                        <div className={`w-2.5 h-2.5 rounded-full border-[2px] border-[#0d0d0d] ${statusColor}`} />
                        <span className="ink-headline text-[10px] tracking-[0.2em]">
                            {isError ? 'OFFLINE' : 'LINKED'}
                        </span>
                    </div>
                </div>

                {/* Mobile status dot only */}
                <div className="md:hidden flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full border-[2px] border-[#0d0d0d] ${statusColor}`} />
                </div>
            </div>
        </nav>
    )
}
