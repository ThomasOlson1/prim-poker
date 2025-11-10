/**
 * Browser Notification Service
 * Handles browser push notifications for turn alerts
 */

export interface NotificationPermissionStatus {
  granted: boolean
  denied: boolean
  default: boolean
}

export class BrowserNotificationService {
  /**
   * Check if browser notifications are supported
   */
  static isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window
  }

  /**
   * Get current notification permission status
   */
  static getPermissionStatus(): NotificationPermissionStatus {
    if (!this.isSupported()) {
      return { granted: false, denied: false, default: true }
    }

    const permission = Notification.permission

    return {
      granted: permission === 'granted',
      denied: permission === 'denied',
      default: permission === 'default',
    }
  }

  /**
   * Request notification permission from user
   */
  static async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Browser notifications are not supported')
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    } catch (error) {
      console.error('Failed to request notification permission:', error)
      return false
    }
  }

  /**
   * Send a turn notification
   */
  static async sendTurnNotification(
    gameId: string,
    timeRemaining: number,
    tableName?: string
  ): Promise<void> {
    const { granted } = this.getPermissionStatus()

    if (!granted) {
      console.log('Notification permission not granted')
      return
    }

    try {
      const tableDisplay = tableName || `Table #${gameId}`
      const title = `🎲 Your Turn!`
      const body = `${timeRemaining}s remaining at ${tableDisplay}`

      const notification = new Notification(title, {
        body,
        icon: '/poker-chip.png', // Add your poker chip icon
        badge: '/poker-chip.png',
        tag: `turn-${gameId}`, // Replace previous turn notifications
        requireInteraction: true, // Keep visible until user interacts
        vibrate: [200, 100, 200], // Vibration pattern for mobile
        data: {
          gameId,
          type: 'turn',
          timestamp: Date.now(),
        },
      })

      // Auto-close after time runs out
      setTimeout(() => {
        notification.close()
      }, timeRemaining * 1000)

      // Focus window when notification is clicked
      notification.onclick = () => {
        window.focus()
        notification.close()
      }
    } catch (error) {
      console.error('Failed to send browser notification:', error)
    }
  }

  /**
   * Update existing turn notification with new time
   */
  static async updateTurnNotification(
    gameId: string,
    timeRemaining: number,
    tableName?: string
  ): Promise<void> {
    // Browser notifications can't be updated, so we send a new one
    // The tag ensures it replaces the previous one
    await this.sendTurnNotification(gameId, timeRemaining, tableName)
  }

  /**
   * Clear all notifications for a game
   */
  static clearGameNotifications(_gameId: string): void {
    // Note: Can't programmatically close notifications created by this page
    // They're automatically replaced by tag or user dismisses them
  }
}
