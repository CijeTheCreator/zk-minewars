'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const MINESWEEPER_TIPS = [
  "Always flag mines to help you remember their locations!",
  "Start from the corners and edges of the board.",
  "Numbers tell you how many mines are adjacent to that square.",
  "If you click on a 0, it will auto-reveal safe squares around it.",
  "Plan ahead - sometimes it's better to wait and gather more information.",
  "Use flags to mark uncertain squares until you have more clues.",
  "The first click is always safe - it can never be a mine.",
  "Work systematically from one area to another.",
  "Count adjacent numbers to deduce mine locations logically.",
  "Don't guess randomly - analyze the numbers carefully!"
];

interface WaitingScreenProps {
  sessionId: string;
  onCancel: () => void;
}

export function WaitingScreen({ sessionId, onCancel }: WaitingScreenProps) {
  const [copied, setCopied] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);
  const [cancelPressed, setCancelPressed] = useState(false);

  useEffect(() => {
    setCurrentTip(Math.floor(Math.random() * MINESWEEPER_TIPS.length));
  }, []);

  const handleCopySessionId = () => {
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancelClick = () => {
    setCancelPressed(true);
    setTimeout(() => {
      setCancelPressed(false);
      onCancel();
    }, 150);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col">
      {/* Background Image */}
      <Image
        src="/game-assets/menu-background.png"
        alt="Waiting Screen Background"
        fill
        className="object-cover"
        priority
      />

      {/* Content overlay */}
      <div className="relative z-10 w-full h-full flex flex-col">
        
        {/* First Third - Waiting Message */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg mb-4" style={{ textShadow: '4px 4px 0px rgba(0,0,0,0.5)' }}>
              WAITING FOR PLAYER 2
            </h1>
            <div className="flex justify-center gap-2 mt-4">
              <span className="text-3xl text-yellow-300 animate-bounce" style={{ animationDelay: '0s' }}>●</span>
              <span className="text-3xl text-yellow-300 animate-bounce" style={{ animationDelay: '0.15s' }}>●</span>
              <span className="text-3xl text-yellow-300 animate-bounce" style={{ animationDelay: '0.3s' }}>●</span>
            </div>
          </div>
        </div>

        {/* Second Third - Session ID */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-black bg-opacity-50 rounded-lg p-8 border-4 border-cyan-400 max-w-md w-full text-center">
            <h2 className="text-xl font-bold text-white mb-2 drop-shadow">SHARE SESSION ID</h2>
            <p className="text-xs text-gray-300 mb-4">Player 2 can use this to join the game</p>
            <div className="flex items-center gap-2 justify-center">
              <div className="flex-1 bg-white bg-opacity-90 rounded-lg p-3 break-all">
                <p className="text-lg font-mono font-bold text-black">{sessionId}</p>
              </div>
              <button
                onClick={handleCopySessionId}
                className="bg-cyan-400 hover:bg-cyan-500 text-black font-bold px-4 py-3 rounded-lg transition-colors whitespace-nowrap"
              >
                {copied ? '✓' : 'COPY'}
              </button>
            </div>
          </div>
        </div>

        {/* Third Section - Tip and Cancel */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
          <div className="bg-black bg-opacity-50 rounded-lg p-6 border-4 border-green-400 max-w-md w-full text-center mb-6">
            <h3 className="text-sm font-bold text-green-300 mb-3 drop-shadow">💡 MINESWEEPER TIP</h3>
            <p className="text-white text-sm leading-relaxed">{MINESWEEPER_TIPS[currentTip]}</p>
          </div>

          {/* Cancel Button */}
          <button
            onClick={handleCancelClick}
            className={`transition-transform duration-150 ${
              cancelPressed ? 'scale-95' : 'scale-100 hover:scale-105'
            }`}
          >
            <Image
              src="/game-assets/start-game-button.svg"
              alt="Cancel"
              width={160}
              height={60}
              className="w-40 h-auto"
            />
          </button>
        </div>
      </div>
    </div>
  );
}
