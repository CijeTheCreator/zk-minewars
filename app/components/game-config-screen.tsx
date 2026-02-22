'use client';

import { useState } from 'react';
import Image from 'next/image';

interface GameConfigScreenProps {
  onBack: () => void;
  onSubmit: (config: GameConfig) => void;
}

export interface GameConfig {
  lives: number;
  rounds: number;
  stake: number;
  playerAddress?: string;
}

export function GameConfigScreen({ onBack, onSubmit }: GameConfigScreenProps) {
  const [lives, setLives] = useState(3);
  const [rounds, setRounds] = useState(10);
  const [stake, setStake] = useState('');
  const [playerAddress, setPlayerAddress] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitPressed, setSubmitPressed] = useState(false);
  const [backPressed, setBackPressed] = useState(false);

  const handleBackClick = () => {
    setBackPressed(true);
    setTimeout(() => {
      setBackPressed(false);
      onBack();
    }, 150);
  };

  const handleSubmitClick = () => {
    setSubmitPressed(true);
    setTimeout(() => {
      setSubmitPressed(false);
      onSubmit({
        lives,
        rounds,
        stake: stake ? parseInt(stake) : 0,
        playerAddress: playerAddress || undefined,
      });
    }, 150);
  };

  const incrementLives = () => {
    if (lives < 5) setLives(lives + 1);
  };

  const decrementLives = () => {
    if (lives > 1) setLives(lives - 1);
  };

  const incrementRounds = () => {
    if (rounds < 40) setRounds(rounds + 1);
  };

  const decrementRounds = () => {
    if (rounds > 1) setRounds(rounds - 1);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center">
      {/* Background Image */}
      <Image
        src="/game-assets/menu-background.png"
        alt="Game Config Background"
        fill
        className="object-cover"
        priority
      />

      {/* Content overlay */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-4">
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
        <h1 className="text-4xl md:text-6xl font-bold text-white text-center mb-12 drop-shadow-lg" style={{ textShadow: '4px 4px 0px rgba(0,0,0,0.5)' }}>
          GAME CONFIG
        </h1>

        {/* Config container */}
        <div className="flex flex-col gap-8 items-center max-w-md w-full">
          {/* Lives Selector */}
          <div className="bg-black bg-opacity-40 rounded-lg p-6 w-full border-4 border-yellow-400">
            <h2 className="text-2xl font-bold text-white text-center mb-4 drop-shadow">LIVES</h2>
            {lives === 1 && (
              <p className="text-sm text-yellow-300 text-center mb-3 italic">Classic Minesweeper Experience</p>
            )}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={decrementLives}
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold w-12 h-12 rounded-lg transition-colors"
              >
                −
              </button>
              <span className="text-5xl font-bold text-white w-16 text-center">{lives}</span>
              <button
                onClick={incrementLives}
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold w-12 h-12 rounded-lg transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Rounds Selector */}
          <div className="bg-black bg-opacity-40 rounded-lg p-6 w-full border-4 border-blue-400">
            <h2 className="text-2xl font-bold text-white text-center mb-4 drop-shadow">ROUNDS</h2>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={decrementRounds}
                className="bg-blue-400 hover:bg-blue-500 text-white font-bold w-12 h-12 rounded-lg transition-colors"
              >
                −
              </button>
              <span className="text-5xl font-bold text-white w-16 text-center">{rounds}</span>
              <button
                onClick={incrementRounds}
                className="bg-blue-400 hover:bg-blue-500 text-white font-bold w-12 h-12 rounded-lg transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Stake Input */}
          <div className="bg-black bg-opacity-40 rounded-lg p-6 w-full border-4 border-purple-400">
            <h2 className="text-2xl font-bold text-white text-center mb-4 drop-shadow">STAKE</h2>
            <input
              type="number"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              placeholder="Enter amount"
              className="w-full px-4 py-3 text-center text-xl font-bold rounded-lg bg-white bg-opacity-90 text-black placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-purple-400"
            />
          </div>

          {/* Advanced Section Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-white text-sm font-bold hover:text-yellow-300 transition-colors underline"
          >
            {showAdvanced ? '▼ ADVANCED' : '▶ ADVANCED'}
          </button>

          {/* Advanced Section */}
          {showAdvanced && (
            <div className="bg-black bg-opacity-40 rounded-lg p-6 w-full border-4 border-pink-400">
              <h2 className="text-2xl font-bold text-white text-center mb-4 drop-shadow">PLAYER ADDRESS</h2>
              <p className="text-xs text-gray-300 text-center mb-3">Optional: Make this a private game</p>
              <input
                type="text"
                value={playerAddress}
                onChange={(e) => setPlayerAddress(e.target.value.toUpperCase())}
                placeholder="Stellar Address (56 chars)"
                maxLength={56}
                className="w-full px-3 py-2 text-center text-xs font-mono rounded-lg bg-white bg-opacity-90 text-black placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-pink-400"
              />
              {playerAddress && (
                <p className="text-xs text-pink-300 text-center mt-2">
                  {playerAddress.length}/56 characters
                </p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmitClick}
            className={`transition-transform duration-150 mt-4 ${
              submitPressed ? 'scale-95' : 'scale-100 hover:scale-105'
            }`}
          >
            <Image
              src="/game-assets/start-game-button.svg"
              alt="Submit"
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
