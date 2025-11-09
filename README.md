# Prim Poker 🎴

A decentralized Texas Hold'em poker game built on Base with real-time gameplay via WebSockets.

## 🏗️ Architecture

### Frontend (Next.js + React)
- **UI Components**: Game lobby, poker table, betting controls
- **Web3 Integration**: wagmi + viem for blockchain interactions
- **Real-time**: WebSocket client for live game updates
- **State Management**: React hooks for game state

### Backend (Node.js + WebSocket)
- **WebSocket Server**: Real-time game communication
- **Game Rooms**: Manage multiple poker tables
- **Turn Timers**: 30-second turn countdown with auto-fold
- **Game Engine**: Texas Hold'em logic

### Smart Contract (Solidity)
- **Flat Gas Fee Model**: $0.70 per hand (0.00035 ETH)
- **On-chain State**: Player chips, table info, pot management
- **Events**: Table creation, player joins/leaves, hand results
- **Deployed on**: Base (mainnet/testnet)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MetaMask or compatible wallet
- Base testnet ETH (for testing)

### 1. Install Dependencies

```bash
npm install
```

### 2. Smart Contract Setup

```bash
# Install Hardhat dependencies
npm install --legacy-peer-deps

# Create .env file
cp .env.example .env

# Add your private key to .env
# PRIVATE_KEY=your_private_key_here

# Compile contracts
npx hardhat compile

# Deploy to local network
npx hardhat node
# In another terminal:
npx hardhat run scripts/deploy.ts --network localhost

# Or deploy to Base Sepolia testnet
npx hardhat run scripts/deploy.ts --network baseSepolia

# Save the contract address to .env
# NEXT_PUBLIC_POKER_CONTRACT_ADDRESS=0x...
```

### 3. Start WebSocket Server

```bash
cd server
npm install
npm run dev
# Server runs on ws://localhost:8080
```

### 4. Start Frontend

```bash
npm run dev
# Frontend runs on http://localhost:3000
```

## 📝 Environment Variables

Create a `.env` file with:

```env
# Smart Contract
NEXT_PUBLIC_POKER_CONTRACT_ADDRESS=0x...

# Private key for deployment (DO NOT COMMIT)
PRIVATE_KEY=your_private_key_here

# Basescan API key for verification
BASESCAN_API_KEY=your_api_key

# WebSocket Server
NEXT_PUBLIC_WS_URL=ws://localhost:8080

# API URL
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 🎮 How to Play

### Create a Table
1. Connect your wallet
2. Click "Create Table"
3. Set blinds (minimum $5/$10 recommended)
4. Transaction creates table on-chain

### Join a Table
1. Browse available tables
2. Click "Join Table"
3. Specify buy-in amount (minimum 50 BB)
4. Transaction seats you at the table

### Play Poker
1. Wait for hand to start (2+ players needed)
2. Blinds are posted automatically
3. Make your action when it's your turn:
   - Fold
   - Check (if no bet)
   - Call
   - Raise
   - All-in
4. You have 30 seconds per turn
5. Winner receives full pot on-chain

## 💰 Economics

### Flat Fee Model
- **Gas Fee**: 0.00035 ETH (~$0.70) per hand
- **Extracted from**: Blinds at start of hand
- **Winner gets**: 100% of remaining pot
- **No rake**: Traditional sites take 5%+

### Viable Stakes
| Stakes | Blinds | Gas Fee | To Pot | Effective Rake |
|--------|--------|---------|---------|----------------|
| $5/$10 | $15 | $0.70 | $14.30 | 4.9% ✅ |
| $10/$20 | $30 | $0.70 | $29.30 | 2.4% ✅ |
| $50/$100 | $150 | $0.70 | $149.30 | 0.47% ✅ |

**Best for stakes $5/$10 and higher**

## 🔧 Development

### Project Structure

```
prim-poker/
├── app/                    # Next.js app directory
├── components/             # React components
│   ├── game-lobby.tsx     # Lobby UI
│   ├── poker-table-view.tsx
│   └── betting-controls.tsx
├── contracts/              # Solidity contracts
│   └── PokerFlatGasFee.sol
├── hooks/                  # React hooks
│   ├── use-poker-contract.ts
│   ├── use-game-websocket.ts
│   └── use-game-timer.ts
├── lib/                    # Utilities
│   ├── contracts/         # Contract integrations
│   ├── poker-engine.ts    # Game logic
│   └── websocket-service.ts
├── server/                 # WebSocket server
│   ├── index.ts           # Server entry
│   ├── game-room.ts       # Room management
│   └── turn-timer.ts      # Timer logic
├── scripts/                # Deployment scripts
│   └── deploy.ts
└── hardhat.config.ts      # Hardhat configuration
```

### Testing

```bash
# Test contracts
npx hardhat test

# Run local blockchain
npx hardhat node

# Deploy to local network
npx hardhat run scripts/deploy.ts --network localhost
```

### Key Hooks

**`usePokerContract`** - Interact with smart contract
```typescript
const { contract, address, isInitialized } = usePokerContract()
await contract.createTable(smallBlind, bigBlind)
await contract.joinTable(tableId, buyIn)
```

**`useGameWebSocket`** - Real-time game updates
```typescript
const { gameState, turnTimer, isMyTurn } = useGameWebSocket(gameId)
```

**`useGameTimer`** - Turn countdown
```typescript
const { timeRemaining, progress } = useGameTimer({
  duration: 30,
  serverTimeLeft: turnTimer?.timeLeft,
  isActive: isMyTurn,
  onExpire: () => handleFold()
})
```

## 🎯 Features

- ✅ Flat gas fee model ($0.70/hand)
- ✅ Texas Hold'em poker engine
- ✅ Real-time WebSocket gameplay
- ✅ Turn timers (30 seconds)
- ✅ Auto-fold on timeout
- ✅ On-chain chip management
- ✅ Multi-table support
- ✅ Mobile responsive UI

## 🔐 Security

- Smart contract audited (recommended before mainnet)
- Private keys never exposed in frontend
- WebSocket authentication via wallet signature
- Input validation on all actions
- Rate limiting on server

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

---

Built with ❤️ for Base
