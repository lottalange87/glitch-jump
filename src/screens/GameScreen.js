import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine } from 'react-native-game-engine';
import { StyleSheet, StatusBar, TouchableWithoutFeedback, View, Text, Dimensions, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { GAME } from '../utils/constants';
import { getHighscore, checkHighscore } from '../utils/storage';
import { initSounds, playSound, cleanup } from '../utils/sounds';

const { width: SW, height: SH } = Dimensions.get('window');

// ============================================
// RENDERERS
// ============================================

// Pixel-art style player with face
const Player = (props) => {
  const s = props.width || GAME.PLAYER_SIZE;
  const hasShield = props.shieldTime > 0;
  const shieldOpacity = hasShield ? Math.min(1, props.shieldTime / 500) : 0;
  
  return (
    <View style={{
      position: 'absolute',
      left: props.x,
      top: props.y,
      width: s,
      height: s,
    }}>
      {/* Shield aura effect */}
      {hasShield && (
        <>
          <View style={{
            position: 'absolute', left: -10, top: -10,
            width: s + 20, height: s + 20,
            backgroundColor: `rgba(0, 204, 255, ${0.3 * shieldOpacity})`,
            borderRadius: (s + 20) / 2,
            borderWidth: 2,
            borderColor: `rgba(0, 204, 255, ${0.8 * shieldOpacity})`,
          }} />
          <View style={{
            position: 'absolute', left: -6, top: -6,
            width: s + 12, height: s + 12,
            backgroundColor: `rgba(0, 204, 255, ${0.2 * shieldOpacity})`,
            borderRadius: (s + 12) / 2,
          }} />
        </>
      )}
      {/* Glow effect */}
      <View style={{
        position: 'absolute', left: -4, top: -4,
        width: s + 8, height: s + 8,
        backgroundColor: hasShield ? 'rgba(0,204,255,0.25)' : 'rgba(0,255,136,0.15)',
        borderRadius: 4,
      }} />
      {/* Body */}
      <View style={{
        width: s, height: s,
        backgroundColor: hasShield ? GAME.COLORS.PLAYER : GAME.COLORS.PLAYER,
        borderWidth: 2,
        borderColor: hasShield ? GAME.COLORS.PLAYER_SHIELD : GAME.COLORS.PLAYER_GLOW,
        borderRadius: 3,
      }}>
        {/* Eyes */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          paddingRight: 4,
          paddingTop: 6,
          gap: 3,
        }}>
          <View style={{ width: 4, height: 4, backgroundColor: '#0f0e17', borderRadius: 1 }} />
          <View style={{ width: 4, height: 4, backgroundColor: '#0f0e17', borderRadius: 1 }} />
        </View>
      </View>
    </View>
  );
};

// Spike-style obstacle
const ObstacleRenderer = (props) => {
  const w = props.width || GAME.OBSTACLE_WIDTH;
  const h = props.height || 60;
  const isTop = props.isTop;
  
  return (
    <View style={{
      position: 'absolute',
      left: props.x,
      top: props.y,
      width: w,
      height: h,
    }}>
      {/* Glow */}
      <View style={{
        position: 'absolute', left: -3, top: -3,
        width: w + 6, height: h + 6,
        backgroundColor: GAME.COLORS.OBSTACLE_GLOW,
        borderRadius: 2,
      }} />
      {/* Body */}
      <View style={{
        width: w, height: h,
        backgroundColor: GAME.COLORS.OBSTACLE,
        borderWidth: 2,
        borderColor: GAME.COLORS.OBSTACLE_DARK,
        borderRadius: 2,
      }}>
        {/* Stripes for detail */}
        {Array.from({ length: Math.floor(h / 12) }).map((_, i) => (
          <View key={i} style={{
            height: 2,
            backgroundColor: GAME.COLORS.OBSTACLE_DARK,
            marginTop: 8,
            marginHorizontal: 3,
          }} />
        ))}
      </View>
    </View>
  );
};

