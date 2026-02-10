import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine } from 'react-native-game-engine';
import { StyleSheet, StatusBar, TouchableWithoutFeedback, View, Text, Dimensions, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { GAME, CHARACTER_SKINS } from '../utils/constants';
import { getHighscore, checkHighscore, getCoins, addCoins, getMysteryBoxes, addMysteryBox, openMysteryBoxReward, getSkinData, setCurrentSkin, purchaseSkin, getCurrentSkin } from '../utils/storage';
import { initSounds, playSound, playCoinSound, playBoxOpenSound, playNearMissSound, cleanup } from '../utils/sounds';

const { width: SW, height: SH } = Dimensions.get('window');

// ============================================
// RENDERERS
// ============================================

// Pixel-art style player with face - supports skins
const Player = (props) => {
  const s = props.width || GAME.PLAYER_SIZE;
  const hasShield = props.shieldTime > 0;
  const shieldOpacity = hasShield ? Math.min(1, props.shieldTime / 500) : 0;
  const skin = props.skin || CHARACTER_SKINS[0];
  
  return (
    <View style={{
      position: 'absolute', left: props.x, top: props.y, width: s, height: s,
    }}>
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
      <View style={{
        position: 'absolute', left: -4, top: -4,
        width: s + 8, height: s + 8,
        backgroundColor: hasShield ? 'rgba(0,204,255,0.25)' : skin.glowColor + '26',
        borderRadius: 4,
      }} />
      <View style={{
        width: s, height: s,
        backgroundColor: skin.color,
        borderWidth: 2,
        borderColor: hasShield ? GAME.COLORS.PLAYER_SHIELD : skin.glowColor,
        borderRadius: 3,
      }}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          paddingRight: 4,
          paddingTop: 6,
          gap: 3,
        }}>
          <View style={{ width: 4, height: 4, backgroundColor: skin.eyeColor, borderRadius: 1 }} />
          <View style={{ width: 4, height: 4, backgroundColor: skin.eyeColor, borderRadius: 1 }} />
        </View>
      </View>
    </View>
  );
};

// Spike-style obstacle
const ObstacleRenderer = (props) => {
  const w = props.width || GAME.OBSTACLE_WIDTH;
  const h = props.height || 60;
  
  return (
    <View style={{
      position: 'absolute', left: props.x, top: props.y, width: w, height: h,
    }}>
      <View style={{
        position: 'absolute', left: -3, top: -3,
        width: w + 6, height: h + 6,
        backgroundColor: GAME.COLORS.OBSTACLE_GLOW,
        borderRadius: 2,
      }} />
      <View style={{
        width: w, height: h,
        backgroundColor: GAME.COLORS.OBSTACLE,
        borderWidth: 2,
        borderColor: GAME.COLORS.OBSTACLE_DARK,
        borderRadius: 2,
      }}>
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
      position: 'absolute', left: props.x, top: props.y, width: w, height: h,
    }}>
      <View style={{
        position: 'absolute', left: -4, top: -4,
        width: w + 8, height: h + 8,
        backgroundColor: 'rgba(255,100,100,0.4)',
        borderRadius: 2,
      }} />
      <View style={{
        width: w, height: h,
        backgroundColor: '#ff4466',
        borderWidth: 2,
        borderColor: '#ff6688',
        borderRadius: 2,
      }}>
        <View style={{
          position: 'absolute', top: 4, left: '50%', marginLeft: -4,
          width: 0, height: 0,
          borderLeftWidth: 4, borderRightWidth: 4, borderBottomWidth: 6,
          borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'rgba(255,255,255,0.6)',
        }} />
        <View style={{
          position: 'absolute', bottom: 4, left: '50%', marginLeft: -4,
          width: 0, height: 0,
          borderLeftWidth: 4, borderRightWidth: 4, borderTopWidth: 6,
          borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: 'rgba(255,255,255,0.6)',
        }} />
        <View style={{ position: 'absolute', top: '30%', left: 2, right: 2, height: 2, backgroundColor: 'rgba(0,0,0,0.3)' }} />
        <View style={{ position: 'absolute', top: '70%', left: 2, right: 2, height: 2, backgroundColor: 'rgba(0,0,0,0.3)' }} />
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
      position: 'absolute', left: props.x, top: gapY, width: totalWidth, height: gateHeight,
    }}>
      <View style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 20,
        backgroundColor: GAME.COLORS.OBSTACLE,
        borderWidth: 2, borderColor: GAME.COLORS.OBSTACLE_DARK,
      }}>
        <Text style={{
          color: 'rgba(255,255,255,0.8)', fontSize: 10, textAlign: 'center', lineHeight: 16, fontFamily: 'monospace',
        }}>⬆</Text>
      </View>
      <View style={{
        position: 'absolute', left: 0, top: 20, width: w, height: gateHeight - 20,
        backgroundColor: GAME.COLORS.OBSTACLE, borderWidth: 2, borderColor: GAME.COLORS.OBSTACLE_DARK,
      }} />
      <View style={{
        position: 'absolute', right: 0, top: 20, width: w, height: gateHeight - 20,
        backgroundColor: GAME.COLORS.OBSTACLE, borderWidth: 2, borderColor: GAME.COLORS.OBSTACLE_DARK,
      }} />
      <View style={{
        position: 'absolute', left: w + 10, right: w + 10, top: 30, height: 2,
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
      position: 'absolute', left: props.x - (size * scale - size) / 2, top: props.y - (size * scale - size) / 2,
      width: size * scale, height: size * scale, transform: [{ scale }],
    }}>
      <View style={{
        position: 'absolute', left: -8, top: -8, width: size + 16, height: size + 16,
        backgroundColor: GAME.COLORS.STAR_GLOW, borderRadius: (size + 16) / 2,
      }} />
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{
          fontSize: 20, color: GAME.COLORS.STAR,
          textShadowColor: GAME.COLORS.STAR, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8,
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
      position: 'absolute', left: props.x - (size * scale - size) / 2, top: props.y - (size * scale - size) / 2,
      width: size * scale, height: size * scale, transform: [{ scale }],
    }}>
      <View style={{
        position: 'absolute', left: -8, top: -8, width: size + 16, height: size + 16,
        backgroundColor: 'rgba(0, 204, 255, 0.4)', borderRadius: (size + 16) / 2,
      }} />
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{
          fontSize: 18, color: GAME.COLORS.SHIELD,
          textShadowColor: GAME.COLORS.SHIELD, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8,
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
    <View style={{ position: 'absolute', left: props.x, top: props.y, width: size, height: size }}>
      <View style={{
        position: 'absolute', left: -6, top: -6, width: size + 12, height: size + 12,
        backgroundColor: 'rgba(170, 102, 255, 0.4)', borderRadius: (size + 12) / 2,
      }} />
      <View style={{
        width: size, height: size, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: `${rotate}deg` }],
      }}>
        <Text style={{
          fontSize: 18, color: GAME.COLORS.SLOWMO,
          textShadowColor: GAME.COLORS.SLOWMO, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8,
        }}>⏱</Text>
      </View>
    </View>
  );
};

// Ground with pattern
const Ground = () => (
  <View style={{
    position: 'absolute', bottom: 0, left: 0, right: 0, height: GAME.GROUND_HEIGHT,
    backgroundColor: GAME.COLORS.GROUND,
  }}>
    <View style={{
      height: 3, backgroundColor: GAME.COLORS.GROUND_LINE,
      shadowColor: GAME.COLORS.GROUND_LINE, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6,
    }} />
    {Array.from({ length: 4 }).map((_, i) => (
      <View key={i} style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginTop: 15 }} />
    ))}
  </View>
);

