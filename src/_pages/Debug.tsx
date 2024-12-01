// Debug.tsx
import React, { useState, useEffect, useRef } from "react"
import { useQuery, useQueryClient } from "react-query"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism"
import { ComplexitySection, ContentSection } from "./Solutions"
import ScreenshotQueue from "../components/Queue/ScreenshotQueue"
import {
  Toast,
  ToastDescription,
  ToastMessage,
  ToastTitle,
  ToastVariant
} from "../components/ui/toast"
import ExtraScreenshotsQueueHelper from "../components/Solutions/ExtraScreenshotsQueueHelper"

const CodeComparisonSection = ({
  previousCode,
  newCode,
  isLoading
}: {
  previousCode: string | null
  newCode: string | null
  isLoading: boolean
}) => (
  <div className="space-y-2">
    <h2 className="text-[13px] font-medium text-white tracking-wide">
      Code Comparison
    </h2>
    {isLoading ? (
      <div className="space-y-1.5">
        <div className="mt-4 flex">
          <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
            Loading code comparison...
          </p>
        </div>
      </div>
    ) : (
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Previous Code */}
        <div className="flex-1">
          <h3 className="text-[12px] font-medium text-gray-200 mb-2">
            Previous Code
          </h3>
          <div className="overflow-auto">
            <SyntaxHighlighter
              showLineNumbers
              language="python"
              style={dracula}
              customStyle={{
                maxWidth: "550px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word"
              }}
              wrapLongLines={true}
            >
              {previousCode || "No previous code available."}
            </SyntaxHighlighter>
          </div>
        </div>
        {/* New Code */}
        <div className="flex-1">
          <h3 className="text-[12px] font-medium text-gray-200 mb-2">
            New Code
          </h3>
          <div className="overflow-auto">
            <SyntaxHighlighter
              showLineNumbers
              language="python"
              style={dracula}
              customStyle={{
                maxWidth: "550px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word"
              }}
              wrapLongLines={true}
            >
              {newCode || "No new code generated yet."}
            </SyntaxHighlighter>
          </div>
        </div>
      </div>
    )}
  </div>
)

