import { WebSocket, WebSocketServer } from 'ws'
import { TurnTimer } from './turn-timer'
import { v4 as uuidv4 } from 'uuid'
import { ContractService } from './contract-service'
import { ethers } from 'ethers'

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
  private contractService: ContractService | null

  constructor(gameId: string, wss: WebSocketServer, contractService: ContractService | null = null) {
    this.gameId = gameId
    this.wss = wss
    this.contractService = contractService
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

  async addPlayer(address: string, ws: WebSocket) {
    if (!this.players.has(address)) {
      // Fetch player's chip stack from contract if available
      let stack = 0
      if (this.contractService) {
        try {
          const playerInfo = await this.contractService.getPlayerInfo(this.gameId, address)
          stack = Number(ethers.formatEther(playerInfo.chips))
          console.log(`💰 Player ${address} has ${stack} ETH from contract`)
        } catch (error) {
          console.log(`⚠️  Could not fetch player info from contract:`, error)
        }
      }

      const player: Player = {
        address,
        ws,
        stack,
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
        stack,
        timestamp: Date.now()
      })

      // Auto-start hand when 4 players join
      if (this.players.size === 4 && this.gameState.stage === 'waiting') {
        console.log('🎲 4 players joined! Auto-starting hand...')
        setTimeout(() => this.startHand(), 2000) // Give 2 seconds delay
      }
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

      // End game if only 1 player remains
      if (this.players.size === 1) {
        console.log('🏆 Game over! Only 1 player remains.')
        this.endGame()
      }
    }
  }

  async startHand() {
    if (this.players.size < 4) {
      console.log('❌ Not enough players to start hand (need 4 players)')
      return
    }

    // Call contract's startNewHand if available
    if (this.contractService) {
      try {
        console.log(`⛓️  Starting new hand on contract for table ${this.gameId}`)
        await this.contractService.startNewHand(this.gameId)
      } catch (error) {
        console.log(`⚠️  Could not start hand on contract:`, error)
      }
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

  async handleAction(playerAddress: string, action: string, amount?: number) {
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

          // Update contract pot
          if (this.contractService) {
            try {
              const amountWei = ethers.parseEther(amount.toString())
              await this.contractService.addToPot(this.gameId, playerAddress, amountWei)
              console.log(`⛓️  Added ${amount} ETH to contract pot`)
            } catch (error) {
              console.log(`⚠️  Could not add to contract pot:`, error)
            }
          }
        }
        break

      case 'raise':
        if (amount) {
          player.bet = amount
          player.stack -= amount
          this.gameState.pot += amount

          // Update contract pot
          if (this.contractService) {
            try {
              const amountWei = ethers.parseEther(amount.toString())
              await this.contractService.addToPot(this.gameId, playerAddress, amountWei)
              console.log(`⛓️  Added ${amount} ETH to contract pot`)
            } catch (error) {
              console.log(`⚠️  Could not add to contract pot:`, error)
            }
          }
        }
        break

      case 'all-in':
        const allInAmount = player.stack
        player.bet += allInAmount
        player.stack = 0
        this.gameState.pot += allInAmount

        // Update contract pot
        if (this.contractService && allInAmount > 0) {
          try {
            const amountWei = ethers.parseEther(allInAmount.toString())
            await this.contractService.addToPot(this.gameId, playerAddress, amountWei)
            console.log(`⛓️  Added ${allInAmount} ETH to contract pot (all-in)`)
          } catch (error) {
            console.log(`⚠️  Could not add to contract pot:`, error)
          }
        }
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

  private async endHand(winner: string) {
    console.log(`🏆 Hand ended, winner: ${winner}`)

    this.turnTimer?.stop()
    this.gameState.stage = 'showdown'

    const potAmount = this.gameState.pot

    // Call contract to distribute winnings if available
    if (this.contractService && potAmount > 0) {
      try {
        console.log(`⛓️  Distributing ${potAmount} ETH to ${winner} on contract`)
        await this.contractService.distributeWinnings(this.gameId, winner)
      } catch (error) {
        console.log(`⚠️  Could not distribute winnings on contract:`, error)
      }
    }

    // Award pot to winner in local state
    const winnerPlayer = this.players.get(winner)
    if (winnerPlayer) {
      winnerPlayer.stack += potAmount
    }

    this.broadcast({
      type: 'hand-ended',
      gameId: this.gameId,
      winner,
      pot: potAmount,
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

  private endGame() {
    console.log('🏆 Ending game...')

    // Stop any active timers
    this.turnTimer?.stop()

    // Get the winner (last remaining player)
    const winner = Array.from(this.players.keys())[0]

    this.broadcast({
      type: 'game-ended',
      gameId: this.gameId,
      winner,
      timestamp: Date.now()
    })

    // Reset game state
    this.gameState.stage = 'waiting'
    this.gameState.pot = 0
    this.gameState.communityCards = []
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
