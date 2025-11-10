import { keccak256, toUtf8Bytes } from 'ethers'

export type Suit = "H" | "D" | "C" | "S"
export type Rank = "A" | "K" | "Q" | "J" | "10" | "9" | "8" | "7" | "6" | "5" | "4" | "3" | "2"

export interface Card {
  suit: Suit
  rank: Rank
}

export interface CardCommitment {
  cardHash: string       // keccak256 hash of cards
  salt: string           // Random salt for hashing
  revealed: boolean
  cards?: Card[]         // Actual cards (revealed at showdown)
}

export interface Player {
  id: string
  name: string
  stack: number
  hole: Card[]
  cardCommitment?: CardCommitment  // Commit-reveal data
  position: "UTG" | "UTG+1" | "MP" | "CO" | "BTN" | "SB" | "BB"
  isActive: boolean
  hasFolded: boolean
  currentBet: number
  totalBetThisRound: number
}

export interface GameState {
  players: Player[]
  dealer: number
  smallBlind: number
  bigBlind: number
  pot: number
  sidePots: number[]
  community: Card[]
  currentBet: number
  currentPlayer: number
  gameStage: "preflop" | "flop" | "turn" | "river" | "showdown"
  roundNumber: number
  playersInHand: number
}

export interface HandRanking {
  rank: number
  type:
    | "royal-flush"
    | "straight-flush"
    | "four-of-a-kind"
    | "full-house"
    | "flush"
    | "straight"
    | "three-of-a-kind"
    | "two-pair"
    | "pair"
    | "high-card"
  cards: Card[]
}

export class PokerEngine {
  private deck: Card[] = []
  private gameState: GameState | null = null

