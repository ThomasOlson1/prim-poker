import { ethers } from 'ethers'

// Contract ABI - essential functions and events
const POKER_CONTRACT_ABI = [
  "function getTableInfo(uint256 tableId) view returns (uint256 smallBlind, uint256 bigBlind, uint256 minBuyIn, uint8 numPlayers, uint256 pot, bool isActive, uint256 handNumber)",
  "function getPlayerInfo(uint256 tableId, address player) view returns (uint256 chips, bool isSeated)",
  "function getPlayers(uint256 tableId) view returns (address[9])",
  "function startNewHand(uint256 tableId)",
  "function addToPot(uint256 tableId, address player, uint256 amount)",
  "function distributeWinnings(uint256 tableId, address winner)",
  "function tableCounter() view returns (uint256)",

  // Chainlink VRF functions
  "function requestRandomSeed(uint256 tableId) returns (uint256)",
  "function getRandomSeed(uint256 tableId) view returns (uint256)",

  // Commit-reveal functions
  "function commitCards(uint256 tableId, address player, bytes32 cardHash)",
  "function revealCards(uint256 tableId, address player, string card1, string card2, string salt) returns (bool)",
  "function getCardCommitment(uint256 tableId, address player) view returns (bytes32 cardHash, bool committed, bool revealed, uint256 commitTime, string card1, string card2)",
  "function isRevealWithinTimeout(uint256 tableId, address player) view returns (bool)",

  "event TableCreated(uint256 indexed tableId, uint256 smallBlind, uint256 bigBlind, uint256 minBuyIn)",
  "event PlayerJoined(uint256 indexed tableId, address indexed player, uint256 buyIn, uint8 seatIndex)",
  "event PlayerLeft(uint256 indexed tableId, address indexed player, uint256 cashOut)",
  "event HandStarted(uint256 indexed tableId, uint256 handNumber, uint256 pot)",
  "event WinnerPaid(uint256 indexed tableId, address indexed winner, uint256 amount)",
  "event CardCommitted(uint256 indexed tableId, address indexed player, bytes32 cardHash)",
  "event CardRevealed(uint256 indexed tableId, address indexed player, string card1, string card2)",
  "event RandomSeedRequested(uint256 indexed tableId, uint256 indexed requestId)",
  "event RandomSeedFulfilled(uint256 indexed tableId, uint256 randomSeed)",
]

export interface TableInfo {
  smallBlind: bigint
  bigBlind: bigint
  minBuyIn: bigint
  numPlayers: number
  pot: bigint
  isActive: boolean
  handNumber: bigint
}

export interface PlayerInfo {
  chips: bigint
  isSeated: boolean
}

export class ContractService {
  private contract: ethers.Contract
  private provider: ethers.Provider
  private signer?: ethers.Signer

  constructor(rpcUrl: string, contractAddress: string, privateKey?: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl)

