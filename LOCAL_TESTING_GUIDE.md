# Local Testing Guide

Your environment is now set up for local testing! Follow these steps on your local machine.

## Prerequisites Checklist

- ✅ Node.js installed (v18+)
- ✅ Dependencies installed (`npm install` in root and `cd server && npm install`)
- ✅ `.env`, `.env.local`, and `server/.env` files created

## Step-by-Step Testing Process

### 1. Run Contract Tests

First, verify all smart contract functionality works:

```bash
npx hardhat test
```

**Expected Output:**
- All tests should pass ✓
- Tests cover security, game logic, and edge cases
- Look for: `PokerFlatGasFee`, `PokerSecurity` test suites

**If tests fail:** Review error messages and fix contract issues before proceeding.

---

### 2. Start Local Hardhat Node

Open a **new terminal window** and start a local blockchain:

```bash
npm run hardhat:node
```

**Expected Output:**
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
...
```

**Keep this terminal running!** This is your local blockchain.

---

### 3. Deploy Contract to Local Network

Open a **new terminal window** and deploy the contract:

```bash
npm run deploy:localhost
```

**Expected Output:**
```
PokerFlatGasFee deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Owner: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Game Server set to: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8

NEXT_PUBLIC_POKER_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

**Important:** Copy the contract address!

---

### 4. Update Environment Files

Update both `.env.local` and `server/.env` with the deployed contract address:

**In `.env.local`:**
```bash
NEXT_PUBLIC_POKER_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

**In `server/.env`:**
```bash
POKER_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

---

### 5. Start WebSocket Game Server

Open a **new terminal window**:

```bash
npm run server:dev
```

**Expected Output:**
```
Server is running on port 8080
Connected to contract at 0x5FbDB2315678afecb367f032d93F642f64180aa3
Game server authorized: true
```

**If you see "Game server authorized: false"**, the deployment script should have already authorized it. Check the deployment output.

**Keep this terminal running!**

---

### 6. Start Next.js Frontend

Open a **new terminal window**:

```bash
npm run dev
```

**Expected Output:**
```
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
- event compiled client and server successfully
```

**Keep this terminal running!**

---

### 7. Test the Game!

Open your browser to: **http://localhost:3000**

#### Test Flow:

1. **Connect Wallet**
   - Use MetaMask or another wallet
   - Connect to "Localhost 8545" network
   - Import one of the Hardhat test accounts (use Account #0's private key)

2. **Create/Join a Table**
   - Click "Create Table" or "Join Table"
   - Set buy-in amount (e.g., 0.1 ETH)

3. **Play a Hand**
   - Wait for other players (or open in multiple browser windows with different accounts)
   - Place bets, check, fold, raise
   - Verify cards are dealt correctly
   - Check winner determination

4. **Test Features**
   - ✓ Buying in works
   - ✓ Cards are dealt
   - ✓ Betting works (check, call, raise, fold)
   - ✓ Pot calculations are correct
   - ✓ Winner is determined correctly
   - ✓ Payouts happen automatically
   - ✓ Multiple hands can be played

#### Common Issues:

**"Please connect wallet"**
→ Add Localhost network to MetaMask:
- Network Name: Localhost 8545
- RPC URL: http://127.0.0.1:8545
- Chain ID: 31337
- Currency: ETH

**"Transaction failed"**
→ Reset MetaMask account (Settings > Advanced > Clear activity tab data)
→ Make sure you're using Account #0 or #1 from Hardhat node

**"WebSocket connection failed"**
→ Check that game server is running on port 8080
→ Check `NEXT_PUBLIC_WS_URL=ws://localhost:8080` in `.env.local`

**"Contract not found"**
→ Make sure you deployed to localhost network
→ Verify contract address in both `.env.local` and `server/.env`

---

## What You Should Have Running:

At this point, you should have **4 terminal windows** open:

1. **Hardhat Node** - `npm run hardhat:node`
2. **Game Server** - `npm run server:dev`
3. **Frontend** - `npm run dev`
4. **Free terminal** - for running additional commands

---

## Next Steps After Local Testing

Once everything works locally:

1. **Deploy to Base Sepolia (Testnet)**
   - Get Sepolia ETH from a faucet
   - Get BaseScan API key
   - Run `npm run deploy:base-sepolia`

2. **Set Up Chainlink VRF**
   - See `VRF_SETUP.md`
   - Create subscription at https://vrf.chain.link/
   - Fund with LINK tokens
   - Configure contract

3. **Deploy Backend Server**
   - Deploy to Railway, Render, or Fly.io
   - Set environment variables
   - Update `NEXT_PUBLIC_WS_URL`

4. **Deploy Frontend**
   - Deploy to Vercel
   - Add all environment variables
   - Set `NEXT_PUBLIC_URL` to your Vercel domain

5. **Final Integration Testing**
   - Test on testnet with real users
   - Verify VRF randomness works
   - Check all transactions succeed

---

## Testing Checklist

Before deploying to production, verify:

- [ ] All Hardhat tests pass
- [ ] Can create a table
- [ ] Can join a table with multiple accounts
- [ ] Can buy in to a table
- [ ] Cards are dealt correctly
- [ ] Betting works (check, call, raise, fold)
- [ ] Pot calculations are correct
- [ ] Winner determination is accurate
- [ ] Payouts work correctly
- [ ] Can play multiple hands
- [ ] WebSocket connection is stable
- [ ] No console errors in browser
- [ ] Smart contract events are emitted correctly
- [ ] Game server can read contract state

---

## Need Help?

If you encounter issues:

1. Check the console logs in all terminals
2. Check browser console for errors (F12)
3. Review the error messages carefully
4. Common fixes:
   - Restart all services
   - Clear MetaMask activity data
   - Redeploy contract and update addresses
   - Check .env files have correct values

Good luck testing! 🃏
