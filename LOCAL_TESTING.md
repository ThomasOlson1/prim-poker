# Local Testing Guide

This guide will help you test your poker application locally with different player counts (2-9 players).

## Quick Start

### 1. Install Dependencies (Already Done!)
```bash
# Frontend dependencies
npm install

# Server dependencies
cd server && npm install
```

### 2. Environment Setup (Already Done!)
Environment files have been created:
- `.env.local` - Frontend configuration
- `server/.env` - Server configuration

### 3. Start the Development Servers

You'll need **3 terminal windows**:

#### Terminal 1: Start the WebSocket Server
```bash
npm run server:dev
```
This starts the WebSocket server on port 8080.

#### Terminal 2: Start the Frontend
```bash
npm run dev
```
This starts the Next.js frontend on port 3000.

#### Terminal 3 (Optional): Local Blockchain
```bash
# Only needed if testing with actual blockchain integration
npm run hardhat:node
```

## Testing Different Player Counts

### Understanding the Contract Limits
- **Maximum Players**: 9 (hardcoded in the smart contract)
- **Minimum Players**: 2 (to start a game)

### UI Changes Made
1. **Dynamic Player Count Badge**: Now shows actual player count instead of hardcoded "6P"
   - Example: "👥 2P", "👥 6P", "👥 9P"

2. **Responsive Grid Layout**: Adapts based on player count
   - 2-4 players: 2-column grid
   - 5-6 players: 3-column grid
   - 7-9 players: 3-column grid (with balanced rows)

### How to Test Multiple Players Locally

Since you're testing locally, you have a few options:

#### Option 1: Multiple Browser Windows/Tabs
1. Open your app at `http://localhost:3000`
2. Open additional incognito/private windows
3. Connect each with a different wallet address
4. Join the same game from each window

#### Option 2: Multiple Devices on Same Network
1. Find your local IP: `ifconfig` (Mac/Linux) or `ipconfig` (Windows)
2. Access app from other devices: `http://YOUR_IP:3000`
3. Each device can connect with a different wallet

#### Option 3: Browser Profiles
1. Create multiple browser profiles (Chrome/Firefox)
2. Each profile can have a different wallet extension
3. Open the app in each profile

### Test Scenarios

#### ✅ 2-Player Game
- Minimum viable game
- Tests: Heads-up poker logic
- Grid: 2 columns

#### ✅ 6-Player Game
- Most common table size
- Tests: Full table dynamics
- Grid: 3 columns, 2 rows

#### ⚠️ 7-9 Player Games
- **CRITICAL TO TEST**: These are prone to UI issues
- Tests: Maximum capacity, grid overflow
- Grid: 3 columns, 3 rows (with 7-8 having incomplete last row)

### What to Look For During Testing

1. **Player Card Display**
   - Are all players visible?
   - Is text truncated properly?
   - Are position badges (D, SB, BB) showing correctly?

2. **Grid Layout**
   - Does it look balanced?
   - Are there awkward gaps?
   - Is it readable on mobile?

3. **Player Count Badge**
   - Does it show correct count (e.g., "👥 7P" for 7 players)?

4. **Responsive Design**
   - Test on different screen sizes
   - Test on mobile (or use browser dev tools)

5. **Game State Updates**
   - Do all players see the same pot?
   - Do community cards update correctly?
   - Are turn indicators working?

## Known Issues & Limitations

### Contract Level (Cannot Change Without Redeploy)
- **9-player maximum**: Hardcoded in `contracts/PokerFlatGasFee.sol:51`
  ```solidity
  address[9] players;  // Fixed-size array
  ```

### UI Issues Fixed
- ✅ Player count badge is now dynamic
- ✅ Grid layout adapts to player count
- ⚠️ Still uses 3-column max (could be improved for 7-9 players)

### Recommended Future Improvements
1. **4-column grid for 8+ players** for better balance
2. **Circular table layout** (instead of grid) for visual appeal
3. **Player name/username support** instead of just address
4. **Better mobile responsiveness** for large games

## Testing Checklist

- [ ] Start WebSocket server (`npm run server:dev`)
- [ ] Start frontend (`npm run dev`)
- [ ] Connect with wallet
- [ ] Create a game
- [ ] Open multiple browser windows/profiles
- [ ] Join same game with different wallets
- [ ] Test with 2 players
- [ ] Test with 6 players
- [ ] **Test with 7+ players** (most important!)
- [ ] Check player count badge updates
- [ ] Check grid layout looks good
- [ ] Check on mobile view
- [ ] Test game actions (fold, call, raise)

## Troubleshooting

### WebSocket won't connect
- Check `server/.env` has correct PORT (8080)
- Check `.env.local` has `NEXT_PUBLIC_WS_URL=ws://localhost:8080`
- Restart the server

### Players not showing up
- Check WebSocket connection in browser console
- Verify game ID is correct
- Check server logs for errors

### UI looks broken with many players
- This is expected without the fixes above
- The fixes should handle 2-9 players reasonably well
- For production, consider circular layout

## Need Help?

Check the server logs and browser console for errors. Most issues are related to:
1. WebSocket connection (check URLs in env files)
2. Wallet connection (make sure MetaMask/wallet is installed)
3. Contract address (for blockchain testing)

Happy testing! 🃏
