# Deployment Guide - Prim Poker Backend

This guide will help you deploy your WebSocket backend server to Render for 24/7 availability.

## Prerequisites

- GitHub account (your code is already on GitHub)
- Render account (sign up at https://render.com - free tier available)

## Step 1: Deploy Backend to Render

### Option A: Deploy with render.yaml (Recommended)

1. **Go to Render Dashboard**
   - Visit https://dashboard.render.com
   - Click "New +" → "Blueprint"

2. **Connect Your Repository**
   - Select your `ThomasOlson1/prim-poker` repository
   - Render will automatically detect `render.yaml`

3. **Review Configuration**
   - Service name: `prim-poker-backend`
   - Plan: Free (or upgrade to Starter $7/mo for better performance)
   - Root directory: `server`
   - Build command: `npm install && npm run build`
   - Start command: `npm start`

4. **Deploy**
   - Click "Apply" and wait for deployment (3-5 minutes)
   - Note your service URL: `https://prim-poker-backend.onrender.com`

### Option B: Manual Deployment

1. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service**
   - **Name**: `prim-poker-backend`
   - **Region**: Oregon (or closest to your users)
   - **Root Directory**: `server`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free

3. **Environment Variables**
   - Add these in Render dashboard:
     ```
     NODE_ENV=production
     PORT=10000
     ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment

## Step 2: Get Your WebSocket URL

After deployment completes:

1. Your service URL will be: `https://your-service-name.onrender.com`
2. Your WebSocket URL is the same URL with `wss://` protocol
3. Example: `wss://prim-poker-backend.onrender.com`

**Important**: Render free tier services:
- Spin down after 15 minutes of inactivity
- Take 30-60 seconds to wake up on first request
- Upgrade to Starter plan ($7/mo) for always-on

## Step 3: Update Frontend Configuration

1. **Create `.env.local` file** (in project root, NOT in server folder):
   ```bash
   cp .env.local.example .env.local
   ```

2. **Update WebSocket URL**:
   ```env
   # Replace with your actual Render URL
   NEXT_PUBLIC_WS_URL=wss://prim-poker-backend.onrender.com
   ```

3. **Add to `.gitignore`** (already done):
   ```
   .env.local
   ```

## Step 4: Deploy Frontend to Vercel

Your frontend is already on Vercel. Update the environment variable:

1. Go to https://vercel.com/dashboard
2. Select your `prim-poker` project
3. Go to Settings → Environment Variables
4. Add/Update:
   ```
   NEXT_PUBLIC_WS_URL=wss://prim-poker-backend.onrender.com
   ```
5. Redeploy your frontend

## Step 5: Test the Connection

1. **Visit your app** in production
2. **Open browser console** (F12)
3. **Look for**:
   ```
   [WebSocket] Connected
   ```
4. **Join a game** to test turn notifications

## Monitoring Your Backend

### Check Backend Health

Visit: `https://your-service-name.onrender.com/api/health`

Should return:
```json
{
  "status": "ok",
  "rooms": 0,
  "uptime": 123.45
}
```

### View Logs

1. Go to Render Dashboard
2. Click on your service
3. Click "Logs" tab
4. Watch for connection events:
   ```
   🚀 WebSocket server running on port 10000
   🔌 Client connected
   ```

## Troubleshooting

### "WebSocket connection failed"

**Cause**: Wrong URL or backend not running

**Fix**:
1. Check your `.env.local` has correct URL
2. Verify backend is running on Render
3. Make sure URL uses `wss://` (not `ws://`)

### "Backend takes 30+ seconds to connect"

**Cause**: Render free tier spins down after inactivity

**Fix**:
- This is normal for free tier
- Upgrade to Starter plan ($7/mo) for always-on
- Or use a ping service (e.g., UptimeRobot) to keep it awake

### "CORS errors"

**Cause**: Backend not accepting frontend origin

**Fix**: Already handled in `server/index.ts` with `cors()` middleware

## Cost Breakdown

| Service | Free Tier | Paid Plan |
|---------|-----------|-----------|
| Render Backend | ✅ 750 hrs/mo | $7/mo (always-on) |
| Vercel Frontend | ✅ Unlimited | $20/mo (Pro) |
| **Total** | **$0/mo** | **$7-27/mo** |

## Next Steps

✅ Backend deployed and running 24/7
✅ Frontend connected to production backend
✅ Turn notifications working

### Optional Enhancements

1. **Add Database**: PostgreSQL on Render (free 1GB)
2. **Custom Domain**: Point your domain to Render
3. **SSL Certificate**: Automatic with Render
4. **Monitoring**: Set up alerts for downtime
5. **Redis**: For caching game state (paid)

## Support

- **Render Docs**: https://render.com/docs
- **Render Community**: https://community.render.com
- **Issues**: https://github.com/ThomasOlson1/prim-poker/issues
