// core/WindowHelper.ts

import { BrowserWindow, screen } from "electron"
import path from "node:path"

const isDev = process.env.NODE_ENV === "development"

const startUrl = isDev
  ? "http://localhost:5173"
  : `file://${path.join(__dirname, "../dist/index.html")}`

export class WindowHelper {
  private mainWindow: BrowserWindow | null = null
  private isWindowVisible: boolean = true
  private windowPosition: { x: number; y: number } | null = null
  private windowSize: { width: number; height: number } | null = null

  constructor() {}

  private getScreenHeight(): number {
    const primaryDisplay = screen.getPrimaryDisplay()
    return primaryDisplay.workAreaSize.height
  }

  public createWindow(): void {
    if (this.mainWindow !== null) return

    const screenHeight = this.getScreenHeight()
    const windowSettings: Electron.BrowserWindowConstructorOptions = {
      width: isDev ? 800 : 600,
      height: screenHeight,
      x: 0,
      y: 0,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "preload.js")
      },
      show: true,
      alwaysOnTop: true,
      frame: false,
      transparent: true,
      fullscreenable: false,
      hasShadow: false,
      backgroundColor: "#00000000",
      focusable: true
    }

    this.mainWindow = new BrowserWindow(windowSettings)
    this.mainWindow.setContentProtection(true)
    this.mainWindow.setHiddenInMissionControl(true)
    if (isDev) {
      this.mainWindow.webContents.openDevTools()
    }

    if (process.platform === "darwin") {
      this.mainWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true
      })
      this.mainWindow.setAlwaysOnTop(true, "floating")
    }

    this.mainWindow.loadURL(startUrl).catch((err) => {
      console.error("Failed to load URL:", err)
    })

    const bounds = this.mainWindow.getBounds()
    this.windowPosition = { x: bounds.x, y: bounds.y }
    this.windowSize = { width: bounds.width, height: bounds.height }

    this.setupWindowListeners()
  }

  private setupWindowListeners(): void {
    if (!this.mainWindow) return

    this.mainWindow.on("move", () => {
      if (this.mainWindow) {
        const bounds = this.mainWindow.getBounds()
        this.windowPosition = { x: bounds.x, y: bounds.y }
      }
    })

    this.mainWindow.on("resize", () => {
      if (this.mainWindow) {
        const bounds = this.mainWindow.getBounds()
        this.windowSize = { width: bounds.width, height: bounds.height }
      }
    })

    this.mainWindow.on("closed", () => {
      this.mainWindow = null
      this.isWindowVisible = false
      this.windowPosition = null
      this.windowSize = null
    })
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  public isVisible(): boolean {
    return this.isWindowVisible
  }

  public hideMainWindow(): void {
    if (!this.mainWindow) {
      this.createWindow()
      return
    }

    if (this.mainWindow.isDestroyed()) {
      this.createWindow()
      return
    }

    const bounds = this.mainWindow.getBounds()
    this.windowPosition = { x: bounds.x, y: bounds.y }
    this.windowSize = { width: bounds.width, height: bounds.height }
    this.mainWindow.hide()
    this.isWindowVisible = false
  }

  public showMainWindow(): void {
    if (!this.mainWindow) {
      this.createWindow()
      return
    }

    if (this.mainWindow.isDestroyed()) {
      this.createWindow()
      return
    }

    const focusedWindow = BrowserWindow.getFocusedWindow()

    if (this.windowPosition && this.windowSize) {
      this.mainWindow.setBounds({
        x: this.windowPosition.x,
        y: this.windowPosition.y,
        width: this.windowSize.width,
        height: this.windowSize.height
      })
    }

    this.mainWindow.showInactive()

    if (focusedWindow && !focusedWindow.isDestroyed()) {
      focusedWindow.focus()
    }

    this.isWindowVisible = true
  }

  public toggleMainWindow(): void {
    if (this.isWindowVisible) {
      this.hideMainWindow()
    } else {
      this.showMainWindow()
    }
  }
}
