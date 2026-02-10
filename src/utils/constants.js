// Constants for game tuning
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 10 Unlockable Character Skins
export const CHARACTER_SKINS = [
  { id: 'default', name: 'Glitch', color: '#00ff88', glowColor: '#00cc66', eyeColor: '#0f0e17', unlockCost: 0, unlocked: true },
  { id: 'crimson', name: 'Crimson', color: '#ff3366', glowColor: '#cc1144', eyeColor: '#ffffff', unlockCost: 50, unlocked: false },
  { id: 'azure', name: 'Azure', color: '#33ccff', glowColor: '#0099cc', eyeColor: '#ffffff', unlockCost: 100, unlocked: false },
  { id: 'amber', name: 'Amber', color: '#ffaa00', glowColor: '#cc8800', eyeColor: '#0f0e17', unlockCost: 150, unlocked: false },
  { id: 'violet', name: 'Violet', color: '#aa66ff', glowColor: '#8844cc', eyeColor: '#ffffff', unlockCost: 200, unlocked: false },
  { id: 'shadow', name: 'Shadow', color: '#2a2a3a', glowColor: '#1a1a2e', eyeColor: '#ff3366', unlockCost: 250, unlocked: false },
  { id: 'nebula', name: 'Nebula', color: '#ff66cc', glowColor: '#cc3399', eyeColor: '#ffffff', unlockCost: 300, unlocked: false },
  { id: 'cyber', name: 'Cyber', color: '#00ffff', glowColor: '#00cccc', eyeColor: '#ff00ff', unlockCost: 350, unlocked: false },
  { id: 'golden', name: 'Golden', color: '#ffdd44', glowColor: '#ccaa22', eyeColor: '#0f0e17', unlockCost: 400, unlocked: false },
  { id: 'void', name: 'Void', color: '#1a0a2e', glowColor: '#4400aa', eyeColor: '#aa00ff', unlockCost: 500, unlocked: false },
];

export const GAME = {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  
  // Player
  PLAYER_SIZE: 28,
  PLAYER_X: 60,
  
  // Physics
  GRAVITY: 0.6,
  JUMP_FORCE: -11,
  MAX_FALL_SPEED: 14,
  
  // World
  GROUND_HEIGHT: 80,
  CEILING_HEIGHT: 0,
  FLOOR_Y: SCREEN_HEIGHT - 80,
  
  // Obstacles
  BASE_SPEED: 4,
  MAX_SPEED: 9,
  SPEED_INCREMENT: 0.003, // per frame
  MIN_SPAWN_MS: 1200,
  MAX_SPAWN_MS: 2200,
  OBSTACLE_WIDTH: 28,
  MIN_OBSTACLE_HEIGHT: 40,
  MAX_OBSTACLE_HEIGHT: 180, // Increased from 120 for taller obstacles
  GAP_MIN: 140,
  NEAR_MISS_DISTANCE: 8, // pixels - actual euclidean distance to obstacle edge
  
  // Power-ups
  STAR_POINTS: 10,
  STAR_COINS: 10, // Coins from collecting stars
  SHIELD_DURATION: 3000, // ms
  SLOWMO_DURATION: 2500, // ms
  SLOWMO_FACTOR: 0.5, // 50% speed
  
  // Scoring
  POINTS_PER_OBSTACLE: 1,
  POINTS_PER_COIN: 0.1, // 1 coin per 10 score points
  
  // Mystery Box
  MYSTERY_BOX_COINS: 100, // Coins needed for 1 mystery box
  MYSTERY_BOX_COIN_REWARD: 25, // Refund amount if duplicate character
  
  // Near Miss
  NEAR_MISS_BONUS_COINS: 5, // Bonus coins for near misses
  HIGHSCORE_THRESHOLD: 0.1, // 10% threshold for "so close" message
  
  // Colors - Retro Palette
  COLORS: {
    BG: '#0f0e17',
    BG2: '#1a1932',
    GROUND: '#2e2e3a',
    GROUND_LINE: '#ff6e6e',
    PLAYER: '#00ff88',
    PLAYER_GLOW: '#00cc66',
    PLAYER_EYE: '#ffffff',
    PLAYER_SHIELD: '#00ccff',
    OBSTACLE: '#ff2266',
    OBSTACLE_DARK: '#cc1144',
    OBSTACLE_GLOW: 'rgba(255,34,102,0.3)',
    STAR: '#ffcc00',
    STAR_GLOW: 'rgba(255,204,0,0.6)',
    SHIELD: '#00ccff',
    SLOWMO: '#aa66ff',
    SCORE: '#00ff88',
    TEXT: '#fffffe',
    TEXT_DIM: '#a7a9be',
    ACCENT: '#ff8906',
    SCANLINE: 'rgba(0,0,0,0.15)',
    COIN: '#ffcc00',
    COIN_GLOW: 'rgba(255,204,0,0.8)',
    MYSTERY_BOX: '#aa66ff',
    NEAR_MISS: '#00ffff',
  },
};
