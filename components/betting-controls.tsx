"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { ChevronDown, ChevronUp } from "lucide-react"

interface BettingControlsProps {
  playerStack: number
  currentBet: number
  minBet: number
  maxBet: number
  onFold: () => void
  onCheck: () => void
  onCall: (amount: number) => void
  onRaise: (amount: number) => void
  isYourTurn: boolean
}

export function BettingControls({
  playerStack,
  currentBet,
  minBet,
  maxBet,
  onFold,
  onCheck,
  onCall,
  onRaise,
  isYourTurn,
}: BettingControlsProps) {
  const [betAmount, setBetAmount] = useState(currentBet)
  const [isExpanded, setIsExpanded] = useState(false)
  const callAmount = Math.min(currentBet, playerStack)
  const remainingStack = playerStack - betAmount
  const isValidBet = betAmount >= minBet && betAmount <= maxBet

  const quickBets = [
    { label: "1/4 Pot", value: Math.floor(currentBet * 0.25) },
    { label: "1/2 Pot", value: Math.floor(currentBet * 0.5) },
    { label: "Pot", value: currentBet },
    { label: "All-in", value: playerStack },
  ]

  return (
    <Card className="bg-slate-800 border-purple-500/20 p-6">
      <div className="space-y-4">
        {/* Primary Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            onClick={onFold}
            disabled={!isYourTurn}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
            size="lg"
          >
            Fold
          </Button>
          <Button
            onClick={() => onCheck()}
            disabled={!isYourTurn || currentBet > 0}
            className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50"
            size="lg"
          >
            Check
          </Button>
          <Button
            onClick={() => onCall(callAmount)}
            disabled={!isYourTurn}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            size="lg"
          >
            Call
            <span className="text-xs ml-1">${callAmount}</span>
          </Button>
        </div>

        {/* Expandable Betting Section */}
        <div className="border-t border-slate-700 pt-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between text-white hover:text-purple-400 transition-colors"
          >
            <span className="font-semibold">Betting Options</span>
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {isExpanded && (
            <div className="space-y-4 mt-4">
              {/* Bet Amount Display */}
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-gray-400">Raise To</label>
                  <span className="text-xl font-bold text-purple-400">${betAmount}</span>
                </div>
                <Slider
                  value={[betAmount]}
                  onValueChange={(val: number[]) => setBetAmount(val[0])}
                  min={minBet}
                  max={maxBet}
                  step={5}
                  disabled={!isYourTurn}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>${minBet}</span>
                  <span>${maxBet}</span>
                </div>
              </div>

              {/* Stack Info */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-slate-700/50 rounded p-2">
                  <p className="text-gray-400">Your Stack</p>
                  <p className="text-white font-bold">${playerStack}</p>
                </div>
                <div className="bg-slate-700/50 rounded p-2">
                  <p className="text-gray-400">After Bet</p>
                  <p className="text-purple-400 font-bold">${Math.max(0, remainingStack)}</p>
                </div>
              </div>

              {/* Quick Bet Buttons */}
              <div className="grid grid-cols-2 gap-2">
                {quickBets.map((bet) => (
                  <Button
                    key={bet.label}
                    onClick={() => setBetAmount(bet.value)}
                    disabled={!isYourTurn || bet.value > maxBet}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    {bet.label}
                    <span className="text-xs ml-1">${bet.value}</span>
                  </Button>
                ))}
              </div>

              {/* Raise Button */}
              <Button
                onClick={() => onRaise(betAmount)}
                disabled={!isYourTurn || !isValidBet}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                size="lg"
              >
                Raise to ${betAmount}
              </Button>
            </div>
          )}
        </div>

        {/* Turn Timer */}
        <div className="text-xs text-gray-500 text-center">
          {isYourTurn ? (
            <span className="text-yellow-400 font-semibold">Your turn - Make a decision</span>
          ) : (
            <span>Waiting for opponent...</span>
          )}
        </div>
      </div>
    </Card>
  )
}
