import { contextBridge, ipcRenderer } from "electron"

//types for electron api object to use in imports
interface ElectronAPI {
  takeScreenshot: () => Promise<string>
  onSolutionsReady: (callback: (solutions: string) => void) => () => void
}

const PROCESSING_EVENTS = {
  START: "processing-start",
  SUCCESS: "processing-success",
  ERROR: "processing-error",
  NO_SCREENSHOTS: "processing-no-screenshots"
} as const

//our preload.ts allows us to expose certain functions used in the main.ts to the web environment, which we can access in our app.tsx
contextBridge.exposeInMainWorld("electronAPI", {
  updateContentHeight: (height: number) =>
    ipcRenderer.invoke("update-content-height", height),
  takeScreenshot: () => ipcRenderer.invoke("take-screenshot"), //turns the node function into a usable api exported to the web environment
  getScreenshots: () => ipcRenderer.invoke("get-screenshots"),
  processScreenshots: (screenshots: Array<{ path: string; preview: string }>) =>
    ipcRenderer.invoke("process-screenshots", screenshots),
  onProcessingStart: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.START, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.START, subscription)
    }
  },
  onProcessingSuccess: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.SUCCESS, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.SUCCESS, subscription)
    }
  },
  onProcessingError: (callback: (error: string) => void) => {
    const subscription = (_: any, error: string) => callback(error)
    ipcRenderer.on(PROCESSING_EVENTS.ERROR, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.ERROR, subscription)
    }
  },
  onProcessingNoScreenshots: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.NO_SCREENSHOTS, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.NO_SCREENSHOTS, subscription)
    }
  },
  deleteScreenshot: (path: string) =>
    ipcRenderer.invoke("delete-screenshot", path), // New function
  onScreenshotTaken: (
    callback: (data: { path: string; preview: string }) => void
  ) => {
    const subscription = (_: any, data: { path: string; preview: string }) =>
      callback(data)
    ipcRenderer.on("screenshot-taken", subscription)
    return () => {
      ipcRenderer.removeListener("screenshot-taken", subscription)
    }
  },
  onSolutionsReady: (callback: (solutions: string) => void) => {
    const subscription = (_: any, solutions: string) => callback(solutions)
    ipcRenderer.on("solutions-ready", subscription)
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener("solutions-ready", subscription)
    }
  }
} as ElectronAPI)
