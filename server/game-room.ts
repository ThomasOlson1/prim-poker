import { WebSocket, WebSocketServer } from 'ws'
import { TurnTimer } from './turn-timer'
import { v4 as uuidv4 } from 'uuid'
import { ContractService } from './contract-service'
import { ethers } from 'ethers'
import { PokerEngine, Card, CardCommitment } from './poker-engine'

export interface Player {
  address: string
  ws: WebSocket
  stack: number
  bet: number
  folded: boolean
  isActive: boolean
  // SECURITY: Hole cards stored server-side only, NEVER sent to clients until reveal
  holeCards?: Card[]
}

// Server-side secret data - NEVER sent to clients
interface PlayerSecrets {
  holeCards: Card[]
  cardHash: string
  salt: string
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

  // 🔐 SECURITY: Poker engine and secrets stored server-side only
  private pokerEngine: PokerEngine
  private playerSecrets: Map<string, PlayerSecrets> = new Map()
  private vrfSeed: bigint | null = null
  private vrfRequestId: string | null = null
  private waitingForVRF: boolean = false
  private vrfPollInterval: NodeJS.Timeout | null = null

  constructor(gameId: string, wss: WebSocketServer, contractService: ContractService | null = null) {
    this.gameId = gameId
    this.wss = wss
    this.contractService = contractService
    this.players = new Map()
    this.pokerEngine = new PokerEngine()
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

      console.log(`✅ Player ${address} joined table ${this.gameId}`)

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
      console.log(`👋 Player ${address} left table ${this.gameId}`)

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
      player.holeCards = undefined
    })

    // Clear previous hand secrets
    this.playerSecrets.clear()
    this.vrfSeed = null

    this.updateGameState()
    this.broadcast({
      type: 'hand-started',
      gameId: this.gameId,
      handNumber: this.gameState.handNumber,
      timestamp: Date.now()
    })

    // 🔐 SECURITY: Request VRF seed and wait for fulfillment before dealing cards
    await this.requestVRFAndDealCards()
  }

  /**
   * 🔐 SECURITY: Request Chainlink VRF and deal cards with verifiable randomness
   */
  private async requestVRFAndDealCards() {
    if (!this.contractService) {
      console.log('⚠️  No contract service - dealing without VRF (INSECURE)')
      await this.dealCardsWithCommitment()
      return
    }

    try {
      console.log('🎲 Requesting Chainlink VRF for verifiable randomness...')
      this.waitingForVRF = true

      // Request random seed from contract
      const requestId = await this.contractService.requestRandomSeed(this.gameId)
      this.vrfRequestId = requestId

      console.log(`⏳ Waiting for VRF fulfillment (request ID: ${requestId})...`)

      this.broadcast({
        type: 'vrf-requested',
        gameId: this.gameId,
        requestId,
        message: 'Requesting verifiable randomness from Chainlink VRF...',
        timestamp: Date.now()
      })

      // Poll for VRF fulfillment (every 2 seconds for up to 60 seconds)
      await this.pollForVRFFulfillment(60000)

    } catch (error) {
      console.error('❌ VRF request failed:', error)
      this.broadcast({
        type: 'error',
        code: 'VRF_FAILED',
        message: 'Failed to get verifiable randomness. Dealing without VRF.',
        timestamp: Date.now()
      })

      // Fallback: deal without VRF (not secure but game can continue)
      await this.dealCardsWithCommitment()
    }
  }

  /**
   * Poll contract for VRF fulfillment
   */
  private async pollForVRFFulfillment(maxWaitMs: number): Promise<void> {
    const startTime = Date.now()
    const pollInterval = 2000 // 2 seconds

    return new Promise((resolve, reject) => {
      this.vrfPollInterval = setInterval(async () => {
        try {
          if (!this.contractService) {
            clearInterval(this.vrfPollInterval!)
            reject(new Error('Contract service not available'))
            return
          }

          // Check if VRF seed has been fulfilled
          const seed = await this.contractService.getRandomSeed(this.gameId)

          if (seed && seed !== 0n) {
            console.log(`✅ VRF fulfilled! Seed: ${seed}`)
            this.vrfSeed = seed
            this.waitingForVRF = false

            clearInterval(this.vrfPollInterval!)

            this.broadcast({
              type: 'vrf-fulfilled',
              gameId: this.gameId,
              message: 'Verifiable randomness received! Dealing cards...',
              timestamp: Date.now()
            })

            // Now deal cards with the VRF seed
            await this.dealCardsWithCommitment(seed)
            resolve()
            return
          }

          // Check timeout
          if (Date.now() - startTime > maxWaitMs) {
            console.log('⏰ VRF timeout - proceeding without VRF')
            clearInterval(this.vrfPollInterval!)
            this.waitingForVRF = false
            await this.dealCardsWithCommitment()
            resolve()
          }
        } catch (error) {
          console.error('Error polling for VRF:', error)
        }
      }, pollInterval)
    })
  }

  /**
   * 🔐 SECURITY: Deal cards using PokerEngine and commit to contract
   * Salt and actual cards are NEVER sent to clients
   */
  private async dealCardsWithCommitment(vrfSeed?: bigint) {
    console.log('🃏 Dealing cards with commit-reveal scheme...')

    const playerAddresses = Array.from(this.players.keys())
    const playerData = playerAddresses.map((addr, i) => ({
      id: addr,
      name: `Player ${i + 1}`,
      position: this.getPosition(i, playerAddresses.length),
      stack: this.players.get(addr)!.stack
    }))

    // Initialize poker engine with VRF seed
    const gameState = this.pokerEngine.initializeGame(playerData, vrfSeed)

    // Extract cards and create commitments for each player
    for (const enginePlayer of gameState.players) {
      const player = this.players.get(enginePlayer.id)
      if (!player || !enginePlayer.cardCommitment) continue

      // Store hole cards server-side
      player.holeCards = enginePlayer.hole

      // Store secrets server-side (NEVER send to clients)
      this.playerSecrets.set(enginePlayer.id, {
        holeCards: enginePlayer.hole,
        cardHash: enginePlayer.cardCommitment.cardHash,
        salt: enginePlayer.cardCommitment.salt
      })

      // Commit card hash to contract
      if (this.contractService) {
        try {
          await this.contractService.commitCards(
            this.gameId,
            enginePlayer.id,
            enginePlayer.cardCommitment.cardHash
          )
          console.log(`✅ Committed cards for ${enginePlayer.id}: ${enginePlayer.cardCommitment.cardHash.substring(0, 10)}...`)
        } catch (error) {
          console.error(`❌ Failed to commit cards for ${enginePlayer.id}:`, error)
        }
      }

      // Send ONLY the hash to the client (NOT the cards or salt)
      player.ws.send(JSON.stringify({
        type: 'cards-dealt',
        gameId: this.gameId,
        cardHash: enginePlayer.cardCommitment.cardHash,
        message: 'Cards dealt! Your cards are committed to the blockchain.',
        timestamp: Date.now()
      }))
    }

    console.log('✅ All cards dealt and committed to contract')

    // Set first player
    this.currentPlayer = playerAddresses[0]
    this.gameState.currentPlayer = this.currentPlayer

    this.updateGameState()

    // Start turn timer
    this.startTurnTimer()
  }

  /**
   * Helper to get poker position
   */
  private getPosition(index: number, totalPlayers: number): "UTG" | "UTG+1" | "MP" | "CO" | "BTN" | "SB" | "BB" {
    const positions: Array<"UTG" | "UTG+1" | "MP" | "CO" | "BTN" | "SB" | "BB"> = ["UTG", "UTG+1", "MP", "CO", "BTN", "SB", "BB"]
    return positions[index % positions.length]
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

    // 🔐 SECURITY: Reveal winner's cards and verify against commitment
    await this.revealAndVerifyCards(winner)

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

  /**
   * 🔐 SECURITY: Reveal and verify cards against blockchain commitment
   */
  private async revealAndVerifyCards(playerAddress: string) {
    const secrets = this.playerSecrets.get(playerAddress)
    if (!secrets) {
      console.error(`❌ No secrets found for ${playerAddress}`)
      return
    }

    const { holeCards, salt } = secrets

    // Convert cards to string format (e.g., "Ah", "Kd")
    const card1 = `${holeCards[0].rank}${holeCards[0].suit.toLowerCase()}`
    const card2 = `${holeCards[1].rank}${holeCards[1].suit.toLowerCase()}`

    console.log(`🔓 Revealing cards for ${playerAddress}: ${card1}, ${card2}`)

    // Reveal cards to contract
    if (this.contractService) {
      try {
        const verified = await this.contractService.revealCards(
          this.gameId,
          playerAddress,
          card1,
          card2,
          salt
        )

        if (verified) {
          console.log(`✅ Cards verified on-chain for ${playerAddress}`)
        } else {
          console.error(`❌ Card verification FAILED for ${playerAddress}`)
          this.broadcast({
            type: 'error',
            code: 'VERIFICATION_FAILED',
            message: `Card verification failed for ${playerAddress}. Potential cheating detected!`,
            timestamp: Date.now()
          })
          return
        }
      } catch (error) {
        console.error(`❌ Failed to reveal cards on contract:`, error)
      }
    }

    // Broadcast revealed cards to all players
    this.broadcast({
      type: 'cards-revealed',
      gameId: this.gameId,
      player: playerAddress,
      cards: [card1, card2],
      verified: true,
      timestamp: Date.now()
    })
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
