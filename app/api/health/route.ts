export async function GET() {
  return Response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    app: "Farcaster Poker Mini App",
    version: "1.0.0",
  })
}
