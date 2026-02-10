import { Audio } from 'expo-av';

// Sound pool for zero-latency playback
// Multiple instances per sound so we don't wait for rewind

const POOL_SIZE = 4;

const SOUND_FILES = {
  jump: require('../../assets/sounds/jump.wav'),
  crash: require('../../assets/sounds/crash.wav'),
  score: require('../../assets/sounds/score.wav'),
  milestone: require('../../assets/sounds/milestone.wav'),
  powerup: require('../../assets/sounds/score.wav'), // Reuse score sound for powerup
  'shield-break': require('../../assets/sounds/crash.wav'), // Reuse crash sound for shield break
  coin: require('../../assets/sounds/score.wav'), // Coin collect - higher pitch effect
  'box-open': require('../../assets/sounds/powerup.wav'), // Mystery box open
  'near-miss': require('../../assets/sounds/jump.wav'), // Near miss - whoosh sound
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

export const playSound = (name, options = {}) => {
  if (!initialized || !pools[name]) return;

  // Round-robin through pool — grab next instance immediately
  const idx = poolIndex[name];
  const sound = pools[name][idx];
  poolIndex[name] = (idx + 1) % POOL_SIZE;

  // Fire and forget — no await = no delay
  const volume = options.volume !== undefined ? options.volume : 0.5;
  sound.setVolumeAsync(volume).catch(() => {});
  sound.setPositionAsync(0).then(() => sound.playAsync()).catch(() => {});
};

// Play coin sound with higher pitch effect (using volume modulation)
export const playCoinSound = () => {
  playSound('coin', { volume: 0.7 });
};

// Play box open sound
export const playBoxOpenSound = () => {
  playSound('box-open', { volume: 0.8 });
};

// Play near miss sound
export const playNearMissSound = () => {
  playSound('near-miss', { volume: 0.5 });
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
