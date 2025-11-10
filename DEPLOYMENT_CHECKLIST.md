# Farcaster Mini App Deployment Checklist

Your manifest **validates correctly locally**. The issue is likely with your Vercel deployment.

## ✅ What's Working:
- Manifest structure is valid
- CORS headers are configured
- Image references are correct
- Account association is configured

## ❌ What's Likely Wrong:

### 1. NEXT_PUBLIC_URL Not Set in Vercel (MOST LIKELY ISSUE)

**Problem:** Without this, your manifest generates URLs like:
- `http://localhost:3000/splash.jpg` (WRONG)
- Or uses VERCEL_URL which changes for each preview

**Solution:**
1. Go to https://vercel.com/your-project/settings/environment-variables
2. Add **NEXT_PUBLIC_URL** = `https://prim-poker.vercel.app`
3. ⚠️ CRITICAL: Add it to **ALL THREE** environments:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
4. Click **Save**
5. Go to **Deployments** tab and click **Redeploy** (select "Use existing Build Cache" unchecked)

### 2. Manifest Not Accessible (403 Error)

**Test this:**
```bash
curl -I https://prim-poker.vercel.app/.well-known/farcaster.json
```

**If you get 403:**
- Wait for Vercel to finish deploying the latest changes
- Clear Vercel's cache by redeploying without cache
- Check Vercel deployment logs for errors

**If you get 200:** Good! The CORS fix worked.

### 3. Images Not Deployed

**Verify splash.jpg exists:**
```bash
curl -I https://prim-poker.vercel.app/splash.jpg
```

**If 404:**
- Make sure you committed and pushed `public/splash.jpg`
- Verify it's in your git repo: `git ls-files public/splash.jpg`
- Redeploy on Vercel

### 4. Account Association Domain Mismatch

Your account association says: `{"domain":"prim-poker.vercel.app"}`

**Make sure you're accessing your app from:**
- ✅ `https://prim-poker.vercel.app`
- ❌ NOT `https://prim-poker-git-branch.vercel.app`
- ❌ NOT custom domains unless you update accountAssociation

## How to Debug:

### Step 1: Check What Farcaster Sees
```bash
curl https://prim-poker.vercel.app/.well-known/farcaster.json | jq
```

Look for:
- ❌ `"homeUrl": "http://localhost:3000"` → NEXT_PUBLIC_URL not set
- ❌ `"homeUrl": "https://prim-poker-abc123.vercel.app"` → Using VERCEL_URL (wrong)
- ✅ `"homeUrl": "https://prim-poker.vercel.app"` → Correct!

### Step 2: Verify All Images Load
```bash
curl -I https://prim-poker.vercel.app/splash.jpg
curl -I https://prim-poker.vercel.app/icon-512x512.jpg
curl -I https://prim-poker.vercel.app/hero-poker.jpg
```

All should return `HTTP/2 200`

### Step 3: Check Vercel Logs
1. Go to Vercel dashboard
2. Click on latest deployment
3. Check **Build Logs** for errors
4. Check **Function Logs** for runtime errors

## Quick Fix Steps:

1. **Set Environment Variable:**
   ```
   NEXT_PUBLIC_URL=https://prim-poker.vercel.app
   ```
   In Vercel → Settings → Environment Variables

2. **Redeploy:**
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Click "Redeploy"
   - **UNCHECK** "Use existing Build Cache"

3. **Wait 1-2 minutes** for deployment to complete

4. **Test:**
   ```bash
   curl https://prim-poker.vercel.app/.well-known/farcaster.json
   ```

5. **Verify homeUrl is correct** in the response

## Still Not Working?

Check these:

- [ ] Did you redeploy AFTER setting the environment variable?
- [ ] Did you set it for Production environment (not just Preview)?
- [ ] Did you clear the build cache when redeploying?
- [ ] Is `splash.jpg` actually in your `public/` folder and committed?
- [ ] Are you testing the production URL (not a preview URL)?

## Expected Manifest Response:

```json
{
  "accountAssociation": {
    "header": "...",
    "payload": "...",
    "signature": "..."
  },
  "miniapp": {
    "version": "1",
    "name": "Prim's Poker",
    "homeUrl": "https://prim-poker.vercel.app",  ← Must be your production URL
    "iconUrl": "https://prim-poker.vercel.app/icon-512x512.jpg",
    "splashImageUrl": "https://prim-poker.vercel.app/splash.jpg",  ← Must be 200x200px
    ...
  }
}
```

If `homeUrl` shows `localhost:3000` or a Vercel preview URL, **NEXT_PUBLIC_URL is not set correctly**.
