"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface TileState {
  revealed: boolean;
  flagged: boolean;
  value: number | "mine" | null; // null = no display
  isLoading: boolean;
}

interface GameBoardProps {
  playerMines: Array<{ x: number; y: number }>;
  opponentMines: Array<{ x: number; y: number }>;
  onGameEnd?: (winner: "player1" | "player2") => void;
}

const BOARD_SIZE = 9;
const REVEAL_DELAY = 800;

export function GameBoard({
  playerMines,
  opponentMines,
  onGameEnd,
}: GameBoardProps) {
  const [tiles, setTiles] = useState<TileState[][]>([]);
  const [currentTurn, setCurrentTurn] = useState<"player1" | "player2">(
    "player1",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [tilesOpened, setTilesOpened] = useState(0);
  const [points, setPoints] = useState(0);
  const [lives, setLives] = useState({ player1: 3, player2: 3 });
  const [round, setRound] = useState(1);
  const [gameActive, setGameActive] = useState(true);

  // Initialize the board
  useEffect(() => {
    const newTiles = Array(BOARD_SIZE)
      .fill(null)
      .map((_, y) =>
        Array(BOARD_SIZE)
          .fill(null)
          .map((_, x) => ({
            revealed: false,
            flagged: false,
            value: calculateTileValue(x, y),
            isLoading: false,
          })),
      );
    setTiles(newTiles);
    setIsLoading(false);
  }, []);

  const calculateTileValue = (x: number, y: number): number | "mine" => {
    // Check if it's an opponent's mine (we're revealing their board)
    const isMine = opponentMines.some((m) => m.x === x && m.y === y);
    if (isMine) return "mine";

    // Count adjacent mines
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dy === 0 && dx === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
          if (opponentMines.some((m) => m.x === nx && m.y === ny)) {
            count++;
          }
        }
      }
    }
    return count;
  };

  const revealAdjacentTiles = (
    centerX: number,
    centerY: number,
    updatedTiles: TileState[][],
  ) => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dy === 0 && dx === 0) continue;
        const nx = centerX + dx;
        const ny = centerY + dy;
        if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
          if (!updatedTiles[ny][nx].revealed && !updatedTiles[ny][nx].flagged) {
            updatedTiles[ny][nx].revealed = true;
            updatedTiles[ny][nx].value = null; // no number shown on cascade-revealed tiles
          }
        }
      }
    }
  };

  const getRandomTileValue = (): number | "mine" => {
    if (Math.random() < 0.15) return "mine"; // ~15% chance of mine
    return 0;
    return Math.floor(Math.random() * 9); // 0–8
  };

  const handleTileClick = async (
    x: number,
    y: number,
    isCtrlClick: boolean,
  ) => {
    if (!gameActive || !tiles[y]) return;

    const tile = tiles[y][x];

    // Never interact with already-revealed tiles
    if (tile.revealed) return;

    if (isCtrlClick) {
      // Toggle flag — do nothing else
      setTiles((prev) => {
        const newTiles = prev.map((row) => [...row]);
        newTiles[y] = [...newTiles[y]];
        newTiles[y][x] = {
          ...newTiles[y][x],
          flagged: !newTiles[y][x].flagged,
        };
        return newTiles;
      });
      return;
    }

    // Flagged tiles block regular clicks
    if (tile.flagged) return;

    // Show loader
    setTiles((prev) => {
      const newTiles = prev.map((row) => [...row]);
      newTiles[y] = [...newTiles[y]];
      newTiles[y][x] = { ...newTiles[y][x], isLoading: true };
      return newTiles;
    });

    await new Promise((resolve) => setTimeout(resolve, REVEAL_DELAY));

    // Assign random value at click time
    const randomValue = getRandomTileValue();

    setTiles((prev) => {
      const newTiles = prev.map((row) => row.map((cell) => ({ ...cell })));
      newTiles[y][x] = {
        ...newTiles[y][x],
        isLoading: false,
        revealed: true,
        value: randomValue,
      };

      if (randomValue === 0) {
        revealAdjacentTiles(x, y, newTiles); // cascade, skips flagged inside
      }

      return newTiles;
    });

    // Handle mine hit — outside setTiles to avoid side effects in updater
    if (randomValue === "mine") {
      setLives((prev) => ({
        ...prev,
        [currentTurn]: Math.max(0, prev[currentTurn] - 1),
      }));
    }

    setCurrentTurn((prev) => (prev === "player1" ? "player2" : "player1"));
  };

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h1 className="text-4xl text-white mb-4">Loading Game...</h1>
        </div>
      </div>
    );
  }

  const tileSize = Math.min(100, Math.max(40, 360 / BOARD_SIZE));

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center">
      {/* Background Image */}
      <Image
        src="/game-assets/menu-background.png"
        alt="Game Board Background"
        fill
        className="object-cover"
        priority
      />

      {/* Content overlay */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-between py-6 px-4">
        {/* First Third - Turn Status */}
        <div className="pt-4">
          <div className="text-center">
            <h1
              className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg mb-3"
              style={{ textShadow: "4px 4px 0px rgba(0,0,0,0.5)" }}
            >
              {currentTurn === "player1" ? "YOUR TURN" : "WAITING FOR PLAYER 2"}
            </h1>
            {currentTurn === "player2" && (
              <div className="flex justify-center gap-2 mt-2">
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
            )}
          </div>
        </div>

        {/* Middle Third - Board */}
        <div className="flex flex-col items-center gap-6">
          <div className="bg-black bg-opacity-30 rounded-lg p-4 border-4 border-blue-400">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
                gap: "2px",
                padding: "4px",
                backgroundColor: "#1f2937",
              }}
            >
              {tiles.map((row, y) =>
                row.map((tile, x) => (
                  <button
                    key={`${x}-${y}`}
                    onClick={(e) => {
                      const isCtrlClick = e.ctrlKey || e.metaKey;
                      handleTileClick(x, y, isCtrlClick);
                    }}
                    disabled={!gameActive || tile.revealed}
                    style={{
                      width: `${tileSize}px`,
                      height: `${tileSize}px`,
                    }}
                    className={`relative flex items-center justify-center text-2xl font-bold border-2 transition-all duration-75 ${
                      tile.revealed
                        ? "bg-gray-900 border-gray-700 cursor-default"
                        : "bg-gradient-to-b from-gray-600 to-gray-700 border-gray-500 hover:from-gray-500 hover:to-gray-600 cursor-pointer active:scale-95"
                    } ${tile.flagged ? "bg-yellow-600 border-yellow-500" : ""}`}
                  >
                    {tile.isLoading && (
                      <div className="animate-spin">
                        <span>⟳</span>
                      </div>
                    )}
                    {tile.revealed && !tile.isLoading && (
                      <>
                        {tile.value === "mine" && (
                          <div className="text-2xl">💣</div>
                        )}
                        {tile.value === 0 && (
                          <span className="text-gray-400">0</span>
                        )}
                        {typeof tile.value === "number" && tile.value > 0 && (
                          <span className="text-blue-400">{tile.value}</span>
                        )}
                        {/* null = blank, render nothing */}
                      </>
                    )}
                    {tile.flagged && !tile.revealed && (
                      <span className="text-yellow-300">🚩</span>
                    )}
                  </button>
                )),
              )}
            </div>
          </div>
        </div>

        {/* Bottom Third - Stats */}
        <div className="w-full max-w-2xl">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="bg-black bg-opacity-50 rounded-lg px-4 py-3 border-2 border-purple-400 text-center">
              <p className="text-sm text-purple-300 font-bold">ROUND</p>
              <p className="text-2xl text-purple-300 font-bold">{round}</p>
            </div>
            <div className="bg-black bg-opacity-50 rounded-lg px-4 py-3 border-2 border-green-400 text-center">
              <p className="text-sm text-green-300 font-bold">TILES OPENED</p>
              <p className="text-2xl text-green-300 font-bold">{tilesOpened}</p>
            </div>
            <div className="bg-black bg-opacity-50 rounded-lg px-4 py-3 border-2 border-yellow-400 text-center">
              <p className="text-sm text-yellow-300 font-bold">POINTS</p>
              <p className="text-2xl text-yellow-300 font-bold">{points}</p>
            </div>
            <div className="bg-black bg-opacity-50 rounded-lg px-4 py-3 border-2 border-red-400 text-center">
              <p className="text-sm text-red-300 font-bold">LIVES</p>
              <p className="text-lg text-red-300 font-bold">
                P1: {lives.player1} | P2: {lives.player2}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