// Parallax stars background
const Stars = ({ offset }) => {
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
        <View key={i} style={{
          position: 'absolute',
          left: ((star.x - (offset * star.speed)) % (SW * 2) + SW * 2) % (SW * 2) - SW * 0.5,
          top: star.y, width: star.size, height: star.size,
          backgroundColor: GAME.COLORS.STAR, opacity: star.opacity, borderRadius: star.size / 2,
        }} />
      ))}
    </View>
  );
};

// CRT Scanlines overlay
const Scanlines = () => (
  <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]} pointerEvents="none">
    {Array.from({ length: Math.floor(SH / 4) }).map((_, i) => (
      <View key={i} style={{ height: 2, backgroundColor: GAME.COLORS.SCANLINE, marginBottom: 2 }} />
    ))}
  </View>
);

// SlowMo visual effect overlay
const SlowMoOverlay = ({ active }) => {
  if (!active) return null;
  
  return (
    <View style={[StyleSheet.absoluteFill, {
      zIndex: 90, backgroundColor: 'rgba(170, 102, 255, 0.15)', pointerEvents: 'none',
    }]}>
      <View style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        borderWidth: 4, borderColor: 'rgba(170, 102, 255, 0.3)',
      }} />
    </View>
  );
};

// Near Miss text overlay
const NearMissText = ({ visible }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;
  
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.delay(800),
          Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.2, duration: 150, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]),
      ]).start();
    }
  }, [visible]);
  
  if (!visible) return null;
  
  return (
    <Animated.View style={{
      position: 'absolute', top: '35%', left: 0, right: 0, alignItems: 'center',
      zIndex: 60, pointerEvents: 'none', opacity, transform: [{ scale }],
    }}>
      <Text style={{
        fontSize: 32, fontWeight: 'bold', fontFamily: 'monospace', color: GAME.COLORS.NEAR_MISS,
        textShadowColor: GAME.COLORS.NEAR_MISS, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20, letterSpacing: 4,
      }}>NEAR MISS!</Text>
      <Text style={{ fontSize: 14, fontFamily: 'monospace', color: GAME.COLORS.COIN, marginTop: 4 }}>+{GAME.NEAR_MISS_BONUS_COINS} coins</Text>
    </Animated.View>
  );
};

// Coin Counter Display
const CoinCounter = ({ coins }) => (
  <View style={{
    position: 'absolute', top: 50, left: 0, right: 0, alignItems: 'center', zIndex: 50,
  }}>
    <View style={{
      flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)',
      borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6,
      borderWidth: 1, borderColor: 'rgba(255,204,0,0.3)',
    }}>
      <Text style={{ fontSize: 20, marginRight: 6 }}>🪙</Text>
      <Text style={{
        color: GAME.COLORS.COIN, fontSize: 20, fontWeight: 'bold', fontFamily: 'monospace',
        textShadowColor: GAME.COLORS.COIN_GLOW, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8,
      }}>{coins}</Text>
    </View>
  </View>
);

// ============================================
// NEW GAME OVER SCREEN COMPONENTS
// ============================================

// Coin Rain Animation Component
const CoinRain = ({ active }) => {
  const coins = useRef(
    Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      x: Math.random() * SW,
      delay: Math.random() * 2000,
      duration: 2000 + Math.random() * 2000,
      size: 4 + Math.random() * 4,
    }))
  ).current;

  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {coins.map((coin) => (
        <CoinRainDrop key={coin.id} coin={coin} />
      ))}
    </View>
  );
};

const CoinRainDrop = ({ coin }) => {
  const translateY = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      translateY.setValue(-20);
      opacity.setValue(0);
      
      Animated.sequence([
        Animated.delay(coin.delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: SH + 20,
            duration: coin.duration,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.8, duration: 300, useNativeDriver: true }),
            Animated.delay(coin.duration - 600),
            Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]),
        ]),
      ]).start(() => {
        setTimeout(animate, Math.random() * 1000);
      });
    };
    
    animate();
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute',
      left: coin.x,
      width: coin.size,
      height: coin.size,
      backgroundColor: GAME.COLORS.COIN,
      borderRadius: coin.size / 2,
      opacity,
      transform: [{ translateY }],
      shadowColor: GAME.COLORS.COIN,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 4,
    }} />
  );
};

// Animated Counter Hook
const useAnimatedCounter = (targetValue, duration = 1500, startDelay = 0) => {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef(null);

  useEffect(() => {
    let startTime = null;
    let rafId = null;
    
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime - startDelay;
      
      if (elapsed < 0) {
        rafId = requestAnimationFrame(animate);
        return;
      }
      
      const progress = Math.min(elapsed / duration, 1);
      // Easing function for satisfying count-up
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(easeOutQuart * targetValue);
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetValue);
      }
    };
    
    if (targetValue > 0) {
      rafId = requestAnimationFrame(animate);
    } else {
      setDisplayValue(0);
    }
    
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [targetValue, duration, startDelay]);

  return displayValue;
};

