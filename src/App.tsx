import { ToastProvider } from "./components/ui/toast"
import Queue from "./_pages/Queue"

declare global {
  interface Window {
    electronAPI: {
      takeScreenshot: () => Promise<{ path: string; preview: string }>
      getScreenshots: () => Promise<Array<{ path: string; preview: string }>>
      deleteScreenshot: (
        path: string
      ) => Promise<{ success: boolean; error?: string }>
      onScreenshotTaken: (
        callback: (data: { path: string; preview: string }) => void
      ) => () => void
    }
  }
}
const App: React.FC = () => {
  return (
    <ToastProvider>
      <Queue />
    </ToastProvider>
  )
}

export default App
