import { useQueryClient } from "react-query"
import { useEffect, useState } from "react"
import { CodeBlock, dracula } from "react-code-blocks"

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
    <div className="w-full text-sm text-black backdrop-blur-md bg-black/60 rounded-md">
      <div className=" rounded-lg overflow-hidden ">
        <div className="px-4 py-3 space-y-4">
          {/* Problem Statement */}
          <ContentSection
            title="Problem Statement"
            content={problemStatementData?.problem_statement}
            isLoading={!problemStatementData}
          />
          {/* Thoughts */}
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
          {/* Solution  */}
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
  )
}

export default Solutions