// New Game Over Screen Component
const GameOverScreen = ({ 
  visible, 
  score, 
  highscore, 
  isNewHighscore,
  coinsEarned,
  starsCollected,
  nearMissCount,
  totalCoins,
  mysteryBoxes,
  coinsToNextBox,
  onRetry,
  onGoToSkins,
  unlockedSkinHint,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const summaryAnim = useRef(new Animated.Value(0)).current;
  const rewardsAnim = useRef(new Animated.Value(0)).current;
  const actionsAnim = useRef(new Animated.Value(0)).current;
  const newRecordScale = useRef(new Animated.Value(0)).current;

  // Calculate coin breakdown
  const scoreCoins = Math.floor(score * GAME.POINTS_PER_COIN);
  const starCoins = (starsCollected || 0) * GAME.STAR_COINS;
  const nearMissBonus = (nearMissCount || 0) * GAME.NEAR_MISS_BONUS_COINS;
  const totalEarned = coinsEarned || 0;

  // Animated counters
  const animatedTotalCoins = useAnimatedCounter(totalEarned, 1500, 500);
  const animatedScoreCoins = useAnimatedCounter(scoreCoins, 800, 600);
  const animatedStarCoins = useAnimatedCounter(starCoins, 600, 900);
  const animatedNearMissCoins = useAnimatedCounter(nearMissBonus, 600, 1100);

  useEffect(() => {
    if (visible) {
      // Reset animations
      fadeAnim.setValue(0);
      summaryAnim.setValue(0);
      rewardsAnim.setValue(0);
      actionsAnim.setValue(0);
      newRecordScale.setValue(0);

      // Sequence the animations
      Animated.sequence([
        // Fade in background
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        // Summary section
        Animated.timing(summaryAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        // New record bounce
        Animated.spring(newRecordScale, {
          toValue: 1,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
        // Rewards section
        Animated.timing(rewardsAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        // Actions section
        Animated.timing(actionsAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const hasMysteryBox = mysteryBoxes > 0;
  const progressPercent = ((GAME.MYSTERY_BOX_COINS - coinsToNextBox) / GAME.MYSTERY_BOX_COINS) * 100;

  return (
    <Animated.View style={[styles.gameOverOverlay, { opacity: fadeAnim }]}>
      {/* Coin Rain Background Effect */}
      <CoinRain active={true} />
      
      {/* RUN SUMMARY - Top Section */}
      <Animated.View style={[styles.gameOverSection, { opacity: summaryAnim, transform: [{ translateY: summaryAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [20, 0]
      }) }] }]}>
        <Text style={styles.gameOverTitle}>RUN COMPLETE</Text>
        
        {/* Score Display */}
        <View style={styles.scoreDisplayContainer}>
          <View style={styles.scoreRow}>
            <Text style={styles.finalScoreBig}>{String(score).padStart(4, '0')}</Text>
            {isNewHighscore && (
              <Animated.View style={{ transform: [{ scale: newRecordScale }] }}>
                <Text style={styles.newRecordBadge}>★ NEW RECORD</Text>
              </Animated.View>
            )}
          </View>
          <Text style={styles.highscoreCompare}>
            {isNewHighscore ? 'Personal Best!' : `${highscore - score} pts from record`}
          </Text>
        </View>

        {/* Coins Earned Breakdown */}
        <View style={styles.coinsBreakdownContainer}>
          <Text style={styles.coinsBreakdownTitle}>💰 COINS EARNED</Text>
          
          <View style={styles.coinBreakdownRow}>
            <Text style={styles.coinBreakdownLabel}>Score:</Text>
            <Text style={styles.coinBreakdownValue}>+{animatedScoreCoins}</Text>
          </View>
          
          {starCoins > 0 && (
            <View style={styles.coinBreakdownRow}>
              <Text style={styles.coinBreakdownLabel}>Stars ({starsCollected || 0}):</Text>
              <Text style={styles.coinBreakdownValue}>+{animatedStarCoins}</Text>
            </View>
          )}
          
          {nearMissBonus > 0 && (
            <View style={styles.coinBreakdownRow}>
              <Text style={styles.coinBreakdownLabel}>Near Misses ({nearMissCount || 0}):</Text>
              <Text style={styles.coinBreakdownValueHighlight}>+{animatedNearMissCoins}</Text>
            </View>
          )}
          
          <View style={styles.coinsDivider} />
          
          <View style={styles.coinBreakdownRowTotal}>
            <Text style={styles.coinBreakdownTotalLabel}>TOTAL:</Text>
            <Text style={styles.coinBreakdownTotalValue}>+{animatedTotalCoins} 🪙</Text>
          </View>
        </View>

        {/* Total Balance */}
        <View style={styles.totalBalanceContainer}>
          <Text style={styles.totalBalanceLabel}>BALANCE:</Text>
          <Text style={styles.totalBalanceValue}>{totalCoins} 🪙</Text>
        </View>
      </Animated.View>

      {/* REWARDS - Middle Section */}
      <Animated.View style={[styles.gameOverSection, { opacity: rewardsAnim, transform: [{ translateY: rewardsAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [20, 0]
      }) }] }]}>
        {/* Mystery Box Progress */}
        <View style={styles.mysteryBoxProgressContainer}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>🎁 Mystery Box Progress</Text>
            <Text style={styles.progressValue}>{GAME.MYSTERY_BOX_COINS - coinsToNextBox}/100</Text>
          </View>
          <View style={styles.progressBarBg}>
            <Animated.View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressHint}>
            {hasMysteryBox 
              ? `You have ${mysteryBoxes} box${mysteryBoxes > 1 ? 'es' : ''} to open!` 
              : `${coinsToNextBox} more coins until next box`}
          </Text>
        </View>

        {/* Open Box Button (if available) */}
        {hasMysteryBox && (
          <View style={styles.openBoxContainer}>
            <Text style={styles.openBoxEmoji}>🎁</Text>
            <Text style={styles.openBoxText}>OPEN BOX!</Text>
            <Text style={styles.openBoxCount}>{mysteryBoxes} available</Text>
          </View>
        )}

        {/* Skin Unlock Hint */}
        {unlockedSkinHint && (
          <View style={styles.skinHintContainer}>
            <Text style={styles.skinHintText}>
              You can unlock {unlockedSkinHint}! 🔓
            </Text>
          </View>
        )}

        {/* Near Miss Stat */}
        {(nearMissCount || 0) > 0 && (
          <View style={styles.nearMissStatContainer}>
            <Text style={styles.nearMissStatLabel}>⚡ Near Misses:</Text>
            <Text style={styles.nearMissStatValue}>{nearMissCount}</Text>
          </View>
        )}
      </Animated.View>

      {/* ACTIONS - Bottom Section */}
      <Animated.View style={[styles.gameOverActionsContainer, { opacity: actionsAnim, transform: [{ translateY: actionsAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [20, 0]
      }) }] }]}>
        {/* RETRY Button - Primary */}
        <TouchableWithoutFeedback onPress={onRetry}>
          <View style={styles.retryButton}>
            <Text style={styles.retryButtonText}>RETRY</Text>
          </View>
        </TouchableWithoutFeedback>

        {/* Secondary Actions Row */}
        <View style={styles.secondaryActionsRow}>
          <TouchableWithoutFeedback onPress={onGoToSkins}>
            <View style={styles.skinsButton}>
              <Text style={styles.skinsButtonText}>SKINS 👤</Text>
            </View>
          </TouchableWithoutFeedback>

          {/* Placeholder buttons for future features */}
          <View style={styles.placeholderButton}>
            <Text style={styles.placeholderButtonText}>SECOND CHANCE</Text>
          </View>
        </View>

        {/* Share placeholder */}
        <View style={styles.sharePlaceholder}>
          <Text style={styles.sharePlaceholderText}>SHARE (coming soon)</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

// Mystery Box Renderer
const MysteryBoxRenderer = ({ shaking, onOpen, count }) => {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (shaking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: -5, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 5, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ])
      ).start();
    } else {
      shakeAnim.setValue(0);
    }
    return () => shakeAnim.setValue(0);
  }, [shaking]);
  
  return (
    <TouchableWithoutFeedback onPress={onOpen}>
      <View style={{ alignItems: 'center', marginTop: 20 }}>
        <Animated.View style={{
          width: 70, height: 70,
          backgroundColor: GAME.COLORS.MYSTERY_BOX,
          borderRadius: 8, borderWidth: 3, borderColor: '#8844cc',
          justifyContent: 'center', alignItems: 'center',
          transform: [{ translateX: shakeAnim }],
          shadowColor: GAME.COLORS.MYSTERY_BOX,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8, shadowRadius: 15, elevation: 10,
        }}>
          <Text style={{ fontSize: 36 }}>🎁</Text>
          <View style={{
            position: 'absolute', top: -8, right: -8,
            backgroundColor: GAME.COLORS.OBSTACLE, borderRadius: 12,
            minWidth: 24, height: 24, justifyContent: 'center', alignItems: 'center',
            borderWidth: 2, borderColor: '#fff',
          }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold', fontFamily: 'monospace' }}>{count}</Text>
          </View>
        </Animated.View>
        <Text style={{
          color: GAME.COLORS.TEXT_DIM, fontSize: 12, fontFamily: 'monospace', marginTop: 8, letterSpacing: 1,
        }}>TAP TO OPEN</Text>
      </View>
    </TouchableWithoutFeedback>
  );
};

// Character Selector Component
const CharacterSelector = ({ skins, onSelect, onPurchase, coins }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const currentSkin = skins[currentIndex] || CHARACTER_SKINS[0];
  const canAfford = coins >= currentSkin.unlockCost;
  
  const goNext = () => setCurrentIndex((prev) => (prev + 1) % skins.length);
  const goPrev = () => setCurrentIndex((prev) => (prev - 1 + skins.length) % skins.length);
  
  const handleAction = () => {
    if (currentSkin.unlocked) {
      onSelect(currentSkin.id);
    } else if (canAfford) {
      onPurchase(currentSkin.id);
    }
  };
  
  return (
    <View style={{ alignItems: 'center', marginVertical: 20 }}>
      <Text style={{
        color: GAME.COLORS.TEXT_DIM, fontSize: 12, fontFamily: 'monospace', letterSpacing: 2, marginBottom: 10,
      }}>SELECT CHARACTER</Text>
      
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableWithoutFeedback onPress={goPrev}>
          <View style={{ padding: 10 }}>
            <Text style={{ color: GAME.COLORS.TEXT, fontSize: 24 }}>◀</Text>
          </View>
        </TouchableWithoutFeedback>
        
        <View style={{
          width: 80, height: 80,
          backgroundColor: currentSkin.color, borderRadius: 8,
          borderWidth: 3,
          borderColor: currentSkin.isSelected ? GAME.COLORS.ACCENT : currentSkin.glowColor,
          justifyContent: 'center', alignItems: 'center', marginHorizontal: 10,
        }}>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <View style={{ width: 8, height: 8, backgroundColor: currentSkin.eyeColor, borderRadius: 2 }} />
            <View style={{ width: 8, height: 8, backgroundColor: currentSkin.eyeColor, borderRadius: 2 }} />
          </View>
          {currentSkin.isSelected && (
            <Text style={{
              position: 'absolute', bottom: 4, fontSize: 10, color: GAME.COLORS.ACCENT, fontFamily: 'monospace',
            }}>✓</Text>
          )}
        </View>
        
        <TouchableWithoutFeedback onPress={goNext}>
          <View style={{ padding: 10 }}>
            <Text style={{ color: GAME.COLORS.TEXT, fontSize: 24 }}>▶</Text>
          </View>
        </TouchableWithoutFeedback>
      </View>
      
      <Text style={{
        color: GAME.COLORS.TEXT, fontSize: 16, fontFamily: 'monospace', marginTop: 8, letterSpacing: 1,
      }}>{currentSkin.name}</Text>
      
      <TouchableWithoutFeedback onPress={handleAction}>
        <View style={{
          marginTop: 10,
          backgroundColor: currentSkin.unlocked 
            ? (currentSkin.isSelected ? 'rgba(0,255,136,0.2)' : 'rgba(0,255,136,0.4)')
            : (canAfford ? 'rgba(255,136,0,0.6)' : 'rgba(100,100,100,0.4)'),
          paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
          borderColor: currentSkin.unlocked 
            ? GAME.COLORS.PLAYER 
            : (canAfford ? GAME.COLORS.ACCENT : '#666'),
        }}>
          <Text style={{
            color: currentSkin.unlocked ? GAME.COLORS.PLAYER : (canAfford ? GAME.COLORS.ACCENT : '#666'),
            fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: 1,
          }}>
            {currentSkin.unlocked 
              ? (currentSkin.isSelected ? 'SELECTED' : 'SELECT')
              : `${currentSkin.unlockCost} 🪙`
            }
          </Text>
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
};

// Mystery Box Reward Modal
const MysteryBoxModal = ({ visible, reward, onClose }) => {
  if (!visible || !reward) return null;
  
  return (
    <View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15,14,23,0.95)', justifyContent: 'center', alignItems: 'center', zIndex: 100,
    }}>
      <Text style={{
        color: GAME.COLORS.MYSTERY_BOX, fontSize: 24, fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: 4, marginBottom: 20,
      }}>MYSTERY BOX</Text>
      
      <View style={{
        width: 100, height: 100,
        backgroundColor: GAME.COLORS.MYSTERY_BOX, borderRadius: 12, borderWidth: 4, borderColor: '#8844cc',
        justifyContent: 'center', alignItems: 'center', marginBottom: 30,
      }}>
        <Text style={{ fontSize: 50 }}>{reward.type === 'character' ? '🎉' : '🪙'}</Text>
      </View>
      
      {reward.type === 'character' ? (
        <>
          <Text style={{ color: GAME.COLORS.TEXT, fontSize: 20, fontFamily: 'monospace', marginBottom: 10 }}>NEW CHARACTER!</Text>
          <View style={{
            width: 60, height: 60, backgroundColor: reward.skin.color, borderRadius: 8,
            justifyContent: 'center', alignItems: 'center', marginBottom: 10,
          }}>
            <View style={{ flexDirection: 'row', gap: 3 }}>
              <View style={{ width: 6, height: 6, backgroundColor: reward.skin.eyeColor }} />
              <View style={{ width: 6, height: 6, backgroundColor: reward.skin.eyeColor }} />
            </View>
          </View>
          <Text style={{ color: GAME.COLORS.ACCENT, fontSize: 18, fontFamily: 'monospace', fontWeight: 'bold' }}>{reward.skin.name}</Text>
        </>
      ) : (
        <>
          <Text style={{ color: GAME.COLORS.TEXT, fontSize: 20, fontFamily: 'monospace' }}>COIN REFUND!</Text>
          <Text style={{
            color: GAME.COLORS.COIN, fontSize: 48, fontWeight: 'bold', fontFamily: 'monospace', marginVertical: 10,
            textShadowColor: GAME.COLORS.COIN_GLOW, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15,
          }}>+{reward.amount}</Text>
        </>
      )}
      
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{
          marginTop: 30, backgroundColor: GAME.COLORS.PLAYER,
          paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25,
        }}>
          <Text style={{ color: '#0f0e17', fontSize: 14, fontWeight: 'bold', fontFamily: 'monospace' }}>AWESOME!</Text>
        </View>
      </TouchableWithoutFeedback>
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
  
  const timeScale = state.slowMoTime > 0 ? GAME.SLOWMO_FACTOR : 1;
  const speedIncrement = GAME.SPEED_INCREMENT * timeScale;
  state.speed = Math.min(GAME.MAX_SPEED, GAME.BASE_SPEED + state.frameCount * speedIncrement);
  state.frameCount++;
  state.scrollOffset += state.speed * timeScale;
  
  if (state.shieldTime > 0) {
    state.shieldTime -= 16 * timeScale;
    if (state.shieldTime < 0) state.shieldTime = 0;
  }
  if (state.slowMoTime > 0) {
    state.slowMoTime -= 16 * timeScale;
    if (state.slowMoTime < 0) state.slowMoTime = 0;
  }
  
  player.shieldTime = state.shieldTime;
  
  const gravity = GAME.GRAVITY * timeScale;
  player.velocity = Math.min(player.velocity + gravity, GAME.MAX_FALL_SPEED * timeScale);
  player.y += player.velocity;
  
  if (player.y + player.height > GAME.FLOOR_Y) {
    dispatch({ type: 'game-over' });
    return entities;
  }
  
  if (player.y < 0) {
    player.y = 0;
    player.velocity = 2;
  }
  
  Object.keys(entities).forEach(key => {
    if (key.startsWith('obs_')) {
      const obs = entities[key];
      obs.x -= state.speed * timeScale;
      
      if (obs.type === 'moving') {
        obs.moveTimer = (obs.moveTimer || 0) + 16 * timeScale;
        const moveCycle = 2000;
        const moveProgress = (obs.moveTimer % moveCycle) / moveCycle;
        const moveRange = obs.moveRange || 80;
        const baseY = obs.baseY || obs.y;
        obs.y = baseY + Math.sin(moveProgress * Math.PI * 2) * (moveRange / 2);
      }
      
      if (!obs.scored && obs.x + (obs.totalWidth || obs.width) < player.x && obs.givesScore !== false) {
        obs.scored = true;
        state.score++;
        state.coins += GAME.POINTS_PER_COIN;
        dispatch({ type: 'score', score: state.score });
        dispatch({ type: 'coin-collect', amount: GAME.POINTS_PER_COIN });
      }
      
      if (obs.x < -200) delete entities[key];
    }
    
    if (key.startsWith('powerup_')) {
      const powerup = entities[key];
      powerup.x -= state.speed * timeScale;
      powerup.pulse = (powerup.pulse || 0) + 0.1 * timeScale;
      
      if (powerup.x < -50) delete entities[key];
    }
  });
  
  return entities;
};

