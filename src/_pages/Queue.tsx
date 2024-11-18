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
    <div className="bg-white shadow-sm">
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

          <div className="border-t pt-3">
            <p className="text-sm text-gray-600 space-y-1">
              <span className="block">
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">
                  ⌘ + ⇧ + H
                </kbd>{" "}
                Take screenshot (keeps latest 3)
              </span>
              <span className="block">
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">
                  ⌘ + ⇧ + J
                </kbd>{" "}
                Process screenshots
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Queue