// Moving Block - obstacle that moves up and down
const MovingBlockRenderer = (props) => {
  const w = props.width || GAME.OBSTACLE_WIDTH;
  const h = props.height || 60;
  
  return (
    <View style={{
      position: 'absolute',
      left: props.x,
      top: props.y,
      width: w,
      height: h,
    }}>
      {/* Glow - more intense for moving block */}
      <View style={{
        position: 'absolute', left: -4, top: -4,
        width: w + 8, height: h + 8,
        backgroundColor: 'rgba(255,100,100,0.4)',
        borderRadius: 2,
      }} />
      {/* Body */}
      <View style={{
        width: w, height: h,
        backgroundColor: '#ff4466',
        borderWidth: 2,
        borderColor: '#ff6688',
        borderRadius: 2,
      }}>
        {/* Arrow indicators */}
        <View style={{
          position: 'absolute',
          top: 4,
          left: '50%',
          marginLeft: -4,
          width: 0,
          height: 0,
          borderLeftWidth: 4,
          borderRightWidth: 4,
          borderBottomWidth: 6,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: 'rgba(255,255,255,0.6)',
        }} />
        <View style={{
          position: 'absolute',
          bottom: 4,
          left: '50%',
          marginLeft: -4,
          width: 0,
          height: 0,
          borderLeftWidth: 4,
          borderRightWidth: 4,
          borderTopWidth: 6,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: 'rgba(255,255,255,0.6)',
        }} />
        {/* Center stripe */}
        <View style={{
          position: 'absolute',
          top: '30%',
          left: 2,
          right: 2,
          height: 2,
          backgroundColor: 'rgba(0,0,0,0.3)',
        }} />
        <View style={{
          position: 'absolute',
          top: '70%',
          left: 2,
          right: 2,
          height: 2,
          backgroundColor: 'rgba(0,0,0,0.3)',
        }} />
      </View>
    </View>
  );
};

// Slalom Gate - two gaps side by side
const SlalomGateRenderer = (props) => {
  const w = GAME.OBSTACLE_WIDTH;
  const totalWidth = props.totalWidth || 120;
  const gapY = props.gapY || 100;
  const gateHeight = props.gateHeight || 150;
  
  return (
    <View style={{
      position: 'absolute',
      left: props.x,
      top: gapY,
      width: totalWidth,
      height: gateHeight,
    }}>
      {/* Top bar */}
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 20,
        backgroundColor: GAME.COLORS.OBSTACLE,
        borderWidth: 2,
        borderColor: GAME.COLORS.OBSTACLE_DARK,
      }}>
        {/* Direction indicator */}
        <Text style={{
          color: 'rgba(255,255,255,0.8)',
          fontSize: 10,
          textAlign: 'center',
          lineHeight: 16,
          fontFamily: 'monospace',
        }}>⬆</Text>
      </View>
      
      {/* Left pillar */}
      <View style={{
        position: 'absolute',
        left: 0,
        top: 20,
        width: w,
        height: gateHeight - 20,
        backgroundColor: GAME.COLORS.OBSTACLE,
        borderWidth: 2,
        borderColor: GAME.COLORS.OBSTACLE_DARK,
      }} />
      
      {/* Right pillar */}
      <View style={{
        position: 'absolute',
        right: 0,
        top: 20,
        width: w,
        height: gateHeight - 20,
        backgroundColor: GAME.COLORS.OBSTACLE,
        borderWidth: 2,
        borderColor: GAME.COLORS.OBSTACLE_DARK,
      }} />
      
      {/* Center gap indicator */}
      <View style={{
        position: 'absolute',
        left: w + 10,
        right: w + 10,
        top: 30,
        height: 2,
        backgroundColor: 'rgba(0,255,136,0.3)',
      }} />
    </View>
  );
};

