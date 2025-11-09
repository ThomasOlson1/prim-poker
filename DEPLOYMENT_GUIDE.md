# 🚀 Deployment Guide

This guide will walk you through deploying and testing Prim Poker from scratch.

## 📋 Prerequisites

- Node.js 18+ installed
- Git installed
- MetaMask or compatible Web3 wallet
- Base Sepolia testnet ETH (get from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet))

## 🔧 Initial Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd prim-poker
npm install --legacy-peer-deps
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add:
# - Your wallet private key (for deployment)
# - Base Sepolia RPC URL (optional, uses public endpoint by default)
# - Basescan API key (for contract verification, optional)
```

**⚠️ NEVER commit your .env file or share your private key!**

### 3. Install Server Dependencies

```bash
cd server
npm install
cd ..
```

## 🌐 Local Development

### Option 1: Quick Start (All in One)

```bash
npm run setup
```

This will:
- Create .env file
- Install all dependencies
- Compile contracts

### Option 2: Manual Setup

**Terminal 1: Start Local Blockchain**
```bash
npx hardhat node
# This starts a local Ethereum network on port 8545
# Keep this running
```

**Terminal 2: Deploy Contract**
```bash
npx hardhat run scripts/deploy.ts --network localhost

# Copy the contract address from output
# Add to .env:
# NEXT_PUBLIC_POKER_CONTRACT_ADDRESS=0x...
```

**Terminal 3: Start WebSocket Server**
```bash
cd server
npm run dev
# Server runs on ws://localhost:8080
```

**Terminal 4: Start Frontend**
```bash
npm run dev
# Frontend runs on http://localhost:3000
```

### Testing Locally

1. Open http://localhost:3000 in your browser
2. Connect MetaMask to localhost network (Chain ID: 31337)
3. Import one of the Hardhat accounts:
   ```
   Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
   Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```
4. You'll have 10,000 ETH for testing
5. Create a table and test gameplay

## 🚀 Deploy to Base Sepolia Testnet

### 1. Get Testnet ETH

Visit [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet) and get some testnet ETH.

### 2. Configure .env

```env
PRIVATE_KEY=your_private_key_here
NEXT_PUBLIC_WS_URL=wss://your-server-url.com
BASESCAN_API_KEY=your_api_key_here (optional)
```

### 3. Compile Contract

```bash
npx hardhat compile
```

### 4. Deploy to Base Sepolia

```bash
npm run deploy:base-sepolia

# Or manually:
npx hardhat run scripts/deploy.ts --network baseSepolia
```

You should see output like:
```
🎲 Deploying PokerFlatGasFee contract...
Deploying with account: 0x...
Account balance: 0.5 ETH
✅ PokerFlatGasFee deployed to: 0x123abc...
Gas fee: 0.00035 ETH
```

### 5. Save Contract Address

Copy the contract address and add to `.env`:
```env
NEXT_PUBLIC_POKER_CONTRACT_ADDRESS=0x123abc...
```

### 6. Verify Contract (Optional)

```bash
npx hardhat verify --network baseSepolia 0x123abc...
```

## 🌐 Deploy WebSocket Server

You need to deploy the WebSocket server to a hosting provider. Here are a few options:

### Option A: Railway

1. Create account at [Railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub"
3. Select your repository
4. Add environment variables:
   ```
   PORT=8080
   NODE_ENV=production
   ```
5. Set start command: `cd server && npm install && npm start`
6. Railway will give you a URL like `https://your-app.railway.app`
7. Update `.env`:
   ```env
   NEXT_PUBLIC_WS_URL=wss://your-app.railway.app
   ```

### Option B: Heroku

1. Install Heroku CLI
2. Create Heroku app:
   ```bash
   heroku create prim-poker-server
   ```
3. Add buildpack:
   ```bash
   heroku buildpacks:set heroku/nodejs
   ```
4. Create `Procfile` in server directory:
   ```
   web: node dist/index.js
   ```
5. Deploy:
   ```bash
   git subtree push --prefix server heroku main
   ```

### Option C: DigitalOcean/AWS/GCP

Deploy as a standard Node.js application on any cloud provider.

## 🎨 Deploy Frontend

