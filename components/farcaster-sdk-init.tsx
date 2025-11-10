"use client"

import { useEffect } from "react"
import { sdk } from "@farcaster/miniapp-sdk"

/**
 * Initializes the Farcaster SDK and calls ready() to dismiss the splash screen
 */
export function FarcasterSDKInit() {
  useEffect(() => {
    const initSDK = async () => {
      try {
        // Wait for SDK to be ready and then call ready() to dismiss splash screen
        await sdk.actions.ready()
        console.log("Farcaster SDK ready")
      } catch (error) {
        console.error("Failed to initialize Farcaster SDK:", error)
      }
    }

    initSDK()
  }, [])

  return null
}
