# Farcaster Mini App Setup Guide

## Issues Found & Fixes Applied

### 1. CORS Headers Missing ✅ FIXED
The manifest endpoint was returning 403 errors because it lacked proper CORS headers.

**Fixed by:**
- Added CORS headers to `app/.well-known/farcaster.json/route.ts`
- Created `vercel.json` with CORS configuration
- Added OPTIONS handler for preflight requests

### 2. Splash Image Wrong Size ⚠️ ACTION REQUIRED
Farcaster requires the splash image to be **exactly 200x200 pixels**.

**Current:** `hero-poker.jpg` is 1024x1024px
**Required:** Create `splash-200x200.jpg` at 200x200px

**Action:** Follow instructions in `IMAGE_REQUIREMENTS.md` to create the splash image.

### 3. Missing Environment Variables ⚠️ ACTION REQUIRED
Several required environment variables are not set in Vercel.

---

## Required Actions

### Step 1: Set Environment Variables in Vercel

Go to your Vercel project dashboard → Settings → Environment Variables and add:

#### CRITICAL (Required for Farcaster to work):
```
NEXT_PUBLIC_URL=https://prim-poker.vercel.app
NEXT_PUBLIC_ONCHAINKIT_API_KEY=<get from https://portal.cdp.coinbase.com/>
```

#### Recommended (for full functionality):
```
NEXT_PUBLIC_POKER_CONTRACT_ADDRESS=<your deployed contract address>
NEXT_PUBLIC_WS_URL=wss://prim-poker.vercel.app/ws
NEXT_PUBLIC_API_URL=https://prim-poker.vercel.app/api
```

**Important:** Set these for Production, Preview, AND Development environments.

### Step 2: Create the 200x200px Splash Image

Follow the instructions in `IMAGE_REQUIREMENTS.md` to create `public/splash-200x200.jpg`

### Step 3: Add the Splash Image and Redeploy

```bash
# After creating the splash image
git add public/splash-200x200.jpg
git commit -m "Add 200x200px splash image for Farcaster"
git push
```

### Step 4: Verify the Manifest

After Vercel deploys, test the manifest:

```bash
curl https://prim-poker.vercel.app/.well-known/farcaster.json
```

Should return valid JSON without 403 errors.

### Step 5: Test on Farcaster

1. Go to Farcaster Developer Tools
2. Test your mini app URL: `https://prim-poker.vercel.app`
3. Verify it appears correctly in the Farcaster app

---

## Troubleshooting

### Still getting 403 errors?
- Verify CORS headers are present in the response
- Check Vercel deployment logs for errors
- Ensure `NEXT_PUBLIC_URL` is set in Vercel

### Farcaster not recognizing the app?
- Verify splash image is exactly 200x200px
- Check all environment variables are set
- Ensure the manifest returns valid JSON
- Verify your domain in the `accountAssociation` payload matches your actual domain

### Images not loading?
- Ensure all image files exist in `public/` folder
- Check file names match exactly in `minikit.config.ts`
- Verify `NEXT_PUBLIC_URL` environment variable is set correctly

---

## Files Modified

- ✅ `app/.well-known/farcaster.json/route.ts` - Added CORS headers
- ✅ `vercel.json` - Added Vercel-level CORS configuration
- ✅ `.env.example` - Documented all required environment variables
- ✅ `minikit.config.ts` - Updated splash image reference
- ✅ `IMAGE_REQUIREMENTS.md` - Image creation guide (this file)
- ⏳ `public/splash-200x200.jpg` - **YOU NEED TO CREATE THIS**
