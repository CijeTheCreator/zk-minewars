"use client";

import React, { useState } from "react";
import Image from "next/image";

interface JoinConfirmationScreenProps {
  sessionId: string;
  lives: number;
  rounds: number;
  stake: number;
  playWindow: number;
  onBack: () => void;
  onConfirm: () => void;
}

export function JoinConfirmationScreen({
  sessionId,
  lives,
  rounds,
  stake,
  playWindow,
  onBack,
  onConfirm,
}: JoinConfirmationScreenProps) {
  const [backPressed, setBackPressed] = useState(false);
  const [confirmPressed, setConfirmPressed] = useState(false);

  const handleBackClick = () => {
    setBackPressed(true);
    setTimeout(() => {
      setBackPressed(false);
      onBack();
    }, 150);
  };

  const handleConfirmClick = () => {
    setConfirmPressed(true);
    setTimeout(() => {
      setConfirmPressed(false);
      onConfirm();
    }, 150);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center">
      {/* Background Image */}
      <Image
        src="/game-assets/menu-background.png"
        alt="Join Confirmation Background"
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
            backPressed ? "scale-95" : "scale-100"
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
        <h1
          className="text-4xl md:text-6xl font-bold text-white text-center mb-12 drop-shadow-lg"
          style={{ textShadow: "4px 4px 0px rgba(0,0,0,0.5)" }}
        >
          CONFIRM JOIN
        </h1>

        {/* Game Details Container */}
        <div className="bg-black bg-opacity-40 rounded-lg p-8 w-full max-w-lg border-4 border-cyan-400 space-y-6">
          {/* Session ID */}
          <div className="bg-black bg-opacity-50 rounded-lg p-4 border-2 border-cyan-300">
            <p className="text-sm text-cyan-300 font-bold text-center mb-1">
              SESSION ID
            </p>
            <p className="text-2xl md:text-3xl font-bold text-white text-center font-mono">
              {sessionId}
            </p>
          </div>

          {/* Game Settings Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Lives */}
            <div className="bg-black bg-opacity-50 rounded-lg p-4 border-2 border-yellow-400">
              <p className="text-sm text-yellow-300 font-bold text-center mb-2">
                LIVES
              </p>
              <p className="text-4xl font-bold text-white text-center">
                {lives}
              </p>
            </div>

            {/* Rounds */}
            <div className="bg-black bg-opacity-50 rounded-lg p-4 border-2 border-blue-400">
              <p className="text-sm text-blue-300 font-bold text-center mb-2">
                ROUNDS
              </p>
              <p className="text-4xl font-bold text-white text-center">
                {rounds}
              </p>
            </div>

            {/* Stake */}
            <div className="bg-black bg-opacity-50 rounded-lg p-4 border-2 border-purple-400">
              <p className="text-sm text-purple-300 font-bold text-center mb-2">
                STAKE
              </p>
              <p className="text-4xl font-bold text-white text-center">
                {stake}
              </p>
            </div>

            {/* Play Window */}
            <div className="bg-black bg-opacity-50 rounded-lg p-4 border-2 border-green-400">
              <p className="text-sm text-green-300 font-bold text-center mb-2">
                PLAY WINDOW
              </p>
              <p className="text-4xl font-bold text-white text-center">
                {playWindow}s
              </p>
            </div>
          </div>

          {/* Stake Warning */}
          {stake > 0 && (
            <div className="bg-purple-900 bg-opacity-50 rounded-lg p-4 border-2 border-purple-400">
              <p className="text-purple-200 text-center text-sm">
                <span className="font-bold">{stake} Lumens</span> will be
                transferred from your wallet if you lose
              </p>
            </div>
          )}
        </div>

        {/* Button Container */}
        <div className="mt-12 flex flex-col gap-6 items-center">
          {/* Confirm Button */}
          <button
            onClick={handleConfirmClick}
            className={`transition-transform duration-150 ${
              confirmPressed ? "scale-95" : "scale-100 hover:scale-105"
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
        </div>
      </div>
    </div>
  );
}
