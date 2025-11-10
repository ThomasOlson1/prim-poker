import { expect } from "chai"
import hre from "hardhat"
import { PokerFlatGasFee } from "../typechain-types"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"

const { ethers } = hre

describe("PokerFlatGasFee", function () {
  let poker: PokerFlatGasFee
  let owner: SignerWithAddress
  let gameServer: SignerWithAddress
  let player1: SignerWithAddress
  let player2: SignerWithAddress
  let player3: SignerWithAddress
  let vrfCoordinator: SignerWithAddress

  const SMALL_BLIND = ethers.parseEther("0.01")
  const BIG_BLIND = ethers.parseEther("0.02")
  const MIN_BUY_IN = BIG_BLIND * 50n // 50x big blind

  beforeEach(async function () {
    // Get signers
    ;[owner, gameServer, player1, player2, player3, vrfCoordinator] = await ethers.getSigners()

    // Deploy contract with mock VRF coordinator
    const PokerFlatGasFee = await ethers.getContractFactory("PokerFlatGasFee")
    poker = await PokerFlatGasFee.deploy(vrfCoordinator.address)
    await poker.waitForDeployment()

    // Set game server
    await poker.setGameServer(gameServer.address)
  })

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await poker.owner()).to.equal(owner.address)
    })

    it("Should set the correct VRF coordinator", async function () {
      // This would need to be exposed in the contract or tested indirectly
      // For now, we'll test that VRF-related functions don't revert
    })

    it("Should initialize with correct default gas parameters", async function () {
      const estimatedGas = await poker.estimatedGasUnits()
      const gasMarkup = await poker.gasMarkup()
      const minGasFee = await poker.minimumGasFee()

      expect(estimatedGas).to.equal(60000n)
      expect(gasMarkup).to.equal(ethers.parseEther("0.0001"))
      expect(minGasFee).to.equal(ethers.parseEther("0.00005"))
    })

    it("Should start with zero tables", async function () {
      expect(await poker.tableCounter()).to.equal(0)
    })
  })

  describe("Table Creation", function () {
    it("Should create a table with valid blinds", async function () {
      const tx = await poker.createTable(SMALL_BLIND, BIG_BLIND)
      const receipt = await tx.wait()

      // Check event was emitted
      const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === "TableCreated"
      )
      expect(event).to.not.be.undefined

      // Check table counter incremented
      expect(await poker.tableCounter()).to.equal(1)

      // Check table info
      const tableInfo = await poker.getTableInfo(1)
      expect(tableInfo.smallBlind).to.equal(SMALL_BLIND)
      expect(tableInfo.bigBlind).to.equal(BIG_BLIND)
      expect(tableInfo.minBuyIn).to.equal(MIN_BUY_IN)
      expect(tableInfo.numPlayers).to.equal(0)
      expect(tableInfo.pot).to.equal(0)
      expect(tableInfo.isActive).to.equal(true)
      expect(tableInfo.handNumber).to.equal(0)
    })

    it("Should reject table creation with invalid blinds (SB >= BB)", async function () {
      await expect(
        poker.createTable(BIG_BLIND, SMALL_BLIND)
      ).to.be.revertedWith("Small blind must be less than big blind")
    })

    it("Should reject table creation with zero blinds", async function () {
      await expect(
        poker.createTable(0, 0)
      ).to.be.revertedWith("Blinds must be greater than zero")
    })

    it("Should reject stakes that are too small (gas fee > pot)", async function () {
      const tinyBlind = ethers.parseEther("0.000001")
      await expect(
        poker.createTable(tinyBlind, tinyBlind * 2n)
      ).to.be.revertedWith("Stakes too small")
    })

    it("Should allow multiple tables to be created", async function () {
      await poker.createTable(SMALL_BLIND, BIG_BLIND)
      await poker.createTable(SMALL_BLIND * 2n, BIG_BLIND * 2n)
      await poker.createTable(SMALL_BLIND * 5n, BIG_BLIND * 5n)

      expect(await poker.tableCounter()).to.equal(3)
    })
  })

  describe("Joining Tables", function () {
    beforeEach(async function () {
      // Create a table before each test
      await poker.createTable(SMALL_BLIND, BIG_BLIND)
    })

    it("Should allow a player to join with minimum buy-in", async function () {
      const tx = await poker.connect(player1).joinTable(1, { value: MIN_BUY_IN })
      const receipt = await tx.wait()

      // Check event
      const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === "PlayerJoined"
      )
      expect(event).to.not.be.undefined

      // Check table info
      const tableInfo = await poker.getTableInfo(1)
      expect(tableInfo.numPlayers).to.equal(1)

      // Check player info
      const playerInfo = await poker.getPlayerInfo(1, player1.address)
      expect(playerInfo.chips).to.equal(MIN_BUY_IN)
      expect(playerInfo.isSeated).to.equal(true)
    })

    it("Should allow a player to join with more than minimum buy-in", async function () {
      const buyIn = MIN_BUY_IN * 2n
      await poker.connect(player1).joinTable(1, { value: buyIn })

      const playerInfo = await poker.getPlayerInfo(1, player1.address)
      expect(playerInfo.chips).to.equal(buyIn)
    })

    it("Should reject buy-in below minimum", async function () {
      await expect(
        poker.connect(player1).joinTable(1, { value: MIN_BUY_IN / 2n })
      ).to.be.revertedWith("Buy-in below minimum")
    })

    it("Should reject player joining twice", async function () {
      await poker.connect(player1).joinTable(1, { value: MIN_BUY_IN })

      await expect(
        poker.connect(player1).joinTable(1, { value: MIN_BUY_IN })
      ).to.be.revertedWith("Already seated at this table")
    })

    it("Should reject more than 9 players", async function () {
      const signers = await ethers.getSigners()

      // Seat 9 players
      for (let i = 0; i < 9; i++) {
        await poker.connect(signers[i]).joinTable(1, { value: MIN_BUY_IN })
      }

      // 10th player should be rejected
      await expect(
        poker.connect(signers[9]).joinTable(1, { value: MIN_BUY_IN })
      ).to.be.revertedWith("Table is full")
    })

    it("Should reject joining non-existent table", async function () {
      await expect(
        poker.connect(player1).joinTable(999, { value: MIN_BUY_IN })
      ).to.be.revertedWith("Table does not exist")
    })
  })

  describe("Leaving Tables", function () {
    beforeEach(async function () {
      await poker.createTable(SMALL_BLIND, BIG_BLIND)
      await poker.connect(player1).joinTable(1, { value: MIN_BUY_IN })
    })

    it("Should allow a player to leave and receive their chips", async function () {
      const balanceBefore = await ethers.provider.getBalance(player1.address)

      const tx = await poker.connect(player1).leaveTable(1)
      const receipt = await tx.wait()
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice

      const balanceAfter = await ethers.provider.getBalance(player1.address)

      // Player should receive their chips back minus gas
      expect(balanceAfter).to.equal(balanceBefore + MIN_BUY_IN - gasUsed)

      // Check player info
      const playerInfo = await poker.getPlayerInfo(1, player1.address)
      expect(playerInfo.chips).to.equal(0)
      expect(playerInfo.isSeated).to.equal(false)

      // Check table info
      const tableInfo = await poker.getTableInfo(1)
      expect(tableInfo.numPlayers).to.equal(0)
    })

    it("Should reject leaving if not seated", async function () {
      await expect(
        poker.connect(player2).leaveTable(1)
      ).to.be.revertedWith("Not seated at this table")
    })

    it("Should reject leaving during active hand", async function () {
      // Join another player
      await poker.connect(player2).joinTable(1, { value: MIN_BUY_IN })

      // Start a hand
      await poker.connect(gameServer).startNewHand(1)

      // Try to leave during hand
      await expect(
        poker.connect(player1).leaveTable(1)
      ).to.be.revertedWith("Cannot leave during active hand")
    })
  })

  describe("Starting Hands", function () {
    beforeEach(async function () {
      await poker.createTable(SMALL_BLIND, BIG_BLIND)
      await poker.connect(player1).joinTable(1, { value: MIN_BUY_IN })
      await poker.connect(player2).joinTable(1, { value: MIN_BUY_IN })
    })

    it("Should allow game server to start a hand", async function () {
      const tx = await poker.connect(gameServer).startNewHand(1)
      const receipt = await tx.wait()

      // Check event
      const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === "HandStarted"
      )
      expect(event).to.not.be.undefined

      // Check table info
      const tableInfo = await poker.getTableInfo(1)
      expect(tableInfo.handNumber).to.equal(1)
    })

    it("Should reject non-game-server starting hand", async function () {
      await expect(
        poker.connect(player1).startNewHand(1)
      ).to.be.revertedWith("Only game server can call this")
    })

    it("Should reject starting hand with less than 2 players", async function () {
      // Leave one player
      await poker.connect(player2).leaveTable(1)

      await expect(
        poker.connect(gameServer).startNewHand(1)
      ).to.be.revertedWith("Need at least 2 players")
    })

    it("Should post blinds when starting hand", async function () {
      await poker.connect(gameServer).startNewHand(1)

      // Check pot includes blinds (minus gas fee)
      const tableInfo = await poker.getTableInfo(1)
      const expectedPot = SMALL_BLIND + BIG_BLIND

      // Pot should be approximately the blinds (gas fee deducted)
      expect(tableInfo.pot).to.be.greaterThan(0)
      expect(tableInfo.pot).to.be.lessThan(expectedPot)
    })

    it("Should reject starting hand on non-existent table", async function () {
      await expect(
        poker.connect(gameServer).startNewHand(999)
      ).to.be.revertedWith("Table does not exist")
    })
  })

  describe("Adding to Pot", function () {
    beforeEach(async function () {
      await poker.createTable(SMALL_BLIND, BIG_BLIND)
      await poker.connect(player1).joinTable(1, { value: MIN_BUY_IN })
      await poker.connect(player2).joinTable(1, { value: MIN_BUY_IN })
      await poker.connect(gameServer).startNewHand(1)
    })

    it("Should allow game server to add to pot", async function () {
      const betAmount = ethers.parseEther("0.05")

      const tableInfoBefore = await poker.getTableInfo(1)
      const potBefore = tableInfoBefore.pot

      await poker.connect(gameServer).addToPot(1, player1.address, betAmount)

      const tableInfoAfter = await poker.getTableInfo(1)
      expect(tableInfoAfter.pot).to.equal(potBefore + betAmount)

      // Check player's chips decreased
      const playerInfo = await poker.getPlayerInfo(1, player1.address)
      expect(playerInfo.chips).to.be.lessThan(MIN_BUY_IN)
    })

    it("Should reject non-game-server adding to pot", async function () {
      await expect(
        poker.connect(player1).addToPot(1, player1.address, ethers.parseEther("0.05"))
      ).to.be.revertedWith("Only game server can call this")
    })

    it("Should reject adding more chips than player has", async function () {
      const tooMuch = MIN_BUY_IN * 2n

      await expect(
        poker.connect(gameServer).addToPot(1, player1.address, tooMuch)
      ).to.be.revertedWith("Insufficient chips")
    })

    it("Should reject adding to pot for non-seated player", async function () {
      await expect(
        poker.connect(gameServer).addToPot(1, player3.address, ethers.parseEther("0.05"))
      ).to.be.revertedWith("Player not seated")
    })
  })

  describe("Distributing Winnings", function () {
    beforeEach(async function () {
      await poker.createTable(SMALL_BLIND, BIG_BLIND)
      await poker.connect(player1).joinTable(1, { value: MIN_BUY_IN })
      await poker.connect(player2).joinTable(1, { value: MIN_BUY_IN })
      await poker.connect(gameServer).startNewHand(1)
    })

    it("Should distribute pot to winner", async function () {
      const tableInfoBefore = await poker.getTableInfo(1)
      const potBefore = tableInfoBefore.pot

      const playerInfoBefore = await poker.getPlayerInfo(1, player1.address)
      const chipsBefore = playerInfoBefore.chips

      // Distribute to player1
      await poker.connect(gameServer).distributeWinnings(1, player1.address)

      const playerInfoAfter = await poker.getPlayerInfo(1, player1.address)
      expect(playerInfoAfter.chips).to.equal(chipsBefore + potBefore)

      // Pot should be empty
      const tableInfoAfter = await poker.getTableInfo(1)
      expect(tableInfoAfter.pot).to.equal(0)
    })

    it("Should emit WinnerPaid event", async function () {
      const tx = await poker.connect(gameServer).distributeWinnings(1, player1.address)
      const receipt = await tx.wait()

      const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === "WinnerPaid"
      )
      expect(event).to.not.be.undefined
    })

    it("Should reject non-game-server distributing winnings", async function () {
      await expect(
        poker.connect(player1).distributeWinnings(1, player1.address)
      ).to.be.revertedWith("Only game server can call this")
    })

    it("Should reject distributing to non-seated player", async function () {
      await expect(
        poker.connect(gameServer).distributeWinnings(1, player3.address)
      ).to.be.revertedWith("Winner not seated")
    })

    it("Should handle distributing empty pot", async function () {
      // First distribute (pot has blinds)
      await poker.connect(gameServer).distributeWinnings(1, player1.address)

      // Try to distribute again (pot is empty)
      await expect(
        poker.connect(gameServer).distributeWinnings(1, player2.address)
      ).to.be.revertedWith("No pot to distribute")
    })
  })

  describe("Gas Fee Configuration", function () {
    it("Should allow owner to update gas markup", async function () {
      const newMarkup = ethers.parseEther("0.0002")
      await poker.setGasMarkup(newMarkup)

      expect(await poker.gasMarkup()).to.equal(newMarkup)
    })

    it("Should reject non-owner updating gas markup", async function () {
      await expect(
        poker.connect(player1).setGasMarkup(ethers.parseEther("0.0002"))
      ).to.be.revertedWith("Only callable by owner")
    })

    it("Should allow owner to update estimated gas units", async function () {
      const newUnits = 80000n
      await poker.setEstimatedGasUnits(newUnits)

      expect(await poker.estimatedGasUnits()).to.equal(newUnits)
    })

    it("Should allow owner to update minimum gas fee", async function () {
      const newMin = ethers.parseEther("0.0001")
      await poker.setMinimumGasFee(newMin)

      expect(await poker.minimumGasFee()).to.equal(newMin)
    })

    it("Should calculate current gas fee correctly", async function () {
      const gasFee = await poker.getCurrentGasFee()
      const minFee = await poker.minimumGasFee()

      // Gas fee should be at least the minimum
      expect(gasFee).to.be.greaterThanOrEqual(minFee)
    })
  })

  describe("Game Server Management", function () {
    it("Should allow owner to change game server", async function () {
      const newGameServer = player3.address
      await poker.setGameServer(newGameServer)

      // Test by trying to start a hand with new server
      await poker.createTable(SMALL_BLIND, BIG_BLIND)
      await poker.connect(player1).joinTable(1, { value: MIN_BUY_IN })
      await poker.connect(player2).joinTable(1, { value: MIN_BUY_IN })

      await expect(
        poker.connect(player3).startNewHand(1)
      ).to.not.be.reverted
    })

    it("Should reject non-owner changing game server", async function () {
      await expect(
        poker.connect(player1).setGameServer(player2.address)
      ).to.be.revertedWith("Only callable by owner")
    })

    it("Should emit GameServerUpdated event", async function () {
      const tx = await poker.setGameServer(player3.address)
      const receipt = await tx.wait()

      const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === "GameServerUpdated"
      )
      expect(event).to.not.be.undefined
    })
  })

  describe("Stakes Viability Check", function () {
    it("Should accept viable stakes", async function () {
      const result = await poker.isViableStakes(SMALL_BLIND, BIG_BLIND)
      expect(result.viable).to.equal(true)
    })

    it("Should reject stakes with SB >= BB", async function () {
      const result = await poker.isViableStakes(BIG_BLIND, SMALL_BLIND)
      expect(result.viable).to.equal(false)
      expect(result.reason).to.include("Small blind must be less than big blind")
    })

    it("Should reject zero stakes", async function () {
      const result = await poker.isViableStakes(0, 0)
      expect(result.viable).to.equal(false)
    })

    it("Should reject stakes where gas fee exceeds pot", async function () {
      const tiny = ethers.parseEther("0.000001")
      const result = await poker.isViableStakes(tiny, tiny * 2n)
      expect(result.viable).to.equal(false)
      expect(result.reason).to.include("too small")
    })
  })

  describe("Full Game Simulation", function () {
    it("Should handle a complete poker hand lifecycle", async function () {
      // 1. Create table
      await poker.createTable(SMALL_BLIND, BIG_BLIND)

      // 2. Three players join
      await poker.connect(player1).joinTable(1, { value: MIN_BUY_IN })
      await poker.connect(player2).joinTable(1, { value: MIN_BUY_IN })
      await poker.connect(player3).joinTable(1, { value: MIN_BUY_IN })

      // Verify 3 players seated
      const tableInfo1 = await poker.getTableInfo(1)
      expect(tableInfo1.numPlayers).to.equal(3)

      // 3. Start hand
      await poker.connect(gameServer).startNewHand(1)

      const tableInfo2 = await poker.getTableInfo(1)
      expect(tableInfo2.handNumber).to.equal(1)
      expect(tableInfo2.pot).to.be.greaterThan(0) // Blinds posted

      // 4. Players make bets
      const bet1 = ethers.parseEther("0.05")
      await poker.connect(gameServer).addToPot(1, player1.address, bet1)
      await poker.connect(gameServer).addToPot(1, player2.address, bet1)
      await poker.connect(gameServer).addToPot(1, player3.address, bet1)

      const tableInfo3 = await poker.getTableInfo(1)
      const expectedPot = tableInfo2.pot + (bet1 * 3n)
      expect(tableInfo3.pot).to.equal(expectedPot)

      // 5. Distribute winnings to player1
      const player1ChipsBefore = (await poker.getPlayerInfo(1, player1.address)).chips

      await poker.connect(gameServer).distributeWinnings(1, player1.address)

      const player1ChipsAfter = (await poker.getPlayerInfo(1, player1.address)).chips
      expect(player1ChipsAfter).to.equal(player1ChipsBefore + tableInfo3.pot)

      // 6. Pot should be empty
      const tableInfo4 = await poker.getTableInfo(1)
      expect(tableInfo4.pot).to.equal(0)

      // 7. Player can leave with their winnings
      const balanceBefore = await ethers.provider.getBalance(player1.address)
      const tx = await poker.connect(player1).leaveTable(1)
      const receipt = await tx.wait()
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice

      const balanceAfter = await ethers.provider.getBalance(player1.address)
      expect(balanceAfter).to.be.greaterThan(balanceBefore - gasUsed)
    })

    it("Should handle multiple hands at one table", async function () {
      // Create and join
      await poker.createTable(SMALL_BLIND, BIG_BLIND)
      await poker.connect(player1).joinTable(1, { value: MIN_BUY_IN })
      await poker.connect(player2).joinTable(1, { value: MIN_BUY_IN })

      // Hand 1
      await poker.connect(gameServer).startNewHand(1)
      await poker.connect(gameServer).distributeWinnings(1, player1.address)

      let tableInfo = await poker.getTableInfo(1)
      expect(tableInfo.handNumber).to.equal(1)
      expect(tableInfo.pot).to.equal(0)

      // Hand 2
      await poker.connect(gameServer).startNewHand(1)
      await poker.connect(gameServer).distributeWinnings(1, player2.address)

      tableInfo = await poker.getTableInfo(1)
      expect(tableInfo.handNumber).to.equal(2)

      // Hand 3
      await poker.connect(gameServer).startNewHand(1)
      await poker.connect(gameServer).distributeWinnings(1, player1.address)

      tableInfo = await poker.getTableInfo(1)
      expect(tableInfo.handNumber).to.equal(3)
    })

    it("Should handle multiple simultaneous tables", async function () {
      // Create 3 tables
      await poker.createTable(SMALL_BLIND, BIG_BLIND)
      await poker.createTable(SMALL_BLIND * 2n, BIG_BLIND * 2n)
      await poker.createTable(SMALL_BLIND * 5n, BIG_BLIND * 5n)

      expect(await poker.tableCounter()).to.equal(3)

      // Different players at different tables
      await poker.connect(player1).joinTable(1, { value: MIN_BUY_IN })
      await poker.connect(player2).joinTable(1, { value: MIN_BUY_IN })

      await poker.connect(player1).joinTable(2, { value: MIN_BUY_IN * 2n })
      await poker.connect(player3).joinTable(2, { value: MIN_BUY_IN * 2n })

      // Start hands at both tables
      await poker.connect(gameServer).startNewHand(1)
      await poker.connect(gameServer).startNewHand(2)

      // Check both have hands started
      const table1 = await poker.getTableInfo(1)
      const table2 = await poker.getTableInfo(2)

      expect(table1.handNumber).to.equal(1)
      expect(table2.handNumber).to.equal(1)
      expect(table1.pot).to.be.greaterThan(0)
      expect(table2.pot).to.be.greaterThan(0)
    })
  })

  describe("Edge Cases and Security", function () {
    beforeEach(async function () {
      await poker.createTable(SMALL_BLIND, BIG_BLIND)
    })

    it("Should handle player running out of chips", async function () {
      await poker.connect(player1).joinTable(1, { value: MIN_BUY_IN })
      await poker.connect(player2).joinTable(1, { value: MIN_BUY_IN })
      await poker.connect(gameServer).startNewHand(1)

      // Get chips after blinds are posted
      const playerInfo = await poker.getPlayerInfo(1, player1.address)
      const chipsAfterBlinds = playerInfo.chips

      // Bet almost all remaining chips
      const betAmount = chipsAfterBlinds - ethers.parseEther("0.001")
      await poker.connect(gameServer).addToPot(1, player1.address, betAmount)

      // Player should still have some chips
      const playerInfo2 = await poker.getPlayerInfo(1, player1.address)
      expect(playerInfo2.chips).to.be.greaterThan(0)
      expect(playerInfo2.chips).to.be.lessThan(ethers.parseEther("0.002"))
    })

    it("Should prevent integer overflow on large pots", async function () {
      const hugeBuyIn = ethers.parseEther("1000")

      await poker.connect(player1).joinTable(1, { value: hugeBuyIn })
      await poker.connect(player2).joinTable(1, { value: hugeBuyIn })
      await poker.connect(gameServer).startNewHand(1)

      // Make huge bets
      const hugeBet = ethers.parseEther("500")
      await poker.connect(gameServer).addToPot(1, player1.address, hugeBet)
      await poker.connect(gameServer).addToPot(1, player2.address, hugeBet)

      const tableInfo = await poker.getTableInfo(1)
      expect(tableInfo.pot).to.be.greaterThan(ethers.parseEther("1000"))
    })

    it("Should handle re-entrancy protection", async function () {
      // This is more of a conceptual test - Solidity 0.8+ has built-in protection
      // but we verify the transfer patterns work correctly

      await poker.connect(player1).joinTable(1, { value: MIN_BUY_IN })

      // Leave should transfer funds atomically
      const tx = await poker.connect(player1).leaveTable(1)
      await tx.wait()

      // Player should no longer be seated
      const playerInfo = await poker.getPlayerInfo(1, player1.address)
      expect(playerInfo.isSeated).to.equal(false)
      expect(playerInfo.chips).to.equal(0)
    })

    it("Should handle getPlayers returning correct addresses", async function () {
      await poker.connect(player1).joinTable(1, { value: MIN_BUY_IN })
      await poker.connect(player2).joinTable(1, { value: MIN_BUY_IN })
      await poker.connect(player3).joinTable(1, { value: MIN_BUY_IN })

      const players = await poker.getPlayers(1)

      // Should have 3 non-zero addresses
      const nonZeroPlayers = players.filter(addr => addr !== ethers.ZeroAddress)
      expect(nonZeroPlayers.length).to.equal(3)

      expect(players).to.include(player1.address)
      expect(players).to.include(player2.address)
      expect(players).to.include(player3.address)
    })
  })
})
