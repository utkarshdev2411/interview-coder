import path from "node:path";
import fs from "node:fs";
import { app } from "electron";
import { v4 as uuidv4 } from "uuid";
import { execFile } from "child_process";
import { promisify } from "util";
import os from "os";

const execFileAsync = promisify(execFile);

export class ScreenshotHelper {
  private screenshotQueue: string[] = [];
  private extraScreenshotQueue: string[] = [];
  private readonly MAX_SCREENSHOTS = 5;

  private readonly screenshotDir: string;
  private readonly extraScreenshotDir: string;

  private view: "queue" | "solutions" = "queue";

  constructor(view: "queue" | "solutions" = "queue") {
    this.view = view;

    this.screenshotDir = path.join(app.getPath("userData"), "screenshots");
    this.extraScreenshotDir = path.join(
      app.getPath("userData"),
      "extra_screenshots"
    );

    if (!fs.existsSync(this.screenshotDir)) fs.mkdirSync(this.screenshotDir);
    if (!fs.existsSync(this.extraScreenshotDir)) fs.mkdirSync(this.extraScreenshotDir);
  }

  public getView(): "queue" | "solutions" {
    return this.view;
  }

  public setView(view: "queue" | "solutions"): void {
    this.view = view;
  }

  public getScreenshotQueue(): string[] {
    return this.screenshotQueue;
  }

  public getExtraScreenshotQueue(): string[] {
    return this.extraScreenshotQueue;
  }

  public clearQueues(): void {
    const clearQueue = (queue: string[]) => {
      queue.forEach((screenshotPath) => {
        fs.unlink(screenshotPath, (err) => {
          if (err) console.error(`Error deleting screenshot at ${screenshotPath}:`, err);
        });
      });
    };

    clearQueue(this.screenshotQueue);
    clearQueue(this.extraScreenshotQueue);

    this.screenshotQueue = [];
    this.extraScreenshotQueue = [];
  }

  private async captureScreenshotMac(): Promise<Buffer> {
    const tmpPath = path.join(app.getPath("temp"), `${uuidv4()}.png`);
    await execFileAsync("screencapture", ["-x", tmpPath]);
    const buffer = await fs.promises.readFile(tmpPath);
    await fs.promises.unlink(tmpPath);
    return buffer;
  }

  private async captureScreenshotWindows(): Promise<Buffer> {
    const tmpPath = path.join(app.getPath("temp"), `${uuidv4()}.png`);
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -AssemblyName System.Drawing
      $screen = [System.Windows.Forms.Screen]::PrimaryScreen
      $bitmap = New-Object System.Drawing.Bitmap $screen.Bounds.Width, $screen.Bounds.Height
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      $graphics.CopyFromScreen($screen.Bounds.X, $screen.Bounds.Y, 0, 0, $bitmap.Size)
      $bitmap.Save('${tmpPath.replace(/\\/g, "\\\\")}')
      $graphics.Dispose()
      $bitmap.Dispose()
    `;
    await execFileAsync("powershell", ["-command", script]);
    const buffer = await fs.promises.readFile(tmpPath);
    await fs.promises.unlink(tmpPath);
    return buffer;
  }

  private async captureScreenshotLinux(): Promise<Buffer> {
    const tmpPath = path.join(app.getPath("temp"), `${uuidv4()}.png`);
    await execFileAsync("import", [tmpPath]); // Requires ImageMagick
    const buffer = await fs.promises.readFile(tmpPath);
    await fs.promises.unlink(tmpPath);
    return buffer;
  }

  public async takeScreenshot(
    hideMainWindow: () => void,
    showMainWindow: () => void
  ): Promise<string> {
    hideMainWindow();
    await new Promise((resolve) => setTimeout(resolve, 100));

    let screenshotPath = "";
    try {
      const screenshotBuffer = await (async () => {
        switch (os.platform()) {
          case "darwin":
            return this.captureScreenshotMac();
          case "win32":
            return this.captureScreenshotWindows();
          case "linux":
            return this.captureScreenshotLinux();
          default:
            throw new Error("Unsupported platform for screenshot");
        }
      })();

      screenshotPath = path.join(
        this.view === "queue" ? this.screenshotDir : this.extraScreenshotDir,
        `${uuidv4()}.png`
      );

      await fs.promises.writeFile(screenshotPath, screenshotBuffer);

      const queue =
        this.view === "queue" ? this.screenshotQueue : this.extraScreenshotQueue;
      queue.push(screenshotPath);

      if (queue.length > this.MAX_SCREENSHOTS) {
        const removedPath = queue.shift();
        if (removedPath) await fs.promises.unlink(removedPath);
      }
    } catch (error) {
      console.error("Screenshot error:", error);
      throw error;
    } finally {
      await new Promise((resolve) => setTimeout(resolve, 50));
      showMainWindow();
    }

    return screenshotPath;
  }

  public async getImagePreview(filepath: string): Promise<string> {
    try {
      const data = await fs.promises.readFile(filepath);
      return `data:image/png;base64,${data.toString("base64")}`;
    } catch (error) {
      console.error("Error reading image:", error);
      throw error;
    }
  }

  public async deleteScreenshot(
    filepath: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await fs.promises.unlink(filepath);
      const queue =
        this.view === "queue" ? this.screenshotQueue : this.extraScreenshotQueue;
      queue.splice(queue.indexOf(filepath), 1);
      return { success: true };
    } catch (error) {
      console.error("Error deleting file:", error);
      return { success: false, error: error.message };
    }
  }
}
