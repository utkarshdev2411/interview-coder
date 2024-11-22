import { useQuery, useQueryClient } from "react-query"
import { useEffect, useState } from "react"
import { CodeBlock, dracula } from "react-code-blocks"
import SolutionsHelper from "../components/Solutions/SolutionsHelper"
import ScreenshotQueue from "../components/Queue/ScreenshotQueue"
import {
  Toast,
  ToastDescription,
  ToastMessage,
  ToastTitle,
  ToastVariant
} from "../components/ui/toast"

interface problemStatementData {
  problem_statement: string
  input_format: {
    description: string
    parameters: any[]
  }
  output_format: {
    description: string
    type: string
    subtype: string
  }
  constraints: {
    description: string
    parameter: string
  }[]
  test_cases: any[]
  validation_type: string
  difficulty: string
}

interface ThoughtsData {
  thoughts: string[]
}

// Create an array of widths that look natural for text
const naturalWidths = [
  "w-[230px]", // Shorter sentence
  "w-[340px]", // Medium sentence
  "w-[0px]" // Long sentence
]

const SkeletonLine = ({ width = naturalWidths[2] }: { width?: string }) => (
  <div
    className={`h-3 bg-gray-300/50 rounded-sm bg-pulse animate-pulse ${width}`}
    style={{ maxWidth: "500px" }}
  />
)

const ContentSection = ({
  title,
  content,
  isLoading
}: {
  title: string
  content: React.ReactNode
  isLoading: boolean
}) => (
  <div className="space-y-2">
    <h2 className="text-[13px] font-medium text-white tracking-wide">
      {title}
    </h2>
    {isLoading ? (
      <div className="space-y-1.5">
        <SkeletonLine width={naturalWidths[2]} /> {/* Long line */}
        <SkeletonLine width={naturalWidths[1]} /> {/* Medium line */}
        <SkeletonLine width={naturalWidths[0]} /> {/* Shorter line */}
      </div>
    ) : (
      <div className="text-[13px] leading-[1.4] text-gray-100 max-w-[600px]">
        {content}
      </div>
    )}
  </div>
)

const SolutionSection = ({
  title,
  content,
  isLoading
}: {
  title: string
  content: React.ReactNode
  isLoading: boolean
}) => (
  <div className="space-y-2">
    <h2 className="text-[13px] font-medium text-white tracking-wide">
      {title}
    </h2>
    {isLoading ? (
      <div className="space-y-1.5">
        <SkeletonLine width={naturalWidths[2]} />
        <SkeletonLine width={naturalWidths[1]} />
        <SkeletonLine width={naturalWidths[1]} />
        <SkeletonLine width={naturalWidths[0]} />
      </div>
    ) : (
      <div className="">
        <CodeBlock
          text={content as string}
          language="python"
          theme={dracula}
          customStyle={{
            maxWidth: "550px",
            overflow: "auto",
            whiteSpace: "pre-wrap"
          }}
        />
      </div>
    )}
  </div>
)

