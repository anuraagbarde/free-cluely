// ScreenshotHelper.ts

import path from "node:path"
import fs from "node:fs"
import { app } from "electron"
import { v4 as uuidv4 } from "uuid"
import screenshot from "screenshot-desktop"

export class ScreenshotHelper {
  private screenshotQueue: string[] = []
  private extraScreenshotQueue: string[] = []
  private readonly MAX_SCREENSHOTS = 5

  private readonly screenshotDir: string
  private readonly extraScreenshotDir: string

  private view: "queue" | "solutions" = "queue"

  constructor(view: "queue" | "solutions" = "queue") {
    this.view = view

    // Initialize directories
    this.screenshotDir = path.join(app.getPath("userData"), "screenshots")
    this.extraScreenshotDir = path.join(
      app.getPath("userData"),
      "extra_screenshots"
    )

    // Create directories if they don't exist
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir)
    }
    if (!fs.existsSync(this.extraScreenshotDir)) {
      fs.mkdirSync(this.extraScreenshotDir)
    }
  }

  public getView(): "queue" | "solutions" {
    return this.view
  }

  public setView(view: "queue" | "solutions"): void {
    this.view = view
  }

  public getScreenshotQueue(): string[] {
    return this.screenshotQueue
  }

  public getExtraScreenshotQueue(): string[] {
    return this.extraScreenshotQueue
  }

  public clearQueues(): void {
    // Clear screenshotQueue
    this.screenshotQueue.forEach(screenshotPath => {
      fs.unlink(screenshotPath, err => {
        if (err)
          console.error(`Error deleting screenshot at ${screenshotPath}:`, err)
      })
    })
    this.screenshotQueue = []

    // Clear extraScreenshotQueue
    this.extraScreenshotQueue.forEach(screenshotPath => {
      fs.unlink(screenshotPath, err => {
        if (err)
          console.error(
            `Error deleting extra screenshot at ${screenshotPath}:`,
            err
          )
      })
    })
    this.extraScreenshotQueue = []
  }

  public async takeScreenshot(
    hideMainWindow: () => void,
    showMainWindow: () => void
  ): Promise<string> {
    console.log(
      "[ScreenshotHelper] takeScreenshot called. Current view:",
      this.view
    )
    try {
      console.log("[ScreenshotHelper] Hiding main window before screenshot.")
      hideMainWindow()

      // Add a small delay to ensure window is hidden
      await new Promise(resolve => setTimeout(resolve, 100))
      console.log(
        "[ScreenshotHelper] Main window should now be hidden. Proceeding to take screenshot."
      )

      let screenshotPath = ""

      if (this.view === "queue") {
        screenshotPath = path.join(this.screenshotDir, `${uuidv4()}.png`)
        console.log(
          `[ScreenshotHelper] Taking screenshot for 'queue'. Path: ${screenshotPath}`
        )
        console.log(`[ScreenshotHelper] Calling screenshot-desktop...`)
        const imageBuffer = await screenshot({ format: "png" })
        console.log(
          `[ScreenshotHelper] screenshot-desktop completed. Result is Buffer:`,
          Buffer.isBuffer(imageBuffer)
        )
        if (imageBuffer) {
          console.log(
            `[ScreenshotHelper] Buffer size:`,
            imageBuffer.length,
            "bytes"
          )
          console.log(
            `[ScreenshotHelper] Writing buffer to file: ${screenshotPath}`
          )
          await fs.promises.writeFile(screenshotPath, imageBuffer)
          console.log(`[ScreenshotHelper] File written successfully`)
        } else {
          throw new Error("screenshot-desktop returned no data")
        }

        this.screenshotQueue.push(screenshotPath)
        console.log(
          `[ScreenshotHelper] Screenshot added to queue. Queue length: ${this.screenshotQueue.length}`
        )

        if (this.screenshotQueue.length > this.MAX_SCREENSHOTS) {
          const removedPath = this.screenshotQueue.shift()
          if (removedPath) {
            try {
              console.log(
                `[ScreenshotHelper] Removing oldest screenshot from queue: ${removedPath}`
              )
              await fs.promises.unlink(removedPath)
            } catch (error) {
              console.error(
                "[ScreenshotHelper] Error removing old screenshot:",
                error
              )
            }
          }
        }
      } else {
        screenshotPath = path.join(this.extraScreenshotDir, `${uuidv4()}.png`)
        console.log(
          `[ScreenshotHelper] Taking screenshot for 'solutions'. Path: ${screenshotPath}`
        )
        console.log(`[ScreenshotHelper] Calling screenshot-desktop...`)
        const imageBuffer = await screenshot({ format: "png" })
        console.log(
          `[ScreenshotHelper] screenshot-desktop completed. Result is Buffer:`,
          Buffer.isBuffer(imageBuffer)
        )
        if (imageBuffer) {
          console.log(
            `[ScreenshotHelper] Buffer size:`,
            imageBuffer.length,
            "bytes"
          )
          console.log(
            `[ScreenshotHelper] Writing buffer to file: ${screenshotPath}`
          )
          await fs.promises.writeFile(screenshotPath, imageBuffer)
          console.log(`[ScreenshotHelper] File written successfully`)
        } else {
          throw new Error("screenshot-desktop returned no data")
        }

        this.extraScreenshotQueue.push(screenshotPath)
        console.log(
          `[ScreenshotHelper] Screenshot added to extra queue. Extra queue length: ${this.extraScreenshotQueue.length}`
        )

        if (this.extraScreenshotQueue.length > this.MAX_SCREENSHOTS) {
          const removedPath = this.extraScreenshotQueue.shift()
          if (removedPath) {
            try {
              console.log(
                `[ScreenshotHelper] Removing oldest screenshot from extra queue: ${removedPath}`
              )
              await fs.promises.unlink(removedPath)
            } catch (error) {
              console.error(
                "[ScreenshotHelper] Error removing old screenshot:",
                error
              )
            }
          }
        }
      }

      console.log(
        `[ScreenshotHelper] Screenshot taken successfully. Returning path: ${screenshotPath}`
      )
      return screenshotPath
    } catch (error) {
      console.error("[ScreenshotHelper] Error taking screenshot:", error)
      throw new Error(`Failed to take screenshot: ${error.message}`)
    } finally {
      // Ensure window is always shown again
      console.log("[ScreenshotHelper] Showing main window after screenshot.")
      showMainWindow()
    }
  }

  public async getImagePreview(filepath: string): Promise<string> {
    try {
      const data = await fs.promises.readFile(filepath)
      return `data:image/png;base64,${data.toString("base64")}`
    } catch (error) {
      console.error("Error reading image:", error)
      throw error
    }
  }

  public async deleteScreenshot(
    path: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await fs.promises.unlink(path)
      if (this.view === "queue") {
        this.screenshotQueue = this.screenshotQueue.filter(
          filePath => filePath !== path
        )
      } else {
        this.extraScreenshotQueue = this.extraScreenshotQueue.filter(
          filePath => filePath !== path
        )
      }
      return { success: true }
    } catch (error) {
      console.error("Error deleting file:", error)
      return { success: false, error: error.message }
    }
  }
}
