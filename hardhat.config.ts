import { HardhatUserConfig } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox"
import { config as dotenvConfig } from "dotenv"

// Load environment variables
dotenvConfig()

// Helper function to get accounts configuration
// Supports both private key and mnemonic (12-word seed phrase)
function getAccounts() {
  // Option 1: Use mnemonic (12-word seed phrase)
  const mnemonic = process.env.MNEMONIC?.trim()
  if (mnemonic) {
    return {
      mnemonic: mnemonic,
      path: "m/44'/60'/0'/0", // Standard Ethereum derivation path
      initialIndex: 0,
      count: 10, // Derive 10 accounts
    }
  }

  // Option 2: Use private key directly
  const key = process.env.PRIVATE_KEY?.trim()
  if (!key) return []

  // Remove 0x prefix if present, then ensure it has 0x prefix
  const cleanKey = key.startsWith('0x') ? key.slice(2) : key
  return [`0x${cleanKey}`]
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    // Base Mainnet
    base: {
      url: "https://mainnet.base.org",
      accounts: getAccounts(),
      chainId: 8453,
    },
    // Base Sepolia Testnet
    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: getAccounts(),
      chainId: 84532,
    },
    // Localhost
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },
  etherscan: {
    apiKey: {
      base: process.env.BASESCAN_API_KEY || "",
      baseSepolia: process.env.BASESCAN_API_KEY || "",
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
}

export default config
