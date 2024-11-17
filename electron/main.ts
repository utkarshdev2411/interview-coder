import { app, BrowserWindow, ipcMain, globalShortcut, screen } from "electron"
import path from "node:path"
import fs from "node:fs"
import { v4 as uuidv4 } from "uuid"
import screenshot from "screenshot-desktop"

let mainWindow: BrowserWindow | null = null
const screenshotDir = path.join(app.getPath("userData"), "screenshots")

//we're going to arbitrarily define a screenshot directory as
//./userData/screenshots
// make it if it doesn't exist
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir)
}

//SCREENSHOT QUEUE LOGIC
let screenshotQueue: string[] = [] //default this to an empty array
const MAX_SCREENSHOTS = 10

//this is the main window, which is like initial browser
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js") //we use preload.js instead of preload.ts because this works in a built, post compiled environment
    }
  })

  //dev mode
  mainWindow.loadURL("http://localhost:5173")
  mainWindow.webContents.openDevTools() //auto starts it up with the inspect element open

  //PRODUCTION METHOD OF LOADING
  //mainWindow.loadFile(path.join(__dirname, "../dist/index.html"))

  return mainWindow
}

async function captureScreenshot(): Promise<string> {
  if (!mainWindow) throw new Error("No main window available")

  const screenshotPath = path.join(screenshotDir, `${uuidv4()}.png`)
  await screenshot({ filename: screenshotPath })

  // add to queue and maintain max size of queue
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

  //TODO: consider resizing using the sharp module
  return screenshotPath
}

// helper function to preview images
async function getImagePreview(filepath: string): Promise<string> {
  try {
    const data = await fs.promises.readFile(filepath)
    return `data:image/png;base64,${data.toString("base64")}`
  } catch (error) {
    console.error("Error reading image:", error)
    throw error
  }
}

app.whenReady().then(() => {
  //this will fulfill when the app is ready.
  mainWindow = createWindow()

  //THIS IS HOW WE DEFINE OUR NODE.JS FUNCTIONS.
  //in our main.ts, we have access to system level stuff
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

  globalShortcut.register("CommandOrControl+Shift+H", async () => {
    if (mainWindow) {
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
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  //emitted when the application is activated
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on("will-quit", () => {
  //when all windows have been closed and the application will quit.
  //event.preventDefault() will prevent termination of teh application.
  globalShortcut.unregisterAll()
})
