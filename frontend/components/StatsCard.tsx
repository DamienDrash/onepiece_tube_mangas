import { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

interface StatsCardProps {
    title: string
    value: number
    icon: LucideIcon
    gradient: string
    loading?: boolean
}

export default function StatsCard({ title, value, icon: Icon, gradient, loading }: StatsCardProps) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
                    {loading ? (
                        <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                    ) : (
                        <p className="text-2xl font-bold text-gray-900">
                            {value.toLocaleString('de-DE')}
                        </p>
                    )}
                </div>
                <div className={clsx('w-12 h-12 rounded-lg flex items-center justify-center', gradient)}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
            </div>
        </div>
    )
}
