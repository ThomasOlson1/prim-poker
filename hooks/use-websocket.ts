"use client"

import { useEffect, useRef, useState } from "react"
import { WebSocketService } from "@/lib/websocket-service"

export function useWebSocket() {
  const wsRef = useRef<WebSocketService | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const ws = new WebSocketService()
    wsRef.current = ws

    ws.connect()
      .then(() => setIsConnected(true))
      .catch((error) => {
        console.error("Failed to connect:", error)
        setIsConnected(false)
      })

    return () => {
      ws.disconnect()
    }
  }, [])

  const subscribe = (gameId: string, playerAddress?: string, fid?: number) => {
    wsRef.current?.subscribeToGame(gameId, playerAddress, fid)
  }

  const unsubscribe = (gameId: string) => {
    wsRef.current?.unsubscribeFromGame(gameId)
  }

  const on = (eventType: string, handler: (data: any) => void) => {
    return wsRef.current?.on(eventType, handler) || (() => {})
  }

  const send = (data: any) => {
    wsRef.current?.send(data)
  }

  return {
    isConnected,
    subscribe,
    unsubscribe,
    on,
    send,
  }
}
