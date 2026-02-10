import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { GAME } from './constants';

const { width: SW, height: SH } = Dimensions.get('window');

export const SplashScreen = ({ onComplete }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const glitchAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [loadingText, setLoadingText] = useState('INITIALIZING');
  
  useEffect(() => {
    // Loading text cycle
    const texts = ['INITIALIZING', 'LOADING ASSETS', 'STARTING ENGINE', 'READY'];
    let index = 0;
    const textInterval = setInterval(() => {
      index = (index + 1) % texts.length;
      setLoadingText(texts[index]);
    }, 600);
    
    // Main animation sequence
    Animated.sequence([
      // Fade in + slide up
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      // Glitch effect
      Animated.sequence([
        Animated.timing(glitchAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(glitchAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.timing(glitchAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(glitchAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
      ]),
      // Progress bar
      Animated.timing(progressAnim, { toValue: 1, duration: 2000, useNativeDriver: false }),
    ]).start();
    
    // Complete after animation
    const timer = setTimeout(() => {
      clearInterval(textInterval);
      onComplete?.();
    }, 3000);
    
    return () => {
      clearTimeout(timer);
      clearInterval(textInterval);
    };
  }, []);
  
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  
  return (
    <View style={styles.container}>
      {/* Background */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: GAME.COLORS.BG }]} />
      
      {/* Grid lines */}
      <View style={styles.grid}>
        {Array.from({ length: 10 }).map((_, i) => (
          <View key={i} style={[styles.gridLine, { top: (i + 1) * (SH / 10) }]} />
        ))}
      </View>
      
      {/* Main Content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        {/* Logo Icon */}
        <View style={styles.logoContainer}>
          <View style={styles.logoGlow} />
          <View style={styles.logo}>
            <View style={styles.logoEyes}>
              <View style={styles.eye} />
              <View style={styles.eye} />
            </View>
          </View>
          
          {/* Glitch overlay */}
          <Animated.View
            style={[
              styles.glitchOverlay,
              { opacity: glitchAnim },
            ]}
          />
        </View>
        
        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>GLITCH</Text>
          <Text style={styles.titleAccent}>JUMP</Text>
        </View>
        
        {/* Loading Bar */}
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{loadingText}...</Text>
          <View style={styles.progressBg}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
        </View>
        
        {/* Credit */}
        <Text style={styles.credit}>Programmed by Lotta 👩‍💻</Text>
      </Animated.View>
      
      {/* CRT Scanlines */}
      <View style={styles.scanlines}>
        {Array.from({ length: Math.floor(SH / 4) }).map((_, i) => (
          <View key={i} style={styles.scanline} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#fff',
  },
  content: {
    alignItems: 'center',
    zIndex: 10,
  },
  logoContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    backgroundColor: 'rgba(0,255,136,0.2)',
    borderRadius: 60,
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  logo: {
    width: 80,
    height: 80,
    backgroundColor: GAME.COLORS.PLAYER,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: GAME.COLORS.PLAYER_GLOW,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoEyes: {
    flexDirection: 'row',
    gap: 8,
  },
  eye: {
    width: 12,
    height: 12,
    backgroundColor: '#0f0e17',
    borderRadius: 2,
  },
  glitchOverlay: {
    position: 'absolute',
    width: 80,
    height: 80,
    backgroundColor: GAME.COLORS.PLAYER,
    opacity: 0.5,
    transform: [{ translateX: 5 }],
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: GAME.COLORS.TEXT,
    fontFamily: 'monospace',
    letterSpacing: 8,
    textShadowColor: 'rgba(255,255,255,0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 10,
  },
  titleAccent: {
    fontSize: 48,
    fontWeight: 'bold',
    color: GAME.COLORS.PLAYER,
    fontFamily: 'monospace',
    letterSpacing: 8,
    marginTop: -8,
    textShadowColor: GAME.COLORS.PLAYER,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  loadingContainer: {
    alignItems: 'center',
    width: 200,
  },
  loadingText: {
    color: GAME.COLORS.TEXT_DIM,
    fontSize: 12,
    fontFamily: 'monospace',
    letterSpacing: 3,
    marginBottom: 8,
  },
  progressBg: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: GAME.COLORS.PLAYER,
    shadowColor: GAME.COLORS.PLAYER,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  credit: {
    position: 'absolute',
    bottom: -80,
    color: GAME.COLORS.TEXT_DIM,
    fontSize: 10,
    fontFamily: 'monospace',
    opacity: 0.6,
  },
  scanlines: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
    zIndex: 20,
  },
  scanline: {
    height: 2,
    backgroundColor: '#000',
    marginBottom: 2,
  },
});
