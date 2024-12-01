import React, { useState, useEffect, useRef } from "react"

interface ExtraScreenshotsQueueHelperProps {
  extraScreenshots: any[]
  onTooltipVisibilityChange?: (visible: boolean, height: number) => void
}

const ExtraScreenshotsQueueHelper: React.FC<
  ExtraScreenshotsQueueHelperProps
> = ({ extraScreenshots, onTooltipVisibilityChange }) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (onTooltipVisibilityChange) {
      let tooltipHeight = 0
      if (tooltipRef.current && isTooltipVisible) {
        tooltipHeight = tooltipRef.current.offsetHeight + 10 // Adjust if necessary
      }
      onTooltipVisibilityChange(isTooltipVisible, tooltipHeight)
    }
  }, [isTooltipVisible, onTooltipVisibilityChange])

  const handleMouseEnter = () => {
    setIsTooltipVisible(true)
  }

  const handleMouseLeave = () => {
    setIsTooltipVisible(false)
  }

  return (
    <div>
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

          {/* Screenshot */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] leading-none">
              {extraScreenshots.length === 0
                ? "Screenshot your code to debug"
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
          {extraScreenshots.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] leading-none">Re-solve/Debug</span>
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
          {/* Separator */}
          <div className="mx-2 h-4 w-px bg-white/20" />

          {/* Question Mark with Tooltip */}
          <div
            className="relative inline-block"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* Question mark circle */}
            <div className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors flex items-center justify-center cursor-help z-10">
              <span className="text-xs text-white/70">?</span>
            </div>

            {/* Tooltip Content */}
            {isTooltipVisible && (
              <div
                ref={tooltipRef}
                className="absolute top-full right-0 mt-2 w-80"
                style={{ zIndex: 100 }}
              >
                <div className="p-3 text-xs bg-black/80 backdrop-blur-md rounded-lg border border-white/10 text-white/90 shadow-lg">
                  {/* Tooltip content */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Keyboard Shortcuts</h3>
                    <div className="space-y-3">
                      {/* Toggle Command */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span>Toggle Window</span>
                          <div className="flex gap-1">
                            <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              ⌘
                            </span>
                            <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              B
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] leading-relaxed text-white/70">
                          Show or hide this window.
                        </p>
                      </div>
                      {/* Screenshot Command */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span>Take Screenshot</span>
                          <div className="flex gap-1">
                            <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              ⌘
                            </span>
                            <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              H
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] leading-relaxed text-white/70">
                          Capture additional parts of the question or your
                          solution for debugging help. Up to 5 extra screenshots
                          are saved.
                        </p>
                      </div>
                      {/* Re-solve/Debug Command */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span>Re-solve/Debug</span>
                          <div className="flex gap-1">
                            <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              ⌘
                            </span>
                            <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              ↵
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] leading-relaxed text-white/70">
                          Generate new solutions based on all previous and newly
                          added screenshots.
                        </p>
                      </div>
                      {/* Start Over Command */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span>Start Over</span>
                          <div className="flex gap-1">
                            <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              ⌘
                            </span>
                            <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              R
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] leading-relaxed text-white/70">
                          Start fresh with a new question.
                        </p>
                      </div>
                      {/* Window Movement Command */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span>Move Window</span>
                          <div className="flex gap-1">
                            <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              ⌘
                            </span>
                            <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              ←
                            </span>
                            <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              →
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] leading-relaxed text-white/70">
                          Move the window to the left or right side of the
                          screen.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* End of Tooltip Content */}
          </div>

          {/* Separator */}
          <div className="mx-2 h-4 w-px bg-white/20" />
        </div>
      </div>
    </div>
  )
}

export default ExtraScreenshotsQueueHelper
