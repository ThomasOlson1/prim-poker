# Farcaster Mini App Image Requirements

## Critical: Splash Image Must Be 200x200px

Your splash image **MUST be exactly 200x200 pixels**. Farcaster will reject your mini app if this requirement is not met.

### Current Issue
- Your `splashImageUrl` is pointing to `hero-poker.jpg` which is **1024x1024px**
- This does NOT meet Farcaster's requirements
- You need to create a **200x200px version**

### How to Create the Splash Image

#### Option 1: Online Tool (Easiest)
1. Go to https://www.iloveimg.com/resize-image/resize-jpg
2. Upload `public/hero-poker.jpg`
3. Select "By pixels"
4. Set to 200x200 pixels
5. Download and save as `public/splash-200x200.jpg`

#### Option 2: Using ImageMagick (if installed locally)
```bash
convert public/hero-poker.jpg -resize 200x200^ -gravity center -extent 200x200 public/splash-200x200.jpg
```

#### Option 3: Using Photoshop/GIMP
1. Open `public/hero-poker.jpg`
2. Image → Image Size
3. Set to 200x200 pixels
4. Save as `public/splash-200x200.jpg`

### After Creating the Image

1. Add the file to `public/splash-200x200.jpg`
2. The `minikit.config.ts` has been updated to reference this file
3. Commit and push the changes
4. Deploy to Vercel

## Other Image Requirements

- **iconUrl**: Should be square (yours is 1024x1024 ✓)
- **heroImageUrl**: Can be any size, under 10MB (yours is 96KB ✓)
- **All images**: Must be less than 1MB (all yours are ✓)
- **Format**: PNG or JPG (yours are JPG ✓)
