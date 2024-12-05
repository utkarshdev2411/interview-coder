import { autoUpdater } from "electron-updater"
import { app, dialog } from "electron"
import log from "electron-log"

export function initAutoUpdater() {
  // Configure logging
  log.transports.file.level = "info"
  autoUpdater.logger = log

  // Check for updates immediately when app starts
  autoUpdater.checkForUpdates()

  // Check for updates every 30 minutes
  setInterval(() => {
    autoUpdater.checkForUpdates()
  }, 30 * 60 * 1000)

  // Listen for update available
  autoUpdater.on("update-available", (info) => {
    dialog
      .showMessageBox({
        type: "info",
        title: "Update Available",
        message: `A new version (${info.version}) is available. Would you like to update now?`,
        buttons: ["Yes", "No"],
        defaultId: 0,
        cancelId: 1
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.downloadUpdate()
        }
      })
  })

  // Listen for update downloaded
  autoUpdater.on("update-downloaded", (info) => {
    dialog
      .showMessageBox({
        type: "info",
        title: "Update Ready",
        message: `Version ${info.version} has been downloaded. The application will now restart to install the update.`,
        buttons: ["Okay"],
        defaultId: 0
      })
      .then(() => {
        autoUpdater.quitAndInstall(false, true)
      })
  })

  // Handle errors
  autoUpdater.on("error", (err) => {
    log.error("AutoUpdater error:", err)
    dialog.showErrorBox(
      "Update Error",
      "An error occurred while updating the application. " +
        "Please try again later or download the latest version manually."
    )
  })
}
