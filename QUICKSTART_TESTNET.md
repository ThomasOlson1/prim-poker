# Quick Start: Testing with Base Sepolia Testnet

**EASIER OPTION**: Use Base Sepolia testnet instead of running a local blockchain.

## Why This is Easier
- ✅ No need to run local Hardhat node
- ✅ No need to deploy contract yourself
- ✅ Can test from multiple devices easily
- ✅ Persistent across restarts
- ❌ Need to deploy contract once (or use existing one if available)

## Setup Steps

### 1. Get Base Sepolia ETH

You need testnet ETH to deploy the contract and test:

1. Go to [Coinbase Faucet](https://portal.cdp.coinbase.com/products/faucet) or [Alchemy Faucet](https://www.alchemy.com/faucets/base-sepolia)
2. Enter your wallet address
3. Get free Base Sepolia ETH

### 2. Deploy Contract to Base Sepolia

```bash
# Edit .env.local and add your private key:
# PRIVATE_KEY=<your_private_key_with_testnet_ETH>

npm run deploy:base-sepolia
```

**IMPORTANT**: Copy the deployed contract address!

### 3. Update Environment Files

Edit `.env.local`:
```bash
NEXT_PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:8080
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_POKER_CONTRACT_ADDRESS=<YOUR_DEPLOYED_CONTRACT_ADDRESS>
```

Edit `server/.env`:
```bash
PORT=8080
CORS_ORIGINS=http://localhost:3000

RPC_URL=https://sepolia.base.org
POKER_CONTRACT_ADDRESS=<YOUR_DEPLOYED_CONTRACT_ADDRESS>
GAME_SERVER_PRIVATE_KEY=<YOUR_PRIVATE_KEY>
```

### 4. Start WebSocket Server

Open **Terminal 1**:
```bash
npm run server:dev
```

### 5. Start Frontend

Open **Terminal 2**:
```bash
npm run dev
```

### 6. Connect MetaMask to Base Sepolia

1. Open MetaMask
2. Network dropdown → Add Network
3. Use these settings:
   - **Network Name**: Base Sepolia
   - **RPC URL**: `https://sepolia.base.org`
   - **Chain ID**: `84532`
   - **Currency**: `ETH`
   - **Block Explorer**: `https://sepolia.basescan.org`

Or click "Add to MetaMask" on [Chainlist](https://chainlist.org/chain/84532)

### 7. Test!

1. Go to `http://localhost:3000`
2. Connect your wallet (with Base Sepolia network selected)
3. Create a game
4. Open another browser/device
5. Connect with different wallet
6. Join the same game

## Advantages of Testnet Testing

1. **Persistent Data**: Your contract stays deployed
2. **Multiple Devices**: Test from phone, tablet, other computers on same network
3. **Real Block Explorer**: View transactions on [Base Sepolia Scan](https://sepolia.basescan.org)
4. **Closer to Production**: More realistic testing environment

## Testing on Multiple Devices

Since the contract is on testnet, you can test from multiple devices:

1. **Find your local IP**:
   ```bash
   # Mac/Linux
   ifconfig | grep "inet "

   # Windows
   ipconfig
   ```

2. **Access from other devices**: `http://YOUR_IP:3000`
3. **Each device** connects with their own wallet to Base Sepolia
4. **Join same game** and test with 7-9 players!

## Cost

- Deploying contract: ~0.001 Base Sepolia ETH (free from faucet)
- Each game action: ~0.0001 ETH
- Total for testing: ~0.01 ETH (all free testnet funds!)

## Troubleshooting

### "Network mismatch" error
- Make sure MetaMask is on Base Sepolia (Chain ID: 84532)
- Don't use Ethereum Sepolia - must be **Base** Sepolia

### WebSocket connection fails
- Check `npm run server:dev` is running
- Verify `NEXT_PUBLIC_WS_URL=ws://localhost:8080`

### "Contract call failed"
- Make sure contract deployed successfully
- Verify contract address in both `.env.local` and `server/.env`
- Check you have testnet ETH in your wallet

## Which Option Should I Use?

| Feature | Local Hardhat | Base Sepolia Testnet |
|---------|--------------|---------------------|
| Setup Complexity | High | Medium |
| Terminal Windows Needed | 4 | 2 |
| Restart Survives | ❌ No | ✅ Yes |
| Multi-Device Testing | Hard | Easy |
| Free | ✅ | ✅ |
| **Recommended For** | Contract development | UI/Game testing |

**For testing UI with 7-9 players**: Use **Base Sepolia** - it's easier!
