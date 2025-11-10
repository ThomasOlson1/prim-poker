import hre from "hardhat"

const { ethers } = hre

async function main() {
  console.log("🎲 Deploying PokerFlatGasFee contract...")

  // Debug: Check if PRIVATE_KEY is loaded
  console.log("PRIVATE_KEY loaded:", process.env.PRIVATE_KEY ? "✅ Yes" : "❌ No")

  // Get deployer account
  const signers = await ethers.getSigners()
  console.log("Number of signers:", signers.length)

  if (signers.length === 0) {
    throw new Error("No signers available. Check your PRIVATE_KEY in .env file.")
  }

  const [deployer] = signers
  console.log("Deploying with account:", deployer.address)

  // Get balance
  const balance = await ethers.provider.getBalance(deployer.address)
  console.log("Account balance:", ethers.formatEther(balance), "ETH")

  // VRF Coordinator address from environment
  const VRF_COORDINATOR = process.env.VRF_COORDINATOR || "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE"
  console.log("VRF Coordinator:", VRF_COORDINATOR)

  // Deploy contract with VRF Coordinator
  const PokerFlatGasFee = await ethers.getContractFactory("PokerFlatGasFee")
  const poker = await PokerFlatGasFee.deploy(VRF_COORDINATOR)

  await poker.waitForDeployment()
  const address = await poker.getAddress()

  console.log("✅ PokerFlatGasFee deployed to:", address)

  // Verify dynamic gas fee configuration
  const estimatedGasUnits = await poker.estimatedGasUnits()
  const gasMarkup = await poker.gasMarkup()
  const minimumGasFee = await poker.minimumGasFee()
  const currentGasFee = await poker.getCurrentGasFee()

  console.log("\n⚙️  Gas Fee Configuration:")
  console.log("- Estimated gas units:", estimatedGasUnits.toString())
  console.log("- Gas markup:", ethers.formatEther(gasMarkup), "ETH (~$0.20 buffer)")
  console.log("- Minimum fee:", ethers.formatEther(minimumGasFee), "ETH")
  console.log("- Current calculated fee:", ethers.formatEther(currentGasFee), "ETH")

  // Create a test table
  console.log("\n🎰 Creating test table...")
  const smallBlind = ethers.parseEther("0.005") // $5 at $1000 ETH
  const bigBlind = ethers.parseEther("0.01")    // $10 at $1000 ETH

  const createTx = await poker.createTable(smallBlind, bigBlind)
  await createTx.wait()

  console.log("✅ Test table created")
  console.log("Small blind:", ethers.formatEther(smallBlind), "ETH")
  console.log("Big blind:", ethers.formatEther(bigBlind), "ETH")

  // Get table info
  const tableInfo = await poker.getTableInfo(0)
  console.log("\n📊 Table 0 Info:")
  console.log("- Small blind:", ethers.formatEther(tableInfo.smallBlind), "ETH")
  console.log("- Big blind:", ethers.formatEther(tableInfo.bigBlind), "ETH")
  console.log("- Min buy-in:", ethers.formatEther(tableInfo.minBuyIn), "ETH")
  console.log("- Players:", tableInfo.numPlayers.toString())
  console.log("- Active:", tableInfo.isActive)

  // Test stake viability
  console.log("\n✅ Testing stake viability...")
  const [viable, reason] = await poker.isViableStakes(smallBlind, bigBlind)
  console.log("- Stakes viable:", viable)
  console.log("- Reason:", reason)

  // Calculate effective rake
  const totalBlinds = smallBlind + bigBlind
  const toPot = totalBlinds - currentGasFee
  const effectiveRake = (currentGasFee * 100n) / toPot
  console.log("\n💰 Fee Analysis:")
  console.log("- Total blinds:", ethers.formatEther(totalBlinds), "ETH")
  console.log("- Gas fee:", ethers.formatEther(currentGasFee), "ETH")
  console.log("- To pot:", ethers.formatEther(toPot), "ETH")
  console.log("- Effective rake:", effectiveRake.toString() + "%")

  console.log("\n🎉 Deployment complete!")
  console.log("\n📝 Save this contract address to your .env file:")
  console.log(`NEXT_PUBLIC_POKER_CONTRACT_ADDRESS=${address}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
