// Constants for game tuning
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  MAX_OBSTACLE_HEIGHT: 120,
  GAP_MIN: 140,
  
  // Power-ups
  STAR_POINTS: 5,
  SHIELD_DURATION: 3000, // ms
  SLOWMO_DURATION: 2500, // ms
  SLOWMO_FACTOR: 0.5, // 50% speed
  
  // Scoring
  POINTS_PER_OBSTACLE: 1,
  
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
  },
};
