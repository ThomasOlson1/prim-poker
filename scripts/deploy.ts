import { ethers } from "hardhat"

async function main() {
  console.log("🎲 Deploying PokerFlatGasFee contract...")

  // Get deployer account
  const [deployer] = await ethers.getSigners()
  console.log("Deploying with account:", deployer.address)

  // Get balance
  const balance = await ethers.provider.getBalance(deployer.address)
  console.log("Account balance:", ethers.formatEther(balance), "ETH")

  // Deploy contract
  const PokerFlatGasFee = await ethers.getContractFactory("PokerFlatGasFee")
  const poker = await PokerFlatGasFee.deploy()

  await poker.waitForDeployment()
  const address = await poker.getAddress()

  console.log("✅ PokerFlatGasFee deployed to:", address)

  // Verify gas fee
  const gasFee = await poker.GAS_FEE()
  console.log("Gas fee:", ethers.formatEther(gasFee), "ETH")

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