  /**
   * Generate random salt for card commitment
   */
  private generateSalt(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Create card hash for commit-reveal
   * Hash format: keccak256(card1String + card2String + salt)
   */
  private createCardHash(cards: Card[], salt: string): string {
    const card1Str = `${cards[0].rank}${cards[0].suit}`
    const card2Str = `${cards[1].rank}${cards[1].suit}`
    const dataToHash = card1Str + card2Str + salt
    return keccak256(toUtf8Bytes(dataToHash))
  }

  /**
   * Verify revealed cards match commitment
   */
  verifyCardCommitment(cards: Card[], salt: string, expectedHash: string): boolean {
    const computedHash = this.createCardHash(cards, salt)
    return computedHash === expectedHash
  }

  /**
   * Initialize a new Texas Hold'em game
   */
  initializeGame(
    players: Omit<Player, "hole" | "isActive" | "hasFolded" | "currentBet" | "totalBetThisRound">[],
  ): GameState {
    this.shuffleDeck()

    const gameState: GameState = {
      players: players.map((p, _i) => ({
        ...p,
        hole: [],
        isActive: true,
        hasFolded: false,
        currentBet: 0,
        totalBetThisRound: 0,
      })),
      dealer: 0,
      smallBlind: players[0]?.stack ? Math.floor(players[0].stack * 0.01) : 50,
      bigBlind: players[0]?.stack ? Math.floor(players[0].stack * 0.02) : 100,
      pot: 0,
      sidePots: [],
      community: [],
      currentBet: 0,
      currentPlayer: 0,
      gameStage: "preflop",
      roundNumber: 1,
      playersInHand: players.length,
    }

    // Set up blinds
    this.postBlinds(gameState)

    // Deal hole cards to each player (2 cards per player in Texas Hold'em)
    this.dealHoleCards(gameState)

    this.gameState = gameState
    return gameState
  }

  /**
   * Post small and big blinds
   */
  private postBlinds(gameState: GameState): void {
    const sbIndex = (gameState.dealer + 1) % gameState.players.length
    const bbIndex = (gameState.dealer + 2) % gameState.players.length

    const sbPlayer = gameState.players[sbIndex]
    const bbPlayer = gameState.players[bbIndex]

    // Small blind
    const sbAmount = Math.min(gameState.smallBlind, sbPlayer.stack)
    sbPlayer.stack -= sbAmount
    sbPlayer.currentBet = sbAmount
    sbPlayer.totalBetThisRound = sbAmount
    gameState.pot += sbAmount

    // Big blind
    const bbAmount = Math.min(gameState.bigBlind, bbPlayer.stack)
    bbPlayer.stack -= bbAmount
    bbPlayer.currentBet = bbAmount
    bbPlayer.totalBetThisRound = bbAmount
    gameState.pot += bbAmount

    gameState.currentBet = bbAmount
    gameState.currentPlayer = (bbIndex + 1) % gameState.players.length
  }

  /**
   * Shuffle deck using Fisher-Yates algorithm
   */
  private shuffleDeck(): void {
    this.deck = []
    const suits: Suit[] = ["H", "D", "C", "S"]
    const ranks: Rank[] = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"]

    for (const suit of suits) {
      for (const rank of ranks) {
        this.deck.push({ suit, rank })
      }
    }

    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]]
    }
  }

  /**
   * Deal 2 hole cards to each player (Texas Hold'em) with commit-reveal
   */
  private dealHoleCards(gameState: GameState): void {
    for (const player of gameState.players) {
      // Deal actual cards
      const cards = [this.deck.pop()!, this.deck.pop()!]
      player.hole = cards

      // Create commitment (hash the cards with random salt)
      const salt = this.generateSalt()
      const cardHash = this.createCardHash(cards, salt)

      player.cardCommitment = {
        cardHash,
        salt,
        revealed: false,
        cards: undefined  // Cards only revealed at showdown
      }
    }
  }

  /**
   * Reveal cards at showdown (automatic verification)
   */
  revealCards(playerId: string): boolean {
    if (!this.gameState) return false

    const player = this.gameState.players.find(p => p.id === playerId)
    if (!player || !player.cardCommitment) return false

    // Verify the commitment matches the actual cards
    const isValid = this.verifyCardCommitment(
      player.hole,
      player.cardCommitment.salt,
      player.cardCommitment.cardHash
    )

    if (isValid) {
      player.cardCommitment.revealed = true
      player.cardCommitment.cards = player.hole
      return true
    }

    return false
  }

  /**
   * Handle player action (fold, check, call, raise, all-in)
   * Texas Hold'em specific action handling
   */
  handleAction(playerId: string, action: "fold" | "check" | "call" | "raise" | "all-in", betAmount?: number): boolean {
    if (!this.gameState) return false

    const player = this.gameState.players.find((p) => p.id === playerId)
    if (!player || !player.isActive || player.hasFolded) return false

    switch (action) {
      case "fold":
        player.hasFolded = true
        player.isActive = false
        this.gameState.playersInHand--
        break

      case "check":
        // Valid only if no bet to call
        if (player.currentBet < this.gameState.currentBet) return false
        break

      case "call":
        const callAmount = Math.min(this.gameState.currentBet - player.currentBet, player.stack)
        player.stack -= callAmount
        player.currentBet += callAmount
        player.totalBetThisRound += callAmount
        this.gameState.pot += callAmount
        break

      case "raise":
        if (betAmount === undefined) return false
        const totalBet = Math.min(betAmount, player.stack + player.currentBet)
        const raiseAmount = totalBet - player.currentBet
        player.stack -= raiseAmount
        player.currentBet = totalBet
        player.totalBetThisRound += raiseAmount
        this.gameState.pot += raiseAmount
        this.gameState.currentBet = totalBet
        break

      case "all-in":
        const allInAmount = player.stack
        player.stack = 0
        player.currentBet += allInAmount
        player.totalBetThisRound += allInAmount
        this.gameState.pot += allInAmount
        this.gameState.currentBet = Math.max(this.gameState.currentBet, player.currentBet)
        break

      default:
        return false
    }

    this.advanceCurrentPlayer()
    return true
  }

  /**
   * Advance to next active player
   */
  private advanceCurrentPlayer(): void {
    if (!this.gameState) return

    let nextPlayer = (this.gameState.currentPlayer + 1) % this.gameState.players.length
    let iterations = 0

    while (
      (!this.gameState.players[nextPlayer].isActive || this.gameState.players[nextPlayer].hasFolded) &&
      iterations < this.gameState.players.length
    ) {
      nextPlayer = (nextPlayer + 1) % this.gameState.players.length
      iterations++
    }

    this.gameState.currentPlayer = nextPlayer
  }

  /**
   * Progress to next betting round
   * Deal community cards for each stage
   */
  nextBettingRound(): void {
    if (!this.gameState) return

    // Reset player bets for new round
    for (const player of this.gameState.players) {
      if (player.isActive) {
        player.currentBet = 0
      }
    }

    this.gameState.currentBet = 0

    // Deal community cards
    switch (this.gameState.gameStage) {
      case "preflop":
        // Burn a card and deal flop (3 cards)
        this.deck.pop() // burn
        this.gameState.community = [this.deck.pop()!, this.deck.pop()!, this.deck.pop()!]
        this.gameState.gameStage = "flop"
        break

      case "flop":
        // Burn a card and deal turn (1 card)
        this.deck.pop() // burn
        this.gameState.community.push(this.deck.pop()!)
        this.gameState.gameStage = "turn"
        break

      case "turn":
        // Burn a card and deal river (1 card)
        this.deck.pop() // burn
        this.gameState.community.push(this.deck.pop()!)
        this.gameState.gameStage = "river"
        break

      case "river":
        this.gameState.gameStage = "showdown"
        break
    }

    // Reset to small blind position
    const sbIndex = (this.gameState.dealer + 1) % this.gameState.players.length
    this.gameState.currentPlayer = sbIndex
  }

  /**
   * Get best 5-card hand from 7 cards (2 hole + 5 community)
   * Texas Hold'em hand evaluation
   */
  evaluateHand(hole: Card[], community: Card[]): HandRanking {
    const allCards = [...hole, ...community]
    const combinations = this.generateCombinations(allCards, 5)

    let bestHand: HandRanking = {
      rank: 0,
      type: "high-card",
      cards: [],
    }

    for (const combo of combinations) {
      const hand = this.rankHand(combo)
      if (hand.rank > bestHand.rank) {
        bestHand = hand
      }
    }

    return bestHand
  }

  /**
   * Generate all 5-card combinations from 7 cards
   */
  private generateCombinations(cards: Card[], size: number): Card[][] {
    if (size === 0) return [[]]
    if (cards.length === 0) return []

    const [first, ...rest] = cards
    const combosWithFirst = this.generateCombinations(rest, size - 1).map((combo) => [first, ...combo])
    const combosWithoutFirst = this.generateCombinations(rest, size)

    return [...combosWithFirst, ...combosWithoutFirst]
  }

  /**
   * Rank a 5-card hand
   */
  private rankHand(cards: Card[]): HandRanking {
    const rankValues: Record<Rank, number> = {
      A: 14,
      K: 13,
      Q: 12,
      J: 11,
      "10": 10,
      "9": 9,
      "8": 8,
      "7": 7,
      "6": 6,
      "5": 5,
      "4": 4,
      "3": 3,
      "2": 2,
    }

    const sorted = [...cards].sort((a, b) => rankValues[b.rank] - rankValues[a.rank])
    const ranks = sorted.map((c) => rankValues[c.rank])
    const suits = sorted.map((c) => c.suit)
    const isFlush = suits.every((s) => s === suits[0])
    const isStraight = this.isStraight(ranks)

    // Royal Flush
    if (isFlush && isStraight && ranks[0] === 14 && ranks[4] === 10) {
      return {
        rank: 10000000,
        type: "royal-flush",
        cards: sorted,
      }
    }

    // Straight Flush
    if (isFlush && isStraight) {
      return {
        rank: 9000000 + ranks[0],
        type: "straight-flush",
        cards: sorted,
      }
    }

    // Four of a Kind
    const fourOfAKind = this.findNOfAKind(ranks, 4)
    if (fourOfAKind !== -1) {
      return {
        rank: 8000000 + fourOfAKind * 100,
        type: "four-of-a-kind",
        cards: sorted,
      }
    }

    // Full House
    const threeOfAKind = this.findNOfAKind(ranks, 3)
    const pair = this.findNOfAKind(ranks, 2)
    if (threeOfAKind !== -1 && pair !== -1) {
      return {
        rank: 7000000 + threeOfAKind * 100 + pair,
        type: "full-house",
        cards: sorted,
      }
    }

    // Flush
    if (isFlush) {
      return {
        rank: 6000000 + ranks.reduce((a, b) => a * 100 + b),
        type: "flush",
        cards: sorted,
      }
    }

    // Straight
    if (isStraight) {
      return {
        rank: 5000000 + ranks[0],
        type: "straight",
        cards: sorted,
      }
    }

    // Three of a Kind
    if (threeOfAKind !== -1) {
      return {
        rank: 4000000 + threeOfAKind * 100,
        type: "three-of-a-kind",
        cards: sorted,
      }
    }

    // Two Pair
    const pairs = ranks.filter((r, i) => r === ranks[i + 1])
    if (pairs.length >= 2) {
      const pair1 = Math.max(...new Set(pairs))
      const pair2 = Math.min(...new Set(pairs))
      return {
        rank: 3000000 + pair1 * 100 + pair2,
        type: "two-pair",
        cards: sorted,
      }
    }

    // Pair
    if (pair !== -1) {
      return {
        rank: 2000000 + pair * 100,
        type: "pair",
        cards: sorted,
      }
    }

    // High Card
    return {
      rank: 1000000 + ranks.reduce((a, b) => a * 100 + b),
      type: "high-card",
      cards: sorted,
    }
  }

  /**
   * Check if ranks form a straight
   */
  private isStraight(ranks: number[]): boolean {
    if (
      ranks[0] - ranks[1] === 1 &&
      ranks[1] - ranks[2] === 1 &&
      ranks[2] - ranks[3] === 1 &&
      ranks[3] - ranks[4] === 1
    ) {
      return true
    }
    // Ace-low straight (A-2-3-4-5)
    if (ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2) {
      return true
    }
    return false
  }

  /**
   * Find n of a kind
   */
  private findNOfAKind(ranks: number[], n: number): number {
    for (let i = 0; i <= ranks.length - n; i++) {
      if (ranks.slice(i, i + n).every((r) => r === ranks[i])) {
        return ranks[i]
      }
    }
    return -1
  }

  /**
   * Get current game state
   */
  getGameState(): GameState | null {
    return this.gameState
  }

  /**
   * Reset for new hand
   */
  resetHand(): void {
    if (!this.gameState) return

    this.shuffleDeck()

    // Clear previous hand data
    for (const player of this.gameState.players) {
      player.hole = []
      player.cardCommitment = undefined  // Clear previous commitments
      player.hasFolded = false
      player.currentBet = 0
      player.totalBetThisRound = 0
      player.isActive = player.stack > 0
    }

    // Move dealer button
    this.gameState.dealer = (this.gameState.dealer + 1) % this.gameState.players.length
    this.gameState.community = []
    this.gameState.pot = 0
    this.gameState.sidePots = []
    this.gameState.currentBet = 0
    this.gameState.gameStage = "preflop"
    this.gameState.roundNumber++
    this.gameState.playersInHand = this.gameState.players.filter((p) => p.isActive).length

    this.postBlinds(this.gameState)
    this.dealHoleCards(this.gameState)
  }

  /**
   * Get sanitized game state for a specific player (hides other players' hole cards)
   */
  getGameStateForPlayer(playerId: string): GameState | null {
    if (!this.gameState) return null

    // Deep clone the game state
    const sanitizedState: GameState = JSON.parse(JSON.stringify(this.gameState))

    // Hide hole cards for other players (only show hashes)
    for (const player of sanitizedState.players) {
      if (player.id !== playerId && !player.cardCommitment?.revealed) {
        // Don't send actual hole cards, only the commitment hash
        player.hole = []
      }
    }

    return sanitizedState
  }

  /**
   * Handle showdown - automatically reveal and verify all active players' cards
   */
  handleShowdown(): { winner: string; verified: boolean } | null {
    if (!this.gameState || this.gameState.gameStage !== 'showdown') return null

    const activePlayers = this.gameState.players.filter(p => !p.hasFolded && p.isActive)

    if (activePlayers.length === 0) return null

    // Automatically reveal and verify all active players' cards
    for (const player of activePlayers) {
      const revealed = this.revealCards(player.id)
      if (!revealed) {
        console.error(`Failed to verify cards for player ${player.id}`)
        return { winner: '', verified: false }
      }
    }

    // Determine winner by evaluating hands
    let bestPlayer = activePlayers[0]
    let bestHand = this.evaluateHand(bestPlayer.hole, this.gameState.community)

    for (let i = 1; i < activePlayers.length; i++) {
      const player = activePlayers[i]
      const hand = this.evaluateHand(player.hole, this.gameState.community)

      if (hand.rank > bestHand.rank) {
        bestHand = hand
        bestPlayer = player
      }
    }

    return {
      winner: bestPlayer.id,
      verified: true
    }
  }
}
