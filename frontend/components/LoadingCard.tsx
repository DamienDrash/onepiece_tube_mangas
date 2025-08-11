export default function LoadingCard() {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    {/* Chapter number and status badges */}
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                        <div className="h-5 w-24 bg-gray-200 rounded-full"></div>
                    </div>

                    {/* Title */}
                    <div className="h-6 w-3/4 bg-gray-200 rounded mb-2"></div>

                    {/* Meta info */}
                    <div className="flex items-center space-x-4">
                        <div className="h-4 w-24 bg-gray-200 rounded"></div>
                        <div className="h-4 w-16 bg-gray-200 rounded"></div>
                    </div>
                </div>

                {/* Action button */}
                <div className="ml-4">
                    <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
                </div>
            </div>
        </div>
    )
}