const SpawnSystem = (entities, { time, dispatch }) => {
  const state = entities.gameState;
  if (!state) return entities;
  
  const timeScale = state.slowMoTime > 0 ? GAME.SLOWMO_FACTOR : 1;
  state.spawnTimer += 16 * timeScale;
  
  const speedFactor = (state.speed - GAME.BASE_SPEED) / (GAME.MAX_SPEED - GAME.BASE_SPEED);
  const baseInterval = GAME.MAX_SPAWN_MS - (speedFactor * 800);
  const spawnInterval = Math.max(GAME.MIN_SPAWN_MS, baseInterval);
  
  if (state.spawnTimer >= spawnInterval) {
    state.spawnTimer = 0;
    
    const clusterChance = Math.min(0.35, 0.15 + speedFactor * 0.2);
    if (Math.random() < clusterChance && !state.clusterSpawnRemaining) {
      state.clusterSpawnRemaining = Math.floor(Math.random() * 2) + 2;
      state.clusterGap = 400 + Math.random() * 300;
    }
    
    spawnObstacle(entities, state);
    
    if (state.clusterSpawnRemaining > 0) {
      state.clusterSpawnRemaining--;
      state.spawnTimer = spawnInterval - state.clusterGap;
    }
    
    if (!state.clusterSpawnRemaining && Math.random() < 0.40) {
      spawnPowerUp(entities, state);
    }
  }
  
  return entities;
};