interface DebugProps {
  setView: React.Dispatch<React.SetStateAction<"queue" | "solutions" | "debug">>
}
const Debug: React.FC<DebugProps> = ({ setView }) => {
  const queryClient = useQueryClient()
  const contentRef = useRef<HTMLDivElement>(null)

  const [processing, setProcessing] = useState(false)
  const [previousCode, setPreviousCode] = useState<string | null>(null)
  const [newCode, setNewCode] = useState<string | null>(null)
  const [thoughtsData, setThoughtsData] = useState<string[] | null>(null)
  const [timeComplexityData, setTimeComplexityData] = useState<string | null>(
    null
  )
  const [spaceComplexityData, setSpaceComplexityData] = useState<string | null>(
    null
  )

  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<ToastMessage>({
    title: "",
    description: "",
    variant: "neutral"
  })

  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const [tooltipHeight, setTooltipHeight] = useState(0)

  const { data: extraScreenshots = [], refetch } = useQuery({
    queryKey: ["extras"],
    queryFn: async () => {
      try {
        const existing = await window.electronAPI.getScreenshots()
        return existing
      } catch (error) {
        console.error("Error loading extra screenshots:", error)
        return []
      }
    },
    staleTime: Infinity,
    cacheTime: Infinity
  })

  const showToast = (
    title: string,
    description: string,
    variant: ToastVariant
  ) => {
    setToastMessage({ title, description, variant })
    setToastOpen(true)
  }

  const handleDeleteExtraScreenshot = async (index: number) => {
    const screenshotToDelete = extraScreenshots[index]

    try {
      const response = await window.electronAPI.deleteScreenshot(
        screenshotToDelete.path
      )

      if (response.success) {
        refetch()
      } else {
        console.error("Failed to delete extra screenshot:", response.error)
      }
    } catch (error) {
      console.error("Error deleting extra screenshot:", error)
    }
  }

  useEffect(() => {
    const updateDimensions = () => {
      if (contentRef.current) {
        let contentHeight = contentRef.current.scrollHeight
        const contentWidth = contentRef.current.scrollWidth
        if (isTooltipVisible) {
          contentHeight += tooltipHeight
        }
        window.electronAPI.updateContentDimensions({
          width: contentWidth,
          height: contentHeight
        })
      }
    }

    // Initialize resize observer
    const resizeObserver = new ResizeObserver(updateDimensions)
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current)
    }
    updateDimensions()

    // Set up event listeners
    const cleanupFunctions = [
      window.electronAPI.onScreenshotTaken(() => refetch()),
      // when debugging starts for the first time or any time after that, you'll only set the loading state to true
      window.electronAPI.onDebugStart(() => {
        setProcessing(true)
      }),
      //when there's an error with debugging, there can be two cases:
      // the first case is if this is our first attempt at debugging, then we should show a toast and set the view to solutions
      // the second case is if we've already tried debugging before, then we should just show a toast and not change the view
      // we can determine if this is our first attempt or not by checking if the new_solution query is null or not
      window.electronAPI.onDebugError((error: string) => {
        showToast(
          "Processing Failed",
          "There was an error debugging your code.",
          "error"
        )

        setProcessing(false)

        // Check if this is first debug attempt by seeing if new_solution exists
        const newSolution = queryClient.getQueryData(["new_solution"])
        if (!newSolution) {
          // First attempt failed - go back to solutions view
          setView("solutions")
        }
        // Otherwise stay on debug view since we've already debugged successfully before and just don't change anything

        console.error("Processing error:", error)
      }),

      // When DEBUGGING succeeds on this page, it means we've already debugged once before, so we're just updating the debug

      window.electronAPI.onDebugSuccess((data) => {
        setProcessing(false)

        // Update the query cache with new solution data
        queryClient.setQueryData(["new_solution"], data.solution)

        // Update all the state variables with the new data
        setNewCode(data.solution.new_code || null)
        setThoughtsData(data.solution.thoughts || null)
        setTimeComplexityData(data.solution.time_complexity || null)
        setSpaceComplexityData(data.solution.space_complexity || null)

        // Show success toast
        showToast(
          "Debug Complete",
          "Your code has been successfully debugged.",
          "success"
        )
      })
    ]

    return () => {
      resizeObserver.disconnect()
      cleanupFunctions.forEach((cleanup) => cleanup())
    }
  }, [isTooltipVisible, tooltipHeight])

  useEffect(() => {
    // Fetch initial data for both previous and new solutions
    const previousSolution = queryClient.getQueryData(["solution"]) as {
      code: string
      thoughts: string[]
      time_complexity: string
      space_complexity: string
    } | null

    const newSolution = queryClient.getQueryData(["new_solution"]) as {
      new_code: string
      thoughts: string[]
      time_complexity: string
      space_complexity: string
    } | null

    // Set previous code from solution cache
    setPreviousCode(previousSolution?.code || null)

    // Set all state variables from new_solution cache if it exists
    if (newSolution) {
      setNewCode(newSolution.new_code || null)
      setThoughtsData(newSolution.thoughts || null)
      setTimeComplexityData(newSolution.time_complexity || null)
      setSpaceComplexityData(newSolution.space_complexity || null)
    }

    // Subscribe to changes in both solution caches
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query.queryKey[0] === "solution") {
        const solution = queryClient.getQueryData(["solution"]) as {
          code: string
          thoughts: string[]
          time_complexity: string
          space_complexity: string
        } | null

        if (solution) {
          setPreviousCode(solution.code)
        }
      }

      if (event?.query.queryKey[0] === "new_solution") {
        const newSolution = queryClient.getQueryData(["new_solution"]) as {
          new_code: string
          thoughts: string[]
          time_complexity: string
          space_complexity: string
        } | null

        if (newSolution) {
          setNewCode(newSolution.new_code)
          setThoughtsData(newSolution.thoughts)
          setTimeComplexityData(newSolution.time_complexity)
          setSpaceComplexityData(newSolution.space_complexity)
        }
      }
    })

    return () => unsubscribe()
  }, [queryClient])

  const handleTooltipVisibilityChange = (visible: boolean, height: number) => {
    setIsTooltipVisible(visible)
    setTooltipHeight(height)
  }

  return (
    <div ref={contentRef} className="relative space-y-3 pb-8">
      <Toast
        open={toastOpen}
        onOpenChange={setToastOpen}
        variant={toastMessage.variant}
        duration={3000}
      >
        <ToastTitle>{toastMessage.title}</ToastTitle>
        <ToastDescription>{toastMessage.description}</ToastDescription>
      </Toast>

      {/* Conditionally render the screenshot queue */}
      <div className="bg-transparent w-fit">
        <div className="pb-3">
          <div className="space-y-3 w-fit">
            <ScreenshotQueue
              screenshots={extraScreenshots}
              onDeleteScreenshot={handleDeleteExtraScreenshot}
            />
          </div>
        </div>
      </div>

      {/* Navbar of commands with the tooltip */}
      <ExtraScreenshotsQueueHelper
        extraScreenshots={extraScreenshots}
        onTooltipVisibilityChange={handleTooltipVisibilityChange}
      />

      {/* Main Content */}
      <div className="w-full text-sm text-black bg-black/60 rounded-md">
        <div className="rounded-lg overflow-hidden">
          <div className="px-4 py-3 space-y-4">
            {/* Thoughts Section */}
            <ContentSection
              title="Thoughts"
              content={
                thoughtsData && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      {thoughtsData.map((thought, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="w-1 h-1 rounded-full bg-blue-400/80 mt-2 shrink-0" />
                          <div>{thought}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              }
              isLoading={!thoughtsData}
            />

            {/* Code Comparison Section */}
            <CodeComparisonSection
              previousCode={previousCode}
              newCode={newCode}
              isLoading={!previousCode || !newCode}
            />

            {/* Complexity Section */}
            <ComplexitySection
              timeComplexity={timeComplexityData}
              spaceComplexity={spaceComplexityData}
              isLoading={!timeComplexityData || !spaceComplexityData}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Debug
