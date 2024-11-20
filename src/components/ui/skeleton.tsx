import React from "react"

const SkeletonLoader = () => {
  return (
    <div className="w-full max-w-3xl mx-auto p-6 space-y-8">
      {/* Problem Statement Section */}
      <div className="space-y-4">
        <div className="text-lg font-medium text-gray-700">
          Problem Statement:
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full animate-pulse"></div>
          <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full animate-pulse w-3/4"></div>
        </div>
      </div>

      {/* Solution Section */}
      <div className="space-y-4">
        <div className="text-lg font-medium text-gray-700">Solution:</div>
        <div className="space-y-3">
          <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full animate-pulse"></div>
          <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full animate-pulse"></div>
          <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full animate-pulse w-5/6"></div>
          <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full animate-pulse w-4/5"></div>
        </div>
      </div>

      {/* Test Cases Section */}
      <div className="space-y-4">
        <div className="text-lg font-medium text-gray-700">Test Cases:</div>
        <div className="space-y-3">
          <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full animate-pulse"></div>
          <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full animate-pulse w-2/3"></div>
          <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full animate-pulse w-3/4"></div>
        </div>
      </div>

      <style jsx>{`
        @keyframes wave {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        .animate-pulse {
          background-size: 200% 100%;
          animation: wave 2s infinite linear;
        }
      `}</style>
    </div>
  )
}

export default SkeletonLoader
