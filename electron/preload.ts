import { contextBridge, ipcRenderer } from "electron"

//types for electron api object to use in imports
interface ElectronAPI {
  takeScreenshot: () => Promise<string>
  onSolutionsReady: (callback: (solutions: string) => void) => () => void
}

//our preload.ts allows us to expose certain functions used in the main.ts to the web environment, which we can access in our app.tsx
contextBridge.exposeInMainWorld("electronAPI", {
  takeScreenshot: () => ipcRenderer.invoke("take-screenshot"), //turns the node function into a usable api exported to the web environment
  getScreenshots: () => ipcRenderer.invoke("get-screenshots"),
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