// Star Power-up Renderer
const StarRenderer = (props) => {
  const size = 24;
  const pulse = props.pulse || 0;
  const scale = 1 + Math.sin(pulse) * 0.15;
  
  return (
    <View style={{
      position: 'absolute',
      left: props.x - (size * scale - size) / 2,
      top: props.y - (size * scale - size) / 2,
      width: size * scale,
      height: size * scale,
      transform: [{ scale }],
    }}>
      {/* Glow */}
      <View style={{
        position: 'absolute', left: -8, top: -8,
        width: size + 16, height: size + 16,
        backgroundColor: GAME.COLORS.STAR_GLOW,
        borderRadius: (size + 16) / 2,
      }} />
      {/* Star body */}
      <View style={{
        width: size, height: size,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Text style={{
          fontSize: 20,
          color: GAME.COLORS.STAR,
          textShadowColor: GAME.COLORS.STAR,
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 8,
        }}>★</Text>
      </View>
    </View>
  );
};

// Shield Power-up Renderer
const ShieldRenderer = (props) => {
  const size = 26;
  const pulse = props.pulse || 0;
  const scale = 1 + Math.sin(pulse + 1) * 0.1;
  
  return (
    <View style={{
      position: 'absolute',
      left: props.x - (size * scale - size) / 2,
      top: props.y - (size * scale - size) / 2,
      width: size * scale,
      height: size * scale,
      transform: [{ scale }],
    }}>
      {/* Glow */}
      <View style={{
        position: 'absolute', left: -8, top: -8,
        width: size + 16, height: size + 16,
        backgroundColor: 'rgba(0, 204, 255, 0.4)',
        borderRadius: (size + 16) / 2,
      }} />
      {/* Shield body */}
      <View style={{
        width: size, height: size,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Text style={{
          fontSize: 18,
          color: GAME.COLORS.SHIELD,
          textShadowColor: GAME.COLORS.SHIELD,
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 8,
        }}>🛡</Text>
      </View>
    </View>
  );
};

// SlowMo Power-up Renderer
const SlowMoRenderer = (props) => {
  const size = 26;
  const pulse = props.pulse || 0;
  const rotate = (pulse * 30) % 360;
  
  return (
    <View style={{
      position: 'absolute',
      left: props.x,
      top: props.y,
      width: size,
      height: size,
    }}>
      {/* Glow */}
      <View style={{
        position: 'absolute', left: -6, top: -6,
        width: size + 12, height: size + 12,
        backgroundColor: 'rgba(170, 102, 255, 0.4)',
        borderRadius: (size + 12) / 2,
      }} />
      {/* SlowMo body */}
      <View style={{
        width: size, height: size,
        justifyContent: 'center',
        alignItems: 'center',
        transform: [{ rotate: `${rotate}deg` }],
      }}>
        <Text style={{
          fontSize: 18,
          color: GAME.COLORS.SLOWMO,
          textShadowColor: GAME.COLORS.SLOWMO,
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 8,
        }}>⏱</Text>
      </View>
    </View>
  );
};

// Ground with pattern
const Ground = () => (
  <View style={{
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: GAME.GROUND_HEIGHT,
    backgroundColor: GAME.COLORS.GROUND,
  }}>
    {/* Top border line */}
    <View style={{
      height: 3,
      backgroundColor: GAME.COLORS.GROUND_LINE,
      shadowColor: GAME.COLORS.GROUND_LINE,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 6,
    }} />
    {/* Grid lines */}
    {Array.from({ length: 4 }).map((_, i) => (
      <View key={i} style={{
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginTop: 15,
      }} />
    ))}
  </View>
);

// Parallax stars background
const Stars = ({ offset }) => {
  // Generate fixed star positions
  const stars = useRef(
    Array.from({ length: 40 }).map(() => ({
      x: Math.random() * SW * 2,
      y: Math.random() * (SH - GAME.GROUND_HEIGHT),
      size: Math.random() * 2 + 1,
      speed: Math.random() * 0.5 + 0.2,
      opacity: Math.random() * 0.6 + 0.2,
    }))
  ).current;
  
  return (
    <View style={StyleSheet.absoluteFill}>
      {stars.map((star, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: ((star.x - (offset * star.speed)) % (SW * 2) + SW * 2) % (SW * 2) - SW * 0.5,
            top: star.y,
            width: star.size,
            height: star.size,
            backgroundColor: GAME.COLORS.STAR,
            opacity: star.opacity,
            borderRadius: star.size / 2,
          }}
        />
      ))}
    </View>
  );
};

// CRT Scanlines overlay
const Scanlines = () => (
  <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]} pointerEvents="none">
    {Array.from({ length: Math.floor(SH / 4) }).map((_, i) => (
      <View key={i} style={{
        height: 2,
        backgroundColor: GAME.COLORS.SCANLINE,
        marginBottom: 2,
      }} />
    ))}
  </View>
);

// SlowMo visual effect overlay
const SlowMoOverlay = ({ active }) => {
  if (!active) return null;
  
  return (
    <View style={[StyleSheet.absoluteFill, {
      zIndex: 90,
      backgroundColor: 'rgba(170, 102, 255, 0.15)',
      pointerEvents: 'none',
    }]}>
      {/* Ripple effect */}
      <View style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        borderWidth: 4,
        borderColor: 'rgba(170, 102, 255, 0.3)',
      }} />
    </View>
  );
};

// ============================================
// GAME SYSTEMS
// ============================================

