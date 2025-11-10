import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { minikitConfig } from "../minikit.config";

/**
 * Generate static Farcaster manifest file
 * This ensures the manifest is available as a static file for reliable serving
 */
function generateManifest() {
  const ROOT_URL = process.env.NEXT_PUBLIC_URL || "https://prim-poker.vercel.app";

  // Create the manifest with updated URLs
  const manifest = {
    accountAssociation: minikitConfig.accountAssociation,
    baseBuilder: minikitConfig.baseBuilder,
    miniapp: {
      ...minikitConfig.miniapp,
      screenshotUrls: [`${ROOT_URL}/hero-poker.jpg`],
      iconUrl: `${ROOT_URL}/icon-512x512.jpg`,
      splashImageUrl: `${ROOT_URL}/splash.jpg`,
      homeUrl: ROOT_URL,
      webhookUrl: `${ROOT_URL}/api/webhook`,
      heroImageUrl: `${ROOT_URL}/hero-poker.jpg`,
      ogImageUrl: `${ROOT_URL}/og-image.jpg`,
    },
  };

  // Ensure the .well-known directory exists
  const dir = join(process.cwd(), "public", ".well-known");
  mkdirSync(dir, { recursive: true });

  // Write the manifest file
  const manifestPath = join(dir, "farcaster.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  console.log("✅ Generated static manifest at public/.well-known/farcaster.json");
  console.log(`   Using ROOT_URL: ${ROOT_URL}`);
}

generateManifest();
