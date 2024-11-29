import { ToastProvider } from "./components/ui/toast"
import Queue from "./_pages/Queue"
import { ToastViewport } from "@radix-ui/react-toast"
import { useEffect, useRef, useState } from "react"
import Solutions from "./_pages/Solutions"
import { QueryClient, QueryClientProvider } from "react-query"

declare global {
  interface Window {
    electronAPI: {
      getScreenshots: () => Promise<Array<{ path: string; preview: string }>>

      deleteScreenshot: (
        path: string
      ) => Promise<{ success: boolean; error?: string }>
      onScreenshotTaken: (
        callback: (data: { path: string; preview: string }) => void
      ) => () => void
      onProcessingStart: (callback: () => void) => () => void
      onProcessingSuccess: (callback: (data: any) => void) => () => void
      onProcessingExtraSuccess: (callback: (data: any) => void) => () => void
      onProcessingError: (callback: (error: string) => void) => () => void
      onProcessingNoScreenshots: (callback: () => void) => () => void
      updateContentHeight: (height: number) => Promise<void>
      onResetView: (callback: () => void) => () => void
      takeScreenshot: () => Promise<void>

      onUnauthorized: (callback: () => void) => () => void
      onInitialSolutionGenerated: (callback: (data: any) => void) => () => void
      onProblemExtracted: (callback: (data: any) => void) => () => void
    }
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      cacheTime: Infinity
    }
  }
})

const App: React.FC = () => {
  const [view, setView] = useState<"queue" | "solutions">("queue")
  const containerRef = useRef<HTMLDivElement>(null)

  // Effect for height monitoring

  useEffect(() => {
    const cleanup = window.electronAPI.onResetView(() => {
      console.log("Received 'reset-view' message from main process.")
      setView("queue")
      console.log("View reset to 'queue' via Command+R shortcut.")
      queryClient.invalidateQueries(["screenshots"])
    })

    return () => {
      cleanup()
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const updateHeight = () => {
      if (!containerRef.current) return
      const height = containerRef.current.scrollHeight
      window.electronAPI?.updateContentHeight(height)
    }

    const resizeObserver = new ResizeObserver(() => {
      updateHeight()
    })

    // Initial height update
    updateHeight()

    // Observe for changes
    resizeObserver.observe(containerRef.current)

    // Also update height when view changes
    const mutationObserver = new MutationObserver(() => {
      updateHeight()
    })

    mutationObserver.observe(containerRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    })

    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [view]) // Re-run when view changes
  useEffect(() => {
    const cleanupFunctions = [
      window.electronAPI.onProcessingStart(() => {
        setView("solutions")
        console.log("starting processing")
      }),
      window.electronAPI.onUnauthorized(() => {
        queryClient.removeQueries(["screenshots"])
        queryClient.removeQueries(["solution"])
        queryClient.removeQueries(["problem_statement"])
        queryClient.removeQueries(["thoughts"])
        queryClient.removeQueries(["description"])
        queryClient.removeQueries(["time_complexity"])
        queryClient.removeQueries(["space_complexity"])
        setView("queue")
        console.log("Unauthorized")
      }),
      // Update this reset handler
      window.electronAPI.onResetView(() => {
        console.log("Received 'reset-view' message from main process")

        queryClient.removeQueries(["screenshots"])
        queryClient.removeQueries(["solution"])
        queryClient.removeQueries(["problem_statement"])
        queryClient.removeQueries(["thoughts"])
        queryClient.removeQueries(["description"])
        queryClient.removeQueries(["time_complexity"])
        queryClient.removeQueries(["space_complexity"])
        setView("queue")
        console.log("View reset to 'queue' via Command+R shortcut")
      }),
      window.electronAPI.onProblemExtracted((data: any) => {
        if (view === "queue") {
          console.log("Problem extracted successfully")
          queryClient.invalidateQueries(["problem_statement"])
          queryClient.setQueryData(["problem_statement"], data)
        }
      }),

      window.electronAPI.onInitialSolutionGenerated((data: any) => {
        if (view === "queue") {
          console.log("Initial solution generated: ", data)
          try {
            // Extract solution data from the response
            const { solution } = data
            const {
              code,
              thoughts,
              description,
              time_complexity,
              space_complexity
            } = solution

            console.log("Storing description in React Query: ", description)

            // Store in React Query
            queryClient.setQueryData(["solution"], code)
            queryClient.setQueryData(["thoughts"], thoughts)
            queryClient.setQueryData(["description"], description)
            queryClient.setQueryData(["time_complexity"], time_complexity)
            queryClient.setQueryData(["space_complexity"], space_complexity)
          } catch (error) {
            console.error("Error handling solution data:", error)
          }
        }
      }),
      window.electronAPI.onProcessingExtraSuccess((data) => {
        const { solution } = data
        const {
          code,
          thoughts,
          description,
          time_complexity,
          space_complexity
        } = solution

        queryClient.setQueryData(["solution"], code)
        queryClient.setQueryData(["thoughts"], thoughts)
        queryClient.setQueryData(["description"], description)
        queryClient.setQueryData(["time_complexity"], time_complexity)
        queryClient.setQueryData(["space_complexity"], space_complexity)
      })
    ]
    return () => cleanupFunctions.forEach((cleanup) => cleanup())
  }, [])

  return (
    <div
      ref={containerRef}
      className="min-h-0 "
      style={{ width: "600px" }} // Match your electron window width
    >
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <div className="p-4">
            {view === "queue" ? <Queue setView={setView} /> : <Solutions />}
          </div>
          <ToastViewport />
        </ToastProvider>
      </QueryClientProvider>
    </div>
  )
}

export default App
