'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Book, Download, Settings } from 'lucide-react'

const navItems = [
    { href: '/', label: 'ARCHIV', icon: Book },
    { href: '/downloads', label: 'VAULT', icon: Download },
    { href: '/settings', label: 'SYSTEM', icon: Settings },
]

export default function BottomNav() {
    const pathname = usePathname()

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white border-t-[4px] border-black bottom-nav-safe">
            <div className="flex items-stretch h-16">
                {navItems.map(({ href, label, icon: Icon }) => {
                    const active =
                        href === '/'
                            ? pathname === '/' || pathname === '/op'
                            : pathname.startsWith(href)
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`flex-1 flex flex-col items-center justify-center gap-1 text-[9px] font-black tracking-widest transition-colors active:scale-95
                                ${active
                                    ? 'bg-red-600 text-white'
                                    : 'text-black hover:bg-gray-50'
                                }`}
                        >
                            <Icon className="w-5 h-5" />
                            <span>{label}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
