import React from "react"

const LoadingSpinner: React.FC = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative">
        <div className="w-20 h-20 border-4 border-blue-200 rounded-full animate-spin border-t-blue-500"></div>
        <div className="mt-4 text-white text-center">Processing...</div>
      </div>
    </div>
  )
}

export default LoadingSpinner
