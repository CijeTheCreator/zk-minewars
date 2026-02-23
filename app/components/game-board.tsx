"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  convertBoard,
  countRevealedTiles,
  playTurn,
  TileState,
} from "@/lib/soroban-utils";
import { TileMap } from "./tile-map";

interface GameBoardProps {
  playerMines: Array<{ x: number; y: number }>;
  opponentMines: Array<{ x: number; y: number }>;
  playWindow?: number;
  playerNumber: number;
  sessionId: string;
  onGameEnd?: (winner: "player1" | "player2") => void;
}

const BOARD_SIZE = 9;
const REVEAL_DELAY = 800;

export function GameBoard({
  playerMines,
  opponentMines,
  playWindow = 30,
  playerNumber,
  sessionId,
  onGameEnd,
}: GameBoardProps) {
  const [tiles, setTiles] = useState<TileState[][]>([]);
  const [flaggedTiles, setFlaggedTiles] = useState<boolean[][]>([]);
  const [isMyTurn, setIsMyTurn] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);
  const [tilesOpened, setTilesOpened] = useState(0);
  const [points, setPoints] = useState({ player1: 0, player2: 0 });
  const [lives, setLives] = useState({ player1: 3, player2: 3 });
  const [round, setRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(playWindow);
  const [timerExpired, setTimerExpired] = useState(false);

  const otherPlayerNumber = playerNumber == 1 ? 0 : 1;

  const gameData = useQuery(
    api.game.getGame,
    sessionId != ""
      ? {
          id: Number(sessionId),
        }
      : "skip",
  );

  const latestXY = useQuery(
    api.game.getLatestXY,
    sessionId != ""
      ? {
          game_id: Number(sessionId),
        }
      : "skip",
  );

  useEffect(() => {
    if (!gameData) {
      return setIsLoading(true);
    }
    if (gameData.game_state == "Ended") {
      onGameEnd?.("player1");
    }
  });

  useEffect(() => {
    if (!gameData) {
      return setIsLoading(true);
    }
    setLives({
      player1: gameData.player_1_lives,
      player2: gameData.player_2_lives,
    });

    setRound(gameData.current_round);
    const tileCount = countRevealedTiles(tiles);
    setTilesOpened(tileCount);
  }, [gameData]);

  /* Initial reveals state */
  useEffect(() => {
    const flaggedTiles = Array(BOARD_SIZE)
      .fill(null)
      .map((_, y) =>
        Array(BOARD_SIZE)
          .fill(null)
          .map((_, x) => false),
      );
    setFlaggedTiles(flaggedTiles);
    setIsLoading(false);
  }, []);

  // Set board from contract
  useEffect(() => {
    if (flaggedTiles.length == 0) {
      return setIsLoading(true);
    }
    if (!gameData?.board) {
      return setIsLoading(true);
    }
    try {
      const contractBoard = gameData?.board;
      if (!contractBoard) {
        throw new Error("Board not initialized yet");
      }
      const newTiles = convertBoard(contractBoard, flaggedTiles);
      setTiles(newTiles);
      setIsLoading(false);
    } catch (error) {
      alert((error as Error).message);
    }
  }, [gameData]);

  /* Set Turn */
  useEffect(() => {
    if (!gameData) {
      return setIsLoading(true);
    }
    try {
      setIsMyTurn(gameData.current_player_turn == playerNumber);
    } catch (error) {
      alert((error as Error).message);
    }
  }, [gameData]);

  // Timer effect
  useEffect(() => {
    if (timerExpired) return;

    const timer = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.round(gameData?.current_round_move_window! - Date.now() / 1000),
      );
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setTimerExpired(true);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gameData, timerExpired]);

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
    startX: number,
    startY: number,
    updatedTiles: TileState[][],
  ) => {
    const toReveal = [[startX, startY]];
    const visited = new Set<string>();

    while (toReveal.length > 0) {
      const [x, y] = toReveal.shift()!;
      const key = `${x},${y}`;

      if (
        visited.has(key) ||
        x < 0 ||
        x >= BOARD_SIZE ||
        y < 0 ||
        y >= BOARD_SIZE
      ) {
        continue;
      }

      visited.add(key);
      updatedTiles[y][x].revealed = true;

      if (updatedTiles[y][x].value === 0) {
        // Add adjacent tiles to the queue
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dy === 0 && dx === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (!visited.has(`${nx},${ny}`)) {
              toReveal.push([nx, ny]);
            }
          }
        }
      }
    }
  };

  const handleAbandonGame = () => {
    // Current player loses when abandoning
    const loser = isMyTurn;
    const winner = "player1";
    onGameEnd?.(winner);
  };

  const handleTileClick = async (
    x: number,
    y: number,
    isCtrlClick: boolean,
  ) => {
    try {
      if (!tiles[y]) return;
      const tile = tiles[y][x];
      if (tile.revealed) return;

      if (isCtrlClick) {
        setFlaggedTiles((prev) => {
          const isFlaggedTile = prev.map((row) => [...row]);
          isFlaggedTile[y] = [...isFlaggedTile[y]];
          isFlaggedTile[y][x] = true;
          return isFlaggedTile;
        });
        return;
      }

      if (!latestXY) {
        throw new Error("TileMap out of sync");
      }

      if (!gameData) {
        throw new Error("Invalid GameData");
      }

      const { x: lastX, y: lastY } = latestXY;

      const result = await playTurn({
        gameId: gameData.game_id,
        nextRoundX: x,
        nextRoundY: y,
        previousRoundX: lastX,
        previousRoundY: lastY,
        playerNumber: playerNumber,
        isFirstTurn: round == 0 && playerNumber == 0,
      });

      console.log(result);
    } catch (error) {
      console.log(error);
      alert((error as Error).message);
    }
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

  if (!gameData) {
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
        <div className="pt-4 w-full flex flex-col items-center gap-4">
          <div className="text-center">
            <h1
              className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg mb-3"
              style={{ textShadow: "4px 4px 0px rgba(0,0,0,0.5)" }}
            >
              {isMyTurn ? "YOUR TURN" : "WAITING FOR OTHER PLAYER"}
            </h1>
            {!isMyTurn && (
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

          {/* Timer Display */}
          {/* <div */}
          {/*   className={`bg-black bg-opacity-50 rounded-lg px-6 py-2 border-2 ${timerExpired ? "border-red-500 bg-red-900 bg-opacity-30" : "border-cyan-400"}`} */}
          {/* > */}
          {/*   <p */}
          {/*     className={`text-3xl font-bold font-mono ${timerExpired ? "text-red-400 animate-pulse" : "text-cyan-300"}`} */}
          {/*   > */}
          {/*     {timeLeft}s */}
          {/*   </p> */}
          {/* </div> */}

          {/* {timerExpired && !isMyTurn && ( */}
          {/*   <button */}
          {/*     onClick={handleAbandonGame} */}
          {/*     className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-lg transition-colors animate-pulse" */}
          {/*   > */}
          {/*     ABANDON GAME */}
          {/*   </button> */}
          {/* )} */}
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
                row.map((tile, x) => {
                  const isOpponent = tile.opponentClicked && !tile.revealed;
                  return (
                    <button
                      key={`${x}-${y}`}
                      onClick={(e) =>
                        handleTileClick(x, y, e.ctrlKey || e.metaKey)
                      }
                      disabled={tile.revealed}
                      style={{
                        width: `${tileSize}px`,
                        height: `${tileSize}px`,
                        animation: isOpponent
                          ? "opponentPulse 1.1s ease-in-out infinite"
                          : undefined,
                        position: "relative",
                      }}
                      className={`flex items-center justify-center text-2xl font-bold border-2 transition-all duration-75 ${
                        tile.revealed
                          ? "bg-gray-900 border-gray-700 cursor-default"
                          : isOpponent
                            ? "bg-amber-950 border-amber-400 cursor-pointer"
                            : tile.flagged
                              ? "bg-yellow-600 border-yellow-500 cursor-pointer"
                              : "bg-gradient-to-b from-gray-600 to-gray-700 border-gray-500 hover:from-gray-500 hover:to-gray-600 cursor-pointer active:scale-95"
                      }`}
                    >
                      {/* Opponent click crosshair */}
                      {isOpponent && !tile.flagged && (
                        <span
                          style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: tileSize > 50 ? "20px" : "14px",
                            pointerEvents: "none",
                          }}
                        >
                          🎯
                        </span>
                      )}

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
                        </>
                      )}

                      {tile.flagged && !tile.revealed && !isOpponent && (
                        <span className="text-yellow-300">🚩</span>
                      )}
                    </button>
                  );
                }),
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
              <p className="text-sm text-red-300 font-bold">POINTS</p>
              <p className="text-lg text-red-300 font-bold">
                P1: {points.player1} | P2: {points.player2}
              </p>
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
