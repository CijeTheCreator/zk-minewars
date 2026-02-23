"use client";
import { CommitScreen } from "@/components/commit-screen";
import { ConnectWalletScreen } from "@/components/connect-wallet-screen";
import { GameBoard } from "@/components/game-board";
import {
  type GameConfig,
  GameConfigScreen,
} from "@/components/game-config-screen";
import { JoinConfirmationScreen } from "@/components/join-confirmation-screen";
import { JoinGameScreen } from "@/components/join-game-screen";
import { MenuScreen } from "@/components/menu-screen";
import { VictoryScreen } from "@/components/victory-screen";
import { WaitingScreen } from "@/components/waiting-screen";
import { api } from "@/convex/_generated/api";
import { handleTransaction, commitMines } from "@/lib/soroban-utils";
import { setAllowed, getAddress } from "@stellar/freighter-api";
import { nativeToScVal, Address } from "@stellar/stellar-sdk";
import { fetchQuery } from "convex/nextjs";
import { formatUnits } from "ethers";
import { useState } from "react";
import { Screen, GameBoardData, GameResult, undefined } from "./page";

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("connect-wallet");
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [joinedSessionId, setJoinedSessionId] = useState("");
  const [gameBoardData, setGameBoardData] = useState<GameBoardData | null>(
    null,
  );
  const [gameResult, setGameResult] = useState<GameResult | null>(null);

  const generateSessionId = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const handleStartGame = () => {
    setCurrentScreen("game-config");
  };

  const handleJoinGameClick = async () => {
    try {
      setCurrentScreen("join-game");
    } catch (error) {
      alert((error as Error).message);
    }
  };

  const handleBackToMenu = () => {
    setCurrentScreen("menu");
  };

  // Updated call site
  const handleGameConfigSubmit = async (config: GameConfig) => {
    setGameConfig(config);
    try {
      await setAllowed();
      const { address } = await getAddress();
      const result = await handleTransaction({
        name: "propose_game",
        args: [
          nativeToScVal(config.lives, { type: "u32" }),
          nativeToScVal(config.rounds, { type: "u32" }),
          nativeToScVal(config.stake, { type: "i128" }),
          new Address(address).toScVal(),
          new Address(config.playerAddress!).toScVal(),
          nativeToScVal(config.playWindow, { type: "u64" }),
        ],
      });
      console.log("Result: ", result);

      setSessionId(result.events[0].eventData.id);
      setCurrentScreen("waiting");
    } catch (error) {
      alert((error as Error).message);
    }
  };

  const handleWaitingCancel = () => {
    setCurrentScreen("menu");
  };

  const handleJoinGame = async (id: string) => {
    try {
      console.log("Joining game with session ID:", id);

      await setAllowed();
      const { address } = await getAddress();
      const { joinable, message } = await fetchQuery(
        api.game.checkGameJoinable,
        {
          id: Number(id),
          player: address,
        },
      );

      if (!joinable) {
        throw new Error(message);
      }
      const game = await fetchQuery(api.game.getGame, {
        id: Number(id),
      });
      if (!game) throw new Error("Game not found");
      setJoinedSessionId(id);
      setGameConfig({
        lives: game.initial_lives,
        rounds: game.initial_rounds,
        stake: Number(formatUnits(game.stake, 18)),
        playWindow: 30,
        playerAddress: undefined,
      });
      setCurrentScreen("join-confirmation");
    } catch (error) {
      alert((error as Error).message);
    }
  };

  const handleJoinConfirmation = async () => {
    try {
      await setAllowed();
      const { address } = await getAddress();
      await handleTransaction({
        name: "join_game",
        args: [
          nativeToScVal(joinedSessionId, { type: "u32" }),
          nativeToScVal(address, { type: "address" }),
        ],
      });
      setCurrentScreen("commit");
    } catch (error) {
      alert((error as Error).message);
    }
  };

  const handleJoinConfirmationBack = () => {
    setCurrentScreen("join-game");
  };

  const handleCommitScreenBack = () => {
    setCurrentScreen("join-game");
  };

  const handleCommitSubmit = (
    minePositions: Array<{ x: number; y: number }>,
  ) => {
    console.log("Mines committed:", minePositions);
    const handleTransaction = commitMines({});
    // For now, generate mock opponent mines and move to game board
    const mockOpponentMines = generateMockMines();
    setGameBoardData({
      playerMines: minePositions,
      opponentMines: mockOpponentMines,
    });
    setCurrentScreen("game-board");
  };

  const generateMockMines = () => {
    // Generate 5 random mine positions for the opponent
    const mines = [];
    while (mines.length < 5) {
      const x = Math.floor(Math.random() * 9);
      const y = Math.floor(Math.random() * 9);
      if (!mines.some((m) => m.x === x && m.y === y)) {
        mines.push({ x, y });
      }
    }
    return mines;
  };

  const handleGameEnd = (winner: "player1" | "player2") => {
    console.log("Game ended. Winner:", winner);
    const isVictory = winner === "player1";
    setGameResult({
      isVictory,
      winner: isVictory ? "Player 1" : "Player 2",
      loser: isVictory ? "Player 2" : "Player 1",
    });
    setCurrentScreen("victory");
  };

  const handlePlayAgain = () => {
    setGameResult(null);
    setGameBoardData(null);
    setCurrentScreen("game-config");
  };

  const handleConnectWallet = () => {
    setIsWalletConnected(true);
    setCurrentScreen("menu");
  };

  return (
    <>
      {currentScreen === "connect-wallet" && (
        <ConnectWalletScreen onConnectWallet={handleConnectWallet} />
      )}
      {currentScreen === "menu" && (
        <MenuScreen
          onStartGame={handleStartGame}
          onJoinGame={handleJoinGameClick}
        />
      )}
      {currentScreen === "game-config" && (
        <GameConfigScreen
          onBack={handleBackToMenu}
          onSubmit={handleGameConfigSubmit}
        />
      )}
      {currentScreen === "waiting" && (
        <WaitingScreen sessionId={sessionId} onCancel={handleWaitingCancel} />
      )}
      {currentScreen === "join-game" && (
        <JoinGameScreen onBack={handleBackToMenu} onJoin={handleJoinGame} />
      )}
      {currentScreen === "join-confirmation" && gameConfig && (
        <JoinConfirmationScreen
          sessionId={joinedSessionId}
          lives={gameConfig.lives}
          rounds={gameConfig.rounds}
          stake={gameConfig.stake}
          playWindow={gameConfig.playWindow}
          onBack={handleJoinConfirmationBack}
          onConfirm={handleJoinConfirmation}
        />
      )}
      {currentScreen === "commit" && (
        <CommitScreen
          onBack={handleCommitScreenBack}
          onCommit={handleCommitSubmit}
        />
      )}
      {currentScreen === "game-board" && gameBoardData && gameConfig && (
        <GameBoard
          playerMines={gameBoardData.playerMines}
          opponentMines={gameBoardData.opponentMines}
          playWindow={gameConfig.playWindow}
          onGameEnd={handleGameEnd}
        />
      )}
      {currentScreen === "victory" && gameResult && (
        <VictoryScreen
          isVictory={gameResult.isVictory}
          stake={gameConfig?.stake || 0}
          winner={gameResult.winner}
          loser={gameResult.loser}
          onPlayAgain={handlePlayAgain}
          onBackToMenu={handleBackToMenu}
        />
      )}
    </>
  );
}
