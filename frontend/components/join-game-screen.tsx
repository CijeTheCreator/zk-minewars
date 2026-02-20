'use client';

import { useState } from 'react';
import Image from 'next/image';

interface JoinGameScreenProps {
  onBack: () => void;
  onJoin: (sessionId: string) => void;
}

export function JoinGameScreen({ onBack, onJoin }: JoinGameScreenProps) {
  const [sessionId, setSessionId] = useState('');
  const [joinPressed, setJoinPressed] = useState(false);
  const [backPressed, setBackPressed] = useState(false);

  const handleBackClick = () => {
    setBackPressed(true);
    setTimeout(() => {
      setBackPressed(false);
      onBack();
    }, 150);
  };

  const handleJoinClick = () => {
    if (sessionId.trim()) {
      setJoinPressed(true);
      setTimeout(() => {
        setJoinPressed(false);
        onJoin(sessionId);
      }, 150);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center">
      {/* Background Image */}
      <Image
        src="/game-assets/menu-background.png"
        alt="Join Game Background"
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
          JOIN GAME
        </h1>

        {/* Join Form */}
        <div className="bg-black bg-opacity-40 rounded-lg p-8 w-full max-w-md border-4 border-blue-400">
          <h2 className="text-2xl font-bold text-white text-center mb-6 drop-shadow">ENTER SESSION ID</h2>
          
          <input
            type="text"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value.toUpperCase())}
            placeholder="Session ID"
            className="w-full px-4 py-4 text-center text-lg font-bold rounded-lg bg-white bg-opacity-90 text-black placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-400 mb-8"
          />

          {/* Join Button */}
          <div className="flex justify-center">
            <button
              onClick={handleJoinClick}
              disabled={!sessionId.trim()}
              className={`transition-transform duration-150 ${
                joinPressed ? 'scale-95' : 'scale-100 hover:scale-105'
              } ${!sessionId.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
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
    </div>
  );
}
