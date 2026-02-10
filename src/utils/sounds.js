import { Audio } from 'expo-av';

// Sound pool for zero-latency playback
// Multiple instances per sound so we don't wait for rewind

const POOL_SIZE = 4;

const SOUND_FILES = {
  jump: require('../../assets/sounds/jump.wav'),
  crash: require('../../assets/sounds/crash.wav'),
  score: require('../../assets/sounds/score.wav'),
  milestone: require('../../assets/sounds/milestone.wav'),
  powerup: require('../../assets/sounds/score.wav'), // Reuse score sound for powerup (higher pitch would be ideal)
  'shield-break': require('../../assets/sounds/crash.wav'), // Reuse crash sound for shield break (softer would be ideal)
};

let pools = {};
let poolIndex = {};
let initialized = false;

export const initSounds = async () => {
  if (initialized) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    // Create a pool of sound instances for each sound
    for (const [name, file] of Object.entries(SOUND_FILES)) {
      pools[name] = [];
      poolIndex[name] = 0;
      for (let i = 0; i < POOL_SIZE; i++) {
        const { sound } = await Audio.Sound.createAsync(file, {
          volume: name === 'jump' ? 0.4 : 0.5,
          shouldPlay: false,
        });
        pools[name].push(sound);
      }
    }

    initialized = true;
  } catch (e) {
    console.warn('Sound init failed:', e);
  }
};

export const playSound = (name) => {
  if (!initialized || !pools[name]) return;

  // Round-robin through pool — grab next instance immediately
  const idx = poolIndex[name];
  const sound = pools[name][idx];
  poolIndex[name] = (idx + 1) % POOL_SIZE;

  // Fire and forget — no await = no delay
  sound.setPositionAsync(0).then(() => sound.playAsync()).catch(() => {});
};

export const cleanup = async () => {
  for (const pool of Object.values(pools)) {
    for (const sound of pool) {
      try { await sound.unloadAsync(); } catch {}
    }
  }
  pools = {};
  poolIndex = {};
  initialized = false;
};
