// src/components/ScreenshotItem.tsx

import React, { useState } from "react"
import { X } from "lucide-react"
import { Dialog, DialogTrigger, DialogContent } from "../../ui/dialog"

interface Screenshot {
  path: string
  preview: string
}

interface ScreenshotItemProps {
  screenshot: Screenshot
  onDelete: (index: number) => void
  index: number
}

const ScreenshotItem: React.FC<ScreenshotItemProps> = ({
  screenshot,
  onDelete,
  index
}) => {
  const [isDeleting, setIsDeleting] = useState<boolean>(false)
  const handleDelete = async () => {
    setIsDeleting(true)
    console.log("clicked handle delete")
    await onDelete(index)
    setIsDeleting(false)
  }
  if (isDeleting) {
    return (
      <div className="w-[120%] h-full relative">
        <img
          src={screenshot.preview}
          alt="Screenshot"
          className="w-full h-full object-cover transition-transform duration-300 cursor-pointer group-hover:scale-105 group-hover:brightness-75"
        />
      </div>
    )
  }
  return (
    <Dialog>
      <div className="relative group">
        <DialogTrigger asChild>
          <div className="w-full h-full relative">
            <img
              src={screenshot.preview}
              alt="Screenshot"
              className="w-full h-full object-cover transition-transform duration-300 cursor-pointer group-hover:scale-105 group-hover:brightness-75"
            />
          </div>
        </DialogTrigger>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleDelete()
          }}
          className="absolute top-2 left-2 p-1 rounded-full bg-black bg-opacity-50 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          aria-label="Delete screenshot"
        >
          <X size={16} />
        </button>
      </div>

      <DialogContent>
        <img
          src={screenshot.preview}
          alt="Screenshot"
          className="w-full h-auto max-w-screen-md"
        />
      </DialogContent>
    </Dialog>
  )
}

export default ScreenshotItem
