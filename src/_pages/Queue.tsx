import React, { useState, useEffect } from "react"
import { useQuery } from "react-query"
import ScreenshotQueue from "../components/Queue"
import {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastVariant
} from "../components/ui/toast"

interface ToastMessage {
  title: string
  description: string
  variant: ToastVariant
}

interface QueueProps {
  setView: React.Dispatch<React.SetStateAction<"queue" | "solutions">>
}

const Queue: React.FC<QueueProps> = ({ setView }) => {
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<ToastMessage>({
    title: "",
    description: "",
    variant: "neutral"
  })

  const { data: screenshots = [], refetch } = useQuery({
    queryKey: ["screenshots"],
    queryFn: async () => {
      try {
        const existing = await window.electronAPI.getScreenshots()
        return existing
      } catch (error) {
        console.error("Error loading screenshots:", error)
        showToast("Error", "Failed to load existing screenshots", "error")
        return []
      }
    }
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
        refetch() // Refetch screenshots instead of managing state directly
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
    updateHeight()

    // Set up event listeners
    const cleanupFunctions = [
      window.electronAPI.onScreenshotTaken(() => refetch()),
      window.electronAPI.onProcessingSuccess(() => {
        showToast(
          "Processing Complete",
          "Your screenshots were processed successfully.",
          "success"
        )
        setView("solutions")
      }),
      window.electronAPI.onProcessingError((error: string) => {
        showToast(
          "Processing Failed",
          "There was an error processing your screenshots.",
          "error"
        )
        console.error("Processing error:", error)
      }),
      window.electronAPI.onProcessingNoScreenshots(() => {
        showToast(
          "No Screenshots",
          "There are no screenshots to process.",
          "neutral"
        )
      })
    ]

    return () => {
      resizeObserver.disconnect()
      cleanupFunctions.forEach((cleanup) => cleanup())
    }
  }, []) // No more dependency on toggle

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
            <p className="w-fit text-sm text-white backdrop-blur-md bg-black/60 rounded-lg p-2 flex flex-col gap-4">
              {/* Improved visual hierarchy */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center">
                  <kbd className="bg-white/20 backdrop-blur-sm rounded-md text-xs text-white border border-white/20 px-2 py-1">
                    ⌘ + H
                  </kbd>
                  <span className="ml-2 text-xs">
                    Take screenshot (keeps latest 5)
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
