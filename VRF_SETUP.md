# Chainlink VRF Integration Guide

## Overview

This poker game uses **Chainlink VRF (Verifiable Random Function)** to ensure provably fair, verifiable card shuffles. Each hand requests one random seed from Chainlink's decentralized oracle network, which is used to deterministically shuffle the deck.

## Security Benefits

✅ **Provably Random** - Chainlink VRF provides cryptographically secure randomness
✅ **Verifiable** - Anyone can verify the shuffle was fair using the VRF seed
✅ **Trustless** - No server can manipulate card order
✅ **Deterministic** - Same seed always produces same shuffle (auditable)
✅ **One Request Per Hand** - Cost-optimized (only one VRF call per hand)

## Cost Structure

Total fee per hand = **Gas Fee + VRF Fee + $0.20 Markup**

### Dynamic VRF Cost Calculation

The VRF cost is **dynamically calculated** using Chainlink's pricing formula:

```
Total Gas = Verification Gas + Callback Gas
Total Gas Cost (ETH) = Total Gas × Current Gas Price
Cost with Premium = Total Gas Cost × ((100 + Premium%) / 100)
VRF Cost in ETH = Cost with Premium / (LINK/ETH Price)
```

**Parameters:**
- **Verification Gas**: ~200,000 gas (Chainlink's VRF verification cost)
- **Callback Gas**: 100,000 gas (gas limit for `fulfillRandomWords`)
- **Premium**: 20% (Chainlink's network fee)
- **LINK/ETH Price**: Retrieved from Chainlink price oracle in real-time

### Example Calculation

At 20 gwei gas price with LINK/ETH = 0.005:
- Total Gas: 200,000 + 100,000 = 300,000 gas
- Gas Cost: 300,000 × 20 gwei = 0.006 ETH
- With Premium: 0.006 × 1.20 = 0.0072 ETH
- VRF Cost: 0.0072 / 0.005 = **0.00036 ETH**

**Total Fee Breakdown:**
- Base Gas: 60,000 × 20 gwei = 0.0012 ETH
- VRF: 0.00036 ETH (dynamically calculated)
- Markup: 0.0001 ETH
- **Total**: 0.00156 ETH (~$3.12 at $2000/ETH)

## Setup Instructions

### 1. Create Chainlink VRF Subscription

1. Visit [Chainlink VRF Subscription Manager](https://vrf.chain.link/)
2. Connect wallet and create new subscription
3. Fund subscription with LINK tokens
4. Note your **Subscription ID**

### 2. Deploy Contract

Deploy `PokerFlatGasFee.sol` with VRF Coordinator address:

```solidity
// Sepolia Testnet Example
address vrfCoordinator = 0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B;

PokerFlatGasFee poker = new PokerFlatGasFee(vrfCoordinator);
```

**VRF Coordinator Addresses:**
- Ethereum Mainnet: `0x271682DEB8C4E0901D1a1550aD2e64D568E69909`
- Sepolia Testnet: `0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B`
- Polygon Mainnet: `0xec0Ed46f36576541C75739E915ADbCb3DE24bD77`
- Base Mainnet: `0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634`

### 3. Configure VRF Parameters

```solidity
// Set game server address
poker.setGameServer(YOUR_GAME_SERVER_ADDRESS);

// Configure VRF subscription and key hash
poker.configureVRF(
    YOUR_SUBSCRIPTION_ID,      // From step 1
    KEY_HASH                   // Gas lane (see below)
);

// REQUIRED: Set LINK/ETH price feed for dynamic cost calculation
poker.setLinkEthPriceFeed(LINK_ETH_PRICE_FEED_ADDRESS);

// Optional: Adjust VRF parameters if needed
poker.setVrfVerificationGas(200000);      // Default: 200k gas
poker.setVrfPremiumPercentage(20);        // Default: 20%
```

**Key Hash (Gas Lane) Options:**

Sepolia Testnet:
- 500 gwei: `0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae`

Ethereum Mainnet:
- 200 gwei: `0x9e9e46732b32662b9adc6f3abdf6c5e926a666d174a4d6b8e39c4ab313a567e3`

Polygon Mainnet:
- 500 gwei: `0xcc294a196eeeb44da2888d17c0625cc88d70d9760a69d58d853ba6581a9ab0cd`

**LINK/ETH Price Feed Addresses:**

Ethereum Mainnet:
- `0xDC530D9457755926550b59e8ECcdaE7624181557`

Sepolia Testnet:
- `0x42585eD362B3f1BCa95c640FdFf35Ef899212734`

Polygon Mainnet:
- `0xb77fa460604b9C6928E8C3913B7df2Ea4e4eC5e8`

Base Mainnet:
- `0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70`

For other networks, find price feeds at: https://docs.chain.link/data-feeds/price-feeds/addresses

### 4. Add Contract as Consumer

1. Return to [VRF Subscription Manager](https://vrf.chain.link/)
2. Select your subscription
3. Click "Add Consumer"
4. Enter your deployed contract address

## How It Works

### Flow Diagram

```
1. Hand Starts → Request VRF Random Seed
   ├─ Game server calls: requestRandomSeed(tableId)
   ├─ Contract requests random number from Chainlink
   └─ Event: RandomSeedRequested(tableId, requestId)

2. Chainlink Processes Request (3-block confirmation)
   ├─ Chainlink nodes generate random number
   ├─ Cryptographic proof created
   └─ Callback: fulfillRandomWords(requestId, randomWords[])

3. Random Seed Stored
   ├─ Contract stores: table.randomSeed = randomWords[0]
   └─ Event: RandomSeedFulfilled(tableId, randomSeed)

4. Game Server Shuffles Deck
   ├─ Fetches seed: getRandomSeed(tableId)
   ├─ Uses seeded Fisher-Yates shuffle
   └─ Same seed = same deck order (verifiable)

5. Cards Dealt with Commit-Reveal
   ├─ Each player's cards hashed
   ├─ Hashes stored on-chain
   └─ Actual cards sent privately to players
```

### Code Integration

**Game Server (TypeScript):**

```typescript
import { PokerEngine } from './lib/poker-engine'

// Start new hand
const requestTx = await contract.requestRandomSeed(tableId)
await requestTx.wait()

// Wait for VRF callback (listen for RandomSeedFulfilled event)
contract.on('RandomSeedFulfilled', async (tableId, randomSeed) => {
  // Use VRF seed to shuffle
  const engine = new PokerEngine()
  const gameState = engine.initializeGame(players, randomSeed)

  // Commit card hashes to contract
  for (const player of gameState.players) {
    await contract.commitCards(
      tableId,
      player.address,
      player.cardCommitment.cardHash
    )
  }

  // Send actual cards privately to each player
  // ...
})
```

**Smart Contract:**

```solidity
// Request random seed when hand starts
function startHand(uint256 tableId) external {
    // Post blinds, setup pot...

    // Request VRF random seed
    requestRandomSeed(tableId);
}

// Chainlink callback (automatic)
function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
    uint256 tableId = vrfRequestToTable[requestId];
    tables[tableId].randomSeed = randomWords[0];
    emit RandomSeedFulfilled(tableId, randomWords[0]);
}
```

## Verification

Anyone can verify shuffle fairness:

1. **Get VRF Seed**: `contract.getRandomSeed(tableId)`
2. **Get Card Commitments**: `contract.getCardCommitment(tableId, player)`
3. **Verify Shuffle**: Use same seed with poker engine → should produce same deck
4. **Verify Cards**: At showdown, verify revealed cards match commitments

```typescript
// Verification example
const seed = await contract.getRandomSeed(tableId)
const engine = new PokerEngine()
engine.initializeGame(players, seed)

// This deck order is deterministic and verifiable
console.log(engine.getGameState().players[0].hole) // Player 1's cards
```

## Gas Costs

| Operation | Gas Cost | When |
|-----------|----------|------|
| `requestRandomSeed()` | ~150k gas | Once per hand |
| `fulfillRandomWords()` | ~100k gas | Chainlink callback (paid by subscription) |
| `commitCards()` | ~80k gas | Per player when dealing |
| `revealCards()` | ~100k gas | Per player at showdown |
| `distributeWinnings()` | ~60k gas | Once per hand |

**Total per hand**: ~250k-500k gas (depending on # of players)

## Testing

For local testing without VRF:

```typescript
// Poker engine accepts optional seed
const engine = new PokerEngine()

// No seed = uses Math.random() (TESTING ONLY)
const gameState = engine.initializeGame(players)

// With seed = deterministic shuffle (PRODUCTION)
const gameState = engine.initializeGame(players, vrfSeed)
```

## Troubleshooting

**"VRF not configured"**
→ Run `configureVRF()` with subscription ID and key hash

**"Insufficient LINK"**
→ Fund your VRF subscription at vrf.chain.link

**"Invalid consumer"**
→ Add contract address as consumer in subscription UI

**"Request failed"**
→ Check subscription has enough LINK balance
→ Verify key hash matches your chain

## Security Notes

- VRF seed is **publicly visible on-chain** (this is intentional - enables verification)
- Players cannot see each other's hole cards due to commit-reveal
- Server cannot manipulate shuffle (deterministic from VRF seed)
- Same seed always produces same deck order (auditable fairness)

## Resources

- [Chainlink VRF Docs](https://docs.chain.link/vrf)
- [Subscription Manager](https://vrf.chain.link/)
- [VRF Coordinator Addresses](https://docs.chain.link/vrf/v2-5/supported-networks)
- [Gas Lane Selection](https://docs.chain.link/vrf/v2-5/subscription/supported-networks#configurations)
