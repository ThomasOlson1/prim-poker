"use client"

import { useEffect, useState, useCallback } from 'react'
import { useWebSocket } from './use-websocket'
import { useAccount } from 'wagmi'

export interface GameStateFromServer {
  gameId: string
  players: Record<string, {
    address: string
    stack: number
    bet: number
    folded: boolean
    isActive: boolean
  }>
  currentPlayer: string | null
  pot: number
  stage: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'
  communityCards: string[]
  dealerIndex: number
  handNumber: number
}

export interface TurnTimerUpdate {
  player: string
  timeLeft: number
  timestamp: number
}

export function useGameWebSocket(gameId: string | null) {
  const { isConnected, subscribe, unsubscribe, on, send } = useWebSocket()
  const { address } = useAccount()
  const [gameState, setGameState] = useState<GameStateFromServer | null>(null)
  const [turnTimer, setTurnTimer] = useState<TurnTimerUpdate | null>(null)
  const [isMyTurn, setIsMyTurn] = useState(false)

  // Subscribe to game when connected
  useEffect(() => {
    if (!isConnected || !gameId || !address) return

    console.log('🎮 Subscribing to game:', gameId, 'with address:', address)
    subscribe(gameId, address)

    return () => {
      console.log('🎮 Unsubscribing from game:', gameId)
      unsubscribe(gameId)
    }
  }, [isConnected, gameId, address, subscribe, unsubscribe])

  // Listen for game state updates
  useEffect(() => {
    if (!isConnected) return

    const unsubscribeGameState = on('game-state-update', (data: any) => {
      console.log('📊 Game state update:', data.state)
      setGameState(data.state)

      // Check if it's my turn
      if (address && data.state.currentPlayer === address.toLowerCase()) {
        setIsMyTurn(true)
      } else {
        setIsMyTurn(false)
      }
    })

    const unsubscribeTurnTimer = on('turn-timer', (data: any) => {
      console.log('⏰ Turn timer update:', data)
      setTurnTimer({
        player: data.player,
        timeLeft: data.timeLeft,
        timestamp: data.timestamp
      })
    })

    const unsubscribePlayerJoined = on('player-joined', (data: any) => {
      console.log('👤 Player joined:', data.address)
    })

    const unsubscribePlayerLeft = on('player-left', (data: any) => {
      console.log('👋 Player left:', data.address)
    })

    const unsubscribeHandStarted = on('hand-started', (data: any) => {
      console.log('🎲 Hand started:', data.handNumber)
    })

    const unsubscribeHandEnded = on('hand-ended', (data: any) => {
      console.log('🏆 Hand ended, winner:', data.winner)
    })

    const unsubscribeActionTaken = on('action-taken', (data: any) => {
      console.log('🎯 Action taken:', data.player, data.action)
    })

    const unsubscribeError = on('error', (data: any) => {
      console.error('🚫 Server error:', data.code, data.message)
      // You could also emit this to a global error handler or toast
    })

    return () => {
      unsubscribeGameState()
      unsubscribeTurnTimer()
      unsubscribePlayerJoined()
      unsubscribePlayerLeft()
      unsubscribeHandStarted()
      unsubscribeHandEnded()
      unsubscribeActionTaken()
      unsubscribeError()
    }
  }, [isConnected, address, on])

  // Send player action to backend
  const sendAction = useCallback((action: string, amount?: number) => {
    if (!isConnected || !gameId) {
      console.warn('Cannot send action: not connected or no gameId')
      return
    }

    console.log(`🎯 Sending action to server: ${action}`, amount)
    send({
      type: 'action',
      action,
      amount
    })
  }, [isConnected, gameId, send])

  return {
    gameState,
    turnTimer,
    isMyTurn,
    isConnected,
    sendAction,
  }
}
