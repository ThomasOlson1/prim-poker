import { expect } from "chai"
import { ethers } from "hardhat"
import { PokerFlatGasFee } from "../typechain-types"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"

describe("PokerFlatGasFee - Security & Edge Cases", function () {
  let poker: PokerFlatGasFee
  let owner: SignerWithAddress
  let gameServer: SignerWithAddress
  let player1: SignerWithAddress
  let player2: SignerWithAddress
  let vrfCoordinator: SignerWithAddress

  const SMALL_BLIND = ethers.parseEther("0.001")
  const BIG_BLIND = ethers.parseEther("0.002")
  const MIN_BUY_IN = BIG_BLIND * 50n

  beforeEach(async function () {
    [owner, gameServer, player1, player2, vrfCoordinator] = await ethers.getSigners()

    const PokerFactory = await ethers.getContractFactory("PokerFlatGasFee")
    poker = await PokerFactory.deploy(vrfCoordinator.address)
    await poker.setGameServer(gameServer.address)
  })

  describe("CRITICAL: fulfillRandomWords Logic Bug", function () {
    it("Should reject VRF fulfillment for inactive table", async function () {
      // Create a table
      await poker.createTable(SMALL_BLIND, BIG_BLIND)

      // Simulate VRF callback with wrong tableId (inactive table)
      // This should fail, but the current OR logic might allow it to pass
      // Note: We can't actually call fulfillRandomWords from outside as it's internal
      // This test documents the bug - actual fix needed in contract

      console.log("⚠️  WARNING: Cannot test fulfillRandomWords externally")
      console.log("⚠️  Line 270 has logic error: || should be &&")
      console.log("⚠️  require(tableId != 0 || tables[tableId].isActive)")
      console.log("⚠️  Should be: require(tableId != 0 && tables[tableId].isActive)")
    })
  })

  describe("HIGH: Blind Players Running Out of Chips", function () {
    it("Should handle when blind players have exactly blind amounts", async function () {
      // Create table
      await poker.createTable(SMALL_BLIND, BIG_BLIND)

      // Players join with exactly the blind amounts
      await poker.connect(player1).joinTable(1, { value: SMALL_BLIND })
      await poker.connect(player2).joinTable(1, { value: BIG_BLIND })

      // Try to start hand - this should work but leaves players with 0 chips
      await expect(
        poker.connect(gameServer).startNewHand(1)
      ).to.not.be.reverted

      // Check player chips after hand starts
      const p1Info = await poker.getPlayerInfo(1, player1.address)
      const p2Info = await poker.getPlayerInfo(1, player2.address)

      console.log("Player 1 chips after posting SB:", ethers.formatEther(p1Info.chips))
      console.log("Player 2 chips after posting BB:", ethers.formatEther(p2Info.chips))

      // Players now have 0 chips but are still seated - problematic!
      expect(p1Info.chips).to.equal(0)
      expect(p2Info.chips).to.equal(0)
      expect(p1Info.isSeated).to.be.true
      expect(p2Info.isSeated).to.be.true
    })

    it("Should fail to start second hand when players have 0 chips", async function () {
      await poker.createTable(SMALL_BLIND, BIG_BLIND)
      await poker.connect(player1).joinTable(1, { value: SMALL_BLIND })
      await poker.connect(player2).joinTable(1, { value: BIG_BLIND })

      await poker.connect(gameServer).startNewHand(1)

      // Distribute pot to someone (doesn't matter who)
      await poker.connect(gameServer).distributeWinnings(1, player1.address)

      // Try to start another hand - should fail since players have no chips
      await expect(
        poker.connect(gameServer).startNewHand(1)
      ).to.be.revertedWith("Small blind has insufficient chips")
    })
  })

  describe("MEDIUM: Stuck Funds Scenarios", function () {
    it("Should leave pot stuck if hand never completes", async function () {
      await poker.createTable(SMALL_BLIND, BIG_BLIND)
      await poker.connect(player1).joinTable(1, { value: MIN_BUY_IN })
      await poker.connect(player2).joinTable(1, { value: MIN_BUY_IN })

      await poker.connect(gameServer).startNewHand(1)

      const tableInfo = await poker.getTableInfo(1)
      expect(tableInfo.pot).to.be.greaterThan(0)

      // Now pot is stuck - players can't leave during active hand
      await expect(
        poker.connect(player1).leaveTable(1)
      ).to.be.revertedWith("Cannot leave during active hand")

      // No timeout mechanism - funds stuck forever if game server fails
      console.log("⚠️  WARNING: No timeout mechanism for stuck hands")
      console.log("⚠️  If game server fails, funds are locked forever")
    })
  })

  describe("MEDIUM: No Maximum Buy-in", function () {
    it("Should allow unlimited buy-in", async function () {
      await poker.createTable(SMALL_BLIND, BIG_BLIND)

      const hugeBuyIn = ethers.parseEther("1000000") // 1 million ETH

      // This succeeds - no maximum limit
      await expect(
        poker.connect(player1).joinTable(1, { value: hugeBuyIn })
      ).to.not.be.reverted

      const playerInfo = await poker.getPlayerInfo(1, player1.address)
      expect(playerInfo.chips).to.equal(hugeBuyIn)

      console.log("⚠️  WARNING: No maximum buy-in limit")
      console.log("⚠️  Players can risk unlimited funds")
    })
  })

  describe("LOW: Table Spam Prevention", function () {
    it("Should allow creating many tables without cost", async function () {
      // Create 100 tables - no cost, no rate limit
      for (let i = 0; i < 100; i++) {
        await poker.createTable(SMALL_BLIND, BIG_BLIND)
      }

      expect(await poker.tableCounter()).to.equal(100)

      console.log("⚠️  WARNING: No table creation cost or rate limit")
      console.log("⚠️  Vulnerable to storage DOS attacks")
    })
  })

  describe("MEDIUM: No Table Deactivation", function () {
    it("Should not allow deactivating empty tables", async function () {
      await poker.createTable(SMALL_BLIND, BIG_BLIND)

      // No function exists to deactivate a table
      console.log("⚠️  WARNING: No way to deactivate/cleanup tables")
      console.log("⚠️  Tables exist forever, consuming storage")

      const tableInfo = await poker.getTableInfo(1)
      expect(tableInfo.isActive).to.be.true
    })
  })

  describe("LOW: No Blind Rotation", function () {
    it("Should always use same players as blinds", async function () {
      await poker.createTable(SMALL_BLIND, BIG_BLIND)
      await poker.connect(player1).joinTable(1, { value: MIN_BUY_IN })
      await poker.connect(player2).joinTable(1, { value: MIN_BUY_IN })

      // Start first hand
      await poker.connect(gameServer).startNewHand(1)
      let p1Chips1 = (await poker.getPlayerInfo(1, player1.address)).chips
      let p2Chips1 = (await poker.getPlayerInfo(1, player2.address)).chips

      // Complete hand
      await poker.connect(gameServer).distributeWinnings(1, player1.address)

      // Start second hand - same players pay blinds again
      await poker.connect(gameServer).startNewHand(1)
      let p1Chips2 = (await poker.getPlayerInfo(1, player1.address)).chips
      let p2Chips2 = (await poker.getPlayerInfo(1, player2.address)).chips

      // Player 1 paid SB twice, Player 2 paid BB twice (unfair)
      console.log("⚠️  WARNING: No blind rotation mechanism")
      console.log("⚠️  Same players always pay blinds (unfair)")

      expect(p1Chips1 - p1Chips2).to.equal(SMALL_BLIND) // Paid SB again
    })
  })

  describe("MEDIUM: Large Value Overflow Tests", function () {
    it("Should handle very large pots without overflow", async function () {
      await poker.createTable(SMALL_BLIND, BIG_BLIND)

      const massiveBuyIn = ethers.parseEther("100000")
      await poker.connect(player1).joinTable(1, { value: massiveBuyIn })
      await poker.connect(player2).joinTable(1, { value: massiveBuyIn })

      await poker.connect(gameServer).startNewHand(1)

      // Add massive amount to pot
      const hugeBet = ethers.parseEther("50000")
      await expect(
        poker.connect(gameServer).addToPot(1, player1.address, hugeBet)
      ).to.not.be.reverted

      const tableInfo = await poker.getTableInfo(1)
      expect(tableInfo.pot).to.be.greaterThan(ethers.parseEther("100000"))
    })

    it("Should check isViableStakes with large values", async function () {
      const hugeBlind = ethers.parseEther("1000000")

      // This tests the toPot * 100 calculation on line 577
      const [viable] = await poker.isViableStakes(hugeBlind / 2n, hugeBlind)
      expect(viable).to.be.true

      console.log("✅ Large value calculations work correctly")
    })
  })

  describe("Transfer Method Safety", function () {
    it("Documents .transfer() usage risks", async function () {
      console.log("⚠️  WARNING: Contract uses .transfer() instead of .call{}")
      console.log("⚠️  Locations: lines 372, 425, 666")
      console.log("⚠️  Risk: Fails if recipient is contract with expensive receive")
      console.log("⚠️  Recommendation: Use .call{value: amount}('') instead")
    })
  })
})
