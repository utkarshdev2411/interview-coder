import React from "react"

const ShortcutTooltip = () => {
  return (
    <div className="absolute bottom-4 right-4 flex justify-center items-center">
      {/* Question Mark Button */}
      <div className="group relative flex justify-center items-center">
        <button className="flex items-center justify-center w-10 h-10 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/30 transition">
          ?
        </button>
        {/* Tooltip */}
        <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-end bg-black/80 text-white text-sm rounded-lg shadow-lg p-4 w-[250px] whitespace-normal right-0">
          <div className="flex flex-col gap-2">
            <div className="flex items-center">
              <kbd className="inline-flex items-center bg-white/20 backdrop-blur-sm rounded-md text-xs text-white border border-white/20 px-2 py-1 whitespace-nowrap">
                ⌘ + Shift + H
              </kbd>
              <span className="ml-2 text-xs">
                Take additional screenshot (up to 5)
              </span>
            </div>
            <div className="flex items-center">
              <kbd className="inline-flex items-center bg-white/20 backdrop-blur-sm rounded-md text-xs text-white border border-white/20 px-2 py-1 whitespace-nowrap">
                ⌘ + ↵
              </kbd>
              <span className="ml-2 text-xs">Get updated solutions</span>
            </div>
            <div className="flex items-center">
              <kbd className="inline-flex items-center bg-white/20 backdrop-blur-sm rounded-md text-xs text-white border border-white/20 px-2 py-1 whitespace-nowrap">
                ⌘ + B
              </kbd>
              <span className="ml-2 text-xs">Toggle visibility</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShortcutTooltip
