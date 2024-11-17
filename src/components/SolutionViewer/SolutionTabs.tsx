import React from "react"
import { Solution } from "../../types"

interface SolutionTabsProps {
  solutions: Record<string, Solution>
  currentTab: number
  onTabChange: (index: number) => void
}

const SolutionTabs: React.FC<SolutionTabsProps> = ({
  solutions,
  currentTab,
  onTabChange
}) => {
  return (
    <div className="flex bg-white border-b border-gray-200 sticky top-0 z-10">
      {Object.entries(solutions).map(([key], index) => {
        const solutionName = key
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")

        return (
          <button
            key={key}
            className={`flex-1 px-4 py-4 text-base transition-all
              ${
                currentTab === index
                  ? "border-b-2 border-orange-500 text-orange-500 font-semibold"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            onClick={() => onTabChange(index)}
          >
            {solutionName}
          </button>
        )
      })}
    </div>
  )
}

export default SolutionTabs
