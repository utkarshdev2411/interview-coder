import React from "react"
import ScreenshotItem from "./ScreenshotItem"

interface Screenshot {
  path: string
  preview: string
}

interface ScreenshotQueueProps {
  screenshots: Screenshot[]
  onDeleteScreenshot: (index: number) => void
}
const ScreenshotQueue: React.FC<ScreenshotQueueProps> = ({
  screenshots,
  onDeleteScreenshot
}) => {
  if (screenshots.length === 0) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg">
        <p className="text-gray-500">No screenshots taken yet</p>
      </div>
    )
  }

  const displayScreenshots = screenshots.slice(0, 3)

  return (
    <div className="grid grid-cols-4 gap-4">
      {displayScreenshots.map((screenshot, index) => (
        <ScreenshotItem
          key={screenshot.path}
          screenshot={screenshot}
          index={index}
          onDelete={onDeleteScreenshot}
        />
      ))}
    </div>
  )
}

export default ScreenshotQueue
