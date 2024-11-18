import { ToastProvider } from "./components/ui/toast"
import Queue from "./_pages/Queue"
import { ToastViewport } from "@radix-ui/react-toast"
import { useState } from "react"
import Solutions from "./_pages/Solutions"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

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
      onProcessingSuccess: (callback: () => void) => () => void
      onProcessingError: (callback: (error: string) => void) => () => void
      onProcessingNoScreenshots: (callback: () => void) => () => void
      updateContentHeight: (height: number) => Promise<void>
    }
  }
}
const App: React.FC = () => {
  const [view, setView] = useState<"queue" | "solutions">("queue")
  const queryClient = new QueryClient()

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
