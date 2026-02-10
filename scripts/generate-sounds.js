// Generate simple chiptune WAV files for Glitch Jump
// Run: node scripts/generate-sounds.js

const fs = require('fs');
const path = require('path');

function generateWav(frequency, duration, volume = 0.3, type = 'square') {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = Buffer.alloc(44 + numSamples * 2);
  
  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // chunk size
  buffer.writeUInt16LE(1, 20);  // PCM
  buffer.writeUInt16LE(1, 22);  // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32);  // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);
  
  // Generate samples
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample;
    
    if (type === 'square') {
      sample = Math.sin(2 * Math.PI * frequency * t) > 0 ? volume : -volume;
    } else {
      sample = Math.sin(2 * Math.PI * frequency * t) * volume;
    }
    
    // Envelope: quick attack, longer decay
    const env = Math.max(0, 1 - (t / duration) * 1.5);
    sample *= env;
    
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }
  
  return buffer;
}

function generateJump() {
  // Rising pitch sweep
  const sampleRate = 22050;
  const duration = 0.1;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = Buffer.alloc(44 + numSamples * 2);
  
  // WAV header (same as above)
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const freq = 400 + (t / duration) * 600; // 400Hz -> 1000Hz sweep
    const sample = (Math.sin(2 * Math.PI * freq * t) > 0 ? 0.25 : -0.25) * (1 - t / duration);
    buffer.writeInt16LE(Math.floor(sample * 32767), 44 + i * 2);
  }
  
  return buffer;
}

function generateCrash() {
  // Noise burst + low tone
  const sampleRate = 22050;
  const duration = 0.3;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = Buffer.alloc(44 + numSamples * 2);
  
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const noise = (Math.random() * 2 - 1) * 0.3;
    const tone = Math.sin(2 * Math.PI * 100 * t) * 0.2;
    const env = Math.max(0, 1 - (t / duration) * 2);
    const sample = (noise + tone) * env;
    buffer.writeInt16LE(Math.floor(sample * 32767), 44 + i * 2);
  }
  
  return buffer;
}

function generateScore() {
  // Quick high blip
  return generateWav(880, 0.05, 0.2, 'square');
}

function generateMilestone() {
  // Two-tone arpeggio  
  const sampleRate = 22050;
  const duration = 0.2;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = Buffer.alloc(44 + numSamples * 2);
  
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const freq = t < duration / 2 ? 660 : 880;
    const sample = (Math.sin(2 * Math.PI * freq * t) > 0 ? 0.2 : -0.2) * (1 - t / duration * 0.5);
    buffer.writeInt16LE(Math.floor(sample * 32767), 44 + i * 2);
  }
  
  return buffer;
}

// Generate and save
const outDir = path.join(__dirname, '..', 'assets', 'sounds');
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'jump.wav'), generateJump());
fs.writeFileSync(path.join(outDir, 'crash.wav'), generateCrash());
fs.writeFileSync(path.join(outDir, 'score.wav'), generateScore());
fs.writeFileSync(path.join(outDir, 'milestone.wav'), generateMilestone());

console.log('✅ Generated 4 sound files in assets/sounds/');
