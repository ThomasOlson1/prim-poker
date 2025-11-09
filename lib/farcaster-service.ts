import { sdk } from "@farcaster/miniapp-sdk"

export interface FarcasterUser {
  fid: number
  username?: string
  displayName?: string
  pfpUrl?: string
  profile?: {
    bio?: string
  }
}

export interface GameNotification {
  id: string
  gameId: string
  type: "turn" | "game-start" | "game-end" | "player-joined"
  title: string
  message: string
  timestamp: number
}

export class FarcasterService {
  /**
   * Get current user context
   */
  static async getUserContext(): Promise<FarcasterUser | null> {
    try {
      const context = await sdk.context
      return {
        fid: context.user.fid,
        username: context.user.username,
        displayName: context.user.displayName,
        pfpUrl: context.user.pfpUrl,
      }
    } catch (error) {
      console.error("Failed to get user context:", error)
      return null
    }
  }

  /**
   * Send notification to user
   */
  static async sendNotification(notification: GameNotification): Promise<void> {
    try {
      // Use Farcaster SDK to send notification
      await sdk.actions.openUrl(`farcaster://notification?game=${notification.gameId}&type=${notification.type}`)
    } catch (error) {
      console.error("Failed to send notification:", error)
    }
  }

  /**
   * Request signature for transaction
   * TODO: Implement when SDK supports this method
   */
  static async requestSignature(_message: string): Promise<string | null> {
    try {
      // const signature = await sdk.actions.requestAddressSignMessage(message)
      // return signature
      console.log("Signature request not yet implemented in SDK")
      return null
    } catch (error) {
      console.error("Failed to request signature:", error)
      return null
    }
  }

  /**
   * Open URL in Farcaster context
   */
  static async openUrl(url: string): Promise<void> {
    try {
      await sdk.actions.openUrl(url)
    } catch (error) {
      console.error("Failed to open URL:", error)
    }
  }
}
