"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface VictoryScreenProps {
  isVictory: boolean;
  stake: number;
  winner: string;
  loser: string;
  onPlayAgain?: () => void;
  onBackToMenu?: () => void;
}

export function VictoryScreen({
  isVictory,
  stake,
  winner,
  loser,
  onPlayAgain,
  onBackToMenu,
}: VictoryScreenProps) {
  const [playAgainPressed, setPlayAgainPressed] = useState(false);
  const [menuPressed, setMenuPressed] = useState(false);
  const [showStakeMessage, setShowStakeMessage] = useState(false);

  useEffect(() => {
    // Delay showing stake message for dramatic effect
    const timer = setTimeout(() => setShowStakeMessage(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handlePlayAgain = () => {
    setPlayAgainPressed(true);
    setTimeout(() => {
      setPlayAgainPressed(false);
      onPlayAgain?.();
    }, 150);
  };

  const handleBackToMenu = () => {
    setMenuPressed(true);
    setTimeout(() => {
      setMenuPressed(false);
      onBackToMenu?.();
    }, 150);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center">
      {/* Background Image */}
      <Image
        src="/game-assets/menu-background.png"
        alt="Game Background"
        fill
        className="object-cover"
        priority
      />

      {/* Content overlay */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-4">
        {/* Result Section */}
        <div className="flex flex-col items-center gap-8 mb-8">
          {/* Victory/Defeat Title */}
          <div className="text-center">
            <h1
              className={`text-7xl md:text-8xl font-black tracking-wider mb-4 drop-shadow-lg ${
                isVictory ? "text-green-400" : "text-red-500"
              }`}
              style={{
                textShadow: isVictory
                  ? "6px 6px 0px rgba(0,0,0,0.8), 12px 12px 0px rgba(34,197,94,0.3)"
                  : "6px 6px 0px rgba(0,0,0,0.8), 12px 12px 0px rgba(239,68,68,0.3)",
                letterSpacing: "0.1em",
              }}
            >
              {isVictory ? "VICTORY" : "DEFEAT"}
            </h1>

            {/* Winner/Loser announcement */}
            <p
              className="text-2xl md:text-3xl text-white font-bold drop-shadow-lg"
              style={{ textShadow: "2px 2px 0px rgba(0,0,0,0.6)" }}
            >
              {isVictory ? `${winner} WINS!` : `${winner} WINS!`}
            </p>
          </div>

          {/* Stake Transfer Message */}
          {stake > 0 && showStakeMessage && (
            <div className="bg-black bg-opacity-60 rounded-lg p-8 border-4 border-yellow-400 max-w-md w-full animate-fade-in">
              <p className="text-yellow-300 text-xl font-bold text-center mb-3 drop-shadow">
                FUNDS TRANSFERRED
              </p>
              <p
                className="text-white text-2xl font-black text-center drop-shadow"
                style={{ textShadow: "2px 2px 0px rgba(0,0,0,0.6)" }}
              >
                {stake} LUMENS
              </p>
              <p className="text-gray-300 text-sm text-center mt-3">
                Transferred to {winner}'s wallet
              </p>
            </div>
          )}
        </div>

        {/* Buttons container */}
        <div className="flex flex-col gap-6 items-center mt-8">
          {/* Play Again Button */}
          <button
            onClick={handlePlayAgain}
            className={`transition-transform duration-150 ${
              playAgainPressed ? "scale-95" : "scale-100 hover:scale-105"
            }`}
          >
            <Image
              src="/game-assets/start-game-button.svg"
              alt="Play Again"
              width={240}
              height={80}
              className="w-48 h-auto md:w-64 md:h-auto"
            />
          </button>

          {/* Back to Menu Button */}
          <button
            onClick={handleBackToMenu}
            className={`transition-transform duration-150 ${
              menuPressed ? "scale-95" : "scale-100 hover:scale-105"
            }`}
          >
            <Image
              src="/game-assets/join-game-button.svg"
              alt="Back to Menu"
              width={240}
              height={80}
              className="w-48 h-auto md:w-64 md:h-auto"
            />
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        :global(.animate-fade-in) {
          animation: fadeIn 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
