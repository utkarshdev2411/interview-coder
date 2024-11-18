import { app, BrowserWindow, ipcMain, globalShortcut } from "electron"
import path from "node:path"
import fs from "node:fs"
import { v4 as uuidv4 } from "uuid"
import screenshot from "screenshot-desktop"
import FormData from "form-data"
import { Screen } from "electron"
import axios from "axios"

let mainWindow: BrowserWindow | null = null
let isWindowVisible = true
let windowPosition: { x: number; y: number } | null = null
let windowSize: { width: number; height: number } | null = null

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

// All functionality for creating / toggling the

ipcMain.handle("update-content-height", async (event, height: number) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const [width] = mainWindow.getSize()
    mainWindow.setSize(width, Math.ceil(height))
  }
})

function createWindow() {
  if (mainWindow !== null) return

  const windowSettings = {
    width: 1000,
    height: 400,
    x: 0,
    y: 0,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js")
    },
    show: true,
    // Add these settings to make the window float
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    // These settings help with macOS behavior
    vibrancy: "under-window" as const,
    visualEffectState: "active" as const,

    // Make it work with macOS fullscreen apps
    fullscreenable: false,
    // Optional: remove the window shadow
    hasShadow: false,
    backgroundColor: "#00000000"
  }

  mainWindow = new BrowserWindow(windowSettings)

  // Set the window level to float above everything (including fullscreen apps)
  if (process.platform === "darwin") {
    mainWindow.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true
    })
    // This is crucial for floating above fullscreen apps
    mainWindow.setAlwaysOnTop(true, "screen-saver")
  }

  mainWindow.loadURL("http://localhost:5173")

  // Store initial position and size
  const bounds = mainWindow.getBounds()
  windowPosition = { x: bounds.x, y: bounds.y }
  windowSize = { width: bounds.width, height: bounds.height }

  mainWindow.on("move", () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds()
      windowPosition = { x: bounds.x, y: bounds.y }
    }
  })

  mainWindow.on("resize", () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds()
      windowSize = { width: bounds.width, height: bounds.height }
    }
  })

  mainWindow.on("closed", () => {
    mainWindow = null
    isWindowVisible = true
    windowPosition = null
    windowSize = null
  })

  // Prevent the window from losing focus when clicking outside
  mainWindow.on("blur", () => {
    if (isWindowVisible && !mainWindow?.isDestroyed()) {
      mainWindow?.focus()
    }
  })
}

//LOGIC FOR CMD+B
function toggleMainWindow() {
  if (!mainWindow) {
    createWindow()
    return
  }

  if (mainWindow.isDestroyed()) {
    createWindow()
    return
  }

  if (isWindowVisible) {
    // Store current position and size before hiding
    const bounds = mainWindow.getBounds()
    windowPosition = { x: bounds.x, y: bounds.y }
    windowSize = { width: bounds.width, height: bounds.height }
    mainWindow.hide()
  } else {
    // Restore window at the last position and size
    if (windowPosition && windowSize) {
      mainWindow.setBounds({
        x: windowPosition.x,
        y: windowPosition.y,
        width: windowSize.width,
        height: windowSize.height
      })
    }
    mainWindow.show()
    mainWindow.focus() // Ensure window is focused when shown
  }

  isWindowVisible = !isWindowVisible
}

// LOGIC FOR CMD+H
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

  ipcMain.handle("toggle-window", async () => {
    toggleMainWindow()
  })

  // Register global shortcut
  globalShortcut.register("CommandOrControl+H", async () => {
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

  globalShortcut.register("CommandOrControl+Enter", async () => {
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

  globalShortcut.register("CommandOrControl+B", () => {
    toggleMainWindow()
    // If window exists and we're showing it, bring it to front
    if (mainWindow && !isWindowVisible) {
      // Force the window to the front on macOS
      if (process.platform === "darwin") {
        app.dock.show() // Temporarily show dock icon if hidden
        app.focus({ steal: true }) // Force focus to the app
        mainWindow.setAlwaysOnTop(true, "screen-saver")
        // Reset alwaysOnTop after a brief delay to allow other windows to go above if needed
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.setAlwaysOnTop(true, "floating")
          }
        }, 100)
      }
    }
  })

  // 'activate' event listener inside 'whenReady' to prevent multiple windows
  app.on("activate", () => {
    if (mainWindow === null) {
      createWindow()
    } else if (!isWindowVisible) {
      toggleMainWindow()
    }
  })
})

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  isWindowVisible = true
  windowPosition = null
  windowSize = null

  if (process.platform !== "darwin") {
    app.quit()
  }
})

// Unregister global shortcuts when the app is about to quit
app.on("will-quit", () => {
  globalShortcut.unregisterAll()
})

app.dock?.hide() // Hide dock icon (optional)
app.commandLine.appendSwitch("disable-background-timer-throttling")
