import { app, BrowserWindow, screen, ipcMain, globalShortcut } from "electron"
import path from "node:path"
import fs from "node:fs"
import { v4 as uuidv4 } from "uuid"
import screenshot from "screenshot-desktop"
import FormData from "form-data"
import axios from "axios"

let mainWindow: BrowserWindow | null = null
let isWindowVisible = true
let view = "queue"
let windowPosition: { x: number; y: number } | null = null
let windowSize: { width: number; height: number } | null = null

function getScreenHeight() {
  const primaryDisplay = screen.getPrimaryDisplay()
  return primaryDisplay.workAreaSize.height
}

const screenshotDir = path.join(app.getPath("userData"), "screenshots")
const extraScreenshotDir = path.join(
  app.getPath("userData"),
  "extra_screenshots"
)

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
if (!fs.existsSync(extraScreenshotDir)) {
  fs.mkdirSync(extraScreenshotDir)
}

// Screenshot queue logic
let screenshotQueue: string[] = []
let extraScreenshotQueue: string[] = []
const MAX_SCREENSHOTS = 5

//additional context queue logic
let additionalContextQueue: string[] = []

ipcMain.handle("update-content-height", async (event, height: number) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const [width] = mainWindow.getSize()
    mainWindow.setSize(width, Math.ceil(height))
  }
})

function createWindow() {
  if (mainWindow !== null) return
  const screenHeight = getScreenHeight()
  const windowSettings = {
    width: 600,
    height: screenHeight,
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
    visualEffectState: "active" as const,
    // Make it work with macOS fullscreen apps
    fullscreenable: false,
    // Optional: remove the window shadow
    hasShadow: false,
    backgroundColor: "#00000000",
    focusable: true
  }
  mainWindow = new BrowserWindow(windowSettings)
  // Set the window level to float above everything (including fullscreen apps)
  if (process.platform === "darwin") {
    mainWindow.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true
    })
    // This is crucial for floating above fullscreen apps
    mainWindow.setAlwaysOnTop(true, "floating")
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
    isWindowVisible = false
    windowPosition = null
    windowSize = null
  })
}

//LOGIC FOR CMD+B, TOGGLING VISIBILITY
function hideMainWindow() {
  if (!mainWindow) {
    createWindow()
    return
  }

  if (mainWindow.isDestroyed()) {
    createWindow()
    return
  }

  // Store current position and size before hiding
  const bounds = mainWindow.getBounds()
  windowPosition = { x: bounds.x, y: bounds.y }
  windowSize = { width: bounds.width, height: bounds.height }
  mainWindow.hide()

  isWindowVisible = false
}

function showMainWindow() {
  if (!mainWindow) {
    createWindow()
    return
  }

  if (mainWindow.isDestroyed()) {
    createWindow()
    return
  }

  // Get the currently focused window before showing
  const focusedWindow = require("electron").BrowserWindow.getFocusedWindow()

  if (windowPosition && windowSize) {
    mainWindow.setBounds({
      x: windowPosition.x,
      y: windowPosition.y,
      width: windowSize.width,
      height: windowSize.height
    })
  }

  mainWindow.showInactive()

  // If there was a focused window, restore focus to it
  if (focusedWindow && !focusedWindow.isDestroyed()) {
    focusedWindow.focus()
  }

  isWindowVisible = true
}

