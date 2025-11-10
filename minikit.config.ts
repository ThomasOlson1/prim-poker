const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
  "http://localhost:3000";

/**
 * MiniApp configuration object. Must follow the mini app manifest specification.
 *
 * @see {@link https://docs.base.org/mini-apps/features/manifest}
 */
export const minikitConfig = {
  accountAssociation: {
    header: "eyJmaWQiOjE0NDk3NzIsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgyRTJkNDgxNzBiRDZCYUQ1ZTczNDg5NkQ4MUJjZjhlODJlNjNlNTlhIn0",
    payload: "eyJkb21haW4iOiJwcmltLXBva2VyLnZlcmNlbC5hcHAifQ",
    signature: "MHg2MGI1ZTFjNzEwYzE4YzQ4MWNkY2FjMjgxMTMyNjU4YWE2NjRmOGFhZDM2NGQ1MWRmNjc4NTUxMzVhOTM1N2IzNThjMjU3MDcyZGU3YTExYTI2ZTFjOTYzZTRhOTRjNjM1ODZmZGJlYWY1ZDkzNmIyMjQ2NTdhMmVhMGY2MmY3MjFi",
  },
  baseBuilder: {
    ownerAddress: "",
  },
  miniapp: {
    version: "1",
    name: "Prim's Poker",
    subtitle: "Turn-based poker game on Base",
    description: "Play turn-based poker with friends on Farcaster. Bet with ETH, get real-time notifications, and enjoy a seamless on-chain gaming experience.",
    // screenshotUrls: Portrait screenshots (1284x2778)
    screenshotUrls: [`${ROOT_URL}/screenshot-portrait.jpg`],
    // iconUrl: Must be 1024x1024 PNG (no alpha)
    iconUrl: `${ROOT_URL}/icon-1024x1024.png`,
    // splashImageUrl: Must be 200x200px
    splashImageUrl: `${ROOT_URL}/splash.jpg`,
    splashBackgroundColor: "#0f172a",
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "games",
    tags: ["poker", "gaming", "social", "betting", "eth"],
    // heroImageUrl: 1200x630 (1.91:1 ratio)
    heroImageUrl: `${ROOT_URL}/hero-poker-1200x630.jpg`,
    tagline: "Deal, Bet, Win - On-chain Poker for Farcaster",
    ogTitle: "Prim's Poker - Turn-based Poker on Base",
    ogDescription: "Play turn-based poker with friends on Farcaster. Bet with ETH and get real-time notifications.",
    // ogImageUrl: 1200x630 PNG (1.91:1 ratio)
    ogImageUrl: `${ROOT_URL}/og-image-1200x630.png`,
  },
} as const;
