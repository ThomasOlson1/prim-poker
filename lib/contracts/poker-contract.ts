import { ethers } from 'ethers'

// Contract ABI - essential functions only
export const POKER_CONTRACT_ABI = [
  // Read functions
  "function GAS_FEE() view returns (uint256)",
  "function tableCounter() view returns (uint256)",
  "function getTableInfo(uint256 tableId) view returns (uint256 smallBlind, uint256 bigBlind, uint256 minBuyIn, uint8 numPlayers, uint256 pot, bool isActive, uint256 handNumber)",
  "function getPlayerInfo(uint256 tableId, address player) view returns (uint256 chips, bool isSeated)",
  "function getPlayers(uint256 tableId) view returns (address[9])",
  "function isViableStakes(uint256 smallBlind, uint256 bigBlind) view returns (bool viable, string memory reason)",

  // Write functions
  "function createTable(uint256 smallBlind, uint256 bigBlind) returns (uint256)",
  "function joinTable(uint256 tableId) payable",
  "function leaveTable(uint256 tableId)",
  "function startNewHand(uint256 tableId)",
  "function addToPot(uint256 tableId, uint256 amount)",
  "function distributeWinnings(uint256 tableId, address winner)",

  // Events
  "event TableCreated(uint256 indexed tableId, uint256 smallBlind, uint256 bigBlind, uint256 minBuyIn)",
  "event PlayerJoined(uint256 indexed tableId, address indexed player, uint256 buyIn, uint8 seatIndex)",
  "event PlayerLeft(uint256 indexed tableId, address indexed player, uint256 cashOut)",
  "event HandStarted(uint256 indexed tableId, uint256 handNumber, uint256 pot)",
  "event BlindsPosted(uint256 indexed tableId, address smallBlind, address bigBlind, uint256 gasFee)",
  "event WinnerPaid(uint256 indexed tableId, address indexed winner, uint256 amount)",
  "event GasFeeCollected(uint256 indexed tableId, uint256 amount)",
]

export const POKER_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_POKER_CONTRACT_ADDRESS || ''

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

export class PokerContract {
  private contract: ethers.Contract
  private signer: ethers.Signer

  constructor(provider: ethers.Provider, signer: ethers.Signer) {
    this.contract = new ethers.Contract(POKER_CONTRACT_ADDRESS, POKER_CONTRACT_ABI, provider)
    this.signer = signer
  }

  /**
   * Create a new poker table
   */
  async createTable(smallBlind: bigint, bigBlind: bigint): Promise<string> {
    const contractWithSigner = this.contract.connect(this.signer)
    const tx = await contractWithSigner.createTable(smallBlind, bigBlind)
    const receipt = await tx.wait()

    // Parse TableCreated event to get tableId
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = this.contract.interface.parseLog(log)
        return parsed?.name === 'TableCreated'
      } catch {
        return false
      }
    })

    if (event) {
      const parsed = this.contract.interface.parseLog(event)
      return parsed?.args.tableId.toString()
    }

    throw new Error('Failed to get table ID from transaction')
  }

  /**
   * Join a table with buy-in
   */
  async joinTable(tableId: string, buyIn: bigint): Promise<void> {
    const contractWithSigner = this.contract.connect(this.signer)
    const tx = await contractWithSigner.joinTable(tableId, { value: buyIn })
    await tx.wait()
  }

  /**
   * Leave table and cash out
   */
  async leaveTable(tableId: string): Promise<void> {
    const contractWithSigner = this.contract.connect(this.signer)
    const tx = await contractWithSigner.leaveTable(tableId)
    await tx.wait()
  }

  /**
   * Start a new hand
   */
  async startNewHand(tableId: string): Promise<void> {
    const contractWithSigner = this.contract.connect(this.signer)
    const tx = await contractWithSigner.startNewHand(tableId)
    await tx.wait()
  }

  /**
   * Add chips to pot (bet/raise)
   */
  async addToPot(tableId: string, amount: bigint): Promise<void> {
    const contractWithSigner = this.contract.connect(this.signer)
    const tx = await contractWithSigner.addToPot(tableId, amount)
    await tx.wait()
  }

  /**
   * Distribute winnings to winner
   */
  async distributeWinnings(tableId: string, winner: string): Promise<void> {
    const contractWithSigner = this.contract.connect(this.signer)
    const tx = await contractWithSigner.distributeWinnings(tableId, winner)
    await tx.wait()
  }

  /**
   * Get table information
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
   * Get player information at table
   */
  async getPlayerInfo(tableId: string, playerAddress: string): Promise<PlayerInfo> {
    const result = await this.contract.getPlayerInfo(tableId, playerAddress)
    return {
      chips: result.chips,
      isSeated: result.isSeated,
    }
  }

  /**
   * Get all players at table
   */
  async getPlayers(tableId: string): Promise<string[]> {
    const players = await this.contract.getPlayers(tableId)
    return players.filter((addr: string) => addr !== ethers.ZeroAddress)
  }

  /**
   * Check if stakes are viable
   */
  async isViableStakes(smallBlind: bigint, bigBlind: bigint): Promise<{ viable: boolean; reason: string }> {
    const result = await this.contract.isViableStakes(smallBlind, bigBlind)
    return {
      viable: result.viable,
      reason: result.reason,
    }
  }

  /**
   * Get gas fee constant
   */
  async getGasFee(): Promise<bigint> {
    return await this.contract.GAS_FEE()
  }

  /**
   * Get total number of tables
   */
  async getTableCounter(): Promise<bigint> {
    return await this.contract.tableCounter()
  }

  /**
   * Listen to contract events
   */
  on(eventName: string, callback: (...args: any[]) => void) {
    this.contract.on(eventName, callback)
  }

  off(eventName: string, callback: (...args: any[]) => void) {
    this.contract.off(eventName, callback)
  }
}
