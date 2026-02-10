# Glitch Jump — Projektplan

> Ein One-Tap Platformer mit Retro-Pixel-Art. Einfach zu lernen, unmöglich zu meistern.

---

## 🎯 Projekt-Übersicht

| Attribut | Wert |
|----------|------|
| **Name** | Glitch Jump |
| **Genre** | One-Tap Platformer |
| **Plattformen** | iOS, Android |
| **Engine** | Expo (React Native) + react-native-game-engine |
| **Zeitrahmen** | 3-5 Tage für MVP |
| **Monetarisierung** | Rewarded Ads (später) |

---

## 📋 Milestones & Tasks

### 🏁 Milestone 1: Setup & Grundgerüst (Tag 1)
- [ ] **1.1** Expo Projekt initialisieren (`npx create-expo-app glitch-jump`)
- [ ] **1.2** GitHub Repo anlegen + pushen
- [ ] **1.3** react-native-game-engine installieren
- [ ] **1.4** Grundstruktur: GameScreen, MenuScreen, GameOverScreen
- [ ] **1.5** Assets-Ordner anlegen (sprites, sounds, fonts)

### 🎮 Milestone 2: Core Gameplay (Tag 1-2)
- [ ] **2.1** Spieler-Entity erstellen (Rechteck/Sprite)
- [ ] **2.2** Automatisches Laufen nach rechts implementieren
- [ ] **2.3** Tap-to-Jump Mechanik (Gravity, Jump-Impulse)
- [ ] **2.4** Boden-Kollision (nicht durchfallen)
- [ ] **2.5** Hindernis-Generierung (zufällige Spikes)
- [ ] **2.6** Kollisions-Erkennung (Spieler vs. Hindernis)
- [ ] **2.7** Game Over + Score-Anzeige

### 🎨 Milestone 3: Retro-Aesthetik (Tag 2)
- [ ] **3.1** Pixel-Art Sprite für Spieler (8x8 oder 16x16)
- [ ] **3.2** Hindernis-Sprites (Spikes, Blöcke)
- [ ] **3.3** Farbpalette definieren (Gameboy-Grün oder Neon)
- [ ] **3.4** Parallax-Background (scrollende Layer)
- [ ] **3.5** CRT-Scanline Overlay (Shader oder CSS)
- [ ] **3.6** Chiptune-Soundeffekte (Jump, Crash, Score)

### 📱 Milestone 4: UI & Polishing (Tag 3)
- [ ] **4.1** Start-Screen (Logo, Tap to Start)
- [ ] **4.2** Game Over Screen (Score, Highscore, Retry)
- [ ] **4.3** Highscore persistieren (AsyncStorage)
- [ ] **4.4** Pause-Funktion
- [ ] **4.5** Schwierigkeits-Progression (schneller über Zeit)
- [ ] **4.6** Haptisches Feedback (Vibration bei Jump/Crash)

### 🚀 Milestone 5: Build & Deploy (Tag 3-4)
- [ ] **5.1** App Icons generieren (alle Größen)
- [ ] **5.2** Splash Screen
- [ ] **5.3** iOS Build (`eas build --platform ios`)
- [ ] **5.4** Android Build (`eas build --platform android`)
- [ ] **5.5** TestFlight für iOS einrichten
- [ ] **5.6** Internal Testing für Android

### 💰 Milestone 6: Monetarisierung (später)
- [ ] **6.1** Ad-Mob oder Expo-Ads einbinden
- [ ] **6.2** Rewarded Ads für "Second Chance"
- [ ] **6.3** Ad-Remove In-App-Kauf
- [ ] **6.4** Analytics (Firebase)

---

## 🛠️ Technische Details

### Stack
```
Expo SDK 50+
React Native
react-native-game-engine (für Game Loop)
AsyncStorage (Highscores)
Expo AV (Sound)
Expo Haptics (Vibration)
```

### Physics-Setup
```javascript
// Einfache Werte die sich gut anfühlen
const GRAVITY = 0.8;
const JUMP_FORCE = -12;
const RUN_SPEED = 4;
```

### Hindernis-Spawn-Logik
```javascript
// Alle X Frames oder Sekunden
// Zufälliger Abstand: 200-400px
// Zufällige Höhe: Boden-Spike oder Decken-Spike
```

---

## 📁 Ordnerstruktur

```
glitch-jump/
├── App.js                 # Entry point
├── src/
│   ├── components/
│   │   ├── Player.js
│   │   ├── Obstacle.js
│   │   ├── GameLoop.js
│   │   └── Background.js
│   ├── screens/
│   │   ├── MenuScreen.js
│   │   ├── GameScreen.js
│   │   └── GameOverScreen.js
│   ├── systems/
│   │   ├── Physics.js
│   │   ├── Spawner.js
│   │   └── Collision.js
│   └── utils/
│       ├── constants.js
│       └── storage.js
├── assets/
│   ├── sprites/
│   ├── sounds/
│   └── fonts/
└── PROJECT_PLAN.md
```

---

## 🎯 Erfolgskriterien MVP

- [ ] Spiel startet ohne Crash
- [ ] Tap = Sprung funktioniert
- [ ] Hindernisse spawnen und bewegen sich
- [ ] Kollision erkannt = Game Over
- [ ] Score wird gezählt und angezeigt
- [ ] Highscore wird gespeichert
- [ ] Läuft auf iOS und Android

---

## 📝 Notizen

### Inspiration
- Flappy Bird (One-Tap)
- Geometry Dash (Rhythm + Schwierigkeit)
- Canabalt (Endless Runner)

### Viral-Faktoren
- Instant Restart (keine Ladezeit)
- "Easy to learn, impossible to master"
- Share-Button für Highscore
- Fails sind lustig (TikTok-potential)

---

**Letztes Update:** 2026-02-10  
**Status:** Planung abgeschlossen, bereit für Milestone 1