const Physics = (entities, { time, dispatch }) => {
  const player = entities.player;
  const state = entities.gameState;
  
  if (!player || !state) return entities;
  
  // Apply slow-mo factor
  const timeScale = state.slowMoTime > 0 ? GAME.SLOWMO_FACTOR : 1;
  
  // Increase speed over time (slower during slow-mo)
  const speedIncrement = GAME.SPEED_INCREMENT * timeScale;
  state.speed = Math.min(GAME.MAX_SPEED, GAME.BASE_SPEED + state.frameCount * speedIncrement);
  state.frameCount++;
  state.scrollOffset += state.speed * timeScale;
  
  // Update power-up timers
  if (state.shieldTime > 0) {
    state.shieldTime -= 16 * timeScale;
    if (state.shieldTime < 0) state.shieldTime = 0;
  }
  if (state.slowMoTime > 0) {
    state.slowMoTime -= 16 * timeScale;
    if (state.slowMoTime < 0) state.slowMoTime = 0;
  }
  
  // Update player shield display
  player.shieldTime = state.shieldTime;
  
  // Gravity (affected by slow-mo)
  const gravity = GAME.GRAVITY * timeScale;
  player.velocity = Math.min(player.velocity + gravity, GAME.MAX_FALL_SPEED * timeScale);
  player.y += player.velocity;
  
  // Floor collision
  if (player.y + player.height > GAME.FLOOR_Y) {
    dispatch({ type: 'game-over' });
    return entities;
  }
  
  // Ceiling collision
  if (player.y < 0) {
    player.y = 0;
    player.velocity = 2;
  }
  
  // Move obstacles & score
  Object.keys(entities).forEach(key => {
    if (key.startsWith('obs_')) {
      const obs = entities[key];
      obs.x -= state.speed * timeScale;
      
      // Update moving blocks
      if (obs.type === 'moving') {
        obs.moveTimer = (obs.moveTimer || 0) + 16 * timeScale;
        const moveCycle = 2000; // 2 second cycle
        const moveProgress = (obs.moveTimer % moveCycle) / moveCycle;
        const moveRange = obs.moveRange || 80;
        const baseY = obs.baseY || obs.y;
        obs.y = baseY + Math.sin(moveProgress * Math.PI * 2) * (moveRange / 2);
      }
      
      // Score when passing obstacle (only count main obstacles, not slalom parts)
      if (!obs.scored && obs.x + (obs.totalWidth || obs.width) < player.x && obs.givesScore !== false) {
        obs.scored = true;
        state.score++;
        dispatch({ type: 'score', score: state.score });
      }
      
      // Remove off-screen
      if (obs.x < -200) {
        delete entities[key];
      }
    }
    
    // Move and animate power-ups
    if (key.startsWith('powerup_')) {
      const powerup = entities[key];
      powerup.x -= state.speed * timeScale;
      powerup.pulse = (powerup.pulse || 0) + 0.1 * timeScale;
      
      // Remove off-screen
      if (powerup.x < -50) {
        delete entities[key];
      }
    }
  });
  
  return entities;
};

const SpawnSystem = (entities, { time, dispatch }) => {
  const state = entities.gameState;
  if (!state) return entities;
  
  const timeScale = state.slowMoTime > 0 ? GAME.SLOWMO_FACTOR : 1;
  state.spawnTimer += 16 * timeScale;
  
  // Dynamic spawn rate based on speed - more aggressive at higher speeds
  const speedFactor = (state.speed - GAME.BASE_SPEED) / (GAME.MAX_SPEED - GAME.BASE_SPEED);
  const baseInterval = GAME.MAX_SPAWN_MS - (speedFactor * 800); // Spawn faster as speed increases
  const spawnInterval = Math.max(GAME.MIN_SPAWN_MS, baseInterval);
  
  if (state.spawnTimer >= spawnInterval) {
    state.spawnTimer = 0;
    
    // Check for cluster spawn (2-3 obstacles in quick succession)
    const clusterChance = Math.min(0.35, 0.15 + speedFactor * 0.2); // Increases with speed
    if (Math.random() < clusterChance && !state.clusterSpawnRemaining) {
      state.clusterSpawnRemaining = Math.floor(Math.random() * 2) + 2; // 2-3 obstacles
      state.clusterGap = 400 + Math.random() * 300; // Gap between cluster obstacles
    }
    
    // Spawn obstacle
    spawnObstacle(entities, state);
    
    // Handle cluster spawning
    if (state.clusterSpawnRemaining > 0) {
      state.clusterSpawnRemaining--;
      state.spawnTimer = spawnInterval - state.clusterGap;
    }
    
    // Random chance to spawn power-up (not during cluster)
    if (!state.clusterSpawnRemaining && Math.random() < 0.40) {
      spawnPowerUp(entities, state);
    }
  }
  
  return entities;
};