const spawnObstacle = (entities, state) => {
  const id = `obs_${Date.now()}_${Math.random()}`;
  const speedFactor = Math.min(1, (state.speed - GAME.BASE_SPEED) / (GAME.MAX_SPEED - GAME.BASE_SPEED));
  
  const floorWeight = 0.20 - (speedFactor * 0.10);
  const ceilingWeight = 0.15 - (speedFactor * 0.05);
  const midWeight = 0.35 + (speedFactor * 0.10);
  const movingWeight = 0.18 + (speedFactor * 0.04);
  
  const type = Math.random();
  let obsY, obsH, obstacleType = 'normal', totalWidth, gapY;
  
  if (type < floorWeight) {
    obsH = GAME.MIN_OBSTACLE_HEIGHT + Math.random() * (GAME.MAX_OBSTACLE_HEIGHT - GAME.MIN_OBSTACLE_HEIGHT);
    obsY = GAME.FLOOR_Y - obsH;
  } else if (type < floorWeight + ceilingWeight) {
    obsH = GAME.MIN_OBSTACLE_HEIGHT + Math.random() * 60;
    obsY = 0;
    obstacleType = 'ceiling';
  } else if (type < floorWeight + ceilingWeight + midWeight) {
    const midType = Math.random();
    if (midType < 0.33) {
      obsH = 30 + Math.random() * 40;
      obsY = GAME.FLOOR_Y - 100 - Math.random() * 80;
    } else if (midType < 0.66) {
      obsH = 25 + Math.random() * 35;
      obsY = 120 + Math.random() * (GAME.FLOOR_Y - 300);
    } else {
      obsH = 30 + Math.random() * 30;
      obsY = 40 + Math.random() * 60;
    }
    obstacleType = 'mid';
  } else if (type < floorWeight + ceilingWeight + midWeight + movingWeight) {
    obsH = 40 + Math.random() * 30;
    obsY = 100 + Math.random() * (GAME.FLOOR_Y - 220);
    obstacleType = 'moving';
  } else {
    obstacleType = 'slalom';
    totalWidth = 100 + Math.random() * 60;
    gapY = 80 + Math.random() * (GAME.FLOOR_Y - 220);
    obsH = 120;
  }
  
  if (obstacleType === 'slalom') {
    entities[id] = {
      x: SW + 20, y: gapY, totalWidth, height: obsH, gapY, gateHeight: obsH,
      type: obstacleType, scored: false, givesScore: true, renderer: SlalomGateRenderer,
    };
  } else if (obstacleType === 'moving') {
    entities[id] = {
      x: SW + 20, y: obsY, baseY: obsY, width: GAME.OBSTACLE_WIDTH, height: obsH,
      type: obstacleType, moveTimer: 0, moveRange: 60 + Math.random() * 60,
      scored: false, renderer: MovingBlockRenderer,
    };
  } else {
    entities[id] = {
      x: SW + 20, y: obsY, width: GAME.OBSTACLE_WIDTH, height: obsH,
      isTop: obstacleType === 'ceiling', type: obstacleType, scored: false, renderer: ObstacleRenderer,
    };
  }
};

const spawnPowerUp = (entities, state) => {
  const id = `powerup_${Date.now()}_${Math.random()}`;
  const powerUpType = Math.random();
  let type, renderer, yPos;
  
  if (powerUpType < 0.4) { type = 'star'; renderer = StarRenderer; }
  else if (powerUpType < 0.7) { type = 'shield'; renderer = ShieldRenderer; }
  else { type = 'slowmo'; renderer = SlowMoRenderer; }
  
  yPos = 80 + Math.random() * (GAME.FLOOR_Y - 160);
  
  entities[id] = {
    x: SW + 20, y: yPos, width: 24, height: 24,
    type, pulse: 0, renderer,
  };
};

