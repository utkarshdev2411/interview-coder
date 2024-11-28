// main.ts

import { app, BrowserWindow } from "electron"
import path from "node:path"
import fs from "node:fs"
import { v4 as uuidv4 } from "uuid"
import FormData from "form-data"
import axios from "axios"
import { initializeIpcHandlers } from "./ipcHandlers"
import { WindowHelper } from "./WindowHelper"
import { ScreenshotHelper } from "./ScreenshotHelper"
import { ShortcutsHelper } from "./shortcuts"
const isDev = process.env.NODE_ENV === "development"

const baseUrl = isDev
  ? "http://localhost:8000"
  : "https://web-production-b2eb.up.railway.app"

export class AppState {
  private static instance: AppState | null = null

  private windowHelper: WindowHelper
  private screenshotHelper: ScreenshotHelper
  public shortcutsHelper: ShortcutsHelper // Add ShortcutsHelper instance

  // View management
  private view: "queue" | "solutions" = "queue"

  private problemInfo: {
    problem_statement: string
    input_format: Record<string, any>
    output_format: Record<string, any>
    constraints: Array<Record<string, any>>
    test_cases: Array<Record<string, any>>
  } | null = null // Allow null

  // Processing events
  private readonly PROCESSING_EVENTS = {
    START: "processing-start",
    SUCCESS: "processing-success",
    ERROR: "processing-error",
    UNAUTHORIZED: "procesing-unauthorized",
    NO_SCREENSHOTS: "processing-no-screenshots",
    EXTRA_SUCCESS: "extra-processing-success",
    PROBLEM_EXTRACTED: "problem-extracted",
    INITIAL_SOLUTION_GENERATED: "initial-solution-generated"
  } as const

  // AbortControllers for API requests
  private currentProcessingAbortController: AbortController | null = null
  private currentExtraProcessingAbortController: AbortController | null = null

  private constructor() {
    // Initialize WindowHelper
    this.windowHelper = new WindowHelper()

    // Initialize ScreenshotHelper
    this.screenshotHelper = new ScreenshotHelper(this.view)

    // Initialize ShortcutsHelper
    this.shortcutsHelper = new ShortcutsHelper(this)
  }

