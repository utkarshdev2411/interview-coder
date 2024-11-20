const SkeletonLoader = () => {
  const skeletonLine =
    "h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full animate-shimmer bg-[length:400%_100%]"

  return (
    <div className="w-full max-w-3xl mx-auto p-6 space-y-8">
      {/* Problem Statement Section */}
      <div className="space-y-4">
        <div className="text-lg font-medium text-gray-200">
          Problem Statement:
        </div>
        <div className="space-y-3">
          <div className={`${skeletonLine}`}></div>
          <div className={`${skeletonLine} w-3/4`}></div>
        </div>
      </div>

      {/* Solution Section */}
      <div className="space-y-4">
        <div className="text-lg font-medium text-gray-200">Solution:</div>
        <div className="space-y-3">
          <div className={`${skeletonLine}`}></div>
          <div className={`${skeletonLine}`}></div>
          <div className={`${skeletonLine} w-5/6`}></div>
          <div className={`${skeletonLine} w-4/5`}></div>
        </div>
      </div>

      {/* Test Cases Section */}
      <div className="space-y-4">
        <div className="text-lg font-medium text-gray-200">Test Cases:</div>
        <div className="space-y-3">
          <div className={`${skeletonLine}`}></div>
          <div className={`${skeletonLine} w-2/3`}></div>
          <div className={`${skeletonLine} w-3/4`}></div>
        </div>
      </div>
    </div>
  )
}

export default SkeletonLoader
