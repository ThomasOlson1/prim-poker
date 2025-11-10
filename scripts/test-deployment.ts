import hre from "hardhat"
const { ethers } = hre

/**
 * Test the deployed PokerFlatGasFee contract
 * Run with: npx hardhat run scripts/test-deployment.ts --network baseSepolia
 */
async function main() {
  console.log("🧪 Testing deployed PokerFlatGasFee contract...")

  // Get the contract address from environment
  const contractAddress = process.env.NEXT_PUBLIC_POKER_CONTRACT_ADDRESS
  if (!contractAddress) {
    throw new Error("NEXT_PUBLIC_POKER_CONTRACT_ADDRESS not set in .env")
  }

  console.log("Contract address:", contractAddress)

  // Get the signer
  const [deployer] = await ethers.getSigners()
  console.log("Testing with account:", deployer.address)

  // Get balance
  const balance = await ethers.provider.getBalance(deployer.address)
  console.log("Account balance:", ethers.formatEther(balance), "ETH")

  // Attach to deployed contract
  const PokerFlatGasFee = await ethers.getContractFactory("PokerFlatGasFee")
  const poker = PokerFlatGasFee.attach(contractAddress)

  console.log("\n📊 Contract Status")
  console.log("==================")

  // Check configuration
  const vrfSubId = await poker.vrfSubscriptionId()
  const owner = await poker.owner()
  const gameServer = await poker.gameServer()
  const tableCounter = await poker.tableCounter()

  console.log("Owner:", owner)
  console.log("Game Server:", gameServer)
  console.log("VRF Subscription:", vrfSubId.toString())
  console.log("Tables Created:", tableCounter.toString())

  // Check gas fee calculation
  const currentGasFee = await poker.getCurrentGasFee()
  const minimumFee = await poker.minimumGasFee()
  const gasMarkup = await poker.gasMarkup()

  console.log("\n💰 Gas Fee Configuration")
  console.log("========================")
  console.log("Current gas fee:", ethers.formatEther(currentGasFee), "ETH")
  console.log("Minimum fee:", ethers.formatEther(minimumFee), "ETH")
  console.log("Gas markup:", ethers.formatEther(gasMarkup), "ETH")

  // Test stake viability
  console.log("\n✅ Testing Stake Viability")
  console.log("==========================")

  const testStakes = [
    { sb: ethers.parseEther("0.001"), bb: ethers.parseEther("0.002"), name: "$1/$2" },
    { sb: ethers.parseEther("0.005"), bb: ethers.parseEther("0.01"), name: "$5/$10" },
    { sb: ethers.parseEther("0.01"), bb: ethers.parseEther("0.02"), name: "$10/$20" },
  ]

  for (const { sb, bb, name } of testStakes) {
    const [viable, reason] = await poker.isViableStakes(sb, bb)
    const totalBlinds = sb + bb
    const toPot = totalBlinds - currentGasFee
    const effectiveRake = totalBlinds > currentGasFee
      ? (currentGasFee * 100n) / toPot
      : 0n

    console.log(`\n${name} stakes:`)
    console.log(`  Viable: ${viable ? "✅ Yes" : "❌ No"}`)
    console.log(`  Reason: ${reason}`)
    if (viable) {
      console.log(`  Effective rake: ${effectiveRake}%`)
    }
  }

  // Try creating a test table (if game server is set)
  if (gameServer !== ethers.ZeroAddress) {
    console.log("\n🎲 Creating Test Table")
    console.log("======================")

    const smallBlind = ethers.parseEther("0.005")
    const bigBlind = ethers.parseEther("0.01")

    try {
      console.log("Creating table with $5/$10 blinds...")
      const tx = await poker.createTable(smallBlind, bigBlind)
      const receipt = await tx.wait()

      console.log("✅ Test table created!")
      console.log("Transaction hash:", receipt?.hash)

      const newTableCount = await poker.tableCounter()
      console.log("Total tables:", newTableCount.toString())

      // Get table info
      const tableInfo = await poker.getTableInfo(newTableCount)
      console.log("\nTable Info:")
      console.log("  Small blind:", ethers.formatEther(tableInfo.smallBlind), "ETH")
      console.log("  Big blind:", ethers.formatEther(tableInfo.bigBlind), "ETH")
      console.log("  Min buy-in:", ethers.formatEther(tableInfo.minBuyIn), "ETH")
      console.log("  Active:", tableInfo.isActive)
    } catch (error: any) {
      console.error("❌ Failed to create table:", error.message)
    }
  } else {
    console.log("\n⚠️  Game server not set - skipping table creation test")
  }

  console.log("\n✅ Deployment test complete!")
  console.log("\n🔗 View contract on BaseScan:")
  console.log(`https://sepolia.basescan.org/address/${contractAddress}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