    if (privateKey) {
      this.signer = new ethers.Wallet(privateKey, this.provider)
      this.contract = new ethers.Contract(contractAddress, POKER_CONTRACT_ABI, this.signer)
    } else {
      this.contract = new ethers.Contract(contractAddress, POKER_CONTRACT_ABI, this.provider)
    }
  }

  /**
   * Get table information from contract
   */
  async getTableInfo(tableId: string): Promise<TableInfo> {
    const result = await this.contract.getTableInfo(tableId)
    return {
      smallBlind: result.smallBlind,
      bigBlind: result.bigBlind,
      minBuyIn: result.minBuyIn,
      numPlayers: Number(result.numPlayers),
      pot: result.pot,
      isActive: result.isActive,
      handNumber: result.handNumber,
    }
  }

  /**
   * Get player information from contract
   */
  async getPlayerInfo(tableId: string, playerAddress: string): Promise<PlayerInfo> {
    const result = await this.contract.getPlayerInfo(tableId, playerAddress)
    return {
      chips: result.chips,
      isSeated: result.isSeated,
    }
  }

  /**
   * Get all players at a table
   */
  async getPlayers(tableId: string): Promise<string[]> {
    const players = await this.contract.getPlayers(tableId)
    return players.filter((addr: string) => addr !== ethers.ZeroAddress)
  }

  /**
   * Start a new hand (only callable by game server)
   */
  async startNewHand(tableId: string): Promise<void> {
    if (!this.signer) {
      throw new Error('Signer required to start hand')
    }
    const tx = await this.contract.startNewHand(tableId)
    await tx.wait()
  }

  /**
   * Add chips to pot (only callable by game server)
   */
  async addToPot(tableId: string, playerAddress: string, amount: bigint): Promise<void> {
    if (!this.signer) {
      throw new Error('Signer required to add to pot')
    }
    const tx = await this.contract.addToPot(tableId, playerAddress, amount)
    await tx.wait()
  }

  /**
   * Distribute winnings to winner (only callable by game server)
   */
  async distributeWinnings(tableId: string, winner: string): Promise<void> {
    if (!this.signer) {
      throw new Error('Signer required to distribute winnings')
    }
    const tx = await this.contract.distributeWinnings(tableId, winner)
    await tx.wait()
  }

  /**
   * Get total number of tables
   */
  async getTableCount(): Promise<number> {
    const count = await this.contract.tableCounter()
    return Number(count)
  }

  /**
   * Request random seed from Chainlink VRF (only callable by game server)
   */
  async requestRandomSeed(tableId: string): Promise<string> {
    if (!this.signer) {
      throw new Error('Signer required to request random seed')
    }
    const tx = await this.contract.requestRandomSeed(tableId)
    const receipt = await tx.wait()

    // Extract request ID from event logs
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = this.contract.interface.parseLog(log)
        return parsed?.name === 'RandomSeedRequested'
      } catch {
        return false
      }
    })

    if (event) {
      const parsed = this.contract.interface.parseLog(event)
      return parsed!.args.requestId.toString()
    }

    throw new Error('RandomSeedRequested event not found')
  }

  /**
   * Get random seed for a table
   */
  async getRandomSeed(tableId: string): Promise<bigint> {
    const seed = await this.contract.getRandomSeed(tableId)
    return seed
  }

  /**
   * Commit card hash to contract (only callable by game server)
   */
  async commitCards(tableId: string, playerAddress: string, cardHash: string): Promise<void> {
    if (!this.signer) {
      throw new Error('Signer required to commit cards')
    }
    const tx = await this.contract.commitCards(tableId, playerAddress, cardHash)
    await tx.wait()
  }

  /**
   * Reveal cards and verify against commitment (only callable by game server)
   */
  async revealCards(
    tableId: string,
    playerAddress: string,
    card1: string,
    card2: string,
    salt: string
  ): Promise<boolean> {
    if (!this.signer) {
      throw new Error('Signer required to reveal cards')
    }
    const tx = await this.contract.revealCards(tableId, playerAddress, card1, card2, salt)
    const receipt = await tx.wait()

    // Check if CardRevealed event was emitted (indicates success)
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = this.contract.interface.parseLog(log)
        return parsed?.name === 'CardRevealed'
      } catch {
        return false
      }
    })

    return !!event
  }

  /**
   * Get card commitment for a player
   */
  async getCardCommitment(tableId: string, playerAddress: string): Promise<{
    cardHash: string
    committed: boolean
    revealed: boolean
    commitTime: bigint
    card1: string
    card2: string
  }> {
    const result = await this.contract.getCardCommitment(tableId, playerAddress)
    return {
      cardHash: result.cardHash,
      committed: result.committed,
      revealed: result.revealed,
      commitTime: result.commitTime,
      card1: result.card1,
      card2: result.card2,
    }
  }

  /**
   * Check if player's reveal is within timeout window
   */
  async isRevealWithinTimeout(tableId: string, playerAddress: string): Promise<boolean> {
    return await this.contract.isRevealWithinTimeout(tableId, playerAddress)
  }

  /**
   * Listen for contract events
   */
  onTableCreated(callback: (tableId: bigint, smallBlind: bigint, bigBlind: bigint, minBuyIn: bigint) => void) {
    this.contract.on('TableCreated', callback)
  }

  onPlayerJoined(callback: (tableId: bigint, player: string, buyIn: bigint, seatIndex: number) => void) {
    this.contract.on('PlayerJoined', callback)
  }

  onPlayerLeft(callback: (tableId: bigint, player: string, cashOut: bigint) => void) {
    this.contract.on('PlayerLeft', callback)
  }

  onHandStarted(callback: (tableId: bigint, handNumber: bigint, pot: bigint) => void) {
    this.contract.on('HandStarted', callback)
  }

  onWinnerPaid(callback: (tableId: bigint, winner: string, amount: bigint) => void) {
    this.contract.on('WinnerPaid', callback)
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners() {
    this.contract.removeAllListeners()
  }
}