const spawnObstacle = (entities, state) => {
  const id = `obs_${Date.now()}_${Math.random()}`;
  
  // Dynamic probabilities based on speed - more mid-air at higher speeds
  const speedFactor = Math.min(1, (state.speed - GAME.BASE_SPEED) / (GAME.MAX_SPEED - GAME.BASE_SPEED));
  
  // Weights shift as speed increases:
  // Floor: 20% → 10%, Ceiling: 15% → 10%, Mid: 35% → 45%, Moving: 18% → 22%, Slalom: 12% → 13%
  const floorWeight = 0.20 - (speedFactor * 0.10);      // 20% → 10%
  const ceilingWeight = 0.15 - (speedFactor * 0.05);    // 15% → 10%
  const midWeight = 0.35 + (speedFactor * 0.10);        // 35% → 45%
  const movingWeight = 0.18 + (speedFactor * 0.04);     // 18% → 22%
  // Slalom gets remainder
  
  const type = Math.random();
  let obsY, obsH, obstacleType = 'normal', totalWidth, gapY;
  
  if (type < floorWeight) {
    // Floor spike
    obsH = GAME.MIN_OBSTACLE_HEIGHT + Math.random() * (GAME.MAX_OBSTACLE_HEIGHT - GAME.MIN_OBSTACLE_HEIGHT);
    obsY = GAME.FLOOR_Y - obsH;
  } else if (type < floorWeight + ceilingWeight) {
    // Ceiling spike
    obsH = GAME.MIN_OBSTACLE_HEIGHT + Math.random() * 60;
    obsY = 0;
    obstacleType = 'ceiling';
  } else if (type < floorWeight + ceilingWeight + midWeight) {
    // Mid-air block - more variety in height
    const midType = Math.random();
    if (midType < 0.33) {
      // Low mid (just above floor)
      obsH = 30 + Math.random() * 40;
      obsY = GAME.FLOOR_Y - 100 - Math.random() * 80;
    } else if (midType < 0.66) {
      // Center mid
      obsH = 25 + Math.random() * 35;
      obsY = 120 + Math.random() * (GAME.FLOOR_Y - 300);
    } else {
      // High mid (near ceiling)
      obsH = 30 + Math.random() * 30;
      obsY = 40 + Math.random() * 60;
    }
    obstacleType = 'mid';
  } else if (type < floorWeight + ceilingWeight + midWeight + movingWeight) {
    // Moving block
    obsH = 40 + Math.random() * 30;
    obsY = 100 + Math.random() * (GAME.FLOOR_Y - 220);
    obstacleType = 'moving';
  } else {
    // Slalom gate
    obstacleType = 'slalom';
    totalWidth = 100 + Math.random() * 60;
    gapY = 80 + Math.random() * (GAME.FLOOR_Y - 220);
    obsH = 120;
  }
  
  if (obstacleType === 'slalom') {
    entities[id] = {
      x: SW + 20,
      y: gapY,
      totalWidth: totalWidth,
      height: obsH,
      gapY: gapY,
      gateHeight: obsH,
      type: obstacleType,
      scored: false,
      givesScore: true,
      renderer: SlalomGateRenderer,
    };
  } else if (obstacleType === 'moving') {
    entities[id] = {
      x: SW + 20,
      y: obsY,
      baseY: obsY,
      width: GAME.OBSTACLE_WIDTH,
      height: obsH,
      type: obstacleType,
      moveTimer: 0,
      moveRange: 60 + Math.random() * 60,
      scored: false,
      renderer: MovingBlockRenderer,
    };
  } else {
    entities[id] = {
      x: SW + 20,
      y: obsY,
      width: GAME.OBSTACLE_WIDTH,
      height: obsH,
      isTop: obstacleType === 'ceiling',
      type: obstacleType,
      scored: false,
      renderer: ObstacleRenderer,
    };
  }
};

const spawnPowerUp = (entities, state) => {
  const id = `powerup_${Date.now()}_${Math.random()}`;
  
  // Random power-up type
  const powerUpType = Math.random();
  let type, renderer, yPos;
  
  if (powerUpType < 0.4) {
    type = 'star';
    renderer = StarRenderer;
  } else if (powerUpType < 0.7) {
    type = 'shield';
    renderer = ShieldRenderer;
  } else {
    type = 'slowmo';
    renderer = SlowMoRenderer;
  }
  
  // Position power-up at a reachable height
  yPos = 80 + Math.random() * (GAME.FLOOR_Y - 160);
  
  entities[id] = {
    x: SW + 20,
    y: yPos,
    width: 24,
    height: 24,
    type: type,
    pulse: 0,
    renderer: renderer,
  };
};

