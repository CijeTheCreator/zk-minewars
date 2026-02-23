"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface CommitWaitingScreenProps {
  sessionId: string;
  playWindow: number;
  onPlay?: () => void;
  onCancel?: () => void;
  onAbandon?: () => void;
}

export function CommitWaitingScreen({
  sessionId,
  playWindow,
  onPlay,
  onCancel,
  onAbandon,
}: CommitWaitingScreenProps) {
  const [timeLeft, setTimeLeft] = useState(playWindow);
  const [cancelPressed, setCancelPressed] = useState(false);
  const [abandonPressed, setAbandonPressed] = useState(false);
  const [timerExpired, setTimerExpired] = useState(false);

  const gameData = useQuery(
    api.game.getGame,
    sessionId != ""
      ? {
          id: Number(sessionId),
        }
      : "skip",
  );

  useEffect(() => {
    if (timerExpired) return;

    const timer = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.round(gameData?.commit_move_window! - Date.now() / 1000),
      );
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setTimerExpired(true);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gameData, timerExpired]);

  useEffect(() => {
    if (gameData?.game_state == "Playing") {
      onPlay?.();
    }
  }, [gameData]);

  const handleCancelClick = () => {
    setCancelPressed(true);
    setTimeout(() => {
      setCancelPressed(false);
      onCancel?.();
    }, 150);
  };

  const handleAbandonClick = () => {
    setAbandonPressed(true);
    setTimeout(() => {
      setAbandonPressed(false);
      onAbandon?.();
    }, 150);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerDisplay = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

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
            <h1
              className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg mb-4"
              style={{ textShadow: "4px 4px 0px rgba(0,0,0,0.5)" }}
            >
              MINES COMMITTED
            </h1>
            <p
              className="text-xl text-white drop-shadow-lg"
              style={{ textShadow: "2px 2px 0px rgba(0,0,0,0.5)" }}
            >
              Waiting for Player 2...
            </p>
            <div className="flex justify-center gap-2 mt-6">
              <span
                className="text-3xl text-yellow-300 animate-bounce"
                style={{ animationDelay: "0s" }}
              >
                ●
              </span>
              <span
                className="text-3xl text-yellow-300 animate-bounce"
                style={{ animationDelay: "0.15s" }}
              >
                ●
              </span>
              <span
                className="text-3xl text-yellow-300 animate-bounce"
                style={{ animationDelay: "0.3s" }}
              >
                ●
              </span>
            </div>
          </div>
        </div>

        {/* Second Third - Timer and Session ID */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
          {/* Timer */}
          {/* <div */}
          {/*   className={`bg-black bg-opacity-50 rounded-lg px-8 py-4 border-2 ${timeLeft <= 30 ? "border-red-500 bg-red-900 bg-opacity-30" : "border-cyan-400"}`} */}
          {/* > */}
          {/*   <p */}
          {/*     className={`text-5xl font-bold font-mono ${timeLeft <= 30 ? "text-red-400 animate-pulse" : "text-cyan-300"}`} */}
          {/*   > */}
          {/*     {timerDisplay} */}
          {/*   </p> */}
          {/* </div> */}

          {/* Session Info */}
          <div className="bg-black bg-opacity-50 rounded-lg p-6 border-4 border-purple-400 max-w-md w-full text-center">
            <h2 className="text-lg font-bold text-white mb-2 drop-shadow">
              SESSION ID
            </h2>
            <p className="text-xs text-gray-300 mb-3">Game Code</p>
            <div className="bg-white bg-opacity-90 rounded-lg p-3 break-all">
              <p className="text-lg font-mono font-bold text-black">
                {sessionId}
              </p>
            </div>
          </div>
        </div>

        {/* Third Section - Buttons */}
        <div className="flex-1 flex items-center justify-center gap-6 px-4 pb-8 flex-wrap">
          {onCancel && (
            <button
              onClick={handleCancelClick}
              className={`transition-transform duration-150 ${
                cancelPressed ? "scale-95" : "scale-100 hover:scale-105"
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
          )}
          {timerExpired && onAbandon && (
            <button
              onClick={handleAbandonClick}
              className={`transition-transform duration-150 ${
                abandonPressed ? "scale-95" : "scale-100 hover:scale-105"
              }`}
            >
              <div className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3 rounded-lg transition-colors animate-pulse">
                ABANDON
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
