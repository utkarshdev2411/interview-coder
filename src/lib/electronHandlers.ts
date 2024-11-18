interface Screenshot {
  path: string
  preview: string
}

interface ToastMessage {
  title: string
  description: string
  variant: "success" | "error" | "neutral"
}

export const handleTakeScreenshot = async (
  setScreenshots: React.Dispatch<React.SetStateAction<Screenshot[]>>,
  showToast: (
    title: string,
    description: string,
    variant: ToastMessage["variant"]
  ) => void
) => {
  try {
    const screenshot = await window.electronAPI.takeScreenshot()
    setScreenshots((prev) => [...prev, screenshot].slice(-3))
  } catch (error) {
    console.error("Error taking screenshot:", error)
    showToast("Error", "Failed to take screenshot", "error")
  }
}

export const handleGetSolutions = async (
  screenshots: Screenshot[],
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>,
  showToast: (
    title: string,
    description: string,
    variant: ToastMessage["variant"]
  ) => void
) => {
  if (screenshots.length === 0) {
    showToast(
      "No Screenshots",
      "There are no screenshots to process.",
      "neutral"
    )
    return
  }

  setIsProcessing(true)
  try {
    const response = await window.electronAPI.processScreenshots(screenshots)
    if (response.success) {
      showToast(
        "Processing Complete",
        "Your screenshots were processed successfully.",
        "success"
      )
    } else {
      showToast(
        "Processing Failed",
        "There was an error processing your screenshots.",
        "error"
      )
    }
  } catch (error) {
    console.error("Error processing screenshots:", error)
    showToast(
      "Error",
      "An unexpected error occurred while processing screenshots",
      "error"
    )
  } finally {
    setIsProcessing(false)
  }
}

export const handleToggleVisibility = () => {
  window.electronAPI.toggleMainWindow()
}

export const handleDeleteScreenshot = async (
  index: number,
  screenshots: Screenshot[],
  setScreenshots: React.Dispatch<React.SetStateAction<Screenshot[]>>,
  showToast: (
    title: string,
    description: string,
    variant: ToastMessage["variant"]
  ) => void
) => {
  const screenshotToDelete = screenshots[index]

  try {
    const response = await window.electronAPI.deleteScreenshot(
      screenshotToDelete.path
    )

    if (response.success) {
      setScreenshots((prev) => prev.filter((_, i) => i !== index))
      showToast("Success", "Screenshot deleted successfully", "success")
    } else {
      console.error("Failed to delete screenshot:", response.error)
      showToast("Error", "Failed to delete the screenshot file", "error")
    }
  } catch (error) {
    console.error("Error deleting screenshot:", error)
    showToast(
      "Error",
      "An unexpected error occurred while deleting the screenshot",
      "error"
    )
  }
}