const CollisionSystem = (entities, { dispatch }) => {
  const player = entities.player;
  const state = entities.gameState;
  if (!player || !state) return entities;
  
  const px = player.x, py = player.y;
  const pw = player.width, ph = player.height;
  // Slightly smaller hitbox for fairness
  const margin = 4;
  
  // Check obstacle collisions
  Object.keys(entities).forEach(key => {
    if (key.startsWith('obs_')) {
      const obs = entities[key];
      let collision = false;
      
      if (obs.type === 'slalom') {
        // Slalom gate collision - check left and right pillars
        const w = GAME.OBSTACLE_WIDTH;
        const gapWidth = obs.totalWidth - w * 2;
        
        // Left pillar
        if (px + margin < obs.x + w && px + pw - margin > obs.x &&
            py + margin < obs.y + obs.gateHeight && py + ph - margin > obs.y + 20) {
          collision = true;
        }
        // Right pillar
        if (px + margin < obs.x + obs.totalWidth && px + pw - margin > obs.x + obs.totalWidth - w &&
            py + margin < obs.y + obs.gateHeight && py + ph - margin > obs.y + 20) {
          collision = true;
        }
        // Top bar
        if (px + margin < obs.x + obs.totalWidth && px + pw - margin > obs.x &&
            py + margin < obs.y + 20 && py + ph - margin > obs.y) {
          collision = true;
        }
      } else {
        // Standard obstacle collision
        if (px + margin < obs.x + obs.width && px + pw - margin > obs.x &&
            py + margin < obs.y + obs.height && py + ph - margin > obs.y) {
          collision = true;
        }
      }
      
      if (collision) {
        if (state.shieldTime > 0) {
          // Shield protects - destroy obstacle and continue
          state.shieldTime = 0;
          delete entities[key];
          dispatch({ type: 'shield-break' });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } else {
          dispatch({ type: 'game-over' });
        }
      }
    }
    
    // Check power-up collection
    if (key.startsWith('powerup_')) {
      const powerup = entities[key];
      if (px < powerup.x + powerup.width && px + pw > powerup.x &&
          py < powerup.y + powerup.height && py + ph > powerup.y) {
        
        // Collect power-up
        dispatch({ type: 'powerup-collect', powerupType: powerup.type });
        
        // Apply effect
        if (powerup.type === 'star') {
          state.score += GAME.STAR_POINTS;
          dispatch({ type: 'score', score: state.score });
        } else if (powerup.type === 'shield') {
          state.shieldTime = GAME.SHIELD_DURATION;
        } else if (powerup.type === 'slowmo') {
          state.slowMoTime = GAME.SLOWMO_DURATION;
        }
        
        delete entities[key];
      }
    }
  });
  
  return entities;
};

// ============================================
// MAIN GAME SCREEN
// ============================================

