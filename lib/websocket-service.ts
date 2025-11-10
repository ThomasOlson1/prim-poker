type EventHandler = (data: unknown) => void

interface GameEvent {
  type: "player-turn" | "action-taken" | "game-state-update" | "player-joined" | "game-started" | "game-ended"
  gameId: string
  data: unknown
  timestamp: number
}

export class WebSocketService {
  private ws: WebSocket | null = null
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000
  private listeners: Map<string, Set<EventHandler>> = new Map()
  private gameSubscriptions: Set<string> = new Set()

  constructor(url: string = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080") {
    this.url = url
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          console.log("[WebSocket] Connected")
          this.reconnectAttempts = 0
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const gameEvent: GameEvent = JSON.parse(event.data)
            this.handleEvent(gameEvent)
          } catch (error) {
            console.error("[WebSocket] Failed to parse message:", error)
          }
        }

        this.ws.onerror = (error) => {
          console.error("[WebSocket] Error:", error)
          reject(error)
        }

        this.ws.onclose = () => {
          console.log("[WebSocket] Disconnected")
          this.attemptReconnect()
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Authenticate with player address
   */
  authenticate(address: string): void {
    this.send({
      type: "authenticate",
      address: address.toLowerCase(),
    })
  }

  /**
   * Subscribe to a game's events
   */
  subscribeToGame(gameId: string, playerAddress?: string): void {
    if (this.gameSubscriptions.has(gameId)) return

    // Authenticate if address provided
    if (playerAddress) {
      this.authenticate(playerAddress)
    }

    this.gameSubscriptions.add(gameId)
    this.send({
      type: "subscribe",
      gameId,
    })
  }

  /**
   * Unsubscribe from a game's events
   */
  unsubscribeFromGame(gameId: string): void {
    this.gameSubscriptions.delete(gameId)
    this.send({
      type: "unsubscribe",
      gameId,
    })
  }

  /**
   * Send message to server
   */
  send(data: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    } else {
      console.warn("[WebSocket] Not connected, cannot send message")
    }
  }

  /**
   * Listen for specific event type
   */
  on(eventType: string, handler: EventHandler): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType)!.add(handler)

    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(handler)
    }
  }

  /**
   * Handle incoming event
   */
  private handleEvent(event: GameEvent): void {
    const eventKey = `${event.type}:${event.gameId}`

    // Notify all listeners for this event type
    this.listeners.get(event.type)?.forEach((handler) => {
      handler(event.data)
    })

    // Notify game-specific listeners
    this.listeners.get(eventKey)?.forEach((handler) => {
      handler(event.data)
    })
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[WebSocket] Max reconnect attempts reached")
      return
    }

    this.reconnectAttempts++
    console.log(`[WebSocket] Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts})`)

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error("[WebSocket] Reconnection failed:", error)
      })
    }, this.reconnectDelay)
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}