### Option A: Vercel (Recommended)

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Click "Import Project"
4. Select your repository
5. Add environment variables:
   ```
   NEXT_PUBLIC_POKER_CONTRACT_ADDRESS=0x123abc...
   NEXT_PUBLIC_WS_URL=wss://your-server.com
   ```
6. Deploy!

### Option B: Netlify

Similar process to Vercel:
1. Connect GitHub repository
2. Build command: `npm run build`
3. Publish directory: `.next`
4. Add environment variables

## ✅ Post-Deployment Checklist

- [ ] Smart contract deployed and verified
- [ ] Contract address in `.env`
- [ ] WebSocket server running and accessible
- [ ] Frontend deployed
- [ ] Environment variables set correctly
- [ ] Test wallet connection
- [ ] Test creating a table
- [ ] Test joining a table
- [ ] Test gameplay with 2+ players
- [ ] Test turn timer
- [ ] Test hand completion

## 🧪 Testing the Deployment

### 1. Test Contract Functions

```bash
# In Hardhat console
npx hardhat console --network baseSepolia

# Test creating table
const contract = await ethers.getContractAt("PokerFlatGasFee", "0x123abc...")
const tx = await contract.createTable(
  ethers.parseEther("0.005"),  // $5 small blind
  ethers.parseEther("0.01")    // $10 big blind
)
await tx.wait()
console.log("Table created!")
```

### 2. Test WebSocket Server

```bash
# Use wscat to test WebSocket
npm install -g wscat

wscat -c wss://your-server.com

# Send message:
{"type":"authenticate","address":"0x123..."}
```

### 3. Test Frontend

1. Open your deployed frontend URL
2. Connect wallet (MetaMask)
3. Switch to Base Sepolia network
4. Create a new table
5. Open in incognito window with different wallet
6. Join the table
7. Play a hand

## 🐛 Troubleshooting

### Contract deployment fails

- Check you have enough ETH for gas
- Verify private key is correct in `.env`
- Check network configuration in `hardhat.config.ts`

### WebSocket won't connect

- Verify server is running
- Check firewall settings
- Ensure using `wss://` for HTTPS sites (not `ws://`)
- Check server logs for errors

### Frontend can't connect to contract

- Verify contract address is correct in `.env`
- Check you're on the correct network (Base Sepolia)
- Ensure wallet is connected
- Check browser console for errors

### Turn timer not syncing

- Verify WebSocket connection is stable
- Check server logs for timer events
- Ensure both players are connected to the same game room

## 📊 Monitoring

### Check Contract on BaseScan

Visit: `https://sepolia.basescan.org/address/0x123abc...`

You can see:
- All transactions
- Contract events
- Current state

### Check Server Health

```bash
curl https://your-server.com/api/health
```

Should return:
```json
{
  "status": "ok",
  "rooms": 2,
  "uptime": 12345
}
```

### Check Active Games

```bash
curl https://your-server.com/api/rooms
```

## 🔐 Security Best Practices

1. **Never commit private keys** - Use environment variables
2. **Use HTTPS** - For both frontend and WebSocket server
3. **Validate all inputs** - Both client and server side
4. **Rate limit** - Add rate limiting to WebSocket and API endpoints
5. **Audit contract** - Get professional audit before mainnet
6. **Monitor transactions** - Set up alerts for unusual activity
7. **Use timelocks** - For critical contract functions
8. **Test thoroughly** - On testnet before mainnet

## 🎯 Production Deployment (Base Mainnet)

⚠️ **Only deploy to mainnet after thorough testing and auditing!**

1. Get audit from reputable firm
2. Test extensively on testnet with real users
3. Prepare mainnet wallet with ETH
4. Update `hardhat.config.ts` with mainnet settings
5. Deploy:
   ```bash
   npx hardhat run scripts/deploy.ts --network base
   ```
6. Verify contract on BaseScan
7. Update frontend environment variables
8. Monitor closely for first 24-48 hours

## 📞 Getting Help

- Check [README.md](./README.md) for basic info
- Review Hardhat docs: https://hardhat.org/docs
- Review Next.js docs: https://nextjs.org/docs
- Review Base docs: https://docs.base.org

## 🎉 Success!

If you made it here, congratulations! Your poker dApp should now be live.

Share your deployment:
- Twitter: @yourhandle
- Discord: [Join community]
- Show HN: https://news.ycombinator.com

---

**Happy dealing! 🎴**
