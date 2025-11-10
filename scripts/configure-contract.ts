import hre from "hardhat"
const { ethers } = hre

/**
 * Configure the deployed PokerFlatGasFee contract
 * Run with: npx hardhat run scripts/configure-contract.ts --network baseSepolia
 */
async function main() {
  console.log("🔧 Configuring PokerFlatGasFee contract...")

  // Get the contract address from environment
  const contractAddress = process.env.NEXT_PUBLIC_POKER_CONTRACT_ADDRESS
  if (!contractAddress) {
    throw new Error("NEXT_PUBLIC_POKER_CONTRACT_ADDRESS not set in .env")
  }

  console.log("Contract address:", contractAddress)

  // Get the signer
  const [deployer] = await ethers.getSigners()
  console.log("Configuring with account:", deployer.address)

  // Attach to deployed contract
  const PokerFlatGasFee = await ethers.getContractFactory("PokerFlatGasFee")
  const poker = PokerFlatGasFee.attach(contractAddress)

  console.log("\n📋 Current Configuration:")
  console.log("========================")

  // Check current config
  const vrfSubId = await poker.vrfSubscriptionId()
  const vrfKeyHash = await poker.vrfKeyHash()
  const gameServer = await poker.gameServer()

  console.log("VRF Subscription ID:", vrfSubId.toString())
  console.log("VRF Key Hash:", vrfKeyHash)
  console.log("Game Server:", gameServer)

  // Configuration values from environment
  const VRF_SUBSCRIPTION_ID = process.env.VRF_SUBSCRIPTION_ID
  const VRF_KEY_HASH = process.env.VRF_KEY_HASH
  const LINK_ETH_PRICE_FEED = process.env.LINK_ETH_PRICE_FEED

  if (!VRF_SUBSCRIPTION_ID || !VRF_KEY_HASH || !LINK_ETH_PRICE_FEED) {
    throw new Error("Missing VRF configuration in .env")
  }

  console.log("\n⚙️  Applying Configuration...")
  console.log("============================")

  // 1. Configure VRF
  if (vrfSubId.toString() === "0") {
    console.log("\n1️⃣  Configuring Chainlink VRF...")
    const tx1 = await poker.configureVRF(VRF_SUBSCRIPTION_ID, VRF_KEY_HASH)
    await tx1.wait()
    console.log("✅ VRF configured")
  } else {
    console.log("✅ VRF already configured")
  }

  // 2. Set LINK/ETH price feed
  console.log("\n2️⃣  Setting LINK/ETH price feed...")
  const currentPriceFeed = await poker.linkEthPriceFeed()
  if (currentPriceFeed === ethers.ZeroAddress) {
    const tx2 = await poker.setLinkEthPriceFeed(LINK_ETH_PRICE_FEED)
    await tx2.wait()
    console.log("✅ Price feed set:", LINK_ETH_PRICE_FEED)
  } else {
    console.log("✅ Price feed already set:", currentPriceFeed)
  }

  // 3. Set game server (use deployer for now)
  console.log("\n3️⃣  Setting game server...")
  if (gameServer === ethers.ZeroAddress) {
    console.log("Setting game server to:", deployer.address)
    const tx3 = await poker.setGameServer(deployer.address)
    await tx3.wait()
    console.log("✅ Game server set")
  } else {
    console.log("✅ Game server already set:", gameServer)
  }

  // Display final configuration
  console.log("\n✅ Configuration Complete!")
  console.log("==========================")
  console.log("\n📊 Final Configuration:")
  const finalSubId = await poker.vrfSubscriptionId()
  const finalKeyHash = await poker.vrfKeyHash()
  const finalGameServer = await poker.gameServer()
  const finalPriceFeed = await poker.linkEthPriceFeed()

  console.log("  VRF Subscription ID:", finalSubId.toString())
  console.log("  VRF Key Hash:", finalKeyHash)
  console.log("  Game Server:", finalGameServer)
  console.log("  LINK/ETH Price Feed:", finalPriceFeed)

  console.log("\n🚨 IMPORTANT: Add contract as VRF consumer!")
  console.log("===========================================")
  console.log("1. Go to: https://vrf.chain.link/base-sepolia")
  console.log("2. Click your subscription #" + finalSubId.toString())
  console.log("3. Click 'Add Consumer'")
  console.log("4. Paste contract address:", contractAddress)
  console.log("5. Confirm transaction")

  console.log("\n✅ Configuration script complete!")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
