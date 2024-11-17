import React, { useState, useEffect } from "react"
import SolutionTabs from "./SolutionTabs"
import SolutionContent from "./SolutionContent"
import KeyboardHint from "./KeyboardHint"
import { Solution } from "../../types"

interface SolutionViewerProps {
  solutions: Record<string, Solution>
}

const SolutionViewer: React.FC<SolutionViewerProps> = ({ solutions }) => {
  const [currentTab, setCurrentTab] = useState(0)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.shiftKey) {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault()
          setCurrentTab((prev) => (prev + 1) % Object.keys(solutions).length)
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault()
          setCurrentTab(
            (prev) =>
              (prev - 1 + Object.keys(solutions).length) %
              Object.keys(solutions).length
          )
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [solutions])

  const solutionEntries = Object.entries(solutions)

  return (
    <div className="min-h-screen bg-gray-50">
      <SolutionTabs
        solutions={solutions}
        currentTab={currentTab}
        onTabChange={setCurrentTab}
      />

      {solutionEntries[currentTab] && (
        <div className="p-6">
          <SolutionContent
            solution={solutionEntries[currentTab][1]}
            name={solutionEntries[currentTab][0]}
          />
        </div>
      )}

      <KeyboardHint />
    </div>
  )
}

export default SolutionViewer
