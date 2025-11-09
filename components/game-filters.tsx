"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Filter, X } from "lucide-react"

interface GameFiltersProps {
  onFiltersChange: (filters: GameFilters) => void
}

export interface GameFilters {
  stakes: "all" | "micro" | "low" | "mid" | "high"
  playerCount: "all" | "2-4" | "4-6"
  gameType: "all" | "cash" | "tournament"
}

export function GameFilters({ onFiltersChange }: GameFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filters, setFilters] = useState<GameFilters>({
    stakes: "all",
    playerCount: "all",
    gameType: "cash",
  })

  const handleFilterChange = (key: keyof GameFilters, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const resetFilters = () => {
    const defaultFilters: GameFilters = {
      stakes: "all",
      playerCount: "all",
      gameType: "cash",
    }
    setFilters(defaultFilters)
    onFiltersChange(defaultFilters)
  }

  const activeFilters = Object.entries(filters).filter(([, v]) => v !== "all" && v !== "cash").length

  return (
    <div className="relative">
      <Button onClick={() => setIsOpen(!isOpen)} className="bg-slate-700 hover:bg-slate-600 gap-2" variant="outline">
        <Filter className="w-4 h-4" />
        Filters
        {activeFilters > 0 && (
          <span className="ml-1 px-2 py-1 bg-purple-600 rounded-full text-xs">{activeFilters}</span>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute top-full mt-2 w-72 bg-slate-800 border-purple-500/20 p-4 z-10">
          <div className="space-y-4">
            {/* Stakes Filter */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Stakes</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "All", value: "all" },
                  { label: "Micro (0.01/0.02)", value: "micro" },
                  { label: "Low (0.1/0.2)", value: "low" },
                  { label: "Mid (1/2)", value: "mid" },
                  { label: "High (5+)", value: "high" },
                ].map((option) => (
                  <Button
                    key={option.value}
                    onClick={() => handleFilterChange("stakes", option.value)}
                    size="sm"
                    variant={filters.stakes === option.value ? "default" : "outline"}
                    className="text-xs"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Player Count Filter */}
            <div className="border-t border-slate-700 pt-4">
              <h3 className="text-sm font-semibold text-white mb-2">Players</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "All", value: "all" },
                  { label: "2-4 Players", value: "2-4" },
                  { label: "4-6 Players", value: "4-6" },
                ].map((option) => (
                  <Button
                    key={option.value}
                    onClick={() => handleFilterChange("playerCount", option.value)}
                    size="sm"
                    variant={filters.playerCount === option.value ? "default" : "outline"}
                    className="text-xs"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Reset Button */}
            {activeFilters > 0 && (
              <Button onClick={resetFilters} variant="ghost" size="sm" className="w-full text-xs text-gray-400 gap-1">
                <X className="w-3 h-3" />
                Reset Filters
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
