require('dotenv').config();

const mnemonic = process.env.MNEMONIC;

console.log("=== MNEMONIC DEBUG ===");
console.log("Is MNEMONIC set?", !!mnemonic);

if (mnemonic) {
    const trimmed = mnemonic.trim();
    console.log("Length (characters):", trimmed.length);
    console.log("Word count:", trimmed.split(/\s+/).length);
    console.log("First word:", trimmed.split(/\s+/)[0]);
    console.log("Last word:", trimmed.split(/\s+/).slice(-1)[0]);
    console.log("Has quotes?", trimmed.includes('"') || trimmed.includes("'"));
    console.log("Has commas?", trimmed.includes(','));
    console.log("Has newlines?", trimmed.includes('\n'));
    
    // Check for common issues
    const words = trimmed.split(/\s+/);
    console.log("\n=== VALIDATION ===");
    
    if (words.length !== 12 && words.length !== 24) {
        console.log("❌ ERROR: Mnemonic should have 12 or 24 words, found:", words.length);
    } else {
        console.log("✅ Word count is valid:", words.length);
    }
    
    // Check for empty words
    const emptyWords = words.filter(w => !w || w.trim() === '');
    if (emptyWords.length > 0) {
        console.log("❌ ERROR: Found empty words");
    } else {
        console.log("✅ No empty words");
    }
    
    // Check for non-lowercase
    const hasUpperCase = words.some(w => w !== w.toLowerCase());
    if (hasUpperCase) {
        console.log("⚠️  WARNING: Some words have uppercase letters (should be lowercase)");
    } else {
        console.log("✅ All words are lowercase");
    }
    
    // Check for special characters
    const hasSpecialChars = words.some(w => /[^a-z]/.test(w));
    if (hasSpecialChars) {
        console.log("❌ ERROR: Some words contain special characters or numbers");
    } else {
        console.log("✅ No special characters");
    }
    
} else {
    console.log("❌ MNEMONIC is not set in .env file");
}
