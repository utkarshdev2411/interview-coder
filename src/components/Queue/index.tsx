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
      <div className="pt-2">
        <p className="w-fit text-sm text-white backdrop-blur-md bg-black/30 rounded-lg p-2 flex flex-col gap-4">
          <div className="flex items-center">
            <span className="ml-2 text-md">No screenshots taken yet</span>
          </div>
        </p>
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
