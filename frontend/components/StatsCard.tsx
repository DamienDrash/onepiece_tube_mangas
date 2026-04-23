'use client'

import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
    title: string
    value: string | number
    icon: LucideIcon
    loading?: boolean
}

export default function StatsCard({ title, value, icon: Icon, loading }: StatsCardProps) {
    return (
        <div className="wanted-card flex flex-col items-center justify-center text-center p-4 relative">
            {/* Corner crop marks */}
            <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-[3px] border-l-[3px] border-[#0d0d0d]/30" />
            <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-[3px] border-r-[3px] border-[#0d0d0d]/30" />
            <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-[3px] border-l-[3px] border-[#0d0d0d]/30" />
            <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-[3px] border-r-[3px] border-[#0d0d0d]/30" />

            <span className="ink-headline text-[9px] text-[#8d6530] tracking-[0.25em] mb-2">
                MARINES INTEL
            </span>

            <div className="w-10 h-10 border-[3px] border-[#0d0d0d]/20 bg-[#0d0d0d]/5 flex items-center justify-center mb-2">
                <Icon className="w-5 h-5 text-[#5d3a1a]" />
            </div>

            {loading ? (
                <div className="h-9 w-20 bg-[#0d0d0d]/10 animate-pulse mb-1" />
            ) : (
                <div className="ink-headline text-3xl md:text-4xl text-[#2d1a0a] leading-none mb-1">
                    {value}
                </div>
            )}

            <div className="ink-headline text-[9px] text-[#8d6530] tracking-[0.2em] mt-1">
                {title}
            </div>
        </div>
    )
}
