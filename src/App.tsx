import React, { useEffect, useState } from "react"
import ScreenshotQueue from "./components/ScreenshotQueue"
interface Screenshot {
  path: string
  preview: string
}

declare global {
  interface Window {
    electronAPI: {
      takeScreenshot: () => Promise<{ path: string; preview: string }>
      getScreenshots: () => Promise<Array<{ path: string; preview: string }>>
      onScreenshotTaken: (
        callback: (data: { path: string; preview: string }) => void
      ) => () => void
    }
  }
}

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [screenshots, setScreenshots] = useState<Screenshot[]>([])

  useEffect(() => {
    // Load existing screenshots on mount
    const loadScreenshots = async () => {
      try {
        const existing = await window.electronAPI.getScreenshots()
        setScreenshots(existing)
      } catch (error) {
        console.error("Error loading screenshots:", error)
      }
    }
    loadScreenshots()

    const handleKeyPress = async (e: KeyboardEvent) => {
      if (e.metaKey && e.shiftKey && (e.key === "h" || e.key === "H")) {
        try {
          setIsLoading(true)
          const { path, preview } = await window.electronAPI.takeScreenshot()
          setScreenshots((prev) => [...prev, { path, preview }].slice(-10))
        } catch (error) {
          console.error("Error taking screenshot:", error)
        } finally {
          setIsLoading(false)
        }
      }
    }

    window.addEventListener("keydown", handleKeyPress)

    const cleanup = window.electronAPI.onScreenshotTaken((data) => {
      setScreenshots((prev) => [...prev, data].slice(-10))
      setIsLoading(false)
    })

    return () => {
      window.removeEventListener("keydown", handleKeyPress)
      cleanup()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Screenshot Queue</h1>
        {isLoading && (
          <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow">
            Taking screenshot...
          </div>
        )}
        <ScreenshotQueue screenshots={screenshots} />
        <p className="mt-4 text-sm text-gray-500">
          Press Cmd+Shift+H to take a screenshot. Maximum of 10 screenshots will
          be kept.
        </p>
      </div>
    </div>
  )
}

export default App
