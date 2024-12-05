require("dotenv").config()
const { execSync } = require("child_process")

try {
  // Verify environment variables
  const requiredEnvVars = ["APPLE_ID", "APPLE_APP_SPECIFIC_PASSWORD"]

  const missing = requiredEnvVars.filter((key) => !process.env[key])

  if (missing.length > 0) {
    console.error("Missing required environment variables:", missing.join(", "))
    process.exit(1)
  }

  // Add platform check
  if (process.platform !== "darwin") {
    console.warn("Warning: Building for macOS on a non-macOS platform may fail")
  }

  // Run the build command
  execSync(
    "npm run clean && cross-env NODE_ENV=production tsc && vite build && electron-builder --mac",
    {
      stdio: "inherit",
      env: {
        ...process.env,
        CSC_IDENTITY_AUTO_DISCOVERY: "true"
      }
    }
  )
} catch (error) {
  console.error("Build failed:", error)
  process.exit(1)
}
