import React, { useEffect, useState } from "react"
import ScreenshotQueue from "../components/ScreenshotQueue"
import {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastVariant
} from "../components/ui/toast"
import axios from "axios"
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

  const processScreenshots = async () => {
    if (screenshots.length === 0) {
      showToast(
        "No Screenshots",
        "There are no screenshots to process.",
        "neutral"
      )
      return
    }

    setIsProcessing(true)

    try {
      const response = await window.electronAPI.processScreenshots(screenshots)

      if (response.success) {
        showToast(
          "Processing Complete",
          "Your screenshots were processed successfully.",
          "success"
        )
      } else {
        throw new Error(response.error)
      }
    } catch (error) {
      showToast(
        "Processing Failed",
        "There was an error processing your screenshots.",
        "error"
      )
      console.error("Processing error:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  useEffect(() => {
    const loadScreenshots = async () => {
      try {
        const existing = await window.electronAPI.getScreenshots()
        setScreenshots(existing)
      } catch (error) {
        console.error("Error loading screenshots:", error)
        showToast("Error", "Failed to load existing screenshots", "error")
      }
    }

    loadScreenshots()

    const cleanup = window.electronAPI.onScreenshotTaken((data) => {
      setScreenshots((prev) => [...prev, data].slice(-3))
    })

    const processingStartCleanup = window.electronAPI.onProcessingStart(() => {
      setIsProcessing(true)
    })

    const processingSuccessCleanup = window.electronAPI.onProcessingSuccess(
      () => {
        setIsProcessing(false)
        showToast(
          "Processing Complete",
          "Your screenshots were processed successfully.",
          "success"
        )
      }
    )

    const processingErrorCleanup = window.electronAPI.onProcessingError(
      (error) => {
        setIsProcessing(false)
        showToast(
          "Processing Failed",
          "There was an error processing your screenshots.",
          "error"
        )
        console.error("Processing error:", error)
      }
    )

    const noScreenshotsCleanup = window.electronAPI.onProcessingNoScreenshots(
      () => {
        showToast(
          "No Screenshots",
          "There are no screenshots to process.",
          "neutral"
        )
      }
    )

    return () => {
      window.removeEventListener("keydown", () => {})
      processingStartCleanup()
      processingSuccessCleanup()
      processingErrorCleanup()
      noScreenshotsCleanup()
      cleanup()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Screenshot Queue</h1>

        <Toast
          open={toastOpen}
          onOpenChange={setToastOpen}
          variant={toastMessage.variant}
          duration={3000}
        >
          <ToastTitle>{toastMessage.title}</ToastTitle>
          <ToastDescription>{toastMessage.description}</ToastDescription>
        </Toast>
        <ScreenshotQueue
          screenshots={screenshots}
          onDeleteScreenshot={handleDeleteScreenshot}
        />

        <button
          onClick={processScreenshots}
          disabled={isProcessing || screenshots.length === 0}
          className={cn(
            "mt-4 px-4 py-2 rounded-lg shadow transition",
            isProcessing || screenshots.length === 0
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-500 hover:bg-green-600 text-white"
          )}
        >
          {isProcessing ? "Processing..." : "Process Screenshots"}
        </button>

        <p className="mt-4 text-sm text-gray-500">
          Press Cmd+Shift+H to take a screenshot. Latest 3 screenshots will be
          kept. <br />
          Press Cmd+Shift+J to process the screenshots.
        </p>
      </div>
    </div>
  )
}

export default Queue
