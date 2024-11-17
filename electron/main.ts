import { app, BrowserWindow, ipcMain, globalShortcut } from "electron"
import path from "node:path"
import fs from "node:fs"
import { v4 as uuidv4 } from "uuid"
import screenshot from "screenshot-desktop"
import FormData from "form-data"
import axios from "axios"

let mainWindow: BrowserWindow | null = null
const screenshotDir = path.join(app.getPath("userData"), "screenshots")

const PROCESSING_EVENTS = {
  START: "processing-start",
  SUCCESS: "processing-success",
  ERROR: "processing-error",
  NO_SCREENSHOTS: "processing-no-screenshots"
} as const

// Create the screenshot directory if it doesn't exist
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir)
}

// Screenshot queue logic
let screenshotQueue: string[] = []
const MAX_SCREENSHOTS = 3

// Function to create the main window
function createWindow() {
  // Prevent creating multiple windows
  if (mainWindow !== null) return

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js") // Use preload.js for context isolation
    }
  })

  // Load your application URL
  mainWindow.loadURL("http://localhost:5173")
  mainWindow.webContents.openDevTools() // Open DevTools in development mode

  // Reset mainWindow when it's closed
  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

// Function to capture a screenshot
async function captureScreenshot(): Promise<string> {
  if (!mainWindow) throw new Error("No main window available")

  const screenshotPath = path.join(screenshotDir, `${uuidv4()}.png`)
  await screenshot({ filename: screenshotPath })

  // Add to queue and maintain max size
  screenshotQueue.push(screenshotPath)
  if (screenshotQueue.length > MAX_SCREENSHOTS) {
    const removedPath = screenshotQueue.shift()
    if (removedPath) {
      try {
        await fs.promises.unlink(removedPath)
      } catch (error) {
        console.error("Error removing old screenshot:", error)
      }
    }
  }

  return screenshotPath
}

// Helper function to get image previews
async function getImagePreview(filepath: string): Promise<string> {
  try {
    const data = await fs.promises.readFile(filepath)
    return `data:image/png;base64,${data.toString("base64")}`
  } catch (error) {
    console.error("Error reading image:", error)
    throw error
  }
}

// When the app is ready, create the window and set up IPC and shortcuts
app.whenReady().then(() => {
  createWindow()

  // Register IPC handlers
  ipcMain.handle("process-screenshots", async (event, screenshots) => {
    try {
      const formData = new FormData()

      screenshots.forEach((screenshot: any, index: number) => {
        formData.append(`image_${index}`, screenshot.path)
      })

      formData.append(
        "text_prompt",
        "Analyze the coding problem in the images and provide three possible solutions with different approaches and trade-offs. For each solution, include: \n" +
          "1. Initial thoughts: 2-3 first impressions and key observations about the problem\n" +
          "2. Thought steps: A natural progression of how you would think through implementing this solution, as if explaining to an interviewer\n" +
          "3. Detailed explanation of the approach and its trade-offs\n" +
          "4. Complete, well-commented code implementation\n" +
          "Structure the solutions from simplest/most intuitive to most optimized. Focus on clear explanation and clean code."
      )

      const response = await axios.post(
        "http://0.0.0.0:8000/process_images",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data"
          },
          timeout: 30000
        }
      )

      return { success: true, data: response.data }
    } catch (error) {
      console.error("Processing error:", error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("delete-screenshot", async (event, path) => {
    try {
      await fs.promises.unlink(path) // Delete the file at the given path
      //delete it from the screenshottsqueue
      screenshotQueue = screenshotQueue.filter((filePath) => filePath !== path)

      return { success: true }
    } catch (error) {
      console.error("Error deleting file:", error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("take-screenshot", async () => {
    try {
      const screenshotPath = await captureScreenshot()
      const preview = await getImagePreview(screenshotPath)
      return { path: screenshotPath, preview }
    } catch (error) {
      console.error("Error capturing screenshot:", error)
      throw error
    }
  })

  ipcMain.handle("get-screenshots", async () => {
    try {
      const previews = await Promise.all(
        screenshotQueue.map(async (path) => ({
          path,
          preview: await getImagePreview(path)
        }))
      )
      return previews
    } catch (error) {
      console.error("Error getting screenshots:", error)
      throw error
    }
  })

  // Register global shortcut
  globalShortcut.register("CommandOrControl+Shift+H", async () => {
    if (mainWindow) {
      console.log("Taking screenshot...")
      try {
        const screenshotPath = await captureScreenshot()
        const preview = await getImagePreview(screenshotPath)
        mainWindow.webContents.send("screenshot-taken", {
          path: screenshotPath,
          preview
        })
      } catch (error) {
        console.error("Error capturing screenshot:", error)
      }
    }
  })

  globalShortcut.register("CommandOrControl+Shift+J", async () => {
    if (mainWindow) {
      // Notify renderer that processing is starting
      mainWindow.webContents.send(PROCESSING_EVENTS.START)

      if (screenshotQueue.length === 0) {
        mainWindow.webContents.send(PROCESSING_EVENTS.NO_SCREENSHOTS)
        return
      }

      try {
        const screenshots = await Promise.all(
          screenshotQueue.map(async (path) => ({
            path,
            preview: await getImagePreview(path)
          }))
        )

        const formData = new FormData()

        screenshots.forEach((screenshot, index) => {
          formData.append(`image_${index}`, screenshot.path)
        })

        formData.append(
          "text_prompt",
          "Analyze the coding problem in the images and provide three possible solutions with different approaches and trade-offs. For each solution, include: \n" +
            "1. Initial thoughts: 2-3 first impressions and key observations about the problem\n" +
            "2. Thought steps: A natural progression of how you would think through implementing this solution, as if explaining to an interviewer\n" +
            "3. Detailed explanation of the approach and its trade-offs\n" +
            "4. Complete, well-commented code implementation\n" +
            "Structure the solutions from simplest/most intuitive to most optimized. Focus on clear explanation and clean code."
        )

        const response = await axios.post(
          "http://0.0.0.0:8000/process_images",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data"
            },
            timeout: 30000
          }
        )

        mainWindow.webContents.send(PROCESSING_EVENTS.SUCCESS)
      } catch (error) {
        console.error("Processing error:", error)
        mainWindow.webContents.send(PROCESSING_EVENTS.ERROR, error.message)
      }
    }
  })

  // 'activate' event listener inside 'whenReady' to prevent multiple windows
  app.on("activate", () => {
    if (mainWindow === null) {
      createWindow()
    }
  })
})

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

// Unregister global shortcuts when the app is about to quit
app.on("will-quit", () => {
  globalShortcut.unregisterAll()
})
