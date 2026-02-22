'use client';

import { useState } from 'react';
import Image from 'next/image';

interface MenuScreenProps {
  onStartGame?: () => void;
  onJoinGame?: () => void;
}

export function MenuScreen({ onStartGame, onJoinGame }: MenuScreenProps) {
  const [startGamePressed, setStartGamePressed] = useState(false);
  const [joinGamePressed, setJoinGamePressed] = useState(false);
  const [backPressed, setBackPressed] = useState(false);

  const handleStartGameClick = () => {
    setStartGamePressed(true);
    setTimeout(() => {
      setStartGamePressed(false);
      onStartGame?.();
    }, 150);
  };

  const handleJoinGameClick = () => {
    setJoinGamePressed(true);
    setTimeout(() => {
      setJoinGamePressed(false);
      onJoinGame?.();
    }, 150);
  };

  const handleBackClick = () => {
    setBackPressed(true);
    setTimeout(() => setBackPressed(false), 150);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center">
      {/* Background Image */}
      <Image
        src="/game-assets/menu-background.png"
        alt="Menu Background"
        fill
        className="object-cover"
        priority
      />

      {/* Content overlay */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
        {/* Back button */}
        <button
          onClick={handleBackClick}
          className={`absolute top-6 left-6 transition-transform duration-150 ${
            backPressed ? 'scale-95' : 'scale-100'
          }`}
        >
          <Image
            src="/game-assets/back-navigation.svg"
            alt="Back"
            width={60}
            height={60}
            className="w-12 h-12 md:w-16 md:h-16"
          />
        </button>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl font-bold text-white text-center mb-16 drop-shadow-lg" style={{ textShadow: '4px 4px 0px rgba(0,0,0,0.5)' }}>
          STELLAR MINEWARS
        </h1>

        {/* Buttons container */}
        <div className="flex flex-col gap-8 items-center">
          {/* START GAME button */}
          <button
            onClick={handleStartGameClick}
            className={`transition-transform duration-150 ${
              startGamePressed ? 'scale-95' : 'scale-100 hover:scale-105'
            }`}
          >
            <Image
              src="/game-assets/start-game-button.svg"
              alt="Start Game"
              width={240}
              height={80}
              className="w-48 h-auto md:w-64 md:h-auto"
            />
          </button>

          {/* JOIN GAME button */}
          <button
            onClick={handleJoinGameClick}
            className={`transition-transform duration-150 ${
              joinGamePressed ? 'scale-95' : 'scale-100 hover:scale-105'
            }`}
          >
            <Image
              src="/game-assets/join-game-button.svg"
              alt="Join Game"
              width={240}
              height={80}
              className="w-48 h-auto md:w-64 md:h-auto"
            />
          </button>
        </div>
      </div>
    </div>
  );
}
