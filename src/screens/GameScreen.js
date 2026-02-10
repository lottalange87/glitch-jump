import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine } from 'react-native-game-engine';
import { StyleSheet, StatusBar, TouchableWithoutFeedback, View, Text, Dimensions, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { GAME } from '../utils/constants';
import { getHighscore, checkHighscore } from '../utils/storage';

const { width: SW, height: SH } = Dimensions.get('window');

// ============================================
// RENDERERS
// ============================================

// Pixel-art style player with face
const Player = (props) => {
  const s = props.width || GAME.PLAYER_SIZE;
  return (
    <View style={{
      position: 'absolute',
      left: props.x,
      top: props.y,
      width: s,
      height: s,
    }}>
      {/* Glow effect */}
      <View style={{
        position: 'absolute', left: -4, top: -4,
        width: s + 8, height: s + 8,
        backgroundColor: 'rgba(0,255,136,0.15)',
        borderRadius: 4,
      }} />
      {/* Body */}
      <View style={{
        width: s, height: s,
        backgroundColor: GAME.COLORS.PLAYER,
        borderWidth: 2,
        borderColor: GAME.COLORS.PLAYER_GLOW,
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

// ============================================
// GAME SYSTEMS
// ============================================

const Physics = (entities, { time, dispatch }) => {
  const player = entities.player;
  const state = entities.gameState;
  
  if (!player || !state) return entities;
  
  // Increase speed over time
  state.speed = Math.min(GAME.MAX_SPEED, GAME.BASE_SPEED + state.frameCount * GAME.SPEED_INCREMENT);
  state.frameCount++;
  state.scrollOffset += state.speed;
  
  // Gravity
  player.velocity = Math.min(player.velocity + GAME.GRAVITY, GAME.MAX_FALL_SPEED);
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
      obs.x -= state.speed;
      
      // Score when passing obstacle
      if (!obs.scored && obs.x + obs.width < player.x) {
        obs.scored = true;
        state.score++;
        dispatch({ type: 'score', score: state.score });
      }
      
      // Remove off-screen
      if (obs.x < -60) {
        delete entities[key];
      }
    }
  });
  
  return entities;
};

const SpawnSystem = (entities, { time }) => {
  const state = entities.gameState;
  if (!state) return entities;
  
  state.spawnTimer += 16;
  
  // Dynamic spawn rate based on speed
  const spawnInterval = Math.max(GAME.MIN_SPAWN_MS, GAME.MAX_SPAWN_MS - state.frameCount * 0.5);
  
  if (state.spawnTimer >= spawnInterval) {
    state.spawnTimer = 0;
    const id = `obs_${Date.now()}_${Math.random()}`;
    
    // Random obstacle type
    const type = Math.random();
    let obsY, obsH;
    
    if (type < 0.4) {
      // Floor spike
      obsH = GAME.MIN_OBSTACLE_HEIGHT + Math.random() * (GAME.MAX_OBSTACLE_HEIGHT - GAME.MIN_OBSTACLE_HEIGHT);
      obsY = GAME.FLOOR_Y - obsH;
    } else if (type < 0.7) {
      // Ceiling spike
      obsH = GAME.MIN_OBSTACLE_HEIGHT + Math.random() * 60;
      obsY = 0;
    } else {
      // Mid-air block
      obsH = 30 + Math.random() * 40;
      obsY = 100 + Math.random() * (GAME.FLOOR_Y - 200);
    }
    
    entities[id] = {
      x: SW + 20,
      y: obsY,
      width: GAME.OBSTACLE_WIDTH,
      height: obsH,
      isTop: type >= 0.4 && type < 0.7,
      scored: false,
      renderer: ObstacleRenderer,
    };
  }
  
  return entities;
};

const CollisionSystem = (entities, { dispatch }) => {
  const player = entities.player;
  if (!player) return entities;
  
  const px = player.x, py = player.y;
  const pw = player.width, ph = player.height;
  // Slightly smaller hitbox for fairness
  const margin = 4;
  
  Object.keys(entities).forEach(key => {
    if (key.startsWith('obs_')) {
      const obs = entities[key];
      if (
        px + margin < obs.x + obs.width &&
        px + pw - margin > obs.x &&
        py + margin < obs.y + obs.height &&
        py + ph - margin > obs.y
      ) {
        dispatch({ type: 'game-over' });
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
  const [gameKey, setGameKey] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(1);
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const engineRef = useRef(null);

  useEffect(() => {
    getHighscore().then(setHighscoreState);
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
      renderer: Player,
    },
    gameState: {
      score: 0,
      speed: GAME.BASE_SPEED,
      frameCount: 0,
      spawnTimer: 0,
      scrollOffset: 0,
      renderer: () => null,
    },
  });

  const [entities, setEntities] = useState(createEntities);

  const onEvent = useCallback(async (e) => {
    if (e.type === 'game-over') {
      setRunning(false);
      setGameOver(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const isNew = await checkHighscore(score);
      if (isNew) {
        setHighscoreState(score);
        setIsNewHighscore(true);
      }
    } else if (e.type === 'score') {
      setScore(e.score);
      // Milestone haptics
      if (e.score % 10 === 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
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
      setGameKey(k => k + 1);
      setEntities(newEntities);
      setTimeout(() => setRunning(true), 50);
      return;
    }
    
    // Jump
    if (entities.player) {
      entities.player.velocity = GAME.JUMP_FORCE;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Update scroll offset for parallax + speed display
  useEffect(() => {
    if (running && entities.gameState) {
      const interval = setInterval(() => {
        setScrollOffset(entities.gameState.scrollOffset || 0);
        const spd = entities.gameState.speed || GAME.BASE_SPEED;
        setCurrentSpeed(Math.round((spd / GAME.BASE_SPEED) * 10) / 10);
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
        
        {/* Score + Speed */}
        {!showMenu && !gameOver && (
          <>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>SCORE</Text>
              <Text style={styles.score}>{String(score).padStart(4, '0')}</Text>
            </View>
            <View style={styles.speedContainer}>
              <Text style={styles.speedLabel}>SPEED</Text>
              <Text style={[styles.speedValue, currentSpeed >= 1.8 && { color: GAME.COLORS.OBSTACLE }]}>
                {currentSpeed}x
              </Text>
            </View>
          </>
        )}
        
        {/* Menu Screen */}
        {showMenu && (
          <View style={styles.overlay}>
            <Text style={styles.title}>GLITCH</Text>
            <Text style={styles.titleAccent}>JUMP</Text>
            <View style={styles.menuDivider} />
            <Text style={styles.menuHighscore}>BEST: {String(highscore).padStart(4, '0')}</Text>
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
});
