import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { NotificationsPanel } from "@/components/notifications-panel"
import { RootProvider } from "./rootProvider"
import './globals.css'

const ROOT_URL = process.env.NEXT_PUBLIC_URL || "https://prim-poker.vercel.app";

// Farcaster Mini App Embed configuration
const farcasterEmbed = {
  version: "1",
  imageUrl: `${ROOT_URL}/hero-poker-1200x630.jpg`,
  button: {
    title: "🎰 Play Poker",
    action: {
      type: "launch_frame",
      name: "Prim's Poker",
      url: ROOT_URL,
      splashImageUrl: `${ROOT_URL}/splash.jpg`,
      splashBackgroundColor: "#0f172a",
    },
  },
};

export const metadata: Metadata = {
  title: "Prim's Poker - Turn-Based Cash Games",
  description:
    "Play turn-based Texas Hold'em on Farcaster with variable timing (1 min to 3 hours per turn). Real-time notifications, cash games, and crypto-native gameplay.",
  generator: "v0.app",
  openGraph: {
    title: "Prim's Poker",
    description: "Turn-based Texas Hold'em mini dapp on Farcaster",
    url: ROOT_URL,
    siteName: "Prim's Poker",
    images: [
      {
        url: "/hero-poker-1200x630.jpg",
        width: 1200,
        height: 630,
        alt: "Prim's Poker",
      },
    ],
    type: "website",
  },
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
  other: {
    // Farcaster Mini App Embed meta tags
    "fc:miniapp": JSON.stringify(farcasterEmbed),
    // Backward compatibility for legacy Mini Apps
    "fc:frame": JSON.stringify(farcasterEmbed),
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <RootProvider>
          {children}
          <NotificationsPanel />
          <Analytics />
        </RootProvider>
      </body>
    </html>
  )
}
