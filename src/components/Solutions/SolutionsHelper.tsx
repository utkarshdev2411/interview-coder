const SolutionsHelper = ({ aboveContent = false }) => {
  return (
    <>
      {/* This is our invisible element that affects document height */}
      {!aboveContent && (
        <div className="h-96 w-80 pointer-events-none opacity-0" />
      )}

      <div className="fixed bottom-8 right-8 group">
        {/* Question mark circle */}
        <div className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors flex items-center justify-center cursor-help z-10 relative">
          <span className="text-xs text-white/70">?</span>
        </div>

        {/* Tooltip Content */}
        <div className="hidden group-hover:block absolute right-0 w-80">
          <div className={aboveContent ? "bottom-full mb-2" : "top-full mt-2"}>
            <div className="p-3 text-xs bg-black/80 backdrop-blur-md rounded-lg border border-white/10 text-white/90 shadow-lg">
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
                      Screenshot more parts of the question to add context, or
                      capture your solution to get debugging help. Up to 5
                      additional screenshots are saved.
                    </p>
                  </div>
                  {/* Solve Command */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Solve Problem</span>
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default SolutionsHelper
