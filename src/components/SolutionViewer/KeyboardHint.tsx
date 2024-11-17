import React from "react"

const KeyboardHint: React.FC = () => {
  return (
    <div className="fixed bottom-5 right-5 bg-black bg-opacity-80 text-white px-3 py-2 rounded text-sm">
      Navigate with{" "}
      <kbd className="px-2 py-1 bg-gray-700 rounded text-xs mx-1">⌘</kbd>+
      <kbd className="px-2 py-1 bg-gray-700 rounded text-xs mx-1">⇧</kbd>+
      <kbd className="px-2 py-1 bg-gray-700 rounded text-xs mx-1">←</kbd>/
      <kbd className="px-2 py-1 bg-gray-700 rounded text-xs mx-1">→</kbd>
    </div>
  )
}

export default KeyboardHint
