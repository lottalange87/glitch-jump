import AsyncStorage from '@react-native-async-storage/async-storage';

const HIGHSCORE_KEY = '@glitch_jump_highscore';

export const getHighscore = async () => {
  try {
    const val = await AsyncStorage.getItem(HIGHSCORE_KEY);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
};

export const setHighscore = async (score) => {
  try {
    await AsyncStorage.setItem(HIGHSCORE_KEY, String(score));
  } catch {}
};

export const checkHighscore = async (score) => {
  const current = await getHighscore();
  if (score > current) {
    await setHighscore(score);
    return true; // new highscore!
  }
  return false;
};
