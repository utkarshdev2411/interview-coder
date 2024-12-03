// ProcessingHelper.ts

import fs from "node:fs"
import { ScreenshotHelper } from "./ScreenshotHelper"
import { AppState } from "./main"
import dotenv from "dotenv"
import {
  debugSolutionResponses,
  extractProblemInfo,
  generateSolutionResponses
} from "./handlers/problemHandler"
import axios from "axios"

dotenv.config()

console.log({ NODE_ENV: process.env.NODE_ENV })
const isDev = process.env.NODE_ENV === "development"

console.log({ isDev })

export class ProcessingHelper {
  private appState: AppState
  private screenshotHelper: ScreenshotHelper

  // AbortControllers for API requests
  private currentProcessingAbortController: AbortController | null = null
  private currentExtraProcessingAbortController: AbortController | null = null

  constructor(appState: AppState) {
    this.appState = appState
    this.screenshotHelper = appState.getScreenshotHelper()
  }
  public async processScreenshots(): Promise<void> {
    const mainWindow = this.appState.getMainWindow()
    if (!mainWindow) return

    const view = this.appState.getView()

    if (view === "queue") {
      const screenshotQueue = this.screenshotHelper.getScreenshotQueue()
      if (screenshotQueue.length === 0) {
        mainWindow.webContents.send(
          this.appState.PROCESSING_EVENTS.NO_SCREENSHOTS
        )
        return
      }

      mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.INITIAL_START)
      this.appState.setView("solutions")

      // Initialize AbortController
      this.currentProcessingAbortController = new AbortController()
      const { signal } = this.currentProcessingAbortController

      try {
        const screenshots = await Promise.all(
          screenshotQueue.map(async (path) => ({
            path,
            preview: await this.screenshotHelper.getImagePreview(path),
            data: fs.readFileSync(path).toString("base64") // Read image data
          }))
        )

        console.log("Regular screenshots")
        screenshots.forEach((screenshot: any) => {
          console.log(screenshot.path)
        })

        const result = await this.processScreenshotsHelper(screenshots, signal)

        if (result.success) {
          console.log("Processing problem extractionsuccess:", result.data)
        } else {
          mainWindow.webContents.send(
            this.appState.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            result.error
          )
        }
      } catch (error: any) {
        if (axios.isCancel(error)) {
          console.log("Processing request canceled")
          mainWindow.webContents.send(
            this.appState.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            "Processing was canceled by the user."
          )
        } else {
          console.error("Processing error:", error)
          mainWindow.webContents.send(
            this.appState.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            error.message
          )
        }
      } finally {
        this.currentProcessingAbortController = null
      }
    } else {
      // view == 'solutions'
      const extraScreenshotQueue =
        this.screenshotHelper.getExtraScreenshotQueue()
      if (extraScreenshotQueue.length === 0) {
        console.log("No extra screenshots to process")
        mainWindow.webContents.send(
          this.appState.PROCESSING_EVENTS.NO_SCREENSHOTS
        )
        return
      }
      mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.DEBUG_START)

      // Initialize AbortController
      this.currentExtraProcessingAbortController = new AbortController()
      const { signal } = this.currentExtraProcessingAbortController

      try {
        const screenshots = await Promise.all(
          [
            ...this.screenshotHelper.getScreenshotQueue(),
            ...extraScreenshotQueue
          ].map(async (path) => ({
            path,
            preview: await this.screenshotHelper.getImagePreview(path),
            data: fs.readFileSync(path).toString("base64") // Read image data
          }))
        )

        const result = await this.processExtraScreenshotsHelper(
          screenshots,
          signal
        )

        if (result.success) {
          this.appState.setHasDebugged(true)
          mainWindow.webContents.send(
            this.appState.PROCESSING_EVENTS.DEBUG_SUCCESS,
            result.data
          )
        } else {
          mainWindow.webContents.send(
            this.appState.PROCESSING_EVENTS.DEBUG_ERROR,
            result.error
          )
        }
      } catch (error: any) {
        if (axios.isCancel(error)) {
          console.log("Extra processing request canceled")
          mainWindow.webContents.send(
            this.appState.PROCESSING_EVENTS.DEBUG_ERROR,
            "Extra processing was canceled by the user."
          )
        } else {
          console.error("Processing error:", error)
          mainWindow.webContents.send(
            this.appState.PROCESSING_EVENTS.DEBUG_ERROR,
            error.message
          )
        }
      } finally {
        this.currentExtraProcessingAbortController = null
      }
    }
  }

  private async processScreenshotsHelper(
    screenshots: Array<{ path: string; data: string }>,
    signal: AbortSignal
  ) {
    try {
      const imageDataList = screenshots.map((screenshot) => screenshot.data)

      // First function call - extract problem info
      const problemInfo = await extractProblemInfo(imageDataList)

      // Store problem info in AppState
      this.appState.setProblemInfo(problemInfo)

      // Send first success event
      const mainWindow = this.appState.getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.send(
          this.appState.PROCESSING_EVENTS.PROBLEM_EXTRACTED,
          problemInfo
        )
      }

      // Second function call - generate solutions
      if (mainWindow) {
        const solutionsResult = await this.generateSolutionsHelper(signal)
        console.log({ solutionsResult })
        if (solutionsResult.success) {
          mainWindow.webContents.send(
            this.appState.PROCESSING_EVENTS.SOLUTION_SUCCESS,
            solutionsResult.data
          )
        } else {
          throw new Error(
            solutionsResult.error || "Failed to generate solutions"
          )
        }
      }

      return { success: true, data: problemInfo }
    } catch (error: any) {
      console.error("Processing error:", error)
      return { success: false, error: error.message }
    }
  }

  private async generateSolutionsHelper(signal: AbortSignal) {
    try {
      const problemInfo = this.appState.getProblemInfo()
      if (!problemInfo) {
        throw new Error("No problem info available")
      }

      // Use the generateSolutionResponses function
      const solutions = await generateSolutionResponses(problemInfo)

      if (!solutions) {
        throw new Error("No solutions received")
      }

      console.log("Received solutions: ", solutions)

      return { success: true, data: solutions }
    } catch (error: any) {
      console.error("Solutions generation error:", error)
      return { success: false, error: error.message }
    }
  }

  private async processExtraScreenshotsHelper(
    screenshots: Array<{ path: string; data: string }>,
    signal: AbortSignal
  ) {
    try {
      const imageDataList = screenshots.map((screenshot) => screenshot.data)

      const problemInfo = this.appState.getProblemInfo()
      if (!problemInfo) {
        throw new Error("No problem info available")
      }

      // Use the debugSolutionResponses function
      const debugSolutions = await debugSolutionResponses(
        imageDataList,
        problemInfo
      )

      if (!debugSolutions) {
        throw new Error("No debug solutions received")
      }
      console.log({ debug_data: debugSolutions })
      return { success: true, data: debugSolutions }
    } catch (error: any) {
      console.error("Processing error:", error)
      return { success: false, error: error.message }
    }
  }

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

    // Reset hasDebugged flag
    this.appState.setHasDebugged(false)

    const mainWindow = this.appState.getMainWindow()
    if (wasCancelled && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("Processing was canceled by the user.")
    }
  }
}
