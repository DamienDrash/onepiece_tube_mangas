'use client'

import { useState } from 'react'
import { Book, Download, Settings, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useQuery } from 'react-query'
import { apiService } from '@/lib/api'

export default function Navigation() {
    const [isOpen, setIsOpen] = useState(false)

    // Health check to show connection status
    const { data: healthData, isError } = useQuery(
        'health-check',
        apiService.healthCheck,
        {
            refetchInterval: 60000, // Check every minute
            retry: false,
        }
    )

    const navItems = [
        { href: '/', label: 'Dashboard', icon: Book },
        { href: '/downloads', label: 'Downloads', icon: Download },
        { href: '/settings', label: 'Einstellungen', icon: Settings },
    ]

    return (
        <nav className="bg-white shadow-sm border-b border-gray-200">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg gradient-pirate flex items-center justify-center">
                            <Book className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-gray-900">One Piece Offline</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-8">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors duration-200"
                            >
                                <item.icon className="w-4 h-4" />
                                <span>{item.label}</span>
                            </Link>
                        ))}

                        {/* Connection Status */}
                        <div className="flex items-center space-x-2">
                            <div
                                className={`w-2 h-2 rounded-full ${isError ? 'bg-red-500' : 'bg-green-500'
                                    }`}
                            />
                            <span className="text-sm text-gray-500">
                                {isError ? 'Offline' : 'Online'}
                            </span>
                        </div>
                    </div>

                    {/* Mobile menu button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden p-2 rounded-lg text-gray-600 hover:text-red-600 hover:bg-gray-100 transition-colors duration-200"
                    >
                        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {/* Mobile Navigation */}
                {isOpen && (
                    <div className="md:hidden py-4 border-t border-gray-200">
                        <div className="space-y-2">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                                >
                                    <item.icon className="w-4 h-4" />
                                    <span>{item.label}</span>
                                </Link>
                            ))}

                            {/* Mobile Connection Status */}
                            <div className="flex items-center space-x-2 px-4 py-2">
                                <div
                                    className={`w-2 h-2 rounded-full ${isError ? 'bg-red-500' : 'bg-green-500'
                                        }`}
                                />
                                <span className="text-sm text-gray-500">
                                    Backend: {isError ? 'Offline' : 'Online'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    )
}
