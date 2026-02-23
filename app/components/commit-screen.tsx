"use client";

import circuitData from "@/lib/circuits.json";

import { useState } from "react";
import Image from "next/image";
import { useBoard } from "@/hooks/use-board";
import { TileMap } from "@/components/tile-map";

interface CommitScreenProps {
  onBack: () => void;
  onCommit: (minePositions: Array<{ x: number; y: number }>) => void;
}

const MAX_MINES = 5;

export function CommitScreen({ onBack, onCommit }: CommitScreenProps) {
  const { minedTiles, toggleTileMine, getMineCount, boardSize } = useBoard();
  const [commitPressed, setCommitPressed] = useState(false);
  const [backPressed, setBackPressed] = useState(false);

  const mineCount = getMineCount();

  const handleTileClick = (x: number, y: number) => {
    toggleTileMine(x, y, MAX_MINES);
  };

  const handleBackClick = () => {
    setBackPressed(true);
    setTimeout(() => {
      setBackPressed(false);
      onBack();
    }, 150);
  };

  const handleCommitClick = () => {
    try {
      if (mineCount === MAX_MINES) {
        setCommitPressed(true);
        onCommit(minedTiles);
        setCommitPressed(false);
      }
    } catch (error) {
      throw error;
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center">
      {/* Background Image */}
      <Image
        src="/game-assets/menu-background.png"
        alt="Commit Screen Background"
        fill
        className="object-cover"
        priority
      />

      {/* Content overlay */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-between py-6 px-4">
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

        {/* Top Third - Title */}
        <div className="pt-20">
          <h1
            className="text-4xl md:text-6xl font-bold text-white text-center drop-shadow-lg"
            style={{ textShadow: "4px 4px 0px rgba(0,0,0,0.5)" }}
          >
            HIDE YOUR MINES!
          </h1>
        </div>

        {/* Middle Section - Board and Mine Counter */}
        <div className="flex flex-col items-center gap-6">
          {/* Mine Counter */}
          <div className="bg-black bg-opacity-50 rounded-lg px-8 py-3 border-4 border-yellow-400">
            <p className="text-3xl font-bold text-yellow-300 text-center drop-shadow">
              {mineCount}/{MAX_MINES} MINES
            </p>
          </div>

          {/* Tilemap */}
          <div className="bg-black bg-opacity-30 rounded-lg p-4 border-4 border-blue-400">
            <TileMap
              width={boardSize}
              height={boardSize}
              minedTiles={minedTiles}
              onTileClick={handleTileClick}
              showMines={true}
            />
          </div>
        </div>

        {/* Bottom Third - Commit Button */}
        <div className="pb-6">
          <button
            onClick={handleCommitClick}
            disabled={mineCount !== MAX_MINES}
            className={`transition-transform duration-150 ${
              commitPressed ? "scale-95" : "scale-100 hover:scale-105"
            } ${mineCount !== MAX_MINES ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Image
              src="/game-assets/start-game-button.svg"
              alt="Commit"
              width={240}
              height={80}
              className="w-48 h-auto md:w-56 md:h-auto"
            />
          </button>
        </div>
      </div>
    </div>
  );
}
