import { type GameState, PokerEngine } from "./poker-engine"

export interface GameServiceConfig {
  baseUrl?: string
  mockMode?: boolean
}

export class GameService {
  private baseUrl: string
  private mockMode: boolean
  private pokerEngine: PokerEngine

  constructor(config: GameServiceConfig = {}) {
    this.baseUrl = config.baseUrl || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"
    this.mockMode = config.mockMode ?? true
    this.pokerEngine = new PokerEngine()
  }

  /**
   * Create a new game (generic backend call)
   */
  async createGame(params: {
    name: string
    smallBlind: number
    bigBlind: number
    maxPlayers: number
    buyIn: number
  }): Promise<{ gameId: string; success: boolean }> {
    if (this.mockMode) {
      return this.mockCreateGame(params)
    }

    try {
      const response = await fetch(`${this.baseUrl}/games`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      })
      return await response.json()
    } catch (error) {
      console.error("[v0] Error creating game:", error)
      return this.mockCreateGame(params)
    }
  }

  /**
   * Join an existing game
   */
  async joinGame(gameId: string, playerId: string, buyIn: number): Promise<{ success: boolean; message: string }> {
    if (this.mockMode) {
      return this.mockJoinGame(gameId, playerId, buyIn)
    }

    try {
      const response = await fetch(`${this.baseUrl}/games/${gameId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, buyIn }),
      })
      return await response.json()
    } catch (error) {
      console.error("[v0] Error joining game:", error)
      return this.mockJoinGame(gameId, playerId, buyIn)
    }
  }

  /**
   * Submit player action
   */
  async submitAction(
    gameId: string,
    playerId: string,
    action: "fold" | "check" | "call" | "raise" | "all-in",
    amount?: number,
  ): Promise<{ success: boolean; gameState?: GameState | null }> {
    if (this.mockMode) {
      return this.mockSubmitAction(gameId, playerId, action, amount)
    }

    try {
      const response = await fetch(`${this.baseUrl}/games/${gameId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, action, amount }),
      })
      return await response.json()
    } catch (error) {
      console.error("[v0] Error submitting action:", error)
      return this.mockSubmitAction(gameId, playerId, action, amount)
    }
  }

  /**
   * Get game state
   */
  async getGame(gameId: string): Promise<{ gameState: GameState | null; error?: string }> {
    if (this.mockMode) {
      return this.mockGetGame(gameId)
    }

    try {
      const response = await fetch(`${this.baseUrl}/games/${gameId}`)
      return await response.json()
    } catch (error) {
      console.error("[v0] Error fetching game:", error)
      return this.mockGetGame(gameId)
    }
  }

  /**
   * List available games
   */
  async listGames(filters?: { minBuyIn?: number; maxBuyIn?: number; status?: string }): Promise<
    Array<{
      id: string
      name: string
      buyIn: number
      blinds: string
      players: number
      maxPlayers: number
      status: string
    }>
  > {
    if (this.mockMode) {
      return this.mockListGames(filters)
    }

    try {
      const params = new URLSearchParams(filters as Record<string, string>)
      const response = await fetch(`${this.baseUrl}/games?${params}`)
      return await response.json()
    } catch (error) {
      console.error("[v0] Error listing games:", error)
      return this.mockListGames(filters)
    }
  }

  private mockCreateGame(_params: unknown) {
    return Promise.resolve({
      gameId: `game_${Date.now()}`,
      success: true,
    })
  }

  private mockJoinGame(gameId: string, _playerId: string, _buyIn: number) {
    return Promise.resolve({
      success: true,
      message: `Successfully joined game ${gameId}`,
    })
  }

  private mockSubmitAction(_gameId: string, _playerId: string, _action: string, _amount?: number) {
    return Promise.resolve({
      success: true,
      gameState: this.pokerEngine.getGameState(),
    })
  }

  private mockGetGame(_gameId: string) {
    return Promise.resolve({
      gameState: this.pokerEngine.getGameState(),
    })
  }

  private mockListGames(_filters?: unknown) {
    return Promise.resolve([
      {
        id: "1",
        name: "High Rollers",
        buyIn: 100,
        blinds: "1/2",
        players: 5,
        maxPlayers: 6,
        status: "running",
      },
      {
        id: "2",
        name: "Mid Stakes",
        buyIn: 50,
        blinds: "0.5/1",
        players: 3,
        maxPlayers: 6,
        status: "waiting",
      },
    ])
  }
}

// Singleton instance
let gameServiceInstance: GameService | null = null

export function getGameService(config?: GameServiceConfig): GameService {
  if (!gameServiceInstance) {
    gameServiceInstance = new GameService(config)
  }
  return gameServiceInstance
}