export default function GameScreen() {
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highscore, setHighscoreState] = useState(0);
  const [isNewHighscore, setIsNewHighscore] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [showMenu, setShowMenu] = useState(true);
  const [paused, setPaused] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(1);
  const [shieldActive, setShieldActive] = useState(false);
  const [slowMoActive, setSlowMoActive] = useState(false);
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const engineRef = useRef(null);

  const togglePause = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (paused) {
      setPaused(false);
      setRunning(true);
    } else {
      setPaused(true);
      setRunning(false);
    }
  };

  useEffect(() => {
    getHighscore().then(setHighscoreState);
    initSounds();
    return () => cleanup();
  }, []);

  // Blinking animation for "TAP TO START"
  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0.2, duration: 600, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, []);

  const createEntities = () => ({
    player: {
      x: GAME.PLAYER_X,
      y: SH / 2 - GAME.PLAYER_SIZE / 2,
      width: GAME.PLAYER_SIZE,
      height: GAME.PLAYER_SIZE,
      velocity: 0,
      shieldTime: 0,
      renderer: Player,
    },
    gameState: {
      score: 0,
      speed: GAME.BASE_SPEED,
      frameCount: 0,
      spawnTimer: 0,
      scrollOffset: 0,
      shieldTime: 0,
      slowMoTime: 0,
      clusterSpawnRemaining: 0,
      clusterGap: 0,
      renderer: () => null,
    },
  });

  const [entities, setEntities] = useState(createEntities);

  const onEvent = useCallback(async (e) => {
    if (e.type === 'game-over') {
      setRunning(false);
      setGameOver(true);
      setShieldActive(false);
      setSlowMoActive(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      playSound('crash');
      const isNew = await checkHighscore(score);
      if (isNew) {
        setHighscoreState(score);
        setIsNewHighscore(true);
      }
    } else if (e.type === 'score') {
      setScore(e.score);
      if (e.score % 10 === 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        playSound('milestone');
      } else {
        playSound('score');
      }
    } else if (e.type === 'powerup-collect') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      playSound('powerup');
      if (e.powerupType === 'shield') {
        setShieldActive(true);
      } else if (e.powerupType === 'slowmo') {
        setSlowMoActive(true);
      }
    } else if (e.type === 'shield-break') {
      setShieldActive(false);
      playSound('shield-break');
    }
  }, [score]);

  const handleTap = () => {
    if (showMenu) {
      // Start game
      const newEntities = createEntities();
      setShowMenu(false);
      setScore(0);
      setGameOver(false);
      setIsNewHighscore(false);
      setShieldActive(false);
      setSlowMoActive(false);
      setGameKey(k => k + 1);
      setEntities(newEntities);
      setTimeout(() => setRunning(true), 50);
      return;
    }
    
    if (gameOver) {
      // Restart
      const newEntities = createEntities();
      setScore(0);
      setGameOver(false);
      setIsNewHighscore(false);
      setShieldActive(false);
      setSlowMoActive(false);
      setGameKey(k => k + 1);
      setEntities(newEntities);
      setTimeout(() => setRunning(true), 50);
      return;
    }
    
    // Don't jump while paused
    if (paused) return;
    
    // Jump
    if (entities.player) {
      entities.player.velocity = GAME.JUMP_FORCE;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      playSound('jump');
    }
  };

  // Update scroll offset for parallax + speed display + power-up states
  useEffect(() => {
    if (running && entities.gameState) {
      const interval = setInterval(() => {
        setScrollOffset(entities.gameState.scrollOffset || 0);
        const spd = entities.gameState.speed || GAME.BASE_SPEED;
        setCurrentSpeed(Math.round((spd / GAME.BASE_SPEED) * 10) / 10);
        
        // Update power-up UI states
        setShieldActive(entities.gameState.shieldTime > 0);
        setSlowMoActive(entities.gameState.slowMoTime > 0);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [running]);

  return (
    <TouchableWithoutFeedback onPress={handleTap}>
      <View style={styles.container}>
        <StatusBar hidden />
        
        {/* Background gradient */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: GAME.COLORS.BG }]} />
        <View style={[StyleSheet.absoluteFill, {
          backgroundColor: GAME.COLORS.BG2,
          opacity: 0.5,
        }]} />
        
        {/* Stars parallax */}
        <Stars offset={scrollOffset} />
        
        {/* Ground */}
        <Ground />
        
        {/* SlowMo visual effect */}
        <SlowMoOverlay active={slowMoActive} />
        
        {/* Score + Speed + Pause */}
        {!showMenu && !gameOver && (
          <>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>SCORE</Text>
              <Text style={styles.score}>{String(score).padStart(4, '0')}</Text>
            </View>
            <View style={styles.speedContainer}>
              <Text style={styles.speedLabel}>SPEED</Text>
              <Text style={[styles.speedValue, currentSpeed >= 1.8 && { color: GAME.COLORS.OBSTACLE }]}
              >
                {currentSpeed}x
              </Text>
            </View>
            
            {/* Shield indicator */}
            {shieldActive && (
              <View style={styles.shieldIndicator}>
                <Text style={styles.shieldIcon}>🛡</Text>
              </View>
            )}
            
            {/* SlowMo indicator */}
            {slowMoActive && (
              <View style={styles.slowMoIndicator}>
                <Text style={styles.slowMoIcon}>⏱</Text>
              </View>
            )}
            
            <TouchableWithoutFeedback onPress={togglePause}>
              <View style={styles.pauseButton}>
                <Text style={styles.pauseIcon}>{paused ? '▶' : '⏸'}</Text>
              </View>
            </TouchableWithoutFeedback>
          </>
        )}
        
        {/* Pause Overlay - catches its own taps to resume */}
        {paused && (
          <TouchableWithoutFeedback onPress={() => { setPaused(false); setRunning(true); }}>
            <View style={styles.overlay}>
              <Text style={styles.pauseTitle}>PAUSED</Text>
              <View style={styles.menuDivider} />
              <Text style={styles.finalScore}>SCORE: {String(score).padStart(4, '0')}</Text>
              {shieldActive && <Text style={styles.powerupStatus}>🛡 SHIELD ACTIVE</Text>}
              {slowMoActive && <Text style={styles.powerupStatus}>⏱ SLOW-MO ACTIVE</Text>}
              <Animated.Text style={[styles.tapToStart, { opacity: blinkAnim }]}>TAP TO RESUME</Animated.Text>
            </View>
          </TouchableWithoutFeedback>
        )}
        
        {/* Menu Screen */}
        {showMenu && (
          <View style={styles.overlay}>
            <Text style={styles.title}>GLITCH</Text>
            <Text style={styles.titleAccent}>JUMP</Text>
            <View style={styles.menuDivider} />
            <Text style={styles.menuHighscore}>BEST: {String(highscore).padStart(4, '0')}</Text>
            <View style={styles.instructions}>
              <Text style={styles.instructionText}>★ Star: +5 points</Text>
              <Text style={styles.instructionText}>🛡 Shield: protection</Text>
              <Text style={styles.instructionText}>⏱ SlowMo: slow time</Text>
            </View>
            <Animated.Text style={[styles.tapToStart, { opacity: blinkAnim }]}>TAP TO START</Animated.Text>
          </View>
        )}
        
        {/* Game Over Screen */}
        {gameOver && (
          <View style={styles.overlay}>
            <Text style={styles.gameOverText}>GAME</Text>
            <Text style={styles.gameOverText}>OVER</Text>
            <View style={styles.menuDivider} />
            <Text style={styles.finalScore}>SCORE: {String(score).padStart(4, '0')}</Text>
            <Text style={styles.menuHighscore}>BEST: {String(highscore).padStart(4, '0')}</Text>
            {isNewHighscore && (
              <Text style={styles.newHighscore}>★ NEW RECORD ★</Text>
            )}
            <Text style={styles.speedStat}>MAX SPEED: {currentSpeed}x</Text>
            <Animated.Text style={[styles.tapToStart, { opacity: blinkAnim }]}>TAP TO RETRY</Animated.Text>
          </View>
        )}
        
        {/* Game Engine */}
        <GameEngine
          key={gameKey}
          ref={engineRef}
          style={styles.game}
          systems={[Physics, SpawnSystem, CollisionSystem]}
          entities={entities}
          running={running}
          onEvent={onEvent}
        />
        
        {/* CRT Scanlines */}
        <Scanlines />
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GAME.COLORS.BG,
  },
  game: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  scoreContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    alignItems: 'flex-end',
    zIndex: 50,
  },
  scoreLabel: {
    color: GAME.COLORS.TEXT_DIM,
    fontSize: 12,
    fontFamily: 'monospace',
    letterSpacing: 3,
  },
  score: {
    color: GAME.COLORS.SCORE,
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    textShadowColor: GAME.COLORS.SCORE,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,14,23,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 80,
  },
  title: {
    color: GAME.COLORS.TEXT,
    fontSize: 56,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    letterSpacing: 8,
  },
  titleAccent: {
    color: GAME.COLORS.PLAYER,
    fontSize: 56,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    letterSpacing: 8,
    textShadowColor: GAME.COLORS.PLAYER,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
    marginTop: -8,
  },
  menuDivider: {
    width: 80,
    height: 2,
    backgroundColor: GAME.COLORS.ACCENT,
    marginVertical: 20,
    shadowColor: GAME.COLORS.ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  menuHighscore: {
    color: GAME.COLORS.TEXT_DIM,
    fontSize: 16,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  tapToStart: {
    color: GAME.COLORS.TEXT,
    fontSize: 16,
    fontFamily: 'monospace',
    marginTop: 30,
    opacity: 0.8,
    letterSpacing: 2,
  },
  gameOverText: {
    color: GAME.COLORS.OBSTACLE,
    fontSize: 52,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    letterSpacing: 6,
    textShadowColor: GAME.COLORS.OBSTACLE,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 12,
    lineHeight: 58,
  },
  finalScore: {
    color: GAME.COLORS.SCORE,
    fontSize: 24,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  pauseButton: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  pauseIcon: {
    color: GAME.COLORS.TEXT_DIM,
    fontSize: 22,
    padding: 8,
  },
  pauseTitle: {
    color: GAME.COLORS.TEXT,
    fontSize: 48,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    letterSpacing: 6,
  },
  speedContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    alignItems: 'flex-start',
    zIndex: 50,
  },
  speedLabel: {
    color: GAME.COLORS.TEXT_DIM,
    fontSize: 12,
    fontFamily: 'monospace',
    letterSpacing: 3,
  },
  speedValue: {
    color: GAME.COLORS.ACCENT,
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  speedStat: {
    color: GAME.COLORS.TEXT_DIM,
    fontSize: 14,
    fontFamily: 'monospace',
    marginTop: 8,
    letterSpacing: 1,
  },
  newHighscore: {
    color: GAME.COLORS.ACCENT,
    fontSize: 18,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    marginTop: 12,
    textShadowColor: GAME.COLORS.ACCENT,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  shieldIndicator: {
    position: 'absolute',
    top: 90,
    left: 20,
    zIndex: 50,
    backgroundColor: 'rgba(0, 204, 255, 0.2)',
    borderRadius: 12,
    padding: 4,
  },
  shieldIcon: {
    fontSize: 20,
  },
  slowMoIndicator: {
    position: 'absolute',
    top: 90,
    left: 55,
    zIndex: 50,
    backgroundColor: 'rgba(170, 102, 255, 0.2)',
    borderRadius: 12,
    padding: 4,
  },
  slowMoIcon: {
    fontSize: 20,
  },
  powerupStatus: {
    color: GAME.COLORS.ACCENT,
    fontSize: 14,
    fontFamily: 'monospace',
    marginTop: 8,
    letterSpacing: 1,
  },
  instructions: {
    marginTop: 20,
    alignItems: 'center',
  },
  instructionText: {
    color: GAME.COLORS.TEXT_DIM,
    fontSize: 12,
    fontFamily: 'monospace',
    marginVertical: 2,
    letterSpacing: 1,
  },
});
