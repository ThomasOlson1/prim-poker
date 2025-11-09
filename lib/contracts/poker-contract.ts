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
  "function addToPot(uint256 tableId, address player, uint256 amount)",
  "function distributeWinnings(uint256 tableId, address winner)",
  "function setGameServer(address _gameServer)",

  // Events
  "event TableCreated(uint256 indexed tableId, uint256 smallBlind, uint256 bigBlind, uint256 minBuyIn)",
  "event PlayerJoined(uint256 indexed tableId, address indexed player, uint256 buyIn, uint8 seatIndex)",
  "event PlayerLeft(uint256 indexed tableId, address indexed player, uint256 cashOut)",
  "event HandStarted(uint256 indexed tableId, uint256 handNumber, uint256 pot)",
  "event BlindsPosted(uint256 indexed tableId, address smallBlind, address bigBlind, uint256 gasFee)",
  "event WinnerPaid(uint256 indexed tableId, address indexed winner, uint256 amount)",
  "event GasFeeCollected(uint256 indexed tableId, uint256 amount)",
  "event GameServerUpdated(address indexed oldServer, address indexed newServer)",
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

  async createTable(smallBlind: bigint, bigBlind: bigint): Promise<string> {
    const contractWithSigner = this.contract.connect(this.signer)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = await (contractWithSigner as any).createTable(smallBlind, bigBlind)
    const receipt = await tx.wait()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  async joinTable(tableId: string, buyIn: bigint): Promise<void> {
    const contractWithSigner = this.contract.connect(this.signer)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = await (contractWithSigner as any).joinTable(tableId, { value: buyIn })
    await tx.wait()
  }

  async leaveTable(tableId: string): Promise<void> {
    const contractWithSigner = this.contract.connect(this.signer)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = await (contractWithSigner as any).leaveTable(tableId)
    await tx.wait()
  }

  async startNewHand(tableId: string): Promise<void> {
    const contractWithSigner = this.contract.connect(this.signer)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = await (contractWithSigner as any).startNewHand(tableId)
    await tx.wait()
  }

  async addToPot(tableId: string, playerAddress: string, amount: bigint): Promise<void> {
    const contractWithSigner = this.contract.connect(this.signer)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = await (contractWithSigner as any).addToPot(tableId, playerAddress, amount)
    await tx.wait()
  }

  async distributeWinnings(tableId: string, winner: string): Promise<void> {
    const contractWithSigner = this.contract.connect(this.signer)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = await (contractWithSigner as any).distributeWinnings(tableId, winner)
    await tx.wait()
  }

  async setGameServer(gameServerAddress: string): Promise<void> {
    const contractWithSigner = this.contract.connect(this.signer)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = await (contractWithSigner as any).setGameServer(gameServerAddress)
    await tx.wait()
  }

  async getTableInfo(tableId: string): Promise<TableInfo> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (this.contract as any).getTableInfo(tableId)
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

  async getPlayerInfo(tableId: string, playerAddress: string): Promise<PlayerInfo> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (this.contract as any).getPlayerInfo(tableId, playerAddress)
    return {
      chips: result.chips,
      isSeated: result.isSeated,
    }
  }

  async getPlayers(tableId: string): Promise<string[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const players = await (this.contract as any).getPlayers(tableId)
    return players.filter((addr: string) => addr !== ethers.ZeroAddress)
  }

  async isViableStakes(smallBlind: bigint, bigBlind: bigint): Promise<{ viable: boolean; reason: string }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (this.contract as any).isViableStakes(smallBlind, bigBlind)
    return {
      viable: result.viable,
      reason: result.reason,
    }
  }

  async getGasFee(): Promise<bigint> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (this.contract as any).GAS_FEE()
  }

  async getTableCounter(): Promise<bigint> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (this.contract as any).tableCounter()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(eventName: string, callback: (...args: any[]) => void) {
    this.contract.on(eventName, callback)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off(eventName: string, callback: (...args: any[]) => void) {
    this.contract.off(eventName, callback)
  }
}
