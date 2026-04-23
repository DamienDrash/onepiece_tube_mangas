export default function LoadingCard() {
    return (
        <div className="panel animate-pulse">
            {/* Header strip skeleton */}
            <div className="flex items-stretch border-b-[4px] border-[#0d0d0d] h-12">
                <div className="w-28 bg-[#0d0d0d]/20 border-r-[4px] border-[#0d0d0d]" />
                <div className="flex-1 bg-[#0d0d0d]/10" />
            </div>
            {/* Body skeleton */}
            <div className="p-6 space-y-3">
                <div className="h-7 w-3/4 bg-[#0d0d0d]/10" />
                <div className="h-3 w-16 bg-[#dc2626]/20" />
                <div className="flex gap-4">
                    <div className="h-3 w-20 bg-[#0d0d0d]/10" />
                    <div className="h-3 w-24 bg-[#0d0d0d]/10" />
                </div>
            </div>
        </div>
    )
}