  public static getInstance(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState()
    }
    return AppState.instance
  }

  // Getters and Setters
  public getMainWindow(): BrowserWindow | null {
    return this.windowHelper.getMainWindow()
  }

  public getView(): "queue" | "solutions" {
    return this.view
  }

  public setView(view: "queue" | "solutions"): void {
    this.view = view
    this.screenshotHelper.setView(view)
  }

  public isVisible(): boolean {
    return this.windowHelper.isVisible()
  }

  public getScreenshotQueue(): string[] {
    return this.screenshotHelper.getScreenshotQueue()
  }

  public getExtraScreenshotQueue(): string[] {
    return this.screenshotHelper.getExtraScreenshotQueue()
  }

  // Window management methods
  public createWindow(): void {
    this.windowHelper.createWindow()
  }

  public hideMainWindow(): void {
    this.windowHelper.hideMainWindow()
  }

  public showMainWindow(): void {
    this.windowHelper.showMainWindow()
  }

  public toggleMainWindow(): void {
    this.windowHelper.toggleMainWindow()
  }

  public clearQueues(): void {
    this.screenshotHelper.clearQueues()

    // Clear problem info
    this.problemInfo = null

    // Reset view to initial state
    this.setView("queue")
  }

  // Screenshot management methods
  public async takeScreenshot(): Promise<string> {
    if (!this.getMainWindow()) throw new Error("No main window available")

    const screenshotPath = await this.screenshotHelper.takeScreenshot(
      () => this.hideMainWindow(),
      () => this.showMainWindow()
    )

    return screenshotPath
  }

  public async getImagePreview(filepath: string): Promise<string> {
    return this.screenshotHelper.getImagePreview(filepath)
  }

  public async deleteScreenshot(
    path: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.screenshotHelper.deleteScreenshot(path)
  }

  // Processing methods
  public async processScreenshots(): Promise<void> {
    // Change access modifier to public if it was private
    const mainWindow = this.getMainWindow()
    if (!mainWindow) return

    if (this.view === "queue") {
      const screenshotQueue = this.getScreenshotQueue()
      if (screenshotQueue.length === 0) {
        mainWindow.webContents.send(this.PROCESSING_EVENTS.NO_SCREENSHOTS)
        return
      }

      mainWindow.webContents.send(this.PROCESSING_EVENTS.START)
      this.setView("solutions")

      // Initialize AbortController
      this.currentProcessingAbortController = new AbortController()
      const { signal } = this.currentProcessingAbortController

      try {
        const screenshots = await Promise.all(
          screenshotQueue.map(async (path) => ({
            path,
            preview: await this.getImagePreview(path)
          }))
        )

        console.log("Regular screenshots")
        screenshots.forEach((screenshot: any) => {
          console.log(screenshot.path)
        })

        const result = await this.processScreenshotsHelper(screenshots, signal)

        if (result.success) {
          console.log("Processing success:", result.data)
          mainWindow.webContents.send(
            this.PROCESSING_EVENTS.SUCCESS,
            result.data
          )
        } else {
          mainWindow.webContents.send(
            this.PROCESSING_EVENTS.ERROR,
            result.error
          )
        }
      } catch (error: any) {
        if (axios.isCancel(error)) {
          console.log("Processing request canceled")
          mainWindow.webContents.send(
            this.PROCESSING_EVENTS.ERROR,
            "Processing was canceled by the user."
          )
        } else {
          console.error("Processing error:", error)
          mainWindow.webContents.send(
            this.PROCESSING_EVENTS.ERROR,
            error.message
          )
        }
      } finally {
        this.currentProcessingAbortController = null
      }
    } else {
      const extraScreenshotQueue = this.getExtraScreenshotQueue()
      if (extraScreenshotQueue.length === 0) {
        console.log("No extra screenshots to process")
        mainWindow.webContents.send(this.PROCESSING_EVENTS.NO_SCREENSHOTS)
        return
      }
      mainWindow.webContents.send(this.PROCESSING_EVENTS.START)

      // Initialize AbortController
      this.currentExtraProcessingAbortController = new AbortController()
      const { signal } = this.currentExtraProcessingAbortController

      try {
        const screenshots = await Promise.all(
          [...this.getScreenshotQueue(), ...extraScreenshotQueue].map(
            async (path) => ({
              path,
              preview: await this.getImagePreview(path)
            })
          )
        )

        const result = await this.processExtraScreenshotsHelper(
          screenshots,
          signal
        )

        if (result.success) {
          mainWindow.webContents.send(
            this.PROCESSING_EVENTS.EXTRA_SUCCESS,
            result.data
          )
        } else {
          mainWindow.webContents.send(
            this.PROCESSING_EVENTS.ERROR,
            result.error
          )
        }
      } catch (error) {
        if (axios.isCancel(error)) {
          console.log("Extra processing request canceled")
          mainWindow.webContents.send(
            this.PROCESSING_EVENTS.ERROR,
            "Extra processing was canceled by the user."
          )
        } else {
          console.error("Processing error:", error)
          mainWindow.webContents.send(
            this.PROCESSING_EVENTS.ERROR,
            error.message
          )
        }
      } finally {
        this.currentExtraProcessingAbortController = null
      }
    }
  }
  private async processScreenshotsHelper(
    screenshots: Array<{ path: string }>,
    signal: AbortSignal
  ) {
    try {
      const formData = new FormData()

      screenshots.forEach((screenshot) => {
        formData.append("images", fs.createReadStream(screenshot.path))
      })

      try {
        // First API call - extract problem
        const problemResponse = await axios.post(
          `${baseUrl}/extract_problem`,
          formData,
          {
            headers: {
              ...formData.getHeaders()
            },
            timeout: 300000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            signal
          }
        )

        // Store problem info
        this.problemInfo = {
          problem_statement: problemResponse.data.problem_statement,
          input_format: problemResponse.data.input_format,
          output_format: problemResponse.data.output_format,
          constraints: problemResponse.data.constraints,
          test_cases: problemResponse.data.test_cases
        }

        // Send first success event
        if (this.getMainWindow()) {
          this.getMainWindow().webContents.send(
            this.PROCESSING_EVENTS.PROBLEM_EXTRACTED,
            problemResponse.data
          )
        }

        // Second API call - generate solutions
        if (this.getMainWindow()) {
          const solutionsResult = await this.generateSolutionsHelper()
          if (solutionsResult.success) {
            this.getMainWindow().webContents.send(
              this.PROCESSING_EVENTS.INITIAL_SOLUTION_GENERATED,
              solutionsResult.data
            )
          } else {
            throw new Error(
              solutionsResult.error || "Failed to generate solutions"
            )
          }
        }

        return { success: true, data: problemResponse.data }
      } catch (error: any) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          if (this.getMainWindow()) {
            this.getMainWindow().webContents.send(
              this.PROCESSING_EVENTS.UNAUTHORIZED,
              "Authentication required"
            )
          }
          this.view = "queue"
          throw new Error("Authentication required")
        }
        throw error
      }
    } catch (error) {
      console.error("Processing error:", error)
      return { success: false, error: error.message }
    }
  }

  // Implement generateSolutionsHelper
  private async generateSolutionsHelper() {
    try {
      if (!this.problemInfo) {
        throw new Error("No problem info available")
      }

      try {
        const response = await axios.post(
          `${baseUrl}/generate_solutions`,
          { problem_info: this.problemInfo },
          {
            timeout: 300000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
          }
        )

        if (!response || !response.data) {
          throw new Error("No response data received")
        }

        return { success: true, data: response.data }
      } catch (error: any) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          if (this.getMainWindow()) {
            this.getMainWindow().webContents.send(
              this.PROCESSING_EVENTS.UNAUTHORIZED,
              "Authentication required"
            )
          }
          throw new Error("Authentication required")
        }
        throw error
      }
    } catch (error) {
      console.error("Solutions generation error:", error)
      return { success: false, error: error.message }
    }
  }

  private async processExtraScreenshotsHelper(
    screenshots: Array<{ path: string }>,
    signal: AbortSignal // Added signal parameter
  ) {
    try {
      const formData = new FormData()

      // Add images first
      screenshots.forEach((screenshot) => {
        formData.append("images", fs.createReadStream(screenshot.path))
      })

      if (!this.problemInfo) {
        throw new Error("No problem info available")
      }

      // Add problem_info
      formData.append("problem_info", JSON.stringify(this.problemInfo))

      console.log(formData)
      try {
        const response = await axios.post(
          `${baseUrl}/debug_solutions`,
          formData,
          {
            headers: {
              ...formData.getHeaders()
            },
            timeout: 300000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            signal
          }
        )

        if (!response || !response.data) {
          throw new Error("No response data received")
        }

        return { success: true, data: response.data }
      } catch (error: any) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          if (this.getMainWindow()) {
            this.getMainWindow().webContents.send(
              this.PROCESSING_EVENTS.UNAUTHORIZED,
              "Authentication required"
            )
          }
          throw new Error("Authentication required")
        }
        throw error
      }
    } catch (error) {
      console.error("Processing error:", error)
      return { success: false, error: error.message }
    }
  }

  // Method to cancel ongoing API requests
  public cancelOngoingRequests(): void {
    let wasCancelled = false

    if (this.currentProcessingAbortController) {
      this.currentProcessingAbortController.abort()
      this.currentProcessingAbortController = null
      console.log("Canceled ongoing processing request.")
      wasCancelled = true
    }

    if (this.currentExtraProcessingAbortController) {
      this.currentExtraProcessingAbortController.abort()
      this.currentExtraProcessingAbortController = null
      console.log("Canceled ongoing extra processing request.")
      wasCancelled = true
    }

    const mainWindow = this.getMainWindow()
    if (wasCancelled && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(
        this.PROCESSING_EVENTS.ERROR,
        "Processing was canceled by the user."
      )
    }
  }
}

// Application initialization
async function initializeApp() {
  const appState = AppState.getInstance()

  // Initialize IPC handlers before window creation
  initializeIpcHandlers(appState)

  app.whenReady().then(() => {
    appState.createWindow()
    // Register global shortcuts using ShortcutsHelper
    appState.shortcutsHelper.registerGlobalShortcuts()

    app.on("activate", () => {
      if (!appState.getMainWindow()) {
        appState.createWindow()
      } else if (!appState.isVisible()) {
        appState.toggleMainWindow()
      }
    })
  })

  // Quit when all windows are closed, except on macOS
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit()
    }
  })

  app.dock?.hide() // Hide dock icon (optional)
  app.commandLine.appendSwitch("disable-background-timer-throttling")
}

// Start the application
initializeApp().catch(console.error)
