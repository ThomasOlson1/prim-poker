# Setup Instructions - Create Game Button Fix

## Issue

The "Create Game" button doesn't work because the poker smart contract address is not configured.

## Root Cause

The application requires a deployed poker contract, but `NEXT_PUBLIC_POKER_CONTRACT_ADDRESS` is not set in the environment variables.

## Solution

You need to deploy the poker contract and configure the contract address. Choose one of the following options:

---

## Option 1: Deploy to Local Hardhat Network (Recommended for Development)

This is the fastest way to get started for local development.

### Steps:

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Start a local Hardhat node** (in a separate terminal):
   ```bash
   npx hardhat node
   ```

   Keep this terminal open. It will show you test accounts with 10,000 ETH each.

3. **Deploy the contract** (in another terminal):
   ```bash
   npx hardhat run scripts/deploy.ts --network localhost
   ```

   The script will output something like:
   ```
   ✅ PokerFlatGasFee deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3

   📝 Save this contract address to your .env file:
   NEXT_PUBLIC_POKER_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
   ```

4. **Copy the contract address** and update `.env.local`:
   ```bash
   NEXT_PUBLIC_POKER_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
   ```

5. **Restart your Next.js dev server** to pick up the new environment variable:
   ```bash
   npm run dev
   ```

6. **Connect your wallet to localhost network**:
   - Open MetaMask (or your wallet)
   - Add a custom network:
     - Network Name: Hardhat Local
     - RPC URL: http://127.0.0.1:8545
     - Chain ID: 31337
     - Currency Symbol: ETH
   - Import one of the test accounts using the private key shown in the Hardhat node terminal

7. **Test the Create Game button** - it should now work!

---

## Option 2: Deploy to Base Sepolia Testnet (Recommended for Testing)

Use this option if you want to test on a real testnet.

### Prerequisites:
- Base Sepolia ETH (get from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet))
- A wallet with a private key

### Steps:

1. **Create a `.env` file** (NOT `.env.local`) in the project root:
   ```bash
   PRIVATE_KEY=your_private_key_here
   ```

   ⚠️ **IMPORTANT**: Never commit this file! It's already in `.gitignore`.

2. **Deploy to Base Sepolia**:
   ```bash
   npm run deploy:base-sepolia
   ```

3. **Copy the contract address** and add it to `.env.local`:
   ```bash
   NEXT_PUBLIC_POKER_CONTRACT_ADDRESS=<deployed_contract_address>
   ```

4. **Restart your Next.js dev server**:
   ```bash
   npm run dev
   ```

5. **Connect your wallet to Base Sepolia**:
   - Network Name: Base Sepolia
   - RPC URL: https://sepolia.base.org
   - Chain ID: 84532
   - Currency Symbol: ETH

6. **Test the Create Game button**!

---

## Option 3: Use an Existing Deployed Contract

If a contract is already deployed to Base Sepolia or Base Mainnet, you can use it directly.

### Steps:

1. **Get the contract address** from your team or deployment records

2. **Update `.env.local`**:
   ```bash
   NEXT_PUBLIC_POKER_CONTRACT_ADDRESS=<existing_contract_address>
   ```

3. **Restart your Next.js dev server**:
   ```bash
   npm run dev
   ```

---

## Verifying the Fix

Once you've set up the contract address:

1. Open the app in your browser
2. Connect your wallet
3. Click the "+ Create New Game" button
4. Fill out the game settings
5. Click "Create Game"

You should see:
- A loading state ("Creating...")
- A toast notification: "Table Created! Table X created successfully."
- The app should navigate to the game screen

If you see an error like "Contract address not configured", restart your Next.js dev server to ensure it picks up the new environment variable.

---

## Troubleshooting

### "Contract address not configured" error
- Make sure `NEXT_PUBLIC_POKER_CONTRACT_ADDRESS` is set in `.env.local`
- Restart your Next.js dev server (`npm run dev`)
- Verify the variable is set by adding `console.log(process.env.NEXT_PUBLIC_POKER_CONTRACT_ADDRESS)` temporarily

### Transaction fails
- Make sure you're connected to the correct network (localhost, Base Sepolia, or Base)
- Ensure your wallet has enough ETH for gas fees
- Check the browser console for detailed error messages

### Hardhat node connection issues
- Make sure the Hardhat node is running in a separate terminal
- Verify the RPC URL is `http://127.0.0.1:8545`
- Try restarting the Hardhat node

---

## Additional Configuration

You may also want to set these environment variables in `.env.local`:

```bash
# OnchainKit API Key (for wallet features)
# Get from: https://portal.cdp.coinbase.com/
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_api_key_here

# WebSocket URL (for real-time game updates)
NEXT_PUBLIC_WS_URL=ws://localhost:8080

# Application URL
NEXT_PUBLIC_URL=http://localhost:3000
```

---

## Files Modified

- `.env.local` - Created with environment configuration
- `components/poker-game-app.tsx` - Added validation for contract address
- `SETUP_INSTRUCTIONS.md` - This file (setup guide)

---

## Next Steps

After setting up the contract:

1. **Start the WebSocket server** (for real-time game features):
   ```bash
   cd server
   npm install
   npm run dev
   ```

2. **Test all game features**:
   - Create a game
   - Join a game
   - Play hands
   - Test betting actions

---

## Support

If you encounter any issues, check:
- Browser console for error messages
- Next.js dev server logs
- Hardhat node logs (if using local network)
- Network connection in your wallet

For more details on the contract, see `contracts/PokerFlatGasFee.sol`.
