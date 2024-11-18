import React, { useEffect, useState } from "react"
import ScreenshotQueue from "../components/ScreenshotQueue"
import {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastVariant
} from "../components/ui/toast"
import { cn } from "../lib/utils"

interface Screenshot {
  path: string
  preview: string
}

interface ToastMessage {
  title: string
  description: string
  variant: ToastVariant
}

const Queue: React.FC = () => {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<ToastMessage>({
    title: "",
    description: "",
    variant: "neutral"
  })

  const showToast = (
    title: string,
    description: string,
    variant: ToastVariant
  ) => {
    setToastMessage({ title, description, variant })
    setToastOpen(true)
  }

  const handleDeleteScreenshot = async (index: number) => {
    const screenshotToDelete = screenshots[index]

    try {
      const response = await window.electronAPI.deleteScreenshot(
        screenshotToDelete.path
      )

      if (response.success) {
        setScreenshots((prev) => prev.filter((_, i) => i !== index))
        showToast("Success", "Screenshot deleted successfully", "success")
      } else {
        console.error("Failed to delete screenshot:", response.error)
        showToast("Error", "Failed to delete the screenshot file", "error")
      }
    } catch (error) {
      console.error("Error deleting screenshot:", error)
      showToast(
        "Error",
        "An unexpected error occurred while deleting the screenshot",
        "error"
      )
    }
  }

  useEffect(() => {
    // Height update logic
    const updateHeight = () => {
      const contentHeight = document.body.scrollHeight
      window.electronAPI.updateContentHeight(contentHeight)
    }

    // Initialize resize observer
    const resizeObserver = new ResizeObserver(updateHeight)
    resizeObserver.observe(document.body)
    updateHeight() // Initial height update

    // Screenshot loading
    const loadScreenshots = async () => {
      try {
        const existing = await window.electronAPI.getScreenshots()
        setScreenshots(existing)
        // Update height after screenshots load
        setTimeout(updateHeight, 0)
      } catch (error) {
        console.error("Error loading screenshots:", error)
        showToast("Error", "Failed to load existing screenshots", "error")
      }
    }

    // Event handlers
    const handleScreenshotTaken = (data: { path: string; preview: string }) => {
      setScreenshots((prev) => [...prev, data].slice(-3))
      // Update height after new screenshot
      setTimeout(updateHeight, 0)
    }

    const handleProcessingSuccess = () => {
      setIsProcessing(false)
      showToast(
        "Processing Complete",
        "Your screenshots were processed successfully.",
        "success"
      )
    }

    const handleProcessingError = (error: string) => {
      setIsProcessing(false)
      showToast(
        "Processing Failed",
        "There was an error processing your screenshots.",
        "error"
      )
      console.error("Processing error:", error)
    }

    const handleNoScreenshots = () => {
      setIsProcessing(false)
      showToast(
        "No Screenshots",
        "There are no screenshots to process.",
        "neutral"
      )
    }

    // Initialize
    loadScreenshots()

    // Set up event listeners
    const cleanupFunctions = [
      window.electronAPI.onScreenshotTaken(handleScreenshotTaken),
      window.electronAPI.onProcessingSuccess(handleProcessingSuccess),
      window.electronAPI.onProcessingError(handleProcessingError),
      window.electronAPI.onProcessingNoScreenshots(handleNoScreenshots)
    ]

    return () => {
      resizeObserver.disconnect()
      cleanupFunctions.forEach((cleanup) => cleanup())
    }
  }, [])

  return (
    <div className="bg-transparent">
      <div className="px-4 py-3">
        <Toast
          open={toastOpen}
          onOpenChange={setToastOpen}
          variant={toastMessage.variant}
          duration={3000}
        >
          <ToastTitle>{toastMessage.title}</ToastTitle>
          <ToastDescription>{toastMessage.description}</ToastDescription>
        </Toast>

        <div className="space-y-3">
          <ScreenshotQueue
            screenshots={screenshots}
            onDeleteScreenshot={handleDeleteScreenshot}
          />

          <div className="pt-2">
            <p className="text-sm text-white backdrop-blur-md bg-black/30 rounded-lg p-2 flex flex-col gap-4">
              {/* Improved visual hierarchy */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center">
                  <kbd className="bg-white/20 backdrop-blur-sm rounded-md text-xs text-white border border-white/20 px-2 py-1">
                    ⌘ + H
                  </kbd>
                  <span className="ml-2 text-xs">
                    Take screenshot (keeps latest 3)
                  </span>
                </div>
                <div className="flex items-center">
                  <kbd className="bg-white/20 backdrop-blur-sm rounded-md text-xs text-white border border-white/20 px-2 py-1">
                    ⌘ + ↵
                  </kbd>
                  <span className="ml-2 text-xs">Get solutions</span>
                </div>
                <div className="flex items-center">
                  <kbd className="bg-white/20 backdrop-blur-sm rounded-md text-xs text-white border border-white/20 px-2 py-1">
                    ⌘ + B
                  </kbd>
                  <span className="ml-2 text-xs">Toggle visibility</span>
                </div>
              </div>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Queue
