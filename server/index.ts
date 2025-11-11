import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import cors from 'cors'
import { GameRoom } from './game-room'
import { TurnTimer } from './turn-timer'
import { ContractService } from './contract-service'

const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server })

// Middleware
app.use(cors())
app.use(express.json())

// Initialize contract service if environment variables are set
let contractService: ContractService | null = null
const rpcUrl = process.env.RPC_URL
const contractAddress = process.env.POKER_CONTRACT_ADDRESS
const gameServerPrivateKey = process.env.GAME_SERVER_PRIVATE_KEY

if (rpcUrl && contractAddress) {
  console.log('⛓️  Initializing contract service...')
  console.log(`   RPC URL: ${rpcUrl}`)
  console.log(`   Contract: ${contractAddress}`)
  contractService = new ContractService(rpcUrl, contractAddress, gameServerPrivateKey)

  // Listen for contract events
  contractService.onPlayerJoined(async (tableId, player, buyIn, seatIndex) => {
    console.log(`📢 Contract Event: Player ${player} joined table ${tableId}`)
    // Game room will be notified via WebSocket subscribe
  })

  contractService.onPlayerLeft(async (tableId, player, cashOut) => {
    console.log(`📢 Contract Event: Player ${player} left table ${tableId}`)
  })

  contractService.onHandStarted(async (tableId, handNumber, pot) => {
    console.log(`📢 Contract Event: Hand ${handNumber} started on table ${tableId}`)
  })

  contractService.onWinnerPaid(async (tableId, winner, amount) => {
    console.log(`📢 Contract Event: Winner ${winner} paid ${amount} on table ${tableId}`)
  })
} else {
  console.log('⚠️  Contract service not initialized (missing environment variables)')
  console.log('   Server will run in standalone mode without blockchain integration')
}

// Game rooms storage
const gameRooms = new Map<string, GameRoom>()

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  console.log('🔌 Client connected')

  let playerAddress: string | null = null
  let currentGameId: string | null = null

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString())
      console.log('📨 Received:', message.type, message)

      switch (message.type) {
        case 'authenticate':
          playerAddress = message.address
          ws.send(JSON.stringify({
            type: 'authenticated',
            address: playerAddress
          }))
          break

        case 'subscribe':
          const gameId = message.gameId
          const fid = message.fid  // Extract optional Farcaster ID from message
          currentGameId = gameId

          // 🛡️ OPTIONAL Farcaster authentication - warn if not provided but allow connection
          if (!fid || typeof fid !== 'number') {
            console.log(`⚠️  Player ${playerAddress} subscribing without FID (multi-account prevention disabled)`)
          }

          let room = gameRooms.get(gameId)
          if (!room) {
            room = new GameRoom(gameId, wss, contractService)
            gameRooms.set(gameId, room)
          }

          if (playerAddress) {
            try {
              await room.addPlayer(playerAddress, fid, ws)
              console.log(`✅ Player ${playerAddress}${fid ? ` (FID: ${fid})` : ''} subscribed to game ${gameId}`)
            } catch (error) {
              console.log(`🚫 Failed to add player: ${error}`)
              // Error message already sent by addPlayer
            }
          }
          break

        case 'unsubscribe':
          if (currentGameId && playerAddress) {
            const room = gameRooms.get(currentGameId)
            room?.removePlayer(playerAddress)
            console.log(`❌ Player ${playerAddress} unsubscribed from game ${currentGameId}`)
          }
          currentGameId = null
          break

        case 'action':
          if (currentGameId && playerAddress) {
            const room = gameRooms.get(currentGameId)
            await room?.handleAction(playerAddress, message.action, message.amount)
          }
          break

        case 'start-hand':
          if (currentGameId) {
            const room = gameRooms.get(currentGameId)
            room?.startHand()
          }
          break

        default:
          console.log('❓ Unknown message type:', message.type)
      }
    } catch (error) {
      console.error('❌ Error handling message:', error)
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }))
    }
  })

  ws.on('close', () => {
    console.log('🔌 Client disconnected')
    if (currentGameId && playerAddress) {
      const room = gameRooms.get(currentGameId)
      room?.removePlayer(playerAddress)
    }
  })

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error)
  })
})

// REST API endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    rooms: gameRooms.size,
    uptime: process.uptime()
  })
})

app.get('/api/rooms', (req, res) => {
  const rooms = Array.from(gameRooms.entries()).map(([id, room]) => ({
    id,
    players: room.getPlayerCount(),
    state: room.getGameState()
  }))
  res.json(rooms)
})

app.post('/api/rooms/:gameId/start', (req, res) => {
  const { gameId } = req.params
  const room = gameRooms.get(gameId)

  if (!room) {
    return res.status(404).json({ error: 'Room not found' })
  }

  room.startHand()
  res.json({ success: true })
})

// Start server
const PORT = process.env.PORT || 8080
server.listen(PORT, () => {
  console.log(`🚀 WebSocket server running on port ${PORT}`)
  console.log(`   WebSocket: ws://localhost:${PORT}`)
  console.log(`   HTTP API:  http://localhost:${PORT}/api`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down...')
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})
