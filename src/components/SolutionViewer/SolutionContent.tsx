import React from "react"
import { Solution } from "../../types"

interface SolutionContentProps {
  solution: Solution
  name: string
}

const SolutionContent: React.FC<SolutionContentProps> = ({
  solution,
  name
}) => {
  const solutionName = name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <h2 className="text-2xl font-semibold text-gray-800 pb-4 border-b border-gray-200">
        {solutionName} Solution
      </h2>

      <section className="mt-6">
        <h3 className="text-lg font-medium text-gray-700 mb-3">
          Initial Thoughts
        </h3>
        <ul className="list-disc pl-5 space-y-2 text-gray-600">
          {solution.initial_thoughts.map((thought, index) => (
            <li key={index}>{thought}</li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h3 className="text-lg font-medium text-gray-700 mb-3">
          Thought Process
        </h3>
        <ol className="list-decimal pl-5 space-y-2 text-gray-600">
          {solution.thought_steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="mt-6">
        <h3 className="text-lg font-medium text-gray-700 mb-3">
          Approach & Trade-offs
        </h3>
        <p className="text-gray-600 leading-relaxed">{solution.description}</p>
      </section>

      <section className="mt-6">
        <h3 className="text-lg font-medium text-gray-700 mb-3">
          Implementation
        </h3>
        <pre className="bg-gray-50 p-4 rounded-lg border border-gray-200 overflow-x-auto">
          <code className="text-sm font-mono text-gray-800">
            {solution.code}
          </code>
        </pre>
      </section>
    </div>
  )
}

export default SolutionContent
