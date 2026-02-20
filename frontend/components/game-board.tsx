"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface TileState {
  revealed: boolean;
  flagged: boolean;
  value: number | "mine" | null;
  isLoading: boolean;
  opponentClicked?: boolean;
}

interface GameBoardProps {
  playerMines: Array<{ x: number; y: number }>;
  opponentMines: Array<{ x: number; y: number }>;
  onGameEnd?: (winner: "player1" | "player2") => void;
}

interface ChallengeCard {
  x: number;
  y: number;
  visible: boolean;
  proving: boolean;
}

const BOARD_SIZE = 9;
const REVEAL_DELAY = 800;
const CHALLENGE_TIMER_DURATION = 12000; // 12 seconds

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
  const [challengeCard, setChallengeCard] = useState<ChallengeCard | null>(
    null,
  );
  const [timerProgress, setTimerProgress] = useState(100);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerStartRef = useRef<number>(0);
  const challengeActiveRef = useRef(false);

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
            opponentClicked: false,
          })),
      );
    setTiles(newTiles);
    setIsLoading(false);
  }, []);

  // Random challenge card trigger
  useEffect(() => {
    if (!gameActive) return;
    const interval = setInterval(() => {
      if (challengeActiveRef.current) return;
      if (Math.random() < 0.35) {
        const rx = Math.floor(Math.random() * BOARD_SIZE);
        const ry = Math.floor(Math.random() * BOARD_SIZE);
        showChallengeCard(rx, ry);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [gameActive]);

  const showChallengeCard = (x: number, y: number) => {
    challengeActiveRef.current = true;
    setChallengeCard({ x, y, visible: true, proving: false });
    setTimerProgress(100);
    timerStartRef.current = Date.now();

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - timerStartRef.current;
      const progress = Math.max(
        0,
        100 - (elapsed / CHALLENGE_TIMER_DURATION) * 100,
      );
      setTimerProgress(progress);
      if (progress <= 0 && timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }, 50);

    setTiles((prev) => {
      const newTiles = prev.map((row) =>
        row.map((cell) => ({ ...cell, opponentClicked: false })),
      );
      if (newTiles[y]?.[x]) {
        newTiles[y][x] = { ...newTiles[y][x], opponentClicked: true };
      }
      return newTiles;
    });
  };

  const handleProve = async () => {
    if (!challengeCard || challengeCard.proving) return;
    setChallengeCard((prev) => (prev ? { ...prev, proving: true } : null));
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    await new Promise((resolve) => setTimeout(resolve, 1800));

    setTiles((prev) =>
      prev.map((row) =>
        row.map((cell) => ({ ...cell, opponentClicked: false })),
      ),
    );
    setChallengeCard(null);
    challengeActiveRef.current = false;
  };

  const calculateTileValue = (x: number, y: number): number | "mine" => {
    const isMine = opponentMines.some((m) => m.x === x && m.y === y);
    if (isMine) return "mine";

    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dy === 0 && dx === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
          if (opponentMines.some((m) => m.x === nx && m.y === ny)) count++;
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
            updatedTiles[ny][nx].value = null;
          }
        }
      }
    }
  };

  const getRandomTileValue = (): number | "mine" => {
    if (Math.random() < 0.15) return "mine";
    return 0;
  };

  const handleTileClick = async (
    x: number,
    y: number,
    isCtrlClick: boolean,
  ) => {
    if (!gameActive || !tiles[y]) return;
    const tile = tiles[y][x];
    if (tile.revealed) return;

    if (isCtrlClick) {
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

    if (tile.flagged) return;

    setTiles((prev) => {
      const newTiles = prev.map((row) => [...row]);
      newTiles[y] = [...newTiles[y]];
      newTiles[y][x] = { ...newTiles[y][x], isLoading: true };
      return newTiles;
    });

    await new Promise((resolve) => setTimeout(resolve, REVEAL_DELAY));

    const randomValue = getRandomTileValue();

    setTiles((prev) => {
      const newTiles = prev.map((row) => row.map((cell) => ({ ...cell })));
      newTiles[y][x] = {
        ...newTiles[y][x],
        isLoading: false,
        revealed: true,
        value: randomValue,
      };
      if (randomValue === 0) revealAdjacentTiles(x, y, newTiles);
      return newTiles;
    });

    setTilesOpened((prev) => prev + 1);

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
  const timeRemaining = Math.ceil(
    (timerProgress / 100) * (CHALLENGE_TIMER_DURATION / 1000),
  );

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

      {/* Global keyframes */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes opponentPulse {
          0%, 100% { box-shadow: 0 0 0 2px #f59e0b, 0 0 10px rgba(245,158,11,0.5); }
          50% { box-shadow: 0 0 0 3px #fbbf24, 0 0 22px rgba(251,191,36,0.85); }
        }
        @keyframes cardSlideIn {
          from { transform: translateX(calc(100% + 48px)); opacity: 0.5; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {/* ── CHALLENGE CARD ── */}
      {challengeCard && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 50,
            width: "260px",
            animation:
              "cardSlideIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards",
          }}
        >
          <div
            className="bg-black bg-opacity-50 rounded-lg border-2 border-blue-400"
            style={{
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.75), 0 4px 24px rgba(0,0,0,0.6)",
            }}
          >
            <div className="p-5 pb-4">
              <p
                className="text-sm text-gray-400 font-bold mb-2"
                style={{ letterSpacing: "0.04em" }}
              >
                YOUR OPPONENT HAS SELECTED
              </p>
              <p
                className="text-4xl font-bold text-white mb-4"
                style={{
                  textShadow: "4px 4px 0px rgba(0,0,0,0.5)",
                  lineHeight: 1,
                }}
              >
                TILE ({challengeCard.x}, {challengeCard.y})
              </p>
              <p
                className="text-sm font-bold text-white"
                style={{ letterSpacing: "0.03em", lineHeight: 1.6 }}
              >
                PROVE THAT THEY HAVE HIT YOUR SECRET MINE
              </p>
            </div>

            <div className="border-t border-gray-700 mx-4" />

            <div className="p-4">
              <button
                onClick={handleProve}
                disabled={challengeCard.proving}
                className={`relative w-full rounded font-bold overflow-hidden ${
                  challengeCard.proving
                    ? "bg-gray-800 border-2 border-gray-700 text-gray-500 cursor-default"
                    : "bg-blue-500 border-2 border-blue-400 text-white hover:bg-blue-400 cursor-pointer"
                }`}
                style={{
                  padding: "11px",
                  letterSpacing: "0.12em",
                  fontSize: "13px",
                }}
              >
                {/* Timer drain bar */}
                {!challengeCard.proving && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      height: "3px",
                      width: `${timerProgress}%`,
                      background: timerProgress > 30 ? "#1d4ed8" : "#ef4444",
                      transition: "width 0.05s linear, background 0.4s",
                    }}
                  />
                )}
                {challengeCard.proving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span
                      style={{
                        display: "inline-block",
                        animation: "spin 0.6s linear infinite",
                      }}
                    >
                      ⟳
                    </span>
                    VERIFYING...
                  </span>
                ) : (
                  "PROVE"
                )}
              </button>

              {!challengeCard.proving && (
                <p
                  className="text-center mt-2 font-bold text-xs"
                  style={{
                    letterSpacing: "0.08em",
                    color: timerProgress < 25 ? "#ef4444" : "#4b5563",
                    transition: "color 0.3s",
                  }}
                >
                  {timerProgress > 0
                    ? `TIME REMAINING: ${timeRemaining}S`
                    : "TIME EXPIRED"}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content overlay */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-between py-6 px-4">
        {/* Turn Status */}
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
                {[0, 0.15, 0.3].map((delay, i) => (
                  <span
                    key={i}
                    className="text-3xl text-yellow-300 animate-bounce"
                    style={{ animationDelay: `${delay}s` }}
                  >
                    ●
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Board */}
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
                      disabled={!gameActive || tile.revealed}
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

        {/* Stats */}
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