function toggleMainWindow() {
  if (isWindowVisible) {
    hideMainWindow()
  } else {
    showMainWindow()
  }
}
// LOGIC FOR CMD+H
async function takeScreenshot(): Promise<string> {
  if (!mainWindow) throw new Error("No main window available")

  hideMainWindow()
  let screenshotPath = ""
  if (view == "queue") {
    screenshotPath = path.join(screenshotDir, `${uuidv4()}.png`)
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
  } else {
    screenshotPath = path.join(extraScreenshotDir, `${uuidv4()}.png`)
    await screenshot({ filename: screenshotPath })

    // Add to queue and maintain max size
    extraScreenshotQueue.push(screenshotPath)
    if (extraScreenshotQueue.length > MAX_SCREENSHOTS) {
      const removedPath = extraScreenshotQueue.shift()
      if (removedPath) {
        try {
          await fs.promises.unlink(removedPath)
        } catch (error) {
          console.error("Error removing old screenshot:", error)
        }
      }
    }
  }

  showMainWindow()
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

async function processScreenshots() {
  if (mainWindow) {
    if (view == "queue") {
      if (screenshotQueue.length === 0) {
        mainWindow.webContents.send(PROCESSING_EVENTS.NO_SCREENSHOTS)
        return
      }

      mainWindow.webContents.send(PROCESSING_EVENTS.START)
      try {
        const screenshots = await Promise.all(
          screenshotQueue.map(async (path) => ({
            path,
            preview: await getImagePreview(path)
          }))
        )

        const result = await processScreenshotsHelper(screenshots)

        if (result.success) {
          console.log("Processing success:", result.data)

          mainWindow.webContents.send(PROCESSING_EVENTS.SUCCESS, result.data)
        } else {
          mainWindow.webContents.send(PROCESSING_EVENTS.ERROR, result.error)
        }
      } catch (error) {
        console.error("Processing error:", error)
        mainWindow.webContents.send(PROCESSING_EVENTS.ERROR, error.message)
      }
    } else {
      if (extraScreenshotQueue.length === 0) {
        console.log("No extra screenshots to process")
        mainWindow.webContents.send(PROCESSING_EVENTS.NO_SCREENSHOTS)
        return
      }
      mainWindow.webContents.send(PROCESSING_EVENTS.START)
      try {
        const screenshots = await Promise.all(
          [...screenshotQueue, ...extraScreenshotQueue].map(async (path) => ({
            path,
            preview: await getImagePreview(path)
          }))
        )

        const result = await processScreenshotsHelper(screenshots)

        if (result.success) {
          console.log("Processing success:", result.data)
          mainWindow.webContents.send(PROCESSING_EVENTS.SUCCESS, result.data)
        } else {
          mainWindow.webContents.send(PROCESSING_EVENTS.ERROR, result.error)
        }
      } catch (error) {
        console.error("Processing error:", error)
        mainWindow.webContents.send(PROCESSING_EVENTS.ERROR, error.message)
      }
    }
  }
}
//helper function to process screenshots
async function processScreenshotsHelper(
  screenshots: Array<{ path: string }>,
  problem_statement: string | null = null
) {
  try {
    const formData = new FormData()

    screenshots.forEach((screenshot) => {
      formData.append("images", fs.createReadStream(screenshot.path))
    })

    let response
    if (view == "queue") {
      try {
        view = "solutions"
        response = await axios.post(
          "http://0.0.0.0:8000/extract_problem",
          formData,
          {
            headers: {
              ...formData.getHeaders() // This gets the correct content-type with boundary
            },
            timeout: 300000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
          }
        )
      } catch (error: any) {
        view = "queue"
        mainWindow.webContents.send(
          PROCESSING_EVENTS.ERROR,
          "Error processing screenshots"
        )
      }
    } else {
      formData.append("problem_statement", JSON.stringify(problem_statement))
      try {
        response = await axios.post(
          "http://0.0.0.0:8000/debug_solutions",
          formData,
          {
            headers: {
              ...formData.getHeaders() // This gets the correct content-type with boundary
            },
            timeout: 300000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
          }
        )
      } catch (error: any) {
        mainWindow.webContents.send(
          PROCESSING_EVENTS.ERROR,
          "Error processing additional context screenshots"
        )
      }
    }
    if (view == "queue") {
      view = "solutions"
    }

    return { success: true, data: response.data }
  } catch (error) {
    console.error("Processing error:", error)
    return { success: false, error: error.message }
  }
}

async function deleteScreenshot(path: string) {
  try {
    await fs.promises.unlink(path) // Delete the file at the given path
    //delete it from the screenshottsqueue
    if (view == "queue") {
      screenshotQueue = screenshotQueue.filter((filePath) => filePath !== path)
    } else {
      extraScreenshotQueue = extraScreenshotQueue.filter(
        (filePath) => filePath !== path
      )
    }

    return { success: true }
  } catch (error) {
    console.error("Error deleting file:", error)
    return { success: false, error: error.message }
  }
}
// When the app is ready, create the window and set up IPC and shortcuts
app.whenReady().then(() => {
  createWindow()

  // OS - PERMISSION FUNCTION HANDLERS
  ipcMain.handle("process-screenshots", async (event, screenshots) => {
    return processScreenshotsHelper(screenshots)
  })

  ipcMain.handle("delete-screenshot", async (event, path) => {
    const deletedScreenshot = await deleteScreenshot(path)
    return deletedScreenshot
  })

  ipcMain.handle("take-screenshot", async () => {
    const screenshotPath = await takeScreenshot()
    return screenshotPath
  })

  ipcMain.handle("get-screenshots", async () => {
    console.log({ view })
    try {
      let previews = []
      if (view == "queue") {
        previews = await Promise.all(
          screenshotQueue.map(async (path) => ({
            path,
            preview: await getImagePreview(path)
          }))
        )
      } else {
        previews = await Promise.all(
          extraScreenshotQueue.map(async (path) => ({
            path,
            preview: await getImagePreview(path)
          }))
        )
      }
      previews.forEach((preview: any) => console.log(preview.path))
      return previews
    } catch (error) {
      console.error("Error getting screenshots:", error)
      throw error
    }
  })

  ipcMain.handle("toggle-window", async () => {
    toggleMainWindow()
  })

  // GLOBAL SHORTCUTS
  globalShortcut.register("CommandOrControl+H", async () => {
    if (mainWindow) {
      console.log("Taking screenshot...")
      try {
        const screenshotPath = await takeScreenshot()
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
    processScreenshots()
  })

  globalShortcut.register("CommandOrControl+B", () => {
    toggleMainWindow()
    // If window exists and we're showing it, bring it to front
    if (mainWindow && !isWindowVisible) {
      // Force the window to the front on macOS
      if (process.platform === "darwin") {
        mainWindow.setAlwaysOnTop(true, "normal")
        // "normal" | "floating" | "torn-off-menu" | "modal-panel" | "main-menu" | "status" | "pop-up-menu" | "screen-saver" | "dock"
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
