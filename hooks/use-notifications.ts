"use client"

import { useCallback, useEffect, useState } from "react"
import { FarcasterService, type GameNotification } from "@/lib/farcaster-service"
import { BrowserNotificationService } from "@/lib/browser-notification-service"

export interface TurnNotificationOptions {
  gameId: string
  timeRemaining: number
  tableName?: string
}

export function useNotifications() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  // Check notification permission on mount
  useEffect(() => {
    if (BrowserNotificationService.isSupported()) {
      const { granted } = BrowserNotificationService.getPermissionStatus()
      setNotificationsEnabled(granted)
    }
  }, [])

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    const granted = await BrowserNotificationService.requestPermission()
    setNotificationsEnabled(granted)
    return granted
  }, [])

  // Send turn notification with time remaining
  const sendTurnNotification = useCallback(async (options: TurnNotificationOptions) => {
    const { gameId, timeRemaining, tableName } = options

    // Send browser notification
    await BrowserNotificationService.sendTurnNotification(
      gameId,
      timeRemaining,
      tableName
    )

    // Also send Farcaster notification (optional, as backup)
    const tableDisplay = tableName || `Table #${gameId}`
    const notification: GameNotification = {
      id: `turn-${gameId}-${Date.now()}`,
      gameId,
      type: "turn",
      title: "Your Turn!",
      message: `${timeRemaining}s remaining at ${tableDisplay}`,
      timestamp: Date.now(),
    }

    await FarcasterService.sendNotification(notification)
  }, [])

  const sendGameStartNotification = useCallback(async (gameId: string) => {
    const notification: GameNotification = {
      id: `start-${gameId}`,
      gameId,
      type: "game-start",
      title: "Game Started!",
      message: `Game #${gameId} has started. Join the action!`,
      timestamp: Date.now(),
    }

    await FarcasterService.sendNotification(notification)
  }, [])

  const sendGameEndNotification = useCallback(async (gameId: string, winner: string) => {
    const notification: GameNotification = {
      id: `end-${gameId}`,
      gameId,
      type: "game-end",
      title: "Game Over!",
      message: `${winner} won game #${gameId}!`,
      timestamp: Date.now(),
    }

    await FarcasterService.sendNotification(notification)
  }, [])

  const sendPlayerJoinedNotification = useCallback(async (gameId: string, playerName: string) => {
    const notification: GameNotification = {
      id: `join-${gameId}-${playerName}`,
      gameId,
      type: "player-joined",
      title: "Player Joined!",
      message: `${playerName} joined game #${gameId}. Table now has ${6} players!`,
      timestamp: Date.now(),
    }

    await FarcasterService.sendNotification(notification)
  }, [])

  return {
    notificationsEnabled,
    requestNotificationPermission,
    sendTurnNotification,
    sendGameStartNotification,
    sendGameEndNotification,
    sendPlayerJoinedNotification,
  }
}
