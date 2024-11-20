import { useQueryClient } from "react-query"
import { useEffect, useState, useRef } from "react"

interface SolutionsData {
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

// Declare the window interface to include our electron API
declare global {
  interface Window {
    electron: {
      updateContentHeight: (height: number) => void
    }
  }
}

const SkeletonLine = ({ width = "w-full" }: { width?: string }) => (
  <div className={`h-5 bg-gray-800/50 rounded-md animate-pulse ${width}`} />
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
  <div className="space-y-4">
    <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
    {isLoading ? (
      <div className="space-y-3">
        <SkeletonLine />
        <SkeletonLine width="w-11/12" />
        <SkeletonLine width="w-10/12" />
      </div>
    ) : (
      <div className="text-base leading-7 text-gray-100 font-medium">
        {content}
      </div>
    )}
  </div>
)

const Solutions: React.FC = () => {
  const queryClient = useQueryClient()
  const [solutionsData, setSolutionsData] = useState<SolutionsData | null>(null)

  // Effect for data subscription
  useEffect(() => {
    setSolutionsData(queryClient.getQueryData(["solutions"]) || null)

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query.queryKey[0] === "solutions") {
        setSolutionsData(queryClient.getQueryData(["solutions"]) || null)
      }
    })
    return () => unsubscribe()
  }, [queryClient])

  return (
    <div className="w-full mx-auto p-4 space-y-8">
      {/* Problem Statement */}
      <ContentSection
        title="Problem Statement"
        content={solutionsData?.problem_statement}
        isLoading={!solutionsData}
      />
      {/* Constraints */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white tracking-tight">
          Constraints
        </h2>
        {!solutionsData ? (
          <div className="space-y-3">
            {Array(3)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-gray-800/50 animate-pulse" />
                  <SkeletonLine />
                </div>
              ))}
          </div>
        ) : (
          <div className="space-y-2">
            {solutionsData.constraints.map((constraint, index) => (
              <div
                key={index}
                className="flex items-center gap-3 text-base leading-7 text-gray-100 font-medium"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1" />
                {constraint.description}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Solutions
