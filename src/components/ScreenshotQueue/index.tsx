import React from "react"

interface Screenshot {
  path: string
  preview: string
}

interface ScreenshotQueueProps {
  screenshots: Screenshot[]
}

const ScreenshotQueue: React.FC<ScreenshotQueueProps> = ({ screenshots }) => {
  if (screenshots.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <p className="text-gray-500">No screenshots taken yet</p>
      </div>
    )
  }

  // Take up to the first 10 screenshots
  const displayScreenshots = screenshots.slice(0, 10)

  return (
    <div className="grid grid-cols-4 gap-4">
      {displayScreenshots.map((screenshot, index) => (
        <div
          key={index}
          className="relative bg-gray-100 rounded-lg overflow-hidden"
        >
          <img
            src={screenshot.preview}
            alt={`Screenshot ${index + 1}`}
            className="w-full h-48 object-cover"
          />
        </div>
      ))}
    </div>
  )
}

export default ScreenshotQueue
