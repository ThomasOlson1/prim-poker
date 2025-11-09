"use client"

import { useCallback } from "react"
import { FarcasterService, type GameNotification } from "@/lib/farcaster-service"

export function useNotifications() {
  const sendTurnNotification = useCallback(async (gameId: string, playerName: string) => {
    const notification: GameNotification = {
      id: `turn-${gameId}-${Date.now()}`,
      gameId,
      type: "turn",
      title: "Your Turn to Play!",
      message: `It's your turn in game #${gameId}. Make your move!`,
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
    sendTurnNotification,
    sendGameStartNotification,
    sendGameEndNotification,
    sendPlayerJoinedNotification,
  }
}
