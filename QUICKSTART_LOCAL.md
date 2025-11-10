# Quick Start: Local Testing with Blockchain

This guide shows you how to run the full stack locally with a local blockchain.

## Prerequisites
- Node.js installed
- MetaMask or another Web3 wallet

## Setup Steps

### 1. Install Dependencies (Already Done!)
```bash
npm install
cd server && npm install && cd ..
```

### 2. Start Local Blockchain

Open **Terminal 1**:
```bash
npm run hardhat:node
```

This starts a local Ethereum node at `http://127.0.0.1:8545/`

**IMPORTANT**: Copy one of the private keys shown. You'll need it for deployment.

### 3. Deploy Contract to Local Node

Open **Terminal 2**:
```bash
# Set your private key (use one from hardhat node output)
# Edit .env.local and add:
# PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

npm run deploy:localhost
```

**Copy the deployed contract address** from the output!

### 4. Update Environment Files

Edit `.env.local`:
```bash
NEXT_PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:8080
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# ADD THESE:
NEXT_PUBLIC_POKER_CONTRACT_ADDRESS=<CONTRACT_ADDRESS_FROM_DEPLOY>
PRIVATE_KEY=<PRIVATE_KEY_FROM_HARDHAT_NODE>
```

Edit `server/.env`:
```bash
PORT=8080
CORS_ORIGINS=http://localhost:3000

# ADD THESE:
RPC_URL=http://127.0.0.1:8545
POKER_CONTRACT_ADDRESS=<CONTRACT_ADDRESS_FROM_DEPLOY>
GAME_SERVER_PRIVATE_KEY=<ANOTHER_PRIVATE_KEY_FROM_HARDHAT>
```

### 5. Start WebSocket Server

Open **Terminal 3**:
```bash
npm run server:dev
```

You should see:
```
⛓️  Initializing contract service...
🚀 WebSocket server running on port 8080
```

### 6. Start Frontend

Open **Terminal 4**:
```bash
npm run dev
```

### 7. Connect MetaMask to Local Network

1. Open MetaMask
2. Add Network:
   - Network Name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency: `ETH`
3. Import one of the test accounts using a private key from the hardhat node

### 8. Test!

1. Go to `http://localhost:3000`
2. Connect your wallet
3. Create a game
4. Open another browser window (incognito) with a different test account
5. Join the same game
6. Play poker!

## Testing Different Player Counts

To test with 7-9 players, you'll need to:
1. Use multiple browser profiles/windows
2. Import different test accounts into each
3. Connect each to the same game

The local Hardhat node gives you 20 test accounts to work with!

## Troubleshooting

### "Contract not deployed" error
- Make sure you ran `npm run deploy:localhost`
- Check the contract address in `.env.local` matches the deployment

### WebSocket connection fails
- Ensure `npm run server:dev` is running
- Check `NEXT_PUBLIC_WS_URL=ws://localhost:8080` in `.env.local`

### Wallet won't connect
- Make sure MetaMask is connected to the Hardhat Local network
- Chain ID must be `31337`

### "Insufficient funds" error
- Use test accounts from Hardhat - they have 10,000 ETH each!

## Test Account Private Keys (from Hardhat)

Hardhat gives you 20 pre-funded test accounts. Here are the first few:

```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

Account #2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
Private Key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a

# ... and 17 more!
```

Each account has **10,000 ETH** for testing!
