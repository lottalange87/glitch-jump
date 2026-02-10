// Simple script to generate placeholder app icons as colored PNGs
// Run: node scripts/generate-icons.js

const fs = require('fs');
const { createCanvas } = require('canvas');

// We'll create simple solid-color placeholders
// For production, replace with proper pixel art

const sizes = [
  { name: 'icon.png', size: 1024 },
  { name: 'adaptive-icon.png', size: 1024 },
  { name: 'favicon.png', size: 48 },
  { name: 'splash-icon.png', size: 512 },
];

// Since we may not have canvas module, create a minimal PNG manually
// This creates a valid 1x1 PNG that can be scaled

function createMinimalPNG(width, height, r, g, b) {
  // For now, just copy a notice
  return null;
}

console.log(`
=== App Icon Generation ===

For now, use these placeholder steps:

1. Go to https://www.pixilart.com/draw (free pixel art editor)
2. Create a 64x64 pixel art of the Glitch Jump character:
   - Dark background (#0f0e17)
   - Green square character (#00ff88) with eyes
   - Red spike below (#ff2266)
   - Text "GJ" in pixel font
3. Export as PNG and resize to:
   - 1024x1024 → assets/icon.png
   - 1024x1024 → assets/adaptive-icon.png  
   - 48x48 → assets/favicon.png

Or use the Expo default icons for testing builds.
`);