const Solutions: React.FC = () => {
  const queryClient = useQueryClient()
  const [problemStatementData, setProblemStatementData] =
    useState<problemStatementData | null>(null)
  const [solutionData, setSolutionData] = useState<string | null>(null)
  const [thoughtsData, setThoughtsData] = useState<ThoughtsData | null>(null)

  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<ToastMessage>({
    title: "",
    description: "",
    variant: "neutral"
  })

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
  const handleDeleteExtraScreenshot = async (index: number) => {
    const screenshotToDelete = extraScreenshots[index]

    try {
      const response = await window.electronAPI.deleteScreenshot(
        screenshotToDelete.path
      )

      if (response.success) {
        refetch() // Refetch screenshots instead of managing state directly
      } else {
        console.error("Failed to delete extra screenshot:", response.error)
      }
    } catch (error) {
      console.error("Error deleting extra screenshot:", error)
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
      window.electronAPI.onProcessingStart(() => {
        //everytime processing starts, we'll reset stuff ot this
        setSolutionData(null)
        setThoughtsData(null)
      }),
      window.electronAPI.onProcessingExtraSuccess((data) => {
        console.log({ data })
        // queryClient.setQueryData(["problem_statement"], data)
        // queryClient.invalidateQueries(["problem_statement"])
      }),
      window.electronAPI.onProcessingError((error: string) => {
        showToast(
          "Processing Failed",
          "There was an error processing your extra screenshots.",
          "error"
        )
        //here, processing error means a processing error for the EXTRA screenshots. this means that the solutions and thoughts should be reset to what they previously were
        setSolutionData(queryClient.getQueryData(["solution"]) || null)
        setThoughtsData(queryClient.getQueryData(["thoughts"]) || null)
        console.error("Processing error:", error)
      }),
      window.electronAPI.onProcessingNoScreenshots(() => {
        showToast(
          "No Screenshots",
          "There are no extra screenshots to process.",
          "neutral"
        )
      })
    ]

    return () => {
      resizeObserver.disconnect()
      cleanupFunctions.forEach((cleanup) => cleanup())
    }
  }, []) // No more dependency on Toggle View

  useEffect(() => {
    setProblemStatementData(
      queryClient.getQueryData(["problem_statement"]) || null
    )
    setSolutionData(queryClient.getQueryData(["solution"]) || null)
    setThoughtsData(queryClient.getQueryData(["thoughts"]) || null) // Updated this line

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query.queryKey[0] === "problem_statement") {
        setProblemStatementData(
          queryClient.getQueryData(["problem_statement"]) || null
        )
      }
      if (event?.query.queryKey[0] === "thoughts") {
        // Updated this line
        setThoughtsData(queryClient.getQueryData(["thoughts"]) || null)
      }
      if (event?.query.queryKey[0] === "solution") {
        setSolutionData(queryClient.getQueryData(["solution"]) || null)
      }
    })
    return () => unsubscribe()
  }, [queryClient])

  return (
    <div className="relative space-y-3">
      <Toast
        open={toastOpen}
        onOpenChange={setToastOpen}
        variant={toastMessage.variant}
        duration={3000}
      >
        <ToastTitle>{toastMessage.title}</ToastTitle>
        <ToastDescription>{toastMessage.description}</ToastDescription>
      </Toast>
      <div className="bg-transparent w-fit">
        <div className="pb-3">
          <div className="space-y-3 w-fit">
            <ScreenshotQueue
              screenshots={extraScreenshots}
              onDeleteScreenshot={handleDeleteExtraScreenshot}
            />
            <div className="pt-2 w-fit">
              <div className="text-xs text-white/90 backdrop-blur-md bg-black/60 rounded-lg py-2 px-4 flex items-center justify-center gap-4">
                {/* Show/Hide */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] leading-none">Show/Hide</span>
                  <div className="flex gap-1">
                    <button className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                      ⌘
                    </button>
                    <button className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                      B
                    </button>
                  </div>
                </div>
                {extraScreenshots.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] leading-none">
                      Re-solve/Debug
                    </span>
                    <div className="flex gap-1">
                      <button className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                        ⌘
                      </button>
                      <button className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                        ↵
                      </button>
                    </div>
                  </div>
                )}
                {/* Screenshot */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] leading-none">
                    {extraScreenshots.length === 0
                      ? "Extra screenshot"
                      : "Screenshot"}
                  </span>
                  <div className="flex gap-1">
                    <button className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                      ⌘
                    </button>
                    <button className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                      H
                    </button>
                  </div>
                </div>

                {/* Start Over */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] leading-none">Start over</span>
                  <div className="flex gap-1">
                    <button className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                      ⌘
                    </button>
                    <button className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                      R
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full text-sm text-black backdrop-blur-md bg-black/60 rounded-md">
        <div className="rounded-lg overflow-hidden">
          <div className="px-4 py-3 space-y-4">
            <ContentSection
              title="Problem Statement"
              content={problemStatementData?.problem_statement}
              isLoading={!problemStatementData}
            />
            <ContentSection
              title="Thoughts"
              content={
                thoughtsData && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      {thoughtsData.thoughts.map((thought, index) => (
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
            <SolutionSection
              title="Solutions"
              content={solutionData}
              isLoading={!solutionData}
            />
            {/* Constraints */}
            <div className="space-y-2">
              <h2 className="text-[13px] font-medium text-white tracking-wide">
                Constraints
              </h2>
              {!problemStatementData ? (
                <div className="space-y-1.5">
                  {Array(3)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-gray-700/50 animate-pulse shrink-0" />
                        <SkeletonLine
                          width={
                            naturalWidths[Math.min(i, naturalWidths.length - 1)]
                          }
                        />
                      </div>
                    ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {problemStatementData.constraints.map((constraint, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 text-[13px] leading-[1.4] text-gray-100"
                    >
                      <div className="w-1 h-1 rounded-full bg-blue-400/80 mt-2 shrink-0" />
                      <div className="max-w-[600px]">
                        {constraint.description}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <SolutionsHelper />
    </div>
  )
}

export default Solutions
