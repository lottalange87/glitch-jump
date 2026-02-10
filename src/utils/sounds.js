import { Audio } from 'expo-av';

let soundObjects = {};
let initialized = false;

const SOUND_FILES = {
  jump: require('../../assets/sounds/jump.wav'),
  crash: require('../../assets/sounds/crash.wav'),
  score: require('../../assets/sounds/score.wav'),
  milestone: require('../../assets/sounds/milestone.wav'),
};

export const initSounds = async () => {
  if (initialized) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    
    for (const [name, file] of Object.entries(SOUND_FILES)) {
      const { sound } = await Audio.Sound.createAsync(file, { volume: 0.5 });
      soundObjects[name] = sound;
    }
    
    initialized = true;
  } catch (e) {
    console.warn('Sound init failed:', e);
  }
};

export const playSound = async (name) => {
  try {
    const sound = soundObjects[name];
    if (sound) {
      await sound.replayAsync();
    }
  } catch (e) {
    // Silently fail - sounds are non-critical
  }
};

export const cleanup = async () => {
  for (const sound of Object.values(soundObjects)) {
    try { await sound.unloadAsync(); } catch {}
  }
  soundObjects = {};
  initialized = false;
};
