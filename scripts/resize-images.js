const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function resizeImages() {
  const publicDir = path.join(__dirname, '..', 'public');

  console.log('🎨 Resizing images for Farcaster manifest requirements...\n');

  try {
    // 1. Convert icon to PNG 1024x1024 (no alpha)
    console.log('📦 Converting icon-512x512.jpg to PNG 1024x1024...');
    await sharp(path.join(publicDir, 'icon-512x512.jpg'))
      .resize(1024, 1024, { fit: 'cover' })
      .flatten({ background: { r: 255, g: 255, b: 255 } }) // Remove alpha
      .png()
      .toFile(path.join(publicDir, 'icon-1024x1024.png'));
    console.log('✅ Created icon-1024x1024.png\n');

    // 2. Resize hero image to 1200x630 (1.91:1 ratio)
    console.log('🖼️  Resizing hero-poker.jpg to 1200x630...');
    await sharp(path.join(publicDir, 'hero-poker.jpg'))
      .resize(1200, 630, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 90 })
      .toFile(path.join(publicDir, 'hero-poker-1200x630.jpg'));
    console.log('✅ Created hero-poker-1200x630.jpg\n');

    // 3. Resize and convert OG image to PNG 1200x630 (1.91:1 ratio)
    console.log('🌐 Resizing og-image.jpg to PNG 1200x630...');
    await sharp(path.join(publicDir, 'og-image.jpg'))
      .resize(1200, 630, { fit: 'cover', position: 'center' })
      .png()
      .toFile(path.join(publicDir, 'og-image-1200x630.png'));
    console.log('✅ Created og-image-1200x630.png\n');

    // 4. Create portrait screenshot 1284x2778
    console.log('📱 Creating portrait screenshot 1284x2778...');
    await sharp(path.join(publicDir, 'hero-poker.jpg'))
      .resize(1284, 2778, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 90 })
      .toFile(path.join(publicDir, 'screenshot-portrait.jpg'));
    console.log('✅ Created screenshot-portrait.jpg\n');

    // Verify all files were created
    const files = [
      'icon-1024x1024.png',
      'hero-poker-1200x630.jpg',
      'og-image-1200x630.png',
      'screenshot-portrait.jpg'
    ];

    console.log('🔍 Verifying created files...');
    for (const file of files) {
      const filePath = path.join(publicDir, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const metadata = await sharp(filePath).metadata();
        console.log(`✅ ${file}: ${metadata.width}x${metadata.height} (${(stats.size / 1024).toFixed(2)} KB)`);
      } else {
        console.log(`❌ ${file}: NOT FOUND`);
      }
    }

    console.log('\n🎉 All images resized successfully!');
    console.log('\nNext step: Update minikit.config.ts to use the new image paths.');

  } catch (error) {
    console.error('❌ Error resizing images:', error);
    process.exit(1);
  }
}

resizeImages();
