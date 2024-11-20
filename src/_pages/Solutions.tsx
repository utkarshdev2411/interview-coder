// Solutions.tsx
import { useQueryClient } from "react-query"
import { useEffect, useState } from "react"
import Processing from "../components/Loading/Processing"

const Solutions: React.FC = () => {
  const queryClient = useQueryClient()
  const [solutionsData, setSolutionsData] = useState<any>(null)

  useEffect(() => {
    // Set initial data
    setSolutionsData(queryClient.getQueryData(["solutions"]))
    console.log(queryClient.getQueryData(["solutions"]))

    // Subscribe to changes
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query.queryKey[0] === "solutions") {
        setSolutionsData(queryClient.getQueryData(["solutions"]))
      }
    })

    return () => unsubscribe()
  }, [queryClient])

  // If no solutions data yet, show loading state
  if (!solutionsData) {
    return (
      <div>
        {/* Your loading UI here */}
        <Processing />
      </div>
    )
  }

  return (
    <div>
      {/* Your solutions UI here */}
      {JSON.stringify(solutionsData, null, 2)}
    </div>
  )
}

export default Solutions
