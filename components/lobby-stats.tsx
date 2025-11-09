"use client"

import { Card } from "@/components/ui/card"
import { Users, Gamepad2, TrendingUp, Trophy } from "lucide-react"

interface LobbyStatsProps {
  totalGames: number
  activePlayers: number
  totalVolume: number
  topPlayer: string
}

export function LobbyStats({ totalGames, activePlayers, totalVolume, topPlayer }: LobbyStatsProps) {
  const stats = [
    {
      icon: Gamepad2,
      label: "Active Games",
      value: totalGames,
      color: "text-blue-400",
    },
    {
      icon: Users,
      label: "Players Online",
      value: activePlayers,
      color: "text-green-400",
    },
    {
      icon: TrendingUp,
      label: "Volume (24h)",
      value: `$${totalVolume}K`,
      color: "text-yellow-400",
    },
    {
      icon: Trophy,
      label: "Top Player",
      value: topPlayer,
      color: "text-purple-400",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {stats.map((stat, idx) => (
        <Card key={idx} className="bg-gradient-to-br from-slate-800 to-slate-900 border-purple-500/20 p-6">
          <div className="flex items-center gap-3">
            <stat.icon className={`w-8 h-8 ${stat.color}`} />
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
