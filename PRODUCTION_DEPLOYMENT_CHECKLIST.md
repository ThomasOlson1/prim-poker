# Production Deployment Checklist

After successful local testing, use this checklist to deploy to production.

## Phase 1: Testnet Deployment (Base Sepolia)

### 1.1 Get Test Funds

- [ ] Get Sepolia ETH from faucet:
  - https://sepoliafaucet.com/
  - https://www.alchemy.com/faucets/ethereum-sepolia
- [ ] Bridge Sepolia ETH to Base Sepolia:
  - https://bridge.base.org/deposit
  - Or use https://www.superbridge.app/

### 1.2 Get API Keys

- [ ] **BaseScan API Key**
  - Go to https://basescan.org/myapikey
  - Create account and generate API key
  - Add to `.env`: `BASESCAN_API_KEY=your_key_here`

- [ ] **OnchainKit API Key** (if not already done)
  - Go to https://portal.cdp.coinbase.com/
  - Create project and get API key
  - Add to `.env.local`: `NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_key_here`

### 1.3 Deploy Contract to Base Sepolia

```bash
npm run deploy:base-sepolia
```

**Save the output:**
- Contract address: `0x...`
- Owner address: `0x...`
- Game server address: `0x...`

**Verify on BaseScan:**
- Go to https://sepolia.basescan.org/address/YOUR_CONTRACT_ADDRESS
- Contract should be verified automatically

### 1.4 Set Up Chainlink VRF

Follow `VRF_SETUP.md`:

1. **Create VRF Subscription**
   - Go to https://vrf.chain.link/
   - Connect wallet
   - Create new subscription
   - Note your subscription ID

2. **Fund Subscription**
   - Get Base Sepolia LINK tokens from faucet
   - Add 10 LINK to your subscription

3. **Configure Contract**
   ```bash
   # Use Hardhat console or Etherscan
   npx hardhat console --network baseSepolia

   const poker = await ethers.getContractAt("PokerFlatGasFee", "YOUR_CONTRACT_ADDRESS")
   await poker.configureVRF(
     YOUR_SUBSCRIPTION_ID,  // From vrf.chain.link
     "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae"  // Base Sepolia key hash
   )
   ```

4. **Add Contract as Consumer**
   - On vrf.chain.link, go to your subscription
   - Click "Add consumer"
   - Enter your contract address

5. **Set LINK/ETH Price Feed**
   ```bash
   # Base Sepolia LINK/ETH feed
   await poker.setPriceFeed("0xb113F5A928BCfF189C998ab20d753a47F9dE5A61")
   ```

### 1.5 Test on Sepolia

- [ ] Deploy game server to test environment
- [ ] Deploy frontend to Vercel preview
- [ ] Create table and play a full hand
- [ ] Verify VRF randomness works (may take 30+ seconds)
- [ ] Check all transactions on BaseScan
- [ ] Verify gas fees are correct

---

## Phase 2: Backend Deployment

### 2.1 Choose Hosting Provider

Options:
- **Railway** (easiest, has free tier)
- **Render** (free tier available)
- **Fly.io** (good for WebSockets)
- **AWS/GCP/Azure** (most control)

### 2.2 Deploy to Railway (Recommended)

1. **Create Account**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `prim-poker` repo

3. **Configure Service**
   - Set root directory to `/server`
   - Build command: `npm install && npm run build`
   - Start command: `npm start`

4. **Set Environment Variables**
   ```
   PORT=8080
   RPC_URL=https://sepolia.base.org
   POKER_CONTRACT_ADDRESS=your_contract_address_from_step_1.3
   GAME_SERVER_PRIVATE_KEY=your_game_server_private_key
   CORS_ORIGINS=https://your-app.vercel.app
   ```

5. **Deploy**
   - Click "Deploy"
   - Note your Railway URL: `https://your-app.railway.app`

6. **Enable WebSocket Support**
   - Railway supports WebSockets by default
   - Your WebSocket URL: `wss://your-app.railway.app`

### 2.3 Test Backend

```bash
# Test WebSocket connection
wscat -c wss://your-app.railway.app

# Should connect successfully
```

---

## Phase 3: Frontend Deployment

### 3.1 Deploy to Vercel

1. **Create Account**
   - Go to https://vercel.com
   - Sign up with GitHub

2. **Import Project**
   - Click "New Project"
   - Import your `prim-poker` repo
   - Vercel will auto-detect Next.js

3. **Configure Environment Variables**

   Add these in Vercel dashboard (Settings > Environment Variables):

   ```
   NEXT_PUBLIC_URL=https://your-app.vercel.app
   NEXT_PUBLIC_POKER_CONTRACT_ADDRESS=your_contract_address
   NEXT_PUBLIC_WS_URL=wss://your-backend.railway.app
   NEXT_PUBLIC_API_URL=https://your-app.vercel.app/api
   NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_coinbase_api_key
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete
   - Note your Vercel URL

5. **Update NEXT_PUBLIC_URL**
   - Go back to Environment Variables
   - Update `NEXT_PUBLIC_URL` with your actual Vercel URL
   - Redeploy

### 3.2 Configure Custom Domain (Optional)

- Add custom domain in Vercel
- Update `NEXT_PUBLIC_URL` to your custom domain
- Update DNS records as instructed by Vercel

---

## Phase 4: Farcaster Integration

### 4.1 Set Up Farcaster Mini App

Follow `FARCASTER_SETUP.md`:

1. **Create Frame**
   - Go to https://dev.farcaster.xyz/
   - Create new frame
   - Set manifest URL: `https://your-app.vercel.app/manifest.json`

2. **Verify Manifest**
   - Visit `https://your-app.vercel.app/manifest.json`
   - Should show correct `homeUrl` (your Vercel URL)
   - Verify `iconUrl` is accessible

