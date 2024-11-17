import { app, BrowserWindow, ipcMain, globalShortcut } from "electron"
import path from "node:path"
import fs from "node:fs"
import { v4 as uuidv4 } from "uuid"
import screenshot from "screenshot-desktop"

let mainWindow: BrowserWindow | null = null
const screenshotDir = path.join(app.getPath("userData"), "screenshots")

// Create the screenshot directory if it doesn't exist
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir)
}

// Screenshot queue logic
let screenshotQueue: string[] = []
const MAX_SCREENSHOTS = 10

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
