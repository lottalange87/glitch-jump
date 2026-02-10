import AsyncStorage from '@react-native-async-storage/async-storage';
import { CHARACTER_SKINS } from './constants';

const HIGHSCORE_KEY = '@glitch_jump_highscore';
const COINS_KEY = '@glitch_jump_coins';
const UNLOCKED_SKINS_KEY = '@glitch_jump_unlocked_skins';
const CURRENT_SKIN_KEY = '@glitch_jump_current_skin';
const MYSTERY_BOXES_KEY = '@glitch_jump_mystery_boxes';

// Highscore
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

// Coins
export const getCoins = async () => {
  try {
    const val = await AsyncStorage.getItem(COINS_KEY);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
};

export const addCoins = async (amount) => {
  try {
    const current = await getCoins();
    const newTotal = current + amount;
    await AsyncStorage.setItem(COINS_KEY, String(newTotal));
    return newTotal;
  } catch {
    return 0;
  }
};

export const spendCoins = async (amount) => {
  try {
    const current = await getCoins();
    if (current >= amount) {
      const newTotal = current - amount;
      await AsyncStorage.setItem(COINS_KEY, String(newTotal));
      return { success: true, newTotal };
    }
    return { success: false, newTotal: current };
  } catch {
    return { success: false, newTotal: 0 };
  }
};

// Mystery Boxes
export const getMysteryBoxes = async () => {
  try {
    const val = await AsyncStorage.getItem(MYSTERY_BOXES_KEY);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
};

export const addMysteryBox = async () => {
  try {
    const current = await getMysteryBoxes();
    const newTotal = current + 1;
    await AsyncStorage.setItem(MYSTERY_BOXES_KEY, String(newTotal));
    return newTotal;
  } catch {
    return 0;
  }
};

export const openMysteryBox = async () => {
  try {
    const current = await getMysteryBoxes();
    if (current > 0) {
      const newTotal = current - 1;
      await AsyncStorage.setItem(MYSTERY_BOXES_KEY, String(newTotal));
      return { success: true, newTotal };
    }
    return { success: false, newTotal: current };
  } catch {
    return { success: false, newTotal: 0 };
  }
};

// Character Skins
export const getUnlockedSkins = async () => {
  try {
    const val = await AsyncStorage.getItem(UNLOCKED_SKINS_KEY);
    if (val) {
      return JSON.parse(val);
    }
    // Default: only first skin unlocked
    return ['default'];
  } catch {
    return ['default'];
  }
};

export const unlockSkin = async (skinId) => {
  try {
    const unlocked = await getUnlockedSkins();
    if (!unlocked.includes(skinId)) {
      unlocked.push(skinId);
      await AsyncStorage.setItem(UNLOCKED_SKINS_KEY, JSON.stringify(unlocked));
    }
    return unlocked;
  } catch {
    return ['default'];
  }
};

export const getCurrentSkin = async () => {
  try {
    const val = await AsyncStorage.getItem(CURRENT_SKIN_KEY);
    return val || 'default';
  } catch {
    return 'default';
  }
};

export const setCurrentSkin = async (skinId) => {
  try {
    const unlocked = await getUnlockedSkins();
    if (unlocked.includes(skinId)) {
      await AsyncStorage.setItem(CURRENT_SKIN_KEY, skinId);
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

export const getSkinData = async () => {
  const unlocked = await getUnlockedSkins();
  const current = await getCurrentSkin();
  
  return CHARACTER_SKINS.map(skin => ({
    ...skin,
    unlocked: unlocked.includes(skin.id),
    isSelected: skin.id === current,
  }));
};

export const purchaseSkin = async (skinId) => {
  const skin = CHARACTER_SKINS.find(s => s.id === skinId);
  if (!skin) return { success: false, message: 'Skin not found' };
  
  const unlocked = await getUnlockedSkins();
  if (unlocked.includes(skinId)) {
    return { success: false, message: 'Already unlocked' };
  }
  
  const spendResult = await spendCoins(skin.unlockCost);
  if (!spendResult.success) {
    return { success: false, message: 'Not enough coins' };
  }
  
  await unlockSkin(skinId);
  return { success: true, newTotal: spendResult.newTotal };
};

// Open Mystery Box - returns reward
export const openMysteryBoxReward = async () => {
  const boxResult = await openMysteryBox();
  if (!boxResult.success) {
    return { success: false, message: 'No mystery boxes available' };
  }
  
  const unlocked = await getUnlockedSkins();
  const lockedSkins = CHARACTER_SKINS.filter(s => !unlocked.includes(s.id) && s.id !== 'default');
  
  // 70% chance for character, 30% for coin refund if no characters left
  const roll = Math.random();
  
  if (lockedSkins.length > 0 && roll < 0.7) {
    // Unlock a random character
    const randomSkin = lockedSkins[Math.floor(Math.random() * lockedSkins.length)];
    await unlockSkin(randomSkin.id);
    return {
      success: true,
      type: 'character',
      skin: randomSkin,
      remainingBoxes: boxResult.newTotal,
    };
  } else {
    // Coin refund
    const coinReward = CHARACTER_SKINS[0].MYSTERY_BOX_COIN_REWARD || 25;
    const newCoins = await addCoins(coinReward);
    return {
      success: true,
      type: 'coins',
      amount: coinReward,
      newTotal: newCoins,
      remainingBoxes: boxResult.newTotal,
    };
  }
};