3. **Test in Warpcast**
   - Open Warpcast app
   - Find your frame
   - Test the game flow

---

## Phase 5: Production Deployment (Base Mainnet)

⚠️ **Only proceed after thorough testnet testing!**

### 5.1 Get Mainnet Funds

- [ ] Buy ETH and bridge to Base Mainnet
- [ ] Get LINK tokens for VRF
- [ ] Have enough ETH for:
  - Contract deployment (~0.01 ETH)
  - VRF subscription (~10 LINK)
  - Game server operations (~0.1 ETH buffer)

### 5.2 Update Environment

Update `.env`:
```bash
PRIVATE_KEY=your_mainnet_deployment_key
BASESCAN_API_KEY=your_basescan_key
```

Update `server/.env`:
```bash
RPC_URL=https://mainnet.base.org
GAME_SERVER_PRIVATE_KEY=your_mainnet_game_server_key
```

### 5.3 Deploy to Base Mainnet

```bash
npm run deploy:base-sepolia  # Change script or use hardhat run with --network base
```

**Or manually:**
```bash
npx hardhat run scripts/deploy.ts --network base
```

**Save everything:**
- Contract address
- Transaction hash
- Gas used
- Deployment cost

**Verify contract:**
- Should auto-verify on BaseScan
- Check at https://basescan.org/address/YOUR_ADDRESS

### 5.4 Set Up Mainnet VRF

1. **Create Subscription** at https://vrf.chain.link/
2. **Fund with LINK** (10+ LINK recommended)
3. **Configure Contract:**
   ```bash
   npx hardhat console --network base

   const poker = await ethers.getContractAt("PokerFlatGasFee", "YOUR_CONTRACT")

   # Base Mainnet VRF config
   await poker.configureVRF(
     YOUR_SUBSCRIPTION_ID,
     "0x9e9e46732b32662b9adc6f3abdf6c5e926a666d174a4d6b8e39c7b2d37d81e99"  # Base Mainnet key hash
   )

   # Base Mainnet LINK/ETH price feed
   await poker.setPriceFeed("0x4b7836916781CAAfbb7Bd1E5FEf2d3FAa6e79f92")
   ```
4. **Add contract as consumer** on vrf.chain.link

### 5.5 Update Backend for Mainnet

Update Railway environment variables:
```
RPC_URL=https://mainnet.base.org
POKER_CONTRACT_ADDRESS=your_mainnet_contract_address
```

Redeploy backend.

### 5.6 Update Frontend for Mainnet

Update Vercel environment variables:
```
NEXT_PUBLIC_POKER_CONTRACT_ADDRESS=your_mainnet_contract
```

Redeploy frontend.

---

## Phase 6: Final Testing

### 6.1 Smoke Tests

- [ ] Visit production URL
- [ ] Connect wallet to Base Mainnet
- [ ] Create a table (costs real ETH!)
- [ ] Join with second account
- [ ] Play one full hand
- [ ] Verify VRF works
- [ ] Check winner gets payout
- [ ] Verify on BaseScan

### 6.2 Monitor

- [ ] Check contract events on BaseScan
- [ ] Monitor backend logs on Railway
- [ ] Monitor Vercel logs
- [ ] Check VRF subscription balance
- [ ] Set up alerts for low LINK balance

### 6.3 Security

- [ ] Smart contract is verified on BaseScan
- [ ] Game server private key is secure (use env vars, not committed)
- [ ] Owner key is in hardware wallet or secure location
- [ ] Rate limiting enabled on backend
- [ ] CORS configured correctly

---

## Ongoing Maintenance

### Monitor These:

1. **VRF Subscription Balance**
   - Check weekly at https://vrf.chain.link/
   - Top up when below 5 LINK

2. **Game Server Balance**
   - Monitor ETH balance of game server wallet
   - Top up when below 0.05 ETH

3. **Backend Uptime**
   - Set up uptime monitoring (UptimeRobot, etc.)
   - Get alerts if WebSocket goes down

4. **Error Logs**
   - Check Railway logs for errors
   - Check Vercel logs for frontend errors
   - Monitor contract events on BaseScan

### Emergency Procedures:

**If contract needs to pause:**
```bash
# If you implemented pausable
await poker.pause()
```

**If VRF runs out:**
- Games will fail to start
- Top up LINK immediately
- Check subscription status

**If backend goes down:**
- Games in progress may freeze
- Restart backend service
- Players can still withdraw from contract

---

## Cost Estimates

### One-Time Costs:
- Contract deployment: ~$5-20 (varies with gas)
- Initial LINK for VRF: ~$200 (10 LINK)

### Ongoing Monthly Costs:
- Backend hosting (Railway): $5-20
- VRF LINK usage: $5-50 (depends on game volume)
- Gas for game server: $10-50 (depends on # of hands)
- Frontend (Vercel): $0-20 (free tier usually sufficient)

**Total: ~$20-140/month** depending on usage

---

## Success Criteria

Your deployment is successful when:

- ✅ Contract is deployed and verified on Base Mainnet
- ✅ VRF is configured and funded
- ✅ Backend is deployed and accessible via WebSocket
- ✅ Frontend is deployed on Vercel
- ✅ Can play a full hand with real ETH
- ✅ Randomness works (VRF fulfills within 60 seconds)
- ✅ Payouts work correctly
- ✅ Farcaster frame works in Warpcast
- ✅ No errors in production logs
- ✅ All transactions succeed on BaseScan

---

## Need Help?

Check these docs:
- `VRF_SETUP.md` - Chainlink VRF setup
- `FARCASTER_SETUP.md` - Farcaster integration
- `DEPLOYMENT_GUIDE.md` - General deployment
- `SECURITY_ANALYSIS.md` - Security considerations

Good luck! 🚀
