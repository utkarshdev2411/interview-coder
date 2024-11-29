import { useQuery, useQueryClient } from "react-query"
import { useEffect, useState } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism"

import SolutionsHelper from "../components/Solutions/SolutionsHelper"
import ScreenshotQueue from "../components/Queue/ScreenshotQueue"
import {
  Toast,
  ToastDescription,
  ToastMessage,
  ToastTitle,
  ToastVariant
} from "../components/ui/toast"
import { ProblemStatementData } from "../types/solutions"
import ExtraScreenshotsQueueHelper from "../components/Solutions/ExtraScreenshotsQueueHelper"

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
      <div className="mt-4 flex">
        <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
          Extracting problem statement...
        </p>
      </div>
    ) : (
      <div className="text-[13px] leading-[1.4] text-gray-100 max-w-[600px]">
        {content}
      </div>
    )}
  </div>
)

const DescriptionSection = ({
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
      <div className="mt-4 flex">
        <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
          Loading {title.toLowerCase()}...
        </p>
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
        <div className="mt-4 flex">
          <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
            Loading solutions...
          </p>
        </div>
      </div>
    ) : (
      <div className="overflow-auto">
        <SyntaxHighlighter
          language="python"
          style={dracula}
          customStyle={{
            maxWidth: "550px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word"
          }}
          wrapLongLines={true}
        >
          {content as string}
        </SyntaxHighlighter>
      </div>
    )}
  </div>
)

const ComplexitySection = ({
  timeComplexity,
  spaceComplexity,
  isLoading
}: {
  timeComplexity: string | null
  spaceComplexity: string | null
  isLoading: boolean
}) => (
  <div className="space-y-2">
    <h2 className="text-[13px] font-medium text-white tracking-wide">
      Complexity
    </h2>
    {isLoading ? (
      <div className="mt-4 flex">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-100"></div>
        <p className="text-sm text-gray-100">Calculating complexity...</p>
      </div>
    ) : (
      <div className="space-y-1">
        <div className="flex items-start gap-2 text-[13px] leading-[1.4] text-gray-100">
          <div className="w-1 h-1 rounded-full bg-blue-400/80 mt-2 shrink-0" />
          <div>
            <strong>Time:</strong> {timeComplexity}
          </div>
        </div>
        <div className="flex items-start gap-2 text-[13px] leading-[1.4] text-gray-100">
          <div className="w-1 h-1 rounded-full bg-blue-400/80 mt-2 shrink-0" />
          <div>
            <strong>Space:</strong> {spaceComplexity}
          </div>
        </div>
      </div>
    )}
  </div>
)

const Solutions: React.FC = () => {
  const queryClient = useQueryClient()
  const [problemStatementData, setProblemStatementData] =
    useState<ProblemStatementData | null>(null)
  const [solutionData, setSolutionData] = useState<string | null>(null)
  const [thoughtsData, setThoughtsData] = useState<string[] | null>(null)
  const [descriptionData, setDescriptionData] = useState<string[] | null>(null)
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
        // Every time processing starts, reset relevant states
        setSolutionData(null)
        setThoughtsData(null)
        setDescriptionData(null)
        setTimeComplexityData(null)
        setSpaceComplexityData(null)
      }),

      window.electronAPI.onProcessingError((error: string) => {
        showToast(
          "Processing Failed",
          "There was an error processing your extra screenshots.",
          "error"
        )
        // Reset solutions and complexities to previous states
        setSolutionData(queryClient.getQueryData(["solution"]) || null)
        setThoughtsData(queryClient.getQueryData(["thoughts"]) || null)
        setDescriptionData(queryClient.getQueryData(["description"]) || null)
        setTimeComplexityData(
          queryClient.getQueryData(["time_complexity"]) || null
        )
        setSpaceComplexityData(
          queryClient.getQueryData(["space_complexity"]) || null
        )
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
  }, []) // No dependency on Toggle View

  useEffect(() => {
    setProblemStatementData(
      queryClient.getQueryData(["problem_statement"]) || null
    )
    setSolutionData(queryClient.getQueryData(["solution"]) || null)
    setThoughtsData(queryClient.getQueryData(["thoughts"]) || null)
    setDescriptionData(queryClient.getQueryData(["description"]) || null)
    setTimeComplexityData(queryClient.getQueryData(["time_complexity"]) || null)
    setSpaceComplexityData(
      queryClient.getQueryData(["space_complexity"]) || null
    )

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query.queryKey[0] === "problem_statement") {
        setProblemStatementData(
          queryClient.getQueryData(["problem_statement"]) || null
        )
      }
      if (event?.query.queryKey[0] === "thoughts") {
        setThoughtsData(queryClient.getQueryData(["thoughts"]) || null)
      }
      if (event?.query.queryKey[0] === "solution") {
        setSolutionData(queryClient.getQueryData(["solution"]) || null)
      }
      if (event?.query.queryKey[0] === "description") {
        setDescriptionData(queryClient.getQueryData(["description"]) || null)
      }
      if (event?.query.queryKey[0] === "time_complexity") {
        setTimeComplexityData(
          queryClient.getQueryData(["time_complexity"]) || null
        )
      }
      if (event?.query.queryKey[0] === "space_complexity") {
        setSpaceComplexityData(
          queryClient.getQueryData(["space_complexity"]) || null
        )
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
      {solutionData && (
        <div className="bg-transparent w-fit">
          <div className="pb-3">
            <div className="space-y-3 w-fit">
              <ScreenshotQueue
                screenshots={extraScreenshots}
                onDeleteScreenshot={handleDeleteExtraScreenshot}
              />
              <ExtraScreenshotsQueueHelper
                extraScreenshots={extraScreenshots}
              />
            </div>
          </div>
        </div>
      )}

      <div className="w-full text-sm text-black backdrop-blur-md bg-black/60 rounded-md">
        <div className="rounded-lg overflow-hidden">
          <div className="px-4 py-3 space-y-4">
            {!solutionData && (
              <>
                <ContentSection
                  title="Problem Statement"
                  content={problemStatementData?.problem_statement}
                  isLoading={!problemStatementData}
                />
                {problemStatementData && (
                  <div className="mt-4 flex">
                    <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
                      Generating solutions...
                    </p>
                  </div>
                )}
              </>
            )}
            {solutionData && (
              <>
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
                <DescriptionSection
                  title="Description"
                  content={descriptionData}
                  isLoading={!descriptionData}
                />
                <SolutionSection
                  title="Solution"
                  content={solutionData}
                  isLoading={!solutionData}
                />
                <ComplexitySection
                  timeComplexity={timeComplexityData}
                  spaceComplexity={spaceComplexityData}
                  isLoading={!timeComplexityData || !spaceComplexityData}
                />
              </>
            )}
          </div>
        </div>
      </div>
      {/* if solutions are there, then content should show above*/}
      <SolutionsHelper aboveContent={!!solutionData} />
    </div>
  )
}

export default Solutions
