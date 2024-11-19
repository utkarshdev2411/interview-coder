import { ToastProvider } from "./components/ui/toast"
import Queue from "./_pages/Queue"
import { ToastViewport } from "@radix-ui/react-toast"
import { useEffect, useState } from "react"
import Solutions from "./_pages/Solutions"
import { QueryClient, QueryClientProvider } from "react-query"

declare global {
  interface Window {
    electronAPI: {
      toggleMainWindow: () => Promise<void>
      takeScreenshot: () => Promise<{ path: string; preview: string }>
      getScreenshots: () => Promise<Array<{ path: string; preview: string }>>
      deleteScreenshot: (
        path: string
      ) => Promise<{ success: boolean; error?: string }>
      onScreenshotTaken: (
        callback: (data: { path: string; preview: string }) => void
      ) => () => void
      processScreenshots: (
        screenshots: Array<{ path: string; preview: string }>
      ) => Promise<{ success: boolean; data?: any; error?: string }>
      onProcessingStart: (callback: () => void) => () => void
      onProcessingSuccess: (callback: (data: any) => void) => () => void
      onProcessingError: (callback: (error: string) => void) => () => void
      onProcessingNoScreenshots: (callback: () => void) => () => void
      updateContentHeight: (height: number) => Promise<void>
    }
  }
}
// Create QueryClient outside component
const queryClient = new QueryClient()

const App: React.FC = () => {
  const [view, setView] = useState<"queue" | "solutions">("queue")

  useEffect(() => {
    const cleanupFunctions = [
      window.electronAPI.onProcessingStart(() => {
        setView("solutions")
      }),
      window.electronAPI.onProcessingSuccess((data) => {
        console.log("Processing success in App.tsx:", data)
        queryClient.setQueryData(["solutions"], data)
      }),

      window.electronAPI.onProcessingError(() => {
        setView("queue")
      })
    ]
    return () => cleanupFunctions.forEach((cleanup) => cleanup())
  }, []) // Remove queryClient dependency since it's now constant

  return (
    <div className="bg-transparent w-fit">
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          {view === "queue" ? <Queue setView={setView} /> : <Solutions />}
          <ToastViewport />
        </ToastProvider>
      </QueryClientProvider>
    </div>
  )
}

export default App
