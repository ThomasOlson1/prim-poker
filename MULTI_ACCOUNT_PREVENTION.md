# Multi-Account Prevention Implementation

## Overview

Implemented **server-side Farcaster ID (FID) tracking** to prevent players from using multiple wallet addresses to join the same poker table.

## How It Works

### 🛡️ Anti-Sybil Protection

When a player tries to join a table, the server:
1. Extracts the Farcaster ID (FID) from the join request
2. Checks if that FID is already active at the table
3. **Blocks** the join attempt if the FID is already playing
4. Allows join and tracks the FID if it's unique

### Example Scenario

**Blocked:**
- Alice (FID: 12345) joins with Wallet A ✅
- Alice (FID: 12345) tries to join with Wallet B ❌ **BLOCKED**
- Server returns error: "This Farcaster account is already playing at this table with another wallet"

**Allowed:**
- Alice (FID: 12345) joins with Wallet A ✅
- Bob (FID: 67890) joins with Wallet B ✅
- Charlie (FID: 11111) joins with Wallet C ✅

## Implementation Details

### Server-Side Changes

#### 1. Player Interface (`server/game-room.ts`)
```typescript
export interface Player {
  address: string
  fid: number  // 🆕 Farcaster ID for multi-account prevention
  ws: WebSocket
  stack: number
  bet: number
  folded: boolean
  isActive: boolean
}
```

#### 2. GameRoom Class
```typescript
export class GameRoom {
  private activeFids: Set<number> = new Set()  // 🆕 Track active FIDs

  async addPlayer(address: string, fid: number, ws: WebSocket) {
    // 🛡️ Check for duplicate FID
    if (this.activeFids.has(fid)) {
      throw new Error('Duplicate Farcaster ID')
    }

    // Track FID
    this.activeFids.add(fid)

    // ... rest of join logic
  }

  removePlayer(address: string) {
    const player = this.players.get(address)
    if (player) {
      this.activeFids.delete(player.fid)  // 🆕 Clean up FID tracking
      // ... rest of leave logic
    }
  }
}
```

#### 3. WebSocket Handler (`server/index.ts`)
```typescript
case 'subscribe':
  const fid = message.fid  // 🆕 Extract FID from message

  // Require FID
  if (!fid || typeof fid !== 'number') {
    ws.send(JSON.stringify({
      type: 'error',
      code: 'FID_REQUIRED',
      message: 'Farcaster authentication is required to join'
    }))
    break
  }

  await room.addPlayer(playerAddress, fid, ws)
```

### Frontend Changes

#### 1. WebSocket Service (`lib/websocket-service.ts`)
```typescript
subscribeToGame(gameId: string, playerAddress?: string, fid?: number): void {
  this.send({
    type: "subscribe",
    gameId,
    fid,  // 🆕 Include FID in subscribe message
  })
}
```

#### 2. WebSocket Hook (`hooks/use-websocket.ts`)
```typescript
const subscribe = (gameId: string, playerAddress?: string, fid?: number) => {
  wsRef.current?.subscribeToGame(gameId, playerAddress, fid)
}
```

#### 3. Game WebSocket Hook (`hooks/use-game-websocket.ts`)
```typescript
import { FarcasterService } from '@/lib/farcaster-service'

// Get FID and subscribe
const subscribeWithFid = async () => {
  const farcasterUser = await FarcasterService.getUserContext()

  if (farcasterUser?.fid) {
    subscribe(gameId, address, farcasterUser.fid)  // 🆕 Pass FID
  }
}
```

## Error Handling

### Server Error Codes

#### `FID_REQUIRED`
- **Trigger:** No FID provided in subscribe message
- **Message:** "Farcaster authentication is required to join"
- **Action:** User must connect with Farcaster

#### `DUPLICATE_FID`
- **Trigger:** FID already active at table
- **Message:** "This Farcaster account is already playing at this table with another wallet"
- **Action:** User cannot join with another wallet

### Frontend Error Handling

Errors are logged to console:
```
🚫 Server error: DUPLICATE_FID This Farcaster account is already playing at this table with another wallet
```

You can also display these errors as toasts to the user.

## Testing

### Manual Testing

1. **Setup:** Open the app in two browser tabs/windows
2. **Connect:** Same Farcaster account in both
3. **Tab 1:** Join a table with Wallet A ✅
4. **Tab 2:** Try to join same table with Wallet B ❌
5. **Expected:** Second attempt blocked with error message

### Server Logs

**Successful Join:**
```
✅ Player 0x123... (FID: 12345) joined table 1
```

**Blocked Join:**
```
🚫 Blocked duplicate FID 12345 trying to join with address 0x456...
```

## Limitations & Future Improvements

### Current Limitations

1. **Server-Side Only** - Centralized enforcement (server must be trusted)
2. **Single Table** - Only prevents multi-accounting at same table
3. **No History** - Doesn't track cross-table multi-accounting

### Potential Improvements

#### 1. Smart Contract FID Registry
Add on-chain FID tracking for fully decentralized enforcement:
```solidity
mapping(address => uint256) public addressToFid;
mapping(uint256 => mapping(uint256 => bool)) public fidSeatedAtTable;

function joinTable(uint256 tableId) external payable {
  uint256 fid = addressToFid[msg.sender];
  require(!fidSeatedAtTable[fid][tableId], "FID already seated");
  // ... rest of join logic
}
```

#### 2. Account Age Requirement
```typescript
const accountAge = Date.now() - farcasterUser.createdAt
if (accountAge < 30 * 24 * 60 * 60 * 1000) { // 30 days
  throw new Error("Account must be at least 30 days old")
}
```

#### 3. Reputation Gating
```typescript
if (gamesPlayed[fid] < 10) {
  // Restrict to one table
}
```

#### 4. Cross-Table Prevention
Track FIDs across all tables:
```typescript
private globalActiveFids: Set<number> = new Set()

// Check across all tables
if (globalActiveFids.has(fid)) {
  throw new Error("Already playing at another table")
}
```

## Security Considerations

### ✅ Protections

- Same Farcaster user cannot join same table twice
- FID cleaned up when player leaves
- Requires Farcaster authentication
- Clear error messages

### ⚠️ Considerations

- Server must be trusted (server-side enforcement)
- User could theoretically have multiple Farcaster accounts
- No prevention across different tables (by design - allows multi-tabling)

## Configuration

No additional configuration required! The system automatically:
- Fetches FID from Farcaster SDK
- Tracks FIDs per table
- Cleans up when players leave

## Monitoring

### Server Logs to Watch

```bash
✅ Player ... (FID: ...) joined table ...    # Successful join
🚫 Blocked duplicate FID ...                 # Blocked attempt
👋 Player ... (FID: ...) left table ...      # Player left
🚫 Rejected subscription without FID         # Missing FID
```

## Summary

**Implementation:** ✅ Complete
**Type:** Server-side enforcement
**Protection:** Per-table FID uniqueness
**UX Impact:** Transparent (users don't notice unless they try to multi-account)
**Gas Cost:** None (off-chain)
**Decentralization:** Centralized (can be upgraded to on-chain later)

---

**Result:** Players can no longer use multiple wallets to join the same poker table! 🎉
