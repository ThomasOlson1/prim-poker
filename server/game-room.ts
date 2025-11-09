import { WebSocket, WebSocketServer } from 'ws'
import { TurnTimer } from './turn-timer'
import { v4 as uuidv4 } from 'uuid'

export interface Player {
  address: string
  ws: WebSocket
  stack: number
  bet: number
  folded: boolean
  isActive: boolean
}

export interface GameState {
  gameId: string
  players: Record<string, Omit<Player, 'ws'>>
  currentPlayer: string | null
  pot: number
  stage: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'
  communityCards: string[]
  dealerIndex: number
  handNumber: number
}

export class GameRoom {
  private gameId: string
  private wss: WebSocketServer
  private players: Map<string, Player>
  private currentPlayer: string | null = null
  private turnTimer: TurnTimer | null = null
  private gameState: GameState
  private actionHistory: any[] = []

  constructor(gameId: string, wss: WebSocketServer) {
    this.gameId = gameId
    this.wss = wss
    this.players = new Map()
    this.gameState = {
      gameId,
      players: {},
      currentPlayer: null,
      pot: 0,
      stage: 'waiting',
      communityCards: [],
      dealerIndex: 0,
      handNumber: 0
    }
  }

  addPlayer(address: string, ws: WebSocket) {
    if (!this.players.has(address)) {
      const player: Player = {
        address,
        ws,
        stack: 0,
        bet: 0,
        folded: false,
        isActive: true
      }
      this.players.set(address, player)
      this.updateGameState()
      this.broadcast({
        type: 'player-joined',
        gameId: this.gameId,
        address,
        timestamp: Date.now()
      })
    }
  }

  removePlayer(address: string) {
    const player = this.players.get(address)
    if (player) {
      this.players.delete(address)
      this.updateGameState()
      this.broadcast({
        type: 'player-left',
        gameId: this.gameId,
        address,
        timestamp: Date.now()
      })

      // If current player left, skip to next
      if (this.currentPlayer === address) {
        this.nextPlayer()
      }
    }
  }

  startHand() {
    if (this.players.size < 2) {
      console.log('❌ Not enough players to start hand')
      return
    }

    this.gameState.stage = 'preflop'
    this.gameState.handNumber++
    this.gameState.pot = 0
    this.gameState.communityCards = []

    // Reset player states
    this.players.forEach(player => {
      player.bet = 0
      player.folded = false
      player.isActive = true
    })

    // Set first player
    const playerAddresses = Array.from(this.players.keys())
    this.currentPlayer = playerAddresses[0]
    this.gameState.currentPlayer = this.currentPlayer

    this.updateGameState()
    this.broadcast({
      type: 'hand-started',
      gameId: this.gameId,
      handNumber: this.gameState.handNumber,
      timestamp: Date.now()
    })

    // Start turn timer
    this.startTurnTimer()
  }

  handleAction(playerAddress: string, action: string, amount?: number) {
    if (this.currentPlayer !== playerAddress) {
      console.log('❌ Not player\'s turn:', playerAddress)
      return
    }

    const player = this.players.get(playerAddress)
    if (!player || player.folded) {
      console.log('❌ Invalid player or already folded')
      return
    }

    console.log(`🎲 Player ${playerAddress} action: ${action}`, amount)

    // Stop turn timer
    this.turnTimer?.stop()

    // Process action
    switch (action) {
      case 'fold':
        player.folded = true
        player.isActive = false
        break

      case 'check':
        // Valid only if no bet to call
        break

      case 'call':
        // Add to pot
        if (amount) {
          player.bet += amount
          player.stack -= amount
          this.gameState.pot += amount
        }
        break

      case 'raise':
        if (amount) {
          player.bet = amount
          player.stack -= amount
          this.gameState.pot += amount
        }
        break

      case 'all-in':
        const allInAmount = player.stack
        player.bet += allInAmount
        player.stack = 0
        this.gameState.pot += allInAmount
        break
    }

    // Record action
    this.actionHistory.push({
      player: playerAddress,
      action,
      amount,
      timestamp: Date.now()
    })

    // Broadcast action
    this.broadcast({
      type: 'action-taken',
      gameId: this.gameId,
      player: playerAddress,
      action,
      amount,
      pot: this.gameState.pot,
      timestamp: Date.now()
    })

    // Check if hand is over
    const activePlayers = Array.from(this.players.values()).filter(p => !p.folded && p.isActive)
    if (activePlayers.length === 1) {
      this.endHand(activePlayers[0].address)
      return
    }

    // Move to next player
    this.nextPlayer()
    this.updateGameState()
    this.startTurnTimer()
  }

  private nextPlayer() {
    const playerAddresses = Array.from(this.players.keys()).filter(addr => {
      const player = this.players.get(addr)
      return player && !player.folded && player.isActive
    })

    if (playerAddresses.length === 0) {
      this.currentPlayer = null
      return
    }

    const currentIndex = playerAddresses.indexOf(this.currentPlayer!)
    const nextIndex = (currentIndex + 1) % playerAddresses.length
    this.currentPlayer = playerAddresses[nextIndex]
    this.gameState.currentPlayer = this.currentPlayer

    console.log(`➡️  Next player: ${this.currentPlayer}`)
  }

  private startTurnTimer() {
    if (this.turnTimer) {
      this.turnTimer.stop()
    }

    // 30 second turn timer
    this.turnTimer = new TurnTimer(30, (timeLeft) => {
      // Broadcast timer update every second
      this.broadcast({
        type: 'turn-timer',
        gameId: this.gameId,
        player: this.currentPlayer,
        timeLeft,
        timestamp: Date.now()
      })
    }, () => {
      // Timer expired - auto-fold
      console.log(`⏰ Timer expired for ${this.currentPlayer}`)
      if (this.currentPlayer) {
        this.handleAction(this.currentPlayer, 'fold')
      }
    })

    this.turnTimer.start()
  }

  private endHand(winner: string) {
    console.log(`🏆 Hand ended, winner: ${winner}`)

    this.turnTimer?.stop()
    this.gameState.stage = 'showdown'

    // Award pot to winner
    const winnerPlayer = this.players.get(winner)
    if (winnerPlayer) {
      winnerPlayer.stack += this.gameState.pot
    }

    this.broadcast({
      type: 'hand-ended',
      gameId: this.gameId,
      winner,
      pot: this.gameState.pot,
      timestamp: Date.now()
    })

    // Move dealer button
    this.gameState.dealerIndex = (this.gameState.dealerIndex + 1) % this.players.size
    this.gameState.pot = 0
    this.gameState.stage = 'waiting'
    this.currentPlayer = null
    this.gameState.currentPlayer = null

    this.updateGameState()
  }

  private updateGameState() {
    // Convert players to serializable format
    const players: Record<string, Omit<Player, 'ws'>> = {}
    this.players.forEach((player, address) => {
      players[address] = {
        address: player.address,
        stack: player.stack,
        bet: player.bet,
        folded: player.folded,
        isActive: player.isActive
      }
    })

    this.gameState.players = players

    this.broadcast({
      type: 'game-state-update',
      gameId: this.gameId,
      state: this.gameState,
      timestamp: Date.now()
    })
  }

  private broadcast(message: any) {
    const data = JSON.stringify(message)
    this.players.forEach(player => {
      if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(data)
      }
    })
  }

  getPlayerCount(): number {
    return this.players.size
  }

  getGameState(): GameState {
    return this.gameState
  }
}