const CollisionSystem = (entities, { dispatch }) => {
  const player = entities.player;
  const state = entities.gameState;
  if (!player || !state) return entities;
  
  const px = player.x, py = player.y;
  const pw = player.width, ph = player.height;
  const margin = 4;
  
  Object.keys(entities).forEach(key => {
    if (key.startsWith('obs_')) {
      const obs = entities[key];
      let collision = false;
      let nearMiss = false;
      
      if (obs.type === 'slalom') {
        const w = GAME.OBSTACLE_WIDTH;
        
        if (px + margin < obs.x + w && px + pw - margin > obs.x &&
            py + margin < obs.y + obs.gateHeight && py + ph - margin > obs.y + 20) {
          collision = true;
        }
        if (px + margin < obs.x + obs.totalWidth && px + pw - margin > obs.x + obs.totalWidth - w &&
            py + margin < obs.y + obs.gateHeight && py + ph - margin > obs.y + 20) {
          collision = true;
        }
        if (px + margin < obs.x + obs.totalWidth && px + pw - margin > obs.x &&
            py + margin < obs.y + 20 && py + ph - margin > obs.y) {
          collision = true;
        }
        
        if (!collision && !obs.nearMissTriggered &&
            px + pw > obs.x && px < obs.x + obs.totalWidth) {
          const distToLeft = Math.abs(px + pw - obs.x);
          const distToRight = Math.abs(px - (obs.x + obs.totalWidth));
          if (distToLeft < GAME.NEAR_MISS_DISTANCE || distToRight < GAME.NEAR_MISS_DISTANCE) {
            nearMiss = true;
          }
        }
      } else {
        if (px + margin < obs.x + obs.width && px + pw - margin > obs.x &&
            py + margin < obs.y + obs.height && py + ph - margin > obs.y) {
          collision = true;
        }
        
        if (!collision && !obs.nearMissTriggered && obs.scored) {
          const closestX = Math.max(obs.x, Math.min(px + pw / 2, obs.x + obs.width));
          const closestY = Math.max(obs.y, Math.min(py + ph / 2, obs.y + obs.height));
          const distX = Math.abs(px + pw / 2 - closestX);
          const distY = Math.abs(py + ph / 2 - closestY);
          const dist = Math.sqrt(distX * distX + distY * distY) - pw / 2;
          
          if (dist < GAME.NEAR_MISS_DISTANCE && dist >= 0) {
            nearMiss = true;
          }
        }
      }
      
      if (nearMiss) {
        obs.nearMissTriggered = true;
        state.nearMissCount++;
        state.coins += GAME.NEAR_MISS_BONUS_COINS;
        dispatch({ type: 'near-miss' });
      }
      
      if (collision) {
        if (state.shieldTime > 0) {
          state.shieldTime = 0;
          delete entities[key];
          dispatch({ type: 'shield-break' });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } else {
          dispatch({ type: 'game-over' });
        }
      }
    }
    
    if (key.startsWith('powerup_')) {
      const powerup = entities[key];
      if (px < powerup.x + powerup.width && px + pw > powerup.x &&
          py < powerup.y + powerup.height && py + ph > powerup.y) {
        
        dispatch({ type: 'powerup-collect', powerupType: powerup.type });
        
        if (powerup.type === 'star') {
          state.score += GAME.STAR_POINTS;
          state.coins += GAME.STAR_COINS;
          dispatch({ type: 'score', score: state.score });
          dispatch({ type: 'coin-collect', amount: GAME.STAR_COINS });
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

export default function GameScreen({ navigation }) {
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
  
  // Game Over data
  const [gameOverData, setGameOverData] = useState({
    coinsEarned: 0,
    starsCollected: 0,
    nearMissCount: 0,
  });
  
  // Coin system
  const [coins, setCoins] = useState(0);
  const [coinsAtStart, setCoinsAtStart] = useState(0);
  
  // Near miss
  const [showNearMiss, setShowNearMiss] = useState(false);
  
  // Character skins
  const [skins, setSkins] = useState(CHARACTER_SKINS.map(s => ({ ...s, isSelected: s.id === 'default' })));
  const [currentSkin, setCurrentSkinState] = useState(CHARACTER_SKINS[0]);
  
  // Mystery boxes
  const [mysteryBoxes, setMysteryBoxes] = useState(0);
  const [boxShaking, setBoxShaking] = useState(false);
  const [showBoxReward, setShowBoxReward] = useState(false);
  const [boxReward, setBoxReward] = useState(null);

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
    const loadData = async () => {
      const [hs, coinTotal, boxCount, skinData, currentSkinId] = await Promise.all([
        getHighscore(),
        getCoins(),
        getMysteryBoxes(),
        getSkinData(),
        getCurrentSkin(),
      ]);
      setHighscoreState(hs);
      setCoins(coinTotal);
      setCoinsAtStart(coinTotal);
      setMysteryBoxes(boxCount);
      setSkins(skinData);
      const selected = CHARACTER_SKINS.find(s => s.id === currentSkinId) || CHARACTER_SKINS[0];
      setCurrentSkinState(selected);
    };
    loadData();
    initSounds();
    return () => cleanup();
  }, []);

  // Blinking animation
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

  const createEntities = (selectedSkin = CHARACTER_SKINS[0]) => ({
    player: {
      x: GAME.PLAYER_X,
      y: SH / 2 - GAME.PLAYER_SIZE / 2,
      width: GAME.PLAYER_SIZE,
      height: GAME.PLAYER_SIZE,
      velocity: 0,
      shieldTime: 0,
      skin: selectedSkin,
      renderer: Player,
    },
    gameState: {
      score: 0,
      coins: 0,
      speed: GAME.BASE_SPEED,
      frameCount: 0,
      spawnTimer: 0,
      scrollOffset: 0,
      shieldTime: 0,
      slowMoTime: 0,
      clusterSpawnRemaining: 0,
      clusterGap: 0,
      nearMissCount: 0,
      starsCollected: 0,
      renderer: () => null,
    },
  });

  const [entities, setEntities] = useState(() => createEntities(CHARACTER_SKINS[0]));

  // Handle mystery box check after coin changes
  const checkMysteryBoxes = async (newCoins) => {
    const coinsSinceStart = newCoins - coinsAtStart;
    const boxesEarned = Math.floor(coinsSinceStart / GAME.MYSTERY_BOX_COINS);
    const currentBoxes = await getMysteryBoxes();
    const boxesAtStart = Math.floor(coinsAtStart / GAME.MYSTERY_BOX_COINS);
    const newBoxesEarned = boxesEarned - boxesAtStart;
    
    if (newBoxesEarned > currentBoxes) {
      for (let i = 0; i < newBoxesEarned - currentBoxes; i++) {
        await addMysteryBox();
      }
      const totalBoxes = await getMysteryBoxes();
      setMysteryBoxes(totalBoxes);
    }
  };

  // Get next unlockable skin hint
  const getUnlockableSkinHint = (totalCoins) => {
    const lockedSkins = CHARACTER_SKINS.filter(s => !s.unlocked && s.id !== 'default');
    const affordable = lockedSkins.filter(s => s.unlockCost <= totalCoins);
    if (affordable.length > 0) {
      // Return the cheapest affordable skin
      const cheapest = affordable.sort((a, b) => a.unlockCost - b.unlockCost)[0];
      return cheapest.name.toUpperCase();
    }
    return null;
  };

  const onEvent = useCallback(async (e) => {
    if (e.type === 'game-over') {
      setRunning(false);
      setGameOver(true);
      setShieldActive(false);
      setSlowMoActive(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      playSound('crash');
      
      // Capture game over data
      if (entities.gameState) {
        setGameOverData({
          coinsEarned: Math.floor(entities.gameState.coins),
          starsCollected: entities.gameState.starsCollected || 0,
          nearMissCount: entities.gameState.nearMissCount || 0,
        });
      }
      
      // Persist coins and check for mystery boxes
      if (entities.gameState) {
        const earnedCoins = Math.floor(entities.gameState.coins);
        if (earnedCoins > 0) {
          const newTotal = await addCoins(earnedCoins);
          await checkMysteryBoxes(newTotal);
          setCoins(newTotal);
        }
      }
      
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
      // Track stars collected
      if (e.powerupType === 'star' && entities.gameState) {
        entities.gameState.starsCollected = (entities.gameState.starsCollected || 0) + 1;
      }
    } else if (e.type === 'shield-break') {
      setShieldActive(false);
      playSound('shield-break');
    } else if (e.type === 'coin-collect') {
      playCoinSound();
    } else if (e.type === 'near-miss') {
      setShowNearMiss(true);
      setTimeout(() => setShowNearMiss(false), 1000);
      playNearMissSound();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [score, entities.gameState, coinsAtStart]);

  const handleRetry = () => {
    const newEntities = createEntities(currentSkin);
    setScore(0);
    setGameOver(false);
    setIsNewHighscore(false);
    setShieldActive(false);
    setSlowMoActive(false);
    setGameKey(k => k + 1);
    setEntities(newEntities);
    setTimeout(() => setRunning(true), 50);
  };

  const handleGoToSkins = () => {
    // For now, just reset to menu with skin selector visible
    setGameOver(false);
    setShowMenu(true);
    setScore(0);
  };

  const handleTap = () => {
    if (showMenu) {
      const newEntities = createEntities(currentSkin);
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
    
    // Game Over now requires button press - no tap to retry
    if (gameOver) {
      return; // Don't allow tap-to-restart
    }
    
    if (paused) return;
    
    if (entities.player) {
      entities.player.velocity = GAME.JUMP_FORCE;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      playSound('jump');
    }
  };

  // Update UI states
  useEffect(() => {
    if (running && entities.gameState) {
      const interval = setInterval(() => {
        setScrollOffset(entities.gameState.scrollOffset || 0);
        const spd = entities.gameState.speed || GAME.BASE_SPEED;
        setCurrentSpeed(Math.round((spd / GAME.BASE_SPEED) * 10) / 10);
        setShieldActive(entities.gameState.shieldTime > 0);
        setSlowMoActive(entities.gameState.slowMoTime > 0);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [running]);

  // Handle skin selection
  const handleSkinSelect = async (skinId) => {
    const success = await setCurrentSkin(skinId); // storage function
    if (success) {
      const skinData = await getSkinData();
      setSkins(skinData);
      const selected = CHARACTER_SKINS.find(s => s.id === skinId);
      setCurrentSkinState(selected); // state setter - full skin object
    }
  };

  // Handle skin purchase
  const handleSkinPurchase = async (skinId) => {
    const result = await purchaseSkin(skinId);
    if (result.success) {
      setCoins(result.newTotal);
      const skinData = await getSkinData();
      setSkins(skinData);
      playCoinSound();
    }
  };

  // Handle mystery box open
  const handleOpenBox = async () => {
    if (mysteryBoxes <= 0) return;
    
    setBoxShaking(true);
    playBoxOpenSound();
    
    setTimeout(async () => {
      setBoxShaking(false);
      const reward = await openMysteryBoxReward();
      if (reward.success) {
        setBoxReward(reward);
        setShowBoxReward(true);
        setMysteryBoxes(reward.remainingBoxes);
        if (reward.type === 'coins') {
          setCoins(reward.newTotal);
        } else {
          const skinData = await getSkinData();
          setSkins(skinData);
        }
      }
    }, 1000);
  };

  // Calculate coins to next mystery box
  const coinsToNextBox = GAME.MYSTERY_BOX_COINS - ((coins - coinsAtStart) % GAME.MYSTERY_BOX_COINS);
  
  // Get unlockable skin hint
  const unlockableSkinHint = getUnlockableSkinHint(coins);

  return (
    <TouchableWithoutFeedback onPress={handleTap}>
      <View style={styles.container}>
        <StatusBar hidden />
        
        {/* Background gradient */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: GAME.COLORS.BG }]} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: GAME.COLORS.BG2, opacity: 0.5 }]} />
        
        {/* Stars parallax */}
        <Stars offset={scrollOffset} />
        
        {/* Ground */}
        <Ground />
        
        {/* SlowMo visual effect */}
        <SlowMoOverlay active={slowMoActive} />
        
        {/* Near Miss text */}
        <NearMissText visible={showNearMiss} />
        
        {/* Coin Counter */}
        {!showMenu && !gameOver && (
          <CoinCounter coins={Math.floor((entities.gameState?.coins || 0))} />
        )}
        
        {/* Score + Speed + Pause */}
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
            
            {shieldActive && (
              <View style={styles.shieldIndicator}>
                <Text style={styles.shieldIcon}>🛡</Text>
              </View>
            )}
            
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
        
        {/* Pause Overlay */}
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
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ fontSize: 24, marginRight: 6 }}>🪙</Text>
              <Text style={{
                color: GAME.COLORS.COIN, fontSize: 24, fontWeight: 'bold', fontFamily: 'monospace',
              }}>{coins}</Text>
            </View>
            
            <Text style={styles.menuHighscore}>BEST: {String(highscore).padStart(4, '0')}</Text>
            
            <CharacterSelector
              skins={skins}
              onSelect={handleSkinSelect}
              onPurchase={handleSkinPurchase}
              coins={coins}
            />
            
            {mysteryBoxes > 0 && (
              <MysteryBoxRenderer
                shaking={boxShaking}
                onOpen={handleOpenBox}
                count={mysteryBoxes}
              />
            )}
            
            <View style={styles.instructions}>
              <Text style={styles.instructionText}>★ Star: +{GAME.STAR_POINTS} pts +{GAME.STAR_COINS} coins</Text>
              <Text style={styles.instructionText}>🛡 Shield: protection</Text>
              <Text style={styles.instructionText}>⏱ SlowMo: slow time</Text>
            </View>
            <Animated.Text style={[styles.tapToStart, { opacity: blinkAnim }]}>TAP TO START</Animated.Text>
          </View>
        )}
        
        {/* NEW Game Over Screen */}
        <GameOverScreen
          visible={gameOver}
          score={score}
          highscore={highscore}
          isNewHighscore={isNewHighscore}
          coinsEarned={gameOverData.coinsEarned}
          starsCollected={gameOverData.starsCollected}
          nearMissCount={gameOverData.nearMissCount}
          totalCoins={coins}
          mysteryBoxes={mysteryBoxes}
          coinsToNextBox={coinsToNextBox}
          onRetry={handleRetry}
          onGoToSkins={handleGoToSkins}
          unlockedSkinHint={unlockableSkinHint}
        />
        
        {/* Mystery Box Reward Modal */}
        <MysteryBoxModal
          visible={showBoxReward}
          reward={boxReward}
          onClose={() => setShowBoxReward(false)}
        />
        
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
  container: { flex: 1, backgroundColor: GAME.COLORS.BG },
  game: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  
  scoreContainer: {
    position: 'absolute', top: 50, right: 20, alignItems: 'flex-end', zIndex: 50,
  },
  scoreLabel: { color: GAME.COLORS.TEXT_DIM, fontSize: 12, fontFamily: 'monospace', letterSpacing: 3 },
  score: {
    color: GAME.COLORS.SCORE, fontSize: 32, fontWeight: 'bold', fontFamily: 'monospace',
    textShadowColor: GAME.COLORS.SCORE, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8,
  },
  
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,14,23,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 80,
  },
  title: { color: GAME.COLORS.TEXT, fontSize: 56, fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: 8 },
  titleAccent: {
    color: GAME.COLORS.PLAYER, fontSize: 56, fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: 8,
    textShadowColor: GAME.COLORS.PLAYER, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15, marginTop: -8,
  },
  menuDivider: {
    width: 80, height: 2, backgroundColor: GAME.COLORS.ACCENT, marginVertical: 20,
    shadowColor: GAME.COLORS.ACCENT, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6,
  },
  menuHighscore: { color: GAME.COLORS.TEXT_DIM, fontSize: 16, fontFamily: 'monospace', letterSpacing: 2 },
  tapToStart: {
    color: GAME.COLORS.TEXT, fontSize: 16, fontFamily: 'monospace', marginTop: 30, opacity: 0.8, letterSpacing: 2,
  },
  pauseButton: { position: 'absolute', top: 50, left: 20, zIndex: 50 },
  pauseIcon: { color: GAME.COLORS.TEXT_DIM, fontSize: 20, padding: 10 },
  pauseTitle: { color: GAME.COLORS.TEXT, fontSize: 48, fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: 6 },
  
  speedContainer: { position: 'absolute', top: 100, right: 20, alignItems: 'flex-end', zIndex: 50 },
  speedLabel: { color: GAME.COLORS.TEXT_DIM, fontSize: 10, fontFamily: 'monospace', letterSpacing: 2 },
  speedValue: { color: GAME.COLORS.ACCENT, fontSize: 16, fontWeight: 'bold', fontFamily: 'monospace' },
  
  shieldIndicator: {
    position: 'absolute', top: 90, left: 20, zIndex: 50,
    backgroundColor: 'rgba(0, 204, 255, 0.2)', borderRadius: 12, padding: 4,
  },
  shieldIcon: { fontSize: 20 },
  slowMoIndicator: {
    position: 'absolute', top: 90, left: 55, zIndex: 50,
    backgroundColor: 'rgba(170, 102, 255, 0.2)', borderRadius: 12, padding: 4,
  },
  slowMoIcon: { fontSize: 20 },
  powerupStatus: { color: GAME.COLORS.ACCENT, fontSize: 14, fontFamily: 'monospace', marginTop: 8, letterSpacing: 1 },
  instructions: { marginTop: 10, alignItems: 'center' },
  instructionText: { color: GAME.COLORS.TEXT_DIM, fontSize: 12, fontFamily: 'monospace', marginVertical: 2, letterSpacing: 1 },
  finalScore: { color: GAME.COLORS.SCORE, fontSize: 24, fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: 2, marginBottom: 8 },

  // ============================================
  // NEW GAME OVER SCREEN STYLES
  // ============================================
  
  gameOverOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,14,23,0.95)', zIndex: 80, paddingTop: 40, paddingBottom: 20,
  },
  
  gameOverSection: {
    width: SW - 40, marginHorizontal: 20, marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
  },
  
  gameOverTitle: {
    color: GAME.COLORS.TEXT, fontSize: 14, fontFamily: 'monospace',
    letterSpacing: 4, textAlign: 'center', marginBottom: 12, opacity: 0.7,
  },
  
  // Score Display
  scoreDisplayContainer: { alignItems: 'center', marginBottom: 16 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  finalScoreBig: {
    color: GAME.COLORS.SCORE, fontSize: 48, fontWeight: 'bold', fontFamily: 'monospace',
    textShadowColor: GAME.COLORS.SCORE, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15,
  },
  newRecordBadge: {
    color: GAME.COLORS.ACCENT, fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold',
    backgroundColor: 'rgba(255,137,6,0.2)', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 4, marginLeft: 12, borderWidth: 1, borderColor: GAME.COLORS.ACCENT,
  },
  highscoreCompare: {
    color: GAME.COLORS.TEXT_DIM, fontSize: 12, fontFamily: 'monospace', marginTop: 4,
  },
  
  // Coins Breakdown
  coinsBreakdownContainer: {
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,204,0,0.2)',
  },
  coinsBreakdownTitle: {
    color: GAME.COLORS.COIN, fontSize: 12, fontFamily: 'monospace',
    letterSpacing: 2, marginBottom: 8, textAlign: 'center',
  },
  coinBreakdownRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginVertical: 3,
  },
  coinBreakdownLabel: {
    color: GAME.COLORS.TEXT_DIM, fontSize: 13, fontFamily: 'monospace',
  },
  coinBreakdownValue: {
    color: GAME.COLORS.TEXT, fontSize: 13, fontFamily: 'monospace',
  },
  coinBreakdownValueHighlight: {
    color: GAME.COLORS.NEAR_MISS, fontSize: 13, fontFamily: 'monospace', fontWeight: 'bold',
  },
  coinsDivider: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 8,
  },
  coinBreakdownRowTotal: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  coinBreakdownTotalLabel: {
    color: GAME.COLORS.TEXT, fontSize: 14, fontFamily: 'monospace', fontWeight: 'bold',
  },
  coinBreakdownTotalValue: {
    color: GAME.COLORS.COIN, fontSize: 18, fontFamily: 'monospace', fontWeight: 'bold',
    textShadowColor: GAME.COLORS.COIN_GLOW, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8,
  },
  
  // Total Balance
  totalBalanceContainer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  totalBalanceLabel: {
    color: GAME.COLORS.TEXT_DIM, fontSize: 12, fontFamily: 'monospace', marginRight: 8,
  },
  totalBalanceValue: {
    color: GAME.COLORS.COIN, fontSize: 16, fontFamily: 'monospace', fontWeight: 'bold',
  },
  
  // Mystery Box Progress
  mysteryBoxProgressContainer: { marginBottom: 12 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: {
    color: GAME.COLORS.TEXT, fontSize: 12, fontFamily: 'monospace', letterSpacing: 1,
  },
  progressValue: {
    color: GAME.COLORS.MYSTERY_BOX, fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold',
  },
  progressBarBg: {
    height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%', backgroundColor: GAME.COLORS.MYSTERY_BOX,
    shadowColor: GAME.COLORS.MYSTERY_BOX, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6,
  },
  progressHint: {
    color: GAME.COLORS.TEXT_DIM, fontSize: 11, fontFamily: 'monospace', marginTop: 6, textAlign: 'center',
  },
  
  // Open Box Button
  openBoxContainer: {
    alignItems: 'center', paddingVertical: 16,
    backgroundColor: 'rgba(170,102,255,0.15)', borderRadius: 12,
    borderWidth: 2, borderColor: GAME.COLORS.MYSTERY_BOX,
    marginVertical: 8,
  },
  openBoxEmoji: { fontSize: 40, marginBottom: 4 },
  openBoxText: {
    color: GAME.COLORS.MYSTERY_BOX, fontSize: 18, fontWeight: 'bold', fontFamily: 'monospace',
    letterSpacing: 2, textShadowColor: GAME.COLORS.MYSTERY_BOX,
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10,
  },
  openBoxCount: {
    color: GAME.COLORS.TEXT_DIM, fontSize: 11, fontFamily: 'monospace', marginTop: 4,
  },
  
  // Skin Hint
  skinHintContainer: {
    backgroundColor: 'rgba(0,255,136,0.1)', borderRadius: 8,
    padding: 10, marginTop: 8, borderWidth: 1, borderColor: 'rgba(0,255,136,0.3)',
  },
  skinHintText: {
    color: GAME.COLORS.PLAYER, fontSize: 12, fontFamily: 'monospace', textAlign: 'center',
  },
  
  // Near Miss Stat
  nearMissStatContainer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  nearMissStatLabel: {
    color: GAME.COLORS.TEXT_DIM, fontSize: 12, fontFamily: 'monospace', marginRight: 6,
  },
  nearMissStatValue: {
    color: GAME.COLORS.NEAR_MISS, fontSize: 14, fontFamily: 'monospace', fontWeight: 'bold',
  },
  
  // Actions
  gameOverActionsContainer: {
    width: SW - 40, marginHorizontal: 20, marginTop: 'auto',
  },
  retryButton: {
    backgroundColor: GAME.COLORS.PLAYER, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
    shadowColor: GAME.COLORS.PLAYER, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 15, elevation: 5,
  },
  retryButtonText: {
    color: '#0f0e17', fontSize: 20, fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: 3,
  },
  secondaryActionsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
  },
  skinsButton: {
    flex: 1, backgroundColor: 'rgba(0,204,255,0.2)', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', marginRight: 8,
    borderWidth: 1, borderColor: 'rgba(0,204,255,0.4)',
  },
  skinsButtonText: {
    color: '#00ccff', fontSize: 14, fontFamily: 'monospace', letterSpacing: 1, fontWeight: 'bold',
  },
  placeholderButton: {
    flex: 1, backgroundColor: 'rgba(100,100,100,0.2)', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', marginLeft: 8,
    borderWidth: 1, borderColor: 'rgba(100,100,100,0.3)',
  },
  placeholderButtonText: {
    color: '#666', fontSize: 12, fontFamily: 'monospace', letterSpacing: 1,
  },
  sharePlaceholder: {
    alignItems: 'center', marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  sharePlaceholderText: {
    color: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: 'monospace', letterSpacing: 1,
  },
});
