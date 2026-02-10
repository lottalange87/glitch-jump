import React, { useState, useEffect } from 'react';
import { GameEngine } from 'react-native-game-engine';
import { StyleSheet, StatusBar, TouchableWithoutFeedback, View, Text } from 'react-native';
import * as Haptics from 'expo-haptics';

// Game Systems
const Physics = (entities, { time }) => {
  const { delta } = time;
  const player = entities.player;
  
  // Gravity
  if (player.velocity < 15) {
    player.velocity += 0.8;
  }
  
  // Apply velocity
  player.y += player.velocity;
  
  // Floor collision
  if (player.y > 600) {
    player.y = 600;
    player.velocity = 0;
    player.grounded = true;
  }
  
  // Move obstacles
  Object.keys(entities).forEach(key => {
    if (key.startsWith('obstacle')) {
      entities[key].x -= 4;
      
      // Remove off-screen obstacles
      if (entities[key].x < -50) {
        delete entities[key];
      }
    }
  });
  
  return entities;
};

const SpawnObstacles = (entities, { time }) => {
  const spawnTimer = entities.spawnTimer || { timer: 0 };
  spawnTimer.timer += 16;
  
  // Spawn every 2 seconds (2000ms)
  if (spawnTimer.timer > 2000) {
    spawnTimer.timer = 0;
    const id = `obstacle_${Date.now()}`;
    const isTop = Math.random() > 0.5;
    
    entities[id] = {
      x: 400,
      y: isTop ? 100 : 500,
      width: 30,
      height: 60,
      renderer: Obstacle,
      isTop
    };
  }
  
  entities.spawnTimer = spawnTimer;
  return entities;
};

const CheckCollision = (entities, { dispatch }) => {
  const player = entities.player;
  
  Object.keys(entities).forEach(key => {
    if (key.startsWith('obstacle')) {
      const obs = entities[key];
      
      // AABB Collision
      if (
        player.x < obs.x + obs.width &&
        player.x + player.width > obs.x &&
        player.y < obs.y + obs.height &&
        player.y + player.height > obs.y
      ) {
        dispatch({ type: 'game-over' });
      }
    }
  });
  
  return entities;
};

// Renderers
const Player = ({ body }) => {
  return (
    <View
      style={{
        position: 'absolute',
        left: body.x,
        top: body.y,
        width: body.width,
        height: body.height,
        backgroundColor: '#00ff00',
        borderWidth: 2,
        borderColor: '#00aa00',
      }}
    />
  );
};

const Obstacle = ({ body }) => {
  return (
    <View
      style={{
        position: 'absolute',
        left: body.x,
        top: body.y,
        width: body.width,
        height: body.height,
        backgroundColor: '#ff0044',
        borderWidth: 2,
        borderColor: '#cc0033',
      }}
    />
  );
};

export default function GameScreen() {
  const [running, setRunning] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  
  const [entities, setEntities] = useState({
    player: {
      x: 50,
      y: 300,
      width: 30,
      height: 30,
      velocity: 0,
      grounded: false,
      renderer: Player,
    },
    spawnTimer: { timer: 0 },
  });

  const onEvent = (e) => {
    if (e.type === 'game-over') {
      setRunning(false);
      setGameOver(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const jump = () => {
    if (!running) {
      // Restart
      setEntities({
        player: {
          x: 50,
          y: 300,
          width: 30,
          height: 30,
          velocity: 0,
          grounded: false,
          renderer: Player,
        },
        spawnTimer: { timer: 0 },
      });
      setScore(0);
      setGameOver(false);
      setRunning(true);
      return;
    }
    
    const player = entities.player;
    player.velocity = -12;
    player.grounded = false;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Update score based on survival time
    setScore(s => s + 1);
  };

  return (
    <TouchableWithoutFeedback onPress={jump}>
      <View style={styles.container}>
        <StatusBar hidden />
        
        <Text style={styles.score}>Score: {score}</Text>
        
        {gameOver && (
          <View style={styles.gameOverOverlay}>
            <Text style={styles.gameOverText}>GAME OVER</Text>
            <Text style={styles.tapText}>Tap to restart</Text>
          </View>
        )}
        
        <GameEngine
          style={styles.game}
          systems={[Physics, SpawnObstacles, CheckCollision]}
          entities={entities}
          running={running}
          onEvent={onEvent}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  game: {
    flex: 1,
  },
  score: {
    position: 'absolute',
    top: 50,
    left: 20,
    color: '#00ff00',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    zIndex: 10,
  },
  gameOverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  gameOverText: {
    color: '#ff0044',
    fontSize: 48,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    textShadowColor: '#ff0044',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 10,
  },
  tapText: {
    color: '#ffffff',
    fontSize: 18,
    marginTop: 20,
    fontFamily: 'monospace',
  },
});
