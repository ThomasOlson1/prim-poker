"use client"

import { useRef } from "react"

import { useCallback, useEffect, useState } from "react"
import { PokerEngine, type GameState } from "@/lib/poker-engine"
import { useWebSocket } from "./use-websocket"

export function useGameState(gameId: string) {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const ws = useWebSocket()
  const engineRef = useRef(new PokerEngine())

  // Subscribe to game events
  useEffect(() => {
    if (!ws.isConnected) return

    ws.subscribe(gameId)

    const unsubscribeTurn = ws.on("player-turn", (data) => {
      if (data.gameId === gameId) {
        setGameState((prev) => (prev ? { ...prev, ...data.update } : null))
      }
    })

    const unsubscribeAction = ws.on("action-taken", (data) => {
      if (data.gameId === gameId) {
        setGameState((prev) => (prev ? { ...prev, ...data.update } : null))
      }
    })

    const unsubscribeState = ws.on("game-state-update", (data) => {
      if (data.gameId === gameId) {
        setGameState(data.state)
      }
    })

    return () => {
      unsubscribeTurn()
      unsubscribeAction()
      unsubscribeState()
      ws.unsubscribe(gameId)
    }
  }, [gameId, ws])

  // Initialize game state
  useEffect(() => {
    const initGame = async () => {
      try {
        setLoading(true)
        // Fetch initial game state from server
        const response = await fetch(`/api/games/${gameId}`)
        if (!response.ok) throw new Error("Failed to load game")

        const data = await response.json()
        setGameState(data.state)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    initGame()
  }, [gameId])

  const performAction = useCallback(
    async (action: "fold" | "check" | "call" | "raise", betAmount?: number) => {
      try {
        const response = await fetch(`/api/games/${gameId}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, betAmount }),
        })

        if (!response.ok) throw new Error("Action failed")

        const data = await response.json()
        setGameState(data.state)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed")
      }
    },
    [gameId],
  )

  return { gameState, loading, error, performAction }
}
