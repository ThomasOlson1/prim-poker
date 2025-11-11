# 🎮 Play Prim Poker on Base Sepolia Testnet

Your frontend is live on Vercel! Now let's get the smart contract deployed so you can play.

## Step 1: Deploy Smart Contract to Base Sepolia

### A. Fix Your .env File

Your `.env` file needs your 12-word seed phrase. Open it and add:

```bash
MNEMONIC=your twelve word seed phrase goes here all on one line
```

**Example:**
```bash
MNEMONIC=test test test test test test test test test test test junk
```

**Important Rules:**
- ✅ All 12 words on ONE line
- ✅ Separated by spaces (not commas)
- ✅ NO quotes around the words
- ✅ All lowercase
- ✅ Use a testnet wallet only (not your mainnet wallet!)

### B. Get Testnet ETH

1. Go to [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
2. Enter your wallet address
3. Request testnet ETH (you need ~0.01 ETH)

### C. Deploy the Contract

```bash
npm run deploy:base-sepolia
```

**Expected output:**
```
✅ PokerFlatGasFee deployed to: 0x1234567890abcdef...
```

### D. Save the Contract Address

Copy the deployed contract address and add it to your `.env`:

```bash
NEXT_PUBLIC_POKER_CONTRACT_ADDRESS=0x1234567890abcdef1234567890abcdef12345678
```

## Step 2: Update Vercel Environment Variables

Your Vercel deployment needs to know about the contract:

### Option A: Using Vercel CLI (Fastest)

```bash
# Set the contract address
vercel env add NEXT_PUBLIC_POKER_CONTRACT_ADDRESS

# Paste your contract address when prompted
# Select: Production, Preview, Development (space to select all)

# Redeploy to apply changes
vercel --prod
```

### Option B: Using Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `prim-poker` project
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - **Name:** `NEXT_PUBLIC_POKER_CONTRACT_ADDRESS`
   - **Value:** Your deployed contract address (from Step 1C)
   - **Environments:** Check Production, Preview, Development
5. Click **Save**
6. Go to **Deployments** and click **Redeploy** on the latest deployment

## Step 3: Connect Your Wallet & Play

### A. Open Your App

Visit your Vercel URL: `https://prim-poker-cu8rqj2v1-thomas-olsons-projects.vercel.app`

### B. Connect Wallet

1. Click "Connect Wallet"
2. Select your wallet (MetaMask, Coinbase Wallet, etc.)
3. **Make sure you're on Base Sepolia network**
   - If not, switch networks in your wallet

### C. Get More Testnet ETH (If Needed)

You need testnet ETH to:
- Create tables
- Join games
- Place bets

Get more from: [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)

### D. Start Playing!

1. **Create a Table:**
   - Click "Create Table"
   - Set blinds (e.g., 0.001 ETH small blind, 0.002 ETH big blind)
   - Confirm transaction in your wallet

2. **Join a Table:**
   - Click "Join Table"
   - Enter buy-in amount (minimum is 20x big blind)
   - Confirm transaction

3. **Play Poker!**
   - Wait for other players to join
   - The game will start automatically when 2+ players join
   - Play your hands and win chips!

## Troubleshooting

### Error: "Contract not deployed"
- Check that `NEXT_PUBLIC_POKER_CONTRACT_ADDRESS` is set in Vercel
- Redeploy your Vercel app after setting the variable

### Error: "Wrong network"
- Switch to Base Sepolia in your wallet
- Network details:
  - **Network Name:** Base Sepolia
  - **RPC URL:** https://sepolia.base.org
  - **Chain ID:** 84532

### Error: "Insufficient funds"
- Get more testnet ETH from the faucet
- Make sure you have at least 0.01 ETH for testing

### Error: "Transaction failed"
- Check you have enough ETH for gas
- Try increasing gas limit in your wallet

### Can't see other players
- The game server needs to be running
- For testing, you can use multiple browser profiles/wallets to simulate multiple players

## Testing with Multiple Accounts

To fully test the poker game, you'll need multiple accounts:

### Option 1: Multiple Browser Profiles
1. Create 2-3 Chrome/Brave profiles
2. Install MetaMask in each
3. Create separate testnet wallets for each
4. Get testnet ETH for each wallet
5. Open your app in each profile

### Option 2: Multiple Wallets in Same Browser
1. Create multiple accounts in MetaMask
2. Switch between accounts to play as different players

## Next Steps

Once everything works on testnet:

1. **Test all features:**
   - Creating tables with different blind levels
   - Joining/leaving tables
   - Playing complete hands
   - Winning and losing chips

2. **Check contract on BaseScan:**
   - Visit: `https://sepolia.basescan.org/address/YOUR_CONTRACT_ADDRESS`
   - You can see all transactions and verify the contract

3. **When ready for mainnet:**
   - Deploy to Base Mainnet (using real ETH)
   - Update environment variables
   - Be extra careful with security!

## Quick Reference

### Important Links
- **Your App:** https://prim-poker-cu8rqj2v1-thomas-olsons-projects.vercel.app
- **Base Sepolia Faucet:** https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
- **Base Sepolia Explorer:** https://sepolia.basescan.org
- **Vercel Dashboard:** https://vercel.com/dashboard

### Contract Addresses to Save
```bash
# Add these to your .env
NEXT_PUBLIC_POKER_CONTRACT_ADDRESS=<from deployment>
VRF_COORDINATOR=0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE
```

### Commands
```bash
# Deploy contract
npm run deploy:base-sepolia

# Run tests
npx hardhat test

# Deploy frontend
vercel --prod

# Check mnemonic format
node check-mnemonic.js
```

## Need Help?

If you encounter issues:
1. Check the deployment logs in Vercel
2. Check transaction details on BaseScan
3. Make sure your wallet is on Base Sepolia network
4. Verify you have enough testnet ETH

Happy testing! 🎲🃏
