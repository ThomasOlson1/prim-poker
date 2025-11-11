"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useEthPrice, useCurrentGasFee } from "@/hooks/use-poker-contract"

interface CreateGameModalProps {
  onClose: () => void
  onCreate: (gameData: {
    name: string
    buyInDollars: number
    blindLevel: string
    turnTimeMinutes: number
    maxPlayers: number
  }) => void
  loading?: boolean
}

export function CreateGameModal({ onClose, onCreate, loading }: CreateGameModalProps) {
  const [name, setName] = useState("My Game")
  const [buyInDollars, setBuyInDollars] = useState(100)
  const [blindLevel, setBlindLevel] = useState("1/2")
  const [turnTimeMinutes, setTurnTimeMinutes] = useState(3)
  const [maxPlayers, setMaxPlayers] = useState(6)
  const { ethPrice } = useEthPrice()
  const { gasFee } = useCurrentGasFee()

  // Convert dollar amount to ETH with proper rounding to avoid precision issues
  const dollarToEth = (dollars: number): number => {
    if (!ethPrice) return dollars / 3000 // Fallback if price not loaded (~$3000 per ETH)
    // Round to 8 decimal places to avoid floating point precision errors
    return Math.round((dollars / ethPrice) * 1e8) / 1e8
  }

  // Format ETH amount for display
  const formatEth = (dollars: number): string => {
    const eth = dollarToEth(dollars)
    if (eth >= 0.01) {
      return eth.toFixed(4)
    } else {
      return eth.toFixed(6)
    }
  }

  const BLIND_LEVELS = [
    { value: "0.01/0.02", smallBlind: 0.01, bigBlind: 0.02 },
    { value: "0.05/0.1", smallBlind: 0.05, bigBlind: 0.1 },
    { value: "0.1/0.2", smallBlind: 0.1, bigBlind: 0.2 },
    { value: "0.5/1", smallBlind: 0.5, bigBlind: 1 },
    { value: "1/2", smallBlind: 1, bigBlind: 2 },
    { value: "2/5", smallBlind: 2, bigBlind: 5 },
    { value: "5/10", smallBlind: 5, bigBlind: 10 },
    { value: "10/20", smallBlind: 10, bigBlind: 20 },
    { value: "25/50", smallBlind: 25, bigBlind: 50 },
    { value: "50/100", smallBlind: 50, bigBlind: 100 },
    { value: "100/200", smallBlind: 100, bigBlind: 200 },
  ]

  // Calculate buy-in constraints based on blind level (50bb-200bb)
  const getBigBlind = (blindLevel: string) => {
    const parts = blindLevel.split("/")
    return parseFloat(parts[1])
  }

  const bigBlind = getBigBlind(blindLevel)
  const minBuyIn = bigBlind * 50  // 50 big blinds in dollars
  const maxBuyIn = bigBlind * 200 // 200 big blinds in dollars

  // Adjust buy-in when blind level changes
  useEffect(() => {
    if (buyInDollars < minBuyIn) {
      setBuyInDollars(minBuyIn)
    } else if (buyInDollars > maxBuyIn) {
      setBuyInDollars(maxBuyIn)
    }
  }, [blindLevel, minBuyIn, maxBuyIn, buyInDollars])

  const handleSubmit = () => {
    onCreate({
      name,
      buyInDollars,
      blindLevel,
      turnTimeMinutes,
      maxPlayers,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="bg-slate-800 border-purple-500/20 p-6 w-full max-w-sm">
        <h2 className="text-xl font-bold text-white mb-4">Create New Game</h2>

        <div className="space-y-4">
          {/* Game Name */}
          <div>
            <label className="text-xs text-gray-300 font-semibold">Game Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 bg-slate-700 border border-purple-500/20 rounded px-3 py-2 text-white text-sm"
            />
          </div>

          {/* Buy In Dollars */}
          <div>
            <label className="text-xs text-gray-300 font-semibold">
              Buy In: ${buyInDollars.toFixed(2)} ({(buyInDollars / bigBlind).toFixed(0)}bb)
            </label>
            <input
              type="range"
              min={minBuyIn}
              max={maxBuyIn}
              step={bigBlind}
              value={buyInDollars}
              onChange={(e) => setBuyInDollars(Number(e.target.value))}
              className="w-full mt-1"
            />
            <div className="text-xs text-gray-500 mt-1">
              Range: ${minBuyIn.toFixed(2)} (50bb) - ${maxBuyIn.toFixed(2)} (200bb)
            </div>
            {ethPrice && (
              <div className="text-xs text-purple-400 mt-1">
                ≈ {formatEth(buyInDollars)} ETH
              </div>
            )}
          </div>

          {/* Blind Level Selector */}
          <div>
            <label className="text-xs text-gray-300 font-semibold">Blind Level</label>
            <select
              value={blindLevel}
              onChange={(e) => setBlindLevel(e.target.value)}
              className="w-full mt-1 bg-slate-700 border border-purple-500/20 rounded px-3 py-2 text-white text-sm"
            >
              {BLIND_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  ${level.value} ({formatEth(level.smallBlind)}/{formatEth(level.bigBlind)} ETH)
                </option>
              ))}
            </select>
            {ethPrice && (
              <div className="text-xs text-gray-500 mt-1">
                1 USD = {(1 / ethPrice).toFixed(6)} ETH (ETH @ ${ethPrice.toFixed(2)})
              </div>
            )}
          </div>

          {/* Fee Breakdown */}
          {gasFee && ethPrice && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3">
              <div className="text-xs font-semibold text-amber-300 mb-2">💰 Fee Structure (Per Hand)</div>
              <div className="space-y-1 text-xs text-gray-300">
                <div className="flex justify-between">
                  <span>Blinds Posted:</span>
                  <span className="text-white">${getBigBlind(blindLevel) * 1.5} ({blindLevel})</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee:</span>
                  <span className="text-amber-400">
                    ${(Number(gasFee) / 1e18 * ethPrice).toFixed(2)}
                    <span className="text-gray-500 ml-1">({(Number(gasFee) / 1e18).toFixed(6)} ETH)</span>
                  </span>
                </div>
                <div className="border-t border-amber-500/20 my-1 pt-1"></div>
                <div className="flex justify-between font-semibold">
                  <span>To Pot:</span>
                  <span className="text-green-400">
                    ${(getBigBlind(blindLevel) * 1.5 - (Number(gasFee) / 1e18 * ethPrice)).toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-2 italic">
                Fee covers gas + VRF + $0.20 markup
              </div>
            </div>
          )}

          {/* Turn Time */}
          <div>
            <label className="text-xs text-gray-300 font-semibold">Turn Time: {turnTimeMinutes} min</label>
            <input
              type="range"
              min="1"
              max="180"
              step="1"
              value={turnTimeMinutes}
              onChange={(e) => setTurnTimeMinutes(Number(e.target.value))}
              className="w-full mt-1"
            />
            <div className="text-xs text-gray-500 mt-1">Range: 1 min - 3 hours</div>
          </div>

          {/* Max Players */}
          <div>
            <label className="text-xs text-gray-300 font-semibold">Max Players: {maxPlayers}</label>
            <input
              type="range"
              min="4"
              max="9"
              step="1"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full mt-1"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-gray-500/30 text-gray-300 bg-transparent"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-green-600 hover:bg-green-700"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Game"}
          </Button>
        </div>
      </Card>
    </div>
  )
}
