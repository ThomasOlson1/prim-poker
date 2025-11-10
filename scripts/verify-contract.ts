import hre from "hardhat"

/**
 * Verify the deployed PokerFlatGasFee contract on BaseScan
 * Run with: npx hardhat run scripts/verify-contract.ts --network baseSepolia
 */
async function main() {
  console.log("🔍 Verifying PokerFlatGasFee contract on BaseScan...")

  // Get the contract address from environment
  const contractAddress = process.env.NEXT_PUBLIC_POKER_CONTRACT_ADDRESS
  if (!contractAddress) {
    throw new Error("NEXT_PUBLIC_POKER_CONTRACT_ADDRESS not set in .env")
  }

  console.log("Contract address:", contractAddress)

  // VRF Coordinator address on Base Sepolia
  const VRF_COORDINATOR = process.env.VRF_COORDINATOR || "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE"

  console.log("Constructor args:")
  console.log("  vrfCoordinator:", VRF_COORDINATOR)

  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [VRF_COORDINATOR],
    })

    console.log("\n✅ Contract verified successfully!")
    console.log(`View on BaseScan: https://sepolia.basescan.org/address/${contractAddress}#code`)
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("\n✅ Contract is already verified!")
      console.log(`View on BaseScan: https://sepolia.basescan.org/address/${contractAddress}#code`)
    } else {
      console.error("\n❌ Verification failed:", error.message)
      throw error
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
