import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import GameScreen from './src/screens/GameScreen';
import { SplashScreen } from './src/components/SplashScreen';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  
  return (
    <>
      {showSplash ? (
        <SplashScreen onComplete={() => setShowSplash(false)} />
      ) : (
        <GameScreen />
      )}
      <StatusBar style="light" />
    </>
  );
}
