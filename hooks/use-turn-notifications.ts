"use client"

import { useEffect, useRef } from "react"
import { useGameWebSocket } from "./use-game-websocket"
import { useNotifications } from "./use-notifications"

interface UseTurnNotificationsOptions {
  gameId: string | null
  tableName?: string
  enabled?: boolean
}

/**
 * Hook that automatically sends turn notifications
 * when it becomes the player's turn
 */
export function useTurnNotifications({
  gameId,
  tableName,
  enabled = true,
}: UseTurnNotificationsOptions) {
  const { gameState, turnTimer, isMyTurn } = useGameWebSocket(gameId)
  const { sendTurnNotification, notificationsEnabled, requestNotificationPermission } = useNotifications()

  // Track if we've sent a notification for the current turn
  const lastNotifiedTurn = useRef<string | null>(null)
  const hasShownPermissionPrompt = useRef(false)

  // Request notification permission on first mount (if enabled)
  useEffect(() => {
    if (enabled && !hasShownPermissionPrompt.current && !notificationsEnabled) {
      hasShownPermissionPrompt.current = true
      // Request permission (user will see browser prompt)
      requestNotificationPermission()
    }
  }, [enabled, notificationsEnabled, requestNotificationPermission])

  // Send notification when it becomes player's turn
  useEffect(() => {
    if (!enabled || !isMyTurn || !gameState || !turnTimer || !notificationsEnabled) {
      return
    }

    // Create unique identifier for this turn
    const currentTurnId = `${gameState.gameId}-${gameState.handNumber}-${gameState.currentPlayer}`

    // Only send notification once per turn (when turn first starts)
    if (lastNotifiedTurn.current === currentTurnId) {
      return
    }

    // Send the notification
    const timeRemaining = turnTimer.timeLeft
    const tableDisplay = tableName || `Table #${gameState.gameId}`

    console.log(`🔔 Sending turn notification: ${timeRemaining}s at ${tableDisplay}`)

    sendTurnNotification({
      gameId: gameState.gameId,
      timeRemaining,
      tableName: tableDisplay,
    })

    // Mark this turn as notified
    lastNotifiedTurn.current = currentTurnId
  }, [
    enabled,
    isMyTurn,
    gameState,
    turnTimer,
    notificationsEnabled,
    tableName,
    sendTurnNotification,
  ])

  // Reset notification tracking when turn ends
  useEffect(() => {
    if (!isMyTurn) {
      lastNotifiedTurn.current = null
    }
  }, [isMyTurn])

  return {
    isMyTurn,
    turnTimer,
    notificationsEnabled,
    requestNotificationPermission,
  }
}
